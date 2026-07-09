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
    return { error: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON belum diset di server." };
  }
  const GoogleAuth = await loadGoogleAuth();
  if (!GoogleAuth) {
    return { error: "google-auth-library belum terpasang di server. Jalankan: npm install google-auth-library" };
  }
  const auth = new GoogleAuth({
    credentials,
    scopes: [ANDROID_PUBLISHER_SCOPE],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse?.token || tokenResponse;
  if (!accessToken) return { error: "Gagal mendapatkan access token Google Play." };
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
    return { ok: false, error: "productId dan purchaseToken wajib." };
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
    return { ok: false, error: message };
  }

  const paymentState = Number(body.paymentState);
  const acknowledgementState = Number(body.acknowledgementState);
  const expiryTimeMillis = Number(body.expiryTimeMillis || 0);
  const now = Date.now();

  if (expiryTimeMillis && expiryTimeMillis < now) {
    return { ok: false, error: "Subscription sudah kedaluwarsa." };
  }

  if (paymentState === 0) {
    return { ok: false, error: "Pembayaran subscription belum aktif." };
  }

  return {
    ok: true,
    acknowledgementState,
    expiryTimeMillis,
    orderId: body.orderId || "",
    packageName,
    subscriptionId,
    purchaseToken,
    raw: body,
  };
}

/**
 * Acknowledge a subscription purchase so Google does not auto-refund.
 * Safe to call when already acknowledged (acknowledgementState === 1).
 */
export async function acknowledgePlaySubscriptionPurchase(params) {
  const packageName = params.packageName || process.env.GOOGLE_PLAY_PACKAGE_NAME || "app.promptlab.twa";
  const { subscriptionId, purchaseToken } = params;
  if (!subscriptionId || !purchaseToken) {
    return { ok: false, error: "productId dan purchaseToken wajib." };
  }

  const tokenResult = await getAndroidPublisherAccessToken();
  if (tokenResult.error) return { ok: false, error: tokenResult.error };

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;

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
  // Already acknowledged is fine.
  if (/already.?acknowledged/i.test(message)) return { ok: true };
  return { ok: false, error: message };
}

export function hashPurchaseToken(token) {
  // Lightweight non-crypto fingerprint for dedup (avoid storing raw tokens).
  const value = String(token || "");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return `pt_${hash.toString(16)}_${value.length}`;
}
