# PromptLab — Design Handoff for ChatGPT Codex

A complete, self-contained design package for ChatGPT Codex (or any AI coding agent) to implement the PromptLab dashboard in a real codebase.

---

## What's in this folder

```
design_handoff_promptlab/
├── AGENTS.md             ← Codex reads this automatically. Implementation rules.
├── DESIGN_SPEC.md        ← All tokens, components, screens. The "source of truth."
├── MIGRATION.md          ← Re-skin guide for an existing deployed app.
├── PROMPTS_FOR_CODEX.md  ← Copy-paste prompts for Codex (re-skin + greenfield).
├── README.md             ← You are here. Human-facing overview.
├── reference/            ← Working HTML/JSX prototype. Open in browser to see it live.
│   ├── PromptLab Dashboard.html
│   ├── styles.css
│   ├── shared.jsx
│   ├── builder.jsx
│   ├── optimizer.jsx
│   ├── templates.jsx
│   ├── library.jsx
│   ├── compare.jsx
│   ├── app.jsx
│   └── tweaks-panel.jsx
└── screenshots/          ← Per-screen PNG references at desktop width.
    ├── INDEX.md          ← What each screenshot shows + when to use it.
    ├── 01-builder.png
    ├── 02-optimizer.png
    ├── 03-templates.png
    ├── 04-library.png
    └── 05-compare.png
```

---

## Fidelity

This is a **high-fidelity** package. Colors, spacing, typography, and motion are final. The developer (or Codex) should reproduce these in the target codebase pixel-for-pixel — **not** ship the HTML files as-is.

The HTML prototype is a **design reference**, not production code. It uses JSX-in-Babel for fast iteration. Re-implement it in whatever the host project uses (Next.js + Tailwind + shadcn/ui is the recommended default — see `AGENTS.md §4`).

---

## How to use this with ChatGPT Codex

### Option A — Drop into an existing repo

1. Copy the entire `design_handoff_promptlab/` folder into the root (or `docs/`) of your repository.
2. Codex auto-discovers `AGENTS.md`. The one in this folder applies only to its subtree, so you can have a top-level `AGENTS.md` for general repo rules and this one for the dashboard task specifically.
3. In Codex, open the repo and prompt:

   > Implement the dashboard described in `design_handoff_promptlab/`. Start with the Builder screen. Read `AGENTS.md` first, then `DESIGN_SPEC.md`. Match the screenshots in `design_handoff_promptlab/screenshots/`.

4. Let Codex propose a plan. Review before it starts writing files. The handoff is structured so Codex can ship one screen per PR — encourage that flow.

### Option B — Start a new repo from scratch

1. Initialize the repo with your preferred stack (or let Codex pick).
2. Drop this folder in at the root.
3. Prompt Codex:

   > Bootstrap a new Next.js 14 + TypeScript + Tailwind + shadcn/ui project. Then implement the design in `design_handoff_promptlab/` following `AGENTS.md`. Build in this order: tokens & shell, Builder, Optimizer, Templates, Library, Compare.

### Option C — Iterative single-screen work

Useful for tight feedback loops:

> Read `design_handoff_promptlab/DESIGN_SPEC.md §8.1` and `screenshots/01-optimizer.png` (note: 01 is Optimizer in the screenshot folder). Implement the Builder screen only, using the tokens from `§3` and the components defined in `§6`. Reference `design_handoff_promptlab/reference/builder.jsx` to understand state & streaming behavior.

---

## What Codex will need from you (the human)

The handoff is thorough but doesn't know your project. Be ready to answer:

1. **Stack** — what's the target framework?
2. **LLM provider** — which model API powers the actual optimizer? (Anthropic, OpenAI, both?)
3. **Auth & persistence** — how do users sign in and where does the Library live?
4. **i18n** — copy is currently English. Original product was Indonesian. Keep both?

`AGENTS.md §9` lists these as the questions Codex should ask before starting.

---

## Out of scope (don't let Codex build these)

The prototype includes a **Tweaks panel** (bottom-right floating box) used for design review only. Codex should ignore it. Specifically:

- ❌ Tweaks panel itself
- ❌ Runtime palette switching (cyan/amber/violet/lime)
- ❌ Runtime density switching
- ❌ Runtime sidebar/top-nav toggle

Ship the default: cyan palette, regular density, sidebar layout.

---

## Acceptance

Each screen is done when it matches its screenshot at 1440px viewport within ±2px, has working keyboard navigation, passes a11y at 95+, and has no console errors. See `AGENTS.md §7` for the full checklist.

---

## Questions about the design itself

If something in the screenshots or spec is unclear, open the live prototype:

```bash
cd reference/
# any static file server, e.g.
python3 -m http.server 8000
# then open http://localhost:8000/PromptLab%20Dashboard.html
```

The prototype is fully interactive — click chips, press `B/O/T/L/C` to switch screens, click "Optimize" to see the streaming animation, click "Run all" on the Compare screen to see parallel streaming.
