import { repairMermaidDocument } from "./mermaidRender.js";
import { sanitizeReadyDocument } from "./readyDocumentSanitize.js";
import { finalizeDiagramDocument } from "./mermaidDelivery.js";

const PROFILE_SIGNALS = [
  ["diagram", /\b(diagram|mermaid|flowchart|bagan|mindmap|sequence\s*diagram|alur\s*(kerja|proses|sistem)|infografis|infographic|process\s*map)\b/i],
  ["minutes", /\b(notulen|minutes of meeting|meeting minutes|berita acara rapat|catatan rapat)\b/i],
  ["presentation", /\b(ppt|powerpoint|presentasi|slide deck|slides?)\b/i],
  ["sop", /\b(sop|standard operating procedure|prosedur operasional)\b/i],
  ["proposal", /\b(proposal|usulan kegiatan|project proposal)\b/i],
  ["analysis", /\b(analisis|analysis|audit|kajian)\b/i],
  ["report", /\b(laporan|report|reporting)\b/i],
];

/** User explicitly asked for a long / exhaustive document. */
export function wantsExpandedDeliverable(text = "") {
  return /\b(lengkap|selengkapnya|mendetail|terperinci|rinci|exhaustive|comprehensive|detailed|in[-\s]?depth|full[-\s]?length|panjang|extended|thorough)\b/i.test(
    String(text || "")
  );
}

const CONTRACTS = {
  id: {
    diagram: `Ubah dokumen/lampiran menjadi INFOGRAFIS ALUR PROSES yang siap ditampilkan. Default RINGKAS: alur utama saja (5–8 langkah, label pendek). WAJIB keluarkan satu blok \`\`\`process berisi JSON {title, steps[{id,label}], edges[{from,to}]}. Judul singkat + 2–4 bullet ringkasan di luar fence. Kata "bagus/cantik/profesional" = jelas & mudah dibaca, BUKAN Mermaid rumit. Jangan mengarang langkah yang tidak ada di sumber. Jangan tulis baris Tujuan atau checklist. Jangan mengandalkan kode Mermaid mentah.`,
    report: `Tulis laporan profesional yang LANGSUNG SIAP DIPAKAI (boleh dikirim ke atasan tanpa edit). Default: RINGKAS — ringkasan eksekutif singkat, temuan utama, analisis pendek, rekomendasi actionable (target ±600–900 kata / setara 1–2 halaman). Pakai bagian relevan saja; skip yang kosong. Untuk Poin/Temuan/Rekomendasi pakai bullet Markdown (- ...), bukan nomor yang menyambung antar subbagian. LARANG menulis baris "Tujuan:" / "Section goal:" di bawah heading. LARANG menambah "Daftar Periksa Kualitas", quality checklist, atau catatan Asumsi scaffolding di akhir. Jika data kurang, tulis singkat di badan laporan tanpa blok meta terpisah. Bedakan fakta dari lampiran dan jangan mengarang.`,
    minutes: `Tulis notulen profesional yang RINGKAS: identitas rapat, peserta bila tersedia, agenda, ringkasan pembahasan per agenda, keputusan, dan tabel tindak lanjut (aksi, penanggung jawab, tenggat, status) hanya jika didukung sumber. Target ±400–700 kata. Jangan mengarang nama peserta, tanggal, kutipan, keputusan, penanggung jawab, atau tenggat dari wajah/foto. Gunakan "Belum tersedia" untuk informasi penting yang tidak ada.`,
    presentation: `Tulis deck presentasi sebagai alur cerita: pembuka spesifik, konteks, inti pembahasan, bukti/visual yang relevan, dan penutup berupa keputusan atau rekomendasi. Satu pesan utama per slide, judul slide menyatakan poin, maksimal 6 bullet dan sekitar 45 kata terlihat per slide. Jika panjang tidak ditentukan, targetkan 8–12 slide. Pindahkan detail pendukung ke catatan pembicara.`,
    proposal: `Tulis proposal profesional yang RINGKAS (target ±600–900 kata): konteks, masalah, tujuan, ruang lingkup, pendekatan, deliverable, jadwal, tanggung jawab, asumsi/risiko singkat, dan bagian komersial hanya jika diminta.`,
    sop: `Tulis SOP operasional yang padat: tujuan, ruang lingkup, peran, prasyarat, prosedur bernomor, titik kontrol, pengecualian, rekaman yang disimpan, dan informasi revisi. Hindari prosa panjang.`,
    analysis: `Tulis analisis RINGKAS (target ±600–900 kata): temuan utama, metode singkat, bukti, interpretasi, keterbatasan, kesimpulan, dan rekomendasi yang diprioritaskan. Utamakan bullet dan tabel ringkas.`,
    general: `Hasilkan dokumen profesional yang langsung menjawab pekerjaan pengguna. Default RINGKAS dan siap pakai: hierarki jelas, bagian relevan saja, hindari pengulangan. Target ±500–800 kata kecuali user meminta lebih panjang.`,
  },
  en: {
    diagram: `Turn the attached document into a READY process-flow infographic. Default CONCISE: main flow only (5–8 short steps). MUST emit one \`\`\`process fence with JSON {title, steps[{id,label}], edges[{from,to}]}. Short title + 2–4 summary bullets outside the fence. Words like "nice/good/professional" mean clear & readable, NOT complex Mermaid. Do not invent steps missing from the source. No Purpose lines or checklists. Do not rely on raw Mermaid.`,
    report: `Write a professional report that is READY TO SEND. Default: CONCISE — short executive summary, key findings, brief analysis, actionable recommendations (about 600–900 words / 1–2 pages). Include only relevant sections; skip empty ones. For Points/Findings/Recommendations use Markdown bullets (- ...), not continuous numbered lists. FORBIDDEN: "Purpose:" / "Section goal:" lines under headings; "Quality Checklist" / review checklist sections; trailing scaffolding "Assumptions:" footnotes. If data is missing, note it briefly in-body without a separate meta block. Do not invent facts.`,
    minutes: `Write CONCISE professional meeting minutes: meeting identity, participants when provided, agenda, discussion summary by item, decisions, and an action table (action, owner, due date, status) only when supported. Target about 400–700 words. Do not invent participant names, dates, quotations, decisions, owners, or deadlines from faces or photos. Use "Not provided" for essential missing details.`,
    presentation: `Write a presentation as a narrative deck: specific opening, context, core argument, relevant evidence or visuals, and a decision/recommendation close. Use one main message per slide, point-led slide titles, no more than six bullets and roughly 45 visible words per slide. If length is unspecified, target 8–12 slides. Put supporting detail in speaker notes.`,
    proposal: `Write a CONCISE professional proposal (about 600–900 words) with context, problem, objectives, scope, approach, deliverables, timeline, responsibilities, brief assumptions/risks, and a commercial section only when requested.`,
    sop: `Write a tight operational SOP with purpose, scope, roles, prerequisites, numbered procedure, controls, exceptions, retained records, and revision information. Avoid long prose.`,
    analysis: `Write a CONCISE analysis (about 600–900 words) with executive finding, brief method, evidence, interpretation, limitations, conclusion, and prioritized recommendations. Prefer bullets and compact tables.`,
    general: `Produce professional finished work that directly answers the user's job. Default CONCISE and ready to use: clear hierarchy, only relevant sections, no repetition. Target about 500–800 words unless the user asked for more.`,
  },
};

function buildLengthDirective({ language = "id", expanded = false, profile = "general" } = {}) {
  if (profile === "presentation") return "";
  const lang = language === "en" ? "en" : "id";
  if (profile === "diagram") {
    if (expanded) {
      return lang === "en"
        ? `LENGTH: User asked for detail — up to 8–12 process steps is fine. Still emit \`\`\`process JSON first; keep Mermaid simple if present.`
        : `PANJANG: User meminta detail — boleh 8–12 langkah process. Tetap keluarkan \`\`\`process JSON dulu; Mermaid jika ada harus sederhana.`;
    }
    return lang === "en"
      ? `LENGTH (system default): CONCISE diagram — 5–8 main steps, 2–4 summary bullets, no long narrative, no complex Mermaid. "Nice/good" means clear, not elaborate.`
      : `PANJANG (default sistem): Diagram RINGKAS — 5–8 langkah utama, 2–4 bullet ringkasan, tanpa narasi panjang, tanpa Mermaid rumit. "Bagus" artinya jelas, bukan rumit.`;
  }
  if (expanded) {
    return lang === "en"
      ? `LENGTH: The user asked for a detailed/complete version — cover needed sections thoroughly, but still avoid filler and stop once the job is done.`
      : `PANJANG: User meminta versi lengkap/detail — bahas bagian yang perlu secara tuntas, tapi tetap tanpa filler dan berhenti begitu pekerjaan selesai.`;
  }
  return lang === "en"
    ? `LENGTH (system default): Keep this deliverable concise so it finishes in one response. Prefer short sections and bullets over long prose. Do NOT write an exhaustive encyclopedia version unless the user asked for lengkap/detailed/comprehensive.`
    : `PANJANG (default sistem): Buat dokumen RINGKAS agar selesai dalam satu respons. Utamakan bagian pendek dan bullet, bukan prosa panjang. JANGAN menulis versi ensiklopedia kecuali user meminta lengkap/detail/terperinci.`;
}

export function detectDeliverableProfile(input = {}) {
  const haystack = `${input.narrative || ""} ${input.outputType || ""} ${input.content || ""}`;
  return PROFILE_SIGNALS.find(([, pattern]) => pattern.test(haystack))?.[0] || "general";
}

export function buildDeliverableInstruction({
  profile = "general",
  language = "id",
  narrative = "",
  content = "",
} = {}) {
  const lang = language === "en" ? "en" : "id";
  const contract = CONTRACTS[lang][profile] || CONTRACTS[lang].general;
  const expanded = wantsExpandedDeliverable(`${narrative} ${content}`);
  const lengthDirective = buildLengthDirective({ language: lang, expanded, profile });
  const universal =
    profile === "diagram"
      ? lang === "en"
        ? `Return only the finished diagram deliverable. Prefer the \`\`\`process JSON fence. Keep any Mermaid fence simple. Do not wrap the whole reply in an outer markdown fence. Do not invent unsupported facts.`
        : `Kembalikan hanya hasil diagram jadi. Utamakan fence \`\`\`process JSON. Jika ada Mermaid, buat sederhana. Jangan bungkus seluruh jawaban dalam fence markdown luar. Jangan mengarang fakta yang tidak didukung.`
      : lang === "en"
        ? `Return only the finished deliverable, never a prompt, instructions, planning commentary, section-purpose blurbs, quality checklists, or explanation of how to create it. Preserve names, dates, numbers, and terminology consistently. Do not fabricate unsupported facts. Use useful Markdown headings, lists, and tables so Office export retains the document hierarchy.`
        : `Kembalikan hanya hasil jadi, bukan prompt, instruksi, komentar perencanaan, baris tujuan per bagian, quality checklist, atau penjelasan cara membuatnya. Jaga konsistensi nama, tanggal, angka, dan istilah. Jangan mengarang fakta yang tidak didukung. Gunakan heading, daftar, dan tabel Markdown yang berguna agar hierarki dokumen tetap rapi saat diekspor ke Office.`;
  return `\n\nPROFESSIONAL DELIVERABLE CONTRACT (${profile.toUpperCase()}):\n${contract}\n${lengthDirective}\n${universal}`;
}

export function validateFinishedOutput(content = "", profile = "general") {
  const warnings = [];
  let cleaned = String(content || "").trim();
  if (profile !== "diagram") {
    cleaned = cleaned
      .replace(/^```(?:markdown|md|text|plaintext)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .replace(/^(?:Here is|Berikut adalah).{0,60}(?:prompt|instruksi).*?\n+/i, "")
      .trim();
    cleaned = sanitizeReadyDocument(cleaned, profile);
  } else {
    cleaned = cleaned
      .replace(/^(?:Here is|Berikut adalah).{0,80}(?:diagram|mermaid|process).*?\n+/i, "")
      .trim();
    cleaned = finalizeDiagramDocument(cleaned, "id");
    cleaned = repairMermaidDocument(cleaned);
  }

  const headings = cleaned
    .split(/\r?\n/)
    .map((line) => line.match(/^#{1,6}\s+(.+?)\s*$/)?.[1]?.trim().toLowerCase())
    .filter(Boolean);
  if (profile !== "diagram" && new Set(headings).size < headings.length) warnings.push("repeated_heading");
  if (/^#{1,6}\s*$/m.test(cleaned)) warnings.push("empty_heading");
  if (/\|\s*\n\s*\|/m.test(cleaned)) warnings.push("malformed_table");
  if (/(.{30,})(?:\n+\1){2,}/i.test(cleaned)) warnings.push("repeated_block");
  if (/(?:^|\n)\s*(?:prompt|instruksi internal)\s*:/i.test(cleaned)) warnings.push("prompt_leakage");
  if (profile === "diagram" && !/```process/i.test(cleaned) && !/```mermaid/i.test(cleaned)) {
    warnings.push("missing_process_or_mermaid");
  }
  if (profile === "diagram" && !/```mermaid/i.test(cleaned)) warnings.push("missing_mermaid_fence");
  if (
    profile === "diagram" &&
    /```mermaid/i.test(cleaned) &&
    !/^(?:flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|mindmap|timeline|gitGraph|pie|graph)\b/im.test(
      String(cleaned.match(/```mermaid\s*([\s\S]*?)```/i)?.[1] || "").trim()
    )
  ) {
    warnings.push("missing_mermaid_type");
  }

  return { content: cleaned, warnings, valid: cleaned.length > 0, profile };
}
