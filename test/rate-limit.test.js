import assert from "node:assert/strict";
import { test } from "node:test";
import { getRequestIdentity } from "../server/requestIdentity.js";
import { createAiRateLimiter } from "../server/rateLimit.js";

function createResponse() {
  const headers = new Map();
  return {
    headers,
    body: null,
    statusCode: 200,
    setHeader(name, value) {
      headers.set(name, value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("rate-limit key ignores attacker supplied identity headers", () => {
  assert.deepEqual(
    getRequestIdentity({
      authUserId: "",
      headers: { "x-user-id": "victim", "x-forwarded-for": "198.51.100.9" },
      ip: "203.0.113.4",
    }),
    { kind: "ip", value: "203.0.113.4" }
  );
});

test("rate-limit identity uses only server-authenticated user id", () => {
  assert.deepEqual(
    getRequestIdentity({ authUserId: " verified-user ", headers: { "x-user-id": "victim" }, ip: "203.0.113.4" }),
    { kind: "user", value: "verified-user" }
  );
});

test("rate limiter passes a trusted identity key to the configured store", async () => {
  const calls = [];
  const limiter = createAiRateLimiter({
    getPlan: async () => "Free",
    now: () => 1234,
    store: {
      async consume(...args) {
        calls.push(args);
        return { allowed: true, remaining: 23, retryAfter: 0 };
      },
    },
  });
  const res = createResponse();
  let nextCalls = 0;

  await limiter(
    { authUserId: "", headers: { "x-user-id": "victim" }, ip: "203.0.113.4" },
    res,
    () => {
      nextCalls += 1;
    }
  );

  assert.deepEqual(calls, [["ai:ip:203.0.113.4", 60_000, 24, 1234]]);
  assert.equal(nextCalls, 1);
  assert.equal(res.headers.get("X-RateLimit-Remaining"), "23");
});

test("rate limiter fails closed when its store is unavailable", async () => {
  const limiter = createAiRateLimiter({
    getPlan: async () => "Free",
    store: { consume: async () => { throw new Error("store secret should not leak"); } },
  });
  const res = createResponse();

  await limiter({ authUserId: "user-1", headers: {}, ip: "203.0.113.4" }, res, () => {});

  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, { error: "Rate limiter unavailable. Please try again in a moment." });
});

test("in-memory rate limiter keeps its identity buckets bounded", async () => {
  let currentTime = 1_000;
  const limiter = createAiRateLimiter({
    getPlan: async () => "Free",
    now: () => currentTime,
    maxBuckets: 2,
  });

  async function requestFrom(ip) {
    const res = createResponse();
    await limiter({ headers: {}, ip }, res, () => {});
    return res;
  }

  for (let index = 0; index < 24; index += 1) {
    await requestFrom("203.0.113.1");
  }
  await requestFrom("203.0.113.2");
  await requestFrom("203.0.113.3");

  const reintroduced = await requestFrom("203.0.113.1");
  assert.equal(reintroduced.statusCode, 200);
  assert.equal(reintroduced.headers.get("X-RateLimit-Remaining"), "23");
});

test("in-memory rate limiter bounds an Infinity bucket cap", async () => {
  const limiter = createAiRateLimiter({
    getPlan: async () => "Free",
    now: () => 1_000,
    maxBuckets: Infinity,
  });

  async function requestFrom(ip) {
    const res = createResponse();
    await limiter({ headers: {}, ip }, res, () => {});
    return res;
  }

  for (let index = 0; index < 24; index += 1) {
    await requestFrom("203.0.113.1");
  }
  for (let index = 2; index <= 10_001; index += 1) {
    await requestFrom(`203.0.113.${index}`);
  }

  const reintroduced = await requestFrom("203.0.113.1");
  assert.equal(reintroduced.statusCode, 200);
  assert.equal(reintroduced.headers.get("X-RateLimit-Remaining"), "23");
});
