# AI Work Studio Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship AI Work Studio as a result-first product with professional deliverable profiles, polished Word/PowerPoint exports, Free Word export, and a server-enforced five-results-per-week Free allowance.

**Architecture:** Keep the existing React/Express/Supabase flow and compatibility identifiers, but extract three focused modules: deliverable profiles and validation, semantic Office rendering, and weekly Free usage enforcement. The UI continues to construct and execute instructions internally, but only request and finished output remain visible.

**Tech Stack:** React 19, Vite 8, Express 5, Node test runner, Supabase/PostgreSQL, `docx` 9, `pptxgenjs` 4, Playwright, Android Trusted Web Activity.

## Global Constraints

- Visible product name is `AI Work Studio`.
- Recommended Play Store title is `AI Work Studio: Documents`.
- Reader-facing copy must not contain `PromptLab` or prompt-builder language.
- Android package `app.promptlab.twa`, billing product IDs, database field names, RPC names, and existing local-storage keys stay unchanged.
- Free users receive exactly 5 accepted finished-result requests per ISO week; export does not consume a request.
- DOCX export is enabled for Free, Pro, and Business; PPTX entitlement remains paid.
- The generated prompt is never shown as a reader-facing feature.
- Missing facts from photos and attachments must not be fabricated.
- Existing user data and legacy history remain readable.
- Existing unrelated untracked files, including `DESIGN-IS-2026-07-26/`, must not be staged.

---

### Task 1: Result-First Branding and Prompt Removal

**Files:**
- Modify: `src/ui/Result.jsx`
- Modify: `src/ui/Shell.jsx`
- Modify: `src/ui/i18n.js`
- Modify: `src/LandingPage.jsx`
- Modify: `src/aboutApp.js`
- Modify: `src/main.jsx`
- Test: `test/result-first-flow.test.js`
- Test: `test/ui-release-contract.test.js`
- Test: `test/landing-claims.test.js`
- Test: `test/about-app.test.js`

**Interfaces:**
- Consumes: existing `Result` props and `createContentActionPayload("output", output)`.
- Produces: a `Result` surface whose actions operate only on `runOutput`; no prompt disclosure or prompt action is rendered.

- [ ] **Step 1: Write failing reader-facing branding tests**

```js
test("reader-facing source uses AI Work Studio and hides prompt features", () => {
  const result = read("src/ui/Result.jsx");
  const copy = [
    read("src/ui/i18n.js"),
    read("src/LandingPage.jsx"),
    read("src/aboutApp.js"),
  ].join("\n");
  assert.doesNotMatch(result, /viewPrompt|promptOpen|copyPrompt|improvePrompt|comparePrompt/);
  assert.match(copy, /AI Work Studio/);
  assert.doesNotMatch(copy, /PromptLab|prompt builder|build better prompts/i);
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test test/result-first-flow.test.js test/ui-release-contract.test.js test/landing-claims.test.js test/about-app.test.js`

Expected: FAIL because the prompt disclosure and old visible branding still exist.

- [ ] **Step 3: Remove prompt disclosure and rename visible copy**

Delete `promptOpen`, readiness/prompt markup, prompt copy/improve/compare buttons, and prompt-only icons from `Result.jsx`. Keep the internal `prompt` value only where the execution pipeline needs it. Replace reader-facing product strings with `AI Work Studio`, and replace prompt-centric benefits with finished-work language.

```jsx
<article className="pl-doc pl-doc--output" aria-live="polite">
  {output}
</article>
```

Use compatibility-safe fallback names:

```js
const exportTitle = titleSeed.trim().split(/\s+/).slice(0, 10).join(" ") || "AI Work Studio Export";
link.download = `ai-work-studio.${format}`;
```

- [ ] **Step 4: Run the focused tests**

Run: `node --test test/result-first-flow.test.js test/ui-release-contract.test.js test/landing-claims.test.js test/about-app.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Result.jsx src/ui/Shell.jsx src/ui/i18n.js src/LandingPage.jsx src/aboutApp.js src/main.jsx test/result-first-flow.test.js test/ui-release-contract.test.js test/landing-claims.test.js test/about-app.test.js
git commit -m "feat: rename product to AI Work Studio"
```

### Task 2: Deliverable Profiles and Output Validation

**Files:**
- Create: `src/deliverableProfiles.js`
- Modify: `src/main.jsx`
- Modify: `server/index.js`
- Test: `test/deliverable-profiles.test.js`
- Test: `test/run-output-sanitizer.test.js`

**Interfaces:**
- Produces: `detectDeliverableProfile({ narrative, outputType, content }) -> "report" | "minutes" | "presentation" | "proposal" | "sop" | "analysis" | "general"`.
- Produces: `buildDeliverableInstruction(input) -> string`.
- Produces: `validateFinishedOutput(content, profile) -> { content: string, warnings: string[], valid: boolean }`.
- Consumes: request narrative, selected output type, attachment manifest, and returned output.

- [ ] **Step 1: Write failing profile and validator tests**

```js
test("meeting photos select minutes with an anti-fabrication contract", () => {
  const profile = detectDeliverableProfile({
    narrative: "Buat notulen dari foto rapat sosialisasi di kelurahan",
    outputType: "Word Document",
  });
  assert.equal(profile, "minutes");
  const instruction = buildDeliverableInstruction({ profile, language: "id" });
  assert.match(instruction, /Agenda/);
  assert.match(instruction, /Keputusan/);
  assert.match(instruction, /jangan mengarang/i);
});

test("validator removes leaked prompt wrapper and detects malformed output", () => {
  const checked = validateFinishedOutput(
    "Here is the prompt:\\n# Laporan\\n\\n# Laporan\\n\\n## Temuan\\n",
    "report",
  );
  assert.doesNotMatch(checked.content, /Here is the prompt/i);
  assert.ok(checked.warnings.includes("repeated_heading"));
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/deliverable-profiles.test.js test/run-output-sanitizer.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement deterministic profile detection**

```js
const PROFILE_SIGNALS = [
  ["minutes", /\b(notulen|minutes of meeting|meeting minutes|berita acara rapat)\b/i],
  ["presentation", /\b(ppt|powerpoint|presentasi|slide deck|slides)\b/i],
  ["sop", /\b(sop|standard operating procedure|prosedur operasional)\b/i],
  ["proposal", /\b(proposal|usulan kegiatan|project proposal)\b/i],
  ["analysis", /\b(analisis|analysis|audit|kajian)\b/i],
  ["report", /\b(laporan|report|reporting)\b/i],
];

export function detectDeliverableProfile(input = {}) {
  const haystack = `${input.narrative || ""} ${input.outputType || ""} ${input.content || ""}`;
  return PROFILE_SIGNALS.find(([, pattern]) => pattern.test(haystack))?.[0] || "general";
}
```

Implement bilingual instruction contracts matching the approved spec. Presentation instructions cap standard slide copy; minutes instructions prohibit inferred names, decisions, dates, and quotations; report instructions distinguish evidence and assumptions.

- [ ] **Step 4: Implement finished-output validation**

Normalize code fences and meta introductions, preserve useful Markdown, record repeated/empty headings and malformed table warnings, and never synthesize missing facts.

```js
export function validateFinishedOutput(content = "", profile = "general") {
  const warnings = [];
  let cleaned = String(content).trim()
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^(?:Here is|Berikut adalah).{0,40}(?:prompt|instruksi).*?\n+/i, "");
  // collect deterministic structural warnings without rewriting factual content
  return { content: cleaned, warnings, valid: cleaned.length > 0 };
}
```

- [ ] **Step 5: Integrate profiles into preparation and execution**

Append `buildDeliverableInstruction` to the internally generated instruction in `src/main.jsx` and server-side prompt construction. Run `validateFinishedOutput` immediately before setting `runOutput`, and expose warnings only as quiet quality metadata.

- [ ] **Step 6: Run focused and generation regression tests**

Run: `node --test test/deliverable-profiles.test.js test/run-output-sanitizer.test.js test/result-first-flow.test.js test/prompt-quality.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/deliverableProfiles.js src/main.jsx server/index.js test/deliverable-profiles.test.js test/run-output-sanitizer.test.js
git commit -m "feat: add professional deliverable profiles"
```

### Task 3: Semantic Office Export and Free Word Entitlement

**Files:**
- Create: `server/officeExport.js`
- Modify: `server/index.js`
- Modify: `src/planEntitlements.js`
- Test: `test/office-export.test.js`
- Test: `test/plan-entitlements.test.js`

**Interfaces:**
- Produces: `parseStructuredContent(content) -> Block[]`, where `Block` is a heading, paragraph, list, table, or divider.
- Produces: `buildDocxBuffer({ title, content, language, plan }) -> Promise<Buffer>`.
- Produces: `buildPptxBuffer({ title, content, language }) -> Promise<Buffer>`.
- Consumes: normalized export payload `{ title, content, language, profile }`.

- [ ] **Step 1: Write failing entitlement and Office-structure tests**

```js
test("Free can export DOCX but not PPTX", () => {
  assert.equal(canExportFormat("Free", "docx"), true);
  assert.equal(canExportFormat("Free", "pptx"), false);
});

test("semantic parser retains headings, bullets, and markdown tables", () => {
  const blocks = parseStructuredContent("# Laporan\\n\\n- Satu\\n\\n| PIC | Aksi |\\n|---|---|\\n| Sari | Survei |");
  assert.deepEqual(blocks.map((block) => block.type), ["heading", "list", "table"]);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/office-export.test.js test/plan-entitlements.test.js`

Expected: FAIL because Free DOCX is disabled and the renderer module is missing.

- [ ] **Step 3: Implement semantic Markdown parsing**

Parse ATX headings, paragraphs, ordered/unordered lists, Markdown tables, and horizontal rules into bounded block objects. Strip the first heading when it duplicates the explicit export title.

```js
export function parseStructuredContent(content = "", title = "") {
  return tokenizeLines(String(content).split(/\r?\n/), title).slice(0, 1000);
}
```

- [ ] **Step 4: Implement polished DOCX rendering**

Use A4 dimensions, 2.2 cm margins, Aptos typography, theme colors, semantic heading styles, native numbering/bullets, bordered tables, page footer, and page numbers. Add a restrained `Created with AI Work Studio` footer for Free only.

```js
const section = {
  properties: {
    page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 1247, right: 1247, bottom: 1247, left: 1247 },
    },
  },
  headers: { default: buildHeader(title) },
  footers: { default: buildFooter(plan) },
  children: blocksToDocx(blocks),
};
```

- [ ] **Step 5: Implement professional PPTX rendering**

Set a light 16:9 theme and build title, section, standard content, comparison/table, and closing layouts. Split bodies exceeding six bullets or forty-five visible words into continuation slides instead of shrinking below 18 pt.

```js
const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "AI Work Studio";
pptx.company = "AI Work Studio";
pptx.lang = language === "en" ? "en-US" : "id-ID";
```

- [ ] **Step 6: Wire export endpoints and enable Free Word**

Replace renderer helpers in `server/index.js` with `buildDocxBuffer` and `buildPptxBuffer`. Set `PLAN_ENTITLEMENTS.Free.docxExport = true`; retain `Free.pptxExport = false`. Update marketing copy to `5 results/week` and `Word export included`.

- [ ] **Step 7: Inspect generated packages in tests**

Use `JSZip.loadAsync(buffer)` to assert `word/document.xml`, `word/footer1.xml`, `ppt/presentation.xml`, and multiple slide XML files exist and contain `AI Work Studio` without `PromptLab`.

- [ ] **Step 8: Run focused tests**

Run: `node --test test/office-export.test.js test/plan-entitlements.test.js test/run-prompt.test.js`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add server/officeExport.js server/index.js src/planEntitlements.js test/office-export.test.js test/plan-entitlements.test.js test/run-prompt.test.js
git commit -m "feat: ship polished Office exports"
```

### Task 4: Server-Enforced Five-Results-Per-Week Free Allowance

**Files:**
- Create: `server/weeklyResultQuota.js`
- Create: `supabase/phase-14-free-weekly-results.sql`
- Modify: `server/index.js`
- Modify: `server/quotaReservation.js`
- Test: `test/weekly-result-quota.test.js`
- Test: `test/quota-reservation.test.js`

**Interfaces:**
- Produces: `getIsoWeekWindow(date) -> { startsAt: Date, endsAt: Date }`.
- Produces: `reserveWeeklyFreeResult(client, { userId, idempotencyKey }) -> { ok, remaining, resetAt, reason }`.
- Produces RPC: `reserve_promptlab_weekly_result(p_idempotency_key text)`.
- Consumes existing authenticated user and `usage_events` table.

- [ ] **Step 1: Write failing week-window and reservation tests**

```js
test("ISO week resets on Monday UTC", () => {
  const window = getIsoWeekWindow(new Date("2026-07-26T12:00:00Z"));
  assert.equal(window.startsAt.toISOString(), "2026-07-20T00:00:00.000Z");
  assert.equal(window.endsAt.toISOString(), "2026-07-27T00:00:00.000Z");
});

test("sixth Free result is rejected", async () => {
  const client = fakeRpc([{ ok: true, remaining: 0 }, { ok: false, remaining: 0 }]);
  assert.equal((await reserveWeeklyFreeResult(client, { userId: "u", idempotencyKey: "fifth" })).ok, true);
  assert.equal((await reserveWeeklyFreeResult(client, { userId: "u", idempotencyKey: "sixth" })).reason, "weekly_limit");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/weekly-result-quota.test.js test/quota-reservation.test.js`

Expected: FAIL because weekly reservation does not exist.

- [ ] **Step 3: Implement the atomic PostgreSQL RPC**

Create `reserve_promptlab_weekly_result(text)` as `security definer`, lock the caller's profile row, reuse an existing event with the same idempotency key, count only `event_type = 'finished_result'` since `date_trunc('week', now() at time zone 'UTC')`, reject count 5, and insert a zero-token `usage_events` row atomically.

```sql
select count(*) into v_used
from public.usage_events
where user_id = auth.uid()
  and event_type = 'finished_result'
  and created_at >= date_trunc('week', now() at time zone 'UTC');
```

The RPC returns `ok`, `remaining`, `reset_at`, and `reason`. Revoke execution from `public, anon`; grant to `authenticated`.

- [ ] **Step 4: Implement the server adapter**

Validate a 1–200 character idempotency key, call the RPC, normalize rows, and fail closed for signed Free accounts.

- [ ] **Step 5: Reserve once per user-visible result**

In the execution endpoint, reserve `finished_result` only for normalized plan `Free`, immediately before provider execution. Do not reserve in internal instruction generation, Office export, Improve, Compare, or retries that reuse the same result idempotency key.

- [ ] **Step 6: Return quota metadata**

Return:

```json
{
  "weeklyResults": {
    "limit": 5,
    "remaining": 4,
    "resetAt": "2026-07-27T00:00:00.000Z"
  }
}
```

Map exhaustion to HTTP 402 with code `FREE_WEEKLY_LIMIT` and preserve the request body on the client.

- [ ] **Step 7: Run focused tests**

Run: `node --test test/weekly-result-quota.test.js test/quota-reservation.test.js test/run-prompt.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/weeklyResultQuota.js server/quotaReservation.js server/index.js supabase/phase-14-free-weekly-results.sql test/weekly-result-quota.test.js test/quota-reservation.test.js test/run-prompt.test.js
git commit -m "feat: enforce Free weekly result limit"
```

### Task 5: Quota and Export Experience

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/ui/Shell.jsx`
- Modify: `src/ui/Composer.jsx`
- Modify: `src/ui/Account.jsx`
- Modify: `src/ui/History.jsx`
- Modify: `src/ui/i18n.js`
- Modify: `src/ui/shell.css`
- Test: `test/app-shell.test.js`
- Test: `test/content-record.test.js`
- Test: `test/ui-accessibility-behavior.test.js`

**Interfaces:**
- Consumes: `weeklyResults` response metadata and `entitlements.docxExport`.
- Produces: `weeklyAllowance = { limit, remaining, resetAt }` passed through `Shell` to composer/account.

- [ ] **Step 1: Write failing UI contract tests**

```js
test("Free UI advertises five weekly results and Word export", () => {
  const copy = read("src/ui/i18n.js");
  assert.match(copy, /5 hasil per minggu/);
  assert.match(copy, /Export Word/);
  assert.doesNotMatch(copy, /50k tokens|tanpa Office export/i);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/app-shell.test.js test/content-record.test.js test/ui-accessibility-behavior.test.js`

Expected: FAIL on old token/trial copy and missing weekly allowance.

- [ ] **Step 3: Replace the guest trial counter**

Keep the compatibility key `promptlab-trial-used`, but store `{ weekStart, used }`. Reset locally when `getIsoWeekWindow(now).startsAt` changes and cap guest use at five.

```js
{ weekStart: "2026-07-20", used: 2 }
```

- [ ] **Step 4: Show useful allowance state**

Display `3 dari 5 hasil gratis tersisa · reset Senin` / `3 of 5 free results left · resets Monday` as quiet metadata. At zero, retain composer text and attachments, disable only submission, and show the reset date plus upgrade action.

- [ ] **Step 5: Expose Word export consistently**

Show Word export on finished results and saved output history for all plans. Keep PowerPoint hidden or upgrade-gated for Free.

- [ ] **Step 6: Run UI tests**

Run: `node --test test/app-shell.test.js test/content-record.test.js test/ui-accessibility-behavior.test.js test/plan-entitlements.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main.jsx src/ui/Shell.jsx src/ui/Composer.jsx src/ui/Account.jsx src/ui/History.jsx src/ui/i18n.js src/ui/shell.css test/app-shell.test.js test/content-record.test.js test/ui-accessibility-behavior.test.js
git commit -m "feat: add weekly allowance and Free Word export UI"
```

### Task 6: Play Store, PWA, Android, SEO, and Release Copy

**Files:**
- Modify: `index.html`
- Modify: `public/manifest.webmanifest`
- Modify: `android-app/app/src/main/res/values/strings.xml`
- Modify: `android-app/twa-manifest.json`
- Modify: `scripts/check-playstore-readiness.mjs`
- Modify: `scripts/capture-playstore-screenshots.mjs`
- Modify: `scripts/generate-playstore-assets.mjs`
- Modify: `scripts/seo-routes.mjs`
- Modify: `public/privacy/index.html`
- Modify: `public/privacy/delete-account/index.html`
- Test: `test/playstore-listing.test.js`
- Test: `test/playstore-assets.test.js`
- Test: `test/seo-pages.test.js`

**Interfaces:**
- Consumes: visible brand `AI Work Studio`; preserves package `app.promptlab.twa`.
- Produces: release metadata and generated SEO output with no visible old brand.

- [ ] **Step 1: Write failing release-copy tests**

```js
test("release surfaces use AI Work Studio while package stays compatible", () => {
  assert.match(read("public/manifest.webmanifest"), /AI Work Studio/);
  assert.match(read("android-app/twa-manifest.json"), /app\.promptlab\.twa/);
  assert.doesNotMatch(readerFacingReleaseFiles(), />[^<]*PromptLab/i);
});
```

- [ ] **Step 2: Run release tests and verify failure**

Run: `node --test test/playstore-listing.test.js test/playstore-assets.test.js test/seo-pages.test.js`

Expected: FAIL on old title and prompt-centric listing copy.

- [ ] **Step 3: Update visible release metadata**

Set app/launcher label to `AI Work Studio`, recommended listing title to `AI Work Studio: Documents`, and descriptions around notes/photos/files becoming finished reports, minutes, and presentations. Retain package ID, signing configuration, billing IDs, URLs, and technical compatibility keys.

- [ ] **Step 4: Update screenshot contracts**

Capture the active light result-first interface with a meeting-photo-to-report example, a polished result, and Word export. Remove selectors and captions that reference prompt building.

- [ ] **Step 5: Regenerate derived SEO files**

Run: `node scripts/generate-seo-route-js.mjs`

Run: `node scripts/generate-sitemap.mjs`

Expected: generated files contain the new visible brand and valid route inventory.

- [ ] **Step 6: Run release tests**

Run: `node --test test/playstore-listing.test.js test/playstore-assets.test.js test/seo-pages.test.js test/sitemap.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html public/manifest.webmanifest public/seo-route.js public/sitemap.xml public/privacy/index.html public/privacy/delete-account/index.html android-app/app/src/main/res/values/strings.xml android-app/twa-manifest.json scripts/check-playstore-readiness.mjs scripts/capture-playstore-screenshots.mjs scripts/generate-playstore-assets.mjs scripts/seo-routes.mjs test/playstore-listing.test.js test/playstore-assets.test.js test/seo-pages.test.js test/sitemap.test.js
git commit -m "feat: align release surfaces with AI Work Studio"
```

### Task 7: Full Verification, Visual Audit, and Main Push

**Files:**
- Modify only if verification exposes a scoped defect.

**Interfaces:**
- Consumes: all earlier deliverables.
- Produces: verified build and pushed `main`.

- [ ] **Step 1: Run whitespace and branding scans**

Run: `git diff --check`

Run: `rg -n "PromptLab|prompt builder|Lihat prompt|View prompt" src public index.html android-app/app/src/main/res scripts --glob "!*.map"`

Expected: no reader-facing occurrences; only approved technical compatibility identifiers may remain.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: build succeeds and every Node test passes.

- [ ] **Step 3: Run Play Store readiness**

Run: `npm run playstore:check`

Expected: PASS with the unchanged Android package and updated title/copy.

- [ ] **Step 4: Run the production UI locally**

Run: `npm run dev -- --port 4173`

Verify at 390×844 and desktop:

- light professional canvas;
- AI Work Studio branding;
- one-action result workflow;
- no visible prompt;
- Free allowance text;
- Word export button;
- no clipping at 200% text zoom;
- keyboard focus and reduced-motion behavior.

- [ ] **Step 5: Inspect generated Office files**

Generate a meeting report DOCX and a presentation PPTX. Unzip-test both packages and visually open them where available. Confirm hierarchy, tables, page/slide numbering, readable typography, non-overflowing content, and no old brand.

- [ ] **Step 6: Apply the Supabase migration**

Run the approved project migration mechanism for `supabase/phase-14-free-weekly-results.sql`, then use a read-only RPC check to confirm the function exists and authenticated execution permissions are correct.

- [ ] **Step 7: Confirm repository scope**

Run: `git status --short`

Expected: only the user's pre-existing `DESIGN-IS-2026-07-26/` remains untracked; no build artifacts or secrets are staged.

- [ ] **Step 8: Push main**

Run: `git push origin main`

Expected: remote `main` advances to the verified local commit.

- [ ] **Step 9: Verify deployment**

Inspect the production deployment until terminal `READY`, then smoke-test the public app URL and report the deployed commit.
