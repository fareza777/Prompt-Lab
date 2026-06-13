/** Web checkout (Lemon Squeezy) — browser only; Android TWA uses Play Billing. */

export function isWebCheckoutConfigured() {
  return Boolean(
    import.meta.env.VITE_WEB_CHECKOUT_PRO_URL?.trim() ||
      import.meta.env.VITE_WEB_CHECKOUT_BUSINESS_URL?.trim()
  );
}

/**
 * Append Lemon Squeezy checkout prefill + custom user_id for webhook matching.
 * @param {string} baseUrl Checkout share link from Lemon Squeezy
 * @param {{ email?: string, userId?: string, name?: string }} identity
 */
export function buildWebCheckoutUrl(baseUrl, identity = {}) {
  const raw = String(baseUrl || "").trim();
  if (!raw) return "";

  let url;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  const { email, userId, name } = identity;
  if (email) url.searchParams.set("checkout[email]", email);
  if (name) url.searchParams.set("checkout[name]", name);
  if (userId) url.searchParams.set("checkout[custom][user_id]", userId);

  return url.toString();
}

export function getWebCheckoutUrlForPlan(planName, identity = {}) {
  const urls = {
    Pro: import.meta.env.VITE_WEB_CHECKOUT_PRO_URL || "",
    Business: import.meta.env.VITE_WEB_CHECKOUT_BUSINESS_URL || "",
  };
  return buildWebCheckoutUrl(urls[planName] || "", identity);
}

export function getWebBillingHint({ checkoutConfigured = isWebCheckoutConfigured() } = {}) {
  if (checkoutConfigured) {
    return {
      ready: true,
      message:
        "Web checkout is connected. Choose Pro or Business — your plan updates automatically after payment (refresh Settings if needed).",
    };
  }
  return {
    ready: false,
    message:
      "Web checkout URLs are not configured yet. Add VITE_WEB_CHECKOUT_PRO_URL and VITE_WEB_CHECKOUT_BUSINESS_URL, or send a membership request email.",
  };
}
