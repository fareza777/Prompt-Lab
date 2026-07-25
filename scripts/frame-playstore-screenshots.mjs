/**
 * Frame raw Play Store phone screenshots into marketing panels
 * (headline + phone mockup), similar to premium store-listing style.
 *
 * Input:  playstore/assets/raw/screenshot-phone-*.png  (or current files once)
 * Output: playstore/assets/screenshot-phone-*.png      (1080×1920)
 */
import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assets = join(root, "playstore", "assets");
const rawDir = join(assets, "raw");

const W = 1080;
const H = 1920;

const SCREENS = [
  {
    key: "builder",
    lines: ["Turn rough ideas into", "structured AI prompts"],
  },
  {
    key: "optimizer",
    lines: ["Refine weak prompts into", "stronger instructions"],
  },
  {
    key: "templates",
    lines: ["Start faster with", "proven prompt patterns"],
  },
  {
    key: "library",
    lines: ["Save and reuse", "your best prompts"],
  },
  {
    key: "compare",
    lines: ["Compare prompt versions", "side by side"],
  },
  {
    key: "settings",
    lines: ["Manage plan, quota,", "and account in one place"],
  },
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Soft cream canvas with teal organic waves — like the reference style. */
function makeBackdropSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="paper" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F4F1EA"/>
      <stop offset="55%" stop-color="#F7F5F0"/>
      <stop offset="100%" stop-color="#EFEBE3"/>
    </linearGradient>
    <linearGradient id="waveA" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5EEAD4" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="waveB" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#67E8F9" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#99F6E4" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#paper)"/>
  <!-- organic waves (reference-style decoration) -->
  <path fill="url(#waveA)" d="M-40,220 C180,120 320,340 520,260 C740,170 900,320 1120,210 L1120,0 L-40,0 Z"/>
  <path fill="url(#waveB)" d="M-40,420 C160,520 360,300 560,390 C780,490 940,330 1120,430 L1120,1920 L-40,1920 Z"/>
  <path fill="#38BDF8" fill-opacity="0.06" d="M-40,1100 C200,980 380,1220 600,1120 C820,1020 980,1240 1120,1140 L1120,1920 L-40,1920 Z"/>
  <!-- soft corner glow -->
  <circle cx="980" cy="160" r="220" fill="#22D3EE" fill-opacity="0.07"/>
  <circle cx="80" cy="1680" r="260" fill="#2DD4BF" fill-opacity="0.08"/>
</svg>`;
}

function makeHeadlineSvg(lines) {
  const lineHeight = 64;
  const startY = 168;
  const tspans = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<text x="540" y="${y}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="52" font-weight="800" fill="#1A2330" letter-spacing="-0.5">${escapeXml(line)}</text>`;
    })
    .join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  ${tspans}
  <rect x="492" y="${startY + lines.length * lineHeight + 8}" width="96" height="5" rx="2.5" fill="#14B8A6"/>
</svg>`;
}

async function roundPhone(buffer, radius = 48) {
  const meta = await sharp(buffer).metadata();
  const w = meta.width;
  const h = meta.height;
  const mask = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="#fff"/>
    </svg>`
  );
  return sharp(buffer)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function makePhoneShadow(w, h, radius = 52) {
  // Soft drop shadow plate slightly larger than phone
  const pad = 36;
  const svg = Buffer.from(
    `<svg width="${w + pad * 2}" height="${h + pad * 2}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0F172A" flood-opacity="0.28"/>
        </filter>
      </defs>
      <rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="#0B1220" filter="url(#s)"/>
    </svg>`
  );
  return sharp(svg).png().toBuffer();
}

async function ensureRawSources() {
  await mkdir(rawDir, { recursive: true });
  for (const screen of SCREENS) {
    const name = `screenshot-phone-${screen.key}.png`;
    const rawPath = join(rawDir, name);
    if (await exists(rawPath)) continue;

    // Bootstrap raw once from native capture (never from already-framed live files).
    const nativePath = join(assets, `.native-${screen.key}.png`);
    if (await exists(nativePath)) {
      await sharp(nativePath)
        .resize(1080, 1920, { fit: "fill", kernel: sharp.kernel.lanczos3 })
        .png()
        .toFile(rawPath);
      console.log("raw from native:", name);
    } else {
      throw new Error(`Missing raw source for ${name}. Run capture first (npm run playstore:assets).`);
    }
  }
}

async function frameOne(screen) {
  const name = `screenshot-phone-${screen.key}.png`;
  const rawPath = join(rawDir, name);
  const outPath = join(assets, name);

  const backdrop = await sharp(Buffer.from(makeBackdropSvg())).png().toBuffer();
  const headline = await sharp(Buffer.from(makeHeadlineSvg(screen.lines))).png().toBuffer();

  // Phone sits in lower area; leave room for headline
  const phoneMaxH = 1320;
  const phoneMaxW = 760;
  let phone = await sharp(rawPath)
    .resize(phoneMaxW, phoneMaxH, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  // Thin device bezel
  const meta = await sharp(phone).metadata();
  const bezel = 10;
  const framedW = meta.width + bezel * 2;
  const framedH = meta.height + bezel * 2;
  const bezelSvg = Buffer.from(
    `<svg width="${framedW}" height="${framedH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${framedW}" height="${framedH}" rx="56" ry="56" fill="#111827"/>
    </svg>`
  );
  phone = await roundPhone(phone, 46);
  const phoneWithBezel = await sharp(bezelSvg)
    .composite([{ input: phone, left: bezel, top: bezel }])
    .png()
    .toBuffer();

  const phoneMeta = await sharp(phoneWithBezel).metadata();
  const shadow = await makePhoneShadow(phoneMeta.width, phoneMeta.height, 56);

  const phoneLeft = Math.round((W - phoneMeta.width) / 2);
  const phoneTop = Math.round(H - phoneMeta.height - 96);
  const shadowLeft = phoneLeft - 36;
  const shadowTop = phoneTop - 36;

  await sharp(backdrop)
    .composite([
      { input: headline, left: 0, top: 0 },
      { input: shadow, left: shadowLeft, top: shadowTop },
      { input: phoneWithBezel, left: phoneLeft, top: phoneTop },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const outMeta = await sharp(outPath).metadata();
  console.log(`framed ${name} (${outMeta.width}x${outMeta.height})`);
}

async function main() {
  await ensureRawSources();
  for (const screen of SCREENS) {
    await frameOne(screen);
  }
  console.log(`\nUpload the framed files from:\n  ${assets}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
