/** Google Play Billing via Digital Goods API (Trusted Web Activity on Android). */

export const PLAY_BILLING_SERVICE = "https://play.google.com/billing";

export const PLAY_PRODUCT_IDS = {
  Pro: "promptlab_pro_monthly",
  Business: "promptlab_business_monthly",
};

const PLAN_BY_PRODUCT = {
  [PLAY_PRODUCT_IDS.Pro]: "Pro",
  [PLAY_PRODUCT_IDS.Business]: "Business",
};

export function planNameForProductId(productId) {
  return PLAN_BY_PRODUCT[productId] || null;
}

export function isPlayBillingAvailable() {
  return typeof window !== "undefined" && typeof window.getDigitalGoodsService === "function";
}

export function isLikelyAndroidTwa() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua);
}

async function getBillingService() {
  if (!isPlayBillingAvailable()) {
    throw new Error("Play Billing hanya tersedia di app PromptLab dari Google Play (Android).");
  }
  return window.getDigitalGoodsService(PLAY_BILLING_SERVICE);
}

export async function getPlayProductDetails() {
  const service = await getBillingService();
  const ids = Object.values(PLAY_PRODUCT_IDS);
  return service.getDetails(ids);
}

export async function listPlayPurchases() {
  const service = await getBillingService();
  return service.listPurchases();
}

/**
 * @param {"Pro"|"Business"} planName
 */
export async function purchasePlayPlan(planName) {
  const productId = PLAY_PRODUCT_IDS[planName];
  if (!productId) throw new Error("Plan tidak dikenali.");
  const service = await getBillingService();
  const result = await service.purchase(productId);
  const purchaseToken =
    result?.purchaseToken || result?.token || result?.details?.purchaseToken || "";
  if (!purchaseToken) {
    throw new Error("Pembelian selesai tetapi token tidak diterima. Coba Restore purchases.");
  }
  return { productId, purchaseToken, raw: result };
}

/**
 * @param {string} apiBase
 * @param {string} accessToken Supabase session access_token
 * @param {{ productId: string, purchaseToken: string }} payload
 */
export async function verifyPlayPurchaseOnServer(apiBase, accessToken, payload) {
  const response = await fetch(`${apiBase}/api/billing/verify-play-purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Verifikasi pembelian gagal.");
  }
  return data;
}
