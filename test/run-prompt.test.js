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

test("execution asks for the deliverable, not commentary about it", () => {
  assert.match(server, /RUN_SYSTEM_PROMPT/);
  assert.match(server, /Return only the requested content itself/);
  assert.match(server, /no restatement of the/);
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

test("the result offers running as the next step, then shows both views", () => {
  assert.match(result, /result\.run/);
  assert.match(result, /result\.tabPrompt/);
  assert.match(result, /result\.tabOutput/);
  assert.match(result, /aria-pressed=\{showingOutput\}/);
  // Copy, save, and export must act on whichever view is on screen.
  assert.match(result, /const visibleText = showingOutput \? runOutput : prompt/);
  assert.match(result, /onCopy\(visibleText\)/);
  assert.match(result, /onExport\("docx", visibleText\)/);
});

test("Improve and Compare stay attached to the prompt", () => {
  // They rewrite the prompt, so they are meaningless while viewing the output.
  assert.match(result, /\{!showingOutput && \(\s*<button[\s\S]{0,200}onImprove/);
  assert.match(result, /\{!showingOutput && canCompare/);
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

test("product copy does not claim finished documents the app cannot deliver", async () => {
  const landing = await read("../src/LandingPage.jsx");
  // The tagline described output the engine does not produce on its own.
  assert.doesNotMatch(translate("id", "app.tagline"), /jadi dokumen/i);
  assert.doesNotMatch(translate("en", "app.tagline"), /to documents/i);
  assert.doesNotMatch(landing, /into work you can send/);
});
