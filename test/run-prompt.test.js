import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { translate } from "../src/ui/i18n.js";

const read = (p) => readFile(new URL(p, import.meta.url), "utf8");

const server = await read("../server/index.js");
const main = await read("../src/main.jsx");
const result = await read("../src/ui/Result.jsx");
const shell = await read("../src/ui/Shell.jsx");

test("the server exposes an endpoint that runs a prompt", () => {
  assert.match(server, /app\.post\("\/api\/run-prompt"/);
  // Same protections as the other AI routes: rate limit, identity, quota.
  assert.match(server, /app\.post\("\/api\/run-prompt", attachAiRateLimitIdentity, aiRateLimit/);
  assert.match(server, /estimateRunTokens/);
  assert.match(server, /getQuotaSession\(req, quotaEstimate\)/);
  assert.match(server, /eventType: "run_prompt"/);
});

test("run-prompt accepts image attachments for multimodal vision", () => {
  const endpoint = server.slice(
    server.indexOf('app.post("/api/run-prompt"'),
    server.indexOf('app.post("/api/optimize-prompt"')
  );
  assert.match(endpoint, /acceptRunPromptBody/);
  assert.match(endpoint, /normalizeRunAttachments/);
  assert.match(endpoint, /buildVisionUserContent/);
  assert.match(endpoint, /runVisionDirective/);
  assert.match(server, /multipart\/form-data/);
});

test("the client resends photos when running a finished result", () => {
  assert.match(main, /formData\.append\("attachments"/);
  assert.match(main, /imageAttachments/);
  assert.match(main, /\/api\/run-prompt/);
});

test("execution falls back like the other provider calls", () => {
  const endpoint = server.slice(
    server.indexOf('app.post("/api/run-prompt"'),
    server.indexOf('app.post("/api/optimize-prompt"')
  );
  assert.match(endpoint, /shouldTryFallbackModel/);
  assert.match(endpoint, /tryOpenRouterFallbackModels/);
  // The helper returns {completion, errors} and never a model name, so the
  // served model has to come off the completion itself.
  assert.match(endpoint, /completion\?\.model \|\| "fallback"/);
  assert.doesNotMatch(endpoint, /fallback\.model/);
});

test("the client keeps the prompt and its output separate", () => {
  assert.match(main, /const \[runOutput, setRunOutput\] = useState\(""\)/);
  assert.match(main, /async function runPrompt/);
  assert.match(main, /applyServerQuota\(data\.quota\)/);
  // Generating a new prompt must not leave the previous run's output behind.
  assert.match(shell, /setRunOutput\?\.\(""\)/);
});

test("one action creates a finished result and keeps the prompt internal", () => {
  assert.match(main, /createFinishedResult as runResultFirst/);
  assert.match(main, /async function createFinishedResult/);
  assert.match(shell, /await createFinishedResult\?\.\(\)/);
  assert.match(result, /const output = String\(runOutput/);
  assert.match(result, /onCopy\(output\)/);
  assert.match(result, /onExport\("docx", output\)/);
  assert.doesNotMatch(result, /viewPrompt|promptOpen|copyPrompt/);
  assert.doesNotMatch(result, /result\.tabPrompt|result\.tabOutput/);
});

test("prompt-only Improve and Compare controls are absent from results", () => {
  assert.doesNotMatch(result, /onClick=\{onImprove\}|onClick=\{onCompare\}|canCompare/);
});

test("the run wait states its own longer duration", () => {
  for (const lang of ["id", "en"]) {
    const hint = translate(lang, "result.runWorkingHint");
    assert.notEqual(hint, "result.runWorkingHint", `missing for ${lang}`);
    assert.match(hint, /30|60/, `${lang} run hint does not state a duration`);
  }
});

test("run copy exists in both languages", () => {
  for (const key of [
    "result.run",
    "result.running",
    "result.runHint",
    "result.tabPrompt",
    "result.tabOutput",
    "result.runWorking",
    "result.runFailed",
  ]) {
    for (const lang of ["id", "en"]) {
      assert.notEqual(translate(lang, key), key, `${key} missing for ${lang}`);
    }
  }
});

test("product copy describes finished documents the app now delivers", async () => {
  const landing = await read("../src/LandingPage.jsx");
  assert.match(translate("id", "canvas.subtitle"), /dokumen kerja/i);
  assert.match(landing, /finished work/i);
});
