/**
 * Client-side Mermaid diagram export (SVG / PNG).
 *
 * PNG is captured from a real DOM render via html-to-image. Image()+SVG raster
 * fails for Mermaid foreignObject labels and is unreliable in Android TWA.
 */

import { toBlob, toPng } from "html-to-image";
import { MERMAID_INIT } from "./mermaidConfig.js";

export { MERMAID_INIT } from "./mermaidConfig.js";

export function extractMermaidCode(output = "") {
  const fenced = String(output).match(/```mermaid\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return fenced[1].trim();
  if (/^(flowchart|sequenceDiagram|classDiagram|erDiagram|mindmap|graph)\b/m.test(output)) {
    return String(output).trim();
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
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
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
      `<svg$1><rect data-pl-bg="1" width="100%" height="100%" fill="#FBF8F1"/>`
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
  const { svg } = await mermaid.render(id, String(code || "").trim());
  document.getElementById(id)?.remove();
  document.querySelector(`[id="${id}"]`)?.remove();
  // Mermaid may inject a helper node named d{id}
  document.getElementById(`d${id}`)?.remove();
  return prepareSvgMarkup(svg);
}

function waitFrames(count = 2) {
  return new Promise((resolve) => {
    const step = (left) => {
      if (left <= 0) resolve();
      else requestAnimationFrame(() => step(left - 1));
    };
    step(count);
  });
}

async function captureNodePng(node) {
  const options = {
    backgroundColor: "#FBF8F1",
    pixelRatio: Math.min(2, window.devicePixelRatio || 2),
    cacheBust: true,
    // Avoid copying stylesheets that break in TWA/offline caches.
    skipFonts: true,
  };

  try {
    const blob = await toBlob(node, options);
    if (blob && blob.size > 32) return blob;
  } catch {
    /* fall through to data-URL path */
  }

  const dataUrl = await toPng(node, options);
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (!blob || blob.size < 32) throw new Error("PNG capture produced an empty file.");
  return blob;
}

/**
 * Mount SVG off-screen, let the browser paint it, capture pixels.
 */
async function captureSvgMarkupAsPng(svgMarkup, width, height) {
  const host = document.createElement("div");
  host.setAttribute("data-pl-diagram-export", "1");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${Math.max(320, width)}px`,
    `height:${Math.max(180, height)}px`,
    "padding:16px",
    "background:#FBF8F1",
    "z-index:-1",
    "overflow:visible",
    "pointer-events:none",
  ].join(";");
  host.innerHTML = svgMarkup.replace(/^<\?xml[^>]*>\s*/i, "");
  document.body.appendChild(host);

  try {
    await waitFrames(3);
    const svgEl = host.querySelector("svg");
    const target = svgEl || host;
    return await captureNodePng(target);
  } finally {
    host.remove();
  }
}

async function captureDomDiagramPng() {
  const canvas = document.querySelector(".pl-mermaid__canvas");
  const svg = canvas?.querySelector("svg");
  if (!canvas || !svg) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;
  return captureNodePng(canvas);
}

/**
 * @param {string} output finished markdown/mermaid text
 * @param {"svg"|"png"} format
 * @returns {Promise<{ blob: Blob, extension: string }>}
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

  // 1) Prefer the painted on-screen diagram when the section is open.
  try {
    const fromDom = await captureDomDiagramPng();
    if (fromDom) return { blob: fromDom, extension: "png" };
  } catch {
    /* continue */
  }

  // 2) Off-screen DOM capture (works with foreignObject / Android WebView).
  return {
    blob: await captureSvgMarkupAsPng(prepared.svg, prepared.width, prepared.height),
    extension: "png",
  };
}
