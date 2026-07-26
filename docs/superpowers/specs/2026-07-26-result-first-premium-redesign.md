# PromptLab result-first premium redesign

## Decision

PromptLab becomes a result-first AI work-output assistant. The default flow creates the finished deliverable directly. The generated prompt remains available only through a secondary “Lihat prompt” disclosure for advanced users.

The redesign preserves the live Android package, PromptLab name, single-canvas architecture, generation engine, attachments, authentication, quota, billing, history, export, and accessibility foundations.

## Chosen approach

Three approaches were considered:

1. **Result-first with hidden prompt — chosen.** One request produces the finished output. The prompt is inspectable but not a required step.
2. **Dual mode.** Ask users to choose “Hasil” or “Prompt” before generating. Rejected because it adds an expert decision before value.
3. **Prompt-first refinement.** Keep the current two-stage process but clarify the labels. Rejected because it preserves a dated value proposition and unnecessary step.

## Product promise

Primary promise:

> Ubah catatan, foto, dan file menjadi laporan, slide, konten, analisis, atau kode yang siap diedit.

PromptLab must not present itself as generic chat. It is a focused work-output tool with structured deliverables, file context, reusable history, and export.

## Primary workflow

1. User opens directly on the work canvas after a lightweight language choice.
2. User describes the outcome or attaches source material.
3. Optional advanced controls specify deliverable type, field, tone, and target model.
4. Primary CTA “Buat hasil” performs both internal prompt construction and prompt execution.
5. The result surface shows only the finished output by default.
6. Secondary actions: Improve result, Save result, Export, Report, and View prompt.
7. “Lihat prompt” opens a secondary disclosure or sheet. Prompt-specific Improve/Compare actions live there.

The four-screen onboarding tour is removed. A compact, dismissible first-use note may explain attachments and output types after language selection, but it cannot block the canvas.

## Content model

The UI must keep three identities separate:

- `request`: the user’s original narrative and attachment references.
- `prompt`: the structured instruction generated internally.
- `output`: the finished content produced by executing the prompt.

Saved history items require an explicit `contentType` and may retain related request/prompt/output fields. Opening an output item must restore it as output, not as a prompt. Report, copy, save, export, and improve actions must receive the currently named content explicitly.

Backward compatibility:

- Existing history items without `contentType` are treated as `prompt`.
- Existing item fields remain readable.
- No destructive migration is required.

## Error and fallback behavior

- Prompt-generation failure: explain that PromptLab could not prepare the work instruction and offer retry.
- Execution failure: keep the generated prompt internally, show a retry action, and optionally expose “Lihat prompt”.
- Local fallback provenance must say it used a local template; it must not claim AI generation.
- Partial/timeout output remains visible and can be copied or retried.
- Failed save, export, report, or upgrade actions must remain scoped to the initiating control.

## Visual direction

Archetype: editorial luxury with soft structuralism.

- Light-first warm ivory background; no dark default.
- Graphite text and one restrained forest-green accent.
- Deep espresso may be used sparingly for the primary CTA, never as a page background.
- Display typography has editorial character; body typography remains highly legible and locally/system served unless a bundled font is already available.
- Large whitespace and an asymmetric desktop composition: concise product guidance beside the primary work surface.
- Mobile collapses to one column with the composer and result taking priority.
- Major work surfaces use subtle nested bezels: a quiet outer tray and a clean inner paper surface.
- Shadows are broad, warm, and diffused. No neon, glass dashboard, cyan grid, or generic AI gradient.
- Controls use varied but concentric radii; primary CTA is a confident rounded capsule with restrained press/hover feedback.
- Motion uses custom cubic-bezier curves, transform/opacity only, and respects reduced motion.

## Main screen composition

### Header

- Floating, contained header rather than a full-width dark bar.
- PromptLab wordmark plus concise outcome-oriented descriptor.
- Guide, History, and Account remain icon actions with accessible labels.

### Intro

- Small eyebrow: “AI work studio”.
- Headline: “Bahan mentah masuk. Hasil kerja keluar.”
- One concise supporting sentence.
- Trial information becomes quiet metadata, not a bordered alert.

### Composer

- Large paper-like work surface.
- Clear visible label: “Apa yang ingin kamu hasilkan?”
- Attachment control integrated into the lower action rail.
- Primary CTA: “Buat hasil”.
- Advanced controls remain collapsed and use full-width mobile fields to avoid clipping.

### Starters

- Show at most three outcome-led starters on the initial screen.
- Examples describe outcomes, not internal prompt categories.
- “Lihat contoh lain” opens the existing searchable starter sheet.

### Result

- Finished output is the hero surface.
- Prompt is not a peer tab.
- Primary actions are output-specific.
- “Lihat prompt” is a quiet secondary disclosure.
- Loading uses a document-shaped skeleton and elapsed-time copy rather than a visually dominant spinner.

## Accessibility

- Default light palette must meet WCAG AA for all visible normal text.
- Preserve skip link, native controls, focus trap/return, Escape behavior, live regions, and reduced motion.
- Language selection remains keyboard accessible.
- Physical Android verification must include TalkBack, 200% font scaling, keyboard traversal where supported, and safe-area behavior.

## Release parity

- Replace old five-tab Play Store screenshots with the result-first light interface.
- Rewrite capture selectors and tests away from `.v2-*` and bottom navigation.
- Update listing copy only after the shipped UI, screenshots, and tests describe the same workflow.

## Testing strategy

Behavior tests must be written before production changes and prove:

- Generate performs prompt construction followed by execution and surfaces output.
- Prompt remains hidden until explicitly requested.
- Output actions receive output; prompt actions receive prompt.
- History preserves `contentType` and migrates legacy items as prompt.
- Report submits the visible/named content.
- Upgrade selects a valid plan.
- First run reaches the canvas immediately after language choice.
- Play Store capture tests target the active single-canvas classes.
- Light theme is default and faint text meets the chosen token contract.

Visual verification must cover 390×844 mobile and a representative desktop viewport, in light mode and with reduced motion.

## Out of scope

- Replacing the AI provider stack.
- Rebuilding authentication, billing, Supabase schema, or Android wrapper.
- Adding chat, multi-turn agents, collaboration, or unrelated new tools.
- Renaming the Android package.

## Acceptance criteria

- One primary request produces the finished result without a second user action.
- Prompt is hidden by default and accessible through “Lihat prompt”.
- Save/History/Report/Improve/Export act on explicit content types.
- Main UI is light-first, professional, and free of the old neon/grid/dashboard aesthetic.
- Mobile controls do not clip at 390px.
- Existing and new automated tests pass.
- Play Store capture contract describes the current UI.
