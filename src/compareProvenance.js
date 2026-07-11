export function getCompareEvaluationMeta(compareResult) {
  const method = compareResult?.evaluationMethod === "provider" ? "provider" : "heuristic";
  return method === "provider"
    ? { method, label: "Provider evaluation", isHeuristic: false }
    : { method, label: "Heuristic score · local evaluation", isHeuristic: true };
}
