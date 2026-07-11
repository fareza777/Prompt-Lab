import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainSource = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");

test("local score displays identify heuristic scoring", () => {
  assert.match(mainSource, /Heuristic score/i);
  assert.match(mainSource, /scoreMethod/);
  assert.match(mainSource, /scoreNote/);
});

test("local compare fallback keeps measured dimensions and is not labelled as provider scoring", () => {
  assert.match(mainSource, /constraints: scoreA\.constraints/);
  assert.match(mainSource, /risk: scoreA\.risk/);
  assert.match(mainSource, /compareSource !== "score-based"/);
  assert.doesNotMatch(mainSource, /constraints: Math\.max\(40/);
});
