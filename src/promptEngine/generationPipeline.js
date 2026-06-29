/**
 * Generation pipeline phases for Builder UI (critique-refine visibility).
 */

export const GENERATION_PHASES = {
  idle: { id: "idle", label: "Ready" },
  drafting: { id: "drafting", label: "Drafting prompt" },
  validating: { id: "validating", label: "Validating structure" },
  critique: { id: "critique", label: "Critique pass" },
  refining: { id: "refining", label: "Refining output" },
  dialect: { id: "dialect", label: "Applying model dialect" },
  done: { id: "done", label: "Complete" },
};

export function getGenerationPipelineSteps(qualityMode = "standard") {
  if (qualityMode === "premium") {
    return ["Draft", "Validate", "Critique", "Refine", "Dialect"];
  }
  return ["Draft", "Validate", "Dialect"];
}

export function phaseFromStreamEvent(eventType, payload = {}) {
  if (payload?.step && GENERATION_PHASES[payload.step]) return payload.step;
  if (eventType === "chunk") return "drafting";
  if (eventType === "done") return "done";
  return "drafting";
}
