/**
 * Hold the launch screen only long enough to avoid a flash. The previous 900ms
 * floor made every start feel slow even when the app was ready sooner.
 */
const MIN_VISIBLE_MS = 150;

function splashElement() {
  return document.getElementById("app-splash");
}

export function dismissStartupSplash() {
  const el = splashElement();
  if (!el || el.dataset.dismissed === "true") return;

  const startedAt = Number(el.dataset.startedAt || performance.now());
  const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));

  window.setTimeout(() => {
    if (!el.isConnected) return;
    el.dataset.dismissed = "true";
    el.classList.add("is-exiting");
    window.setTimeout(() => el.remove(), 520);
  }, wait);
}

export function markStartupSplashStarted() {
  const el = splashElement();
  if (!el) return;
  el.dataset.startedAt = String(performance.now());
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isApp =
    path === "/app" ||
    path.startsWith("/app/") ||
    /^\/promptlab$/i.test(path) ||
    standalone;
  if (!isApp) dismissStartupSplash();
}

/** If React fails to mount, do not trap the user on splash forever. */
export function installSplashSafetyNet() {
  window.setTimeout(() => dismissStartupSplash(), 9000);
}
