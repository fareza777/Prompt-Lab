/**
 * Template engine.
 *
 * A template is the whole recipe — the fields it asks for, the attachments it
 * accepts, the instruction the model receives, the sections it must fill,
 * target length, and the file types the result can be exported as.
 *
 * The fields are what make a document usable without editing afterwards. A
 * photograph cannot say what a meeting was called or who handed what to whom,
 * so the template asks for those few facts and the builder passes them to the
 * model as established truth rather than as a hint.
 *
 * Custom templates the user writes go through the same shape, which is why the
 * builder never reads anything not present on a normalised template.
 */

import {
  WORK_TEMPLATES,
  TEMPLATE_GROUPS,
  WRITING_STANCE_CLAUSE,
} from "./workTemplateDefinitions.js";

export { TEMPLATE_GROUPS };

const BY_ID = new Map(WORK_TEMPLATES.map((template) => [template.id, template]));

const IMAGE_EXTENSIONS = /\.(?:png|jpe?g|gif|webp|bmp|heic|heif|avif)$/i;
const ACCEPT = {
  image: "image/*",
  document: ".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls,.ppt,.pptx",
};

const lang = (language) => (language === "en" ? "en" : "id");

/** Reads a localised `{id, en}` field, falling back to Indonesian. */
export function localized(field, language) {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang(language)] || field.id || field.en || "";
}

export function listTemplates() {
  return WORK_TEMPLATES;
}

export function getTemplate(id) {
  return BY_ID.get(String(id || "")) || null;
}

/** Groups templates for the gallery while keeping catalogue order within each. */
export function groupTemplates(templates = WORK_TEMPLATES) {
  return TEMPLATE_GROUPS.map((group) => ({
    group,
    templates: templates.filter((template) => template.group === group),
  })).filter((entry) => entry.templates.length > 0);
}

export function templateFields(template) {
  return template?.input?.fields || [];
}

/**
 * The field whose answer names the document.
 *
 * The first required text field is the subject by construction: every template
 * asks "what activity", "what meeting", "what is being handed over" before it
 * asks anything else. That answer is what a person recognises in a calendar
 * weeks later, and what the downloaded file should be called.
 */
export function templateSubjectField(template) {
  const fields = templateFields(template);
  const isText = (field) => field.type === "text" || field.type === "textarea";
  const required = fields.find((field) => field.required && isText(field));
  return (required || fields.find(isText))?.id || "";
}

/** Labelled upload slots, or null when the template takes one plain pile. */
export function templateSlots(template) {
  const slots = template?.input?.attachments?.slots;
  return Array.isArray(slots) && slots.length ? slots : null;
}

/** "image" or "document", from a File, a stored attachment, or a filename. */
export function classifyAttachment(file) {
  const type = String(file?.type || file?.mimeType || "");
  if (type.startsWith("image/")) return "image";
  const name = String(file?.name || file || "");
  return IMAGE_EXTENSIONS.test(name) ? "image" : "document";
}

/** The `accept` attribute for a template's file input. */
export function acceptFor(template) {
  const kinds = template?.input?.attachments?.kinds || ["image", "document"];
  return kinds.map((kind) => ACCEPT[kind]).filter(Boolean).join(",");
}

const pad = (value) => String(value).padStart(2, "0");

/**
 * Starting values, with date and time fields already filled in.
 *
 * Pre-filling is the difference between a document that is ready and one the
 * user has to go and correct: almost every report is written on the day, and
 * typing today's date by hand is the step people skip.
 *
 * @param {object} template
 * @param {Date} [nowDate] injected so the behaviour is testable
 */
export function defaultFieldValues(template, nowDate = new Date()) {
  const values = {};
  for (const field of templateFields(template)) {
    if (field.autofill === "today") {
      values[field.id] = `${nowDate.getFullYear()}-${pad(nowDate.getMonth() + 1)}-${pad(nowDate.getDate())}`;
    } else if (field.autofill === "now") {
      values[field.id] = `${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}`;
    } else {
      values[field.id] = "";
    }
  }
  return values;
}

const filled = (values, id) => String(values?.[id] ?? "").trim();

/**
 * Why a template cannot run yet, or null when it can.
 *
 * Returns a reason code plus the offending field so the caller can translate
 * the message and point at the right input.
 */
export function validateTemplateInput(template, { attachments = [], values = {} } = {}) {
  if (!template) return { code: "unknown_template" };

  const spec = template.input?.attachments || { kinds: [], min: 0, max: 0 };
  const min = spec.min || 0;
  const max = spec.max || 0;
  const kinds = spec.kinds || [];

  const usable = attachments.filter((file) => kinds.includes(classifyAttachment(file)));

  const slots = templateSlots(template);
  if (slots) {
    // Each labelled slot needs at least one photo, or the document cannot say
    // which condition is which.
    for (const slot of slots) {
      const inSlot = attachments.filter((file) => file.slot === slot.id);
      if (!inSlot.length) return { code: "need_slot", slot: slot.id, label: slot.label };
    }
  } else if (usable.length < min) {
    return { code: kinds[0] === "image" ? "need_images" : "need_files", need: min, have: usable.length };
  }

  if (max && attachments.length > max) return { code: "too_many", max };

  for (const field of templateFields(template)) {
    if (field.required && !filled(values, field.id)) {
      return { code: "need_field", field: field.id, label: field.label };
    }
    // A "fallback" field stands in for the attachment a min of 0 made optional.
    if (field.mode === "fallback" && !filled(values, field.id) && usable.length === 0) {
      return { code: "need_source", field: field.id, label: field.label };
    }
  }

  return null;
}

function sectionDirective(template, language) {
  const sections = template.sections?.[lang(language)] || template.sections?.id || [];
  if (!sections.length) return "";
  const list = sections.map((title) => `## ${title}`).join("\n");
  return lang(language) === "en"
    ? `\nREQUIRED SECTIONS — use exactly these headings, in this order, under a single "# " document title of your own:\n${list}\n`
    : `\nBAGIAN WAJIB — pakai persis heading ini, dengan urutan ini, di bawah satu judul dokumen "# " yang kamu susun sendiri:\n${list}\n`;
}

function lengthDirective(template, language) {
  const [min, max] = template.length?.words || [0, 0];
  if (!min || !max) return "";
  const pages = template.length?.pages;
  return lang(language) === "en"
    ? `\nLENGTH: about ${min}–${max} words${pages ? ` (roughly ${pages} page${pages > 1 ? "s" : ""})` : ""}. Stop when the job is done; do not pad to reach the count.`
    : `\nPANJANG: sekitar ${min}–${max} kata${pages ? ` (kira-kira ${pages} halaman)` : ""}. Berhenti begitu pekerjaannya selesai; jangan ditambah-tambahi demi mengejar jumlah kata.`;
}

function universalDirective(language, template) {
  if (template.profile === "prompt") {
    return lang(language) === "en"
      ? `\nReturn only the blocks described above, with nothing before or after them.`
      : `\nKembalikan hanya blok yang diminta di atas, tanpa teks apa pun sebelum atau sesudahnya.`;
  }
  return lang(language) === "en"
    ? `\nReturn only the finished document — never the instruction, planning commentary, "Purpose:" lines under headings, a quality checklist, or trailing assumption notes. Never mention this app, the template, or that a model wrote the document. Use Markdown headings, lists, and tables so the Office export keeps the hierarchy.`
    : `\nKembalikan hanya dokumen jadi — bukan instruksi, komentar perencanaan, baris "Tujuan:" di bawah heading, daftar periksa kualitas, atau catatan asumsi di akhir. Jangan pernah menyebut aplikasi ini, nama template, atau bahwa dokumen ditulis AI. Gunakan heading, daftar, dan tabel Markdown agar hierarki tetap terjaga saat diekspor ke Office.`;
}

/** The user's answers, written out as facts the model must use verbatim. */
function fieldDirective(template, values, language) {
  const l = lang(language);
  const lines = templateFields(template)
    .map((field) => {
      const value = filled(values, field.id);
      if (!value) return null;
      return `- ${localized(field.label, l)}: ${value}`;
    })
    .filter(Boolean);

  if (!lines.length) return "";
  return l === "en"
    ? `\nSUPPLIED DATA — these are established facts. Use every one of them, verbatim, in the right section. They outrank anything you infer from an attachment:\n${lines.join("\n")}\n`
    : `\nDATA DARI PENGGUNA — ini fakta yang sudah pasti. Pakai semuanya, apa adanya, di bagian yang tepat. Ini mengalahkan apa pun yang kamu simpulkan dari lampiran:\n${lines.join("\n")}\n`;
}

function attachmentDirective(attachments, language) {
  if (!attachments.length) return "";
  const l = lang(language);
  const slotted = attachments.filter((item) => item.slot);
  if (slotted.length) {
    const grouped = slotted.reduce((map, item) => {
      map[item.slot] = (map[item.slot] || 0) + 1;
      return map;
    }, {});
    const summary = Object.entries(grouped)
      .map(([slot, count]) => `${slot.toUpperCase()}: ${count}`)
      .join(", ");
    return l === "en"
      ? `\nAttachments are labelled by the user — ${summary}. Treat those labels as definitive.\n`
      : `\nLampiran sudah diberi label oleh pengguna — ${summary}. Perlakukan label itu sebagai penentu.\n`;
  }
  return l === "en"
    ? `\n${attachments.length} file(s) attached.\n`
    : `\n${attachments.length} berkas dilampirkan.\n`;
}

/**
 * The complete instruction for one run.
 *
 * @param {object} options
 * @param {object} options.template   a built-in or normalised custom template
 * @param {string} [options.language] "id" | "en"
 * @param {object} [options.values]   the user's field answers, keyed by field id
 * @param {Array}  [options.attachments] `[{slot?}]` — only the labels are read
 * @returns {string}
 */
export function buildTemplateInstruction({
  template,
  language = "id",
  values = {},
  attachments = [],
} = {}) {
  if (!template) return "";
  const l = lang(language);

  const head =
    l === "en"
      ? `TEMPLATE: ${localized(template.name, l).toUpperCase()}\nProduce this deliverable and nothing else.`
      : `TEMPLATE: ${localized(template.name, l).toUpperCase()}\nHasilkan dokumen ini saja, tidak yang lain.`;

  return [
    head,
    "",
    localized(template.prompt, l),
    fieldDirective(template, values, l),
    attachmentDirective(attachments, l),
    // The stance goes last of the content rules so it colours everything above.
    template.profile === "prompt" ? "" : `\n${WRITING_STANCE_CLAUSE[l]}\n`,
    sectionDirective(template, l),
    lengthDirective(template, l),
    universalDirective(l, template),
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Turns a user-written template into the same shape as a built-in one.
 *
 * The editor collects a name, an instruction, the document sections, and any
 * fields the user wants to be asked for; everything else takes a safe default
 * so the builder above never has to special-case custom entries.
 */
export function normalizeCustomTemplate(raw = {}) {
  const lines = (value) =>
    String(value || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-*#\d.)\s]+/, "").trim())
      .filter(Boolean);

  const sections = lines(raw.sections);
  const needsAttachment = raw.needsAttachment !== false;
  // The stored library normalises records to `title`, so a template reloaded
  // from storage arrives without `name` and would render as "Template".
  const name = String(raw.name || raw.title || "Template");

  /**
   * Fields are written one per line, optionally "Label*" to mark it required
   * and "Label | date" to pick a type. Anything more elaborate would need a
   * form builder, which is more than the editor is worth.
   */
  const fields = lines(raw.fields).map((line, index) => {
    const [rawLabel, rawType] = line.split("|").map((part) => part.trim());
    const required = rawLabel.endsWith("*");
    const label = required ? rawLabel.slice(0, -1).trim() : rawLabel;
    const type = ["text", "textarea", "date", "time"].includes(rawType) ? rawType : "text";
    return {
      id: `f${index + 1}`,
      type,
      required,
      label: { id: label, en: label },
      autofill: type === "date" ? "today" : type === "time" ? "now" : undefined,
    };
  });

  return {
    id: `custom:${raw.id || name}`,
    custom: true,
    group: "utility",
    icon: "FileText",
    profile: "general",
    name: { id: name, en: name },
    blurb: { id: String(raw.blurb || ""), en: String(raw.blurb || "") },
    input: {
      attachments: {
        kinds: ["image", "document"],
        min: needsAttachment ? 1 : 0,
        max: 10,
      },
      fields: fields.length
        ? fields
        : [
            {
              id: "notes",
              type: "textarea",
              label: { id: "Catatan", en: "Notes" },
              mode: needsAttachment ? undefined : "fallback",
              required: !needsAttachment,
            },
          ],
    },
    length: { words: [400, 800], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: { id: sections, en: sections },
    prompt: { id: String(raw.instruction || ""), en: String(raw.instruction || "") },
  };
}
