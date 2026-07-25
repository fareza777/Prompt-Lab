# Planning handoff

```text
/make-plan Redesign PromptLab's mobile application flow and refine its remaining acquisition details. Current design scored 12/30 with critical gaps in principles #4 understandable, #5 unobtrusive, #8 thorough, and #10 as little design as possible.

Verdict paragraph (quoted from 03-verdict.md):
> REDESIGN: keep the working engine, brand tokens, six-task product model, and current Play description, but redesign the mobile interaction architecture and tighten remaining landing-page claims; the corrected 12/30 score remains below the refinement threshold.

Why redesign and not refine: the primary mobile flow exposes excessive controls with incomplete labels and duplicated affordances, so interaction structure—not styling alone—must change.

Preserve from current design:
- PromptLab cyan/dark brand palette and clear typography hierarchy in src/styles.css:27-87.
- The six-task workflow and honest heuristic/provider provenance in src/main.jsx:3012-3018,3446-3449 and src/compareProvenance.js:1-6.

Discard:
- Inflated landing-page phrases such as “Perfect Prompt”, “production-ready”, automatic expert context, and unconditional bias mitigation. Evidence: DESIGN-IS-2026-07-14/01-evidence.md#copy-honesty-and-destructive-actions. Reduced principle #6.
- The default 24-chip Builder matrix and duplicated responsive actions as the first interaction. Evidence: DESIGN-IS-2026-07-14/01-evidence.md#structure-and-usefulness. Caused failures on principles #5 and #10.

Top 3–5 moves from the audit (verbatim):
1. Principle #6 — Honest: keep the current supportable Play description, update the remaining old support/privacy domain, and replace inflated landing phrases such as “Perfect Prompt”, “production-ready”, and unconditional bias mitigation with behavior-specific copy. Evidence: 01-evidence.md#product-and-listing and 01-evidence.md#copy-honesty-and-destructive-actions.
2. Principles #2/#10 — Useful and restrained: make Builder a progressive three-step flow (request → essential choices → result), moving the 24-chip matrix and secondary actions behind Advanced. Evidence: 01-evidence.md#structure-and-usefulness.
3. Principles #4/#8 — Understandable and thorough: label every field/control, fix keyboard upload/search/nav semantics, add skip navigation, repair contrast, and gate releases on axe plus physical TalkBack/font-scale checks. Evidence: 01-evidence.md#accessibility-and-interaction-details.
4. Principles #3/#6 — Aesthetic and honest: upload an outcome-led portrait screenshot set only after pixel validation; show generated results rather than mostly input forms and remove the two frames with missing glyphs. Evidence: 01-evidence.md#product-and-listing.
5. Principles #8/#9 — Thorough and efficient: add browser smoke and Android lint/bundle to CI, then split the monolith and lazy-load secondary/admin/export flows while adding CSP and upload magic-byte verification. Evidence: 01-evidence.md#reliability-performance-and-android.

Redesign principles in priority order:
1. Principle #6 — Honest: every public claim must map to a tested implemented behavior.
2. Principle #2 — Useful: a first-time user reaches a usable prompt result with one request and at most two essential decisions.
3. Principle #4 — Understandable: every primary control has a persistent name, state, and predictable result for sighted and assistive-technology users.

Deliverables for the plan:
- New information architecture (not derived mechanically from the current chip grid)
- New primary mobile flow, compared side-by-side with current Builder
- Play metadata/media migration and rollback checklist
- States checklist: empty, loading, error, success, focus, disabled, offline, quota exhausted, billing pending
- Accessibility acceptance tests and physical TWA test matrix
- Migration path for existing local/cloud libraries and saved settings
- Cutover criteria for retiring old UI and old Play metadata

Anti-patterns to guard against:
- Porting the old structure under new styling
- Keeping both designs behind a flag indefinitely
- Redesigning to follow a visual trend instead of task clarity
- Treating preserved brand tokens and scoring provenance as optional
```
