import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { translate, LANGUAGES, hasStoredLanguage } from "../src/ui/i18n.js";

const read = (p) => readFile(new URL(p, import.meta.url), "utf8");

const firstRun = await read("../src/ui/FirstRun.jsx");

const guide = await read("../src/ui/Guide.jsx");
const shell = await read("../src/ui/Shell.jsx");
const shellCss = await read("../src/ui/shell.css");
const resultSource = await read("../src/ui/Result.jsx");

test("first run is only a language choice and finishes immediately", () => {
  assert.match(firstRun, /LANGUAGES\.map/);
  assert.match(firstRun, /onPickLanguage\(code\)/);
  assert.match(firstRun, /onFinish/, "no completion handler");
  assert.doesNotMatch(firstRun, /nextStep|FIRST_RUN_STEPS|walkthrough/);
});

test("first run is shown once and remembered", () => {
  assert.match(shell, /const FIRST_RUN_KEY = "promptlab-onboarded"/);
  assert.match(shell, /if \(!firstRunDone\)/);
  // Storage failure must not trap someone on a screen we cannot dismiss.
  assert.match(shell, /return true; \/\/ No storage/);
});

test("language is chosen explicitly on first run and persisted", () => {
  assert.match(firstRun, /data-stage="language"/);
  assert.match(firstRun, /onPickLanguage/);
  assert.match(shell, /hasStoredLanguage/);
  assert.equal(typeof hasStoredLanguage, "function");
});

test("each language names itself in the picker", () => {
  for (const item of LANGUAGES) {
    assert.ok(item.nativeLabel, `${item.code} has no nativeLabel`);
  }
  assert.equal(LANGUAGES.find((l) => l.code === "id").nativeLabel, "Bahasa Indonesia");
  assert.equal(LANGUAGES.find((l) => l.code === "en").nativeLabel, "English");
  assert.match(firstRun, /item\.nativeLabel/);
});

test("the detailed guide stays reachable after first run", () => {
  assert.match(shell, /sheet === "guide"/);
  assert.match(shell, /aria-label=\{t\("guide\.title"\)\}/);
  assert.match(guide, /guide\.section\.workflow/);
  assert.match(guide, /guide\.section\.tips/);
  assert.match(guide, /guide\.section\.limits/);
  assert.match(guide, /onReplay/, "walkthrough cannot be replayed");
  for (const lang of ["id", "en"]) {
    for (const n of [1, 2, 3, 4]) {
      assert.notEqual(translate(lang, `guide.tip${n}`), `guide.tip${n}`);
      assert.notEqual(translate(lang, `guide.limit${n}`), `guide.limit${n}`);
    }
  }
});

test("the guide states the AI-accuracy and timing caveats", () => {
  // These are the two things a first-time user is most likely to be caught by.
  assert.match(translate("id", "guide.limit1"), /AI|periksa/i);
  assert.match(translate("en", "guide.limit1"), /AI|check/i);
  assert.match(translate("id", "guide.limit2"), /detik/);
  assert.match(translate("en", "guide.limit2"), /seconds/);
});

test("the wait sets an expectation instead of showing a bare spinner", () => {
  assert.match(resultSource, /result\.runWorking/);
  assert.match(resultSource, /result\.workingHint/);
  assert.match(resultSource, /function Elapsed\(\)/, "no elapsed-time feedback");
  for (const lang of ["id", "en"]) {
    const hint = translate(lang, "result.runWorkingHint");
    assert.match(hint, /30|60/, `${lang} hint does not state an expected duration`);
  }
  assert.match(shellCss, /\.pl-working/);
});

test("first-run motion respects reduced-motion", async () => {
  // The blanket rule in base.css neutralises every animation, including the
  // first-run and launch-screen ones defined elsewhere.
  const baseCss = await read("../src/ui/base.css");
  assert.match(baseCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(baseCss, /animation-duration: 0\.01ms !important/);
  // The launch screen sits outside the bundle, so it opts out on its own.
  const indexHtml = await read("../index.html");
  assert.match(
    indexHtml,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.app-splash__brand/,
    "launch screen does not honour reduced motion"
  );
});
