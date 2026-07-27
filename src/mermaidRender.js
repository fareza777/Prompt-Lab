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

/**
 * Node shapes whose label text is parsed literally, so an unquoted bracket or
 * parenthesis inside them is a syntax error.
 *
 * Indonesian source documents make this the single most common failure: labels
 * like "Sekretaris Daerah (Sekda)" or "Perangkat Daerah (PD)" are everywhere,
 * and the model does not reliably quote them however firmly it is asked to.
 * Quoting them here is deterministic, so it does not depend on that.
 */
const NODE_SHAPES = [
  { open: "[[", close: "]]" },
  { open: "((", close: "))" },
  { open: "([", close: "])" },
  { open: "[(", close: ")]" },
  { open: "{{", close: "}}" },
  { open: "[", close: "]" },
  { open: "(", close: ")" },
  { open: "{", close: "}" },
];

const NEEDS_QUOTING = /[()[\]{}<>|#]/;

/**
 * Finds the delimiter that closes this shape, counting nesting so a label like
 * "Mulai (awal)" inside a rounded node `A(...)` matches the outer bracket
 * rather than the first inner one.
 */
function findShapeClose(line, from, open, close) {
  // Doubled shapes such as `((label))` still contain single brackets of the
  // same family inside the label, so token matching closes too early on
  // `A((Pusat (inti)))`. Counting the underlying character instead is exact.
  const doubled = open.length === 2 && open[0] === open[1];
  if (doubled) {
    const openChar = open[0];
    const closeChar = close[0];
    let depth = 2;
    for (let index = from; index < line.length; index += 1) {
      const char = line[index];
      if (char === openChar) depth += 1;
      else if (char === closeChar) {
        depth -= 1;
        // The shape closes where its final two characters begin.
        if (depth === 0) return index - 1;
      }
    }
    return -1;
  }

  let depth = 1;
  let index = from;
  while (index < line.length) {
    if (line.startsWith(close, index)) {
      depth -= 1;
      if (depth === 0) return index;
      index += close.length;
      continue;
    }
    if (line.startsWith(open, index)) {
      depth += 1;
      index += open.length;
      continue;
    }
    index += 1;
  }
  return -1;
}

/** True when the label is already wrapped in matching quotes. */
function isQuoted(label) {
  const text = label.trim();
  return (
    (text.startsWith('"') && text.endsWith('"') && text.length > 1) ||
    (text.startsWith("`") && text.endsWith("`") && text.length > 1)
  );
}

export function quoteUnsafeMermaidLabels(code = "") {
  const source = String(code || "");
  if (!source) return "";

  // Only flowchart-family syntax uses these bracket node shapes.
  if (!/^\s*(flowchart|graph)\b/im.test(source)) return source;

  return source
    .split(/\r?\n/)
    .map((line) => {
      // Leave comments and directives alone.
      if (/^\s*(%%|click\b|style\b|classDef\b|linkStyle\b)/.test(line)) return line;

      // One left-to-right pass, taking the longest shape that starts here.
      // Looping shape-by-shape over the whole line reprocessed the inner
      // brackets of `A[[...]]` and mangled the label into `A["['...']"]`.
      let out = line;
      let index = 0;
      while (index < out.length) {
        const previous = out[index - 1] || "";
        const shape =
          /[\wÀ-￿]/.test(previous) &&
          NODE_SHAPES.find((candidate) => out.startsWith(candidate.open, index));
        if (!shape) {
          index += 1;
          continue;
        }

        const from = index + shape.open.length;
        const end = findShapeClose(out, from, shape.open, shape.close);
        if (end < 0) {
          index += shape.open.length;
          continue;
        }

        const label = out.slice(from, end);
        if (label && !isQuoted(label) && NEEDS_QUOTING.test(label)) {
          const safe = label.replace(/"/g, "'").trim();
          out = `${out.slice(0, from)}"${safe}"${out.slice(end)}`;
          index = from + safe.length + 2 + shape.close.length;
          continue;
        }
        index = end + shape.close.length;
      }
      return out;
    })
    .join("\n");
}

/** `A -->|| B` and `A -- "" --> B` are parse errors; a plain edge is not. */
export function dropEmptyEdgeLabels(code = "") {
  return String(code || "")
    .replace(/(--+>?|==+>?|-\.-+>?)\s*\|\s*\|/g, "$1")
    .replace(/\|\s*""\s*\|/g, "|");
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
  const typed = ensureMermaidDiagramType(kept.join("\n").trim());
  return quoteUnsafeMermaidLabels(dropEmptyEdgeLabels(typed));
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

/** Edge captions are the only thing this removes; the graph itself survives. */
export function stripEdgeLabels(code = "") {
  return String(code || "")
    .replace(/\|[^|\n]*\|/g, "")
    .replace(/(--+|==+|-\.-+)\s*"[^"\n]*"\s*(-*>?)/g, "$1$2");
}

/**
 * Renders with progressive degradation.
 *
 * Mermaid throws "Could not find a suitable point for the given distance" from
 * its edge-label positioning, and it surfaces on some devices (Android in our
 * logs) for diagrams that render fine elsewhere. Dropping the edge captions
 * removes that code path entirely and still yields a correct diagram, which
 * beats showing the user an error and no picture at all.
 *
 * @returns {Promise<{svg: string, degraded: boolean}>}
 */
export async function renderMermaidResilient(code, { id, timeoutMs = 14000, init = MERMAID_INIT } = {}) {
  const attempts = [
    { code, init, label: "as-is" },
    {
      code,
      init: { ...init, flowchart: { ...(init.flowchart || {}), curve: "basis" } },
      label: "basis-curve",
    },
    { code: stripEdgeLabels(code), init, label: "no-edge-labels" },
  ];

  let lastError;
  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    const clean = sanitizeMermaidCode(attempt.code);
    if (!clean) continue;
    try {
      const svg = await renderMermaidToSvg(clean, {
        id: id ? `${id}-${index}` : undefined,
        timeoutMs,
        init: attempt.init,
      });
      return { svg, degraded: attempt.label === "no-edge-labels" };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Mermaid render failed.");
}
