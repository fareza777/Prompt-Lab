/**
 * Appearance preference: light (default) or dark.
 *
 * "Follow the system" was removed. It meant anyone whose phone sits in dark
 * mode — most people, by default on Android — opened a document tool in dark
 * without ever choosing it, and reported the app as "dark mode only". This is
 * a read-and-write tool for documents that end up on white paper, so light is
 * the deliberate default and dark is an explicit choice.
 *
 * The choice is written to [data-ui-theme] on <html>, which the token layer
 * reads. The Android status bar colour follows via theme-color.
 */

const STORE_KEY = "promptlab-ui-theme";
const MODES = ["light", "dark"];

/** Matches --paper in tokens.css for each scheme. */
const BAR_COLOR = { light: "#f7f3eb", dark: "#121618" };

export function readThemeMode() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (MODES.includes(saved)) return saved;
    // Anyone carrying the retired "system" setting is moved to light rather
    // than left on whatever their phone happens to be set to.
  } catch {
    /* ignore */
  }
  return "light";
}

export function resolveScheme(mode) {
  return mode === "dark" ? "dark" : "light";
}

export function applyThemeMode(mode) {
  const safeMode = MODES.includes(mode) ? mode : "light";
  const root = document.documentElement;
  const scheme = resolveScheme(safeMode);

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
 * Retained so callers do not have to branch; the app no longer follows the OS,
 * so there is nothing to watch.
 */
export function watchSystemScheme() {
  return () => {};
}

export const THEME_MODES = MODES;
