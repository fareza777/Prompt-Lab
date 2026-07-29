import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (p) => readFile(new URL(p, import.meta.url), "utf8");

const main = await read("../src/main.jsx");
const theme = await read("../src/ui/theme.js");
const account = await read("../src/ui/Account.jsx");
const indexHtml = await read("../index.html");

const runTemplate = main.slice(
  main.indexOf("async function runTemplate("),
  main.indexOf("/** Moves a filed document to the day")
);

test("a guest gets an anonymous session before a template run", () => {
  // Every run used to pass through generatePrompt, which bootstrapped the
  // trial session as a side effect. Template mode skips that step by design,
  // and skipping it also skipped the sign-in — so a guest who picked a
  // template could never generate anything.
  assert.ok(runTemplate.length > 0, "runTemplate could not be located");
  assert.match(runTemplate, /const onTrial = !hasAuthSession \|\| isAnonymousSession/);
  assert.match(runTemplate, /await ensureTrialSession\(\)/);
  assert.match(runTemplate, /Sign in to use AI features\./);
});

test("the trial limit is enforced on the template path too", () => {
  assert.match(runTemplate, /if \(onTrial && trialUsed >= TRIAL_LIMIT\)/);
  // The session must be established before the request is built, not after.
  assert.ok(
    runTemplate.indexOf("ensureTrialSession") < runTemplate.indexOf("getAuthHeaders"),
    "the session is created after the auth headers are read"
  );
  assert.match(runTemplate, /if \(isAnonymousSession\) countTrialUse\(\)/);
});

test("light is the default appearance and dark is an explicit choice", () => {
  // Following the OS meant every user whose phone sits in dark mode opened a
  // document tool in dark without ever choosing it.
  assert.match(theme, /const MODES = \["light", "dark"\]/);
  assert.doesNotMatch(theme, /prefers-color-scheme/);
  assert.match(theme, /return "light";/);
  assert.match(theme, /mode === "dark" \? "dark" : "light"/);

  // A stored "system" from an earlier version must fall back to light.
  assert.doesNotMatch(theme, /MODES = \[[^\]]*"system"/);

  // Only the two real options are offered.
  assert.match(account, /\["light", Sun/);
  assert.match(account, /\["dark", Moon/);
  assert.doesNotMatch(account, /\["system", Monitor/);

  // The pre-React boot script must agree, or the launch screen flashes.
  assert.match(indexHtml, /if \(mode === "light" \|\| mode === "dark"\)/);
  assert.match(indexHtml, /var dark = mode === "dark";/);
});

test("source files are free of mojibake", () => {
  // A PowerShell round-trip re-encoded UTF-8 as Latin-1, turning em dashes and
  // arrows in user-visible strings into "a€"" sequences.
  for (const [name, source] of [
    ["main.jsx", main],
    ["theme.js", theme],
    ["Account.jsx", account],
  ]) {
    const line = source.split("\n").findIndex((l) => /â€|â†|Ã©/.test(l));
    assert.equal(line, -1, `${name} has mangled characters on line ${line + 1}`);
  }
});
