import { Capacitor } from "@capacitor/core";

/** True inside the Capacitor Android shell (app.promptlab.twa). */
export function isNativeAndroidApp() {
  return (
    typeof Capacitor !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

/** Android browser or installed app (heuristic, user agent only). */
export function isLikelyAndroidTwa() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}
