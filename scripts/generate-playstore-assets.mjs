import { access, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = join(root, "playstore", "assets");
const sourcesDir = join(outDir, "sources");
const playIconSvg = join(root, "public", "playstore-icon.svg");
const iconSourcePng = join(sourcesDir, "app-icon-source.png");
const featureSourcePng = join(sourcesDir, "feature-graphic-source.png");
const FEATURE_TEXT_RIGHT = 960;

function wrapSvgText(lines, { x, y, lineHeight, fontSize, fill }) {
  const maxWidth = FEATURE_TEXT_RIGHT - x;
  return `<text x="${x}" y="${y}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${fontSize}" fill="${fill}">
    ${lines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}" textLength="${Math.min(maxWidth, Math.ceil(line.length * fontSize * 0.56))}" lengthAdjust="spacingAndGlyphs">${line}</tspan>`).join("\n    ")}
  </text>`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

await mkdir(outDir, { recursive: true });
await mkdir(sourcesDir, { recursive: true });

// Google Play: 512x512 PNG, full-bleed square, no shadow/rounded corners in file.
// https://developer.android.com/distribute/google-play/resources/icon-design-specifications
if (await exists(iconSourcePng)) {
  await sharp(iconSourcePng)
    .resize(512, 512, { fit: "cover", position: "centre" })
    .flatten({ background: "#050a0c" })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, "app-icon-512.png"));
  console.log("wrote app-icon-512.png from sources/app-icon-source.png");
} else {
  await sharp(playIconSvg)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, "app-icon-512.png"));
  console.log("wrote app-icon-512.png from playstore-icon.svg (fallback)");
}

if (await exists(featureSourcePng)) {
  await sharp(featureSourcePng)
    .resize(1024, 500, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, "feature-graphic-1024x500.png"));
  console.log("wrote feature-graphic-1024x500.png from sources/feature-graphic-source.png");
} else {
  const featureSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#061011"/>
      <stop offset="55%" stop-color="#0a1a20"/>
      <stop offset="100%" stop-color="#061011"/>
    </linearGradient>
    <radialGradient id="glowA" cx="80%" cy="20%" r="45%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="15%" cy="85%" r="40%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect width="1024" height="500" fill="url(#glowA)"/>
  <rect width="1024" height="500" fill="url(#glowB)"/>
  <rect x="64" y="64" width="372" height="372" rx="48" fill="#0f1f24" stroke="#2a4a55" stroke-width="2"/>
  <text x="500" y="210" font-family="Georgia, 'Times New Roman', serif" font-size="72" fill="#e8f4f6">PromptLab</text>
  <text x="500" y="262" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="22" fill="#5eb8ff" letter-spacing="4">FROM IDEA TO PROMPT</text>
  <text x="500" y="310" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="20" fill="#b8c5d9">Builder · Optimizer · Templates · Library · Compare</text>
  ${wrapSvgText(["Turn ideas and files into structured prompts", "for your favorite AI models."], { x: 500, y: 354, lineHeight: 26, fontSize: 17, fill: "#7a8aa3", right: FEATURE_TEXT_RIGHT })}
</svg>`;

  const logoSize = 280;
  const logoInset = 110;
  const logoPng = await sharp(join(outDir, "app-icon-512.png")).resize(logoSize, logoSize).png().toBuffer();
  const featureBase = await sharp(Buffer.from(featureSvg)).png().toBuffer();

  await sharp(featureBase)
    .composite([{ input: logoPng, left: logoInset, top: Math.round((500 - logoSize) / 2) }])
    .resize(1024, 500, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, "feature-graphic-1024x500.png"));
  console.log("wrote feature-graphic-1024x500.png from SVG fallback");
}

const iconMeta = await sharp(join(outDir, "app-icon-512.png")).metadata();
const featureMeta = await sharp(join(outDir, "feature-graphic-1024x500.png")).metadata();
console.log(`icon: ${iconMeta.width}x${iconMeta.height}`);
console.log(`feature: ${featureMeta.width}x${featureMeta.height}`);
console.log(`\nUpload from: ${outDir}`);
