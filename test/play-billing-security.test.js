import assert from "node:assert/strict";
import { test } from "node:test";
import * as playBilling from "../server/playBillingGoogle.js";
import {
  applyLemonSqueezyMembership,
  downgradeToFree,
} from "../server/lemonSqueezyBilling.js";

function fakeAdmin({ profileError = null, eventError = null } = {}) {
  const writes = [];
  return {
    writes,
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
