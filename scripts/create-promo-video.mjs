/**
 * PromptLab promotional video (YouTube / Play Console)
 * Output: playstore/assets/promo/PromptLab-promo-1080p.mp4
 *
 * Specs: 1920x1080, H.264, ~30fps, ~28s, silent (add music on YouTube if desired)
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
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
  <rect width="${W}" height="${H}" fill="#F7F3EB"/>
  <circle cx="1830" cy="80" r="470" fill="#DFE9E1"/>
  <circle cx="80" cy="1050" r="390" fill="#E8E0D2"/>
  <path d="M0 330 C420 220 690 440 1040 330 C1380 220 1600 390 1920 290" fill="none" stroke="#C8BEAD" stroke-width="3"/>
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
      background: { r: 47, g: 90, b: 70, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const textX = 980;
  const textSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${textX}" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="72" fill="#1F241F">${escapeXml(label)}</text>
  <text x="${textX}" y="500" font-family="system-ui, Segoe UI, sans-serif" font-size="28" fill="#2F5A46" letter-spacing="3">${escapeXml(caption)}</text>
  <rect x="${textX}" y="540" width="72" height="3" fill="#2F5A46"/>
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
  const card = (eyebrow, headline, body) => Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#F7F3EB"/>
  <circle cx="1770" cy="60" r="430" fill="#DFE9E1"/>
  <circle cx="90" cy="1060" r="350" fill="#E8E0D2"/>
  <rect x="220" y="210" width="250" height="250" rx="68" fill="#2F5A46"/>
  <text x="345" y="398" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="170" font-weight="700" fill="#FFFDF8">P</text>
  <text x="560" y="295" font-family="system-ui, Segoe UI, sans-serif" font-size="26" font-weight="700" fill="#2F5A46" letter-spacing="6">${escapeXml(eyebrow)}</text>
  <text x="560" y="405" font-family="Georgia, 'Times New Roman', serif" font-size="92" fill="#1F241F">${escapeXml(headline)}</text>
  <text x="560" y="485" font-family="system-ui, Segoe UI, sans-serif" font-size="30" fill="#667067">${escapeXml(body)}</text>
</svg>`);

  const titleCard = card("AI WORK STUDIO", "PromptLab", "From a rough idea to a finished AI draft.");
  const endCard = card("RESULT FIRST", "Ready to continue", "prompt-lab.xyz");

  await sharp(titleCard)
    .jpeg({ quality: 93, mozjpeg: true })
    .toFile(join(framesDir, "00-title.jpg"));

  await sharp(endCard)
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
      file: "01-workspace.jpg",
      shot: "screenshot-phone-workspace.png",
      label: "Workspace",
      caption: "TURN ROUGH INPUT INTO A FINISHED AI DRAFT",
      dur: 4.2,
      zoom: 1.05,
    },
    {
      file: "02-result.jpg",
      shot: "screenshot-phone-result.png",
      label: "Result",
      caption: "SEE THE USABLE RESULT FIRST",
      dur: 4.0,
      zoom: 1.055,
    },
    {
      file: "03-advanced-controls.jpg",
      shot: "screenshot-phone-advanced-controls.png",
      label: "Advanced controls",
      caption: "USEFUL CONTROLS STAY OUT OF THE WAY",
      dur: 3.8,
      zoom: 1.05,
    },
    {
      file: "04-history.jpg",
      shot: "screenshot-phone-history.png",
      label: "History",
      caption: "SAVE AND REOPEN FINISHED WORK",
      dur: 3.8,
      zoom: 1.05,
    },
    {
      file: "05-account.jpg",
      shot: "screenshot-phone-account.png",
      label: "Account",
      caption: "MANAGE PLAN, SYNC, AND APPEARANCE",
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
