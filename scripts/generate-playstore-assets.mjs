import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = join(root, "playstore", "assets");
const sourcesDir = join(outDir, "sources");
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

// Google Play: 512x512 PNG, full-bleed square, no shadow or rounded corners.
// The warm monogram replaces the retired cyan-on-black identity.
const iconSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2F5A46"/>
  <circle cx="458" cy="54" r="150" fill="#3D6A55"/>
  <circle cx="30" cy="486" r="130" fill="#294E3D"/>
  <rect x="84" y="84" width="344" height="344" rx="92" fill="none" stroke="#9EB4A6" stroke-width="3"/>
  <text x="256" y="354" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="286" font-weight="700" fill="#FFFDF8">P</text>
</svg>`);
await sharp(iconSvg)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(join(outDir, "app-icon-512.png"));
console.log("wrote app-icon-512.png from current warm monogram");

// The previous premium source still depicts the retired dark five-tab UI.
// Keep it in sources for provenance, but generate the current result-first
// feature graphic from the release contract below.
if (false && await exists(featureSourcePng)) {
  await sharp(featureSourcePng)
    .resize(1024, 500, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, "feature-graphic-1024x500.png"));
  console.log("wrote feature-graphic-1024x500.png from sources/feature-graphic-source.png");
} else {
  const featureSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#483D2A" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="1024" height="500" fill="#F7F3EB"/>
  <circle cx="950" cy="40" r="220" fill="#DFE9E1"/>
  <circle cx="70" cy="490" r="180" fill="#E8E0D2"/>
  <rect x="64" y="64" width="344" height="372" rx="42" fill="#FFFDF8" stroke="#C8BEAD" stroke-width="2" filter="url(#shadow)"/>
  <rect x="120" y="120" width="232" height="232" rx="34" fill="#2F5A46"/>
  <text x="236" y="288" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="148" font-weight="700" fill="#FFFDF8">P</text>
  <text x="472" y="202" font-family="Georgia, 'Times New Roman', serif" font-size="70" fill="#1F241F">PromptLab</text>
  <text x="472" y="254" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="19" font-weight="700" fill="#2F5A46" letter-spacing="3">AI WORK STUDIO</text>
  <text x="472" y="302" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="20" fill="#414940">Result first · Prompt tools when needed</text>
  ${wrapSvgText(["Turn ideas, photos, and files into finished", "AI work in one focused studio."], { x: 472, y: 350, lineHeight: 28, fontSize: 18, fill: "#667067", right: FEATURE_TEXT_RIGHT })}
</svg>`;

  const featureBase = await sharp(Buffer.from(featureSvg)).png().toBuffer();

  await sharp(featureBase)
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
