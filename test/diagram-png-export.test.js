import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

function prepareDiagramSvgForRaster(svgString) {
  let svg = String(svgString || "").trim();
  svg = svg
    .replace(/<\?xml[^>]*>/i, "")
    .replace(/<!DOCTYPE[\s\S]*?>/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .trim();

  if (!/\sxmlns\s*=/.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const viewBox = svg.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  const parts = viewBox ? viewBox.trim().split(/[\s,]+/).map(Number) : [];
  let width = Number(svg.match(/\bwidth\s*=\s*["']([0-9.]+)/i)?.[1]);
  let height = Number(svg.match(/\bheight\s*=\s*["']([0-9.]+)/i)?.[1]);
  if (!Number.isFinite(width) || width <= 0) width = parts.length === 4 ? parts[2] : 960;
  if (!Number.isFinite(height) || height <= 0) height = parts.length === 4 ? parts[3] : 540;
  width = Math.max(1, Math.ceil(width));
  height = Math.max(1, Math.ceil(height));

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

test("sharp rasterizes mermaid-like SVG to PNG", async () => {
  const prepared = prepareDiagramSvgForRaster(`
    <svg viewBox="0 0 320 180">
      <g>
        <rect x="20" y="40" width="120" height="40" rx="6" fill="#fff" stroke="#333"/>
        <text x="40" y="65" font-size="14" fill="#111">Start</text>
        <path d="M140 60 H180" stroke="#333" fill="none"/>
        <rect x="180" y="40" width="120" height="40" rx="6" fill="#fff" stroke="#333"/>
        <text x="200" y="65" font-size="14" fill="#111">End</text>
      </g>
      <foreignObject x="0" y="0" width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>
    </svg>
  `);

  assert.match(prepared.svg, /xmlns=/);
  assert.doesNotMatch(prepared.svg, /foreignObject/);

  const png = await sharp(Buffer.from(prepared.svg, "utf8"), { density: 144 })
    .png()
    .toBuffer();

  assert.ok(png.length > 200);
  assert.equal(png[0], 0x89);
});
