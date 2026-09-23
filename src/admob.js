import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Banner-ads for the Capacitor Android build via @capacitor-community/admob.
 * Free-plan users see a single adaptive banner pinned to the bottom of the
 * shell; Pro/Business never load one. The plugin module itself is imported
 * lazily — it is a no-op on the web, and keeping it out of the initial graph
 * keeps the web bundle inside its asset budget.
 *
 * Resilience: the banner re-syncs when the app resumes or the network comes
 * back, and retries with backoff when a show/load attempt fails (offline at
 * launch, transient no-fill) — retries stop after a few attempts and wait for
 * the next resume/online/plan-change trigger.
 *
 * The release IDs are public identifiers (they are safe to ship in an app).
 * Keep the Vite override for local QA, while the checked-in fallback keeps a
 * release build monetized even when no local .env file is present.
 */

const FALLBACK_BANNER_AD_ID = "ca-app-pub-6279186647593327/9657875420";
const RETRY_DELAYS_MS = [15000, 30000, 60000, 120000];

let initialized = false;
let bannerVisible = false;
let lastPlan = null;
let retryAttempt = 0;
let retryTimer = null;
let hooksAttached = false;
let bannerHeightDp = null;

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

// The banner overlays the screen bottom, outside the WebView — reserve space
// on the page itself so it never covers app UI. Height comes from the real
// banner size when AdMob reports it (60px fallback in CSS).
function applyBannerPadding() {
	const body = globalThis.document?.body;
	if (!body) return;
	body.classList.toggle("pl-admob-banner", bannerVisible);
	if (bannerVisible && bannerHeightDp) {
		body.style.setProperty("--pl-banner-height", `${bannerHeightDp}px`);
	} else {
		body.style.removeProperty("--pl-banner-height");
	}
}

function clearRetry() {
	if (retryTimer) {
		clearTimeout(retryTimer);
		retryTimer = null;
	}
}

function scheduleRetry() {
	if (!isAdMobCapable() || lastPlan !== "Free") return;
	if (retryAttempt >= RETRY_DELAYS_MS.length) return;
	const delay = RETRY_DELAYS_MS[retryAttempt];
	retryAttempt += 1;
	clearRetry();
	retryTimer = setTimeout(() => {
		retryTimer = null;
		void syncNativeBanner(lastPlan);
	}, delay);
}

function resyncFromZero() {
	retryAttempt = 0;
	void syncNativeBanner(lastPlan);
}

function attachHooks(AdMob, BannerAdPluginEvents) {
	if (hooksAttached) return;
	hooksAttached = true;
	AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
		bannerVisible = true;
		retryAttempt = 0;
		applyBannerPadding();
	}).catch(() => {});
	AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
		bannerVisible = false;
		applyBannerPadding();
		scheduleRetry();
	}).catch(() => {});
	AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
		bannerHeightDp = size?.height > 0 ? size.height : null;
		applyBannerPadding();
	}).catch(() => {});
	App.addListener("resume", resyncFromZero).catch(() => {});
	globalThis.addEventListener?.("online", resyncFromZero);
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
	lastPlan = plan;
	try {
		if (!isAdMobCapable()) return false;
		const { AdMob, AdmobConsentStatus, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } = await loadAdMob();
		attachHooks(AdMob, BannerAdPluginEvents);
		const wantsBanner = plan === "Free";

		if (!(await ensureInitialized(AdMob))) {
			scheduleRetry();
			return false;
		}

		if (!wantsBanner) {
			clearRetry();
			if (bannerVisible) {
				await AdMob.removeBanner().catch(() => {});
				bannerVisible = false;
			}
			return false;
		}

		if (!bannerVisible) {
			if (!(await requestConsent(AdMob, AdmobConsentStatus))) return false;
			try {
				await AdMob.showBanner({
					adId: import.meta.env?.VITE_ADMOB_BANNER_ID || FALLBACK_BANNER_AD_ID,
					adSize: BannerAdSize.ADAPTIVE_BANNER,
					position: BannerAdPosition.BOTTOM_CENTER,
				});
				bannerVisible = true;
			} catch {
				bannerVisible = false;
				scheduleRetry();
			}
		}
		return bannerVisible;
	} finally {
		applyBannerPadding();
	}
}
