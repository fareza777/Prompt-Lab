#!/usr/bin/env node
/**
 * Enable Google OAuth on a Supabase project via Management API.
 *
 * Required env (in .env or shell):
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF   — e.g. oqakopejqlcqrnqdkquo
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *
 * Optional:
 *   APP_URL — default https://prompt-lab.xyz
 *
 * Google Cloud Console → OAuth client (Web):
 *   Authorized redirect URI:
 *     https://<project-ref>.supabase.co/auth/v1/callback
 */
import "dotenv/config";

const token = process.env.SUPABASE_ACCESS_TOKEN || "";
const projectRef = process.env.SUPABASE_PROJECT_REF || process.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
const clientId = process.env.GOOGLE_CLIENT_ID || "";
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
const appUrl = (process.env.APP_URL || "https://prompt-lab.xyz").replace(/\/$/, "");

const missing = [];
if (!token) missing.push("SUPABASE_ACCESS_TOKEN");
if (!projectRef) missing.push("SUPABASE_PROJECT_REF (or VITE_SUPABASE_URL)");
if (!clientId) missing.push("GOOGLE_CLIENT_ID");
if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");

if (missing.length) {
  console.error("Missing required environment variables:\n  - " + missing.join("\n  - "));
  console.error("\n1. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client (Web)");
  console.error(`   Redirect URI: https://${projectRef || "<project-ref>"}.supabase.co/auth/v1/callback`);
  console.error("2. Supabase Dashboard → Account → Access Tokens");
  console.error("3. Re-run: npm run setup:google-auth");
  process.exit(1);
}

const redirectAllowList = [
  `${appUrl}/app`,
  `${appUrl}/**`,
  "http://localhost:5173/app",
  "http://localhost:5173/**",
].join(",");

const body = {
  external_google_enabled: true,
  external_google_client_id: clientId,
  external_google_secret: clientSecret,
  site_url: appUrl,
  uri_allow_list: redirectAllowList,
};

const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const response = await fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await response.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text };
}

if (!response.ok) {
  console.error("Supabase Management API error:", response.status, json);
  process.exit(1);
}

console.log("Google OAuth enabled for project:", projectRef);
console.log("Site URL:", appUrl);
console.log("Redirect allow list:", redirectAllowList);
console.log("\nNext steps:");
console.log("  1. Set VITE_ENABLE_GOOGLE_AUTH=true on Vercel (or omit — enabled by default)");
console.log("  2. Redeploy the web app");
console.log("  3. Test: " + appUrl + "/app → Continue with Google");
