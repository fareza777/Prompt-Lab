/**
 * One-off: grant super account via Supabase service role.
 * Usage (from repo root, with .env containing SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
 *   node scripts/grant-super-account.mjs fajar.mreza@gmail.com
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] || "fajar.mreza@gmail.com").trim().toLowerCase();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const patch = {
  role: "admin",
  plan: "Business",
  quota_limit: 2_147_483_647,
  quota_used: 0,
  quota_reset_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  updated_at: new Date().toISOString(),
};

const { data, error } = await admin.from("profiles").update(patch).eq("email", email).select("email,role,plan,quota_used,quota_limit").maybeSingle();

if (error) {
  console.error("Update failed:", error.message);
  process.exit(1);
}

if (!data) {
  console.error(`No profile found for ${email}. Sign in to the app once, then run again.`);
  process.exit(1);
}

console.log("Super account granted:", data);
