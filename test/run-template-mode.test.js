import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");

const endpoint = server.slice(
  server.indexOf('app.post("/api/run-prompt"'),
  server.indexOf('app.post("/api/optimize-prompt"')
);

test("a templateId runs the template contract instead of guessing a profile", () => {
  assert.match(endpoint, /const template = body\.templateId \? getTemplate\(body\.templateId\) : null/);
  assert.match(endpoint, /buildTemplateInstruction\(\{/);
  assert.match(endpoint, /deliverableProfile = template\.profile/);
  // Profile detection must still exist for the untemplated path.
  assert.match(endpoint, /deliverableProfile = detectDeliverableProfile\(payload\)/);
});

test("template mode needs no separately generated prompt", () => {
  assert.match(endpoint, /if \(!prompt && !template\)/);
  assert.match(endpoint, /Unknown template/);
});

test("the invent-a-fact directive is not used in template mode", () => {
  // Both default directives tell the model to invent a plausible detail and
  // bracket it. An attendance sheet with invented names is worse than an
  // incomplete one, so template mode swaps in its own pair.
  assert.match(server, /const RUN_TEMPLATE_SYSTEM_PROMPT =/);
  assert.match(server, /function buildRunTemplateFinalDirective\(template, language/);
  assert.match(server, /source-faithful/);
  assert.match(server, /one output language/i);
  assert.match(endpoint, /systemPrompt = RUN_TEMPLATE_SYSTEM_PROMPT/);
  assert.match(endpoint, /buildRunTemplateFinalDirective\(template, body\.language\)/);

  // Sliced by landmark rather than by exact whitespace: the file uses CRLF.
  const start = endpoint.indexOf("systemPrompt = RUN_TEMPLATE_SYSTEM_PROMPT");
  const end = endpoint.indexOf("deliverableProfile = detectDeliverableProfile(payload)");
  assert.ok(start > 0 && end > start, "the template branch could not be located");
  const templateBranch = endpoint.slice(start, end);
  assert.doesNotMatch(templateBranch, /RUN_FINAL_DIRECTIVE(?!S)/);
});

test("documents are read into text while photos go to vision", () => {
  assert.match(server, /async function normalizeTemplateAttachments/);
  assert.match(server, /const \{ vision, documents \}|sources\.vision/);
  assert.match(server, /function buildTemplateSourceBlock/);
  assert.match(server, /BAHAN SUMBER/);
  assert.match(endpoint, /normalizeTemplateAttachments\(/);
});

test("more than four attachments survive the upload", () => {
  // Activity and site-visit reports ask for up to eight photos; the old cap
  // dropped the rest silently.
  assert.match(server, /const RUN_MAX_ATTACHMENTS = 8/);
  assert.match(server, /upload\.array\("attachments", RUN_MAX_ATTACHMENTS\)/);
});

test("quota is sized against what template mode actually sends", () => {
  // payload.prompt is empty in template mode, so without this the estimate and
  // the token ceiling are both computed against nothing.
  assert.match(endpoint, /const answers = Object\.values\(body\.values \|\| \{\}\)/);
  assert.match(endpoint, /payload\.prompt = \[\.\.\.answers, \.\.\.templateDocuments\.map/);
});

test("field answers and photo labels reach the model", () => {
  assert.match(endpoint, /values: body\.values/);
  assert.match(endpoint, /editedFields: body\.editedFields/);
  assert.match(endpoint, /attachments: \[\.\.\.visionAttachments, \.\.\.templateDocuments\]/);
  // A malformed multipart value must degrade, not 500 the run.
  assert.match(server, /function parseJsonField/);
  assert.match(server, /values: parseJsonField\(req\.body\?\.values, \{\}\)/);
  assert.match(server, /editedFields: parseJsonField\(req\.body\?\.editedFields, \[\]\)/);
  assert.match(server, /slots: parseJsonField\(req\.body\?\.slots, \[\]\)/);
  // Which photo is the "before" is asked, never inferred from upload order.
  assert.match(server, /slot: String\(slots\[index\] \|\| ""\)/);
});

test("the UI carries manually edited autofill provenance to template mode", () => {
  assert.match(shell, /templateEditedFields/);
  assert.match(shell, /setTemplateEditedFields/);
  assert.match(shell, /runTemplate\?\.\(activeTemplate, templateValues, lang, templateEditedFields\)/);
  assert.match(main, /formData\.append\("editedFields", JSON\.stringify\(editedFields \|\| \[\]\)\)/);
});

test("usage records which template was used", () => {
  assert.match(server, /templateId: body\.templateId \|\| null/);
});
