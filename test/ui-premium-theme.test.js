import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tokens = await readFile(new URL("../src/ui/tokens.css", import.meta.url), "utf8");
const shellCss = await readFile(new URL("../src/ui/shell.css", import.meta.url), "utf8");
const theme = await readFile(new URL("../src/ui/theme.js", import.meta.url), "utf8");

test("premium theme is light-first and uses warm editorial tokens", () => {
  assert.match(tokens, /--paper:\s*#f7f3eb/i);
  assert.match(tokens, /--ink:\s*#1f241f/i);
  assert.match(tokens, /--accent:\s*#2f5a46/i);
  assert.match(tokens, /--shadow-ambient:/);
  assert.match(theme, /return "light"/);
});

test("work surfaces use nested trays and mobile-safe columns", () => {
  assert.match(shellCss, /\.pl-workbench/);
  assert.match(shellCss, /\.pl-composer-tray/);
  assert.match(shellCss, /\.pl-result-tray/);
  assert.match(shellCss, /minmax\(0,\s*1fr\)/);
});

test("active UI avoids the old neon and grid visual language", () => {
  assert.doesNotMatch(shellCss, /#00ffff|#00e5ff|cyan|grid-texture/i);
});
