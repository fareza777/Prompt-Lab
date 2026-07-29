import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptFor,
  buildTemplateInstruction,
  classifyAttachment,
  defaultFieldValues,
  getTemplate,
  groupTemplates,
  listTemplates,
  localized,
  normalizeCustomTemplate,
  templateFields,
  templateSlots,
  validateTemplateInput,
} from "../src/workTemplates.js";
import { sanitizeReadyDocument } from "../src/readyDocumentSanitize.js";

const templates = listTemplates();

/** Field answers that satisfy every required field on a template. */
function completeValues(template) {
  const values = defaultFieldValues(template, new Date(2026, 6, 29, 10, 30));
  for (const field of templateFields(template)) {
    if (field.required && !values[field.id]) values[field.id] = "isi";
    if (field.mode === "fallback") values[field.id] = "isi";
  }
  return values;
}

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

test("every template asks for the facts a photo cannot supply", () => {
  for (const template of templates) {
    const fields = templateFields(template);
    assert.ok(fields.length > 0, `${template.id} asks for nothing`);
    for (const field of fields) {
      assert.ok(field.id, `${template.id} has a field with no id`);
      assert.ok(["text", "textarea", "date", "time"].includes(field.type), `${template.id}.${field.id} bad type`);
      for (const language of ["id", "en"]) {
        assert.ok(localized(field.label, language), `${template.id}.${field.id} has no ${language} label`);
      }
    }
    const ids = fields.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length, `${template.id} has duplicate field ids`);
  }
});

test("reports carry a subject field so the document can name itself", () => {
  // Without one the calendar filed every set of minutes under the same
  // section heading and the user could not tell them apart.
  for (const id of ["activity-report", "meeting-minutes", "official-record", "site-visit"]) {
    const required = templateFields(getTemplate(id)).filter((f) => f.required);
    assert.ok(required.length > 0, `${id} has no required field`);
  }
});

test("date and time fields arrive already filled in", () => {
  // Typing today's date by hand is the step people skip, and a report with
  // the wrong date is worse than one that took a second longer to make.
  const at = new Date(2026, 6, 29, 10, 5);
  const values = defaultFieldValues(getTemplate("official-record"), at);
  assert.equal(values.date, "2026-07-29");
  assert.equal(values.time, "10:05");

  const activity = defaultFieldValues(getTemplate("activity-report"), at);
  assert.equal(activity.date, "2026-07-29");
  assert.equal(activity.activity, "", "a text field must not be pre-filled");
});

test("one attachment is enough everywhere except before-and-after", () => {
  for (const template of templates) {
    const min = template.input.attachments.min;
    if (template.id === "before-after") {
      assert.equal(min, 2, "before-after must demand a pair");
    } else {
      assert.ok(min <= 1, `${template.id} demands ${min} attachments`);
    }
  }
});

test("before and after are separate labelled slots, not one pile", () => {
  const template = getTemplate("before-after");
  const slots = templateSlots(template);
  assert.deepEqual(slots.map((s) => s.id), ["before", "after"]);
  assert.equal(templateSlots(getTemplate("activity-report")), null);

  const values = completeValues(template);
  const onlyBefore = [{ name: "a.jpg", type: "image/jpeg", slot: "before" }];
  assert.equal(validateTemplateInput(template, { attachments: onlyBefore, values })?.code, "need_slot");

  const pair = [...onlyBefore, { name: "b.jpg", type: "image/jpeg", slot: "after" }];
  assert.equal(validateTemplateInput(template, { attachments: pair, values }), null);
});

test("a missing required field blocks the run and names itself", () => {
  const template = getTemplate("activity-report");
  const photo = [{ name: "a.jpg", type: "image/jpeg" }];
  const problem = validateTemplateInput(template, { attachments: photo, values: {} });
  assert.equal(problem.code, "need_field");
  assert.equal(problem.field, "activity");
  assert.equal(localized(problem.label, "id"), "Kegiatan apa");

  assert.equal(
    validateTemplateInput(template, { attachments: photo, values: completeValues(template) }),
    null
  );
});

test("input validation still reports missing and excess attachments", () => {
  const activity = getTemplate("activity-report");
  const values = completeValues(activity);
  assert.equal(
    validateTemplateInput(activity, { attachments: [{ name: "x.pdf", type: "application/pdf" }], values })?.code,
    "need_images"
  );
  const tooMany = Array.from({ length: 12 }, (_, i) => ({ name: `p${i}.jpg`, type: "image/jpeg" }));
  assert.equal(validateTemplateInput(activity, { attachments: tooMany, values })?.code, "too_many");

  // A fallback field stands in for the attachment where the template allows it.
  const minutes = getTemplate("meeting-minutes");
  const base = defaultFieldValues(minutes);
  base.subject = "Rapat Anggaran";
  assert.equal(validateTemplateInput(minutes, { values: base })?.code, "need_source");
  assert.equal(
    validateTemplateInput(minutes, { values: { ...base, transcript: "hadir 6 orang" } }),
    null
  );
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

test("field answers are handed over as established facts", () => {
  const template = getTemplate("official-record");
  const values = {
    ...defaultFieldValues(template, new Date(2026, 6, 29, 10, 30)),
    subject: "12 unit laptop inventaris",
    items: "Laptop Lenovo T14, 12 unit",
    party1Name: "Rina Marlina",
    party2Name: "Budi Santoso",
  };
  const instruction = buildTemplateInstruction({ template, language: "id", values });

  assert.match(instruction, /DATA DARI PENGGUNA/);
  assert.match(instruction, /ini fakta yang sudah pasti/);
  assert.match(instruction, /Rina Marlina/);
  assert.match(instruction, /Budi Santoso/);
  assert.match(instruction, /2026-07-29/);
  assert.match(instruction, /10:30/);
  // Empty fields are not listed as facts.
  assert.doesNotMatch(instruction, /Tempat: *\n/);
});

test("the writing stance asks for a finished document, not a photo caption", () => {
  const instruction = buildTemplateInstruction({
    template: getTemplate("activity-report"),
    language: "id",
    values: completeValues(getTemplate("activity-report")),
  });
  assert.match(instruction, /SIAP KIRIM, bukan deskripsi foto/);
  assert.match(instruction, /BOLEH menambahkan konteks dan asumsi/);
  // The checkable specifics stay off limits.
  assert.match(instruction, /YANG TETAP DILARANG dikarang/);
  assert.match(instruction, /jumlah peserta/);
});

test("a summary is the one template forbidden from adding assumptions", () => {
  const instruction = buildTemplateInstruction({
    template: getTemplate("summary"),
    language: "id",
    values: {},
  });
  assert.match(instruction, /TIDAK boleh menambahkan asumsi/);
});

test("the document must not mention the app or the template", () => {
  const instruction = buildTemplateInstruction({
    template: getTemplate("activity-report"),
    language: "id",
    values: completeValues(getTemplate("activity-report")),
  });
  assert.match(instruction, /Jangan pernah menyebut aplikasi ini/);
});

test("slot labels are passed through as definitive", () => {
  const template = getTemplate("before-after");
  const instruction = buildTemplateInstruction({
    template,
    language: "id",
    values: completeValues(template),
    attachments: [{ slot: "before" }, { slot: "after" }, { slot: "after" }],
  });
  assert.match(instruction, /BEFORE: 1/);
  assert.match(instruction, /AFTER: 2/);
  assert.match(instruction, /label itu sebagai penentu/);
});

test("each template produces a visibly different contract", () => {
  const built = templates.map((template) =>
    buildTemplateInstruction({ template, language: "id", values: completeValues(template) })
  );
  assert.equal(new Set(built).size, built.length, "two templates produced identical instructions");

  const activity = built[templates.findIndex((t) => t.id === "activity-report")];
  const beforeAfter = built[templates.findIndex((t) => t.id === "before-after")];
  assert.match(activity, /## Uraian Pelaksanaan/);
  assert.doesNotMatch(activity, /Kondisi Sebelum/);
  assert.match(beforeAfter, /## Kondisi Sebelum/);
  assert.doesNotMatch(beforeAfter, /Uraian Pelaksanaan/);
});

test("English is a full translation, not a fallback to Indonesian", () => {
  const template = getTemplate("meeting-minutes");
  const instruction = buildTemplateInstruction({
    template,
    language: "en",
    values: completeValues(template),
  });
  assert.match(instruction, /MEETING MINUTES/);
  assert.match(instruction, /## Action Items/);
  assert.match(instruction, /SUPPLIED DATA/);
  assert.match(instruction, /READY TO SEND/);
  assert.doesNotMatch(instruction, /BAGIAN WAJIB|DATA DARI PENGGUNA/);
});

test("spreadsheet templates ask for tables and forbid invented arithmetic", () => {
  for (const id of ["recap-sheet", "table-extract", "attendance-list", "action-items"]) {
    const template = getTemplate(id);
    assert.ok(template.outputs.includes("xlsx"), `${id} cannot export a spreadsheet`);
    const instruction = buildTemplateInstruction({ template, language: "id", values: completeValues(template) });
    assert.match(instruction, /tabel Markdown/i, `${id} does not ask for a table`);
  }
  assert.match(
    buildTemplateInstruction({ template: getTemplate("recap-sheet"), language: "id", values: {} }),
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
  ].join("\n");
  assert.equal(sanitizeReadyDocument(output, template.profile), output);
});

test("a custom template can define its own fields", () => {
  const custom = normalizeCustomTemplate({
    name: "Laporan Piket",
    instruction: "Susun laporan piket harian dari foto buku jaga.",
    sections: "1. Waktu Piket\n- Kejadian\n## Serah Terima",
    fields: "Nama Petugas*\nTanggal | date\nShift",
    needsAttachment: true,
  });

  assert.deepEqual(custom.sections.id, ["Waktu Piket", "Kejadian", "Serah Terima"]);
  assert.deepEqual(
    custom.input.fields.map((f) => [localized(f.label, "id"), f.type, Boolean(f.required)]),
    [
      ["Nama Petugas", "text", true],
      ["Tanggal", "date", false],
      ["Shift", "text", false],
    ]
  );
  assert.equal(custom.input.fields[1].autofill, "today");

  const photo = [{ name: "a.jpg", type: "image/jpeg" }];
  assert.equal(validateTemplateInput(custom, { attachments: photo, values: {} })?.field, "f1");
  assert.equal(
    validateTemplateInput(custom, { attachments: photo, values: { f1: "Rina" } }),
    null
  );

  const instruction = buildTemplateInstruction({
    template: custom,
    language: "id",
    values: { f1: "Rina" },
    attachments: photo,
  });
  assert.match(instruction, /LAPORAN PIKET/);
  assert.match(instruction, /## Serah Terima/);
  assert.match(instruction, /Nama Petugas: Rina/);
});

test("a custom template reloaded from storage keeps its name", () => {
  const reloaded = normalizeCustomTemplate({
    id: "custom-template-1",
    title: "Notulen Rapat Bidang",
    instruction: "Susun notulen.",
  });
  assert.equal(localized(reloaded.name, "id"), "Notulen Rapat Bidang");
  assert.equal(reloaded.id, "custom:custom-template-1");
});

test("the gallery groups every template without losing any", () => {
  const grouped = groupTemplates();
  const total = grouped.reduce((sum, entry) => sum + entry.templates.length, 0);
  assert.equal(total, templates.length, "a template belongs to no known group");
});
