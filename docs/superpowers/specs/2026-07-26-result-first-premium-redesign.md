# AI Work Studio result-first product design

## Decision

The product becomes **AI Work Studio**, a result-first assistant that turns notes, photos, and files into finished work. The default flow creates the deliverable directly. Generated prompts are implementation details and are not shown in the normal user journey.

The redesign preserves the live Android application identity, existing user data, authentication, billing products, generation engine, attachments, history, and technical storage keys. This is a product and presentation rename, not a new Play Store application.

## Naming and release identity

- Visible product name: **AI Work Studio**.
- Recommended Play Store title: **AI Work Studio: Documents**.
- Indonesian descriptor: "Dokumen kerja siap pakai dari catatan, foto, dan file."
- English descriptor: "Finished work documents from notes, photos, and files."
- Do not use "PromptLab" in reader-facing navigation, onboarding, marketing, result, quota, account, or export copy.
- Do not rename the Android package `app.promptlab.twa`, billing product IDs, database fields, RPC names, or existing local-storage keys. These identifiers are invisible compatibility contracts.
- A Play Store listing title change can be published independently. A launcher-label change ships in a new AAB using the same package and signing identity.

The name "Document AI Studio" is not used because "Document AI" is an established Google Cloud product name and the phrase is too close to existing document-AI products. "AI Work Studio" also leaves room for reports, presentations, content, analysis, and code.

## Chosen product approach

Three approaches were considered:

1. **Result-first work studio — chosen.** One request produces the finished output. Internal prompt generation is invisible.
2. **Result-first with a prompt disclosure.** Rejected for the main experience because it keeps obsolete product language and invites users to focus on machinery instead of their work.
3. **Dual prompt/result mode.** Rejected because it adds an expert decision before the user receives value.

## Product promise

Primary Indonesian promise:

> Bahan mentah masuk. Dokumen kerja siap dipakai.

Primary English promise:

> Turn raw material into finished work.

AI Work Studio is not presented as generic chat or a prompt builder. It is a focused production tool with structured deliverables, file and photo context, reusable history, and direct export.

## Primary workflow

1. The user opens directly on the work canvas after a lightweight language choice.
2. The user describes the desired result or attaches source material, such as photos from a community meeting.
3. Optional advanced controls specify deliverable type, field, tone, and target model without mentioning prompts.
4. The primary action, "Buat hasil" / "Create result", internally prepares and executes the instruction in one continuous operation.
5. The result surface shows only the finished output.
6. The user can improve, save, copy, report, or export that output.
7. A report created from meeting photos can be exported directly to Word without reconstructing the request.

The old multi-screen onboarding tour remains removed. Any first-use assistance is compact, dismissible, and cannot block the canvas.

## Content model

The implementation keeps three technical values separate:

- `request`: the user's original narrative and attachment references;
- `prompt`: the internal structured instruction;
- `output`: the finished content shown to the user.

Only `request` and `output` are reader-facing. Internal `prompt` data may remain in persistence and diagnostics for backward compatibility, but it is not exposed as a product feature.

Saved history items require an explicit `contentType`. Opening an output item restores it as an output. Report, copy, save, export, and improve actions receive the current named content explicitly.

Backward compatibility:

- Existing history items without `contentType` remain readable and are handled defensively.
- Existing data fields are not destructively migrated.
- Existing technical identifiers remain valid.

## Free plan and quota

- Free users receive **5 completed result requests per week**.
- The weekly period resets every Monday in the user's displayed locale; server enforcement uses a single documented UTC boundary to avoid inconsistent counting.
- A request counts only after a generation operation is accepted for execution. Internal prompt construction is never charged as a second request.
- Retry after a provider or server failure does not consume another request when no usable output was delivered.
- Signed-in Free accounts are enforced server-side from durable usage events.
- Guest use is limited per device as a convenience trial and is clearly described as device-local, not a security boundary.
- Pro and Business retain their existing commercial quota model unless a later pricing decision changes it.
- The interface shows remaining Free requests and the reset date before the user reaches zero.
- At zero remaining requests, the composer content and attachments remain intact and the upgrade surface explains the next reset date.

## Export entitlement

- Direct `.docx` export is available on Free, Pro, and Business.
- Free Word documents contain the complete generated result; they are not artificially truncated.
- A restrained AI Work Studio footer or document metadata may identify the source application on Free exports. It must not obstruct the document or use the old name.
- Premium differentiation remains in higher request capacity, advanced formats and features, and existing paid capabilities.
- PPTX and other currently paid export entitlements remain unchanged unless separately approved.
- Export does not consume an additional result request.
- Word export is offered from the visible result surface and from eligible saved output history.

## Error and fallback behavior

- Preparation failure: explain that the work could not be prepared and offer retry without mentioning prompt generation.
- Execution failure: preserve the request and attachments, offer retry, and do not expose the internal prompt.
- Local fallback provenance states that a local template was used; it does not claim remote AI generation.
- Partial or timed-out output remains visible and can be copied or retried.
- Failed save, export, report, or upgrade actions remain scoped to the initiating control.
- A failed generation that produced no usable output is reconciled so it does not permanently reduce the weekly allowance.

## Visual direction

Archetype: editorial luxury with soft structuralism.

- Light-first warm ivory background; no dark default.
- Graphite text and one restrained forest-green accent.
- Deep espresso is used sparingly for the primary action, never as a page background.
- Display typography has editorial character; body typography remains highly legible.
- Large whitespace and an asymmetric desktop composition place concise guidance beside the work surface.
- Mobile collapses to one column with the composer and result taking priority.
- Major surfaces use a quiet outer tray and a clean inner paper surface.
- Shadows are broad, warm, and diffused. No neon, glass dashboard, cyan grid, or generic AI gradient.
- Controls use concentric radii and restrained interaction feedback.
- Motion uses transform and opacity, respects reduced motion, and never delays the result.

## Main screen composition

### Header

- Floating, contained header rather than a full-width dark bar.
- AI Work Studio wordmark plus a concise outcome-oriented descriptor.
- Guide, History, and Account remain icon actions with accessible labels.

### Intro

- Small eyebrow: "AI work studio".
- Headline: "Bahan mentah masuk. Dokumen kerja siap dipakai."
- One concise supporting sentence.
- Free allowance appears as quiet metadata, not as an alarming banner.

### Composer

- Large paper-like work surface.
- Clear label: "Apa yang ingin kamu hasilkan?"
- Attachment control integrated into the lower action rail.
- Primary action: "Buat hasil".
- Advanced controls remain collapsed and use full-width mobile fields.

### Starters

- Show at most three outcome-led starters on the initial screen.
- Examples describe finished documents, not prompt categories.
- "Lihat contoh lain" opens the existing searchable starter sheet.

### Result

- Finished output is the hero surface.
- No prompt tab, prompt disclosure, prompt comparison, or prompt-specific action appears.
- Primary actions are output-specific, including "Export Word".
- Loading uses a document-shaped skeleton and elapsed-time copy.

## Accessibility

- The light palette meets WCAG AA for visible normal text.
- Preserve the skip link, native controls, focus trap and return, Escape behavior, live regions, and reduced motion.
- Language selection remains keyboard accessible.
- Quota is communicated in text, not color alone.
- Physical Android verification includes TalkBack, 200% font scaling, keyboard traversal where supported, and safe-area behavior.

## Release parity

- Replace outdated Play Store screenshots with the result-first light interface.
- Rewrite capture selectors and tests away from obsolete navigation.
- Update listing copy only after the shipped UI, screenshots, and tests describe the same workflow.
- Keep the package name and signing identity unchanged so existing installs receive the update normally.

## Testing strategy

Behavior tests are written before production changes and prove:

- One generate action performs internal preparation and execution, then surfaces only output.
- Reader-facing copy contains neither "PromptLab" nor prompt-builder language.
- Output actions receive output content explicitly.
- History preserves `contentType` and safely reads legacy items.
- Free Word export is available and receives the complete output.
- Free usage allows five accepted result requests in a weekly window and rejects the sixth.
- A new weekly window restores the Free allowance.
- Failed runs without usable output do not permanently consume allowance.
- Paid-plan quota behavior remains unchanged.
- First run reaches the canvas immediately after language choice.
- Play Store capture tests target the active light interface.

Visual verification covers a 390×844 mobile viewport and a representative desktop viewport, including reduced motion and long Indonesian and English labels.

## Out of scope

- Replacing the AI provider stack.
- Rebuilding authentication, billing, Supabase, or the Android wrapper.
- Adding chat, autonomous agents, collaboration, or unrelated tools.
- Renaming the Android package or existing billing product IDs.
- Changing paid plan prices.

## Acceptance criteria

- The visible product is named AI Work Studio, with no PromptLab branding in the user journey.
- One primary request produces the finished result without a second user action.
- The generated prompt is not displayed as a feature.
- Save, History, Report, Improve, Copy, and Export act on explicit output content.
- Free users can make five result requests per week and export complete results to Word.
- The main UI is light-first, professional, and free of the old neon/grid/dashboard aesthetic.
- Mobile controls do not clip at 390 px.
- Existing and new automated tests pass.
- Play Store copy and screenshots describe the shipped workflow.
