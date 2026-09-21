/** Detect the installed Android app (Capacitor build or legacy Play Store TWA) / installed PWA — not a regular browser tab. */
export function isInstalledApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    window.Capacitor?.isNativePlatform?.() === true ||
    (typeof document !== "undefined" && document.referrer.includes("android-app://"))
  );
}

export function hasInstalledAppEntry() {
  if (!isInstalledApp()) return true;
  try {
    return sessionStorage.getItem("promptlab-app-entered") === "1";
  } catch {
    return false;
  }
}

export function markInstalledAppEntered() {
  try {
    sessionStorage.setItem("promptlab-app-entered", "1");
  } catch {
    /* ignore */
  }
}

export function clearInstalledAppEntry() {
  try {
    sessionStorage.removeItem("promptlab-app-entered");
  } catch {
    /* ignore */
  }
}

/**
 * Open verified App Links (https://prompt-lab.xyz/...) inside the Capacitor
 * WebView — same behavior TWA gave for links pointing at the app domain.
 * No-op in browsers.
 */
export function installNativeAppLinkHandler() {
  if (typeof window === "undefined") return;
  if (window.Capacitor?.isNativePlatform?.() !== true) return;
  const appPlugin = window.Capacitor?.Plugins?.App;
  if (!appPlugin?.addListener) return;
  appPlugin.addListener("appUrlOpen", ({ url }) => {
    if (typeof url === "string" && url.startsWith("https://prompt-lab.xyz")) {
      window.location.href = url;
    }
  });
}
