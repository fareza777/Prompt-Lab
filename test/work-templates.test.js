import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptFor,
  buildTemplateInstruction,
  classifyAttachment,
  getTemplate,
  groupTemplates,
  listTemplates,
  localized,
  normalizeCustomTemplate,
  validateTemplateInput,
} from "../src/workTemplates.js";
import { sanitizeReadyDocument } from "../src/readyDocumentSanitize.js";

const templates = listTemplates();

test("the catalogue is well formed in both languages", () => {
  assert.ok(templates.length >= 15, `only ${templates.length} templates`);
  const ids = new Set();
  for (const template of templates) {
    assert.ok(!ids.has(template.id), `duplicate id ${template.id}`);
    ids.add(template.id);
    for (const language of ["id", "en"]) {
      assert.ok(localized(template.name, language), `${template.id} has no ${language} name`);
      assert.ok(localized(template.blurb, language), `${template.id} has no ${language} blurb`);
      assert.ok(
        localized(template.prompt, language).length > 150,
        `${template.id} ${language} prompt is too thin to steer the model`
      );
    }
    assert.ok(template.outputs.length > 0, `${template.id} cannot be exported`);
    assert.ok(template.profile, `${template.id} has no sanitising profile`);
  }
});

test("one attachment is enough everywhere except before-and-after", () => {
  // The rule the product owner set: a single photo must always be workable,
  // because a comparison is the only job that is meaningless with one.
  for (const template of templates) {
    const min = template.input.attachments.min;
    if (template.id === "before-after") {
      assert.equal(min, 2, "before-after must demand a pair");
    } else {
      assert.ok(min <= 1, `${template.id} demands ${min} attachments`);
    }
  }
});

test("templates that accept no attachment demand typed input instead", () => {
  for (const template of templates) {
    if (template.input.attachments.min > 0) continue;
    assert.equal(
      template.input.note.mode,
      "fallback",
      `${template.id} can be run with no source at all`
    );
    assert.equal(validateTemplateInput(template, {})?.code, "need_source");
  }
});

test("input validation reports what is actually missing", () => {
  const beforeAfter = getTemplate("before-after");
  const onePhoto = [{ name: "a.jpg", type: "image/jpeg" }];

  assert.equal(validateTemplateInput(beforeAfter, { attachments: onePhoto })?.code, "need_images");
  assert.equal(
    validateTemplateInput(beforeAfter, { attachments: [...onePhoto, { name: "b.png", type: "image/png" }] }),
    null
  );

  // A PDF does not satisfy a template that wants photographs.
  const activity = getTemplate("activity-report");
  assert.equal(
    validateTemplateInput(activity, { attachments: [{ name: "x.pdf", type: "application/pdf" }] })?.code,
    "need_images"
  );

  const tooMany = Array.from({ length: 12 }, (_, i) => ({ name: `p${i}.jpg`, type: "image/jpeg" }));
  assert.equal(validateTemplateInput(activity, { attachments: tooMany })?.code, "too_many");

  // A typed note stands in for the attachment where the template allows it.
  const minutes = getTemplate("meeting-minutes");
  assert.equal(validateTemplateInput(minutes, {})?.code, "need_source");
  assert.equal(validateTemplateInput(minutes, { note: "rapat anggaran, hadir 6 orang" }), null);
  assert.equal(validateTemplateInput(minutes, { attachments: onePhoto }), null);
});

test("attachments are classified by mime type and by filename", () => {
  assert.equal(classifyAttachment({ name: "a.jpg", type: "image/jpeg" }), "image");
  assert.equal(classifyAttachment({ name: "scan.HEIC" }), "image");
  assert.equal(classifyAttachment({ name: "laporan.pdf" }), "document");
  assert.equal(classifyAttachment("foto.png"), "image");
});

test("the file picker only offers what the template can use", () => {
  assert.equal(acceptFor(getTemplate("before-after")), "image/*");
  assert.match(acceptFor(getTemplate("summary")), /\.pdf/);
  assert.match(acceptFor(getTemplate("summary")), /image\/\*/);
});

test("each template produces a visibly different contract", () => {
  // The point of the engine: same photo, different job, different document.
  const built = templates.map((template) =>
    buildTemplateInstruction({ template, language: "id", attachmentCount: 1 })
  );
  assert.equal(new Set(built).size, built.length, "two templates produced identical instructions");

  const activity = buildTemplateInstruction({
    template: getTemplate("activity-report"),
    language: "id",
    attachmentCount: 1,
  });
  const beforeAfter = buildTemplateInstruction({
    template: getTemplate("before-after"),
    language: "id",
    attachmentCount: 2,
  });

  assert.match(activity, /LAPORAN KEGIATAN/);
  assert.match(activity, /## Uraian Pelaksanaan/);
  assert.match(activity, /450–750 kata/);
  assert.doesNotMatch(activity, /Kondisi Sebelum/);

  assert.match(beforeAfter, /## Kondisi Sebelum/);
  assert.match(beforeAfter, /## Kondisi Sesudah/);
  assert.doesNotMatch(beforeAfter, /Uraian Pelaksanaan/);
});

test("the instruction carries the section skeleton, the length, and the honesty clause", () => {
  const instruction = buildTemplateInstruction({
    template: getTemplate("site-visit"),
    language: "id",
    attachmentCount: 3,
  });
  assert.match(instruction, /BAGIAN WAJIB/);
  assert.match(instruction, /## Temuan/);
  assert.match(instruction, /PANJANG: sekitar 400–700 kata/);
  assert.match(instruction, /3 berkas dilampirkan/);
  assert.match(instruction, /Jangan menebak nama orang/);
  assert.match(instruction, /Kembalikan hanya dokumen jadi/);
});

test("the typed note is passed through and marked as outranking the photo", () => {
  const instruction = buildTemplateInstruction({
    template: getTemplate("activity-report"),
    language: "id",
    note: "rapat koordinasi humas di aula",
    attachmentCount: 1,
  });
  assert.match(instruction, /rapat koordinasi humas di aula/);
  assert.match(instruction, /KONTEKS DARI PENGGUNA/);
  assert.match(instruction, /mengikat/);
});

test("English is a full translation, not a fallback to Indonesian", () => {
  const instruction = buildTemplateInstruction({
    template: getTemplate("meeting-minutes"),
    language: "en",
    attachmentCount: 1,
  });
  assert.match(instruction, /MEETING MINUTES/);
  assert.match(instruction, /## Action Items/);
  assert.match(instruction, /REQUIRED SECTIONS/);
  assert.doesNotMatch(instruction, /BAGIAN WAJIB|Jangan mengarang/);
});

test("spreadsheet templates ask for tables and forbid invented arithmetic", () => {
  for (const id of ["recap-sheet", "table-extract", "attendance-list", "action-items"]) {
    const template = getTemplate(id);
    assert.ok(template.outputs.includes("xlsx"), `${id} cannot export a spreadsheet`);
    const instruction = buildTemplateInstruction({ template, language: "id", attachmentCount: 1 });
    assert.match(instruction, /tabel Markdown/i, `${id} does not ask for a table`);
  }
  assert.match(
    buildTemplateInstruction({ template: getTemplate("recap-sheet"), language: "id" }),
    /JANGAN menghitung total/
  );
});

test("the image prompt survives the document sanitiser untouched", () => {
  const template = getTemplate("image-prompt");
  assert.equal(template.profile, "prompt");
  const output = [
    "## Prompt",
    "A wide shot of a market at dawn, warm light, 35mm lens.",
    "",
    "## Negative Prompt",
    "blurry, watermark, text",
    "",
    "## Pengaturan",
    "- Rasio 3:2",
  ].join("\n");
  assert.equal(sanitizeReadyDocument(output, template.profile), output);
});

test("a custom template gets the same shape as a built-in one", () => {
  const custom = normalizeCustomTemplate({
    name: "Laporan Piket",
    instruction: "Susun laporan piket harian dari foto buku jaga.",
    sections: "1. Waktu Piket\n- Kejadian\n## Serah Terima",
    needsAttachment: true,
  });

  assert.deepEqual(custom.sections.id, ["Waktu Piket", "Kejadian", "Serah Terima"]);
  assert.equal(custom.input.attachments.min, 1);
  assert.equal(validateTemplateInput(custom, { attachments: [{ name: "a.jpg", type: "image/jpeg" }] }), null);

  const instruction = buildTemplateInstruction({ template: custom, language: "id", attachmentCount: 1 });
  assert.match(instruction, /LAPORAN PIKET/);
  assert.match(instruction, /## Serah Terima/);
  assert.match(instruction, /Kembalikan hanya dokumen jadi/);

  // With no attachment required, typed input becomes mandatory instead.
  const noFile = normalizeCustomTemplate({ name: "Catatan", instruction: "x", needsAttachment: false });
  assert.equal(validateTemplateInput(noFile, {})?.code, "need_note");
});

test("a custom template reloaded from storage keeps its name", () => {
  // The stored library normalises records to `title` and drops `name`, so
  // reading only `name` rendered every saved template as "Template".
  const reloaded = normalizeCustomTemplate({
    id: "custom-template-1",
    title: "Notulen Rapat Bidang",
    instruction: "Susun notulen.",
  });
  assert.equal(localized(reloaded.name, "id"), "Notulen Rapat Bidang");
  assert.equal(localized(reloaded.name, "en"), "Notulen Rapat Bidang");
  assert.equal(reloaded.id, "custom:custom-template-1");
});

test("the gallery groups every template without losing any", () => {
  const grouped = groupTemplates();
  const total = grouped.reduce((sum, entry) => sum + entry.templates.length, 0);
  assert.equal(total, templates.length, "a template belongs to no known group");
});
