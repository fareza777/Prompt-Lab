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
