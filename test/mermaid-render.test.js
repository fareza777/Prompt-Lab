import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeMermaidCode, withTimeout } from "../src/mermaidRender.js";
import { extractMermaidCode, extractRootSvg, isLikelyUiIconSvg } from "../src/exportDiagram.js";

test("sanitizeMermaidCode strips fences and prose", () => {
  const code = sanitizeMermaidCode(`Here is a chart:
\`\`\`mermaid
flowchart TD
  A[Start] --> B[End]
\`\`\`
Thanks`);
  assert.match(code, /^flowchart TD/);
  assert.doesNotMatch(code, /Thanks|```/);
});

test("extractMermaidCode finds fenced block", () => {
  const code = extractMermaidCode("# Title\n\n```mermaid\nflowchart LR\n  A --> B\n```\n");
  assert.equal(code, "flowchart LR\n  A --> B");
});

test("extractRootSvg keeps outer svg when nested markers exist", () => {
  const markup = `<svg viewBox="0 0 400 200"><g><svg width="10" height="10"><path d="M0 0"/></svg><rect width="100" height="40"/></g></svg>`;
  const root = extractRootSvg(markup);
  assert.match(root, /viewBox="0 0 400 200"/);
  assert.match(root, /<rect/);
});

test("isLikelyUiIconSvg rejects tiny lucide-like svg", () => {
  assert.equal(
    isLikelyUiIconSvg('<svg class="lucide lucide-check" width="24" height="24"><path d="M0 0"/></svg>'),
    true
  );
});

test("withTimeout rejects when promise never settles", async () => {
  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 50, "hang"),
    /timed out/
  );
});
