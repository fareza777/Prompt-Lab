import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * The sanitizer lives inside server/index.js, which starts a listener on
 * import. It is extracted here so its behaviour can be pinned without booting
 * the server.
 */
const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
const source = server.slice(
  server.indexOf("function sanitizeRunOutput"),
  server.indexOf("app.post(\"/api/run-prompt\"")
);
assert.ok(source.includes("sanitizeRunOutput"), "sanitizeRunOutput not found in server");
// eslint-disable-next-line no-new-func
const sanitizeRunOutput = new Function(`${source}; return sanitizeRunOutput;`)();

test("strips the reasoning block that shipped to production", () => {
  // Verbatim shape of the first live run: the monologue became the result.
  const leaked =
    "<think> The user is asking me to prepare a document template for meeting " +
    "minutes in Indonesian, and they will provide the actual details later. " +
    "</think>\n\nNotulen Rapat\n\nTanggal: 12 Mei 2026";
  const cleaned = sanitizeRunOutput(leaked);
  assert.doesNotMatch(cleaned, /<think>/i);
  assert.doesNotMatch(cleaned, /The user is asking/i);
  assert.match(cleaned, /^Notulen Rapat/);
});

test("an unclosed reasoning block yields nothing rather than leaking notes", () => {
  // No closing tag means the response was cut off mid-monologue, so there is no
  // deliverable to salvage. Returning empty makes the endpoint raise an error,
  // which is honest; returning the notes would show the user internal thinking.
  const truncated = "<think> deciding how to structure this, maybe start with the date";
  assert.equal(sanitizeRunOutput(truncated), "");
});

test("handles the other reasoning tag names", () => {
  for (const tag of ["thinking", "reasoning", "scratchpad"]) {
    const cleaned = sanitizeRunOutput(`<${tag}>internal notes</${tag}>\n\nHasil akhir`);
    assert.equal(cleaned, "Hasil akhir", `${tag} not stripped`);
  }
});

test("removes stray closing tags", () => {
  assert.equal(sanitizeRunOutput("Hasil akhir</think>"), "Hasil akhir");
});

test("unwraps a whole-response code fence", () => {
  assert.equal(sanitizeRunOutput("```markdown\n# Laporan\n\nIsi\n```"), "# Laporan\n\nIsi");
  assert.equal(sanitizeRunOutput("```\nPlain\n```"), "Plain");
});

test("leaves ordinary content untouched", () => {
  const doc = "# Notulen Rapat\n\n## Peserta\n\n- Rina\n- Budi\n\n## Tindak lanjut\n\n| Tugas | PIC |";
  assert.equal(sanitizeRunOutput(doc), doc);
});

test("keeps code fences that are part of the content", () => {
  // A fence in the middle is content the user asked for, not wrapping.
  const doc = "Berikut skripnya:\n\n```js\nconst a = 1;\n```\n\nSelesai.";
  const cleaned = sanitizeRunOutput(doc);
  assert.match(cleaned, /```js/);
  assert.match(cleaned, /const a = 1;/);
});

test("collapses runaway blank lines", () => {
  assert.equal(sanitizeRunOutput("A\n\n\n\n\nB"), "A\n\nB");
});

test("survives empty and non-string input", () => {
  assert.equal(sanitizeRunOutput(""), "");
  assert.equal(sanitizeRunOutput(null), "");
  assert.equal(sanitizeRunOutput(undefined), "");
  assert.equal(sanitizeRunOutput(42), "");
});

test("the anti-stalling directive is repeated after the prompt", () => {
  // A system message alone lost to a 5,000-character brief: production replied
  // "Mohon dilengkapi data berikut sebelum saya menyusun notulen" instead of
  // writing anything. The directive has to be the last thing the model reads.
  assert.match(server, /const RUN_FINAL_DIRECTIVE = \[/);
  assert.match(server, /this overrides anything above it that conflicts/i);
  assert.match(server, /Do NOT ask for data/i);
  assert.match(server, /Do NOT list what is missing/i);
  assert.match(server, /square\s*\n?\s*"?brackets/i);
  // It must be appended to the user turn, not left in the system slot.
  assert.match(
    server,
    /buildVisionUserContent\(userText,\s*visionAttachments\)/,
  );
  // Template mode has its own pair of directives, so this assembly is now the
  // untemplated branch rather than the only one.
  assert.match(server, /userText = `\$\{prompt\}\$\{deliverableInstruction\}\$\{diagramAddon\}\$\{visionNote\}\\n\\n\$\{RUN_FINAL_DIRECTIVE\}`/);
});

test("template mode keeps the anti-stalling rule but drops the invent-a-fact licence", () => {
  // RUN_FINAL_DIRECTIVE tells the model to make up a plausible detail and
  // bracket it. For a template that is a defect: invented attendee names on a
  // retyped sign-in sheet are worse than an obviously incomplete one.
  assert.match(server, /const RUN_TEMPLATE_FINAL_DIRECTIVE = \[/);
  assert.match(server, /Do NOT ask for data/i);
  assert.match(server, /Do NOT invent names, dates, numbers, quotations, or decisions/);
  assert.match(server, /userText = `\$\{source\}\$\{instruction\}\$\{visionNote\}\\n\\n\$\{RUN_TEMPLATE_FINAL_DIRECTIVE\}`/);
});

test("the run instruction forbids stalling for more detail", () => {
  // The first live run replied asking for details instead of writing anything.
  const prompt = server.slice(
    server.indexOf("const RUN_SYSTEM_PROMPT"),
    server.indexOf("function sanitizeRunOutput")
  );
  assert.match(prompt, /Never ask a question/i);
  assert.match(prompt, /never ask for more details/i);
  assert.match(prompt, /never offer to wait/i);
  assert.match(prompt, /invent a plausible one/i);
  assert.match(prompt, /no reasoning notes/i);
});
