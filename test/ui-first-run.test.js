import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { translate, LANGUAGES, hasStoredLanguage } from "../src/ui/i18n.js";

const read = (p) => readFile(new URL(p, import.meta.url), "utf8");

const firstRun = await read("../src/ui/FirstRun.jsx");
const authGate = await read("../src/ui/AuthGate.jsx");
const guide = await read("../src/ui/Guide.jsx");
const shell = await read("../src/ui/Shell.jsx");
const shellCss = await read("../src/ui/shell.css");
const resultSource = await read("../src/ui/Result.jsx");

test("boot order is language, then auth/guest, then skippable tour", () => {
  assert.match(shell, /Boot order: language → login\/guest → skippable tour → canvas/);
  assert.match(shell, /const AUTH_GATE_KEY = "promptlab-auth-gate"/);
  assert.match(shell, /const GUEST_KEY = "promptlab-guest"/);
  assert.match(shell, /needsAuthGate/);
  assert.match(shell, /needsTour/);
  assert.match(shell, /continueAsGuest/);
  assert.match(shell, /<AuthGate/);
});

test("first run language stage finishes into the next boot step", () => {
  assert.match(firstRun, /LANGUAGES\.map/);
  assert.match(firstRun, /onPickLanguage\(item\.code\)/);
  assert.match(firstRun, /data-stage="language"/);
  assert.match(shell, /hasStoredLanguage/);
  assert.equal(typeof hasStoredLanguage, "function");
});

test("onboarding tour is detailed, skippable, and covers menus", () => {
  assert.match(firstRun, /const TOUR_STEPS/);
  assert.match(firstRun, /data-stage="tour"/);
  assert.match(firstRun, /id: "menus"/);
  assert.match(firstRun, /firstrun\.menus\.title/);
  assert.match(firstRun, /onSkipTour/);
  assert.match(firstRun, /firstrun\.skip/);
  assert.match(firstRun, /firstrun\.startNow/);
  for (const lang of ["id", "en"]) {
    assert.notEqual(translate(lang, "firstrun.menus.point1"), "firstrun.menus.point1");
    assert.notEqual(translate(lang, "firstrun.stepOf"), "firstrun.stepOf");
  }
});

test("auth gate offers guest continue without email", () => {
  assert.match(authGate, /data-stage="auth"/);
  assert.match(authGate, /auth\.gate\.guest/);
  assert.match(authGate, /onGuest/);
  assert.match(authGate, /UserRound/);
  for (const lang of ["id", "en"]) {
    assert.match(translate(lang, "auth.gate.guestHint"), /email/i);
  }
});

test("first run / auth choices are remembered", () => {
  assert.match(shell, /const FIRST_RUN_KEY = "promptlab-onboarded"/);
  assert.match(shell, /writeFirstRunDone\(true\)/);
  assert.match(shell, /writeAuthGateDone\(true\)/);
  // Storage failure must not trap someone on a screen we cannot dismiss.
  assert.match(shell, /return true; \/\/ No storage/);
});

test("brand title is a home control", () => {
  assert.match(shell, /className="pl-brand"/);
  assert.match(shell, /onClick=\{goHome\}/);
  assert.match(shell, /brand\.homeAria/);
  assert.match(shell, /clearComposer/);
  assert.match(shellCss, /\.pl-brand:hover/);
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
  const baseCss = await read("../src/ui/base.css");
  assert.match(baseCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(baseCss, /animation-duration: 0\.01ms !important/);
  const indexHtml = await read("../index.html");
  assert.match(
    indexHtml,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.app-splash__brand/,
    "launch screen does not honour reduced motion"
  );
});
