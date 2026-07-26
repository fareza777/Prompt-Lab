/**
 * Appearance preference: system (default), light, or dark.
 *
 * The choice is written to [data-ui-theme] on <html>, which the token layer
 * uses to override the prefers-color-scheme signal in both directions. The
 * Android status bar colour follows via theme-color.
 */

const STORE_KEY = "promptlab-ui-theme";
const MODES = ["system", "light", "dark"];

/** Matches --paper in tokens.css for each scheme. */
const BAR_COLOR = { light: "#f7f3eb", dark: "#121618" };

export function readThemeMode() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (MODES.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  return "light";
}

function prefersDark() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function resolveScheme(mode) {
  if (mode === "light" || mode === "dark") return mode;
  return prefersDark() ? "dark" : "light";
}

export function applyThemeMode(mode) {
  const safeMode = MODES.includes(mode) ? mode : "light";
  const root = document.documentElement;
  const scheme = resolveScheme(safeMode);

  // Always write the resolved scheme so dark tokens apply for both "dark"
  // and "system" (when the OS is dark). Light remains the saved default.
  root.setAttribute("data-ui-theme", scheme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", BAR_COLOR[scheme]);

  try {
    localStorage.setItem(STORE_KEY, safeMode);
  } catch {
    /* ignore */
  }
  return safeMode;
}

/**
 * Keeps the status bar in step with the OS while the user is on "system".
 * Returns an unsubscribe function.
 */
export function watchSystemScheme(onChange) {
  let media;
  try {
    media = window.matchMedia("(prefers-color-scheme: dark)");
  } catch {
    return () => {};
  }
  const handler = () => onChange(prefersDark() ? "dark" : "light");
  media.addEventListener?.("change", handler);
  return () => media.removeEventListener?.("change", handler);
}

export const THEME_MODES = MODES;
