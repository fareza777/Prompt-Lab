/**
 * PromptLab promotional video (YouTube / Play Console)
 * Output: playstore/assets/promo/PromptLab-promo-1080p.mp4
 *
 * Specs: 1920x1080, H.264, ~30fps, ~28s, silent (add music on YouTube if desired)
 */
import { mkdir, copyFile, access, rm, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const assets = join(root, "playstore", "assets");
const promoDir = join(assets, "promo");
const framesDir = join(promoDir, "frames");
const clipsDir = join(promoDir, "clips");

const W = 1920;
const H = 1080;
const FPS = 30;
const XFADE = 0.55;

const FFMpegCandidates = [
  process.env.FFMPEG_PATH,
  "ffmpeg",
  "C:\\Users\\FAJAR\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe",
].filter(Boolean);

async function findFfmpeg() {
  for (const bin of FFMpegCandidates) {
    try {
      await new Promise((resolve, reject) => {
        const p = spawn(bin, ["-version"], { stdio: "ignore" });
        p.on("error", reject);
        p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(String(code)))));
      });
      return bin;
    } catch {
      /* try next */
    }
  }
  throw new Error("ffmpeg not found. Install ffmpeg or set FFMPEG_PATH.");
}

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => {
      err += d.toString();
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed (${code}): ${err.slice(-1200)}`));
    });
  });
}

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

async function makeBackground() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050a0c"/>
      <stop offset="50%" stop-color="#0a161c"/>
      <stop offset="100%" stop-color="#061014"/>
    </linearGradient>
    <radialGradient id="glow" cx="82%" cy="18%" r="42%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="20%" cy="90%" r="35%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function makeFeatureScene({ screenshot, label, caption, outPath }) {
  const bg = await makeBackground();
  const phoneH = 920;
  const phone = await sharp(screenshot)
    .resize({ height: phoneH, fit: "inside" })
    .png()
    .toBuffer();
  const phoneMeta = await sharp(phone).metadata();
  const phoneW = phoneMeta.width;
  const phoneLeft = 180;
  const phoneTop = Math.round((H - phoneH) / 2);

  // Soft plate behind phone
  const platePad = 28;
  const plate = await sharp({
    create: {
      width: phoneW + platePad * 2,
      height: phoneH + platePad * 2,
      channels: 4,
      background: { r: 12, g: 28, b: 34, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const textX = 980;
  const textSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${textX}" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="72" fill="#eef7f9">${escapeXml(label)}</text>
  <text x="${textX}" y="500" font-family="system-ui, Segoe UI, sans-serif" font-size="28" fill="#5eb8ff" letter-spacing="3">${escapeXml(caption)}</text>
  <rect x="${textX}" y="540" width="72" height="3" fill="#38bdf8"/>
</svg>`;

  await sharp(bg)
    .composite([
      { input: plate, left: phoneLeft - platePad, top: phoneTop - platePad },
      { input: phone, left: phoneLeft, top: phoneTop },
      { input: Buffer.from(textSvg), left: 0, top: 0 },
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(outPath);
}

async function prepareCards() {
  const titleSrcCandidates = [
    join(promoDir, "sources", "promo-title-card.png"),
    "C:/Users/FAJAR/.cursor/projects/e-apps-promptlab/assets/promo-title-card.png",
  ];
  const endSrcCandidates = [
    join(promoDir, "sources", "promo-end-card.png"),
    "C:/Users/FAJAR/.cursor/projects/e-apps-promptlab/assets/promo-end-card.png",
  ];

  let titleSrc = null;
  let endSrc = null;
  for (const p of titleSrcCandidates) if (await exists(p)) { titleSrc = p; break; }
  for (const p of endSrcCandidates) if (await exists(p)) { endSrc = p; break; }
  if (!titleSrc || !endSrc) throw new Error("Missing promo title/end cards");

  await mkdir(join(promoDir, "sources"), { recursive: true });
  await copyFile(titleSrc, join(promoDir, "sources", "promo-title-card.png"));
  await copyFile(endSrc, join(promoDir, "sources", "promo-end-card.png"));

  await sharp(titleSrc)
    .resize(W, H, { fit: "cover", position: "centre" })
    .jpeg({ quality: 93, mozjpeg: true })
    .toFile(join(framesDir, "00-title.jpg"));

  await sharp(endSrc)
    .resize(W, H, { fit: "cover", position: "centre" })
    .jpeg({ quality: 93, mozjpeg: true })
    .toFile(join(framesDir, "06-end.jpg"));
}

async function stillToClip(ffmpeg, inputJpg, outputMp4, durationSec, zoomEnd = 1.06) {
  // Slow Ken Burns zoom toward center
  const frames = Math.round(durationSec * FPS);
  const step = ((zoomEnd - 1) / frames).toFixed(8);
  const zExpr = `min(${zoomEnd.toFixed(4)}\\,1+${step}*on)`;
  await run(ffmpeg, [
    "-y",
    "-loop",
    "1",
    "-i",
    inputJpg,
    "-vf",
    `zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},format=yuv420p`,
    "-t",
    String(durationSec),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outputMp4,
  ]);
}

async function main() {
  const ffmpeg = await findFfmpeg();
  console.log("ffmpeg:", ffmpeg);

  await rm(framesDir, { recursive: true, force: true });
  await rm(clipsDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });
  await mkdir(clipsDir, { recursive: true });

  console.log("Preparing title / end cards…");
  await prepareCards();

  const features = [
    {
      file: "01-builder.jpg",
      shot: "screenshot-phone-builder.png",
      label: "Builder",
      caption: "TURN ROUGH IDEAS INTO STRUCTURED PROMPTS",
      dur: 4.2,
      zoom: 1.05,
    },
    {
      file: "02-optimizer.jpg",
      shot: "screenshot-phone-optimizer.png",
      label: "Optimizer",
      caption: "REFINE FOR CLARITY AND STRONGER RESULTS",
      dur: 4.0,
      zoom: 1.055,
    },
    {
      file: "03-templates.jpg",
      shot: "screenshot-phone-templates.png",
      label: "Templates",
      caption: "START FASTER WITH PROVEN PATTERNS",
      dur: 3.8,
      zoom: 1.05,
    },
    {
      file: "04-library.jpg",
      shot: "screenshot-phone-library.png",
      label: "Library",
      caption: "SAVE AND REUSE YOUR BEST PROMPTS",
      dur: 3.8,
      zoom: 1.05,
    },
    {
      file: "05-compare.jpg",
      shot: "screenshot-phone-compare.png",
      label: "Compare",
      caption: "EVALUATE VERSIONS SIDE BY SIDE",
      dur: 4.0,
      zoom: 1.055,
    },
  ];

  console.log("Compositing feature scenes…");
  for (const f of features) {
    await makeFeatureScene({
      screenshot: join(assets, f.shot),
      label: f.label,
      caption: f.caption,
      outPath: join(framesDir, f.file),
    });
    console.log("  frame", f.file);
  }

  const timeline = [
    { frame: "00-title.jpg", clip: "00-title.mp4", dur: 4.4, zoom: 1.07 },
    ...features.map((f) => ({
      frame: f.file,
      clip: f.file.replace(".jpg", ".mp4"),
      dur: f.dur,
      zoom: f.zoom,
    })),
    { frame: "06-end.jpg", clip: "06-end.mp4", dur: 4.6, zoom: 1.06 },
  ];

  console.log("Rendering clips…");
  for (const item of timeline) {
    const out = join(clipsDir, item.clip);
    await stillToClip(ffmpeg, join(framesDir, item.frame), out, item.dur, item.zoom);
    console.log("  clip", item.clip);
  }

  // xfade chain
  console.log("Stitching with crossfades…");
  const inputs = [];
  for (const item of timeline) {
    inputs.push("-i", join(clipsDir, item.clip));
  }

  // Build filter: [0][1]xfade... 
  // offset accumulates: d0 - xfade, then + d1 - xfade, ...
  let filter = "";
  let lastLabel = "[0:v]";
  let offset = timeline[0].dur - XFADE;
  for (let i = 1; i < timeline.length; i++) {
    const outLabel = i === timeline.length - 1 ? "[vout]" : `[v${i}]`;
    filter += `${lastLabel}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}${outLabel};`;
    lastLabel = outLabel;
    if (i < timeline.length - 1) {
      offset += timeline[i].dur - XFADE;
    }
  }
  // remove trailing semicolon
  filter = filter.replace(/;$/, "");

  const outMp4 = join(promoDir, "PromptLab-promo-1080p.mp4");
  await run(ffmpeg, [
    "-y",
    ...inputs,
    "-filter_complex",
    filter,
    "-map",
    "[vout]",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "17",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    outMp4,
  ]);

  // Also write a short portrait-friendly vertical teaser? Skip — Play promo is landscape YouTube.

  const readme = `# PromptLab promotional video

## File
- \`PromptLab-promo-1080p.mp4\` — 1920×1080, H.264, silent

## Play Console
1. Upload the MP4 to **YouTube** (unlisted is fine)
2. Play Console → Store listing → **Promotional video**
3. Paste the YouTube URL

## Notes
- Video is intentionally silent so you can add royalty-free music on YouTube
- Regenerate: \`node scripts/create-promo-video.mjs\`
`;
  await writeFile(join(promoDir, "README.md"), readme);

  console.log("\nDone:", outMp4);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
