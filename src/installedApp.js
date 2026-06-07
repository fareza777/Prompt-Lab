/** Detect Play Store TWA / installed PWA (not regular browser tab). */
export function isInstalledApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
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
