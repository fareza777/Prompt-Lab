# Handoff prompt

```text
/make-plan Redesign PromptLab’s primary mobile interaction architecture. Current design failed audit at 11/30 with critical gaps in principles #2 useful, #4 understandable, #6 honest, #8 thorough, and #10 as little design as possible.

Verdict paragraph (quoted from 03-verdict.md):
> REDESIGN THE INTERACTION ARCHITECTURE, NOT THE PRODUCT OR CODEBASE: keep the live package, PromptLab brand, single canvas, generation engine, attachments, auth, billing, history, and accessibility foundations, but make the finished work output—not the prompt—the default product outcome; the 11/30 score and a 0 on understandability require more than cosmetic refinement.

Why redesign and not refine: the primary CTA, intermediate prompt, finished output, and content actions do not share one understandable content model, so copy and styling changes alone cannot repair the flow.

Preserve from current design:
- Single-canvas shell and secondary sheets (`src/ui/Shell.jsx:17-21,263-388`).
- Spacing/type tokens, native controls, skip link, focus trap/return, reduced motion, and complete state foundations (`src/ui/tokens.css:64-89`; `src/ui/Sheet.jsx:25-73`; `src/ui/base.css:323-333`).
- Prompt engine, `/api/run-prompt`, attachments, auth, quota, billing, export, and history infrastructure.
- PromptLab name, package `app.promptlab.twa`, and the existing live Play listing identity.

Discard:
- Default prompt-first two-stage flow where “Buatkan” returns a prompt and “Jalankan sekarang” returns the real deliverable. Evidence: `src/ui/i18n.js:35-41,62,79-92`; `src/ui/Result.jsx:146-159`. Caused failure on principles #2 and #4.
- Mode-ambiguous actions that treat prompt and finished output as the same saved/reported object. Evidence: `src/ui/Result.jsx:99-100,168-180,238-242`; `src/ui/Shell.jsx:208-215,465-470`. Caused failure on principles #4, #6, and #8.
- Mandatory four-screen tour, six repeated starters, and stale five-tab Play asset pipeline. Evidence: `src/ui/FirstRun.jsx:22-43,92-213`; `src/ui/Starters.jsx:65-81`; `scripts/capture-playstore-screenshots.mjs:14-16,138-143`. Caused failure on principles #7 and #10.

Top 3–5 moves from the audit (verbatim):
1. Principles #2/#4 — Useful and understandable: collapse the default flow to request/file → finished result; move “View/edit prompt” behind an Advanced or Prompt mode. Evidence: `01-evidence.md#product-model-and-copy-mismatch`.
2. Principles #6/#8 — Honest and thorough: introduce explicit `contentType` and active-content plumbing so Save, History, Improve, Compare, Export, and Report always act on the content the label names. Evidence: `01-evidence.md#functional-honesty-and-content-identity`.
3. Principles #3/#7 — Aesthetic and long-lasting: replace the live Play screenshots, listing copy, and capture tests with the actual single-canvas, outcome-led experience; remove all `.v2-*` five-tab assumptions. Evidence: `01-evidence.md#repository-and-release-parity`.
4. Principles #5/#10 — Unobtrusive and minimal: remove the mandatory tour after language choice, show three outcome-led starters at most, and keep Guide contextual. Evidence: `01-evidence.md#structure-and-primary-flow`.
5. Principles #3/#8/#9 — Aesthetic, thorough, and efficient: raise faint-text contrast, fix mobile Advanced-field clipping, add physical Android/TalkBack/font-scale release checks, and split non-primary code until initial JS is below 500KiB. Evidence: `01-evidence.md#visual-system`, `01-evidence.md#weight-and-friction`.

Redesign principles in priority order:
1. Principle #4 — Understandable: one primary CTA must visibly create exactly the outcome its label promises.
2. Principle #2 — Useful: a user who wants a report, deck, analysis, content, or code must not be forced to manage a prompt intermediate.
3. Principle #6 — Honest: every label, provenance notice, quota value, saved object, and report payload must map 1:1 to behavior.

Deliverables for the plan:
- New information architecture centered on request/file → finished result, not derived from the old five-tab layout.
- New primary flow wireframe, compared side-by-side with the current two-stage flow.
- A typed content model for request, prompt, and finished output, including Save/History/Improve/Compare/Export/Report behavior.
- First-run simplification and outcome-led starter strategy.
- Play Store migration: title/short description/full description, screenshot narrative, capture script, and tests.
- States checklist: empty, loading, error, success, focus, disabled, partial output, timeout, fallback provenance, and offline/retry.
- Migration path for current saved prompts and results.
- Cutover criteria: production smoke test, physical Android/TalkBack/font-scale pass, Play asset parity, no stale `.v2-*` release assertions, and initial JS below 500KiB.

Anti-patterns to guard against:
- Porting the old structure under new styling.
- Keeping prompt generation as a mandatory visible step for result-first users.
- Turning PromptLab into a generic chat interface.
- Removing advanced prompt inspection for expert users.
- Updating Play copy before screenshots, behavior, and release tests match the new product.
```
