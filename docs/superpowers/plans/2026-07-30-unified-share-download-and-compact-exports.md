# Unified Share, PDF, and Compact Word Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every template accurate, consistent PDF/Word actions and substantially reduce photo-heavy report sizes.

**Architecture:** Add a focused PDF renderer beside the existing Office renderer, and share one image-preparation policy between PDF and DOCX. Keep template output declarations as the source of truth for visible actions, while the Android save sheet becomes a format-aware handoff rather than a technical warning.

**Tech Stack:** React 19, Express 5, Node test runner, docx, PDFKit, sharp, JSZip.

## Global Constraints

- Use “Silakan bagikan atau unduh laporan siap pakai.” instead of Android implementation details.
- PDF actions appear only when the active template declares `pdf`.
- Word actions appear only when the active template declares `docx`.
- Photographs use a maximum 1600-pixel long edge and JPEG quality 76 without enlargement.
- PDF is included on every plan that includes Word.
- Unreadable photographs never fail the whole export.

---

### Task 1: Export action and localization contract

**Files:**
- Modify: `test/reachable-engines.test.js`
- Modify: `test/plan-entitlements.test.js`
- Modify: `src/ui/Result.jsx`
- Modify: `src/ui/Shell.jsx`
- Modify: `src/ui/DiagramSaveSheet.jsx`
- Modify: `src/ui/i18n.js`
- Modify: `src/planEntitlements.js`

**Interfaces:**
- Consumes: `activeTemplate.outputs: string[]`, `PLAN_ENTITLEMENTS`
- Produces: `Result({ canExportPdf })`, `canExportFormat(plan, "pdf")`

- [ ] **Step 1: Write failing contract tests**

Add assertions that `Shell.jsx` gates PDF with `activeTemplate.outputs.includes("pdf")`, `Result.jsx` calls `onExport("pdf", output)`, both locales contain the approved neutral hint and distinct PDF/Word labels, and all plans permit `pdf`.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test test/reachable-engines.test.js test/plan-entitlements.test.js`

Expected: failures for the missing PDF entitlement, prop, action, and copy.

- [ ] **Step 3: Implement the minimal UI and entitlement changes**

Add `pdfExport: true` to each plan, map `pdf` in `canExportFormat`, pass `canExportPdf` from `Shell`, render “Bagikan / Ekspor PDF” before “Unduh Word”, and make the save-sheet labels format-aware without Android technical language.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test test/reachable-engines.test.js test/plan-entitlements.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add test/reachable-engines.test.js test/plan-entitlements.test.js src/ui/Result.jsx src/ui/Shell.jsx src/ui/DiagramSaveSheet.jsx src/ui/i18n.js src/planEntitlements.js
git commit -m "feat: unify pdf and word export actions"
```

### Task 2: Shared compact photograph preparation

**Files:**
- Create: `server/exportImages.js`
- Modify: `server/officeExport.js`
- Modify: `test/docx-photos.test.js`
- Create: `test/export-images.test.js`

**Interfaces:**
- Produces: `prepareExportImage(image, { maxEdge = 1600, quality = 76 }): Promise<{ buffer, type, width, height } | null>`
- Consumes: `{ dataUrl, slot?, name? }`

- [ ] **Step 1: Write failing image tests**

Create noisy JPEG fixtures and assert that `prepareExportImage` preserves aspect ratio, never exceeds 1600 pixels, returns JPEG for ordinary photographs, is materially smaller than PNG, and returns `null` for unreadable input. Update DOCX tests to require JPEG media.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test test/export-images.test.js test/docx-photos.test.js`

Expected: missing module and existing PNG media assertions fail.

- [ ] **Step 3: Implement shared image preparation**

Decode the data URL, auto-rotate, resize inside 1600 pixels without enlargement, strip metadata, encode ordinary photos with `jpeg({ quality: 76, mozjpeg: true })`, and return display dimensions fitted to the caller’s page width.

- [ ] **Step 4: Integrate it into DOCX**

Replace `prepareImage`’s PNG pipeline with `prepareExportImage`; pass `type: "jpg"` to `ImageRun` and retain the existing before/after and stacked documentation layouts.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test test/export-images.test.js test/docx-photos.test.js`

Expected: all tests pass and the size assertion is below its fixture limit.

- [ ] **Step 6: Commit**

```bash
git add server/exportImages.js server/officeExport.js test/export-images.test.js test/docx-photos.test.js
git commit -m "perf: compress report photographs"
```

### Task 3: Real PDF renderer and route

**Files:**
- Create: `server/pdfExport.js`
- Modify: `server/index.js`
- Modify: `src/apiUserMessages.js`
- Modify: `src/main.jsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `test/pdf-export.test.js`

**Interfaces:**
- Produces: `buildPdfBuffer({ title, content, language, plan, images }): Promise<Buffer>`
- Exposes: `POST /api/export/pdf`
- Consumes: `prepareExportImage` from Task 2 and the existing normalized export payload.

- [ ] **Step 1: Add PDFKit and write failing renderer tests**

Install `pdfkit`, then test that `buildPdfBuffer` starts with `%PDF-`, contains multiple pages for long content, embeds compact JPEG documentation, tolerates bad images, and produces a multi-photo fixture below 1.5 MB.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test test/pdf-export.test.js`

Expected: failure because `server/pdfExport.js` and `buildPdfBuffer` do not exist.

- [ ] **Step 3: Implement the PDF renderer**

Render a restrained A4 report with title metadata, date, headings, paragraphs, bullet/numbered lists, simple tables, page breaks, footer/page numbers, and documentation photographs. Use the shared image preparation policy and buffer the PDF stream.

- [ ] **Step 4: Add the authenticated route and client payload**

Add `/api/export/pdf` with the same 12 MB JSON limit and entitlement pattern as DOCX. Include photographs for both `docx` and `pdf` in `src/main.jsx`, return `application/pdf`, and add a localized failure message.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test test/pdf-export.test.js test/docx-photos.test.js test/plan-entitlements.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json server/pdfExport.js server/index.js src/apiUserMessages.js src/main.jsx test/pdf-export.test.js
git commit -m "feat: export finished reports as pdf"
```

### Task 4: Cross-template and visual verification

**Files:**
- Modify only if a verification failure reveals a defect in files above.
- Generate temporary verification artifacts outside tracked source.

**Interfaces:**
- Consumes: all export actions and renderers from Tasks 1–3.
- Produces: verification evidence, not a new public API.

- [ ] **Step 1: Verify every built-in template action set**

Run a test that maps all built-in templates to their declared formats and confirms no PDF/Word action leaks to a template that does not declare it.

- [ ] **Step 2: Generate representative artifacts**

Generate Indonesian Site Visit DOCX/PDF with several noisy landscape and portrait photographs, plus one text-only minutes report.

- [ ] **Step 3: Inspect structure and size**

Check DOCX media entries and PDF metadata/page count. Record the sample byte sizes and ensure the photo-heavy PDF is below 1.5 MB.

- [ ] **Step 4: Render and visually inspect**

Use the workspace document/PDF rendering tools when available. Inspect page hierarchy, wrapping, table boundaries, photo proportions, captions, and footer placement.

- [ ] **Step 5: Run repository verification**

Run: `npm test`

Expected: all non-environmental tests pass; report any known Play Store asset failures separately if they remain external to this change.

- [ ] **Step 6: Review the diff and commit fixes**

Run: `git diff --check` and `git status --short`.

Commit only verified corrective changes with a scoped message.
