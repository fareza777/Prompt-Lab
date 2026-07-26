/**
 * AI Work Studio promotional video (YouTube / Play Console)
 * Output: playstore/assets/promo/AI-Work-Studio-promo-1080p.mp4
 *
 * Specs: 1920×1080, H.264, 30fps, ~60s, silent (add music on YouTube)
 */
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const assets = join(root, "playstore", "assets");
const rawDir = join(assets, "raw");
const promoDir = join(assets, "promo");
const framesDir = join(promoDir, "frames");
const clipsDir = join(promoDir, "clips");
const sourcesDir = join(promoDir, "sources");

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

async function assertRaw(name) {
  const path = join(rawDir, name);
  try {
    await access(path);
  } catch {
    throw new Error(`Missing ${path}. Run: node scripts/capture-playstore-screenshots.mjs`);
  }
  return path;
}

async function makeBackground() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FBF8F1"/>
      <stop offset="55%" stop-color="#F7F3EB"/>
      <stop offset="100%" stop-color="#EFE8DB"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1830" cy="80" r="470" fill="#DFE9E1"/>
  <circle cx="80" cy="1050" r="390" fill="#E8E0D2"/>
  <path d="M0 330 C420 220 690 440 1040 330 C1380 220 1600 390 1920 290" fill="none" stroke="#C8BEAD" stroke-width="3"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function makeFeatureScene({ screenshot, step, label, line1, line2, outPath }) {
  const bg = await makeBackground();
  const phoneH = 900;
  const phone = await sharp(screenshot)
    .resize({ height: phoneH, fit: "inside" })
    .png()
    .toBuffer();
  const phoneMeta = await sharp(phone).metadata();
  const phoneW = phoneMeta.width;
  const phoneLeft = 160;
  const phoneTop = Math.round((H - phoneH) / 2);

  const platePad = 22;
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
  <rect x="${textX}" y="290" width="118" height="36" rx="18" fill="#2F5A46"/>
  <text x="${textX + 59}" y="314" text-anchor="middle" font-family="system-ui, Segoe UI, sans-serif" font-size="16" font-weight="700" fill="#FFFDF8" letter-spacing="1">${escapeXml(step)}</text>
  <text x="${textX}" y="400" font-family="Georgia, 'Times New Roman', serif" font-size="64" fill="#1F241F">${escapeXml(label)}</text>
  <text x="${textX}" y="470" font-family="system-ui, Segoe UI, sans-serif" font-size="28" fill="#2F5A46" letter-spacing="1">${escapeXml(line1)}</text>
  <text x="${textX}" y="516" font-family="system-ui, Segoe UI, sans-serif" font-size="28" fill="#667067">${escapeXml(line2)}</text>
  <rect x="${textX}" y="548" width="72" height="4" fill="#2F5A46"/>
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
  await mkdir(sourcesDir, { recursive: true });
  const iconPath = join(assets, "app-icon-512.png");
  const icon = await sharp(iconPath).resize(240, 240).png().toBuffer();

  const titleSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FBF8F1"/>
      <stop offset="100%" stop-color="#EFE8DB"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1770" cy="60" r="430" fill="#DFE9E1"/>
  <circle cx="90" cy="1060" r="350" fill="#E8E0D2"/>
  <text x="560" y="360" font-family="system-ui, Segoe UI, sans-serif" font-size="24" font-weight="700" fill="#2F5A46" letter-spacing="6">AI WORK STUDIO</text>
  <text x="560" y="460" font-family="Georgia, 'Times New Roman', serif" font-size="88" fill="#1F241F">Dari bahan mentah</text>
  <text x="560" y="560" font-family="Georgia, 'Times New Roman', serif" font-size="88" fill="#1F241F">ke hasil jadi</text>
  <text x="560" y="650" font-family="system-ui, Segoe UI, sans-serif" font-size="30" fill="#667067">Catatan · Foto · File → dokumen siap pakai</text>
  <rect x="560" y="690" width="88" height="4" fill="#2F5A46"/>
</svg>`);

  const endSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FBF8F1"/>
      <stop offset="100%" stop-color="#EFE8DB"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1770" cy="60" r="430" fill="#DFE9E1"/>
  <circle cx="90" cy="1060" r="350" fill="#E8E0D2"/>
  <text x="560" y="360" font-family="system-ui, Segoe UI, sans-serif" font-size="24" font-weight="700" fill="#2F5A46" letter-spacing="6">SIAP DIPAKAI</text>
  <text x="560" y="460" font-family="Georgia, 'Times New Roman', serif" font-size="88" fill="#1F241F">AI Work Studio</text>
  <text x="560" y="540" font-family="system-ui, Segoe UI, sans-serif" font-size="32" fill="#667067">Buat, simpan, dan unduh hasil AI yang rapi</text>
  <text x="560" y="620" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="#2F5A46">prompt-lab.xyz</text>
  <rect x="560" y="660" width="88" height="4" fill="#2F5A46"/>
</svg>`);

  await sharp(titleSvg)
    .composite([{ input: icon, left: 220, top: 420 }])
    .jpeg({ quality: 93, mozjpeg: true })
    .toFile(join(framesDir, "00-title.jpg"));

  await sharp(endSvg)
    .composite([{ input: icon, left: 220, top: 420 }])
    .jpeg({ quality: 93, mozjpeg: true })
    .toFile(join(framesDir, "09-end.jpg"));

  await sharp(titleSvg)
    .composite([{ input: icon, left: 220, top: 420 }])
    .png()
    .toFile(join(sourcesDir, "promo-title-card.png"));

  await sharp(endSvg)
    .composite([{ input: icon, left: 220, top: 420 }])
    .png()
    .toFile(join(sourcesDir, "promo-end-card.png"));
}

async function stillToClip(ffmpeg, inputJpg, outputMp4, durationSec, zoomEnd = 1.06) {
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

  // Durations tuned so final length ≈ 60s after crossfades:
  // sum(durs) - (n-1)*XFADE ≈ 60
  const features = [
    {
      file: "01-language.jpg",
      shot: "screenshot-phone-language.png",
      step: "01 / 08",
      label: "Pilih bahasa",
      line1: "Indonesia atau English",
      line2: "Bahasa hasil tetap bebas kamu tentukan",
      dur: 6.2,
      zoom: 1.05,
    },
    {
      file: "02-auth.jpg",
      shot: "screenshot-phone-auth.png",
      step: "02 / 08",
      label: "Masuk atau tamu",
      line1: "Email, Google, atau coba dulu",
      line2: "Tanpa ribet di langkah pertama",
      dur: 6.2,
      zoom: 1.05,
    },
    {
      file: "03-tour.jpg",
      shot: "screenshot-phone-tour.png",
      step: "03 / 08",
      label: "Pelajari alurnya",
      line1: "Tour singkat 5 langkah",
      line2: "Bisa dilewati kapan saja",
      dur: 5.8,
      zoom: 1.045,
    },
    {
      file: "04-workspace.jpg",
      shot: "screenshot-phone-workspace.png",
      step: "04 / 08",
      label: "Tulis kebutuhanmu",
      line1: "Catatan, foto, atau file",
      line2: "Lalu buat hasil jadi",
      dur: 7.2,
      zoom: 1.055,
    },
    {
      file: "05-result.jpg",
      shot: "screenshot-phone-result.png",
      step: "05 / 08",
      label: "Dokumen jadi",
      line1: "Langsung di layar",
      line2: "Salin, simpan, atau export Word / PPT",
      dur: 7.5,
      zoom: 1.06,
    },
    {
      file: "06-history.jpg",
      shot: "screenshot-phone-history.png",
      step: "06 / 08",
      label: "Simpan & buka lagi",
      line1: "Riwayat hasil kerja",
      line2: "Cari dan lanjutkan kapan saja",
      dur: 6.2,
      zoom: 1.05,
    },
    {
      file: "07-account.jpg",
      shot: "screenshot-phone-account.png",
      step: "07 / 08",
      label: "Akun & kuota",
      line1: "Tema, paket, dan kapasitas",
      line2: "Semua di satu tempat",
      dur: 5.8,
      zoom: 1.05,
    },
    {
      file: "08-guide.jpg",
      shot: "screenshot-phone-guide.png",
      step: "08 / 08",
      label: "Butuh bantuan?",
      line1: "Buka Panduan",
      line2: "Bantuan jelas, satu ketuk saja",
      dur: 5.8,
      zoom: 1.045,
    },
  ];

  console.log("Compositing feature scenes…");
  for (const f of features) {
    const shot = await assertRaw(f.shot);
    await makeFeatureScene({
      screenshot: shot,
      step: f.step,
      label: f.label,
      line1: f.line1,
      line2: f.line2,
      outPath: join(framesDir, f.file),
    });
    console.log("  frame", f.file);
  }

  const timeline = [
    { frame: "00-title.jpg", clip: "00-title.mp4", dur: 6.0, zoom: 1.07 },
    ...features.map((f) => ({
      frame: f.file,
      clip: f.file.replace(".jpg", ".mp4"),
      dur: f.dur,
      zoom: f.zoom,
    })),
    { frame: "09-end.jpg", clip: "09-end.mp4", dur: 6.8, zoom: 1.06 },
  ];

  const sumDur = timeline.reduce((a, t) => a + t.dur, 0);
  const estFinal = sumDur - (timeline.length - 1) * XFADE;
  console.log(`Timeline sum=${sumDur.toFixed(1)}s → ~${estFinal.toFixed(1)}s after xfades`);

  console.log("Rendering clips…");
  for (const item of timeline) {
    const out = join(clipsDir, item.clip);
    await stillToClip(ffmpeg, join(framesDir, item.frame), out, item.dur, item.zoom);
    console.log("  clip", item.clip);
  }

  console.log("Stitching with crossfades…");
  const inputs = [];
  for (const item of timeline) {
    inputs.push("-i", join(clipsDir, item.clip));
  }

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
  filter = filter.replace(/;$/, "");

  const outMp4 = join(promoDir, "AI-Work-Studio-promo-1080p.mp4");
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

  // Remove old PromptLab filename if present
  try {
    await rm(join(promoDir, "PromptLab-promo-1080p.mp4"), { force: true });
  } catch {
    /* ignore */
  }

  const readme = `# AI Work Studio promotional video

## File
- \`AI-Work-Studio-promo-1080p.mp4\` — 1920×1080, H.264, ~60s, silent

## Story (≈60s)
1. Title — Dari bahan mentah ke hasil jadi
2. Pilih bahasa
3. Masuk atau tamu
4. Tour alur
5. Workspace
6. Dokumen jadi
7. Riwayat
8. Akun & kuota
9. Panduan
10. End card — prompt-lab.xyz

## Play Console
1. Upload the MP4 to **YouTube** (unlisted is fine)
2. Play Console → Store listing → **Promotional video**
3. Paste the YouTube URL

## Notes
- Video is intentionally silent so you can add royalty-free music on YouTube
- Needs raw captures in \`playstore/assets/raw/\`
- Regenerate: \`node scripts/create-promo-video.mjs\`
`;
  await writeFile(join(promoDir, "README.md"), readme);

  console.log("\nDone:", outMp4);
  console.log(`Estimated duration: ~${estFinal.toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
