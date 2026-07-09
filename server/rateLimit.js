/**
 * In-memory sliding-window rate limiter for AI routes (per IP + user).
 */

const buckets = new Map();

function bucketKey(req, prefix = "ai") {
  const userId = req.headers["x-user-id"] || req.authUserId || "";
  const ip =
    String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown";
  return `${prefix}:${userId || ip}`;
}

function limitsForPlan(plan) {
  const normalized = String(plan || "Free");
  if (/business/i.test(normalized)) return { windowMs: 60_000, max: 120 };
  if (/pro/i.test(normalized)) return { windowMs: 60_000, max: 60 };
  return { windowMs: 60_000, max: 24 };
}

export function createAiRateLimiter({ getPlan = async () => "Free" } = {}) {
  return async function aiRateLimitMiddleware(req, res, next) {
    try {
      const plan = await getPlan(req);
      const { windowMs, max } = limitsForPlan(plan);
      const key = bucketKey(req);
      const now = Date.now();
      let entry = buckets.get(key);
      if (!entry || now - entry.startedAt > windowMs) {
        entry = { startedAt: now, count: 0 };
        buckets.set(key, entry);
      }
      entry.count += 1;
      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.startedAt + windowMs - now) / 1000);
        res.setHeader("Retry-After", String(Math.max(1, retryAfter)));
        return res.status(429).json({
          error: "Too many AI requests. Please wait a moment and try again.",
          retryAfter,
          plan,
        });
      }
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
      return next();
    } catch (error) {
      console.warn("rate limit middleware error", error.message);
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
