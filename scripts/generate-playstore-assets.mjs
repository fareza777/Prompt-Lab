import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = join(root, "playstore", "assets");
const playIconSvg = join(root, "public", "playstore-icon.svg");

await mkdir(outDir, { recursive: true });

// Google Play: 512x512 PNG, full-bleed square, no shadow/rounded corners in file.
// https://developer.android.com/distribute/google-play/resources/icon-design-specifications
await sharp(playIconSvg)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(join(outDir, "app-icon-512.png"));

console.log("wrote app-icon-512.png (Play Store full-bleed spec)");

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
  <text x="500" y="262" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="22" fill="#5eb8ff" letter-spacing="4">AI PROMPT WORKSPACE</text>
  <text x="500" y="310" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="20" fill="#b8c5d9">Builder · Optimizer · Templates · Library · Compare</text>
  <text x="500" y="360" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="17" fill="#7a8aa3">Turn ideas and files into structured prompts for ChatGPT, Claude, Gemini, and more.</text>
</svg>`;

const logoSize = 280;
const logoInset = 110;
const logoPng = await sharp(await readFile(playIconSvg)).resize(logoSize, logoSize).png().toBuffer();

const featureBase = await sharp(Buffer.from(featureSvg)).png().toBuffer();

await sharp(featureBase)
  .composite([{ input: logoPng, left: logoInset, top: Math.round((500 - logoSize) / 2) }])
  .png()
  .toFile(join(outDir, "feature-graphic-1024x500.png"));

console.log("wrote feature-graphic-1024x500.png");
console.log(`\nUpload from: ${outDir}`);
