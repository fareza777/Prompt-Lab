import test from "node:test";
import assert from "node:assert/strict";
import {
  getIsoWeekWindow,
  reserveWeeklyFreeResult,
} from "../server/weeklyResultQuota.js";

test("ISO week resets on Monday UTC", () => {
  const window = getIsoWeekWindow(new Date("2026-07-26T12:00:00Z"));
  assert.equal(window.startsAt.toISOString(), "2026-07-20T00:00:00.000Z");
  assert.equal(window.endsAt.toISOString(), "2026-07-27T00:00:00.000Z");
});

test("weekly reservation normalizes success and limit responses", async () => {
  const rows = [
    { ok: true, remaining: 0, reset_at: "2026-07-27T00:00:00Z", reason: "reserved" },
    { ok: false, remaining: 0, reset_at: "2026-07-27T00:00:00Z", reason: "weekly_limit" },
  ];
  const client = { rpc: async () => ({ data: [rows.shift()], error: null }) };
  assert.equal(
    (await reserveWeeklyFreeResult(client, { userId: "u", idempotencyKey: "fifth" })).ok,
    true,
  );
  assert.equal(
    (await reserveWeeklyFreeResult(client, { userId: "u", idempotencyKey: "sixth" })).reason,
    "weekly_limit",
  );
});

test("weekly reservation validates the idempotency key", async () => {
  let calls = 0;
  const client = { rpc: async () => { calls += 1; } };
  const result = await reserveWeeklyFreeResult(client, { userId: "u", idempotencyKey: "" });
  assert.equal(result.reason, "invalid_request");
  assert.equal(calls, 0);
});
