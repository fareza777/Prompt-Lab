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

test("a template run needs no account or trial session", () => {
  // Accounts, trials and quotas were removed with Supabase: anyone can run a
  // template straight away; spend is bounded by the server rate limit.
  assert.ok(runTemplate.length > 0, "runTemplate could not be located");
  assert.doesNotMatch(runTemplate, /ensureTrialSession|onTrial|TRIAL_LIMIT|countTrialUse/);
  assert.doesNotMatch(runTemplate, /Sign in to use AI features/);
  assert.doesNotMatch(main, /@supabase|supabaseClient/);
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
