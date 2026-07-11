import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainSource = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
const stylesSource = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const commandPaletteSource = await readFile(new URL("../src/commandPalette.jsx", import.meta.url), "utf8");

test("local score displays identify heuristic scoring", () => {
  assert.match(mainSource, /Heuristic score/i);
  assert.match(mainSource, /scoreMethod/);
  assert.match(mainSource, /scoreNote/);
});

test("local compare fallback keeps measured dimensions and is not labelled as provider scoring", () => {
  assert.match(mainSource, /constraints: scoreA\.constraints/);
  assert.match(mainSource, /risk: scoreA\.risk/);
  assert.doesNotMatch(mainSource, /constraints: Math\.max\(40/);
});

test("winner snapshot renders the authoritative compare evaluation label", () => {
  assert.match(mainSource, /getCompareEvaluationMeta/);
  assert.match(mainSource, /Winner snapshot[\s\S]*compareEvaluation\.label/);
});

test("mobile navigation is V2-only and owns exactly five columns", () => {
  assert.match(mainSource, /<nav className="v2-bottom-nav">/);
  assert.doesNotMatch(mainSource, /className="bottom-nav v2-bottom-nav"/);
  assert.match(stylesSource, /\.v2-bottom-nav\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
});

test("interactive controls have a visible keyboard focus treatment", () => {
  assert.match(stylesSource, /:focus-visible/);
  assert.match(stylesSource, /outline:\s*[^;]+/);
});

test("Builder request label is associated with its textarea", () => {
  assert.match(mainSource, /<label[^>]*htmlFor="builder-request"[^>]*>User request<\/label>/);
  assert.match(mainSource, /<textarea[^>]*id="builder-request"/);
});

test("selection chips expose their pressed state", () => {
  assert.match(mainSource, /aria-pressed=\{value === option\}/);
  assert.match(mainSource, /aria-pressed=\{filter === item\}/);
});

test("auth, settings, and admin tab controls identify tabs and panels", () => {
  assert.match(mainSource, /role="tab"[\s\S]*?aria-selected=/);
  assert.match(mainSource, /aria-controls=\{`settings-panel-/);
  assert.match(mainSource, /aria-controls=\{`admin-panel-/);
  assert.match(mainSource, /role="tabpanel"[\s\S]*?id=\{`settings-panel-/);
  assert.match(mainSource, /role="tabpanel"[\s\S]*?id=\{`admin-panel-/);
  assert.match(mainSource, /aria-controls="auth-panel"/);
  assert.match(mainSource, /role="tabpanel" id="auth-panel"/);
});

test("command palette is modal and manages focus containment and restoration", () => {
  assert.match(commandPaletteSource, /aria-modal="true"/);
  assert.match(commandPaletteSource, /event\.key === "Tab"/);
  assert.match(commandPaletteSource, /previouslyFocused/);
  assert.match(commandPaletteSource, /\.focus\(\)/);
});
