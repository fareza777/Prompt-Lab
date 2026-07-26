import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createFinishedResult } from "../src/ui/resultFlow.js";

const resultSource = await readFile(new URL("../src/ui/Result.jsx", import.meta.url), "utf8");

test("result-first flow builds the prompt and returns the finished output", async () => {
  const calls = [];
  const result = await createFinishedResult({
    generatePrompt: async () => {
      calls.push("prompt");
      return "Structured instruction";
    },
    runPrompt: async (prompt) => {
      calls.push(`run:${prompt}`);
      return "Finished report";
    },
  });

  assert.deepEqual(calls, ["prompt", "run:Structured instruction"]);
  assert.deepEqual(result, {
    prompt: "Structured instruction",
    output: "Finished report",
  });
});

test("result-first flow stops when prompt generation fails", async () => {
  let runCalls = 0;
  const result = await createFinishedResult({
    generatePrompt: async () => "",
    runPrompt: async () => {
      runCalls += 1;
      return "must not run";
    },
  });

  assert.equal(result, null);
  assert.equal(runCalls, 0);
});

test("finished result never exposes the internal prompt workflow", () => {
  assert.doesNotMatch(
    resultSource,
    /promptOpen|viewPrompt|copyPrompt|improvePrompt|comparePrompt|pl-prompt-disclosure/,
  );
  assert.match(resultSource, /onExport\("docx", output\)/);
  assert.match(resultSource, /createContentActionPayload\("output", output\)/);
});
