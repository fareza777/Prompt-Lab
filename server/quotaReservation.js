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

export async function persistReservedUsage(client, { userId, estimate, eventType, metadata = {} }) {
  if (!userId) return { ok: false, remaining: 0, stage: "event" };
  const reservation = await reserveQuota(client, estimate);
  if (!reservation.ok) {
    return { ...reservation, stage: "reservation" };
  }

  try {
    const { error } = await client.from("usage_events").insert({
      user_id: userId,
      event_type: String(eventType || "generation").slice(0, 80),
      token_estimate: Math.round(Number(estimate)),
      metadata,
    });
    if (error) return { ok: false, remaining: reservation.remaining, stage: "event" };
  } catch {
    return { ok: false, remaining: reservation.remaining, stage: "event" };
  }

  return { ...reservation, stage: "complete" };
}
