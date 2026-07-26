/**
 * Client-side Mermaid diagram export (SVG / PNG).
 *
 * PNG strategy (in order):
 * 1. Server sharp rasterize (/api/export/diagram-png) — reliable on Android TWA
 * 2. Client canvas from SVG data/blob URL
 * 3. Fall back to SVG download so the user still gets a file
 */

import { MERMAID_INIT } from "./mermaidConfig.js";

export { MERMAID_INIT } from "./mermaidConfig.js";

export function extractMermaidCode(output = "") {
  const fenced = String(output).match(/```mermaid\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return fenced[1].trim();
  const loose = String(output).match(/```(?:mermaid)?\s*\n([\s\S]*?)```/i);
  if (loose?.[1] && /^(flowchart|sequenceDiagram|classDiagram|erDiagram|mindmap|graph)\b/m.test(loose[1])) {
    return loose[1].trim();
  }
  if (/^(flowchart|sequenceDiagram|classDiagram|erDiagram|mindmap|graph)\b/m.test(output)) {
    return String(output)
      .replace(/^[\s\S]*?((?:flowchart|sequenceDiagram|classDiagram|erDiagram|mindmap|graph)\b[\s\S]*)$/m, "$1")
      .replace(/\n```[\s\S]*$/, "")
      .trim();
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

export function prepareSvgMarkup(svgString) {
  let svg = String(svgString || "").trim();
  if (!svg) throw new Error("Empty diagram SVG.");
  svg = svg
    .replace(/<\?xml[^>]*>/i, "")
    .replace(/<!DOCTYPE[\s\S]*?>/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .trim();

  if (!/\sxmlns\s*=/.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const box = parseViewBox(svg);
  const width = Math.max(1, Math.ceil(box?.width || Number(svg.match(/\bwidth\s*=\s*["']([0-9.]+)/i)?.[1]) || 960));
  const height = Math.max(1, Math.ceil(box?.height || Number(svg.match(/\bheight\s*=\s*["']([0-9.]+)/i)?.[1]) || 540));

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

/** Prefer the already-painted diagram on screen (avoids a second Mermaid render). */
export function captureOnScreenDiagramSvg() {
  if (typeof document === "undefined") return "";
  const svgEl =
    document.querySelector(".pl-mermaid__canvas svg") ||
    document.querySelector("figure.pl-mermaid svg");
  if (!svgEl) return "";
  try {
    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    return "";
  }
}

async function renderMermaidSvgMarkup(code) {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(MERMAID_INIT);
  const id = `pl-export-mmd-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  try {
    const { svg } = await mermaid.render(id, String(code || "").trim());
    return prepareSvgMarkup(svg);
  } finally {
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
}

async function resolvePreparedSvg(output) {
  const fromDom = captureOnScreenDiagramSvg();
  if (fromDom) {
    try {
      return prepareSvgMarkup(fromDom);
    } catch {
      /* fall through */
    }
  }

  const code = extractMermaidCode(output);
  if (!code) throw new Error("No Mermaid diagram found in this result.");
  return renderMermaidSvgMarkup(code);
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
  if (!blob || blob.size < 64 || blob.type.includes("json")) {
    throw new Error("Server returned an empty PNG.");
  }
  // Ensure type is image/png even if the response omitted it.
  if (blob.type && blob.type !== "image/png") {
    return new Blob([await blob.arrayBuffer()], { type: "image/png" });
  }
  return blob.type === "image/png" ? blob : new Blob([await blob.arrayBuffer()], { type: "image/png" });
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
