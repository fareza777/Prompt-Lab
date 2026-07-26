export const FREE_WEEKLY_RESULT_LIMIT = 5;

export function getIsoWeekWindow(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("Invalid date");
  const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = startsAt.getUTCDay() || 7;
  startsAt.setUTCDate(startsAt.getUTCDate() - day + 1);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 7);
  return { startsAt, endsAt };
}

export async function reserveWeeklyFreeResult(
  client,
  { userId, idempotencyKey } = {},
) {
  const key = String(idempotencyKey || "").trim();
  if (!userId || !client?.rpc || !key || key.length > 200) {
    return { ok: false, remaining: 0, resetAt: null, reason: "invalid_request" };
  }
  try {
    const { data, error } = await client.rpc("reserve_promptlab_weekly_result", {
      p_idempotency_key: key,
    });
    if (error) return { ok: false, remaining: 0, resetAt: null, reason: "persistence_failed" };
    const row = Array.isArray(data) ? data[0] : data;
    return {
      ok: row?.ok === true,
      remaining: Math.max(0, Number(row?.remaining) || 0),
      resetAt: row?.reset_at || row?.resetAt || null,
      reason: String(row?.reason || (row?.ok ? "reserved" : "weekly_limit")),
    };
  } catch {
    return { ok: false, remaining: 0, resetAt: null, reason: "persistence_failed" };
  }
}

export async function releaseWeeklyFreeResult(client, idempotencyKey) {
  const key = String(idempotencyKey || "").trim();
  if (!client?.rpc || !key || key.length > 200) return false;
  try {
    const { data, error } = await client.rpc("release_promptlab_weekly_result", {
      p_idempotency_key: key,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
