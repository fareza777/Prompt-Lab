import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getTemplate, listTemplates, buildTemplateInstruction } from "../src/workTemplates.js";

/**
 * Two whole engines shipped that nothing could reach.
 *
 * The slide-layout work — numbered cards, figure callouts, accent tables, two
 * columns — and the process-flow diagram renderer were both complete, tested,
 * and unreachable: not one of the fifteen templates declared pptx or png as an
 * output, so no user action could produce either. PowerPoint is also the only
 * paid feature on the Pro plan, which made it unsellable.
 */

const outputsAcross = new Set(listTemplates().flatMap((template) => template.outputs));

test("every export format the app builds is reachable from some template", () => {
  for (const format of ["docx", "pdf", "xlsx", "pptx", "png"]) {
    assert.ok(outputsAcross.has(format), `no template can produce ${format}`);
  }
});

test("the presentation template drives the slide-layout engine", () => {
  const template = getTemplate("presentation");
  assert.ok(template, "there is no presentation template");
  assert.ok(template.outputs.includes("pptx"));
  assert.equal(template.profile, "presentation");

  const instruction = buildTemplateInstruction({
    template,
    language: "id",
    values: { subject: "Paparan Capaian" },
  });
  // The engine renders figure-leading bullets as large callouts and markdown
  // tables as real tables, so the prompt has to ask for both in that shape.
  assert.match(instruction, /DIMULAI dengan angkanya/);
  assert.match(instruction, /tabel Markdown/);
  assert.match(instruction, /6–10 slide/);
  assert.match(instruction, /jangan menambah slide untuk mengejar jumlah/);
});

test("the diagram template drives the process-flow renderer", () => {
  const template = getTemplate("diagram");
  assert.ok(template, "there is no diagram template");
  assert.equal(template.profile, "diagram");
  assert.ok(template.outputs.includes("png"));

  const instruction = buildTemplateInstruction({
    template,
    language: "id",
    values: { subject: "Alur Perizinan" },
  });
  // The canvas renderer reads a ```process fence; raw Mermaid is what used to
  // fail on Android.
  assert.match(instruction, /```process/);
  assert.match(instruction, /Jangan mengandalkan kode Mermaid mentah/);
});

test("export buttons follow the template, not only the plan", async () => {
  // Offering a spreadsheet download for a formal letter, or slides for a
  // handover record, only produces a disappointing file.
  const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
  assert.match(shell, /activeTemplate\.outputs\.includes\("docx"\)/);
  assert.match(shell, /activeTemplate\.outputs\.includes\("pptx"\)/);
  assert.match(shell, /activeTemplate\.outputs\.includes\("xlsx"\)/);
});

test("unreachable prompt-era UI is no longer shipped", async () => {
  // Nothing has opened Improve or Compare since the prompt-first flow was
  // replaced, and the two of them plus the retired composer cost 13.9 KiB of
  // the initial bundle, which had 2.7 KiB of headroom left.
  const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
  for (const gone of ["<Improve", "<Compare", "<Composer", "<Starters"]) {
    assert.ok(!shell.includes(gone), `${gone} is still rendered`);
  }
  assert.doesNotMatch(shell, /^import (Improve|Compare|Composer|Starters)/m);
  assert.doesNotMatch(shell, /openImprove|runImprove|applyImprove|openCompare/);
});

test("the attachment picker never silently drops a photo", async () => {
  // The template asks for eight, the free plan allows three, and the picker
  // used to accept all eight and discard the rest with a passing warning.
  const bench = await readFile(new URL("../src/ui/TemplateWorkbench.jsx", import.meta.url), "utf8");
  assert.match(bench, /Math\.min\(spec\.max \|\| 0, planMaxAttachments \|\| spec\.max \|\| 0\)/);
  assert.match(bench, /const atLimit = attachments\.length >= allowed/);
  assert.match(bench, /tpl\.limitRemaining/);
  assert.match(bench, /tpl\.limitReached/);

  const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
  assert.match(shell, /planMaxAttachments=\{maxAttachments\}/);

  const { translate } = await import("../src/ui/i18n.js");
  for (const lang of ["id", "en"]) {
    for (const key of ["tpl.limitRemaining", "tpl.limitReached"]) {
      assert.notEqual(translate(lang, key), key, `${key} missing for ${lang}`);
    }
  }
});

test("the calendar can be searched by title and by document text", async () => {
  // Picking days one at a time stops working at around forty documents, and
  // what a person remembers is a phrase from inside the report.
  const calendar = await readFile(new URL("../src/ui/Calendar.jsx", import.meta.url), "utf8");
  assert.match(calendar, /item\.output \|\| item\.content/);
  assert.match(calendar, /cal\.search/);
  assert.match(calendar, /function TemplateIcon/);
  assert.match(calendar, /getTemplate\(templateId\)\?\.icon/);

  const { translate } = await import("../src/ui/i18n.js");
  for (const lang of ["id", "en"]) {
    assert.notEqual(translate(lang, "cal.search"), "cal.search");
  }
});
