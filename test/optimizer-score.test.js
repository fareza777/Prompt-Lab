import test from "node:test";
import assert from "node:assert/strict";
import { scorePrompt, scoreOptimizedPrompt } from "../src/promptScore.js";

const weakPrompt = `Viral Variant (TikTok/Twitter):
Hook 0-3s: close-up kopi susu
Scene 1: barista tuang susu
CTA: order sekarang`;

const strongerPrompt = `Role: Senior video prompt engineer for short-form social content.
Context: Brand kopi susu UMKM, target mahasiswa dan pekerja kantoran.
Objective: Produce two copy-paste-ready text-to-video prompts (Viral + Brand-Safe).
Output format:
1) Viral Variant (TikTok/Twitter) with timestamped scenes
2) Brand-Safe Variant with calmer pacing
Constraints: 9:16, 10 seconds, no invented brand claims, state assumptions if data missing.
Acceptance criteria: each variant has hook, 3 scenes, CTA, and negative prompt block.

Viral Variant (TikTok/Twitter):
Hook 0-3s: close-up kopi susu
Scene 1: barista tuang susu
CTA: order sekarang`;

test("scorePrompt ranks structured prompts higher than loose briefs", () => {
  const weak = scorePrompt(weakPrompt);
  const strong = scorePrompt(strongerPrompt);
  assert.ok(strong.score > weak.score + 10);
});

test("scoreOptimizedPrompt shows gain after optimization", () => {
  const before = scorePrompt(weakPrompt);
  const after = scoreOptimizedPrompt(weakPrompt, strongerPrompt, {
    fromOptimizer: true,
    mode: "More Detailed",
  });
  assert.ok(after.score > before.score);
  assert.ok(after.score - before.score >= 5);
});

test("optimizer mode alone cannot raise the measured score", () => {
  const measured = scorePrompt(weakPrompt);

  for (const mode of ["Clearer", "More Detailed", "Academic", "Coding"]) {
    const optimized = scoreOptimizedPrompt(strongerPrompt, weakPrompt, {
      fromOptimizer: true,
      mode,
    });

    assert.equal(optimized.score, measured.score, `${mode} changed the measured score`);
  }
});

test("optimized score is not lower-bounded by the previous prompt score", () => {
  const before = scorePrompt(strongerPrompt);
  const measuredAfter = scorePrompt(weakPrompt);
  const optimized = scoreOptimizedPrompt(strongerPrompt, weakPrompt, {
    fromOptimizer: true,
    mode: "More Detailed",
  });

  assert.ok(measuredAfter.score < before.score);
  assert.equal(optimized.score, measuredAfter.score);
});

test("local scores expose stable heuristic metadata", () => {
  const score = scorePrompt(strongerPrompt);

  assert.equal(score.scoreMethod, "heuristic");
  assert.match(score.scoreNote, /heuristic/i);
});
