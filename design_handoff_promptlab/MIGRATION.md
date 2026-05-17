# MIGRATION.md — Re-skin an existing PromptLab to the new design

> **Scenario:** PromptLab already runs in production. The product logic, routes, data layer, and API integrations all work. The user wants to **swap the visual layer** to match the new design in this handoff — without breaking functionality.

This is a re-skin, not a rebuild. Keep behavior. Replace presentation.

---

## 1. Mental model

Think of it as three layers:

| Layer | Action |
|---|---|
| **Behavior** (data, API calls, state, routing, auth) | **DO NOT TOUCH** unless the new design explicitly demands a structural change. |
| **Component anatomy** (what props each thing takes, what slots it has) | Keep when possible. Adjust only if the new design needs new slots (e.g. a `readinessScore` prop on the prompt card). |
| **Visual layer** (tokens, classes, layout, motion) | **REPLACE WHOLESALE**. This is the entire purpose of the migration. |

If you find yourself rewriting fetch logic, stop and ask the user.

---

## 2. Pre-flight (Codex should do this first)

Before touching any file:

1. **Inventory the existing codebase.** List every component currently used by each of the 5 screens (Builder, Optimizer, Templates, Library, Compare). Note which design system it uses (Tailwind? shadcn? CSS Modules? styled-components?).
2. **Map old → new.** For each existing component, find its counterpart in `DESIGN_SPEC.md §6`. Note any visual primitives in the new design that don't exist yet (e.g. `RingScore`, `MetricBar`, `DiffViewer`, `ModelCard`).
3. **Open a tracking issue** with the full mapping table. Get user sign-off before writing code.

Example mapping table format:

```
| Screen   | Old component       | New equivalent       | Action      |
|----------|---------------------|----------------------|-------------|
| Builder  | <PromptForm>        | <ComposerCard>       | restyle     |
| Builder  | <ScoreNumber>       | <RingScore>          | replace     |
| Builder  | <StatsCards>        | <StatsStrip>         | restyle     |
| Builder  | (none)              | <SmartSuggestions>   | new primitive |
| ...      |                     |                      |             |
```

---

## 3. Strategy: branch + flag, not nuke-and-pave

Do **not** rewrite all 5 screens in one PR. Recipe:

1. **Branch `redesign/v2`** from `main`.
2. **Install the new token layer alongside the old one.** Add the OKLCH variables on `:root` under a `data-theme="v2"` selector so they don't leak. Don't touch the old tokens.
3. **Build a shared primitives module** first (`components/v2/*`): `Button`, `Chip`, `Card`, `RingScore`, `MetricBar`, `Sparkline`, `Sidebar`, `HeaderBar`, etc. These are NEW files, parallel to the old ones.
4. **One screen at a time, behind a feature flag.** Either:
   - Route-level flag: `/builder` (old) and `/v2/builder` (new) for QA, then swap at cut-over.
   - Or env flag: `NEXT_PUBLIC_DESIGN_V2=true` toggles the visual layer in one component tree.
5. **QA each screen against `screenshots/`** before merging that screen's PR.
6. **Final cut-over PR** removes the old visual layer and the flag once all 5 screens ship.

Why this matters: a production app can't go dark for two weeks while you redesign. Ship one screen at a time.

---

## 4. What stays, what changes

### Stays untouched

- Database schema and migrations
- API routes (`/api/optimize`, `/api/templates`, `/api/compare`, etc.)
- Auth flow
- Server actions / RSC data fetching
- Streaming SSE wire format
- URL structure and query params
- Analytics events

### Changes

- All CSS / Tailwind classes / styled-components
- Page layouts (sidebar widths, grid templates, header heights)
- Typography (load Instrument Serif + Geist + Geist Mono; remove the old fonts)
- All icons (one icon library only — see `DESIGN_SPEC.md §11`)
- Loading skeletons and empty states
- Motion (durations, easings, blink/shimmer/pulse)
- Microcopy on chips, status pills, footers (match the prototype copy)

### Probably changes (case-by-case)

- The set of fields in the composer (the new design surfaces Category, Tone, Target model, Output format as chip rows — if your current form has dropdowns instead, you'll likely refactor to chips)
- Where the Readiness Console lives (must be right rail, sticky)
- Output card tab structure (Optimized / Narration / Schema)

---

## 5. Order of operations

```
PR 1: feat(v2): install design tokens + fonts behind data-theme="v2"
PR 2: feat(v2): primitives (Button, Chip, Card, ChipMini, IconBtn, KbdChip)
PR 3: feat(v2): shell (Sidebar, HeaderBar, BrandMark, search, avatar)
PR 4: feat(v2): viz primitives (RingScore, MetricBar, Sparkline, LiveDot)
PR 5: feat(v2): Builder screen (largest — uses everything above)
PR 6: feat(v2): Optimizer screen + DiffViewer primitive
PR 7: feat(v2): Templates screen + FeaturedHero
PR 8: feat(v2): Library screen + table
PR 9: feat(v2): Compare screen + ModelCard + ScoreMatrix
PR 10: chore: cut over to v2 by default, remove old visual layer
PR 11: chore: polish + a11y + reduced-motion + Lighthouse pass
```

Don't skip PR 1–4. They unblock everything after.

---

## 6. Gotchas specific to a re-skin

- **Streaming endpoints already exist.** Don't re-implement the streaming — just wire the new mono output body to the existing SSE stream. The tick rate and "blinking cursor" in the prototype is a *visual* convention; the data is whatever your backend already sends.

- **Readiness score might not exist yet on the backend.** The new design assumes a `{ overall, metrics: {clarity, context, outputFormat, guardrails}, checks: [...] }` payload comes back from the optimize endpoint. If the existing API only returns `score: number`, either (a) extend the endpoint to compute the breakdown or (b) compute it client-side from the prompt structure. **Ask the user which.**

- **Diff data shape.** The new Optimizer needs a `DiffSegment[]` (see `DESIGN_SPEC.md §7`). If the backend doesn't produce diffs yet, generate them client-side with `diff-match-patch` between `prompt.raw` and `prompt.body`. Stick the helper in `lib/diff.ts`.

- **Compare scores matrix.** The 5 score dimensions (tone match, format adherence, idea originality, cultural fit, cost efficiency) are not free — they require a judge model or a heuristic. If the backend doesn't compute them yet, stub them with `null` and render the matrix in a "compute scores" empty state instead of inventing numbers.

- **Old routes that don't exist in the new design.** If the existing app has a Settings screen, an Onboarding flow, or a Billing page, leave them on the old visual layer for now. The new design only redesigns the 5 listed screens. Don't surprise the user by re-skinning routes outside the spec.

- **Color contrast.** OKLCH lightness values were picked for WCAG AA on dark surfaces. If you swap to hex, re-verify. Don't eyeball.

---

## 7. Cut-over checklist (before PR 10)

- [ ] All 5 screens shipping under `data-theme="v2"` look identical to the screenshots at 1440px ±2px.
- [ ] Every interactive surface has hover + focus-visible.
- [ ] Existing E2E tests still pass (selectors may have changed — update them, don't disable them).
- [ ] No regressions in API latency or bundle size > 5%.
- [ ] Reduced-motion preference disables blink/shimmer/pulse.
- [ ] Lighthouse a11y ≥ 95 per screen.
- [ ] Manual test on Safari, Chrome, Firefox at 1280, 1440, 1920px widths.
- [ ] Owner signed off on the staging URL.

After PR 10 lands, delete the `data-theme="v1"` selectors and the flag in a follow-up.

---

## 8. Rollback plan

Because PR 10 is just a CSS swap (`data-theme="v2"` becomes the default), rolling back is trivial:

1. Revert PR 10.
2. The old visual layer comes back instantly. No data migration needed.

Keep the old tokens and old components in `components/v1/` for one full release cycle before deleting in a separate cleanup PR.

---

## 9. Files Codex should reference (in priority order)

1. `AGENTS.md` — overall rules and out-of-scope items
2. `DESIGN_SPEC.md` — the source of truth for tokens, components, screens
3. `MIGRATION.md` — this file, for the re-skin-specific flow
4. `screenshots/` — visual targets
5. `reference/styles.css` — the entire CSS for the new design
6. `reference/<screen>.jsx` — anatomy of each screen, only if the spec is ambiguous

If `AGENTS.md` and this file disagree, **this file wins** for any migration concern.
