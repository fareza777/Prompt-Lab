import assert from "node:assert/strict";
import { test } from "node:test";
import { getRequestIdentity } from "../server/requestIdentity.js";
import {
  createAiRateLimiter,
  createConfiguredRateLimitStore,
  createRestKvStore,
} from "../server/rateLimit.js";

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

test("REST KV store atomically consumes a shared fixed-window bucket", async () => {
  const calls = [];
  let count = 0;
  const store = createRestKvStore({
    url: "https://kv.example.test",
    token: "secret-token",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const requestCount = ++count;
      return { ok: true, json: async () => ({ result: [requestCount, 60_000] }) };
    },
  });

  const [first, second] = await Promise.all([
    store.consume("ai:user:shared", 60_000, 1, 1_000),
    store.consume("ai:user:shared", 60_000, 1, 1_000),
  ]);

  assert.deepEqual(first, { allowed: true, remaining: 0, retryAfter: 0 });
  assert.deepEqual(second, { allowed: false, remaining: 0, retryAfter: 60 });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://kv.example.test");
  assert.equal(calls[0].options.headers.Authorization, "Bearer secret-token");
  const command = JSON.parse(calls[0].options.body);
  assert.equal(command[0], "EVAL");
  assert.equal(command[3], "rl:ai:user:shared");
  assert.equal(command[4], "60000");
});

test("REST KV store rejects malformed responses without leaking credentials", async () => {
  const store = createRestKvStore({
    url: "https://kv.example.test",
    token: "do-not-leak",
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: ["invalid", 1] }) }),
  });

  await assert.rejects(
    store.consume("ai:user:1", 60_000, 24, 1_000),
    (error) => error.message === "Rate limit store unavailable" && !error.message.includes("do-not-leak")
  );
});

test("REST KV store requires HTTPS and production rejects insecure configuration", async () => {
  assert.throws(
    () => createRestKvStore({ url: "http://kv.example.test", token: "do-not-send" }),
    { message: "Rate limit store unavailable" }
  );

  const productionStore = createConfiguredRateLimitStore({
    env: {
      NODE_ENV: "production",
      KV_REST_API_URL: "http://kv.example.test",
      KV_REST_API_TOKEN: "do-not-send",
    },
  });
  await assert.rejects(productionStore.consume("ai:user:1", 60_000, 24, 1_000), {
    message: "Rate limit store unavailable",
  });

  const secureStore = createRestKvStore({
    url: "https://kv.example.test",
    token: "token",
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: [1, 60_000] }) }),
  });
  assert.deepEqual(await secureStore.consume("ai:user:1", 60_000, 24, 1_000), {
    allowed: true,
    remaining: 23,
    retryAfter: 0,
  });
});

test("configured rate-limit store uses KV only when URL and token are both present", async () => {
  let request;
  const durable = createConfiguredRateLimitStore({
    env: { KV_REST_API_URL: "https://kv.example.test/", KV_REST_API_TOKEN: "token" },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ result: [1, 60_000] }) };
    },
  });
  await durable.consume("ai:user:1", 60_000, 24, 1_000);
  assert.equal(request.url, "https://kv.example.test");

  const partial = createConfiguredRateLimitStore({
    env: { KV_REST_API_URL: "https://kv.example.test", KV_REST_API_TOKEN: "" },
  });
  await assert.rejects(partial.consume("ai:user:1", 60_000, 24, 1_000), {
    message: "Rate limit store unavailable",
  });
});

test("production without KV credentials fails closed instead of using process memory", async () => {
  for (const env of [
    { NODE_ENV: "production" },
    { VERCEL_ENV: "production" },
    { RATE_LIMIT_REQUIRE_DURABLE: "true" },
  ]) {
    const store = createConfiguredRateLimitStore({ env });
    await assert.rejects(Promise.resolve().then(() => store.consume("ai:user:1", 60_000, 24, 1_000)), {
      message: "Rate limit store unavailable",
    });
  }
});

test("development without KV credentials retains bounded in-memory fallback", async () => {
  const store = createConfiguredRateLimitStore({ env: { NODE_ENV: "development" }, maxBuckets: 1 });
  assert.deepEqual(await store.consume("ai:user:1", 60_000, 1, 1_000), {
    allowed: true,
    remaining: 0,
    retryAfter: 0,
  });
});

test("hanging REST KV request is aborted and middleware returns generic 503", async () => {
  let aborted = false;
  const store = createRestKvStore({
    url: "https://kv.example.test",
    token: "timeout-secret",
    timeoutMs: 10,
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        aborted = true;
        reject(new Error("timeout-secret"));
      }, { once: true });
    }),
  });
  const limiter = createAiRateLimiter({ store, getPlan: async () => "Free" });
  const res = createResponse();

  await limiter({ authUserId: "user-1", headers: {}, ip: "203.0.113.4" }, res, () => {});

  assert.equal(res.statusCode, 503);
  assert.equal(aborted, true);
  assert.deepEqual(res.body, { error: "Rate limiter unavailable. Please try again in a moment." });
});

test("REST KV timeout is bounded when configuration is invalid", async () => {
  let capturedSignal;
  const store = createRestKvStore({
    url: "https://kv.example.test",
    token: "token",
    timeoutMs: Infinity,
    fetchImpl: async (_url, { signal }) => {
      capturedSignal = signal;
      return { ok: true, json: async () => ({ result: [1, 60_000] }) };
    },
  });
  await store.consume("ai:user:1", 60_000, 24, 1_000);
  assert.ok(capturedSignal instanceof AbortSignal);
});
