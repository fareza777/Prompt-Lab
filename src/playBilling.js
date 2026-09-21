/**
 * Google Play Billing for the Android app.
 *
 * The Capacitor build uses the native PlayBilling plugin (Play Billing
 * Library 8). The Digital Goods API path is kept as a fallback for older
 * TWA installs still in the field.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export const PLAY_BILLING_SERVICE = "https://play.google.com/billing";

export const PLAY_PRODUCT_IDS = {
  Pro: "promptlab_pro_monthly",
  Business: "promptlab_business_monthly",
};

const PLAN_BY_PRODUCT = {
  [PLAY_PRODUCT_IDS.Pro]: "Pro",
  [PLAY_PRODUCT_IDS.Business]: "Business",
};

const NativePlayBilling =
  typeof window !== "undefined" ? registerPlugin("PlayBilling") : null;

export function planNameForProductId(productId) {
  return PLAN_BY_PRODUCT[productId] || null;
}

export function isNativeAndroidApp() {
  return (
    typeof Capacitor !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

function hasDigitalGoods() {
  return (
    typeof window !== "undefined" &&
    typeof window.getDigitalGoodsService === "function" &&
    typeof PaymentRequest !== "undefined"
  );
}

export function isPlayBillingAvailable() {
  return isNativeAndroidApp() || hasDigitalGoods();
}

export function isLikelyAndroidTwa() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua);
}

/** User-facing reason when purchase cannot start yet. */
export function getPlayBillingHint() {
  if (isPlayBillingAvailable()) {
    return {
      ready: true,
      message: "Tap the Pro or Business card to purchase via Google Play.",
    };
  }
  if (!isLikelyAndroidTwa()) {
    return {
      ready: false,
      message:
        "Web membership upgrades are available from this browser. Choose a paid plan to open checkout or send an upgrade request.",
    };
  }
  return {
    ready: false,
    message:
      "Play Billing is warming up. Fully close the app, reopen from Play Store, then try again.",
  };
}

async function getBillingService() {
  if (!hasDigitalGoods()) {
    throw new Error("Play Billing is only available in AI Work Studio from Google Play (Android).");
  }
  return window.getDigitalGoodsService(PLAY_BILLING_SERVICE);
}

export async function getPlayProductDetails() {
  const ids = Object.values(PLAY_PRODUCT_IDS);
  if (isNativeAndroidApp()) {
    const { items } = await NativePlayBilling.getProductDetails({ productIds: ids });
    return items || [];
  }
  const service = await getBillingService();
  return service.getDetails(ids);
}

export async function listPlayPurchases() {
  if (isNativeAndroidApp()) {
    const { purchases } = await NativePlayBilling.listPurchases();
    return purchases || [];
  }
  const service = await getBillingService();
  return service.listPurchases();
}

/**
 * Start a Play purchase. On Capacitor this calls the native billing plugin;
 * on the legacy TWA it falls back to Payment Request + Digital Goods.
 * @param {"Pro"|"Business"} planName
 * @returns {Promise<{ productId: string, purchaseToken: string, completeBilling: (ok: boolean) => Promise<void> }>}
 */
export async function purchasePlayPlan(planName) {
  const productId = PLAY_PRODUCT_IDS[planName];
  if (!productId) throw new Error("Unknown plan.");

  if (isNativeAndroidApp()) {
    let result;
    try {
      result = await NativePlayBilling.purchase({ productId });
    } catch (error) {
      if (error?.code === "USER_CANCELED") {
        throw new Error("Purchase canceled.");
      }
      throw error;
    }

    const purchaseToken = result?.purchaseToken || "";
    if (!purchaseToken) {
      throw new Error("Purchase token was not returned from the Play Store.");
    }

    // Play auto-refunds unacknowledged purchases; acknowledge only after the
    // server has verified the token and granted entitlement.
    const completeBilling = async (ok) => {
      if (!ok) return;
      try {
        await NativePlayBilling.acknowledge({ purchaseToken });
      } catch {
        /* token already acknowledged or connection dropped */
      }
    };

    return {
      productId: result.productId || productId,
      purchaseToken,
      raw: result,
      completeBilling,
    };
  }

  await getBillingService();

  const paymentMethods = [
    {
      supportedMethods: PLAY_BILLING_SERVICE,
      data: { sku: productId },
    },
  ];

  const paymentDetails = {
    total: {
      label: "Total",
      amount: { currency: "IDR", value: "0" },
    },
  };

  const request = new PaymentRequest(paymentMethods, paymentDetails);
  let paymentResponse;

  try {
    paymentResponse = await request.show();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Purchase canceled.");
    }
    throw error;
  }

  const details = paymentResponse?.details || {};
  const purchaseToken = details.purchaseToken || details.token || "";

  const completeBilling = async (ok) => {
    try {
      await paymentResponse.complete(ok ? "success" : "fail");
    } catch {
      /* PaymentResponse may already be closed */
    }
  };

  if (!purchaseToken) {
    await completeBilling(false);
    throw new Error("Purchase token was not returned from the Play Store.");
  }

  return {
    productId,
    purchaseToken,
    raw: details,
    completeBilling,
  };
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
    throw new Error(data.error || "Purchase verification failed.");
  }
  return data;
}

export async function restorePlayPurchasesOnServer(apiBase, accessToken, purchases) {
  const response = await fetch(`${apiBase}/api/billing/restore-play-purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ purchases }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Restore purchases failed.");
  }
  return data;
}

/** Map billing purchase lists (native plugin or Digital Goods) into verify/restore payload shape. */
export function normalizePlayPurchaseList(items = []) {
  return (items || [])
    .map((item) => ({
      productId: item.itemId || item.productId || item.sku || "",
      purchaseToken: item.purchaseToken || item.token || "",
    }))
    .filter((item) => item.productId && item.purchaseToken);
}
