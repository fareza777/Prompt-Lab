import test from "node:test";
import assert from "node:assert/strict";

const serverModule = await import("../server/index.js");
const uiModule = await import("../src/compareProvenance.js").catch(() => ({}));

const payload = {
  promptA: "Role: Analyst. Output format: table.",
  promptB: "Write something useful.",
};

const validProviderResult = JSON.stringify({
  winner: "A",
  summary: "A is clearer.",
  scores: {
    A: { clarity: 90, context: 80, format: 85, constraints: 75, risk: 10, overall: 84 },
    B: { clarity: 50, context: 40, format: 45, constraints: 35, risk: 50, overall: 44 },
  },
});

test("server compare provenance distinguishes provider results from local substitutions", () => {
  assert.equal(typeof serverModule.resolveCompareEvaluation, "function");
  if (!serverModule.resolveCompareEvaluation) return;

  assert.equal(serverModule.resolveCompareEvaluation(validProviderResult, payload).evaluationMethod, "provider");
  assert.equal(serverModule.resolveCompareEvaluation("not valid compare JSON", payload).evaluationMethod, "heuristic");
});

test("empty provider JSON falls back to heuristic evaluation", () => {
  assert.equal(serverModule.resolveCompareEvaluation("{}", payload).evaluationMethod, "heuristic");
});

test("message-only provider JSON falls back to heuristic evaluation", () => {
  assert.equal(
    serverModule.resolveCompareEvaluation('{"message":"comparison completed"}', payload).evaluationMethod,
    "heuristic"
  );
});

test("partial or non-numeric provider scores fall back to heuristic evaluation", () => {
  const partial = JSON.stringify({
    winner: "A",
    scores: {
      A: { clarity: 90, context: 80, format: 85, constraints: 75, risk: 10, overall: 84 },
      B: { clarity: 50, context: 40, format: 45, constraints: "NaN", risk: 50 },
    },
  });

  assert.equal(serverModule.resolveCompareEvaluation(partial, payload).evaluationMethod, "heuristic");
});

test("provider score dimensions reject non-number JavaScript types", () => {
  const invalidValues = [
    ["numeric string", "90"],
    ["blank string", ""],
    ["boolean", true],
    ["array", [90]],
    ["object", { value: 90 }],
  ];

  for (const [label, invalidValue] of invalidValues) {
    const candidate = JSON.parse(validProviderResult);
    candidate.scores.A.clarity = invalidValue;
    assert.equal(
      serverModule.resolveCompareEvaluation(JSON.stringify(candidate), payload).evaluationMethod,
      "heuristic",
      `${label} was accepted as a provider score`
    );
  }
});

test("invalid primary provider output preserves untouched local fallback during position swap", () => {
  assert.equal(typeof serverModule.mergeCompareEvaluationPositionSwap, "function");
  if (!serverModule.mergeCompareEvaluationPositionSwap) return;

  const primaryEvaluation = serverModule.resolveCompareEvaluation("{}", payload);
  const originalResult = structuredClone(primaryEvaluation.result);
  const swappedProviderResult = serverModule.resolveCompareEvaluation(validProviderResult, payload).result;
  const merged = serverModule.mergeCompareEvaluationPositionSwap(primaryEvaluation, swappedProviderResult);

  assert.strictEqual(merged, primaryEvaluation);
  assert.deepEqual(merged.result, originalResult);
  assert.equal(merged.evaluationMethod, "heuristic");
});

test("server response provenance remains heuristic even with a provider-looking source", () => {
  assert.equal(typeof serverModule.withCompareEvaluationMethod, "function");
  if (!serverModule.withCompareEvaluationMethod) return;

  const response = serverModule.withCompareEvaluationMethod(
    { source: "openai", model: "provider-model", result: {} },
    "heuristic"
  );
  assert.equal(response.evaluationMethod, "heuristic");
});

test("UI classification uses evaluationMethod and defaults safely to heuristic", () => {
  assert.equal(typeof uiModule.getCompareEvaluationMeta, "function");
  if (!uiModule.getCompareEvaluationMeta) return;

  assert.deepEqual(uiModule.getCompareEvaluationMeta({ evaluationMethod: "provider" }), {
    method: "provider",
    label: "Provider evaluation",
    isHeuristic: false,
  });
  assert.deepEqual(uiModule.getCompareEvaluationMeta({ evaluationMethod: "heuristic" }), {
    method: "heuristic",
    label: "Heuristic score · local evaluation",
    isHeuristic: true,
  });
  assert.equal(uiModule.getCompareEvaluationMeta({ source: "openai" }).method, "heuristic");
});
