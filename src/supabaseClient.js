import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Google OAuth is off until provider is enabled in Supabase + VITE_ENABLE_GOOGLE_AUTH=true */
export const isGoogleAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";

export function getAuthRedirectUrl() {
  if (typeof window === "undefined") return "/app";
  return `${window.location.origin}/app`;
}

export function readAuthCallbackError() {
  if (typeof window === "undefined") return "";
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const raw =
    search.get("error_description") ||
    search.get("error") ||
    hash.get("error_description") ||
    hash.get("error");
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

export function clearAuthCallbackParams() {
  if (typeof window === "undefined" || !window.history.replaceState) return;
  const hasAuthParams =
    window.location.search.includes("error") ||
    window.location.hash.includes("error") ||
    window.location.hash.includes("access_token");
  if (!hasAuthParams) return;
  const url = new URL(window.location.href);
  ["error", "error_description", "error_code"].forEach((key) => url.searchParams.delete(key));
  url.hash = "";
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
