/**
 * Client-side Mermaid diagram export (SVG / PNG) — visible diagram, not just source code.
 */

function ensureSvgSizing(svgString) {
  let svg = String(svgString || "").trim();
  if (!svg) throw new Error("Empty diagram SVG.");
  if (!/\swidth=/.test(svg) || !/\sheight=/.test(svg)) {
    const viewBox = svg.match(/viewBox="([^"]+)"/i)?.[1]?.split(/\s+/);
    if (viewBox?.length === 4) {
      const w = Math.ceil(Number(viewBox[2]) || 960);
      const h = Math.ceil(Number(viewBox[3]) || 540);
      svg = svg.replace(/<svg\b/i, `<svg width="${w}" height="${h}"`);
    }
  }
  // Solid paper background so PNG is readable in dark viewers / Slack.
  if (!/<rect[^>]*fill=/i.test(svg)) {
    svg = svg.replace(
      /<svg([^>]*)>/i,
      `<svg$1><rect width="100%" height="100%" fill="#FBF8F1"/>`
    );
  }
  return svg;
}

async function renderMermaidSvg(code) {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "neutral",
    fontFamily: "Georgia, 'Times New Roman', serif",
  });
  const id = `pl-export-mmd-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { svg } = await mermaid.render(id, String(code || "").trim());
  return ensureSvgSizing(svg);
}

function extractMermaidCode(output = "") {
  const fenced = String(output).match(/```mermaid\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return fenced[1].trim();
  if (/^(flowchart|sequenceDiagram|classDiagram|erDiagram|mindmap|graph)\b/m.test(output)) {
    return String(output).trim();
  }
  return "";
}

function svgToPngBlob(svgString, scale = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const width = Math.max(1, img.naturalWidth || img.width || 960);
        const height = Math.max(1, img.naturalHeight || img.height || 540);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FBF8F1";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (png) => {
            URL.revokeObjectURL(url);
            if (!png) reject(new Error("PNG export failed."));
            else resolve(png);
          },
          "image/png"
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not rasterize diagram."));
    };
    img.src = url;
  });
}

/**
 * @param {string} output finished markdown/mermaid text
 * @param {"svg"|"png"} format
 * @returns {Promise<{ blob: Blob, extension: string }>}
 */
export async function buildDiagramExportBlob(output, format = "png") {
  const code = extractMermaidCode(output);
  if (!code) throw new Error("No Mermaid diagram found in this result.");
  const svg = await renderMermaidSvg(code);
  if (format === "svg") {
    return {
      blob: new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      extension: "svg",
    };
  }
  return {
    blob: await svgToPngBlob(svg, 2),
    extension: "png",
  };
}

export { extractMermaidCode };
