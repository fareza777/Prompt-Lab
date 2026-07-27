/**
 * Client-side Mermaid diagram export (SVG / PNG).
 *
 * Critical: prefer the already-painted SVG. Re-running mermaid.render() on
 * Android often fails ("No diagram type detected", layout point errors) even
 * when the on-screen diagram is fine.
 */

import { MERMAID_INIT } from "./mermaidConfig.js";
import {
  readRenderedDiagramCode,
  readRenderedDiagramSvg,
} from "./diagramSvgStore.js";

export { MERMAID_INIT } from "./mermaidConfig.js";

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

  // If prose got prepended, start at the first diagram keyword.
  const start = code.search(DIAGRAM_START);
  if (start > 0) code = code.slice(start);

  // Drop trailing markdown / fence leftovers.
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

export function extractMermaidCode(output = "") {
  const text = String(output || "");
  const fenced = text.match(/```mermaid\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return sanitizeMermaidCode(fenced[1]);

  const tilde = text.match(/~~~mermaid\s*([\s\S]*?)~~~/i);
  if (tilde?.[1]?.trim()) return sanitizeMermaidCode(tilde[1]);

  const loose = text.match(/```(?:mermaid)?\s*\n([\s\S]*?)```/i);
  if (loose?.[1] && DIAGRAM_START.test(loose[1])) {
    return sanitizeMermaidCode(loose[1]);
  }

  if (DIAGRAM_START.test(text)) {
    return sanitizeMermaidCode(
      text
        .replace(/^[\s\S]*?((?:flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|mindmap|timeline|gitGraph|pie|quadrantChart|journey|gantt|C4Context|graph)\b[\s\S]*)$/m, "$1")
        .replace(/\n```[\s\S]*$/, "")
        .replace(/\n~~~[\s\S]*$/, "")
    );
  }
  return "";
}

function parseViewBox(svg) {
  const raw = String(svg).match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!raw) return null;
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { width: parts[2], height: parts[3] };
}

/**
 * Mermaid embeds tiny nested <svg> markers inside the root diagram.
 * A naive /<svg>.*?<\/svg>/ regex grabs the marker — that became the blurry icon PNG.
 */
export function extractRootSvg(markup = "") {
  const html = String(markup || "");
  const start = html.search(/<svg\b/i);
  if (start < 0) return "";

  let depth = 0;
  const tagRe = /<\/?svg\b[^>]*>/gi;
  tagRe.lastIndex = start;
  let match;
  while ((match = tagRe.exec(html))) {
    const selfClosing = /\/>\s*$/.test(match[0]);
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, match.index + match[0].length);
      }
      continue;
    }
    if (!selfClosing) depth += 1;
  }
  return html.slice(start).trim();
}

/** True when this SVG looks like a UI icon (Lucide), not a Mermaid diagram. */
export function isLikelyUiIconSvg(svgString = "") {
  const svg = extractRootSvg(svgString) || String(svgString || "");
  if (!svg) return true;
  if (/\blucide\b/i.test(svg) || /\bpl-doc-card__chevron\b/i.test(svg)) return true;
  if (/\bclass="[^"]*lucide/i.test(svg)) return true;

  const box = parseViewBox(svg);
  const width = Number(svg.match(/\bwidth\s*=\s*["']([0-9.]+)/i)?.[1]) || box?.width || 0;
  const height = Number(svg.match(/\bheight\s*=\s*["']([0-9.]+)/i)?.[1]) || box?.height || 0;
  // Lucide icons are typically 24×24; Mermaid diagrams are much larger.
  if (width > 0 && height > 0 && width <= 48 && height <= 48) return true;

  // Real Mermaid diagrams contain many drawing nodes; icons are a single path/polyline.
  const drawOps = (svg.match(/<(path|polygon|polyline|rect|circle|ellipse|line|text)\b/gi) || [])
    .length;
  if (drawOps > 0 && drawOps < 4 && width <= 64 && height <= 64) return true;

  return false;
}

export function prepareSvgMarkup(svgString) {
  let svg = extractRootSvg(svgString) || String(svgString || "").trim();
  if (!svg) throw new Error("Empty diagram SVG.");

  svg = svg
    .replace(/<\?xml[^>]*>/i, "")
    .replace(/<!DOCTYPE[\s\S]*?>/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .trim();

  if (!/<svg\b/i.test(svg)) throw new Error("Empty diagram SVG.");
  if (isLikelyUiIconSvg(svg)) {
    throw new Error("Captured a UI icon instead of the diagram SVG.");
  }

  if (!/\sxmlns\s*=/.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const box = parseViewBox(svg);
  let width = Number(svg.match(/\bwidth\s*=\s*["']([0-9.]+)/i)?.[1]);
  let height = Number(svg.match(/\bheight\s*=\s*["']([0-9.]+)/i)?.[1]);
  if (!Number.isFinite(width) || width <= 0) width = box?.width || 960;
  if (!Number.isFinite(height) || height <= 0) height = box?.height || 540;
  width = Math.max(1, Math.ceil(width));
  height = Math.max(1, Math.ceil(height));

  if (width < 80 || height < 80) {
    throw new Error("Diagram SVG is too small to export.");
  }

  if (/\swidth\s*=/.test(svg)) {
    svg = svg.replace(/\swidth\s*=\s*["'][^"']*["']/i, ` width="${width}"`);
  } else {
    svg = svg.replace(/<svg\b/i, `<svg width="${width}"`);
  }
  if (/\sheight\s*=/.test(svg)) {
    svg = svg.replace(/\sheight\s*=\s*["'][^"']*["']/i, ` height="${height}"`);
  } else {
    svg = svg.replace(/<svg\b/i, `<svg height="${height}"`);
  }

  if (!/<rect[^>]*data-pl-bg=/i.test(svg)) {
    svg = svg.replace(
      /<svg([^>]*)>/i,
      `<svg$1><rect data-pl-bg="1" x="0" y="0" width="${width}" height="${height}" fill="#FBF8F1"/>`
    );
  }

  return {
    svg: `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`,
    width,
    height,
  };
}

function readSvgFromMermaidDom() {
  if (typeof document === "undefined") return "";
  const nodes = [
    ...document.querySelectorAll('[data-pl-diagram="1"] > svg'),
    ...document.querySelectorAll(".pl-mermaid__canvas > svg"),
    ...document.querySelectorAll("figure.pl-mermaid .pl-mermaid__canvas svg"),
  ];
  for (const svgEl of nodes) {
    try {
      const serialized = new XMLSerializer().serializeToString(svgEl);
      if (!isLikelyUiIconSvg(serialized)) return serialized;
    } catch {
      /* try next */
    }
  }
  return "";
}

export function captureOnScreenDiagramSvg() {
  const remembered = readRenderedDiagramSvg();
  if (remembered && !isLikelyUiIconSvg(remembered)) return remembered;

  return readSvgFromMermaidDom();
}

async function waitForPaintedDiagramSvg(timeoutMs = 4000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const svg = captureOnScreenDiagramSvg();
    if (svg) {
      try {
        return prepareSvgMarkup(svg);
      } catch {
        /* keep waiting */
      }
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

async function renderMermaidSvgMarkup(code) {
  const clean = sanitizeMermaidCode(code);
  if (!clean || !DIAGRAM_START.test(clean)) {
    throw new Error("Mermaid source is missing a diagram type (flowchart, sequenceDiagram, …).");
  }
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(MERMAID_INIT);
  const id = `pl-export-mmd-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  try {
    const { svg } = await mermaid.render(id, clean);
    return prepareSvgMarkup(svg);
  } finally {
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
}

async function resolvePreparedSvg(output) {
  // Ask the result UI to expand diagram sections so the canvas is in the DOM.
  try {
    window.dispatchEvent(new CustomEvent("pl:open-diagram-sections"));
  } catch {
    /* ignore */
  }

  // 1) Prefer the SVG already painted (root Mermaid SVG, never nested markers / Lucide).
  const painted = await waitForPaintedDiagramSvg(5000);
  if (painted) return painted;

  // 2) Try the SVG string MermaidBlock stored (sessionStorage / global) even if DOM is gone.
  const remembered = readRenderedDiagramSvg();
  if (remembered && !isLikelyUiIconSvg(remembered)) {
    try {
      return prepareSvgMarkup(remembered);
    } catch (error) {
      console.warn("[diagram-export] remembered SVG prepare failed", error);
    }
  }

  // 3) Re-render is fragile on Android for complex flowcharts — only as last resort.
  const code = sanitizeMermaidCode(readRenderedDiagramCode() || extractMermaidCode(output));
  if (!code) {
    throw new Error(
      "Buka section Diagram (nomor 1), tunggu sampai bagan terlihat, lalu ketuk Unduh PNG lagi."
    );
  }

  try {
    return await renderMermaidSvgMarkup(code);
  } catch (error) {
    const msg = error?.message || String(error);
    if (/suitable point|diagram type detected/i.test(msg)) {
      throw new Error(
        "Buka section Diagram sampai bagannya terlihat di layar, lalu Unduh PNG. Jangan tutup section saat mengunduh."
      );
    }
    throw new Error(`Gagal mengambil diagram (${msg}). Buka section Diagram dulu, lalu coba lagi.`);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode diagram image."));
    img.src = src;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 32) resolve(blob);
        else {
          try {
            const dataUrl = canvas.toDataURL("image/png");
            fetch(dataUrl)
              .then((r) => r.blob())
              .then((b) => (b?.size > 32 ? resolve(b) : reject(new Error("PNG encode failed."))))
              .catch(reject);
          } catch (error) {
            reject(error);
          }
        }
      }, "image/png");
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      fetch(dataUrl)
        .then((r) => r.blob())
        .then((b) => (b?.size > 32 ? resolve(b) : reject(new Error("PNG encode failed."))))
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

async function drawSvgToPngBlob(svgText, width, height, scale = 2) {
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  let img;
  try {
    img = await loadImage(dataUrl);
  } catch {
    const blobUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
    try {
      img = await loadImage(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  const w = Math.max(1, img.naturalWidth || width || 960);
  const h = Math.max(1, img.naturalHeight || height || 540);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.fillStyle = "#FBF8F1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.drawImage(img, 0, 0, w, h);
  return canvasToPngBlob(canvas);
}

async function rasterizeViaServer(prepared, { apiBase = "", authHeaders = {}, title = "Diagram" } = {}) {
  const response = await fetch(`${apiBase}/api/export/diagram-png`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      title,
      svg: prepared.svg,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Server PNG failed (${response.status}).`);
  }

  const blob = await response.blob();
  if (!blob || blob.size < 1500 || (blob.type && blob.type.includes("json"))) {
    throw new Error("Server returned an empty/invalid PNG.");
  }
  if (blob.type === "image/png") return blob;
  return new Blob([await blob.arrayBuffer()], { type: "image/png" });
}

/**
 * @param {string} output finished markdown/mermaid text
 * @param {"svg"|"png"} format
 * @param {{ apiBase?: string, authHeaders?: Record<string,string>, title?: string }} [options]
 * @returns {Promise<{ blob: Blob, extension: string, note?: string }>}
 */
export async function buildDiagramExportBlob(output, format = "png", options = {}) {
  const prepared = await resolvePreparedSvg(output);

  if (format === "svg") {
    return {
      blob: new Blob([prepared.svg], { type: "image/svg+xml;charset=utf-8" }),
      extension: "svg",
    };
  }

  const errors = [];

  try {
    return {
      blob: await rasterizeViaServer(prepared, options),
      extension: "png",
    };
  } catch (error) {
    errors.push(error?.message || String(error));
  }

  try {
    return {
      blob: await drawSvgToPngBlob(prepared.svg, prepared.width, prepared.height, 2),
      extension: "png",
    };
  } catch (error) {
    errors.push(error?.message || String(error));
  }

  return {
    blob: new Blob([prepared.svg], { type: "image/svg+xml;charset=utf-8" }),
    extension: "svg",
    note: `PNG unavailable (${errors.filter(Boolean).join("; ") || "raster failed"}). Saved SVG instead.`,
  };
}
