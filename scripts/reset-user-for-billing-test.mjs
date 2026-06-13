/**
 * Reset a profile to a normal Free user (for billing / membership testing).
 * Usage:
 *   node scripts/reset-user-for-billing-test.mjs fajar.mreza@gmail.com
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { getEntitlements } from "../src/planEntitlements.js";

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!isMain) {
  // Loaded by node --test harness; skip CLI side effects.
} else {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: node scripts/reset-user-for-billing-test.mjs <email>");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  const free = getEntitlements("Free");
  const resetDate = new Date();
  resetDate.setDate(resetDate.getDate() + 30);

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const patch = {
    role: "user",
    plan: "Free",
    quota_limit: free.quotaLimit,
    quota_used: 0,
    play_billing: "Not linked",
    quota_reset_at: resetDate.toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("profiles")
    .update(patch)
    .ilike("email", email)
    .select("email,role,plan,quota_used,quota_limit,play_billing,quota_reset_at")
    .maybeSingle();

  if (error) {
    console.error("Update failed:", error.message);
    process.exit(1);
  }

  if (!data) {
    console.error(`No profile found for ${email}. Sign in to the app once, then run again.`);
    process.exit(1);
  }

  console.log("Reset to normal Free user:", data);
  console.log("");
  console.log("Also remove this email from Vercel env if set:");
  console.log("  SUPER_ACCOUNT_EMAILS");
  console.log("  VITE_SUPER_ACCOUNT_EMAILS");
}
