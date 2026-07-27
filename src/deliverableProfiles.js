import { repairMermaidDocument } from "./mermaidRender.js";

const PROFILE_SIGNALS = [
  ["diagram", /\b(diagram|mermaid|flowchart|bagan|mindmap|sequence\s*diagram|alur\s*(kerja|proses|sistem))\b/i],
  ["minutes", /\b(notulen|minutes of meeting|meeting minutes|berita acara rapat|catatan rapat)\b/i],
  ["presentation", /\b(ppt|powerpoint|presentasi|slide deck|slides?)\b/i],
  ["sop", /\b(sop|standard operating procedure|prosedur operasional)\b/i],
  ["proposal", /\b(proposal|usulan kegiatan|project proposal)\b/i],
  ["analysis", /\b(analisis|analysis|audit|kajian)\b/i],
  ["report", /\b(laporan|report|reporting)\b/i],
];

const CONTRACTS = {
  id: {
    diagram: `Ubah dokumen/lampiran menjadi diagram Mermaid yang siap ditampilkan. Pilih jenis diagram yang paling sesuai (flowchart, sequence, class, ER, atau mindmap). Keluarkan tepat satu blok \`\`\`mermaid ... \`\`\` valid. Boleh menambah judul singkat dan beberapa bullet ringkasan gaya wiki di luar fence. Jangan mengarang entitas yang tidak ada di sumber.`,
    report: `Tulis laporan profesional yang langsung siap dipakai. Gunakan hanya bagian yang relevan: judul dan metadata, ringkasan eksekutif, latar belakang dan tujuan, sumber/metode, temuan berbasis bukti, kesimpulan, serta rekomendasi atau rencana tindak lanjut. Untuk bagian Poin-Poin/Temuan/Rekomendasi, WAJIB pakai bullet Markdown (- ...), bukan nomor berurut yang menyambung antar subbagian. Nomor urut (1. 2. 3.) hanya untuk langkah prosedur. Bedakan fakta dari lampiran, konteks pengguna, dan asumsi. Jangan mengisi bagian dengan basa-basi.`,
    minutes: `Tulis notulen profesional dengan identitas rapat, peserta bila tersedia, agenda, ringkasan pembahasan per agenda, keputusan, tabel tindak lanjut (aksi, penanggung jawab, tenggat, status) hanya jika didukung sumber, hal yang belum selesai, dan tindak lanjut berikutnya. Jangan mengarang nama peserta, tanggal, kutipan, keputusan, penanggung jawab, atau tenggat dari wajah/foto. Gunakan "Belum tersedia" untuk informasi penting yang tidak ada.`,
    presentation: `Tulis deck presentasi sebagai alur cerita: pembuka spesifik, konteks, inti pembahasan, bukti/visual yang relevan, dan penutup berupa keputusan atau rekomendasi. Satu pesan utama per slide, judul slide menyatakan poin, maksimal 6 bullet dan sekitar 45 kata terlihat per slide. Jika panjang tidak ditentukan, targetkan 8–12 slide. Pindahkan detail pendukung ke catatan pembicara.`,
    proposal: `Tulis proposal profesional dengan konteks, masalah, tujuan, ruang lingkup, pendekatan, deliverable, jadwal, tanggung jawab, asumsi, risiko, dan bagian komersial hanya jika diminta.`,
    sop: `Tulis SOP operasional dengan tujuan, ruang lingkup, peran, prasyarat, prosedur bernomor, titik kontrol, pengecualian, rekaman yang disimpan, dan informasi revisi.`,
    analysis: `Tulis analisis dengan temuan utama, metode, bukti, interpretasi, keterbatasan, kesimpulan, dan rekomendasi yang diprioritaskan.`,
    general: `Hasilkan dokumen profesional yang langsung menjawab pekerjaan pengguna, dengan struktur yang diturunkan dari tujuan, hierarki yang jelas, dan langkah berikutnya yang dapat digunakan.`,
  },
  en: {
    diagram: `Turn the attached document into a ready-to-render Mermaid diagram. Choose the best type (flowchart, sequence, class, ER, or mindmap). Emit exactly one valid \`\`\`mermaid ... \`\`\` fence. A short title and a few wiki-style summary bullets outside the fence are optional. Do not invent entities missing from the source.`,
    report: `Write a professional report ready for use. Include only relevant sections: title and metadata, executive summary, background and purpose, sources/method, evidence-based findings, conclusion, and prioritized recommendations or follow-up plan. For Points/Findings/Recommendations sections, MUST use Markdown bullets (- ...), not continuous numbered lists across subsections. Use 1. 2. 3. only for procedural steps. Distinguish attachment evidence, user context, and assumptions. Do not pad sections with boilerplate.`,
    minutes: `Write professional meeting minutes with meeting identity, participants when provided, agenda, discussion summary by item, decisions, and an action table (action, owner, due date, status) only when supported. Include unresolved points and follow-up. Do not invent participant names, dates, quotations, decisions, owners, or deadlines from faces or photos. Use "Not provided" for essential missing details.`,
    presentation: `Write a presentation as a narrative deck: specific opening, context, core argument, relevant evidence or visuals, and a decision/recommendation close. Use one main message per slide, point-led slide titles, no more than six bullets and roughly 45 visible words per slide. If length is unspecified, target 8–12 slides. Put supporting detail in speaker notes.`,
    proposal: `Write a professional proposal with context, problem, objectives, scope, approach, deliverables, timeline, responsibilities, assumptions, risks, and a commercial section only when requested.`,
    sop: `Write an operational SOP with purpose, scope, roles, prerequisites, numbered procedure, controls, exceptions, retained records, and revision information.`,
    analysis: `Write an analysis with executive finding, method, evidence, interpretation, limitations, conclusion, and prioritized recommendations.`,
    general: `Produce professional finished work that directly answers the user's job, derives its structure from the purpose, uses clear hierarchy, and ends with an appropriate next step.`,
  },
};

export function detectDeliverableProfile(input = {}) {
  const haystack = `${input.narrative || ""} ${input.outputType || ""} ${input.content || ""}`;
  return PROFILE_SIGNALS.find(([, pattern]) => pattern.test(haystack))?.[0] || "general";
}

export function buildDeliverableInstruction({ profile = "general", language = "id" } = {}) {
  const lang = language === "en" ? "en" : "id";
  const contract = CONTRACTS[lang][profile] || CONTRACTS[lang].general;
  const universal =
    profile === "diagram"
      ? lang === "en"
        ? `Return only the finished diagram deliverable. Keep the \`\`\`mermaid fence intact. Do not wrap the whole reply in an outer markdown fence. Do not invent unsupported facts.`
        : `Kembalikan hanya hasil diagram jadi. Pertahankan fence \`\`\`mermaid utuh. Jangan bungkus seluruh jawaban dalam fence markdown luar. Jangan mengarang fakta yang tidak didukung.`
      : lang === "en"
        ? `Return only the finished deliverable, never a prompt, instructions, planning commentary, or explanation of how to create it. Preserve names, dates, numbers, and terminology consistently. Do not fabricate unsupported facts. Use useful Markdown headings, lists, and tables so Office export retains the document hierarchy.`
        : `Kembalikan hanya hasil jadi, bukan prompt, instruksi, komentar perencanaan, atau penjelasan cara membuatnya. Jaga konsistensi nama, tanggal, angka, dan istilah. Jangan mengarang fakta yang tidak didukung. Gunakan heading, daftar, dan tabel Markdown yang berguna agar hierarki dokumen tetap rapi saat diekspor ke Office.`;
  return `\n\nPROFESSIONAL DELIVERABLE CONTRACT (${profile.toUpperCase()}):\n${contract}\n${universal}`;
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
  } else {
    cleaned = cleaned
      .replace(/^(?:Here is|Berikut adalah).{0,80}(?:diagram|mermaid).*?\n+/i, "")
      .trim();
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
