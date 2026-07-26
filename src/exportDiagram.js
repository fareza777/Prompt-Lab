/**
 * Client-side Mermaid diagram export (SVG / PNG) — visible diagram, not just source code.
 *
 * PNG uses SVG <text> labels (htmlLabels: false). Mermaid's default foreignObject/HTML
 * labels often fail Image()+canvas rasterization in Chrome/Android WebView.
 */

const MERMAID_INIT = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "neutral",
  fontFamily: "system-ui, Segoe UI, sans-serif",
  flowchart: { htmlLabels: false, useMaxWidth: false },
  sequence: { useMaxWidth: false },
  er: { useMaxWidth: false },
  class: { useMaxWidth: false },
};

function extractMermaidCode(output = "") {
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
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

function prepareSvgForRaster(svgString) {
  let svg = String(svgString || "").trim();
  if (!svg) throw new Error("Empty diagram SVG.");

  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");

  if (!/\sxmlns\s*=/.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const box = parseViewBox(svg);
  const width = Math.max(1, Math.ceil(box?.width || 960));
  const height = Math.max(1, Math.ceil(box?.height || 540));

  // Force absolute pixel size — percent / missing attrs break canvas rasterization.
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

async function renderMermaidSvg(code) {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(MERMAID_INIT);
  const id = `pl-export-mmd-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { svg } = await mermaid.render(id, String(code || "").trim());
  // Drop the temporary error/helper node Mermaid may leave in the DOM.
  document.getElementById(id)?.remove();
  document.getElementById(`d${id}`)?.remove();
  return prepareSvgForRaster(svg);
}

function loadSvgImage(svgText) {
  return new Promise((resolve, reject) => {
    const tryLoad = (src, revoke) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => {
          if (revoke) revoke();
          rej(new Error("Could not rasterize diagram."));
        };
        img.src = src;
      });

    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    tryLoad(dataUrl)
      .then(resolve)
      .catch(() => {
        const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        return tryLoad(blobUrl, () => URL.revokeObjectURL(blobUrl)).then((img) => {
          URL.revokeObjectURL(blobUrl);
          resolve(img);
        });
      })
      .catch((error) => reject(error));
  });
}

async function svgToPngBlob(prepared, scale = 2) {
  const img = await loadSvgImage(prepared.svg);
  const width = Math.max(1, img.naturalWidth || prepared.width || 960);
  const height = Math.max(1, img.naturalHeight || prepared.height || 540);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.fillStyle = "#FBF8F1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((png) => resolve(png), "image/png");
  });
  if (!blob) throw new Error("PNG export failed.");
  return blob;
}

function serializeDomSvg(svgEl) {
  const clone = svgEl.cloneNode(true);
  const serializer = new XMLSerializer();
  return prepareSvgForRaster(serializer.serializeToString(clone));
}

/**
 * Prefer the on-screen diagram when present; otherwise re-render from source.
 * @param {string} output finished markdown/mermaid text
 * @param {"svg"|"png"} format
 * @returns {Promise<{ blob: Blob, extension: string }>}
 */
export async function buildDiagramExportBlob(output, format = "png") {
  const code = extractMermaidCode(output);
  if (!code) throw new Error("No Mermaid diagram found in this result.");

  let prepared = null;
  const domSvg = document.querySelector(".pl-mermaid__canvas svg");
  if (domSvg) {
    try {
      prepared = serializeDomSvg(domSvg);
    } catch {
      prepared = null;
    }
  }
  if (!prepared) {
    prepared = await renderMermaidSvg(code);
  }

  if (format === "svg") {
    return {
      blob: new Blob([prepared.svg], { type: "image/svg+xml;charset=utf-8" }),
      extension: "svg",
    };
  }

  try {
    return {
      blob: await svgToPngBlob(prepared, 2),
      extension: "png",
    };
  } catch (firstError) {
    // DOM SVG may still contain foreignObject from an older render — re-render clean.
    const clean = await renderMermaidSvg(code);
    try {
      return {
        blob: await svgToPngBlob(clean, 2),
        extension: "png",
      };
    } catch {
      throw firstError;
    }
  }
}

export { extractMermaidCode, MERMAID_INIT };
