/**
 * Generate Play Store app icon (512×512) and feature graphic (1024×500)
 * for AI Work Studio — warm paper + forest accent, result-first branding.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = join(root, "playstore", "assets");
const sourcesDir = join(outDir, "sources");

await mkdir(outDir, { recursive: true });
await mkdir(sourcesDir, { recursive: true });

// Full-bleed Play icon — no rounded mask (Play applies its own).
const iconSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3A6B54"/>
      <stop offset="55%" stop-color="#2F5A46"/>
      <stop offset="100%" stop-color="#203F32"/>
    </linearGradient>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFDF8"/>
      <stop offset="100%" stop-color="#F0EBE1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="420" cy="70" r="150" fill="#4A7A61" opacity="0.45"/>
  <circle cx="60" cy="460" r="130" fill="#1A3328" opacity="0.55"/>

  <!-- Document card -->
  <rect x="128" y="118" width="256" height="300" rx="28" fill="url(#paper)"/>
  <rect x="128" y="118" width="256" height="300" rx="28" fill="none" stroke="#D8D0C2" stroke-width="3"/>

  <!-- Folded corner -->
  <path d="M300 118 L384 118 L384 202 Z" fill="#E7DFD1"/>
  <path d="M300 118 L384 202 L300 202 Z" fill="#D8D0C2" opacity="0.7"/>

  <!-- Text lines = finished work -->
  <rect x="168" y="210" width="160" height="14" rx="7" fill="#2F5A46"/>
  <rect x="168" y="246" width="176" height="10" rx="5" fill="#9EB4A6"/>
  <rect x="168" y="274" width="148" height="10" rx="5" fill="#9EB4A6"/>
  <rect x="168" y="302" width="168" height="10" rx="5" fill="#9EB4A6"/>
  <rect x="168" y="330" width="120" height="10" rx="5" fill="#9EB4A6"/>

  <!-- Accent spark (AI) -->
  <g transform="translate(356 330)">
    <path d="M0 -28 L6 -6 L28 0 L6 6 L0 28 L-6 6 L-28 0 L-6 -6 Z" fill="#2F5A46"/>
  </g>
</svg>`);

await sharp(iconSvg)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(join(outDir, "app-icon-512.png"));
await sharp(iconSvg)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(join(sourcesDir, "app-icon-source.png"));
console.log("wrote app-icon-512.png");

const featureSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FBF8F1"/>
      <stop offset="55%" stop-color="#F7F3EB"/>
      <stop offset="100%" stop-color="#EFE8DB"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3A6B54"/>
      <stop offset="100%" stop-color="#2F5A46"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#483D2A" flood-opacity="0.14"/>
    </filter>
  </defs>

  <rect width="1024" height="500" fill="url(#fg)"/>
  <circle cx="980" cy="-20" r="240" fill="#DFE9E1"/>
  <circle cx="40" cy="520" r="200" fill="#E8E0D2"/>
  <path d="M0 120 C180 70 320 160 480 110 C680 50 820 130 1024 90" fill="none" stroke="#D8D0C2" stroke-width="2"/>

  <!-- App mark card -->
  <g filter="url(#soft)">
    <rect x="72" y="95" width="310" height="310" rx="48" fill="#FFFDF8" stroke="#C8BEAD" stroke-width="2"/>
    <rect x="118" y="141" width="218" height="218" rx="40" fill="url(#mark)"/>
    <!-- mini document -->
    <rect x="168" y="186" width="118" height="140" rx="14" fill="#FFFDF8"/>
    <path d="M246 186 L286 186 L286 226 Z" fill="#E7DFD1"/>
    <rect x="186" y="236" width="72" height="8" rx="4" fill="#2F5A46"/>
    <rect x="186" y="256" width="82" height="6" rx="3" fill="#9EB4A6"/>
    <rect x="186" y="274" width="64" height="6" rx="3" fill="#9EB4A6"/>
    <rect x="186" y="292" width="76" height="6" rx="3" fill="#9EB4A6"/>
  </g>

  <text x="430" y="188" font-family="Georgia, 'Times New Roman', serif" font-size="64" font-weight="700" fill="#1F241F">AI Work Studio</text>
  <text x="430" y="232" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="18" font-weight="700" letter-spacing="3.5" fill="#2F5A46">DARI BAHAN MENTAH KE HASIL JADI</text>

  <text x="430" y="292" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="24" fill="#414940">Catatan · Foto · File  →  Dokumen siap pakai</text>
  <text x="430" y="340" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="20" fill="#667067">Satu ruang kerja untuk membuat, menyimpan,</text>
  <text x="430" y="370" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="20" fill="#667067">dan mengunduh hasil AI yang rapi.</text>

  <rect x="430" y="404" width="120" height="6" rx="3" fill="#2F5A46"/>
</svg>`);

await sharp(featureSvg)
  .resize(1024, 500, { fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(join(outDir, "feature-graphic-1024x500.png"));
await sharp(featureSvg)
  .resize(1024, 500, { fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(join(sourcesDir, "feature-graphic-source.png"));
console.log("wrote feature-graphic-1024x500.png");

const iconMeta = await sharp(join(outDir, "app-icon-512.png")).metadata();
const featureMeta = await sharp(join(outDir, "feature-graphic-1024x500.png")).metadata();
console.log(`icon: ${iconMeta.width}x${iconMeta.height}`);
console.log(`feature: ${featureMeta.width}x${featureMeta.height}`);
console.log(`\nUpload from: ${outDir}`);
