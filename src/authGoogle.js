/** Google OAuth helpers for Supabase Auth. */

export function getUserDisplayName(user) {
  const meta = user?.user_metadata || {};
  return (
    meta.full_name ||
    meta.name ||
    meta.display_name ||
    user?.email?.split("@")[0] ||
    ""
  );
}

export function humanizeAuthError(message) {
  const raw = String(message || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("provider is not enabled") || lower.includes("unsupported provider")) {
    return "Google sign-in is not configured on the server yet. Use email/password, or ask the admin to enable Google in Supabase.";
  }
  if (lower.includes("redirect") && lower.includes("url")) {
    return "Sign-in redirect URL is not allowed. Add this app URL to Supabase Auth → URL Configuration.";
  }
  if (lower.includes("access_denied") || lower.includes("user cancelled")) {
    return "Google sign-in was cancelled.";
  }
  return raw;
}

export function buildGoogleOAuthOptions(redirectTo) {
  return {
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "online",
        prompt: "select_account",
      },
      scopes: "email profile",
    },
  };
}
