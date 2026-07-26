# PromptLab Result-First Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PromptLab generate the finished work output in one primary action, hide the prompt behind a secondary disclosure, and replace the dark/neon visual language with a light-first editorial-luxury interface.

**Architecture:** Keep the existing prompt builder and run endpoint, but compose them into one UI transaction in `App`. Preserve request, prompt, and output as distinct state. Add a small content-record compatibility layer for history, then update the shell/result components and vanilla CSS without migrating frameworks or adding dependencies.

**Tech Stack:** React 19, Vite 8, vanilla CSS, Node test runner, Express API, Supabase, Playwright-based release capture.

## Global Constraints

- Default flow creates finished output; generated prompt is hidden behind “Lihat prompt”.
- Preserve package `app.promptlab.twa`, PromptLab name, auth, billing, quota, attachments, exports, and existing history data.
- Existing history items without `contentType` normalize to `prompt`.
- Light-first warm ivory, graphite, and one forest-green accent; no neon, cyan grid, dark default, or generic AI gradient.
- No new runtime dependency.
- All visible normal text must meet WCAG AA.
- Mobile layout must not clip at 390px.
- All behavior changes follow red-green-refactor.

---

### Task 1: Typed history content records

**Files:**
- Create: `src/ui/contentRecord.js`
- Modify: `src/main.jsx:858-880,1572-1603`
- Test: `test/content-record.test.js`

**Interfaces:**
- Produces: `normalizeContentRecord(item, index)`, `createContentRecord({ id, title, contentType, request, prompt, output, folder, tag, score, createdAt })`, and `getRecordVisibleContent(item)`.
- `contentType` is exactly `"prompt"` or `"output"`.
- Legacy records without `contentType` normalize to `"prompt"`.

- [ ] **Step 1: Write the failing content-record tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createContentRecord,
  getRecordVisibleContent,
  normalizeContentRecord,
} from "../src/ui/contentRecord.js";

test("legacy history records normalize as prompts", () => {
  const item = normalizeContentRecord({ id: "old", content: "Legacy prompt" }, 0);
  assert.equal(item.contentType, "prompt");
  assert.equal(item.prompt, "Legacy prompt");
  assert.equal(getRecordVisibleContent(item), "Legacy prompt");
});

test("output records preserve prompt and finished output separately", () => {
  const item = createContentRecord({
    id: "new",
    title: "Monthly report",
    contentType: "output",
    request: "Use the sales file",
    prompt: "Structured instruction",
    output: "Finished report",
    folder: "Word Document",
    tag: "Business",
    score: 8,
    createdAt: 1,
  });
  assert.equal(item.contentType, "output");
  assert.equal(item.prompt, "Structured instruction");
  assert.equal(item.output, "Finished report");
  assert.equal(getRecordVisibleContent(item), "Finished report");
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/content-record.test.js`

Expected: FAIL because `src/ui/contentRecord.js` does not exist.

- [ ] **Step 3: Implement the minimal record helpers**

```js
export function normalizeContentRecord(item, index = 0) {
  const source = item && typeof item === "object" ? item : {};
  const contentType = source.contentType === "output" ? "output" : "prompt";
  const legacyContent = String(source.content || "");
  const prompt = String(source.prompt || (contentType === "prompt" ? legacyContent : ""));
  const output = String(source.output || (contentType === "output" ? legacyContent : ""));
  return {
    ...source,
    id: source.id || `legacy-${index}`,
    contentType,
    request: String(source.request || ""),
    prompt,
    output,
    content: contentType === "output" ? output : prompt,
  };
}

export function createContentRecord(fields) {
  return normalizeContentRecord(fields, 0);
}

export function getRecordVisibleContent(item) {
  const record = normalizeContentRecord(item, 0);
  return record.contentType === "output" ? record.output : record.prompt;
}
```

Update `normalizeLibrary` to call `normalizeContentRecord`. Update the save function to create an output record when a finished output exists and a prompt record otherwise.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/content-record.test.js`

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add -- src/ui/contentRecord.js src/main.jsx test/content-record.test.js
git commit -m "feat: preserve prompt and output history types"
```

---

### Task 2: One-action result-first generation

**Files:**
- Modify: `src/main.jsx:2112-2294,2660-2820`
- Modify: `src/ui/Shell.jsx:43-247,327-382`
- Modify: `src/ui/Result.jsx:54-244`
- Modify: `src/ui/i18n.js:35-92,305-362`
- Test: `test/result-first-flow.test.js`
- Test: `test/run-prompt.test.js`

**Interfaces:**
- `createFinishedResult()` builds the structured prompt and then executes it.
- Shell receives `createFinishedResult`, `generatedPrompt`, `runOutput`, `isGenerating`, and `isRunning`.
- Result receives `output`, `prompt`, `showPrompt`, and output-specific callbacks.

- [ ] **Step 1: Write failing source-contract tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const main = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
const result = await readFile(new URL("../src/ui/Result.jsx", import.meta.url), "utf8");
const i18n = await readFile(new URL("../src/ui/i18n.js", import.meta.url), "utf8");

test("primary generation creates the prompt and finished output in one transaction", () => {
  assert.match(main, /async function createFinishedResult/);
  assert.match(main, /await generatePrompt/);
  assert.match(main, /await runPrompt/);
  assert.match(shell, /createFinishedResult/);
});

test("the finished output is primary and prompt is hidden behind a disclosure", () => {
  assert.match(result, /result\.viewPrompt/);
  assert.doesNotMatch(result, /result\.tabPrompt/);
  assert.doesNotMatch(result, /result\.tabOutput/);
});

test("primary Indonesian copy promises a finished result", () => {
  assert.match(i18n, /"canvas\.generate": "Buat hasil"/);
  assert.match(i18n, /"result\.viewPrompt": "Lihat prompt"/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/result-first-flow.test.js`

Expected: FAIL because the transaction and new result contract do not exist.

- [ ] **Step 3: Implement the result-first transaction**

Refactor `generatePrompt` to return the generated prompt string while preserving state updates. Refactor `runPrompt(rawPrompt)` to return the finished output string. Add:

```js
async function createFinishedResult() {
  const nextPrompt = await generatePrompt();
  if (!nextPrompt) return "";
  return runPrompt(nextPrompt);
}
```

Prevent the second operation from consuming an additional trial reservation; the existing generate operation remains the quota boundary. Pass `createFinishedResult` to Shell and bind the primary CTA to it.

- [ ] **Step 4: Replace the peer tabs with output-first Result**

Result must:

```jsx
<article className="pl-doc pl-doc--output" aria-live="polite">
  {output}
</article>
<button type="button" className="pl-text-action" onClick={() => setPromptOpen(true)}>
  {t("result.viewPrompt")}
</button>
```

The prompt disclosure may use the existing Sheet component or an inline `<details>`-style section, but it is closed initially. Prompt-only Improve/Compare live inside that disclosure; output-specific Copy, Save, Export, and Report remain on the main result.

- [ ] **Step 5: Verify GREEN**

Run: `node --test test/result-first-flow.test.js test/run-prompt.test.js test/ui-release-contract.test.js`

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

```powershell
git add -- src/main.jsx src/ui/Shell.jsx src/ui/Result.jsx src/ui/i18n.js test/result-first-flow.test.js test/run-prompt.test.js test/ui-release-contract.test.js
git commit -m "feat: generate finished results in one action"
```

---

### Task 3: Content-aware actions and billing repair

**Files:**
- Modify: `src/ui/Result.jsx`
- Modify: `src/ui/Shell.jsx:159-247,390-470`
- Modify: `src/ui/History.jsx:23-117`
- Modify: `src/ui/Report.jsx:14-120`
- Modify: `src/ui/Account.jsx:200-245`
- Modify: `src/main.jsx:1545-1603,1859-2036`
- Test: `test/content-action-routing.test.js`

**Interfaces:**
- `onSave({ contentType, content })`
- `onReport({ contentType, content })`
- `openHistoryItem(record)` restores `prompt` and `output` independently.
- Upgrade UI calls `onUpgrade("Pro")` or `onUpgrade("Business")`, never without an argument.

- [ ] **Step 1: Write failing routing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const result = await readFile(new URL("../src/ui/Result.jsx", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
const account = await readFile(new URL("../src/ui/Account.jsx", import.meta.url), "utf8");

test("result actions name the explicit output content type", () => {
  assert.match(result, /onSave\(\{\s*contentType: "output",\s*content: output/);
  assert.match(result, /onReport\(\{\s*contentType: "output",\s*content: output/);
});

test("history restores output separately from prompt", () => {
  assert.match(shell, /item\.contentType === "output"/);
  assert.match(shell, /setRunOutput\(item\.output/);
  assert.match(shell, /setGeneratedPrompt\(item\.prompt/);
});

test("upgrade actions always provide a valid plan", () => {
  assert.match(account, /onUpgrade\("Pro"\)/);
  assert.match(account, /onUpgrade\("Business"\)/);
  assert.doesNotMatch(account, /onClick=\{onUpgrade\}/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/content-action-routing.test.js`

Expected: FAIL on all three missing contracts.

- [ ] **Step 3: Implement explicit action routing**

Pass structured payloads from Result to Shell. Store the report payload in Shell state and pass that selected content to Report. Update History to show a small “Hasil” or “Prompt” label and reopen the correct state. Replace the single ambiguous upgrade button with two explicit plan actions.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/content-action-routing.test.js test/library-sync.test.js test/plan-entitlements.test.js test/play-billing-security.test.js`

Expected: all selected tests pass.

- [ ] **Step 5: Commit**

```powershell
git add -- src/ui/Result.jsx src/ui/Shell.jsx src/ui/History.jsx src/ui/Report.jsx src/ui/Account.jsx src/main.jsx test/content-action-routing.test.js
git commit -m "fix: route actions by content type"
```

---

### Task 4: Simplify first run and starter density

**Files:**
- Modify: `src/ui/FirstRun.jsx`
- Modify: `src/ui/Shell.jsx:237-260,384-386`
- Modify: `src/ui/Starters.jsx`
- Modify: `src/ui/i18n.js`
- Test: `test/ui-first-run.test.js`
- Test: `test/result-first-flow.test.js`

**Interfaces:**
- FirstRun only chooses language and calls `onFinish(code)`.
- Main canvas shows exactly three starter rows before “Lihat contoh lain”.

- [ ] **Step 1: Replace old source assertions with failing behavior contracts**

```js
test("first run reaches the canvas immediately after language choice", async () => {
  assert.doesNotMatch(firstRunSource, /const STEPS/);
  assert.doesNotMatch(firstRunSource, /data-stage="tour"/);
  assert.match(firstRunSource, /onPickLanguage\(code\)/);
  assert.match(firstRunSource, /onFinish\(\)/);
});

test("initial canvas limits starters to three outcomes", async () => {
  assert.match(startersSource, /templates\.slice\(0,\s*3\)/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/ui-first-run.test.js test/result-first-flow.test.js`

Expected: FAIL because the four-step tour and six starters remain.

- [ ] **Step 3: Implement the minimal language gate**

Keep the bilingual language explanation and two native language buttons. Selecting either language persists it, marks onboarding complete, and opens the canvas. Move detailed guidance to the existing Guide sheet.

- [ ] **Step 4: Limit initial starters**

Render `templates.slice(0, 3)` on the canvas. Retain the existing “Lihat contoh lain” searchable sheet for the full list. Rewrite the three leading templates in outcome language.

- [ ] **Step 5: Verify GREEN**

Run: `node --test test/ui-first-run.test.js test/result-first-flow.test.js`

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

```powershell
git add -- src/ui/FirstRun.jsx src/ui/Shell.jsx src/ui/Starters.jsx src/ui/i18n.js test/ui-first-run.test.js test/result-first-flow.test.js
git commit -m "refactor: shorten first run and starters"
```

---

### Task 5: Light-first editorial-luxury visual system

**Files:**
- Modify: `src/ui/tokens.css`
- Modify: `src/ui/base.css`
- Modify: `src/ui/shell.css`
- Modify: `src/ui/theme.js`
- Modify: `src/ui/Shell.jsx`
- Modify: `src/ui/Composer.jsx`
- Modify: `src/ui/Result.jsx`
- Test: `test/ui-premium-theme.test.js`
- Test: `test/ui-accessibility-behavior.test.js`

**Interfaces:**
- `readThemeMode()` defaults to `"light"` unless a valid stored mode exists.
- CSS tokens expose `--paper`, `--ink`, `--accent`, `--accent-strong`, `--tray`, and `--shadow-ambient`.
- `.pl-workbench`, `.pl-composer-tray`, and `.pl-result-tray` provide the premium nested surface contract.

- [ ] **Step 1: Write failing theme and layout contracts**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tokens = await readFile(new URL("../src/ui/tokens.css", import.meta.url), "utf8");
const shellCss = await readFile(new URL("../src/ui/shell.css", import.meta.url), "utf8");
const theme = await readFile(new URL("../src/ui/theme.js", import.meta.url), "utf8");

test("premium theme is light-first and uses warm editorial tokens", () => {
  assert.match(tokens, /--paper:\s*#f7f3eb/i);
  assert.match(tokens, /--ink:\s*#1f241f/i);
  assert.match(tokens, /--accent:\s*#2f5a46/i);
  assert.match(theme, /return "light"/);
});

test("work surfaces use nested trays and mobile fields do not clip", () => {
  assert.match(shellCss, /\.pl-composer-tray/);
  assert.match(shellCss, /\.pl-result-tray/);
  assert.match(shellCss, /minmax\(0,\s*1fr\)/);
});

test("old neon and grid styling is absent from the active UI", () => {
  assert.doesNotMatch(shellCss, /#00ffff|#00e5ff|cyan|grid-texture/i);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/ui-premium-theme.test.js`

Expected: FAIL because the premium token and tray contracts do not exist.

- [ ] **Step 3: Implement the token system**

Use:

```css
:root {
  --paper: #f7f3eb;
  --paper-raised: #fffdf8;
  --paper-sunken: #eee8dc;
  --tray: #e8e0d2;
  --ink: #1f241f;
  --ink-2: #414940;
  --ink-mute: #667067;
  --ink-faint: #737b74;
  --accent: #2f5a46;
  --accent-strong: #203f32;
  --accent-soft: #dfe9e1;
  --focus: #2f5a46;
  --shadow-ambient: 0 24px 70px rgba(72, 61, 42, 0.12);
}
```

Keep a user-selectable dark theme, but do not make it the default. Remove active cyan/neon/grid styles.

- [ ] **Step 4: Implement premium composition**

Add an asymmetric desktop `.pl-workbench` grid with an editorial intro column and work column. On mobile, switch to one column. Wrap Composer and Result with quiet outer trays and inner cores. Use system-safe characterful stacks already available locally; do not import a web font. Use custom cubic-bezier motion and transform/opacity only.

- [ ] **Step 5: Verify CSS and accessibility GREEN**

Run: `node --test test/ui-premium-theme.test.js test/ui-accessibility-behavior.test.js`

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

```powershell
git add -- src/ui/tokens.css src/ui/base.css src/ui/shell.css src/ui/theme.js src/ui/Shell.jsx src/ui/Composer.jsx src/ui/Result.jsx test/ui-premium-theme.test.js test/ui-accessibility-behavior.test.js
git commit -m "feat: apply light editorial workbench design"
```

---

### Task 6: Align Play Store assets and release contracts

**Files:**
- Modify: `scripts/capture-playstore-screenshots.mjs`
- Modify: `test/playstore-assets.test.js`
- Modify: `playstore/STORE_LISTING.md`
- Modify: `scripts/frame-playstore-screenshots.mjs`

**Interfaces:**
- Capture surfaces: `composer`, `result`, `attachments`, `history`, `export`.
- Active selectors use `.pl-shell`, `.pl-composer`, `.pl-result`, and labelled sheet dialogs.

- [ ] **Step 1: Write failing release-contract tests**

Replace the five-tab assertions with:

```js
test("capture targets the result-first single canvas", async () => {
  assert.match(source, /\.pl-shell/);
  assert.match(source, /\.pl-composer/);
  assert.match(source, /\.pl-result/);
  assert.doesNotMatch(source, /MOBILE_TABS|v2-bottom-nav|v2-shell/);
});

test("listing describes finished work outputs before prompts", async () => {
  assert.match(listing, /laporan Word, slide PowerPoint, konten, analisis, dan kode/i);
  assert.match(listing, /Lihat prompt/i);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/playstore-assets.test.js test/playstore-listing.test.js`

Expected: FAIL because the old five-tab contract remains.

- [ ] **Step 3: Update capture and listing**

Capture the current light result-first surfaces at the existing required Play dimensions. Frame screenshots with outcome-led headlines and warm ivory/forest styling. Remove old Builder/Optimizer/Templates/Library/Compare screenshot narrative.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/playstore-assets.test.js test/playstore-listing.test.js`

Expected: all selected tests pass.

- [ ] **Step 5: Commit**

```powershell
git add -- scripts/capture-playstore-screenshots.mjs scripts/frame-playstore-screenshots.mjs test/playstore-assets.test.js playstore/STORE_LISTING.md
git commit -m "chore: align Play Store assets with result-first UI"
```

---

### Task 7: Full verification and visual inspection

**Files:**
- Modify only if verification reveals a defect.

**Interfaces:**
- No new interface; this task proves the integrated release.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: build exits 0 and all tests pass.

- [ ] **Step 2: Run smoke and Play readiness**

Run:

```powershell
npm run test:smoke
npm run playstore:check
```

Expected: both commands exit 0.

- [ ] **Step 3: Inspect responsive UI**

Run the production preview and inspect:

- 390×844 light default: composer, Advanced open, loading, output, View prompt, History, Account.
- 1440×1000 light default: asymmetric workbench and readable output measure.
- Reduced motion.

Confirm no clipping, horizontal overflow, faint-text failures, dark default, neon/grid remnants, or prompt shown before disclosure.

- [ ] **Step 4: Check repository diff**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only intended audit artifacts may remain untracked.

- [ ] **Step 5: Final integration commit if verification required fixes**

```powershell
git add -- src/main.jsx src/ui test scripts/capture-playstore-screenshots.mjs scripts/frame-playstore-screenshots.mjs playstore/STORE_LISTING.md
git commit -m "fix: finish result-first release verification"
```

Skip this step when verification required no additional edits.
