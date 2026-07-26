import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const firstRun = await readFile(new URL("../src/ui/FirstRun.jsx", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
const starters = await readFile(new URL("../src/ui/Starters.jsx", import.meta.url), "utf8");

test("language choice is separate from the skippable tour", () => {
  assert.match(firstRun, /data-stage="language"/);
  assert.match(firstRun, /data-stage="tour"/);
  assert.match(firstRun, /onPickLanguage\(item\.code\)/);
  assert.match(firstRun, /onSkipTour \|\| onFinish/);
  assert.match(shell, /onSkipTour=\{finishFirstRun\}/);
  assert.match(shell, /needsTour/);
});

test("the initial canvas shows at most three starter outcomes", () => {
  assert.match(starters, /templates\.slice\(0,\s*3\)/);
});
