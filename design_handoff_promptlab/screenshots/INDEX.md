# Screenshots Index

Visual references for each screen. All captured at 1440px design width, scaled to ~720px for inclusion. Use the runnable prototype in `../reference/` for pixel-level inspection.

## 01-builder.png
**Builder screen — scrolled to show the right-rail detail.**

What's visible:
- **AI Readiness Console** (right rail): big "96" score in ring, four metric bars (Clarity 98%, Context 97%, Output format 99%, Guardrails 92%) with shimmer animation, four `Check` items with index badges and trailing check icons.
- **Optimized output card** (below console): three tabs (Optimized / Narration / Schema), action icons (copy, download, more), placeholder body with mono `Optimize ⌘↵` chip, footer with `LOCAL DRAFT` chip + word/token count + sync time.
- **Composer footer** (top of frame, partially cut): autosave note, Reset / Run in Compare / Optimize ⌘↵ buttons.
- **Quota card** (sidebar bottom): 12.4k / 50k mono usage with gradient bar.

Use this screenshot for: Readiness Console anatomy, output card layout, button styling.

## 02-optimizer.png
**Optimizer screen — diff view with change summary.**

What's visible:
- **Mode toggle row**: Split view (active) / Unified / Summary chips, right side shows 6 changes / +28 readiness / 3,840 tok chip-minis.
- **Diff card**: two-column grid, left shows BEFORE (red-tinted highlights on "new customers", "sound friendly", "not too salesy", "sign up", "free trial"), right shows AFTER with green-tinted highlights wrapping each new line. Both have header strips with chip-mini status + readiness scores.
- **Change summary section**: label + "6 OF 6 APPLIED" right-aligned, grid of 6 cards (Role definition, Concrete metric, Audience profile, Output schema, Guardrails, Voice spec), each with a glyph, ADDED/TIGHTENED chip, body text.

Use this screenshot for: diff viewer anatomy, change summary card pattern.

## 03-templates.png
**Templates screen — featured hero + filter chips + card grid.**

What's visible:
- **Featured hero**: "FEATURED THIS WEEK" eyebrow with star, serif title with italic accent "Cold outbound, warm replies.", body copy, "Use template" primary + "Preview output" outline + meta row. Right side shows mono prompt preview with bottom fade gradient.
- **Filter chips row**: All (active, with mono count 9), Marketing, Content, Business, Coding, Academic, Image AI; right side has "Sort: Most used" chip.
- **Card grid (3 columns visible)**: 9 template cards each with a colored glyph box, serif title, category chip + model chip, description, meta footer (clock / token / uses count).

Use this screenshot for: featured hero pattern, template card anatomy, filter row pattern.

## 04-library.png
**Library screen — stats strip + search + table.**

What's visible:
- **Page header**: "Library · every prompt, versioned" with italic accent, sub-copy, Filter / Export all / New prompt buttons right-aligned.
- **Stats strip (4 cards)**: Saved prompts 248 (+12 this week), Avg readiness 92/100 with sparkline, Tokens saved 1.42M (-31% fewer retries), Most-used model "Claude Sonnet".
- **Search row**: search field with ⌘K kbd, chips All (active) / Starred / Shared / Archived.
- **Table**: header row (Prompt / Model / Tokens / Readiness / Updated / Actions), 8 data rows each with: row-mark color pill, title + sub, model chip, mono token count, readiness bar + score, mono date, copy + arrow action icons.

Use this screenshot for: table layout, row mark color tinting, stats strip pattern, search + filter chip combo.

## 05-compare.png
**Compare screen — 3 model cards streaming + side-by-side score matrix.**

What's visible (after "Run all" was clicked):
- **Shared prompt card** (top): label + "Optimized · v3" + "96 readiness" chips, mono prompt body in highlighted code block.
- **Compare grid (3 columns)**: Claude Sonnet 4, GPT-4o, Gemini Pro 1.5 — each with logo tile (tinted by model color), name + status, mono streaming output body, 3-stat footer (Latency / Cost / Tokens).
- **Side-by-side score card**: header with label + "Where each model wins" serif title + "Synthesize best of all" outline button. Matrix: 1 label column + 3 model columns, 5 rows (Tone match, Format adherence, Idea originality, Cultural fit, Cost efficiency). Winning cell per row has the accent gradient fill; others use muted line color.

Use this screenshot for: model card anatomy, streaming output styling, score matrix layout.

---

## Missing screens

We did not include a Builder hero screenshot in this batch. For the hero section anatomy, see `DESIGN_SPEC.md §6.17` and `reference/builder.jsx` (the `<section className="hero">` block). The hero is the page's first element, with:
- Eyebrow "Studio · v2 release" with cyan dot
- Serif display title with italic accent: "The cleanest *prompt*, before you hit run."
- Body sub-copy
- Two CTA buttons (primary "Open Studio" + outline "Watch the 90s tour")
- Status row right-aligned (OCR Screenshot / Model fallback / DOCX · PPTX export with green checks)
- Decorative grid pattern overlay top-right, masked to a radial fade
- Radial cyan glow at 80% 0% position

To see this live, open `reference/PromptLab Dashboard.html` in a browser.
