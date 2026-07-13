# PromptLab Onboarding and ASO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-card welcome screen with an accessible four-step product map and synchronize the repository's Play Store metadata with the approved English ASO copy.

**Architecture:** Keep onboarding inside the hosted React application so the release remains web-only. Move step content and navigation rules into a small pure module that Node's built-in test runner can verify, render it from `V2Onboarding`, and preserve the existing completion/auth/guest callbacks. Store listing copy remains a version-controlled Play Console source of truth.

**Tech Stack:** React 19, JavaScript ES modules, Vite 8, Node test runner, CSS, Google Play TWA.

## Global Constraints

- The onboarding has exactly four skippable steps: Create, Improve, Reuse, Ready.
- Existing signed-in users bypass onboarding; completion still uses `promptlab-onboarded=1`.
- Refreshing mid-guide must not mark onboarding complete.
- The final actions remain account creation and guest access.
- The guide must work at 320 CSS pixels without horizontal scrolling and honor reduced motion.
- No new analytics infrastructure, dependency, Android wrapper change, version bump, or AAB build.
- The public title remains `Prompt generator: Prompt Lab`.
- The short description is `Build, optimize, compare, and save AI prompts from ideas, images, and files.`.

---

### Task 1: Pure onboarding model and navigation

**Files:**
- Create: `src/onboardingGuide.js`
- Create: `test/onboarding-guide.test.js`

**Interfaces:**
- Produces: `ONBOARDING_STEPS` array with `id`, `eyebrow`, `title`, `body`, `visual`, and `primaryLabel`.
- Produces: `clampOnboardingStep(index)`, `getNextOnboardingStep(index)`, and `getPreviousOnboardingStep(index)` returning valid zero-based indices.

- [ ] **Step 1: Write the failing model test**

```js
test("onboarding guide teaches the approved four-step workflow", async () => {
  const { ONBOARDING_STEPS } = await loadGuide();
  assert.deepEqual(ONBOARDING_STEPS.map(({ id }) => id), ["create", "improve", "reuse", "ready"]);
  assert.equal(ONBOARDING_STEPS.at(-1).primaryLabel, "Create free account");
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test test/onboarding-guide.test.js`  
Expected: FAIL because `src/onboardingGuide.js` does not exist.

- [ ] **Step 3: Implement the exact approved content and navigation helpers**

Create a frozen four-item array using the copy from the approved design spec. `clampOnboardingStep` clamps invalid numeric input to `0..3`; next and previous call the clamp helper with `index + 1` and `index - 1`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test test/onboarding-guide.test.js`  
Expected: all onboarding model and boundary tests pass.

### Task 2: Four-step accessible React guide

**Files:**
- Modify: `src/main.jsx` at `V2Onboarding`
- Modify: `src/styles.css` at `.v2-onboarding*`
- Modify: `test/onboarding-guide.test.js`

**Interfaces:**
- Consumes: `ONBOARDING_STEPS`, `getNextOnboardingStep`, and `getPreviousOnboardingStep` from Task 1.
- Preserves: `V2Onboarding({ onAuth, onGuest })` and parent completion behavior.

- [ ] **Step 1: Add failing source-contract assertions**

Assert that the component renders `aria-live="polite"`, `aria-label="Onboarding progress"`, `Skip`, `Back`, `Continue as guest`, and imports the pure guide model. Assert CSS includes `prefers-reduced-motion: reduce` and a 320px mobile rule.

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test test/onboarding-guide.test.js`  
Expected: FAIL because the single-card component has no progress/navigation contract.

- [ ] **Step 3: Implement the minimal React flow**

Use local `stepIndex` state. Steps 1–3 expose `Skip` to set the index to the final step. Steps 2–4 expose `Back`. `Next` advances without persisting completion. The final screen calls the existing `onAuth` or `onGuest`. Render a compact CSS illustration based on each step's `visual` tokens, not network images.

- [ ] **Step 4: Implement responsive and reduced-motion CSS**

Add a two-column card at wider sizes and one column below 640px. Ensure all controls wrap, progress has a text alternative, the card fits 320px, and transitions are removed under reduced-motion preference.

- [ ] **Step 5: Run focused tests and build**

Run: `node --test test/onboarding-guide.test.js && npm run build`  
Expected: test passes and Vite build exits 0.

### Task 3: Play Store source-of-truth copy

**Files:**
- Modify: `playstore/STORE_LISTING.md`
- Modify: `playstore/play-console-checklist.md`
- Create: `test/playstore-listing.test.js`

**Interfaces:**
- Produces: one canonical title, short description, and full description for manual Play Console entry.
- Does not modify: Android versioning or bundle output.

- [ ] **Step 1: Write failing listing consistency tests**

Read both Markdown files and assert the approved title and 76-character short description occur in each. Assert the canonical full description does not claim Microsoft 365 integration, PDF export, real-time synchronization, or offline functionality.

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test test/playstore-listing.test.js`  
Expected: FAIL because both files still contain older metadata.

- [ ] **Step 3: Replace stale listing copy**

Use the approved title, short description, concise full description, benefit-led screenshot order, and an explicit note that metadata updates do not require an AAB. Keep factual policy and billing sections intact.

- [ ] **Step 4: Run the focused listing tests**

Run: `node --test test/playstore-listing.test.js`  
Expected: all listing copy and overclaim tests pass.

### Task 4: Full verification and release evidence

**Files:**
- Modify only if a test reveals an in-scope defect.

**Interfaces:**
- Consumes all deliverables from Tasks 1–3.
- Produces fresh verification evidence; does not produce an AAB.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`  
Expected: build and all Node tests pass with zero failures.

- [ ] **Step 2: Run Play Store readiness**

Run: `npm run playstore:check`  
Expected: all required PWA checks and Digital Asset Links checks pass.

- [ ] **Step 3: Run repository hygiene checks**

Run: `git diff --check`  
Expected: no whitespace errors introduced by this implementation.

- [ ] **Step 4: Review the final diff against the spec**

Confirm the four steps, skip/back behavior, final account/guest actions, responsive/reduced-motion CSS, canonical ASO copy, and absence of Android wrapper changes. Report any unrelated pre-existing dirty files separately.
