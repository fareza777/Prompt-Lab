/**
 * Super / admin accounts: unlimited quota on server + display helpers.
 * Set SUPER_ACCOUNT_EMAILS on Vercel (comma-separated) and run phase-6 SQL in Supabase.
 */

export function getSuperAccountEmails() {
  const env =
    typeof process !== "undefined"
      ? process.env?.SUPER_ACCOUNT_EMAILS || ""
      : typeof import.meta !== "undefined"
        ? import.meta.env?.VITE_SUPER_ACCOUNT_EMAILS || ""
        : "";
  return env
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAccount(profile) {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  const email = String(profile.email || "").trim().toLowerCase();
  return Boolean(email && getSuperAccountEmails().includes(email));
}

export const SUPER_QUOTA_LIMIT = 2_147_483_647;
