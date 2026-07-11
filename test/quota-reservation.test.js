import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("quota reservation returns failure when the RPC fails", async () => {
  const { reserveQuota } = await import("../server/quotaReservation.js");
  const calls = [];
  const client = {
    rpc: async (...args) => {
      calls.push(args);
      return { data: null, error: new Error("db unavailable") };
    },
  };

  assert.deepEqual(await reserveQuota(client, 100), { ok: false, remaining: 0 });
  assert.deepEqual(calls, [["reserve_promptlab_quota", { p_estimate: 100 }]]);
});

test("quota reservation normalizes the RPC row", async () => {
  const { reserveQuota } = await import("../server/quotaReservation.js");
  const client = {
    rpc: async () => ({ data: [{ ok: true, remaining: "420" }], error: null }),
  };

  assert.deepEqual(await reserveQuota(client, 80), { ok: true, remaining: 420 });
});

test("quota reservation rejects invalid estimates without calling the RPC", async () => {
  const { reserveQuota } = await import("../server/quotaReservation.js");
  let calls = 0;
  const client = { rpc: async () => { calls += 1; } };

  assert.deepEqual(await reserveQuota(client, 0), { ok: false, remaining: 0 });
  assert.equal(calls, 0);
});

test("reserved usage classifies quota exhaustion separately from RPC failure", async () => {
  const quota = await import("../server/quotaReservation.js");
  const exhaustedClient = {
    rpc: async () => ({ data: [{ ok: false, remaining: 12 }], error: null }),
  };
  const failedClient = {
    rpc: async () => ({ data: null, error: new Error("db unavailable") }),
  };

  const exhausted = await quota.persistReservedUsage(exhaustedClient, {
    userId: "user-1",
    estimate: 100,
    eventType: "generate_prompt",
    idempotencyKey: "request-1",
  });
  const failed = await quota.persistReservedUsage(failedClient, {
    userId: "user-1",
    estimate: 100,
    eventType: "generate_prompt",
    idempotencyKey: "request-2",
  });

  assert.deepEqual(exhausted, { ok: false, remaining: 12, reason: "quota_exhausted" });
  assert.deepEqual(failed, { ok: false, remaining: 0, reason: "persistence_failed" });
  assert.equal(quota.quotaFailureStatus(exhausted), 402);
  assert.equal(quota.quotaFailureStatus(failed), 503);
});

test("reserved usage treats a missing RPC result as persistence failure", async () => {
  const quota = await import("../server/quotaReservation.js");
  const client = { rpc: async () => ({ data: null, error: null }) };

  const result = await quota.persistReservedUsage(client, {
    userId: "user-1",
    estimate: 100,
    eventType: "generate_prompt",
    idempotencyKey: "request-empty-result",
  });

  assert.deepEqual(result, { ok: false, remaining: 0, reason: "persistence_failed" });
  assert.equal(quota.quotaFailureStatus(result), 503);
});

test("reserved usage retries atomically with the same idempotency key after event failure", async () => {
  const quota = await import("../server/quotaReservation.js");
  let charged = 0;
  let attempts = 0;
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      attempts += 1;
      if (attempts === 1) {
        // The database transaction rolls the reservation back with the failed insert.
        return { data: null, error: new Error("event insert failed") };
      }
      charged += args.p_estimate;
      return { data: [{ ok: true, remaining: 500 - charged }], error: null };
    },
    from: () => assert.fail("usage_events must be persisted inside the quota RPC"),
  };

  const payload = {
    userId: "user-1",
    estimate: 100,
    eventType: "generate_prompt",
    metadata: { stream: true },
    idempotencyKey: "request-retry-1",
  };
  const failed = await quota.persistReservedUsage(client, payload);
  const retried = await quota.persistReservedUsage(client, payload);

  assert.deepEqual(failed, { ok: false, remaining: 0, reason: "persistence_failed" });
  assert.deepEqual(retried, { ok: true, remaining: 400, reason: "complete" });
  assert.equal(charged, 100);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "record_promptlab_usage");
  assert.deepEqual(calls[0][1], calls[1][1]);
});

test("quota migration persists reservation and event in one idempotent transaction", async () => {
  const sql = await readFile(new URL("../supabase/phase-11-atomic-quota.sql", import.meta.url), "utf8");

  assert.match(sql, /add column if not exists idempotency_key text/i);
  assert.match(sql, /create unique index[^;]+usage_events[^;]+user_id[^;]+idempotency_key/is);
  assert.match(sql, /function public\.record_promptlab_usage\s*\(/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /insert into public\.usage_events/i);
  assert.match(sql, /quota_remaining/i);
});
