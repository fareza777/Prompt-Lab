/**
 * Document → process-flow diagram delivery.
 * Prefer a ```process JSON fence (reliable infographic). Mermaid is generated
 * deterministically from those steps so Android layout bugs are avoided.
 */

import { ensureProcessDiagramDocument, extractProcessFlow } from "./processFlow.js";

const DIAGRAM_SIGNAL =
  /\b(mermaid|flowchart|sequence\s*diagram|class\s*diagram|er\s*diagram|mindmap|diagram|bagan|skema|infografis|infographic|wiki\s*diagram|peta\s*proses|process\s*map|flow\s*chart|alur\s*(kerja|proses|sistem|bisnis))\b/i;

export function detectDiagramIntent(payload = {}) {
  if (/^diagram$/i.test(String(payload.outputType || "").trim())) return true;
  const text = `${payload.narrative || ""} ${payload.category || ""} ${payload.outputType || ""}`;
  return DIAGRAM_SIGNAL.test(text);
}

function section(title, lines) {
  return [`<${title}>`, ...lines.map((line) => `  ${line}`), `</${title}>`].join("\n");
}

export function buildMermaidDeliveryInstruction(langCode = "id") {
  const id = langCode === "id";
  return section("process_diagram", [
    id
      ? "Deliverable: INFOGRAFIS ALUR PROSES dari dokumen — siap tampil, bukan prompt."
      : "Deliverable: PROCESS-FLOW INFOGRAPHIC from the document — ready to display, not a prompt.",
    id
      ? "Sumber: teks lampiran saja. Jangan mengarang langkah yang tidak ada di dokumen."
      : "Source: attachment text only. Do not invent steps absent from the document.",
    id
      ? "WAJIB keluarkan SATU blok ```process berisi JSON valid dengan bentuk: {\"title\":\"...\",\"steps\":[{\"id\":\"S1\",\"label\":\"...\"},{\"id\":\"S2\",\"label\":\"...\"}],\"edges\":[{\"from\":\"S1\",\"to\":\"S2\"}]}. Maksimal 8–12 langkah, label pendek (<=12 kata)."
      : "MUST emit ONE ```process fence with valid JSON: {\"title\":\"...\",\"steps\":[{\"id\":\"S1\",\"label\":\"...\"}],\"edges\":[{\"from\":\"S1\",\"to\":\"S2\"}]}. At most 8–12 short steps.",
    id
      ? "Urutan steps mengikuti alur dokumen (mulai → proses → selesai). edges boleh diisi linear S1→S2→… jika dokumen berurutan."
      : "Order steps as the document flow (start → process → end). Linear edges S1→S2→… are fine for sequential docs.",
    id
      ? "Opsional: judul Markdown (# ...) dan 2–5 bullet ringkasan di luar fence. Jangan tulis 'Tujuan:' atau checklist."
      : "Optional: Markdown title (# ...) and 2–5 summary bullets outside fences. No 'Purpose:' lines or checklists.",
    id
      ? "JANGAN mengandalkan Mermaid mentah yang rumit. Jika menambah ```mermaid, cukup flowchart TD sederhana dengan label dikutip."
      : "Do NOT rely on complex raw Mermaid. If adding ```mermaid, keep a simple flowchart TD with quoted labels.",
    id
      ? "Jika dokumen kosong: process JSON dengan 2 langkah 'Sumber tidak tersedia' → 'Tidak ada alur'."
      : "If the document is empty: process JSON with 2 steps 'Source unavailable' → 'No flow'.",
  ]);
}

export function buildMermaidDeliveryAddon(payload = {}) {
  if (!detectDiagramIntent(payload)) return "";
  return buildMermaidDeliveryInstruction(payload.outputLanguage || "id");
}

export function defaultDiagramNarrative(langCode = "id") {
  return langCode === "en"
    ? "Turn the attached document into a clear process-flow infographic of the main workflow, plus a short summary."
    : "Ubah dokumen terlampir menjadi infografis alur proses yang jelas untuk alur utamanya, plus ringkasan singkat.";
}

/** Post-process diagram outputs so process JSON drives a valid Mermaid fence. */
export function finalizeDiagramDocument(markdown = "", langCode = "id") {
  const ensured = ensureProcessDiagramDocument(markdown, langCode);
  if (extractProcessFlow(ensured)) return ensured;
  return String(markdown || "").trim();
}
