import assert from "node:assert/strict";
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

test("reserved usage fails closed before inserting an event when reservation fails", async () => {
  const quota = await import("../server/quotaReservation.js");
  let inserts = 0;
  const client = {
    rpc: async () => ({ data: null, error: new Error("db unavailable") }),
    from: () => ({ insert: async () => { inserts += 1; return { error: null }; } }),
  };

  const result = await quota.persistReservedUsage(client, {
    userId: "user-1",
    estimate: 100,
    eventType: "generate_prompt",
  });
  assert.deepEqual(result, { ok: false, remaining: 0, stage: "reservation" });
  assert.equal(inserts, 0);
});

test("reserved usage fails closed when its event cannot be persisted", async () => {
  const quota = await import("../server/quotaReservation.js");
  const client = {
    rpc: async () => ({ data: [{ ok: true, remaining: 400 }], error: null }),
    from: () => ({ insert: async () => ({ error: new Error("event unavailable") }) }),
  };

  const result = await quota.persistReservedUsage(client, {
    userId: "user-1",
    estimate: 100,
    eventType: "generate_prompt",
    metadata: { stream: true },
  });
  assert.deepEqual(result, { ok: false, remaining: 400, stage: "event" });
});

test("reserved usage attributes its event to the authenticated user", async () => {
  const quota = await import("../server/quotaReservation.js");
  let inserted;
  const client = {
    rpc: async () => ({ data: [{ ok: true, remaining: 400 }], error: null }),
    from: () => ({ insert: async (value) => { inserted = value; return { error: null }; } }),
  };

  const result = await quota.persistReservedUsage(client, {
    userId: "user-1",
    estimate: 100,
    eventType: "generate_prompt",
  });
  assert.equal(result.ok, true);
  assert.equal(inserted.user_id, "user-1");
});
