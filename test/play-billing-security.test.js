import assert from "node:assert/strict";
import { test } from "node:test";
import * as playBilling from "../server/playBillingGoogle.js";
import * as lemonBilling from "../server/lemonSqueezyBilling.js";

const { applyLemonSqueezyMembership, downgradeToFree } = lemonBilling;

const PHASE_12_MIGRATION = new URL("../supabase/phase-12-billing-idempotency.sql", import.meta.url);
const serverModule = await import("../server/index.js");

function fakeAdmin({ profileError = null, eventError = null } = {}) {
  const writes = [];
  return {
    writes,
    async rpc(_name, _args) {
      if (profileError || eventError) return { data: null, error: profileError || eventError };
      return { data: [{ ok: true, applied: true, conflict: false }], error: null };
    },
    from(table) {
      return {
        update(value) {
          writes.push({ table, operation: "update", value });
          return { eq: async () => ({ error: profileError }) };
        },
        async insert(value) {
          writes.push({ table, operation: "insert", value });
          return { error: eventError };
        },
      };
    },
  };
}

test("purchase token hash is SHA-256 and hides its input", () => {
  const hash = playBilling.hashPurchaseToken("purchase-token");
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash.includes("purchase-token"), false);
});

test("Google Play persistence fails when membership event insertion fails", async () => {
  const admin = fakeAdmin({ eventError: new Error("event unavailable") });
  const result = await playBilling.persistPlayMembership(admin, {
    userId: "user-1",
    profileUpdate: { plan: "Pro" },
    event: { event_type: "subscription_verified", plan: "Pro" },
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /membership event/i);
});

test("Lemon Squeezy activation fails when membership event insertion fails", async () => {
  const admin = fakeAdmin({ eventError: new Error("event unavailable") });
  const result = await applyLemonSqueezyMembership(admin, {
    userId: "user-1",
    planConfig: { plan: "Pro", quotaLimit: 500000 },
    eventName: "subscription_created",
    payload: { data: { id: "sub-1", attributes: { status: "active" } } },
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /membership event/i);
});

test("Lemon Squeezy profile failures do not expose database details", async () => {
  const admin = fakeAdmin({ profileError: new Error("secret database topology") });
  const result = await applyLemonSqueezyMembership(admin, {
    userId: "user-1",
    planConfig: { plan: "Pro", quotaLimit: 500000 },
    eventName: "subscription_created",
    payload: { data: { id: "sub-1", attributes: { status: "active" } } },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.includes("secret database topology"), false);
});

test("Lemon Squeezy downgrade fails when membership event insertion fails", async () => {
  const admin = fakeAdmin({ eventError: new Error("event unavailable") });
  const result = await downgradeToFree(admin, "user-1", "subscription_expired", {
    data: { id: "sub-1", attributes: { status: "expired" } },
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /membership event/i);
});

test("Play sync event lookup fails closed when the membership query fails", async () => {
  let profileWrites = 0;
  const admin = {
    from(table) {
      if (table === "profiles") {
        return {
          update() {
            profileWrites += 1;
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      return {
        select() {
          return {
            eq() { return this; },
            order() { return this; },
            limit: async () => ({ data: null, error: new Error("events unavailable") }),
          };
        },
      };
    },
  };

  const result = await playBilling.loadPlayMembershipEvents(admin, "user-1");

  assert.deepEqual(result, { ok: false, events: [] });
  assert.equal(profileWrites, 0);
});

test("Lemon webhook replay uses one stable provider event key", async () => {
  const seen = new Set();
  let appliedMutations = 0;
  const rpcCalls = [];
  const admin = {
    async rpc(name, args) {
      rpcCalls.push({ name, args });
      if (!seen.has(args.p_provider_event_key)) {
        seen.add(args.p_provider_event_key);
        appliedMutations += 1;
        return { data: [{ ok: true, applied: true, conflict: false }], error: null };
      }
      return { data: [{ ok: true, applied: false, conflict: false }], error: null };
    },
  };
  const payload = {
    meta: { event_name: "subscription_updated" },
    data: {
      id: "sub-1",
      attributes: { status: "active", updated_at: "2026-07-11T05:00:00Z", variant_id: 42 },
    },
  };

  const first = await applyLemonSqueezyMembership(admin, {
    userId: "user-1",
    planConfig: { plan: "Pro", quotaLimit: 500000 },
    eventName: "subscription_updated",
    payload,
  });
  const replay = await applyLemonSqueezyMembership(admin, {
    userId: "user-1",
    planConfig: { plan: "Pro", quotaLimit: 500000 },
    eventName: "subscription_updated",
    payload,
  });

  assert.equal(first.ok, true);
  assert.equal(replay.ok, true);
  assert.equal(appliedMutations, 1);
  assert.equal(rpcCalls[0].name, "apply_promptlab_membership_event");
  assert.equal(rpcCalls[0].args.p_provider_event_key, rpcCalls[1].args.p_provider_event_key);
  assert.match(rpcCalls[0].args.p_provider_event_key, /^[a-f0-9]{64}$/);
});

test("older Lemon events are identified by their provider timestamp", () => {
  const newer = lemonBilling.getLemonProviderEvent({
    data: { id: "sub-1", attributes: { status: "active", updated_at: "2026-07-11T06:00:00Z" } },
  }, "subscription_updated");
  const older = lemonBilling.getLemonProviderEvent({
    data: { id: "sub-1", attributes: { status: "expired", updated_at: "2026-07-11T05:00:00Z" } },
  }, "subscription_expired");

  assert.equal(newer.eventAt, "2026-07-11T06:00:00.000Z");
  assert.equal(older.eventAt, "2026-07-11T05:00:00.000Z");
  assert.notEqual(newer.key, older.key);
});

test("concurrent Play token claims allow only one user to mutate a profile", async () => {
  let owner = null;
  const profilePlans = new Map();
  const admin = {
    async rpc(name, args) {
      assert.equal(name, "claim_google_play_membership");
      await new Promise((resolve) => setImmediate(resolve));
      if (owner && owner !== args.p_user_id) {
        return { data: [{ ok: false, applied: false, conflict: true }], error: null };
      }
      owner ||= args.p_user_id;
      profilePlans.set(args.p_user_id, args.p_plan);
      return { data: [{ ok: true, applied: true, conflict: false }], error: null };
    },
  };

  const [first, second] = await Promise.all([
    playBilling.claimPlayMembership(admin, {
      userId: "user-1", tokenHash: "a".repeat(64), profileUpdate: { plan: "Pro", quota_limit: 500000 },
      event: { event_type: "subscription_verified", plan: "Pro", metadata: {} },
    }),
    playBilling.claimPlayMembership(admin, {
      userId: "user-2", tokenHash: "a".repeat(64), profileUpdate: { plan: "Pro", quota_limit: 500000 },
      event: { event_type: "subscription_verified", plan: "Pro", metadata: {} },
    }),
  ]);

  assert.equal(first.ok, true);
  assert.deepEqual(second, { ok: false, conflict: true });
  assert.deepEqual([...profilePlans.keys()], ["user-1"]);
});

test("billing migration enforces provider replay and Play token ownership", async () => {
  const sql = await import("node:fs/promises").then(({ readFile }) => readFile(PHASE_12_MIGRATION, "utf8"));

  assert.match(sql, /provider_event_key\s+text/i);
  assert.match(sql, /unique index[^;]+membership_events[^;]+provider[^;]+provider_event_key/is);
  assert.match(sql, /create or replace function public\.apply_promptlab_membership_event/i);
  assert.match(sql, /provider_event_at\s*>/i);
  assert.match(sql, /create table[^;]+billing_purchase_claims[^;]+purchase_token_hash\s+text\s+primary key/is);
  assert.match(sql, /create or replace function public\.claim_google_play_membership/i);
  assert.match(sql, /on conflict[^;]+do nothing/is);
});

test("Play downgrade fails closed when the profile lookup errors", async () => {
  let profileWrites = 0;
  const admin = {
    from(table) {
      assert.equal(table, "profiles");
      return {
        select() {
          return {
            eq() { return this; },
            maybeSingle: async () => ({ data: null, error: new Error("secret database topology") }),
          };
        },
        update() {
          profileWrites += 1;
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  };

  await assert.rejects(
    serverModule.downgradePlayMembershipIfNeeded("user-1", { reason: "sync_inactive" }, admin),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.publicMessage.includes("secret database topology"), false);
      return true;
    }
  );
  assert.equal(profileWrites, 0);
});
