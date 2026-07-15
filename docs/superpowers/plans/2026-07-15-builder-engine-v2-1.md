# Builder Engine v2.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Builder to produce proportionate, more complete prompts with stronger MiniMax parity, deterministic domain regression coverage, and recoverable OpenRouter streaming.

**Architecture:** Keep policy and evaluation logic pure inside `server/prompt-engine-v2.js`, then pass one quality-policy object through prompt construction, validation, retry, and telemetry in `server/index.js`. Reuse the existing provider, timeout, fallback, quota, and attachment-security infrastructure; add no dependencies.

**Tech Stack:** Node.js ESM, Express, OpenAI-compatible provider clients, Node test runner.

## Global Constraints

- Simple requests remain concise; quality must not be implemented as uniform verbosity.
- Policy levels are exactly `simple`, `standard`, and `complex`, with an independent `highStakes` boolean.
- Minimum sections and characters are `4/280`, `5/450`, and `5/650` respectively.
- Preserve PII scrubbing, untrusted-attachment fencing, language lock, deliverable lock, quota persistence, and serverless timeout caps.
- Streaming recovery gets at most one fallback-chain attempt and requires at least 12 seconds remaining.
- No new package, provider, pricing, quota, UI, or Android/AAB change.

---

### Task 1: Adaptive quality policy

**Files:**
- Modify: `server/prompt-engine-v2.js`
- Create: `test/builder-engine-v2-1.test.js`

**Interfaces:**
- Produces: `assessBuilderComplexity(payload)`, `getBuilderQualityPolicy(payload)`, `buildDepthDirective(payload)`, and `isPromptBelowQualityFloor(prompt, policy)`.
- Policy shape: `{ level, highStakes, reasons, minimumSections, minimumCharacters, requirementCount, constraintCount, acceptanceCount }`.

- [ ] **Step 1: Write failing policy tests**

Add tests proving a caption/email is `simple`, ordinary marketing is `standard`, runnable apps and multi-file analysis are `complex`, and legal/medical/financial requests set `highStakes`.

- [ ] **Step 2: Verify RED**

Run: `node --test test/builder-engine-v2-1.test.js`

Expected: FAIL because the new exports do not exist.

- [ ] **Step 3: Implement the pure policy helpers**

Use deterministic output-type, domain, attachment, narrative-length, and high-stakes signals. Return the exact thresholds in the global constraints. `buildDepthDirective` must render concrete item counts in English or Indonesian and add evidence/uncertainty/professional-review rules only for `highStakes`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/builder-engine-v2-1.test.js`

Expected: all policy tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/prompt-engine-v2.js test/builder-engine-v2-1.test.js
git commit -m "feat: add adaptive Builder quality policy"
```

### Task 2: Weighted domain routing and regression corpus

**Files:**
- Modify: `server/prompt-engine-v2.js`
- Modify: `test/builder-engine-v2-1.test.js`

**Interfaces:**
- Consumes: existing `detectDomains(payload)` and `getExpandedDomainPack(payload)`.
- Produces: the same return shapes with deterministic weighted primary/secondary selection.

- [ ] **Step 1: Add failing domain corpus tests**

Create at least twelve cases covering simple email, marketing, application, presentation, document, legal, finance, healthcare, academic, image, video, and attachment-backed analysis. Assert explicit output type and strong phrases select the intended primary domain. Include a vendor-contract review where legal outranks structured document and an investor deck where presentation is primary and finance is secondary.

- [ ] **Step 2: Verify RED**

Run: `node --test test/builder-engine-v2-1.test.js`

Expected: at least the legal and investor-deck routing assertions fail under first-match tie behavior.

- [ ] **Step 3: Implement weighted routing**

Assign base weights to matched phrases, add explicit-output bonuses, keep stable deterministic tie-breaking, and return confidence from the score margin rather than match count. Preserve `primary`, `secondary`, and `confidence` property names.

- [ ] **Step 4: Verify GREEN and existing prompt-quality tests**

Run: `node --test test/builder-engine-v2-1.test.js test/prompt-quality.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/prompt-engine-v2.js test/builder-engine-v2-1.test.js
git commit -m "feat: weight Builder domain routing"
```

### Task 3: MiniMax parity, adaptive validation, and telemetry

**Files:**
- Modify: `server/prompt-engine-v2.js`
- Modify: `server/index.js`
- Modify: `test/builder-engine-v2-1.test.js`
- Modify: `test/prompt-quality.test.js`

**Interfaces:**
- Consumes: `getBuilderQualityPolicy(payload)` and `buildDepthDirective(payload)`.
- Changes: `validatePromptStructure(prompt, policy)` and `buildStructureRetryInstruction(basePrompt, missing, policy)`.
- Produces response fields `qualityProfile` and `structureScore`.

- [ ] **Step 1: Add failing parity and validation tests**

Assert full and lean system prompts include `depth_mandate`; lean prompt-spec content includes output controls and quality gates; simple policy accepts four sections while standard/complex requires five; retry text carries the policy item counts; and source contracts show final response metadata contains `qualityProfile` and `structureScore`.

- [ ] **Step 2: Verify RED**

Run: `node --test test/builder-engine-v2-1.test.js test/prompt-quality.test.js`

Expected: new parity, threshold, retry, and metadata assertions fail.

- [ ] **Step 3: Implement prompt and validator integration**

Inject the depth directive into full and lean system prompts and both user-content paths. Include `outputControls` and `qualityGates` in lean prompt-spec output. Compute one quality policy per generation request, pass it to short-output checks, structure validation, and retry instructions, and add final structure metadata to streamed and non-streamed responses and usage events. Set `PROMPT_ENGINE_VERSION` to `v2.1.0`.

- [ ] **Step 4: Remove behavior-comment drift**

Update the critique-refine comment to state that the pass is premium-only. Do not expand premium billing behavior.

- [ ] **Step 5: Verify GREEN**

Run: `node --test test/builder-engine-v2-1.test.js test/prompt-quality.test.js test/minimax-provider.test.js test/plan-entitlements.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/prompt-engine-v2.js server/index.js test/builder-engine-v2-1.test.js test/prompt-quality.test.js
git commit -m "feat: apply adaptive quality across Builder"
```

### Task 4: OpenRouter stream recovery

**Files:**
- Modify: `server/prompt-engine-v2.js`
- Modify: `server/index.js`
- Modify: `test/builder-engine-v2-1.test.js`

**Interfaces:**
- Produces: `shouldRecoverStream({ remainingBudgetMs, fallbackModels })`.
- Consumes: existing `getOpenRouterFallbackModels`, `tryOpenRouterFallbackModels`, `sendSse`, and provider error formatting.

- [ ] **Step 1: Add failing recovery-decision and integration-contract tests**

Assert recovery requires at least one fallback and 12,000 ms, rejects lower budgets, and the streamed route uses the helper, sends a replacement chunk, reports `fallback-model`, and preserves a user-safe fallback warning.

- [ ] **Step 2: Verify RED**

Run: `node --test test/builder-engine-v2-1.test.js`

Expected: FAIL because recovery helper and route integration do not exist.

- [ ] **Step 3: Implement one bounded recovery attempt**

On primary stream error, derive configured fallback models and remaining time. If allowed, call the existing fallback-chain helper once with non-stream messages, sanitize its output, send `{ text: fallbackPrompt, replace: true }`, then continue validation and quota recording. If recovery fails, send the existing terminal stream error. Set final model status and warning from the recovered result.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/builder-engine-v2-1.test.js test/minimax-provider.test.js test/quota-reservation.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/prompt-engine-v2.js server/index.js test/builder-engine-v2-1.test.js
git commit -m "fix: recover failed Builder streams"
```

### Task 5: Full release verification

**Files:**
- Verify only; repair only scoped regressions.

**Interfaces:**
- Consumes all prior tasks.
- Produces a mergeable, web-only Builder Engine v2.1 branch.

- [ ] **Step 1: Run focused Builder tests**

Run: `node --test test/builder-engine-v2-1.test.js test/prompt-quality.test.js test/minimax-provider.test.js test/plan-entitlements.test.js test/safe-attachment.test.js test/quota-reservation.test.js`

Expected: zero failures.

- [ ] **Step 2: Run complete tests and build**

Run: `npm test`

Expected: zero failures and production build within existing JS/CSS budgets.

- [ ] **Step 3: Run Play Store/TWA readiness**

Run: `npm run playstore:check`

Expected: all required PWA and Digital Asset Links checks pass.

- [ ] **Step 4: Review release scope**

Run: `git diff --check` and inspect the branch diff. Confirm there are no Android manifest, TWA, billing, permission, package-name, version-code, UI, dependency, or quota-limit changes.

- [ ] **Step 5: Merge, verify merged main, and push**

Fast-forward merge into `main`, rerun focused Builder tests on merged `main`, then push only if `origin/main` remains a safe fast-forward.
