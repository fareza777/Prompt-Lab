/**
 * In-memory fixed-window rate limiter for AI routes.
 */

import { getRequestIdentity } from "./requestIdentity.js";

/** Finite fallback capacity when maxBuckets is omitted or invalid. */
const DEFAULT_MAX_BUCKETS = 10_000;
const DEFAULT_REST_TIMEOUT_MS = 2_000;
const MIN_REST_TIMEOUT_MS = 10;
const MAX_REST_TIMEOUT_MS = 10_000;
const REST_KV_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { count, ttl }
`.trim();

function normalizeMaxBuckets(maxBuckets) {
  const numericValue = Number(maxBuckets);
  if (!Number.isFinite(numericValue)) return DEFAULT_MAX_BUCKETS;
  return Math.max(1, Math.floor(numericValue));
}

function createInMemoryStore({ maxBuckets = DEFAULT_MAX_BUCKETS } = {}) {
  const buckets = new Map();
  const bucketLimit = normalizeMaxBuckets(maxBuckets);

  function pruneExpired(now) {
    for (const [key, entry] of buckets) {
      if (now - entry.startedAt > entry.windowMs) buckets.delete(key);
    }
  }

  function evictOldestBucket() {
    let oldestKey;
    let oldestStartedAt = Infinity;
    for (const [key, entry] of buckets) {
      if (entry.startedAt < oldestStartedAt) {
        oldestKey = key;
        oldestStartedAt = entry.startedAt;
      }
    }
    if (oldestKey) buckets.delete(oldestKey);
  }

  return {
    consume(key, windowMs, max, now) {
      pruneExpired(now);
      let entry = buckets.get(key);
      if (!entry) {
        if (buckets.size >= bucketLimit) evictOldestBucket();
        entry = { startedAt: now, windowMs, count: 0 };
        buckets.set(key, entry);
      }
      entry.count += 1;

      if (entry.count > max) {
        return {
          allowed: false,
          remaining: 0,
          retryAfter: Math.max(1, Math.ceil((entry.startedAt + windowMs - now) / 1000)),
        };
      }
      return { allowed: true, remaining: Math.max(0, max - entry.count), retryAfter: 0 };
    },
  };
}

function unavailableStore() {
  return { async consume() { throw new Error("Rate limit store unavailable"); } };
}

function storeError() {
  return new Error("Rate limit store unavailable");
}

function normalizeRestTimeout(timeoutMs) {
  const numericValue = Number(timeoutMs);
  if (!Number.isFinite(numericValue)) return DEFAULT_REST_TIMEOUT_MS;
  return Math.min(MAX_REST_TIMEOUT_MS, Math.max(MIN_REST_TIMEOUT_MS, Math.floor(numericValue)));
}

/** Upstash/Vercel KV REST adapter using one atomic Redis Lua command. */
export function createRestKvStore({
  url,
  token,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_REST_TIMEOUT_MS,
} = {}) {
  let endpoint;
  try {
    endpoint = new URL(String(url || ""));
  } catch {
    throw storeError();
  }
  if (endpoint.protocol !== "https:" || !String(token || "").trim() || typeof fetchImpl !== "function") {
    throw storeError();
  }
  const requestUrl = endpoint.toString().replace(/\/$/, "");
  const authorization = `Bearer ${String(token).trim()}`;
  const requestTimeoutMs = normalizeRestTimeout(timeoutMs);

  return {
    async consume(key, windowMs, max) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetchImpl(requestUrl, {
          method: "POST",
          headers: { Authorization: authorization, "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify([
            "EVAL", REST_KV_SCRIPT, "1", `rl:${key}`,
            String(Math.max(1, Math.floor(windowMs))),
          ]),
        });
        if (!response?.ok) throw storeError();
        const payload = await response.json();
        const count = Number(payload?.result?.[0]);
        const ttlMs = Number(payload?.result?.[1]);
        if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttlMs) || ttlMs < 0) {
          throw storeError();
        }
        if (count > max) {
          return { allowed: false, remaining: 0, retryAfter: Math.max(1, Math.ceil(ttlMs / 1000)) };
        }
        return { allowed: true, remaining: Math.max(0, max - count), retryAfter: 0 };
      } catch {
        throw storeError();
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function createConfiguredRateLimitStore({ env = process.env, fetchImpl = globalThis.fetch, maxBuckets } = {}) {
  const url = String(env?.KV_REST_API_URL || "").trim();
  const token = String(env?.KV_REST_API_TOKEN || "").trim();
  const requiresDurable = String(env?.NODE_ENV || "").toLowerCase() === "production"
    || String(env?.VERCEL_ENV || "").toLowerCase() === "production"
    || String(env?.RATE_LIMIT_REQUIRE_DURABLE || "").toLowerCase() === "true";
  if (!url && !token) return requiresDurable ? unavailableStore() : createInMemoryStore({ maxBuckets });
  if (!url || !token) return unavailableStore();
  try {
    return createRestKvStore({
      url,
      token,
      fetchImpl,
      timeoutMs: env?.RATE_LIMIT_KV_TIMEOUT_MS,
    });
  } catch {
    return unavailableStore();
  }
}

function limitsForPlan(plan) {
  const normalized = String(plan || "Free");
  if (/business/i.test(normalized)) return { windowMs: 60_000, max: 120 };
  if (/pro/i.test(normalized)) return { windowMs: 60_000, max: 60 };
  return { windowMs: 60_000, max: 24 };
}

export function createAiRateLimiter({
  getPlan = async () => "Free",
  now = () => Date.now(),
  maxBuckets,
  store = createInMemoryStore({ maxBuckets }),
} = {}) {
  return async function aiRateLimitMiddleware(req, res, next) {
    try {
      const plan = await getPlan(req);
      const { windowMs, max } = limitsForPlan(plan);
      const identity = getRequestIdentity(req);
      const result = await store.consume(`ai:${identity.kind}:${identity.value}`, windowMs, max, now());
      if (!result.allowed) {
        const retryAfter = result.retryAfter;
        res.setHeader("Retry-After", String(Math.max(1, retryAfter)));
        return res.status(429).json({
          error: "Too many AI requests. Please wait a moment and try again.",
          retryAfter,
          plan,
        });
      }
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(result.remaining));
      return next();
    } catch {
      // Fail closed on limiter errors to avoid unbounded AI spend.
      return res.status(503).json({
        error: "Rate limiter unavailable. Please try again in a moment.",
      });
    }
  };
}

/** Business tier: lower timeout priority bump marker for logging. */
export function markPriorityRequest(req, plan) {
  if (/business/i.test(String(plan || ""))) {
    req.priorityRouting = true;
  }
}
