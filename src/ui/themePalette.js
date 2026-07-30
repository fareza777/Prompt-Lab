/**
 * Colour customisation.
 *
 * The whole interface is already drawn from a handful of CSS custom properties,
 * so a theme is just an override map written onto the root element. That is why
 * this costs a small module rather than a restyle.
 *
 * Two layers on purpose. Presets are the main path because they are guaranteed
 * readable. Free colour choice is offered as well — it was asked for — but with
 * a contrast check, because a cream page with yellow text is unreadable and the
 * complaint lands back on the app, not on the person who picked it.
 */

/** The tokens a user is allowed to change, and what each one visibly controls. */
export const PALETTE_KEYS = ["paper", "surface", "ink", "accent"];

/**
 * Maps a user-facing choice onto the token set it drives.
 *
 * `surface` covers cards and the document page; deriving the sunken and inset
 * shades from it keeps the depth of the interface intact instead of flattening
 * every layer to one colour.
 */
function tokensFor(palette) {
  const { paper, surface, ink, accent } = palette;
  return {
    "--paper": paper,
    "--paper-raised": surface,
    "--paper-sunken": mix(surface, ink, 0.06),
    "--paper-inset": mix(surface, ink, 0.1),
    "--paper-muted": mix(surface, ink, 0.04),
    "--tray": mix(paper, ink, 0.05),
    "--ink": ink,
    "--ink-2": mix(ink, paper, 0.18),
    "--ink-soft": mix(ink, paper, 0.3),
    "--ink-mute": mix(ink, paper, 0.45),
    "--ink-faint": mix(ink, paper, 0.55),
    "--rule": mix(paper, ink, 0.16),
    "--rule-strong": mix(paper, ink, 0.28),
    "--accent": accent,
    "--accent-hover": mix(accent, ink, 0.25),
    "--accent-ink": readableOn(accent),
    "--accent-soft": mix(paper, accent, 0.16),
    "--accent-line": mix(paper, accent, 0.5),
    "--focus": accent,
  };
}

/**
 * Curated palettes.
 *
 * Every one of these is checked by the contrast test, so picking from this list
 * cannot produce an unreadable screen.
 */
export const PALETTE_PRESETS = [
  {
    id: "kertas",
    name: { id: "Kertas", en: "Paper" },
    scheme: "light",
    palette: { paper: "#f7f3eb", surface: "#fffdf8", ink: "#1f241f", accent: "#2f5a46" },
  },
  {
    id: "kabut",
    name: { id: "Kabut", en: "Mist" },
    scheme: "light",
    palette: { paper: "#f2f4f7", surface: "#ffffff", ink: "#1b2330", accent: "#2f5d8a" },
  },
  {
    id: "tanah",
    name: { id: "Tanah", en: "Clay" },
    scheme: "light",
    palette: { paper: "#f6efe9", surface: "#fffcfa", ink: "#2a211c", accent: "#9a4a24" },
  },
  {
    id: "arsip",
    name: { id: "Arsip", en: "Archive" },
    scheme: "light",
    palette: { paper: "#f4f2ee", surface: "#ffffff", ink: "#22242a", accent: "#4b4f8a" },
  },
  {
    id: "malam",
    name: { id: "Malam", en: "Night" },
    scheme: "dark",
    palette: { paper: "#121618", surface: "#1a1f22", ink: "#eef2ef", accent: "#6fd0bb" },
  },
  {
    id: "tinta",
    name: { id: "Tinta", en: "Ink" },
    scheme: "dark",
    palette: { paper: "#14161c", surface: "#1c1f27", ink: "#e9ecf3", accent: "#8ea6ff" },
  },
];

const STORE_KEY = "promptlab-ui-palette";

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

/** #rgb / #rrggbb to [r, g, b]; anything unparseable comes back null. */
export function parseHex(value) {
  const hex = String(value || "").trim().replace(/^#/, "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16));
}

const toHex = (rgb) => `#${rgb.map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;

/** `amount` of `b` blended into `a`. Used to derive the shades around a choice. */
export function mix(a, b, amount) {
  const from = parseHex(a);
  const to = parseHex(b);
  if (!from || !to) return a;
  return toHex(from.map((channel, index) => channel + (to[index] - channel) * amount));
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(a, b) {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return 0;
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
}

/** Black or white, whichever is legible on the given background. */
export function readableOn(background) {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#000000")
    ? "#ffffff"
    : "#111111";
}

/**
 * What is wrong with a palette, as a list of problem codes.
 *
 * Body text is held to 7:1 rather than the 4.5:1 minimum: this app's whole
 * output is documents meant to be read at length, and 4.5:1 is uncomfortable
 * for that on a phone in daylight.
 */
export function paletteProblems(palette) {
  const problems = [];
  for (const key of PALETTE_KEYS) {
    if (!parseHex(palette?.[key])) problems.push({ code: "invalid", key });
  }
  if (problems.length) return problems;

  if (contrastRatio(palette.ink, palette.paper) < 7) problems.push({ code: "text_on_page", ratio: contrastRatio(palette.ink, palette.paper) });
  if (contrastRatio(palette.ink, palette.surface) < 7) problems.push({ code: "text_on_card", ratio: contrastRatio(palette.ink, palette.surface) });
  // The accent carries buttons and headings, so it needs to separate from both
  // the page behind it and the text beside it.
  if (contrastRatio(palette.accent, palette.paper) < 3) problems.push({ code: "accent_on_page", ratio: contrastRatio(palette.accent, palette.paper) });
  if (contrastRatio(palette.paper, palette.surface) > 8) problems.push({ code: "page_and_card" });

  return problems;
}

export const getPreset = (id) => PALETTE_PRESETS.find((preset) => preset.id === id) || null;

export function readPaletteChoice() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.preset && getPreset(parsed.preset)) return { preset: parsed.preset };
    if (parsed?.palette && !paletteProblems(parsed.palette).some((p) => p.code === "invalid")) {
      return { palette: parsed.palette, scheme: parsed.scheme === "dark" ? "dark" : "light" };
    }
  } catch {
    /* a corrupt choice must never keep the app off the screen */
  }
  return null;
}

export function writePaletteChoice(choice) {
  try {
    if (choice) localStorage.setItem(STORE_KEY, JSON.stringify(choice));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

/** Resolves a stored choice into the palette and scheme to paint. */
export function resolvePalette(choice) {
  if (choice?.preset) {
    const preset = getPreset(choice.preset);
    if (preset) return { palette: preset.palette, scheme: preset.scheme, id: preset.id };
  }
  if (choice?.palette) {
    return { palette: choice.palette, scheme: choice.scheme || "light", id: "custom" };
  }
  return null;
}

/**
 * Writes a palette onto the root element, or clears it back to the stylesheet.
 *
 * Clearing matters: without removing the properties, switching from a custom
 * palette back to the built-in theme would leave the old colours stuck on.
 */
export function applyPalette(choice) {
  if (typeof document === "undefined") return null;
  const root = document.documentElement;
  const resolved = resolvePalette(choice);

  if (!resolved) {
    for (const token of Object.keys(tokensFor(PALETTE_PRESETS[0].palette))) {
      root.style.removeProperty(token);
    }
    return null;
  }

  const tokens = tokensFor(resolved.palette);
  for (const [token, value] of Object.entries(tokens)) {
    root.style.setProperty(token, value);
  }
  // The launch screen and the Android status bar read this.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved.palette.paper);

  return resolved;
}

export { tokensFor };
