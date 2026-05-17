# Copy-Paste Prompts for Codex

Tested prompts you can paste directly into ChatGPT Codex. Adjust paths if you moved the handoff folder.

---

# 🔁 RE-SKIN flow (existing repo already deployed)

If the app is already in production and you want to swap **only the visual layer**, use these prompts. They follow `MIGRATION.md`.

## R0. Inventory + mapping (do this first, no code yet)

```
We have an existing PromptLab app running in production. I dropped a new
design handoff at `design_handoff_promptlab/`. We are going to re-skin
the app — not rebuild it. Behavior stays, visuals get replaced.

Please:
1. Read `design_handoff_promptlab/MIGRATION.md` end to end.
2. Read `design_handoff_promptlab/AGENTS.md` and `DESIGN_SPEC.md`.
3. Look at every PNG in `design_handoff_promptlab/screenshots/`.
4. Inventory the existing repo: list every component currently rendering on
   each of the 5 screens (Builder, Optimizer, Templates, Library, Compare).
   Note which styling system each uses.
5. Build a mapping table (old component → new equivalent → action: keep /
   restyle / replace / new primitive) following the template in MIGRATION.md §2.
6. Flag any backend gaps — especially: does the optimize API already return
   the readiness breakdown (clarity / context / outputFormat / guardrails)
   and the diff segments? Does the compare API return the 5-dim score matrix?

Output: a single markdown report. Do NOT write code yet.
```

## R1. Token + font layer (behind a flag)

```
Approved mapping. Start the re-skin per MIGRATION.md §5.

PR 1 only. Install the new design tokens behind `data-theme="v2"` so they
don't leak into the current visual layer:

- Add the OKLCH variables from DESIGN_SPEC.md §3 onto `[data-theme="v2"]:root`.
- Add Instrument Serif + Geist + Geist Mono via next/font (or whatever the
  repo already uses for fonts), preloaded, weight-subsetted per DESIGN_SPEC §2.
- Add a `NEXT_PUBLIC_DESIGN_V2` env flag wired to a `<html data-theme>`
  attribute at the root layout.
- Add a `/v2-preview` route that simply renders a swatch grid of every token
  so we can eyeball the palette before doing any layout work.

Do NOT touch any existing component yet. Open PR: "feat(v2): tokens + fonts".
```

## R2. Primitives + shell

```
PR 2: build the v2 primitives in `components/v2/`. Each is a NEW file, parallel
to existing components — do not delete or modify the v1 versions yet.

Primitives to ship:
- Button (default / primary / outline / ghost; sm / default / lg; KbdChip slot)
- Chip + ChipMini (with variants ac / pos / warn)
- IconBtn
- Card + CardHeader
- Search input
- Avatar

Then the shell:
- BrandMark, Sidebar (with nav list, recent, usage card), HeaderBar
  (breadcrumb, sync pill, search, icon buttons, avatar).

Reference: design_handoff_promptlab/reference/styles.css and shared.jsx for
exact class definitions and dimensions. DESIGN_SPEC.md §6 for anatomy.

Verify by extending `/v2-preview` to render every primitive in every state.
```

## R3. Viz primitives

```
PR 3: build the visual primitives in `components/v2/viz/`.

- RingScore (72×72, 6px stroke, gradient progress, drop-shadow glow,
  stroke-dashoffset transition on mount)
- MetricBar (6px tall, gradient fill, shimmer overlay 2.5s linear infinite)
- Sparkline (100×28 viewBox, single path + gradient fill underneath)
- LiveDot (8×8 with 4px soft glow halo, pulse 1.6s)
- CheckItem (index badge + title + body + trailing check icon)

Reference: DESIGN_SPEC.md §6.7–§6.9 and §6.13 for exact specs.
Extend `/v2-preview` to render each in isolation.
```

## R4. Builder (largest screen first)

```
PR 4: re-skin the Builder screen using the v2 primitives.

- Wrap the existing Builder page tree in `data-theme="v2"` when the env flag
  is on (or move it to /v2/builder for parallel testing — your call, document
  the decision in the PR description).
- The data flow stays the same. You're swapping JSX/CSS, not logic.
- Layout per DESIGN_SPEC.md §8.1: Hero → Stats strip → Studio (composer left,
  output stack right with sticky position).
- The streaming output should wire to the existing SSE stream. The "blinking
  cursor + token-by-token feel" is a visual layer over whatever data your
  backend already sends.
- Readiness Console: if the backend doesn't yet return the 4-metric breakdown
  + checks, compute a sensible client-side fallback and add a TODO + tracking
  issue link.

Verify against design_handoff_promptlab/screenshots/05-builder-streaming.png.
```

## R5–R8. Remaining screens (one PR each)

```
Same pattern as R4, in this order:

R5: Optimizer  → screenshots/01-optimizer.png + DESIGN_SPEC §8.2
    New primitive: DiffViewer (handles split + unified + summary modes).
    If the backend doesn't return diff segments, compute client-side with
    diff-match-patch between prompt.raw and prompt.body.

R6: Templates  → screenshots/02-templates.png + DESIGN_SPEC §8.3
    New primitive: FeaturedHero (2-col layout with prompt preview).

R7: Library    → screenshots/03-library.png + DESIGN_SPEC §8.4
    Table is a CSS-grid (7 columns, see §6.15). Search is debounced 150ms,
    client-side filter unless the dataset is paginated.

R8: Compare    → screenshots/04-compare.png + DESIGN_SPEC §8.5
    New primitives: ModelCard, ScoreMatrix. Use the same streaming hook from
    Builder, run N requests concurrently.
    If the 5-dim score matrix isn't backed by a judge yet, render an empty
    state with a "compute scores" CTA — do NOT invent numbers.
```

## R9. Cut over + cleanup

```
All 5 screens are shipping under data-theme="v2" and have passed visual QA.

PR 9: flip the default.
- Make `data-theme="v2"` the default at the root layout.
- Remove the NEXT_PUBLIC_DESIGN_V2 flag.
- Mark `components/v1/` as deprecated. Do not delete yet — keep one release
  cycle as a rollback safety net.
- Delete `/v2-preview` route.

PR 10 (follow-up, after one stable release): delete `components/v1/` and any
v1-only CSS. Final tree should have no `data-theme` selectors and one set
of tokens.
```

---

# 🆕 GREENFIELD flow (empty repo, build from scratch)

Skip to here only if you don't have an existing app and are starting fresh.

## 1. First contact — let Codex propose a plan

```
You're picking up a finished design handoff for a product called PromptLab.

Please:
1. Read `design_handoff_promptlab/AGENTS.md` in full.
2. Read `design_handoff_promptlab/DESIGN_SPEC.md` in full.
3. Look at every PNG in `design_handoff_promptlab/screenshots/`.
4. Inspect this repo: what framework, what design system, what state library?
5. Propose a 5-screen implementation plan (one PR per screen, Builder first).
6. List every question you have before writing code.

Do NOT write any code yet. Just plan.
```

---

## 2. Bootstrap (empty repo)

```
This repo is empty. Bootstrap a new Next.js 14 (App Router) + TypeScript +
Tailwind CSS + shadcn/ui project at the root, with:

- Geist + Geist Mono + Instrument Serif from Google Fonts (preloaded)
- OKLCH design tokens from design_handoff_promptlab/DESIGN_SPEC.md §3
  declared on :root as CSS variables (NOT in tailwind config — we need
  runtime switchability for the palette later)
- A `lib/cn.ts` helper
- shadcn primitives installed: button, card, input, textarea, tabs, tooltip, avatar

Then build the app shell (Sidebar + HeaderBar) per DESIGN_SPEC §6.1 and §8.

Stop after the shell renders correctly with all 5 nav items routing to empty
placeholder pages. Open a PR called "feat: bootstrap + shell".
```

---

## 3. Builder screen

```
Implement the Builder screen.

References:
- design_handoff_promptlab/DESIGN_SPEC.md §8.1 (anatomy)
- design_handoff_promptlab/screenshots/05-builder-streaming.png
- design_handoff_promptlab/reference/builder.jsx (state & streaming logic)
- design_handoff_promptlab/reference/styles.css (every visual class)

Requirements:
- Use the host repo's shadcn primitives where they fit, custom components elsewhere.
- The streaming output ticks every 22ms and appends 6–14 random chars per tick.
- The Readiness Console must show the score ring, 4 metric bars (with shimmer),
  and 4 check items per §6.7–§6.9.
- All copy from the prototype is the placeholder copy — keep it.
- Mock data for now. Add TODO comments pointing at where the real API hooks go.

PR title: "feat(builder): prompt studio + readiness console"
```

---

## 4. Optimizer screen

```
Implement the Optimizer screen per DESIGN_SPEC.md §8.2.

The diff component is the new primitive:
- Split view: 2-column grid, BEFORE-pane has red-tinted spans on weak words,
  AFTER-pane has green-tinted spans on every added line.
- Use `diff-match-patch` (or `jsdiff`) for real diffing in the production path.
  Hard-code the segments for now and add a TODO.

Reuse Card, Chip, ChipMini, Button from the Builder PR. Don't fork them.

PR title: "feat(optimizer): diff viewer + change summary"
```

---

## 5. Templates screen

```
Implement the Templates screen per DESIGN_SPEC.md §8.3.

- Featured hero is a 2-column grid (left: copy + CTAs; right: prompt preview with
  bottom fade mask).
- Card grid uses `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`.
- Filter chips drive client-side filtering; URL state via `?cat=marketing` query.
- Card hover: translateY(-2px), border to accent, shadow lift.

Mock the templates list from design_handoff_promptlab/reference/templates.jsx.
Add TODO for swapping to `/api/templates`.

PR title: "feat(templates): gallery + featured hero"
```

---

## 6. Library screen

```
Implement the Library screen per DESIGN_SPEC.md §8.4.

- Stats strip at top (4 stat cards, sparklines on two of them).
- Search field debounces 150ms; filters the table client-side for now.
- Table is a 7-column CSS grid (see §6.15). Empty state when search misses.
- The "row mark" 6×28 pill on each row is tinted per the row's tag.

PR title: "feat(library): searchable prompt history"
```

---

## 7. Compare screen

```
Implement the Compare screen per DESIGN_SPEC.md §8.5.

- 3 model cards in parallel; each streams independently using the same hook
  built for Builder. Run them concurrently when "Run all" is clicked.
- "Top pick" badge is absolutely positioned at top: -10px on the winning card.
- Side-by-side score matrix: 1 label column + 3 model columns × 5 score rows.
  Winning cell per row gets the accent gradient fill; others get the muted line.
- Add a "Synthesize best of all" outline button (placeholder action for now).

PR title: "feat(compare): multi-model side-by-side"
```

---

## 8. Polish pass

```
Polish pass. For every screen:

1. Keyboard a11y: Tab order is logical, focus rings visible, Esc closes
   any open menus.
2. Hover/active/focus states match the prototype.
3. Reduced-motion preference disables all looping animations (shimmer, pulse,
   blink) but keeps one-shot transitions.
4. Lighthouse a11y ≥ 95 on every screen.
5. No console warnings.
6. Type coverage: no `any` outside generated code.

Open a single PR titled "chore: polish + a11y" with screenshots showing the
focus rings on every interactive surface.
```

---

## 9. Wire up real data

```
Now replace the mocks. Reference DESIGN_SPEC.md §5 for the data shapes.

1. Add a server route for prompt optimization that streams SSE.
2. Add a Postgres schema + Prisma client for the Library.
3. Wire the Templates list to a JSON file in `data/templates.json` for now;
   we'll move it to the DB later.
4. The Compare endpoint fans out to N model adapters in parallel and streams
   each response back into its column.
5. Update the AGENTS.md "Out of scope" section to note that runtime
   palette/density switching is now in scope (we'll re-enable the Tweaks panel
   as an internal /admin route).

One PR per integration. No big-bang merges.
```
