import test from "node:test";
import assert from "node:assert/strict";
import { scorePromptForCompare, getLocalPromptRisks } from "../src/promptEngine/scoreCompare.js";
import { appendPromptVersion, createLibraryItem, getPromptVersions } from "../src/promptEngine/promptVersions.js";
import { getModelDialectMeta } from "../src/promptEngine/modelDialect.js";
import { buildSemanticDiff } from "../src/optimizerDiff.js";

test("scorePromptForCompare rewards structured prompts", () => {
  const weak = scorePromptForCompare("buat landing page kopi");
  const strong = scorePromptForCompare(`
Role: senior marketing copywriter
Context: milk coffee brand for college students
Task: write Instagram carousel copy
Output format: 5 slides with CTA
Constraints: max 40 words per slide, no invented stats
Acceptance criteria: hook in slide 1, offer in slide 4
  `);
  assert.ok(strong.overall > weak.overall);
});

test("getLocalPromptRisks flags missing sections", () => {
  const risks = getLocalPromptRisks("hello world");
  assert.ok(risks.some((r) => /role/i.test(r)));
});

test("appendPromptVersion keeps history capped", () => {
  let item = createLibraryItem({ title: "A", content: "v1", folder: "Doc", tag: "Marketing" });
  for (let i = 2; i <= 25; i += 1) {
    item = appendPromptVersion(item, `v${i}`, { source: "test" });
  }
  assert.equal(getPromptVersions(item).length, 20);
  assert.equal(item.content, "v25");
});

test("getModelDialectMeta maps Claude targets", () => {
  const meta = getModelDialectMeta("Claude 4 Sonnet");
  assert.equal(meta.id, "claude");
  assert.match(meta.label, /Claude/i);
});

test("buildSemanticDiff highlights additions", () => {
  const segments = buildSemanticDiff("short prompt", "short improved prompt");
  assert.ok(segments.some((s) => s.type === "add"));
});
