import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const firstRun = await readFile(new URL("../src/ui/FirstRun.jsx", import.meta.url), "utf8");
const starters = await readFile(new URL("../src/ui/Starters.jsx", import.meta.url), "utf8");

test("language choice finishes first run without a blocking tour", () => {
  assert.doesNotMatch(firstRun, /const STEPS/);
  assert.doesNotMatch(firstRun, /data-stage="tour"/);
  assert.match(firstRun, /onPickLanguage\(code\)/);
  assert.match(firstRun, /onFinish\(\)/);
});

test("the initial canvas shows at most three starter outcomes", () => {
  assert.match(starters, /templates\.slice\(0,\s*3\)/);
});
