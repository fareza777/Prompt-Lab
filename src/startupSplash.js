const MIN_VISIBLE_MS = 1650;

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
}

/** If React fails to mount (stale cache, JS error), do not trap the user on splash forever. */
export function installSplashSafetyNet() {
  const force = () => dismissStartupSplash();
  window.addEventListener("error", force);
  window.addEventListener("unhandledrejection", force);
  window.setTimeout(force, 9000);
}
