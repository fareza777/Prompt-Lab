# AGENTS.md — PromptLab Dashboard Implementation

> **You (the AI coding agent) are picking up a finished visual design and turning it into a production-ready application.** The design lives in `reference/` as runnable HTML/JSX prototypes. Your job is to **re-implement it in the project's real codebase**, not to copy the prototype files verbatim.

---

## 1. What this folder contains

| Path | Purpose |
|---|---|
| `AGENTS.md` | This file. Read first. |
| `README.md` | Human-facing overview. |
| `DESIGN_SPEC.md` | Full design tokens, screen specs, component anatomy. **Authoritative source for measurements, colors, copy.** |
| `reference/` | Working HTML/JSX prototype. Open `PromptLab Dashboard.html` in a browser to see it live. |
| `screenshots/` | Static PNG references — one per screen. |

---

## 2. What to build

A 5-screen workspace called **PromptLab** for crafting and optimizing LLM prompts. The 5 screens:

1. **Builder** — prompt studio with input + chips + streaming optimized output + readiness console (right rail).
2. **Optimizer** — diff view comparing a raw narration to an optimized prompt, plus a change summary grid.
3. **Templates** — gallery of prompt scaffolds with a featured hero.
4. **Library** — searchable table of past prompts with stats strip.
5. **Compare** — multi-model parallel runs with streaming, top-pick badge, and a side-by-side score matrix.

All screens live inside a persistent shell (sidebar OR top nav) with a sticky header.

---

## 3. Hard rules

- ✅ **Re-implement, don't copy.** The prototype is JSX-in-Babel for fast iteration. Reproduce it in the host project's framework using its established patterns.
- ✅ **Pixel-fidelity matters.** Match colors, spacing, typography, and motion exactly as specified in `DESIGN_SPEC.md`. When in doubt, open the prototype in a browser and inspect.
- ✅ **Use the host project's stack.** If the repo is Next.js + Tailwind, use that. If it's Vue, use that. If it's empty, default to **Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui**.
- ✅ **Componentize properly.** Every visual block in `DESIGN_SPEC.md §6` should map to a single reusable React component (or framework equivalent).
- ✅ **Type everything.** If TypeScript is available, define interfaces for every props bag and data shape (see `DESIGN_SPEC.md §7`).
- ✅ **Accessible by default.** Real `<button>`, real form controls, focus rings, ARIA where the prototype lacks it.
- ❌ **Do not ship inline `<style>` blocks or `style={{}}` for anything that belongs in the design system.** Promote it to a token (CSS variable / Tailwind theme / etc).
- ❌ **Do not import the prototype's `tweaks-panel.jsx`.** That is a design-tool concern, not product behavior. The Tweaks panel itself is **not** part of the final product — it only existed to let the designer toggle palette/density/layout during review.

---

## 4. Stack-by-stack guidance

### If the host is Next.js + Tailwind + shadcn/ui (recommended default)

- Put design tokens in `tailwind.config.ts` under `theme.extend.colors` and `theme.extend.fontFamily`. Mirror the OKLCH values from `DESIGN_SPEC.md §3`.
- Use CSS variables for runtime-switchable palettes (cyan/amber/violet/lime) — declared on `:root` and `[data-palette="amber"]` etc, exactly like `reference/styles.css`.
- Wrap each screen in a React Server Component for the static frame, and use `"use client"` only for the interactive surfaces (composer textarea, streaming output, chips, compare grid).
- shadcn primitives to lean on: `Button`, `Card`, `Tabs`, `Tooltip`, `Avatar`, `Input`, `Textarea`. Don't pull in `Dialog` — the design has no modals.

### If the host is Vue / Nuxt

- Tokens go in `app.vue` `<style>` as CSS variables (same as `reference/styles.css`).
- Use `<script setup>` and Composition API.
- Streaming output: use a `useStreamingText(target, speed)` composable that returns a ref of the visible substring.

### If the host is plain HTML/CSS

- Keep `reference/styles.css` as-is (it's already framework-agnostic) and wire screens as separate HTML files or one-file SPA with vanilla JS.

### If the host has its own design system already

Use ITS components and tokens, **not** the prototype's. The prototype's visual language (dark + cyan accent, editorial serif display, mono technical type, ring scores, chip rows) describes the *intent*. Map it onto the host system's nearest equivalents — but keep the screen anatomy, copy, and information hierarchy exactly as the prototype shows.

---

## 5. Data & state

The prototype uses hard-coded fixtures. For the real implementation:

| Concern | Where it lives in prototype | Real implementation |
|---|---|---|
| Streaming optimized prompt | `setInterval` in `builder.jsx` | Server-sent events or fetch streaming from your LLM endpoint. Token-by-token feel is required. |
| Readiness score (0–100) | Static 96 in `builder.jsx` | Compute server-side from the optimization pipeline; return alongside the prompt. |
| Diff between raw & optimized | Hand-built array of segments | Use `diff-match-patch` or `jsdiff` server-side; return as a list of `{type: 'eq'\|'add'\|'del', text}` tuples. |
| Templates list | Array in `templates.jsx` | Fetch from `/api/templates`. Cache aggressively — these don't change per-user. |
| Library | Array in `library.jsx` | Per-user persistence (Postgres + Prisma works fine). Paginate beyond 50 rows. |
| Compare results | Hard-coded in `compare.jsx` | Fan out one request to N model adapters in parallel. Stream each response into its column independently. |

---

## 6. Build order (recommended)

1. **Tokens & layout shell** — colors, fonts, sidebar/topnav, header bar. Verify it matches `screenshots/01-…` visually before going deeper.
2. **Builder screen** — this is the largest and shows almost every primitive. If Builder looks right, the rest reuses 80% of its components.
3. **Optimizer** — diff component is the only new primitive. Everything else is reuse.
4. **Templates** — featured hero + card grid. Reuse `Chip` from Builder.
5. **Library** — table component. Reuse stats strip from Builder.
6. **Compare** — model card + side-by-side matrix. Reuse streaming hook from Builder.

Don't ship in one giant PR — one screen per PR.

---

## 7. Acceptance criteria (per screen)

A screen is "done" when:

- [ ] It matches its screenshot in `screenshots/` at 1440px viewport within ±2px.
- [ ] Dark base color is `oklch(0.135 0.012 220)` and accent is `oklch(0.84 0.13 195)` (cyan) by default.
- [ ] Display headings use **Instrument Serif** (Google Fonts).
- [ ] Body/UI uses **Geist** (Google Fonts). Monospace blocks use **Geist Mono**.
- [ ] All buttons, chips, and tabs have hover + focus-visible states.
- [ ] Keyboard nav works (Tab through, `B/O/T/L/C` shortcuts switch screens — see `reference/app.jsx`).
- [ ] No console errors. No layout shift after fonts load.
- [ ] Lighthouse a11y ≥ 95.

---

## 8. Don't reinvent these decisions

The designer already made these calls — don't deviate without explicit user approval:

- **Editorial serif (italic) for emphasis in display headings** — never bold a serif for emphasis; use italic.
- **Cyan/teal accent over warm colors** — keeps the workspace feeling technical, not consumer.
- **Right rail = analytics/feedback. Left = navigation. Center = the action.** Don't move the Readiness Console to the bottom; it must be visible while editing.
- **Mono-only for the optimized prompt body and any code-like content.** Never render the optimized prompt in sans.
- **Streaming bursts of 6–14 chars per tick (~22ms tick)** — this is the rhythm that feels "thinking but fast". Don't switch to char-by-char.
- **Token estimates show in two places: stats strip (large) and output footer (small).** Both must agree.

---

## 9. What to ask the user before starting

If anything below is unclear, stop and ask:

1. Which framework/stack is the host project? (look for `package.json`, `Cargo.toml`, `Gemfile`, etc.)
2. Is there an existing design system to map onto, or do we ship the prototype's tokens 1:1?
3. Which LLM provider(s) power the actual optimization and compare features?
4. Is i18n needed? (The prototype is English; the original product is Indonesian — confirm.)
5. Auth model: SSO, email, none yet?
6. Persistence layer for Library? (DB choice impacts the data layer.)

---

## 10. Files in `reference/` — what to actually read

Read in this order. Don't skim — every screen's anatomy is in here:

1. `reference/styles.css` — **all design tokens**, every component class, every animation. Single source of CSS truth.
2. `reference/shared.jsx` — icon set, layout chrome (Sidebar, TopNav, HeaderBar), Ring score component, Sparkline.
3. `reference/builder.jsx` — Builder screen including the streaming effect and Readiness Console.
4. `reference/optimizer.jsx` — Diff component.
5. `reference/templates.jsx` — Featured hero + card grid.
6. `reference/library.jsx` — Table layout.
7. `reference/compare.jsx` — Model card + matrix.
8. `reference/app.jsx` — Routing, keyboard shortcuts, tweak protocol (skip the tweak protocol).

---

## 11. Out of scope

The prototype includes design-tool-only features. Do **not** ship these:

- ❌ The Tweaks panel (bottom-right floating box).
- ❌ Palette switching at runtime (cyan/amber/violet/lime). Ship cyan only unless the user requests theming.
- ❌ Density switching at runtime. Pick `regular` and ship it.
- ❌ Sidebar/top-nav toggle. Ship sidebar only unless the user requests both.

Everything else in `screenshots/` is in scope.
