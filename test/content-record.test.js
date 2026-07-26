import test from "node:test";
import assert from "node:assert/strict";
import {
  createContentActionPayload,
  createContentRecord,
  getRecordVisibleContent,
  getRecordRestoreState,
  normalizeContentRecord,
} from "../src/ui/contentRecord.js";

test("legacy history records normalize as prompts", () => {
  const item = normalizeContentRecord({ id: "old", content: "Legacy prompt" }, 0);

  assert.equal(item.contentType, "prompt");
  assert.equal(item.prompt, "Legacy prompt");
  assert.equal(item.output, "");
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

test("content action payloads reject ambiguous content types", () => {
  assert.deepEqual(createContentActionPayload("output", "  Finished report  "), {
    contentType: "output",
    content: "Finished report",
  });
  assert.deepEqual(createContentActionPayload("unknown", "Prompt text"), {
    contentType: "prompt",
    content: "Prompt text",
  });
});

test("history restore state never reopens an output as a prompt", () => {
  assert.deepEqual(
    getRecordRestoreState({
      contentType: "output",
      prompt: "Structured instruction",
      output: "Finished report",
    }),
    {
      prompt: "Structured instruction",
      output: "Finished report",
    }
  );
});
