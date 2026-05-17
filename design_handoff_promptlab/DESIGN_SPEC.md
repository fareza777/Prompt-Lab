# DESIGN_SPEC.md — PromptLab

The authoritative reference for every visual decision. When the prototype and this document conflict, **this document wins** — open an issue and we'll reconcile.

---

## 1. Product summary

PromptLab is a workspace for crafting and shipping prompts to LLMs. A user writes a rough idea in plain language, attaches references, picks a target model and output format, and PromptLab returns a structured, guarded, model-ready prompt. The workspace has five screens (Builder, Optimizer, Templates, Library, Compare) sharing a single shell.

**Aesthetic:** dark + cyan/teal, premium, editorial. Display type is a serif with italic accents; UI type is a geometric sans; technical content is mono. The mood sits between **Linear**, **Vercel**, and a research notebook.

---

## 2. Type

| Role | Family | Weights | Where |
|---|---|---|---|
| Display | **Instrument Serif** | 400, 400 italic | Page H1, hero titles, card titles, screen labels |
| UI sans | **Geist** | 400, 500, 600 | Body, buttons, chips, table cells |
| Mono | **Geist Mono** | 400, 500, 600 | Optimized prompt, tokens/cost, KBD chips, table mono cells |

All three are on **Google Fonts**. Preload them.

### Type scale (px, line-height multiplier)

| Token | Size | LH | Tracking | Family |
|---|---|---|---|---|
| display-xl | clamp(40, 5.4vw, 76) | 0.98 | −0.02em | serif |
| display-lg | clamp(34, 4.4vw, 52) | 1.00 | −0.02em | serif |
| display-md | 38 | 1.05 | −0.01em | serif |
| display-sm | 26 | 1.10 | −0.01em | serif |
| card-title | 22 | 1.10 | −0.01em | serif |
| body-lg | 15.5 | 1.55 | 0 | sans |
| body | 14 | 1.50 | 0 | sans |
| body-sm | 13 | 1.45 | 0 | sans |
| label | 11 | 1.30 | 0.08em / uppercase | sans 600 |
| eyebrow | 11.5 | 1.30 | 0.14em / uppercase | sans 500 |
| mono | 12.8 | 1.65 | 0 | mono |
| mono-sm | 10.5 | 1.40 | 0.04em | mono |

**Italics rule:** all `<em>` inside serif headings render in the accent color. Never bold a serif heading.

---

## 3. Color tokens (OKLCH)

Copy these verbatim into your theme. Hex equivalents are approximate fallbacks.

### Surfaces (dark only)

| Token | OKLCH | ~Hex | Use |
|---|---|---|---|
| `--bg-0` | `oklch(0.135 0.012 220)` | `#0d1216` | Page background |
| `--bg-1` | `oklch(0.165 0.014 220)` | `#131a1f` | Sidebar / second tier |
| `--bg-2` | `oklch(0.195 0.016 220)` | `#1a2228` | Card / input fill |
| `--bg-3` | `oklch(0.225 0.018 220)` | `#212a31` | Hover surface |
| `--bg-input` | `oklch(0.155 0.014 220)` | `#11181c` | Textarea / code blocks |

### Lines

| Token | OKLCH | Use |
|---|---|---|
| `--line-soft` | `oklch(0.225 0.016 218)` | Default divider |
| `--line` | `oklch(0.265 0.020 215)` | Component border |
| `--line-strong` | `oklch(0.34 0.024 210)` | Emphasis border |

### Text

| Token | OKLCH | Use |
|---|---|---|
| `--fg` | `oklch(0.975 0.005 220)` | Primary |
| `--fg-2` | `oklch(0.88 0.008 220)` | Secondary |
| `--fg-mute` | `oklch(0.66 0.014 220)` | Captions |
| `--fg-subtle` | `oklch(0.48 0.014 220)` | Meta |
| `--fg-faint` | `oklch(0.36 0.014 220)` | Disabled |

### Accent (default = cyan)

| Token | OKLCH | Use |
|---|---|---|
| `--ac` | `oklch(0.84 0.13 195)` | Primary accent, links, highlights, italic emphasis |
| `--ac-2` | `oklch(0.74 0.14 178)` | Gradient stop B |
| `--ac-3` | `oklch(0.62 0.15 200)` | Gradient stop C / dark accent |
| `--ac-soft` | `oklch(0.84 0.13 195 / 0.14)` | Background tint for chips & active states |
| `--ac-line` | `oklch(0.84 0.13 195 / 0.32)` | Accent border |
| `--ac-glow` | `oklch(0.84 0.13 195 / 0.55)` | Shadow / drop-shadow filter |

### Semantic

| Token | OKLCH | Use |
|---|---|---|
| `--pos` | `oklch(0.78 0.16 158)` | Success / added in diff |
| `--warn` | `oklch(0.82 0.16 78)` | Warning |
| `--neg` | `oklch(0.72 0.18 22)` | Error / removed in diff |

---

## 4. Spacing & radius

| Token | Value |
|---|---|
| Base unit | 4px (everything is a multiple of 4) |
| Card padding | 20px |
| Section padding | 28px |
| Page padding (top/bottom, left/right) | 24px / 28px |
| Gap (default) | 14px |
| Row height | 36px |
| Radius `--r-sm` | 6px |
| Radius `--r` | 10px |
| Radius `--r-md` | 14px |
| Radius `--r-lg` | 20px |
| Radius `--r-xl` | 28px |

---

## 5. Shadows & glow

| Token | Value |
|---|---|
| Card hover lift | `0 12px 32px oklch(0 0 0 / 0.3)` |
| Toast | `0 8px 32px oklch(0 0 0 / 0.5)` |
| Primary button glow | `0 1px 0 oklch(1 0 0 / 0.3) inset, 0 6px 22px var(--ac-soft)` |
| Brand mark glow | `inset 0 1px 0 oklch(1 0 0 / 0.4), 0 8px 24px var(--ac-soft)` |
| Ring score progress | `drop-shadow(0 0 6px var(--ac-glow))` |

---

## 6. Components (anatomy)

Every component below should become ONE reusable unit in the host codebase.

### 6.1 Shell

- `<Sidebar>` — 248px fixed, sticky to viewport, contains `<BrandMark/>`, nav list, recent list, usage card at bottom.
- `<TopNav>` — alternative; not shipped unless requested. Skip.
- `<HeaderBar>` — sticky 56px, breadcrumb left, status pill (`SYNCED` + live dot), search 240px, icon buttons, avatar 32px.

### 6.2 Brand mark

A 36×36 (sidebar) or 30×30 (compact) rounded-rect with:

- Background: `linear-gradient(135deg, var(--ac), var(--ac-2) 55%, var(--ac-3))` plus a 30/30 radial highlight at 0.3 opacity.
- Glow: `inset 0 1px 0 oklch(1 0 0 / 0.4), 0 8px 24px var(--ac-soft)`.
- Foreground: a small ` >> ` chevron pair stroked in the page background color.

### 6.3 Buttons

- `.btn` — 8/14 pad, 13px, 8px radius, `--bg-2` fill, `--line` border.
- `.btn.primary` — gradient fill `linear-gradient(180deg, var(--ac), var(--ac-2))`, dark text `oklch(0.18 0.025 220)`, 600 weight, glow shadow. Used at most once per screen.
- `.btn.outline` — transparent fill.
- `.btn.ghost` — no border, no fill.
- Sizes: `.sm` (5/10, 12px), default, `.lg` (11/18, 14px).
- `kbd` chip embedded inside button: mono 10.5px, dark inset background `oklch(0 0 0 / 0.18)`.

### 6.4 Chips

Pill-shaped toggle. 5/11 pad, 12.5px, 999px radius.

- Off: `--bg-1` fill, `--line` border.
- On: `--ac-soft` fill, `--ac` text, `--ac-line` border, 500 weight.
- `.chip-mini` — 2/7 pad, mono 10.5px, used for status tags. Variants: default, `.ac`, `.pos`, `.warn`.

### 6.5 Cards

```
border: 1px solid var(--line-soft);
border-radius: var(--r-md);
padding: 20px;
background: linear-gradient(180deg,
  oklch(0.185 0.016 220 / 0.6),
  oklch(0.165 0.014 220 / 0.4));
```

Card header pattern: `serif title (22px) + sub (13px muted)` left, `chip-mini + icon-button` right.

### 6.6 Inputs

- **Textarea** — 16px pad, `--bg-input` fill, `--line-soft` border, 14.5px sans, 1.6 line-height. Focus state: `--ac-line` border + 4px `--ac-soft` ring.
- **Search** — 7/10 pad, 13px, `--bg-1` fill. Icon left, `kbd ⌘K` chip right.
- **Attach dropzone** — 12/14, dashed `--line` border. Hover: `--ac-line` border, `--ac-soft` background, `--fg` text.

### 6.7 Ring score (Readiness)

- 72×72 SVG, stroke 6.
- Track: `--bg-3`. Progress: gradient `--ac` → `--ac-2` via `<linearGradient id="ringGrad">`.
- Cap: round. Drop-shadow: `drop-shadow(0 0 6px var(--ac-glow))`.
- Center: serif 28px number.
- Transitions: `stroke-dashoffset 0.8s ease-out`.

### 6.8 Metric bar

```
height: 6px;
border-radius: 4px;
background: var(--bg-2);
fill: linear-gradient(90deg, var(--ac), var(--ac-2));
```

Animated shimmer overlay: `linear-gradient(90deg, transparent, oklch(1 0 0 / 0.18), transparent)` translating −100% → 100% over 2.5s linear infinite.

### 6.9 Check item

Used in the Readiness Console.

```
[ 01 ]  Intent parsed                  ✓
        Role, goal, and output schema captured.
```

- Index badge: 22×22, `--ac-soft` fill, `--ac` text, mono 10.5px, 600.
- Title: 13px 500 weight.
- Body: 12px muted, 1px above.
- Trailing check: `I.Check` 15px in `--pos`.
- Container: 10/12 pad, `--line-soft` border, `oklch(0.165 0.014 220 / 0.5)` fill.

### 6.10 Streaming output

- Body: `font-family: mono`, `font-size: 12.8px`, `line-height: 1.65`, `white-space: pre-wrap`.
- XML-style tags (`<role>`, `</role>`) render in `--ac` 600.
- Bullet lines (`- ...`) render the dash in `--fg-mute`.
- Cursor: 6×13 `--ac` block, `animation: blink 1s steps(2) infinite`.
- Tick rate: every 22ms, append 6–14 chars (random). Stop on full length, hide cursor.

### 6.11 Diff viewer

- Two-column grid (split mode) or stacked (unified mode).
- Header row: chip-mini (`BEFORE` red / `AFTER` green), 12px caption, readiness chip right.
- **Removed segment** (left pane): inline span with `oklch(0.72 0.18 22 / 0.18)` background, `oklch(0.85 0.12 22)` text.
- **Added segment** (right pane): inline span with `oklch(0.78 0.16 158 / 0.18)` background, `oklch(0.88 0.14 158)` text.

### 6.12 Stat card

```
padding: 16px 18px;
border-radius: var(--r-md);
border: 1px solid var(--line-soft);
background: linear-gradient(180deg,
  oklch(0.185 0.016 220 / 0.6),
  oklch(0.155 0.014 220 / 0.4));
```

Structure: `label (eyebrow style)` → `value (serif 30px)` → `delta or sparkline (28px height)`.

### 6.13 Sparkline

100×28 viewBox, `preserveAspectRatio="none"`. Single path stroke 1.4px, gradient fill underneath (top 30% opacity → 0%). Color = passed prop, default `--ac`.

### 6.14 Template card

```
padding: 18px;
border-radius: var(--r-md);
gap: 12px;
hover: translateY(-2px), border --ac-line, shadow 0 12px 32px black/30
```

Structure: glyph (38×38 tinted box) + title (serif 19px) + chips → description → meta footer (clock, coin, uses).

### 6.15 Library row

7-column grid: `36px | 1.6fr | 1fr | 0.8fr | 0.8fr | 110px | 60px`. 14/18 pad. First cell is a 6×28 gradient pill (`row-mark`) tinted by the row's tag.

### 6.16 Compare model card

460px min-height flex column. Header (logo 30×30 tinted, name + status), body (mono output with streaming cursor), stats footer (3-col grid: Latency / Cost / Tokens).

Top-pick variant: extra `--ac-line` border + glow, plus an absolute-positioned "★ Top pick" badge tab at top-right (`top: -10px`, gradient fill, dark text).

### 6.17 Hero

- Padding: 40/36.
- Background: radial accent glow top-right at 80% 0%, layered over a subtle linear gradient.
- Decorative grid: 24×24 `--ac-line` overlay masked to a radial fade in top-right corner.
- Eyebrow: dot + uppercase label in `--ac`.
- Title: serif clamp(40, 5.4vw, 76), 18ch max-width, italic `<em>` in `--ac`.
- Sub: 15.5px, 64ch max-width, `--fg-2`.
- Actions row: primary CTA + outline CTA + status row (right).

---

## 7. Data shapes

If you're typing this in TS, here are the interfaces.

```ts
type ScreenId = 'builder' | 'optimizer' | 'templates' | 'library' | 'compare';

interface Prompt {
  id: string;
  title: string;
  subtitle: string;
  body: string;          // the optimized prompt, can contain <tag> blocks
  raw: string;           // user's original narration
  category: Category;
  tone: Tone;
  target: ModelId;
  output: OutputFormat;
  tokens: number;
  readiness: ReadinessReport;
  createdAt: string;
  updatedAt: string;
}

interface ReadinessReport {
  overall: number;        // 0-100
  metrics: {
    clarity: number;
    context: number;
    outputFormat: number;
    guardrails: number;
  };
  checks: Check[];
}

interface Check {
  id: string;
  title: string;          // "Intent parsed"
  body: string;           // "Role, goal, and output schema captured."
  status: 'ok' | 'warn' | 'fail';
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: Category;
  preferredModel: ModelId;
  averageTokens: number;
  averageRuntimeSec: number;
  uses: number;           // total usage count
  featured?: boolean;
  body: string;
}

interface CompareRun {
  promptId: string;
  models: ModelId[];
  results: Record<ModelId, ModelResult>;
}

interface ModelResult {
  output: string;
  latencyMs: number;
  costUsd: number;
  tokens: number;
  scores: {                // 0-100 each
    toneMatch: number;
    formatAdherence: number;
    ideaOriginality: number;
    culturalFit: number;
    costEfficiency: number;
  };
}

interface DiffSegment {
  type: 'eq' | 'add' | 'del';
  text: string;
}

type Category = 'marketing' | 'content' | 'business' | 'coding' | 'academic' | 'image';
type Tone = 'professional' | 'casual' | 'persuasive' | 'creative' | 'concise' | 'empathetic';
type ModelId = 'claude' | 'gpt' | 'gemini' | 'grok' | 'midjourney';
type OutputFormat = 'code' | 'word' | 'slides' | 'brief' | 'analysis' | 'content';
```

---

## 8. Screens

### 8.1 Builder

**Layout** (top → bottom, 1440px desktop):

1. **Hero** — full-width, 24px bottom margin.
2. **Stats strip** — 4-column grid: Readiness, Token estimate, Target model, Saved this week. 14px gap.
3. **Studio** — 2-column grid `1.4fr 1fr`, 20px gap. Below 1180px → stack.
   - **Left col (composer card):**
     - Header: serif title "Prompt Studio" 26px + sub 13px. Top-right: draft chip + dots menu.
     - Textarea (`User narration` label).
     - Attach button (dashed).
     - 2×2 grid of field groups: Category, Tone, Target model, Output format.
     - Smart suggestions: chip row with dashed border chips.
     - Footer: autosave note + ghost reset + outline "Run in Compare" + primary "Optimize ⌘↵".
   - **Right col (output stack, sticky):**
     - **Readiness console card:**
       - Label "AI Readiness Console" + serif "Intelligence layer".
       - Ring + ring-info card.
       - 4 metric bars.
       - Divider.
       - 4 check items.
     - **Optimized output card:**
       - Tab strip: Optimized (active, with v3 count) / Narration / Schema. Right side: copy / download / dots.
       - Body: mono content with XML-style tag coloring, ends with blinking cursor while streaming.
       - Footer: LOCAL DRAFT chip + word/token count + last sync.

### 8.2 Optimizer

1. **Page header** — `Optimizer · diff & refine` + sub.
2. **Mode toggle row** — chip-row of Split / Unified / Summary; right: change-count chip + readiness delta chip + token chip.
3. **Diff card** — header bar with BEFORE/AFTER labels and readiness scores; body is the diff itself.
4. **Change summary** — labelled section ("6 of 6 applied") + grid of 6 cards (one per change). Each card: glyph (added = pos, tightened = warn) + title + tag chip + body.

### 8.3 Templates

1. **Page header** — `Templates · instant scaffolds`.
2. **Featured hero** — 2-col grid: left (eyebrow + serif h2 with italic + body + 2 CTAs + meta row), right (prompt preview in mono with bottom fade).
3. **Filter row** — chip row of categories (All, Marketing, …) + sort dropdown right.
4. **Card grid** — `repeat(auto-fill, minmax(280px, 1fr))`, 16px gap. Each card per §6.14.

### 8.4 Library

1. **Page header** — `Library · every prompt, versioned`.
2. **Stats strip** — Saved prompts / Avg readiness / Tokens saved / Most-used model.
3. **Search row** — search field + tab chips (All / Starred / Shared / Archived).
4. **Table** — header row + N data rows per §6.15. Empty state when search misses: muted message.

### 8.5 Compare

1. **Page header** — `Compare · models in parallel`.
2. **Shared prompt card** — label + chips right + mono code block.
3. **Compare grid** — `repeat(auto-fit, minmax(280px, 1fr))`, 16px gap. 3 model cards default. Top pick gets the badge + glow.
4. **Side-by-side score card** — header (label + serif title + outline "Synthesize best of all"). Body is a matrix: 1 label column + 3 model columns × 5 score rows. Winning cell per row gets the gradient fill; others get `--line-strong`.

---

## 9. Motion

| Surface | Motion |
|---|---|
| Streaming cursor | `blink 1s steps(2) infinite` |
| Live dot (sync pulse) | `pulse 1.6s ease-in-out infinite` — opacity 0.7→1, scale 1→1.15 |
| Metric bar shimmer | `shimmer 2.5s linear infinite` — translateX −100%→100% |
| Ring score progress | `stroke-dashoffset 0.8s ease-out` on mount |
| Card hover | `translateY(-2px)` over 150ms, border to `--ac-line`, shadow lift |
| Chip toggle | `background, color, border-color` over 150ms |
| Toast | `rise 0.25s ease-out` — translateY 20px→0, opacity 0→1 |
| Tab underline | `border-bottom-color` over 150ms |

No spring physics. Linear/ease-out only.

---

## 10. Copywriting voice

- Mixed editorial & technical. "The cleanest prompt, before you hit run." not "Optimize your prompts!"
- Italic accents in display headings carry the emotional weight; sans body stays factual.
- Status microcopy is short and neutral: "Autosaved · 1s ago", "Local draft", "Synced".
- Never use ALL CAPS except for chip-mini status tags (`BEFORE`, `AFTER · OPTIMIZED`, `LOCAL DRAFT`, `SYNCED`).
- Token/cost values use mono.
- Empty states are encouraging but compact: "Press Optimize ⌘↵ to generate a model-ready prompt from your narration."

---

## 11. Iconography

Custom-stroked SVG, 24×24 viewBox, 1.6 stroke width, round caps & joins, `currentColor`. The prototype's `shared.jsx` defines the full set under the `I.*` namespace. If you swap in a library (Lucide, Iconoir, Phosphor), pick **one** library and stay there — don't mix.

Required icons used across screens: Pen, Wand, Sparkles, Grid, Archive, Compare (two vertical bars), Settings, Search, Bell, Plus, ArrowRight, ArrowUpRight, ChevronRight, ChevronDown, Paperclip, Copy, Download, Refresh, Check, CheckCircle, X, Image, Code, FileText, Play, Pause, Star, Bolt, Globe, Layers, Filter, Dots, Clock, Coin, Diff, Brain, Spark, Send, Beaker, Book.

---

## 12. Responsive

Designed for **1440px** desktop primary. Behavior:

- ≥ 1180px: full 2-column studio.
- 900–1180px: studio stacks; stats strip becomes 2×2.
- < 900px: sidebar collapses to a drawer (not implemented in prototype — add it).
- < 720px: chip rows wrap, field rows stack.

Don't optimize for phone in v1 unless explicitly asked.

---

## 13. Performance budget

- TTI ≤ 2.0s on a 4G connection.
- Font weight subset to the weights used (300/400/500/600 sans; 400/500/600 mono; 400 italic serif).
- Hero ambient blur layer: keep the `filter: blur(120px)` but make sure it's a single fixed element, not repeated per-screen.
- Streaming should use real SSE, not `setInterval` over a pre-fetched string.
