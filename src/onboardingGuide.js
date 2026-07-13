export const ONBOARDING_STEPS = Object.freeze([
  Object.freeze({
    id: "create",
    eyebrow: "Create",
    title: "Turn any idea into a model-ready prompt.",
    body: "Start with a rough request, screenshot, image, or document. Builder structures the role, context, constraints, and output.",
    visual: "idea-to-prompt",
    primaryLabel: "Show me how",
  }),
  Object.freeze({
    id: "improve",
    eyebrow: "Improve",
    title: "Strengthen prompts before you send them.",
    body: "Use Optimizer to improve clarity and detail, then check readiness scores and compare versions side by side.",
    visual: "score-and-compare",
    primaryLabel: "Next",
  }),
  Object.freeze({
    id: "reuse",
    eyebrow: "Reuse",
    title: "Build a prompt system, not a pile of drafts.",
    body: "Start from Templates, save strong results to Library, and reuse them across future work.",
    visual: "template-to-library",
    primaryLabel: "Next",
  }),
  Object.freeze({
    id: "ready",
    eyebrow: "Ready",
    title: "Explore now. Sync when you're ready.",
    body: "Guest drafts stay on this device. A free account enables AI generation and syncs your library, quota, and membership.",
    visual: "account-or-guest",
    primaryLabel: "Create free account",
  }),
]);

export function clampOnboardingStep(index) {
  const numericIndex = Number(index);
  if (!Number.isFinite(numericIndex)) return 0;
  return Math.min(ONBOARDING_STEPS.length - 1, Math.max(0, Math.trunc(numericIndex)));
}

export function getNextOnboardingStep(index) {
  return clampOnboardingStep(clampOnboardingStep(index) + 1);
}

export function getPreviousOnboardingStep(index) {
  return clampOnboardingStep(clampOnboardingStep(index) - 1);
}
