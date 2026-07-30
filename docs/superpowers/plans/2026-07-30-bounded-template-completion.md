# Bounded Template Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce ready-to-use template documents from sparse input while allowing restrained narrative completion and preventing fabricated checkable facts.

**Architecture:** Add an explicit completion policy to each template and make the instruction builder emit either a bounded-narrative or source-faithful contract. Track whether autofilled date/time fields were manually edited and send that provenance through the existing multipart request. Mirror the policy in the server’s final directive and add deterministic output cleanup for literal HTML breaks.

**Tech Stack:** React state, JavaScript ES modules, Express multipart requests, Node test runner.

## Global Constraints

- Manual user input outranks attachment evidence.
- Clearly supported attachment date/time outranks untouched application autofill.
- Untouched application date/time is the fallback when the attachment has no clear value.
- General assumptions may blend into narrative without an assumption label.
- Names, organisations, counts, money, percentages, deadlines, quotations, decisions, ownership, completion claims, and technical findings may not be invented.
- Finished documents must not contain “Belum tersedia”, “Not provided”, dotted fill-in lines, brackets, literal `<br>`, empty headings, or template/app commentary.
- Summary, translation, extraction, diagram, and image-prompt transformations remain source-faithful.

---

### Task 1: Encode the two completion policies

**Files:**
- Modify: `src/workTemplateDefinitions.js`
- Modify: `src/workTemplates.js`
- Test: `test/work-templates.test.js`

**Interfaces:**
- Consumes: existing `WORK_TEMPLATES` objects and `buildTemplateInstruction(options)`.
- Produces: `template.completionPolicy` with values `"bounded"` or `"source-faithful"` and policy-specific instruction text.

- [ ] **Step 1: Write failing contract tests**

Add tests that assert:

```js
test("narrative templates use bounded completion without risky claims or edit markers", () => {
  const instruction = buildTemplateInstruction({
    template: getTemplate("activity-report"),
    language: "id",
    values: completeValues(getTemplate("activity-report")),
  });
  assert.match(instruction, /asumsi operasional umum/i);
  assert.match(instruction, /langsung menyatu/i);
  assert.match(instruction, /jangan mengarang.*jumlah.*keputusan/is);
  assert.match(instruction, /jangan.*Belum tersedia/i);
  assert.doesNotMatch(instruction, /peserta mengikuti hingga selesai/i);
});

test("source-faithful templates prohibit narrative expansion", () => {
  for (const id of ["summary", "translate", "recap-sheet", "action-items",
    "attendance-list", "table-extract", "diagram", "image-prompt"]) {
    const template = getTemplate(id);
    assert.equal(template.completionPolicy, "source-faithful");
    const instruction = buildTemplateInstruction({ template, language: "id", values: {} });
    assert.match(instruction, /terkunci pada sumber/i);
    assert.doesNotMatch(instruction, /BOLEH menambahkan konteks dan asumsi/i);
  }
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/work-templates.test.js`

Expected: the new policy assertions fail because all non-prompt templates currently receive the same assumption stance.

- [ ] **Step 3: Implement the policy metadata and directives**

Set `completionPolicy: "source-faithful"` on the eight transformation templates. Replace the current shared stance with:

```js
const COMPLETION_STANCE = {
  bounded: {
    id: `...asumsi operasional umum...langsung menyatu...`,
    en: `...general operational assumptions...blend directly...`,
  },
  "source-faithful": {
    id: `TRANSFORMASI TERKUNCI PADA SUMBER...`,
    en: `SOURCE-LOCKED TRANSFORMATION...`,
  },
};
```

Select the stance using `template.completionPolicy || "bounded"` and remove examples that assert attendance, completion, enthusiasm, decisions, or measurable results.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `node --test test/work-templates.test.js`

Expected: all template contract tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/workTemplateDefinitions.js src/workTemplates.js test/work-templates.test.js
git commit -m "feat: bound assumptions in template contracts"
```

### Task 2: Make autofilled date/time true fallbacks

**Files:**
- Modify: `src/ui/Shell.jsx`
- Modify: `src/main.jsx`
- Modify: `server/index.js`
- Modify: `src/workTemplates.js`
- Test: `test/work-templates.test.js`
- Test: `test/run-template-mode.test.js`

**Interfaces:**
- Consumes: `buildTemplateInstruction({ template, values, editedFields })`.
- Produces: multipart field `editedFields: string[]`; instruction sections `DATA DARI PENGGUNA` and `FALLBACK WAKTU APLIKASI`.

- [ ] **Step 1: Write failing provenance tests**

```js
test("untouched autofilled date and time are attachment-aware fallbacks", () => {
  const template = getTemplate("meeting-minutes");
  const values = defaultFieldValues(template, new Date(2026, 6, 30, 9, 45));
  const instruction = buildTemplateInstruction({ template, values, editedFields: [] });
  assert.match(instruction, /FALLBACK WAKTU APLIKASI/);
  assert.match(instruction, /2026-07-30/);
  assert.match(instruction, /09:45/);
  assert.match(instruction, /lampiran.*terbaca jelas.*utamakan/is);
});

test("manually edited autofill is authoritative", () => {
  const template = getTemplate("meeting-minutes");
  const values = { ...defaultFieldValues(template), date: "2026-08-17" };
  const instruction = buildTemplateInstruction({
    template,
    values,
    editedFields: ["date"],
  });
  assert.match(instruction, /DATA DARI PENGGUNA[\s\S]*2026-08-17/);
});
```

Add source-contract assertions that `Shell.jsx` marks edited field IDs, `main.jsx` appends `editedFields`, and `server/index.js` parses and passes them.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/work-templates.test.js test/run-template-mode.test.js`

Expected: fallback and multipart provenance assertions fail because provenance is not currently carried.

- [ ] **Step 3: Implement field provenance**

In `Shell.jsx`, add `templateEditedFields` state, reset it when picking/leaving a template, mark IDs in `setTemplateValue`, and call:

```js
await runTemplate?.(activeTemplate, templateValues, lang, templateEditedFields);
```

In `main.jsx`, accept the fourth argument and append:

```js
formData.append("editedFields", JSON.stringify(editedFields || []));
```

In `server/index.js`, parse `editedFields` and pass it into `buildTemplateInstruction`.

In `workTemplates.js`, partition non-empty fields:

```js
const isFallback =
  Boolean(field.autofill) && !new Set(editedFields).has(field.id);
```

Authoritative values remain in `DATA DARI PENGGUNA`; untouched date/time values move to `FALLBACK WAKTU APLIKASI` with the instruction to prefer a clearly legible attachment value.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `node --test test/work-templates.test.js test/run-template-mode.test.js`

Expected: all provenance and existing template-mode tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Shell.jsx src/main.jsx server/index.js src/workTemplates.js test/work-templates.test.js test/run-template-mode.test.js
git commit -m "feat: treat app time as template fallback"
```

### Task 3: Align provider directives and output hygiene

**Files:**
- Modify: `server/index.js`
- Modify: `src/readyDocumentSanitize.js`
- Test: `test/run-output-sanitizer.test.js`
- Test: `test/ready-document-sanitize.test.js`
- Test: `test/run-template-mode.test.js`

**Interfaces:**
- Consumes: selected template and raw model output.
- Produces: `buildRunTemplateFinalDirective(template)` and cleaned Markdown line breaks.

- [ ] **Step 1: Write failing server and sanitizer tests**

```js
test("literal HTML breaks become Markdown line breaks", () => {
  assert.equal(
    sanitizeReadyDocument("Nama: Rina<br>NIK: 123", "report"),
    "Nama: Rina\nNIK: 123"
  );
});
```

Add a `sanitizeRunOutput` case for `<br>`, `<br/>`, and `<br />`. Add source assertions that the template final directive distinguishes bounded completion from source-faithful transformation and explicitly requires one output language.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/run-output-sanitizer.test.js test/ready-document-sanitize.test.js test/run-template-mode.test.js`

Expected: HTML breaks remain literal and the server still uses one static final directive.

- [ ] **Step 3: Implement dynamic final directives and cleanup**

Replace the static final template directive with:

```js
function buildRunTemplateFinalDirective(template, language = "id") {
  const sourceLocked = template?.completionPolicy === "source-faithful";
  // Return a final instruction that repeats either bounded completion or
  // source-locked transformation, bans edit markers, and requires one language.
}
```

Use this function when assembling `userText`. Convert case-insensitive `<br>`, `<br/>`, and `<br />` to `\n` in both sanitizers before whitespace compaction.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `node --test test/run-output-sanitizer.test.js test/ready-document-sanitize.test.js test/run-template-mode.test.js`

Expected: all targeted tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/index.js src/readyDocumentSanitize.js test/run-output-sanitizer.test.js test/ready-document-sanitize.test.js test/run-template-mode.test.js
git commit -m "fix: enforce template output hygiene"
```

### Task 4: Full regression and production verification

**Files:**
- Modify only if a regression reveals an in-scope defect.

**Interfaces:**
- Consumes: completed implementation.
- Produces: verified repository state and deployable production build.

- [ ] **Step 1: Run focused template/export tests**

Run:

```bash
node --test test/work-templates.test.js test/run-template-mode.test.js test/run-output-sanitizer.test.js test/ready-document-sanitize.test.js test/office-export.test.js test/office-export-edge.test.js test/pptx-layout.test.js test/xlsx-export.test.js
```

Expected: zero failures.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`

Expected: document any pre-existing Play Store asset failures separately; no new failure may originate from the changed template/runtime files.

- [ ] **Step 3: Build production**

Run: `npm run build`

Expected: exit code 0 and initial JS/CSS stay inside the configured budgets.

- [ ] **Step 4: Inspect the final diff**

Run:

```bash
git diff HEAD~3 --check
git status --short
```

Expected: no whitespace errors and only intentional changes.

- [ ] **Step 5: Record final implementation**

If verification required no follow-up code, no extra commit is needed. Otherwise commit only the verified corrective change with a scoped message.
