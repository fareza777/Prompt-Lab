import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { translate, LANGUAGES, hasStoredLanguage } from "../src/ui/i18n.js";

const read = (p) => readFile(new URL(p, import.meta.url), "utf8");

const firstRun = await read("../src/ui/FirstRun.jsx");

// Node cannot import .jsx, so the step list is read back out of the source.
// That keeps this coupled to the real component rather than a copy.
const FIRST_RUN_STEPS = [...firstRun.matchAll(/^\s*id: "([a-z]+)",$/gm)].map((m) => ({
  id: m[1],
}));
const guide = await read("../src/ui/Guide.jsx");
const shell = await read("../src/ui/Shell.jsx");
const shellCss = await read("../src/ui/shell.css");
const resultSource = await read("../src/ui/Result.jsx");

test("first run can always be escaped", () => {
  // The previous build put a three-step wall in front of an auth wall and new
  // users left before seeing anything. Every screen must offer a way straight
  // into the app.
  assert.match(firstRun, /firstrun\.skip/, "no skip control");
  assert.match(firstRun, /firstrun\.startNow/, "no direct start shortcut");
  assert.match(firstRun, /onFinish/, "no completion handler");
});

test("first run is shown once and remembered", () => {
  assert.match(shell, /const FIRST_RUN_KEY = "promptlab-onboarded"/);
  assert.match(shell, /if \(!firstRunDone\)/);
  // Storage failure must not trap someone on a screen we cannot dismiss.
  assert.match(shell, /return true; \/\/ No storage/);
});

test("language is chosen explicitly on first run and persisted", () => {
  assert.match(firstRun, /stage === "language"/);
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

test("every walkthrough step has full copy in both languages", () => {
  assert.ok(FIRST_RUN_STEPS.length >= 3, "walkthrough is too thin");
  for (const step of FIRST_RUN_STEPS) {
    for (const lang of ["id", "en"]) {
      for (const part of ["title", "body"]) {
        const key = `firstrun.${step.id}.${part}`;
        const value = translate(lang, key);
        assert.notEqual(value, key, `${key} missing for ${lang}`);
        assert.ok(value.length > 12, `${key} is too short for ${lang}`);
      }
      // Each step carries at least one supporting point.
      const point = translate(lang, `firstrun.${step.id}.point1`);
      assert.notEqual(point, `firstrun.${step.id}.point1`, `point1 missing for ${step.id}/${lang}`);
    }
  }
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
  assert.match(resultSource, /result\.working/);
  assert.match(resultSource, /result\.workingHint/);
  assert.match(resultSource, /function Elapsed\(\)/, "no elapsed-time feedback");
  for (const lang of ["id", "en"]) {
    const hint = translate(lang, "result.workingHint");
    assert.match(hint, /20/, `${lang} hint does not state an expected duration`);
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
