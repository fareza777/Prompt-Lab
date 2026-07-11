export async function reserveQuota(client, estimate) {
  const normalizedEstimate = Math.round(Number(estimate));
  if (!client?.rpc || !Number.isSafeInteger(normalizedEstimate) || normalizedEstimate <= 0) {
    return { ok: false, remaining: 0 };
  }

  try {
    const { data, error } = await client.rpc("reserve_promptlab_quota", {
      p_estimate: normalizedEstimate,
    });
    if (error) return { ok: false, remaining: 0 };

    const row = Array.isArray(data) ? data[0] : data;
    return {
      ok: row?.ok === true,
      remaining: Math.max(0, Number(row?.remaining) || 0),
    };
  } catch {
    return { ok: false, remaining: 0 };
  }
}

export async function persistReservedUsage(
  client,
  { userId, estimate, eventType, metadata = {}, idempotencyKey },
) {
  const normalizedEstimate = Math.round(Number(estimate));
  const normalizedKey = String(idempotencyKey || "").trim();
  if (
    !userId ||
    !client?.rpc ||
    !Number.isSafeInteger(normalizedEstimate) ||
    normalizedEstimate <= 0 ||
    !normalizedKey ||
    normalizedKey.length > 200
  ) {
    return { ok: false, remaining: 0, reason: "persistence_failed" };
  }

  try {
    const { data, error } = await client.rpc("record_promptlab_usage", {
      p_estimate: normalizedEstimate,
      p_event_type: String(eventType || "generation").slice(0, 80),
      p_metadata: metadata,
      p_idempotency_key: normalizedKey,
    });
    if (error) return { ok: false, remaining: 0, reason: "persistence_failed" };

    const row = Array.isArray(data) ? data[0] : data;
    if (typeof row?.ok !== "boolean") {
      return { ok: false, remaining: 0, reason: "persistence_failed" };
    }
    const remaining = Math.max(0, Number(row?.remaining) || 0);
    if (row?.ok !== true) {
      return { ok: false, remaining, reason: "quota_exhausted" };
    }
    return { ok: true, remaining, reason: "complete" };
  } catch {
    return { ok: false, remaining: 0, reason: "persistence_failed" };
  }
}

export function quotaFailureStatus(result) {
  return result?.reason === "quota_exhausted" ? 402 : 503;
}
