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

const DIAGRAM_START =
  /^(flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|mindmap|timeline|gitGraph|pie|quadrantChart|journey|gantt|C4Context|graph)\b/m;

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

  const start = code.search(DIAGRAM_START);
  if (start > 0) code = code.slice(start);

  code = code.replace(/\n```[\s\S]*$/i, "").replace(/\n~~~[\s\S]*$/i, "");

  const lines = code.split(/\r?\n/);
  const kept = [];
  for (const line of lines) {
    if (/^```/.test(line) || /^~~~/.test(line)) break;
    if (kept.length && /^#{1,6}\s+/.test(line)) break;
    if (kept.length && /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) break;
    kept.push(line);
  }
  return kept.join("\n").trim();
}

/**
 * Render Mermaid source to SVG markup with parse-first + timeout.
 * @returns {Promise<string>} svg html
 */
export async function renderMermaidToSvg(code, { id, timeoutMs = 12000, init = MERMAID_INIT } = {}) {
  const clean = sanitizeMermaidCode(code);
  if (!clean || !DIAGRAM_START.test(clean)) {
    throw new Error("Mermaid source is missing a diagram type (flowchart, sequenceDiagram, …).");
  }

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(init);

  // Fast syntax check — fails quickly instead of hanging in layout.
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
