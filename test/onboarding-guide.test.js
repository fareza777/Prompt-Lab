import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const guideUrl = new URL("../src/onboardingGuide.js", import.meta.url);

async function loadGuide() {
  try {
    await access(guideUrl);
  } catch {
    assert.fail("onboarding guide model must exist");
  }
  return import(guideUrl);
}

test("onboarding guide teaches the approved four-step workflow", async () => {
  const { ONBOARDING_STEPS } = await loadGuide();

  assert.deepEqual(ONBOARDING_STEPS.map(({ id }) => id), ["create", "improve", "reuse", "ready"]);
  assert.equal(ONBOARDING_STEPS.at(-1).primaryLabel, "Create free account");
  for (const step of ONBOARDING_STEPS) {
    assert.ok(step.eyebrow);
    assert.ok(step.title);
    assert.ok(step.body);
    assert.ok(step.visual);
    assert.ok(step.primaryLabel);
  }
});

test("onboarding navigation stays inside the four-step guide", async () => {
  const { clampOnboardingStep, getNextOnboardingStep, getPreviousOnboardingStep } = await loadGuide();

  assert.equal(clampOnboardingStep(-9), 0);
  assert.equal(clampOnboardingStep(99), 3);
  assert.equal(clampOnboardingStep(Number.NaN), 0);
  assert.equal(getNextOnboardingStep(0), 1);
  assert.equal(getNextOnboardingStep(3), 3);
  assert.equal(getPreviousOnboardingStep(3), 2);
  assert.equal(getPreviousOnboardingStep(0), 0);
});

test("onboarding UI exposes accessible progress, navigation, and responsive motion rules", async () => {
  const mainSource = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
  const stylesSource = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(mainSource, /from "\.\/onboardingGuide\.js"/);
  assert.match(mainSource, /aria-live="polite"/);
  assert.match(mainSource, /aria-label="Onboarding progress"/);
  assert.match(mainSource, />Skip</);
  assert.match(mainSource, />Back</);
  assert.match(mainSource, /Continue as guest/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stylesSource, /@media \(max-width: 320px\)/);
});
