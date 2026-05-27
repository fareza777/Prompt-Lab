/** Clear broken PWA caches that caused blank screens after deploy. */
export async function purgeLegacyServiceWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    /* ignore */
  }
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    /* ignore */
  }
}

export function repairStuckLocalProfile() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("promptlab-account");
    if (raw) JSON.parse(raw);
  } catch {
    localStorage.removeItem("promptlab-account");
  }
}
