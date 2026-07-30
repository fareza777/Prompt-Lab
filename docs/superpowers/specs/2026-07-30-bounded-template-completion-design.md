# Bounded Template Completion

## Objective

Make every template produce a document that is ready to use even when the user provides only a photo and a short note. The model may complete ordinary professional narrative with restrained, plausible context, but it must not invent checkable facts that could make the document materially false.

## Source Precedence

1. A value manually entered or edited by the user.
2. A fact clearly legible or visually supported by an attachment.
3. The application input timestamp for missing date and time fields.
4. Neutral operational context used only to connect supported facts into complete prose.

Autofilled date and time values are fallbacks, not stronger evidence than a clearly legible date or time in an attachment. Other supplied fields remain authoritative.

## Bounded Assumptions

The model may blend general assumptions directly into the finished prose without an assumption label. Safe completion includes neutral transitions, ordinary coordination, a generic opening and closing, a general statement that the activity followed its intended purpose, and non-specific follow-up language.

The model must not infer or invent:

- personal names, job titles, organisations, addresses, or identifiers;
- attendance counts, quantities, money, percentages, durations, deadlines, or performance figures;
- quotations, decisions, approvals, commitments, ownership, or completion status;
- technical condition, inspection results, compliance, document availability, or evidence that is not visible;
- universal claims such as everyone attended, stayed to the end, agreed, completed a task, or showed enthusiasm.

When a non-essential fact is missing, the model should omit the field, merge it into a more general sentence, or use a role-neutral construction. It must not print “Belum tersedia”, “Not provided”, dotted fill-in lines, brackets, or other editing placeholders in a finished document.

## Template Modes

### Narrative completion

Reports, minutes, official records, letters, captions, presentations, and before/after documents use bounded completion. They may add neutral connective prose within the rules above.

### Source-faithful transformation

Summaries, translations, table extraction, attendance extraction, action extraction, recap sheets, diagrams, and image prompts remain source-faithful. They may improve structure and wording but may not add content absent from the source.

Translations must preserve the source document type and translate only the supplied content. A translation may not become minutes, a summary, or a newly authored reply.

## Date and Time

Date and time fields continue to be autofilled by the application. The prompt identifies those values as fallbacks:

- if an attachment clearly contains the relevant event date or time, use it;
- otherwise use the application-provided fallback;
- if the user manually changes an autofilled value, treat the edited value as authoritative.

The UI must retain provenance for autofilled values so the runtime can distinguish untouched defaults from manual edits.

## Output Hygiene

All generated documents must:

- use only the selected output language, except unavoidable proper nouns;
- avoid literal HTML such as `<br>`;
- avoid AI/template/app commentary;
- omit empty headings and empty table rows;
- remain concise enough that general filler does not dominate the supplied facts;
- retain the requested document type and required useful sections.

## Components

1. Template field state records whether an autofilled value is untouched or manually edited.
2. The template instruction builder separates authoritative facts from temporal fallbacks.
3. The shared writing stance defines bounded assumptions and bans placeholders.
4. Source-faithful templates receive an explicit no-expansion rule that overrides the shared narrative stance.
5. The server template-mode system and final directives mirror the same policy so provider-level instructions do not conflict.
6. Output sanitisation removes accidental literal break tags without altering valid Markdown.

## Testing

Regression tests will verify:

- manual values remain authoritative;
- untouched autofilled date/time values are labelled as fallbacks;
- the prompt tells the model to prefer a clearly supported attachment date/time;
- narrative templates allow neutral completion but prohibit checkable invented facts;
- finished documents prohibit placeholders;
- source-faithful templates prohibit expansion;
- translation preserves document type and returns only a translation;
- the server system/final directives use the same bounded-completion policy;
- literal `<br>` tags are converted to clean line breaks;
- existing template, export, and production build tests remain green.

## Acceptance Criteria

- A sparse activity input can yield a complete, professional report without visible gaps.
- Missing event date/time resolves to the application input timestamp unless the attachment supplies a clear value.
- No output fabricates names, figures, decisions, attendance claims, or measurable outcomes.
- Summary, translation, extraction, diagram, and prompt templates do not invent additional source content.
- Office exports contain no literal `<br>` artifacts.
- Automated regression tests and the production build pass.
