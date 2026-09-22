import { Capacitor } from "@capacitor/core";

/**
 * Banner-ads for the Capacitor Android build via @capacitor-community/admob.
 * Free-plan users see a single adaptive banner pinned to the bottom of the
 * shell; Pro/Business never load one. The plugin module itself is imported
 * lazily — it is a no-op on the web, and keeping it out of the initial graph
 * keeps the web bundle inside its asset budget.
 *
 * Test IDs: Google's public demo ad units ship in the manifest/config so the
 * debug build shows real ads. Swap them for real ca-app-pub-… ids before a
 * signed release.
 */

const FALLBACK_BANNER_AD_ID = "ca-app-pub-3940256099942544/6300978111";

let initialized = false;
let bannerVisible = false;

export function isAdMobCapable() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

async function loadAdMob() {
  const module = await import("@capacitor-community/admob");
  return module;
}

async function ensureInitialized(AdMob) {
  if (initialized) return true;
  try {
    await AdMob.initialize();
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

async function requestConsent(AdMob, AdmobConsentStatus) {
  try {
    const info = await AdMob.requestConsentInfo();
    if (info?.status === AdmobConsentStatus.REQUIRED && info?.isConsentFormAvailable) {
      const updated = await AdMob.showConsentForm();
      return updated?.canRequestAds !== false;
    }
    return info?.canRequestAds !== false;
  } catch {
    return true;
  }
}

/** Shows/hides the Free-plan banner to match the current plan. Returns visibility. */
export async function syncNativeBanner(plan) {
  try {
    if (!isAdMobCapable()) return false;
    const { AdMob, AdmobConsentStatus, BannerAdPosition, BannerAdSize } = await loadAdMob();
    const wantsBanner = plan === "Free";

    if (!(await ensureInitialized(AdMob))) return false;

    if (!wantsBanner) {
      if (bannerVisible) {
        await AdMob.removeBanner().catch(() => {});
        bannerVisible = false;
      }
      return false;
    }

    if (!(await requestConsent(AdMob, AdmobConsentStatus))) return false;

    if (!bannerVisible) {
      try {
        await AdMob.showBanner({
          adId: import.meta.env?.VITE_ADMOB_BANNER_ID || FALLBACK_BANNER_AD_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
        });
        bannerVisible = true;
      } catch {
        bannerVisible = false;
      }
    }
    return bannerVisible;
  } finally {
    // The banner overlays the screen bottom, outside the WebView — reserve
    // space on the page itself so it never covers app UI.
    globalThis.document?.body?.classList.toggle("pl-admob-banner", bannerVisible);
  }
}
