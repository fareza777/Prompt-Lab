let GoogleAuthClass = null;

async function loadGoogleAuth() {
  if (GoogleAuthClass) return GoogleAuthClass;
  try {
    const mod = await import("google-auth-library");
    GoogleAuthClass = mod.GoogleAuth;
    return GoogleAuthClass;
  } catch {
    return null;
  }
}

const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

const PLAN_BY_PRODUCT = {
  promptlab_pro_monthly: { plan: "Pro", quotaLimit: 500000 },
  promptlab_business_monthly: { plan: "Business", quotaLimit: 2000000 },
};

export function getPlanForProductId(productId) {
  return PLAN_BY_PRODUCT[productId] || null;
}

function getServiceAccountCredentials() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "";
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getAndroidPublisherAccessToken() {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    return { error: "Play Billing is not configured on the server." };
  }
  const GoogleAuth = await loadGoogleAuth();
  if (!GoogleAuth) {
    return { error: "Play Billing library is unavailable on the server." };
  }
  const auth = new GoogleAuth({
    credentials,
    scopes: [ANDROID_PUBLISHER_SCOPE],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse?.token || tokenResponse;
  if (!accessToken) return { error: "Could not get a Google Play access token." };
  return { accessToken };
}

/**
 * Verify subscription purchase token with Google Play Developer API.
 * @param {{ packageName: string, subscriptionId: string, purchaseToken: string }} params
 */
export async function verifyPlaySubscriptionPurchase(params) {
  const packageName = params.packageName || process.env.GOOGLE_PLAY_PACKAGE_NAME || "app.promptlab.twa";
  const { subscriptionId, purchaseToken } = params;
  if (!subscriptionId || !purchaseToken) {
    return { ok: false, error: "productId and purchaseToken are required." };
  }

  const tokenResult = await getAndroidPublisherAccessToken();
  if (tokenResult.error) return { ok: false, error: tokenResult.error };

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(purchaseToken)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `Google Play API ${response.status}`;
    return { ok: false, error: humanizePlayApiError(message, response.status) };
  }

  const paymentState = Number(body.paymentState);
  const acknowledgementState = Number(body.acknowledgementState);
  const expiryTimeMillis = Number(body.expiryTimeMillis || 0);
  const now = Date.now();
  const cancelReason = body.cancelReason != null ? Number(body.cancelReason) : null;
  const autoRenewing = body.autoRenewing !== false;

  if (expiryTimeMillis && expiryTimeMillis < now) {
    return {
      ok: false,
      expired: true,
      error: "This subscription has expired.",
      expiryTimeMillis,
      cancelReason,
      autoRenewing,
      raw: body,
    };
  }

  if (paymentState === 0) {
    return { ok: false, error: "This subscription payment is not active yet." };
  }

  return {
    ok: true,
    acknowledgementState,
    expiryTimeMillis,
    orderId: body.orderId || "",
    packageName,
    subscriptionId,
    purchaseToken,
    cancelReason,
    autoRenewing,
    raw: body,
  };
}

/**
 * Acknowledge a subscription purchase so Google does not auto-refund.
 * Retries a few times on transient failures.
 */
export async function acknowledgePlaySubscriptionPurchase(params, { retries = 3 } = {}) {
  const packageName = params.packageName || process.env.GOOGLE_PLAY_PACKAGE_NAME || "app.promptlab.twa";
  const { subscriptionId, purchaseToken } = params;
  if (!subscriptionId || !purchaseToken) {
    return { ok: false, error: "productId and purchaseToken are required." };
  }

  let lastError = "";
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const tokenResult = await getAndroidPublisherAccessToken();
    if (tokenResult.error) return { ok: false, error: tokenResult.error };

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResult.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (response.status === 204 || response.ok) {
        return { ok: true };
      }

      const body = await response.json().catch(() => ({}));
      const message = body?.error?.message || `Google Play acknowledge ${response.status}`;
      if (/already.?acknowledged/i.test(message)) return { ok: true };
      lastError = humanizePlayApiError(message, response.status);
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { ok: false, error: lastError };
      }
    } catch (error) {
      lastError = error.message || "Acknowledge request failed.";
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  return { ok: false, error: lastError || "Could not acknowledge this purchase." };
}

export function hashPurchaseToken(token) {
  // Stable fingerprint without storing the raw purchase token.
  const value = String(token || "");
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + ((i * 131) & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return `pt_${a}${b}_${value.length}`;
}

function humanizePlayApiError(message, status) {
  const text = String(message || "");
  if (/insufficient permissions|permissionDenied|PERMISSION_DENIED/i.test(text)) {
    return "Play Billing permission is not ready yet. Try again in a few minutes.";
  }
  if (/Invalid Value|invalid/i.test(text) && status === 400) {
    return "This purchase token is invalid or no longer active.";
  }
  if (/not.?found|404/i.test(text) || status === 404) {
    return "No matching Google Play purchase was found.";
  }
  if (/expired|kedaluwarsa/i.test(text)) {
    return "This subscription has expired.";
  }
  return text || `Google Play API error (${status || "unknown"}).`;
}

/** Free-tier defaults used when downgrading an expired Play subscription. */
export const FREE_PLAN_DEFAULTS = { plan: "Free", quotaLimit: 50000 };
