/**
 * Turns whatever an API call threw into something a person can act on.
 *
 * Server and client error strings are English and sometimes raw ("Failed to
 * fetch", "NetworkError when attempting to fetch resource"). Showing those in
 * an Indonesian-default interface is both confusing and unhelpful, so the
 * display boundary maps them onto localized, actionable copy.
 *
 * Anything unrecognised falls back to the generic message rather than leaking
 * an implementation detail.
 */

const PATTERNS = [
  [/failed to fetch|networkerror|load failed|network request failed/i, "error.offline"],
  [/sign in|invalid session|authentication required|\b401\b/i, "error.needAccount"],
  [/quota|usage limit/i, "error.quota"],
  [/rate limit|too many requests|too many ai requests/i, "error.rateLimited"],
  [/timed? ?out|took too long/i, "error.timeout"],
  [/busy|overload/i, "error.busy"],
  [/not configured|api key/i, "error.notConfigured"],
  [/too large|maximum \d+ ?mb/i, "error.fileTooLarge"],
  [/unsupported file/i, "error.unsupportedFile"],
];

export function humanizeApiError(message, t) {
  const raw = String(message || "").trim();
  if (!raw) return "";
  for (const [pattern, key] of PATTERNS) {
    if (pattern.test(raw)) return t(key);
  }
  return t("error.generic");
}
