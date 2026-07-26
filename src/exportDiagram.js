/**
 * Client-side Mermaid diagram export (SVG / PNG).
 *
 * PNG strategy (in order):
 * 1. Draw prepared SVG onto a canvas via data URL (works when htmlLabels=false)
 * 2. Paint SVG in a near-invisible on-screen host, then canvas-draw that Image
 * 3. Fall back to SVG file download if PNG truly cannot be produced
 */

import { MERMAID_INIT } from "./mermaidConfig.js";

export { MERMAID_INIT } from "./mermaidConfig.js";

export function extractMermaidCode(output = "") {
  const fenced = String(output).match(/```mermaid\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return fenced[1].trim();
  // Tolerate missing fence language / trailing prose after a fence.
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

function prepareSvgMarkup(svgString) {
  let svg = String(svgString || "").trim();
  if (!svg) throw new Error("Empty diagram SVG.");
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");

  if (!/\sxmlns\s*=/.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const box = parseViewBox(svg);
  const width = Math.max(1, Math.ceil(box?.width || 960));
  const height = Math.max(1, Math.ceil(box?.height || 540));

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

/**
 * Some WebViews refuse to decode off-screen / data-URL SVG. Paint it in-viewport
 * (invisible) first, then snapshot via canvas Image from an object URL.
 */
async function drawViaVisibleHost(svgText, width, height) {
  const host = document.createElement("div");
  host.setAttribute("data-pl-diagram-export", "1");
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${Math.max(320, width)}px`,
    `height:${Math.max(180, height)}px`,
    "opacity:0.01",
    "pointer-events:none",
    "z-index:2147483646",
    "overflow:hidden",
    "background:#FBF8F1",
  ].join(";");
  host.innerHTML = svgText.replace(/^<\?xml[^>]*>\s*/i, "");
  document.body.appendChild(host);

  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const svgEl = host.querySelector("svg");
    if (!svgEl) throw new Error("Export host missing SVG.");
    const serialized = new XMLSerializer().serializeToString(svgEl);
    const prepared = prepareSvgMarkup(serialized);
    return drawSvgToPngBlob(prepared.svg, prepared.width, prepared.height, 2);
  } finally {
    host.remove();
  }
}

/**
 * @param {string} output finished markdown/mermaid text
 * @param {"svg"|"png"} format
 * @returns {Promise<{ blob: Blob, extension: string, note?: string }>}
 */
export async function buildDiagramExportBlob(output, format = "png") {
  const code = extractMermaidCode(output);
  if (!code) throw new Error("No Mermaid diagram found in this result.");

  const prepared = await renderMermaidSvgMarkup(code);

  if (format === "svg") {
    return {
      blob: new Blob([prepared.svg], { type: "image/svg+xml;charset=utf-8" }),
      extension: "svg",
    };
  }

  const errors = [];

  try {
    return {
      blob: await drawSvgToPngBlob(prepared.svg, prepared.width, prepared.height, 2),
      extension: "png",
    };
  } catch (error) {
    errors.push(error?.message || String(error));
  }

  try {
    return {
      blob: await drawViaVisibleHost(prepared.svg, prepared.width, prepared.height),
      extension: "png",
    };
  } catch (error) {
    errors.push(error?.message || String(error));
  }

  // Last resort: give the user a usable file (SVG) instead of a hard failure.
  return {
    blob: new Blob([prepared.svg], { type: "image/svg+xml;charset=utf-8" }),
    extension: "svg",
    note: `PNG unavailable (${errors.filter(Boolean).join("; ") || "raster failed"}). Saved SVG instead.`,
  };
}
