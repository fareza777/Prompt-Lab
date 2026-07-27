/**
 * Document → Mermaid diagram delivery contract.
 * User uploads a file and picks Diagram (or asks for a diagram);
 * the model returns a ready Mermaid fence, not a prompt to craft.
 */

const DIAGRAM_SIGNAL =
  /\b(mermaid|flowchart|sequence\s*diagram|class\s*diagram|er\s*diagram|mindmap|diagram|bagan|skema|wiki\s*diagram|peta\s*proses|process\s*map|flow\s*chart|alur\s*(kerja|proses|sistem|bisnis))\b/i;

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
  return section("mermaid_diagram", [
    id
      ? "Deliverable: DIAGRAM MERMAID SIAP TAMPIL — bukan prompt, bukan penjelasan cara membuat diagram."
      : "Deliverable: READY-TO-RENDER MERMAID DIAGRAM — not a prompt, not instructions on how to draw it.",
    id
      ? "Sumber utama: teks yang diekstrak dari dokumen/lampiran. Jangan mengarang entitas, peran, atau langkah yang tidak ada di sumber."
      : "Primary source: text extracted from the attached document(s). Do not invent entities, roles, or steps absent from the source.",
    id
      ? "Pilih jenis diagram yang paling cocok: flowchart (proses), sequence (interaksi), class/ER (struktur data), mindmap (hierarki konsep)."
      : "Pick the best diagram type: flowchart (process), sequence (interaction), class/ER (data structure), mindmap (concept hierarchy).",
    id
      ? "WAJIB keluarkan tepat SATU blok fenced code berbahasa mermaid: diawali ```mermaid dan diakhiri ```."
      : "MUST emit exactly ONE fenced code block with language mermaid: start with ```mermaid and end with ```.",
    id
      ? "Boleh menambah judul Markdown singkat (# ...) dan 2–5 bullet ringkasan wiki di luar fence. Jangan tulis teks lain di dalam fence."
      : "You may add a short Markdown title (# ...) and 2–5 wiki-style summary bullets outside the fence. No prose inside the fence.",
    id
      ? "Sintaks Mermaid harus valid: panah jelas, maksimal ~12 node, hindari subgraph bersarang dalam."
      : "Mermaid syntax must be valid: clear edges, at most ~12 nodes, avoid deeply nested subgraphs.",
    // Unquoted brackets are the most common cause of an unrenderable diagram
    // from Indonesian source documents ("Sekretaris Daerah (Sekda)").
    id
      ? 'WAJIB kutip label node yang memuat kurung, tanda kutip, atau tanda baca: tulis A["Sekretaris Daerah (Sekda)"], BUKAN A[Sekretaris Daerah (Sekda)]. Label tanpa kutip yang berisi kurung akan gagal dirender.'
      : 'ALWAYS quote node labels containing brackets, quotes, or punctuation: write A["Sekretaris Daerah (Sekda)"], NOT A[Sekretaris Daerah (Sekda)]. An unquoted label containing brackets will fail to render.',
    id
      ? "Baris PERTAMA di dalam fence WAJIB diawali tipe diagram: flowchart TD (atau sequenceDiagram / mindmap / erDiagram). Jangan keluarkan hanya node/panah tanpa tipe."
      : "The FIRST line inside the fence MUST start with a diagram type: flowchart TD (or sequenceDiagram / mindmap / erDiagram). Never emit only nodes/arrows without a type.",
    id
      ? "Jika dokumen kosong/tidak terbaca: keluarkan diagram minimal dengan satu node 'Sumber tidak tersedia' — jangan mengarang isi."
      : "If the document is empty/unreadable: emit a minimal diagram with one node 'Source unavailable' — do not invent content.",
  ]);
}

/**
 * @param {object} payload
 * @returns {string}
 */
export function buildMermaidDeliveryAddon(payload = {}) {
  if (!detectDiagramIntent(payload)) return "";
  return buildMermaidDeliveryInstruction(payload.outputLanguage || "id");
}

/** Default ask when user picks Diagram but leaves the request blank. */
export function defaultDiagramNarrative(langCode = "id") {
  return langCode === "en"
    ? "Turn the attached document into a clear Mermaid diagram of the main process or structure, plus a short wiki-style summary."
    : "Ubah dokumen terlampir menjadi diagram Mermaid yang jelas untuk proses atau struktur utamanya, plus ringkasan singkat gaya wiki.";
}
