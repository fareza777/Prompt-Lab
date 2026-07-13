# UI Release Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development and review each task before continuing.

**Goal:** Make PromptLab's quality claims honest, mobile controls accessible, and Play Store visuals current without redesigning the Builder flow.

**Architecture:** Keep `V2App` and existing state; isolate score presentation metadata in the scoring module, correct semantic control attributes in-place, remove the legacy/V2 mobile CSS collision, then regenerate and validate assets from a production build.

**Tech Stack:** React, Vite, CSS, Node test runner, Playwright, Sharp.

## Constraints

- Preserve request -> Generate -> Save/Copy/Export flow and current product navigation labels.
- Local rule-based scores are explicitly labelled heuristic; no mode-only score inflation.
- All focus, selection, and tab semantics must be visible and machine-readable.
- Store assets must come from current source/build, remain at required dimensions, and contain no clipped copy.

### Task 1: Remove artificial optimizer score gains

**Files:** `src/promptScore.js`, `src/main.jsx`, `test/optimizer-score.test.js`, `test/ui-release-contract.test.js`

- [ ] Add RED tests proving optimizer mode alone cannot raise a score, a measured score cannot be lower-bounded by the previous score, and local result copy contains “heuristic”.
- [ ] Run `node --test test/optimizer-score.test.js test/ui-release-contract.test.js` and record expected failures.
- [ ] Remove `modeOptimizationBump` and any fallback display uplift; return measured dimensions plus a stable `scoreMethod: "heuristic"`/note used by the UI.
- [ ] Update local/fallback score labels without changing AI-provider results or primary actions.
- [ ] Run focused tests and commit.

### Task 2: Fix mobile navigation and accessibility semantics

**Files:** `src/main.jsx`, `src/styles.css`, `src/commandPalette.jsx`, `test/ui-release-contract.test.js`

- [ ] Add RED source-contract tests for five-column `.v2-bottom-nav`, absence of the legacy `bottom-nav` class, `:focus-visible`, associated Builder textarea label, `aria-pressed` chips, semantic tabs, and modal dialog focus attributes.
- [ ] Run focused tests and record RED.
- [ ] Render only `className="v2-bottom-nav"`; make V2 CSS own `repeat(5, minmax(0, 1fr))` at mobile breakpoints.
- [ ] Add visible focus styles; associate form labels; expose chip selection; add `role=tab`, `aria-selected`, `aria-controls`/panel ids; add `aria-modal`, focus trap, and focus restoration to command palette.
- [ ] Run focused UI tests plus `npm run build`; commit.

### Task 3: Regenerate and validate Play Store assets

**Files:** `scripts/generate-playstore-assets.mjs`, `scripts/capture-playstore-screenshots.mjs`, `playstore/assets/*.png`, `test/playstore-assets.test.js`, `vite.config.js`

- [ ] Add RED tests for required dimensions, safe feature-graphic text width/padding, current five-tab screenshot capture contract, and a first-load JS/CSS budget.
- [ ] Run focused tests and record RED.
- [ ] Wrap/shorten feature graphic copy so all text ends at x <= 960; capture current Builder, Optimizer, Templates, Library, Compare, and Settings from the production preview.
- [ ] Keep explicit vendor chunks and enforce a documented initial asset budget; do not claim lazy loading unless a chunk is actually deferred.
- [ ] Run `npm run build`, `npm run playstore:assets`, focused asset tests, and `npm run playstore:check`; visually inspect the resulting phone screenshots and feature graphic; commit.
