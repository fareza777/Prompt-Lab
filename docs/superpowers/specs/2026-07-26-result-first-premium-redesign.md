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

## Deliverable quality system

Generation uses a deliverable profile selected from the request, chosen output type, language, and attachment signals. It does not send every request through one generic outline. The profile controls the content contract, validation checks, and export renderer.

Every finished result must:

- answer the requested job rather than explain how to do it;
- use facts from the request and attachments without inventing names, dates, attendance, decisions, or statistics;
- label genuinely missing but necessary information as "Belum tersedia" / "Not provided", or omit the field when it is not essential;
- have a clear information hierarchy, descriptive headings, concise paragraphs, and useful tables where the information is naturally tabular;
- maintain consistent terminology, dates, names, numbering, and language;
- avoid generic filler, prompt language, meta commentary, and unsupported claims;
- end with a usable conclusion, decision record, action list, or next step appropriate to the document type.

Before a result is shown, a lightweight deterministic validator checks required sections, empty headings, repeated blocks, malformed tables, excessive heading depth, and obvious prompt leakage. AI self-review may improve content when capacity permits, but it cannot silently add unsupported facts.

### Report profile

A professional report normally includes:

1. title and document metadata;
2. executive summary;
3. background and purpose;
4. source or method;
5. findings organized by topic;
6. evidence, observations, or supporting tables;
7. conclusion;
8. prioritized recommendations or follow-up plan.

Sections that do not fit the user's request are omitted instead of filled with boilerplate. A report based on meeting photos distinguishes visible evidence, user-provided context, and assumptions.

### Meeting minutes profile

Meeting minutes normally include:

1. meeting identity: topic, date, time, place, organizer, and chair when available;
2. participants or represented groups when available;
3. agenda;
4. concise discussion summary by agenda item;
5. decisions;
6. action items in a table with owner, due date, and status only when supported;
7. unresolved points and next meeting or follow-up.

The system never infers participant names, official decisions, deadlines, or quotations merely from faces in a photo. Missing formal details remain visibly unconfirmed.

### Presentation profile

A presentation is written as a narrative deck rather than a document split across slides:

- opening slide with a specific title and subtitle;
- agenda or framing only when it helps the audience;
- one main message per slide;
- short slide titles that state the point;
- concise body copy, with a practical maximum of six bullets and roughly forty-five visible words per standard content slide;
- tables, charts, timelines, comparisons, or process diagrams selected from the actual material;
- closing slide with conclusion, decision, recommendation, or call to action;
- optional speaker notes hold supporting detail that should not crowd the slide.

The default deck length is inferred from the task. If no length is supplied, a focused professional deck targets 8–12 slides and may use fewer when the source is small.

### Other document profiles

- Proposal: context, problem, objectives, scope, approach, deliverables, timeline, responsibilities, assumptions, and commercial section only when requested.
- SOP: purpose, scope, roles, prerequisites, numbered procedure, controls, exceptions, records, and revision information.
- Analysis: executive finding, method, evidence, interpretation, limitations, and prioritized recommendations.
- General document: a restrained professional structure derived from the user's intent, never a fixed report template.

## Office rendering standards

Content quality and file quality are separate responsibilities. Structured output is converted into semantic blocks before Office rendering so headings, paragraphs, lists, tables, callouts, and slide sections are preserved.

### Word rendering

- A4 page size with professional margins and stable page breaks.
- A restrained AI Work Studio document theme with readable body type, clear heading levels, and one accent color.
- Title block or cover treatment appropriate to document length.
- Header/footer metadata and page numbering for multi-page documents.
- Proper Word lists and tables rather than text characters that merely resemble them.
- Consistent paragraph spacing, table cell padding, and keep-with-next behavior for headings.
- No duplicated title when the generated content already includes one.
- Long URLs, wide tables, and unbroken text are wrapped safely.

### PowerPoint rendering

- Widescreen 16:9 layout with a restrained light professional theme.
- Real title, section, content, comparison, timeline, data, and closing layouts instead of one repeated text box.
- Automatic content fitting that prefers splitting an overloaded slide over shrinking text below readable size.
- Consistent grid, safe margins, type scale, footer, and slide numbers.
- Meaningful source images may be reused when technically available and relevant; decorative placeholders are not invented.
- Tables and simple charts are rendered natively when structured data is available.
- Speaker notes and source notes remain separate from visible slide copy.

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
- Reports, meeting minutes, presentations, proposals, SOPs, and analyses select the correct deliverable profile.
- Missing facts in photo-based meeting minutes are not fabricated.
- The deterministic result validator catches prompt leakage, empty required sections, malformed tables, and excessive repetition.
- DOCX output contains semantic headings, lists, tables, margins, header/footer, and page numbering.
- PPTX output uses multiple appropriate layouts and splits overloaded slide content.
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
- Reports, meeting minutes, and presentations follow their own professional content contracts.
- DOCX and PPTX exports preserve hierarchy and render as polished Office documents, not plain text dumps.
- The main UI is light-first, professional, and free of the old neon/grid/dashboard aesthetic.
- Mobile controls do not clip at 390 px.
- Existing and new automated tests pass.
- Play Store copy and screenshots describe the shipped workflow.
