/**
 * Shared Mermaid render helpers with hard timeouts.
 * Without a timeout, mermaid.render() can hang forever on bad layout
 * (UI shows "working…" with no diagram and no error).
 */

import { MERMAID_INIT } from "./mermaidConfig.js";

export function withTimeout(promise, timeoutMs, label = "operation") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Case-insensitive — models often emit `Flowchart TD` / `Graph TB`. */
export const DIAGRAM_START =
  /^(flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|mindmap|timeline|gitGraph|pie|quadrantChart|journey|gantt|C4Context|graph)\b/im;

const LOOKS_LIKE_GRAPH_BODY =
  /(-->|---|==>|-\.-+|o--|x--|:::|subgraph\b|\[[^\]]+\]|\([^\)]+\)|\{[^}]+\}|participant\s+\w+|Note\s+(left|right|over)\b)/i;

/**
 * If the model omitted the diagram type (very common), infer flowchart TD
 * when the body still looks like Mermaid edges/nodes.
 */
export function ensureMermaidDiagramType(code = "") {
  let text = String(code || "").trim();
  if (!text) return "";

  // Drop YAML frontmatter that some models prepend.
  text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();

  if (DIAGRAM_START.test(text)) {
    return text.replace(DIAGRAM_START, (match) => {
      const key = match.toLowerCase();
      const canonical = {
        flowchart: "flowchart",
        graph: "flowchart",
        sequencediagram: "sequenceDiagram",
        classdiagram: "classDiagram",
        statediagram: "stateDiagram",
        "statediagram-v2": "stateDiagram-v2",
        erdiagram: "erDiagram",
        mindmap: "mindmap",
        timeline: "timeline",
        gitgraph: "gitGraph",
        pie: "pie",
        quadrantchart: "quadrantChart",
        journey: "journey",
        gantt: "gantt",
        c4context: "C4Context",
      };
      return canonical[key] || match;
    });
  }

  if (LOOKS_LIKE_GRAPH_BODY.test(text)) {
    return `flowchart TD\n${text}`;
  }

  return text;
}

export function sanitizeMermaidCode(raw = "") {
  let code = String(raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^~~~(?:mermaid)?\s*/i, "")
    .replace(/\s*~~~\s*$/i, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();

  code = code.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();

  const start = code.search(DIAGRAM_START);
  if (start > 0) code = code.slice(start);

  // If still no type, keep body so ensureMermaidDiagramType can recover.
  code = code.replace(/\n```[\s\S]*$/i, "").replace(/\n~~~[\s\S]*$/i, "");

  const lines = code.split(/\r?\n/);
  const kept = [];
  for (const line of lines) {
    if (/^```/.test(line) || /^~~~/.test(line)) break;
    if (kept.length && /^#{1,6}\s+/.test(line)) break;
    if (kept.length && /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) break;
    kept.push(line);
  }
  return ensureMermaidDiagramType(kept.join("\n").trim());
}

/**
 * Repair a full markdown document so it contains a valid ```mermaid fence.
 */
export function repairMermaidDocument(markdown = "") {
  let text = String(markdown || "").trim();
  if (!text) return text;

  const fenced = text.match(/```mermaid\s*([\s\S]*?)```/i);
  if (fenced) {
    const repaired = sanitizeMermaidCode(fenced[1]);
    if (!repaired || !DIAGRAM_START.test(repaired)) return text;
    return text.replace(/```mermaid\s*[\s\S]*?```/i, `\`\`\`mermaid\n${repaired}\n\`\`\``);
  }

  // Bare mermaid source (with or without diagram type).
  if (DIAGRAM_START.test(text) || LOOKS_LIKE_GRAPH_BODY.test(text)) {
    const repaired = sanitizeMermaidCode(text);
    if (repaired && DIAGRAM_START.test(repaired)) {
      return `\`\`\`mermaid\n${repaired}\n\`\`\``;
    }
  }

  return text;
}

/**
 * Render Mermaid source to SVG markup with parse-first + timeout.
 * @returns {Promise<string>} svg html
 */
export async function renderMermaidToSvg(code, { id, timeoutMs = 12000, init = MERMAID_INIT } = {}) {
  const clean = sanitizeMermaidCode(code);
  if (!clean || !DIAGRAM_START.test(clean)) {
    throw new Error(
      "Kode diagram belum lengkap (tidak ada flowchart/sequenceDiagram). Ketuk Buat hasil lagi, atau buka Kode Mermaid dan pastikan baris pertama berisi flowchart TD."
    );
  }

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(init);

  try {
    await withTimeout(mermaid.parse(clean), Math.min(4000, timeoutMs), "Mermaid parse");
  } catch (error) {
    const msg = error?.message || String(error);
    if (/timed out/i.test(msg)) throw error;
    throw new Error(msg || "Invalid Mermaid syntax.");
  }

  const renderId = id || `pl-mmd-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  try {
    const { svg } = await withTimeout(
      mermaid.render(renderId, clean),
      timeoutMs,
      "Mermaid render"
    );
    return String(svg || "");
  } finally {
    if (typeof document !== "undefined") {
      document.getElementById(renderId)?.remove();
      document.getElementById(`d${renderId}`)?.remove();
    }
  }
}
