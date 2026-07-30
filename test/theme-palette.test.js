import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PALETTE_KEYS,
  PALETTE_PRESETS,
  contrastRatio,
  mix,
  paletteProblems,
  parseHex,
  readableOn,
  resolvePalette,
  tokensFor,
} from "../src/ui/themePalette.js";
import { translate } from "../src/ui/i18n.js";

/**
 * Colour freedom is the feature, unreadability is the risk.
 *
 * A preset is a promise that the screen will be readable, so every one of them
 * is held to the same floor the custom editor warns about. If a preset ever
 * fails this, users will hit it without having chosen anything.
 */

test("every preset is readable", () => {
  for (const preset of PALETTE_PRESETS) {
    const problems = paletteProblems(preset.palette);
    assert.deepEqual(
      problems,
      [],
      `preset "${preset.id}" is not readable: ${JSON.stringify(problems)}`
    );
  }
});

test("body text on a preset clears the document reading floor", () => {
  // 7:1 rather than the 4.5:1 minimum: this app's whole output is documents read
  // at length, and 4.5:1 is uncomfortable for that on a phone in daylight.
  for (const preset of PALETTE_PRESETS) {
    const onPage = contrastRatio(preset.palette.ink, preset.palette.paper);
    const onCard = contrastRatio(preset.palette.ink, preset.palette.surface);
    assert.ok(onPage >= 7, `${preset.id}: text on page is ${onPage.toFixed(1)}:1`);
    assert.ok(onCard >= 7, `${preset.id}: text on card is ${onCard.toFixed(1)}:1`);
  }
});

test("presets are named in both languages and cover light and dark", () => {
  const ids = new Set();
  for (const preset of PALETTE_PRESETS) {
    assert.ok(!ids.has(preset.id), `duplicate preset id ${preset.id}`);
    ids.add(preset.id);
    for (const language of ["id", "en"]) {
      assert.ok(preset.name[language], `${preset.id} has no ${language} name`);
    }
    assert.ok(["light", "dark"].includes(preset.scheme));
    for (const key of PALETTE_KEYS) {
      assert.ok(parseHex(preset.palette[key]), `${preset.id}.${key} is not a colour`);
    }
  }
  const schemes = new Set(PALETTE_PRESETS.map((preset) => preset.scheme));
  assert.ok(schemes.has("light") && schemes.has("dark"), "no dark preset is offered");
});

test("an unreadable custom palette is reported, not silently accepted", () => {
  // Yellow text on cream is the case that makes documents unusable.
  const bad = { paper: "#f7f3eb", surface: "#fffdf8", ink: "#e8d24a", accent: "#f0e2a0" };
  const codes = paletteProblems(bad).map((problem) => problem.code);
  assert.ok(codes.includes("text_on_page"), `expected a text warning, got ${codes}`);
  assert.ok(codes.includes("accent_on_page"));

  // And the warning names the ratio, so the user can tell how far off they are.
  const problem = paletteProblems(bad).find((entry) => entry.code === "text_on_page");
  assert.ok(problem.ratio > 1 && problem.ratio < 7);
});

test("an invalid colour is caught before any contrast maths runs", () => {
  const problems = paletteProblems({ paper: "not-a-colour", surface: "#fff", ink: "#000", accent: "#123456" });
  assert.deepEqual(problems.map((p) => p.code), ["invalid"]);
});

test("button text is chosen for legibility, never fixed", () => {
  // A yellow accent with white text is unreadable; the same button on navy is
  // unreadable in black. The choice has to follow the colour.
  assert.equal(readableOn("#f5e06a"), "#111111");
  assert.equal(readableOn("#1b2330"), "#ffffff");
  assert.ok(contrastRatio("#f5e06a", readableOn("#f5e06a")) >= 4.5);
});

test("the derived tokens keep the interface's layering", () => {
  // Only four colours are asked for; flattening every surface to one of them
  // would erase the depth the design relies on.
  const tokens = tokensFor(PALETTE_PRESETS[0].palette);
  for (const token of ["--paper", "--paper-raised", "--paper-sunken", "--rule", "--accent-ink", "--ink-faint"]) {
    assert.ok(tokens[token], `${token} was not derived`);
  }
  assert.notEqual(tokens["--paper-sunken"], tokens["--paper-raised"]);
  assert.notEqual(tokens["--ink-faint"], tokens["--ink"]);
});

test("mixing blends toward the second colour and survives bad input", () => {
  assert.equal(mix("#000000", "#ffffff", 0), "#000000");
  assert.equal(mix("#000000", "#ffffff", 1), "#ffffff");
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(mix("nonsense", "#ffffff", 0.5), "nonsense");
});

test("a stored choice resolves back to a palette and a scheme", () => {
  assert.equal(resolvePalette(null), null);
  const fromPreset = resolvePalette({ preset: "malam" });
  assert.equal(fromPreset.scheme, "dark");
  assert.equal(fromPreset.id, "malam");

  const own = { paper: "#101010", surface: "#1a1a1a", ink: "#f0f0f0", accent: "#7fd1c1" };
  const fromCustom = resolvePalette({ palette: own, scheme: "dark" });
  assert.equal(fromCustom.id, "custom");
  assert.deepEqual(fromCustom.palette, own);

  // An unknown preset must not paint a broken theme.
  assert.equal(resolvePalette({ preset: "does-not-exist" }), null);
});

test("the editor is wired into settings and free for every plan", async () => {
  const account = await readFile(new URL("../src/ui/Account.jsx", import.meta.url), "utf8");
  assert.match(account, /<ThemeEditor/);
  // No plan gate: the presets are what make the app feel like the user's own.
  const editor = await readFile(new URL("../src/ui/ThemeEditor.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(editor, /entitlements|plan|upgrade/i);

  const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
  assert.match(shell, /applyPalette\(paletteChoice\)/);
  assert.match(shell, /writePaletteChoice/);
  // The override has to run after applyThemeMode or the stylesheet wins.
  assert.ok(
    shell.indexOf("applyThemeMode(themeMode)") < shell.indexOf("applyPalette(paletteChoice)"),
    "the palette is applied before the mode, so it will be overwritten"
  );
});

test("the Light/Dark control keeps authority over the scheme", async () => {
  // Setting data-ui-theme from the palette effect broke the control outright:
  // every render forced the attribute back to the active palette's scheme, so
  // pressing Dark did nothing at all.
  const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
  const effect = shell.slice(
    shell.indexOf("applyPalette(paletteChoice);"),
    shell.indexOf("const pickPreset")
  );
  assert.ok(effect.length > 0, "the palette effect could not be located");
  assert.doesNotMatch(effect, /setAttribute\("data-ui-theme"/);

  // Picking a dark preset moves the switch with it.
  assert.match(shell, /const scheme = resolvePalette\(choice\)\?\.scheme/);
  assert.match(shell, /if \(scheme\) setThemeModeState\(applyThemeMode\(scheme\)\)/);

  // And switching scheme drops a palette belonging to the other one, so the
  // control always produces a visible change.
  assert.match(shell, /if \(resolvePalette\(current\)\?\.scheme === next\) return current/);
  assert.match(shell, /writePaletteChoice\(null\)/);
});

test("light pages are clearly deeper than the cards on them", () => {
  // The first set used near-white for both, and every preset read as "white,
  // slightly different" — the page and the document on it were indistinguishable.
  for (const preset of PALETTE_PRESETS.filter((entry) => entry.scheme === "light")) {
    const separation = contrastRatio(preset.palette.paper, preset.palette.surface);
    assert.ok(
      separation >= 1.15,
      `${preset.id}: page and card are only ${separation.toFixed(2)}:1 apart`
    );
  }
});

test("every colour-settings string exists in both languages", () => {
  const keys = [
    "theme.title",
    "theme.intro",
    "theme.customTitle",
    "theme.customHint",
    "theme.contrastOk",
    "theme.warnTextPage",
    "theme.warnTextCard",
    "theme.warnAccent",
    "theme.warnLayers",
    "theme.warnInvalid",
    "theme.reset",
    ...PALETTE_KEYS.map((key) => `theme.colour.${key}`),
  ];
  for (const key of keys) {
    for (const lang of ["id", "en"]) {
      assert.notEqual(translate(lang, key), key, `${key} missing for ${lang}`);
    }
  }
  // The warnings have to say what to do, not just that something is wrong.
  assert.match(translate("id", "theme.warnTextPage"), /Gelapkan|terangkan/i);
  assert.match(translate("en", "theme.warnTextPage"), /Darken|lighten/i);
});
