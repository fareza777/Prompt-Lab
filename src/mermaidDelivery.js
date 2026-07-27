/**
 * Document → process-flow diagram delivery.
 * Prefer a ```process JSON fence (reliable infographic). Mermaid is generated
 * deterministically from those steps so Android layout bugs are avoided.
 * Default is CONCISE (main flow only) — "bagus" means clear, not complex.
 */

import { ensureProcessDiagramDocument, extractProcessFlow } from "./processFlow.js";

const DIAGRAM_SIGNAL =
  /\b(mermaid|flowchart|sequence\s*diagram|class\s*diagram|er\s*diagram|mindmap|diagram|bagan|skema|infografis|infographic|wiki\s*diagram|peta\s*proses|process\s*map|flow\s*chart|alur\s*(kerja|proses|sistem|bisnis))\b/i;

function wantsExpandedDiagram(text = "") {
  return /\b(lengkap|selengkapnya|mendetail|terperinci|rinci|exhaustive|comprehensive|detailed|in[-\s]?depth|full[-\s]?length|panjang|extended|thorough)\b/i.test(
    String(text || "")
  );
}

export function detectDiagramIntent(payload = {}) {
  if (/^diagram$/i.test(String(payload.outputType || "").trim())) return true;
  const text = `${payload.narrative || ""} ${payload.category || ""} ${payload.outputType || ""}`;
  return DIAGRAM_SIGNAL.test(text);
}

function section(title, lines) {
  return [`<${title}>`, ...lines.map((line) => `  ${line}`), `</${title}>`].join("\n");
}

export function buildMermaidDeliveryInstruction(langCode = "id", { expanded = false } = {}) {
  const id = langCode === "id";
  const stepRange = expanded ? "8–12" : "5–8";
  return section("process_diagram", [
    id
      ? "Deliverable: INFOGRAFIS ALUR PROSES dari dokumen — siap tampil, bukan prompt, bukan kode Mermaid mentah."
      : "Deliverable: PROCESS-FLOW INFOGRAPHIC from the document — ready to display, not a prompt, not raw Mermaid code.",
    id
      ? "Sumber: teks lampiran saja. Jangan mengarang langkah yang tidak ada di dokumen."
      : "Source: attachment text only. Do not invent steps absent from the document.",
    id
      ? `DEFAULT RINGKAS: fokus alur utama saja (${stepRange} langkah). Kata seperti "bagus/cantik/profesional" artinya jelas & mudah dibaca — BUKAN diagram rumit atau panjang.`
      : `DEFAULT CONCISE: main workflow only (${stepRange} steps). Words like "nice/good/professional" mean clear & readable — NOT a complex or dense diagram.`,
    id
      ? `WAJIB keluarkan SATU blok \`\`\`process berisi JSON valid: {"title":"...","steps":[{"id":"S1","label":"..."},{"id":"S2","label":"..."}],"edges":[{"from":"S1","to":"S2"}]}. Maksimal ${stepRange} langkah, label pendek (<=8 kata).`
      : `MUST emit ONE \`\`\`process fence with valid JSON: {"title":"...","steps":[{"id":"S1","label":"..."}],"edges":[{"from":"S1","to":"S2"}]}. At most ${stepRange} short steps (<=8 words each).`,
    id
      ? "Urutan steps mengikuti alur dokumen (mulai → proses → selesai). edges linear S1→S2→… jika dokumen berurutan."
      : "Order steps as the document flow (start → process → end). Linear edges S1→S2→… are fine for sequential docs.",
    id
      ? "Di luar fence: judul singkat (# ...) + 2–4 bullet ringkasan saja. Jangan narasi panjang, jangan 'Tujuan:', jangan checklist."
      : "Outside the fence: short title (# ...) + 2–4 summary bullets only. No long prose, no 'Purpose:' lines, no checklists.",
    id
      ? "JANGAN keluarkan Mermaid rumit (subgraph, style, kelas, banyak cabang). Aplikasi akan menggambar bagan dari process JSON. Jika menambah ```mermaid, cukup flowchart TD linear dengan label dikutip — opsional."
      : "Do NOT emit complex Mermaid (subgraphs, styles, classes, many branches). The app draws the chart from process JSON. If adding ```mermaid, keep a simple linear flowchart TD with quoted labels — optional.",
    id
      ? "Jika dokumen kosong: process JSON dengan 2 langkah 'Sumber tidak tersedia' → 'Tidak ada alur'."
      : "If the document is empty: process JSON with 2 steps 'Source unavailable' → 'No flow'.",
    expanded
      ? id
        ? "User meminta detail/lengkap: boleh sampai 12 langkah, tetap process JSON dulu, tetap hindari Mermaid rumit."
        : "User asked for detail: up to 12 steps is fine, still process JSON first, still avoid complex Mermaid."
      : id
        ? "Jangan kembalikan hanya kode Mermaid tanpa ```process — itu sering gagal di perangkat."
        : "Never return Mermaid-only without ```process — that often fails on devices.",
  ]);
}

export function buildMermaidDeliveryAddon(payload = {}) {
  if (!detectDiagramIntent(payload)) return "";
  const expanded = wantsExpandedDiagram(
    `${payload.narrative || ""} ${payload.category || ""} ${payload.outputType || ""}`
  );
  return buildMermaidDeliveryInstruction(payload.outputLanguage || "id", { expanded });
}

export function defaultDiagramNarrative(langCode = "id") {
  return langCode === "en"
    ? "Turn the attached document into a clear, concise process-flow infographic of the main workflow, plus a short summary."
    : "Ubah dokumen terlampir menjadi infografis alur proses yang ringkas dan jelas untuk alur utamanya, plus ringkasan singkat.";
}

/** Post-process diagram outputs so process JSON drives a valid Mermaid fence. */
export function finalizeDiagramDocument(markdown = "", langCode = "id") {
  const ensured = ensureProcessDiagramDocument(markdown, langCode);
  if (extractProcessFlow(ensured)) return ensured;
  return String(markdown || "").trim();
}
