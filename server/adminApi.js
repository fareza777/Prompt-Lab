/** Admin-only analytics and user management (service role). */

const PLAN_VALUES = new Set(["Free", "Pro", "Business"]);
const ROLE_VALUES = new Set(["user", "admin"]);

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function bucketByDay(rows = []) {
  const buckets = {};
  for (const row of rows) {
    const day = String(row.created_at || "").slice(0, 10);
    if (!day) continue;
    if (!buckets[day]) buckets[day] = { date: day, events: 0, tokens: 0 };
    buckets[day].events += 1;
    buckets[day].tokens += Number(row.token_estimate || 0);
  }
  return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
}

function countByField(rows, field) {
  const counts = {};
  for (const row of rows) {
    const key = String(row[field] || "unknown");
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 */
export async function fetchAdminOverview(admin) {
  const since30 = daysAgoIso(30);
  const since7 = daysAgoIso(7);

  const [
    { count: totalUsers, error: usersCountError },
    { data: profiles, error: profilesError },
    { data: usage30, error: usageError },
    { data: usage7, error: usage7Error },
    { data: membershipRecent, error: membershipError },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("id, plan, role, quota_used, quota_limit, created_at"),
    admin
      .from("usage_events")
      .select("user_id, token_estimate, event_type, created_at")
      .gte("created_at", since30)
      .order("created_at", { ascending: false })
      .limit(10000),
    admin
      .from("usage_events")
      .select("token_estimate")
      .gte("created_at", since7),
    admin
      .from("membership_events")
      .select("id, user_id, provider, event_type, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const errors = [usersCountError, profilesError, usageError, usage7Error, membershipError].filter(Boolean);
  if (errors.length) {
    throw new Error(errors.map((e) => e.message).join(" | "));
  }

  const planDistribution = countByField(profiles || [], "plan");
  const roleDistribution = countByField(profiles || [], "role");
  const eventTypes = countByField(usage30 || [], "event_type");

  const tokens30 = (usage30 || []).reduce((sum, row) => sum + Number(row.token_estimate || 0), 0);
  const tokens7 = (usage7 || []).reduce((sum, row) => sum + Number(row.token_estimate || 0), 0);
  const events30 = (usage30 || []).length;

  const activeUserIds = new Set((usage30 || []).map((row) => row.user_id).filter(Boolean));
  const signups30 = (profiles || []).filter((p) => String(p.created_at || "") >= since30).length;

  return {
    totalUsers: totalUsers || 0,
    signups30,
    activeUsers30: activeUserIds.size,
    planDistribution,
    roleDistribution,
    tokens7,
    tokens30,
    events30,
    eventTypes,
    usageByDay: bucketByDay(usage30 || []),
    membershipRecent: membershipRecent || [],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {{ limit?: number, offset?: number, search?: string }} opts
 */
export async function fetchAdminUsers(admin, opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 200);
  const offset = Math.max(Number(opts.offset) || 0, 0);
  const search = String(opts.search || "").trim().toLowerCase();

  let query = admin
    .from("profiles")
    .select(
      "id, email, full_name, role, plan, quota_used, quota_limit, quota_reset_at, play_billing, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  return {
    users: (data || []).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name || "",
      role: row.role,
      plan: row.plan,
      quotaUsed: Number(row.quota_used || 0),
      quotaLimit: Number(row.quota_limit || 0),
      quotaResetAt: row.quota_reset_at,
      playBilling: row.play_billing,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    total: count || 0,
    limit,
    offset,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} userId
 * @param {Record<string, unknown>} patch
 */
export async function patchAdminUser(admin, userId, patch = {}) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("User id is required.");

  const update = {};
  if (patch.plan !== undefined) {
    if (!PLAN_VALUES.has(patch.plan)) throw new Error("Invalid plan.");
    update.plan = patch.plan;
  }
  if (patch.role !== undefined) {
    if (!ROLE_VALUES.has(patch.role)) throw new Error("Invalid role.");
    update.role = patch.role;
  }
  if (patch.quotaLimit !== undefined) {
    const value = Number(patch.quotaLimit);
    if (!Number.isFinite(value) || value < 0) throw new Error("Invalid quota limit.");
    update.quota_limit = Math.round(value);
  }
  if (patch.quotaUsed !== undefined) {
    const value = Number(patch.quotaUsed);
    if (!Number.isFinite(value) || value < 0) throw new Error("Invalid quota used.");
    update.quota_used = Math.round(value);
  }
  if (patch.quotaResetAt !== undefined) {
    update.quota_reset_at = String(patch.quotaResetAt).slice(0, 10);
  }

  if (!Object.keys(update).length) throw new Error("No valid fields to update.");

  update.updated_at = new Date().toISOString();

  const { data, error } = await admin.from("profiles").update(update).eq("id", id).select().maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("User not found.");
  return data;
}
