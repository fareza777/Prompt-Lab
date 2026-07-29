/**
 * Template engine.
 *
 * A template is the whole recipe — accepted attachments, the instruction the
 * model receives, the sections it must fill, target length, and the file types
 * the result can be exported as. The old flow guessed a profile from the words
 * the user typed; here the user picks the job first, so nothing is guessed.
 *
 * Custom templates the user writes go through the same shape, which is why the
 * builder never reads anything not present on a normalised template.
 */

import { WORK_TEMPLATES, TEMPLATE_GROUPS, VISUAL_HONESTY_CLAUSE } from "./workTemplateDefinitions.js";

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

/**
 * Why a template cannot run yet, or null when it can.
 *
 * Returns a reason code rather than a message so the caller can translate it;
 * `need` carries the count so "at least 2 photos" can be phrased naturally.
 */
export function validateTemplateInput(template, { attachments = [], note = "" } = {}) {
  if (!template) return { code: "unknown_template" };

  const spec = template.input?.attachments || { kinds: [], min: 0, max: 0 };
  const min = spec.min || 0;
  const max = spec.max || 0;
  const kinds = spec.kinds || [];
  const typed = String(note || "").trim();

  const usable = attachments.filter((file) => kinds.includes(classifyAttachment(file)));

  if (usable.length < min) {
    return { code: kinds[0] === "image" ? "need_images" : "need_files", need: min, have: usable.length };
  }
  if (max && attachments.length > max) return { code: "too_many", max };

  const noteMode = template.input?.note?.mode || "optional";
  if (noteMode === "required" && !typed) return { code: "need_note" };
  // A source is still required overall: a fallback note stands in for the
  // attachment a min of 0 made optional.
  if (noteMode === "fallback" && !typed && usable.length === 0) return { code: "need_source" };

  return null;
}

function sectionDirective(template, language) {
  const sections = template.sections?.[lang(language)] || template.sections?.id || [];
  if (!sections.length) return "";
  const list = sections.map((title) => `## ${title}`).join("\n");
  return lang(language) === "en"
    ? `\nREQUIRED SECTIONS — use exactly these headings, in this order, and omit any section the source genuinely cannot support rather than filling it with padding:\n${list}\n`
    : `\nBAGIAN WAJIB — pakai persis heading ini, dengan urutan ini, dan hilangkan bagian yang benar-benar tidak didukung sumber daripada diisi tempelan:\n${list}\n`;
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
    ? `\nReturn only the finished document — never the instruction, planning commentary, "Purpose:" lines under headings, a quality checklist, or trailing assumption notes. Keep names, dates, numbers, and terminology consistent. Use Markdown headings, lists, and tables so the Office export keeps the hierarchy.`
    : `\nKembalikan hanya dokumen jadi — bukan instruksi, komentar perencanaan, baris "Tujuan:" di bawah heading, daftar periksa kualitas, atau catatan asumsi di akhir. Jaga konsistensi nama, tanggal, angka, dan istilah. Gunakan heading, daftar, dan tabel Markdown agar hierarki tetap terjaga saat diekspor ke Office.`;
}

/**
 * The complete instruction for one run.
 *
 * @param {object} options
 * @param {object} options.template   a built-in or normalised custom template
 * @param {string} [options.language] "id" | "en"
 * @param {string} [options.note]     the user's typed context
 * @param {number} [options.attachmentCount]
 * @returns {string}
 */
export function buildTemplateInstruction({
  template,
  language = "id",
  note = "",
  attachmentCount = 0,
} = {}) {
  if (!template) return "";
  const l = lang(language);
  const typed = String(note || "").trim();

  const head =
    l === "en"
      ? `TEMPLATE: ${localized(template.name, l).toUpperCase()}\nProduce this deliverable and nothing else.`
      : `TEMPLATE: ${localized(template.name, l).toUpperCase()}\nHasilkan dokumen ini saja, tidak yang lain.`;

  const context = typed
    ? l === "en"
      ? `\nUSER CONTEXT (authoritative — it outranks anything you infer from the attachment):\n${typed}\n`
      : `\nKONTEKS DARI PENGGUNA (mengikat — lebih dipercaya daripada apa pun yang kamu simpulkan dari lampiran):\n${typed}\n`
    : "";

  const attachmentNote = attachmentCount
    ? l === "en"
      ? `\n${attachmentCount} file(s) attached. ${VISUAL_HONESTY_CLAUSE.en}\n`
      : `\n${attachmentCount} berkas dilampirkan. ${VISUAL_HONESTY_CLAUSE.id}\n`
    : "";

  return [
    head,
    "",
    localized(template.prompt, l),
    context,
    attachmentNote,
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
 * The editor collects four things; everything else takes a safe default so the
 * builder above never has to special-case custom entries.
 */
export function normalizeCustomTemplate(raw = {}) {
  const sections = String(raw.sections || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*#\d.)\s]+/, "").trim())
    .filter(Boolean);
  const needsAttachment = raw.needsAttachment !== false;
  // The stored library normalises records to `title`, so a template reloaded
  // from storage arrives without `name` and would render as "Template".
  const name = String(raw.name || raw.title || "Template");

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
      note: { mode: needsAttachment ? "optional" : "required" },
    },
    length: { words: [400, 800], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: { id: sections, en: sections },
    prompt: { id: String(raw.instruction || ""), en: String(raw.instruction || "") },
  };
}
