/**
 * Frame raw captures into clean 2D Play Store screenshots (1080×1920).
 *
 * Output: playstore/assets/screenshot-01.png … screenshot-08.png
 * Narrative follows the real first-run → work → save flow.
 */
import { access, mkdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = process.cwd();
const assets = join(root, "playstore", "assets");
const rawDir = join(assets, "raw");
const W = 1080;
const H = 1920;

const PHONE_W = 720;
const PHONE_H = Math.round((PHONE_W * 1920) / 1080);
const BEZEL = 14;

/** Ordered 1→8: matches the product journey. */
const SCREENS = [
  {
    n: 1,
    key: "language",
    eyebrow: "Langkah 1 dari 8",
    title: "Pilih bahasa tampilan",
    sub: "Indonesia atau English. Bahasa hasil kerja tetap bebas kamu tentukan.",
  },
  {
    n: 2,
    key: "auth",
    eyebrow: "Langkah 2 dari 8",
    title: "Masuk, atau coba sebagai tamu",
    sub: "Pakai akun agar riwayat tersimpan. Atau lanjut tanpa email untuk mencoba dulu.",
  },
  {
    n: 3,
    key: "tour",
    eyebrow: "Langkah 3 dari 8",
    title: "Pelajari alur kerjanya",
    sub: "Dari input sampai hasil jadi, dijelaskan singkat. Boleh dilewati kapan saja.",
  },
  {
    n: 4,
    key: "workspace",
    eyebrow: "Langkah 4 dari 8",
    title: "Tulis kebutuhanmu, lalu buat hasil",
    sub: "Lampirkan foto, PDF, atau Word bila perlu. AI membaca isinya sebagai konteks.",
  },
  {
    n: 5,
    key: "result",
    eyebrow: "Langkah 5 dari 8",
    title: "Dokumen jadi langsung di layar",
    sub: "Buka-tutup tiap bagian. Salin, simpan, atau unduh Word dan PowerPoint.",
  },
  {
    n: 6,
    key: "history",
    eyebrow: "Langkah 6 dari 8",
    title: "Simpan, lalu buka lagi kapan saja",
    sub: "Hasil kerja tersimpan di Riwayat dan siap dilanjutkan.",
  },
  {
    n: 7,
    key: "account",
    eyebrow: "Langkah 7 dari 8",
    title: "Atur akun, tema, dan kuota",
    sub: "Ganti bahasa, dark mode, cek sisa kuota, dan kelola paket langganan.",
  },
  {
    n: 8,
    key: "guide",
    eyebrow: "Langkah 8 dari 8",
    title: "Butuh bantuan? Buka Panduan",
    sub: "Tips, alur kerja, dan batasan AI selalu satu ketuk di dalam aplikasi.",
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function frameHtml({ screen, imageUrl }) {
  const num = String(screen.n).padStart(2, "0");
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    background: #F7F3EB; color: #1F241F;
  }
  .stage {
    position: relative;
    width: ${W}px; height: ${H}px;
    background:
      radial-gradient(ellipse 80% 50% at 100% 0%, rgba(47,90,70,0.12), transparent 55%),
      radial-gradient(ellipse 60% 40% at 0% 100%, rgba(232,224,210,0.9), transparent 50%),
      #F7F3EB;
  }
  .copy {
    position: absolute;
    left: 64px; right: 64px; top: 72px;
    text-align: center;
    z-index: 3;
  }
  .step {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    padding: 8px 16px;
    border-radius: 999px;
    background: rgba(47,90,70,0.12);
    color: #2F5A46;
    font-size: 20px;
    font-weight: 650;
  }
  .step b {
    display: inline-grid;
    place-items: center;
    width: 34px; height: 34px;
    border-radius: 999px;
    background: #2F5A46;
    color: #FFFDF8;
    font-size: 16px;
  }
  h1 {
    font-size: 48px;
    line-height: 1.18;
    font-weight: 780;
    letter-spacing: -0.03em;
    color: #172029;
    max-width: 920px;
    margin: 0 auto;
  }
  .rule {
    width: 72px; height: 5px;
    margin: 18px auto 14px;
    border-radius: 999px;
    background: #2F5A46;
  }
  .sub {
    max-width: 860px;
    margin: 0 auto;
    font-size: 25px;
    line-height: 1.4;
    font-weight: 500;
    color: #4A534C;
  }
  .phone-area {
    position: absolute;
    left: 0; right: 0; bottom: 56px;
    display: grid;
    place-items: end center;
    height: 1220px;
  }
  .phone {
    width: ${PHONE_W}px;
    height: ${PHONE_H}px;
    border-radius: 48px;
    padding: ${BEZEL}px;
    background: linear-gradient(160deg, #2C333C 0%, #12161B 55%, #0A0C10 100%);
    box-shadow:
      0 28px 48px rgba(24, 32, 28, 0.22),
      0 8px 16px rgba(24, 32, 28, 0.12),
      inset 0 0 0 1px rgba(255,255,255,0.12);
  }
  .glass {
    width: 100%;
    height: 100%;
    border-radius: ${48 - BEZEL}px;
    overflow: hidden;
    background: #000;
  }
  .screen {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: fill;
    background: #FFFDF8;
  }
  .brand {
    position: absolute;
    left: 0; right: 0; bottom: 22px;
    text-align: center;
    font-size: 17px;
    font-weight: 650;
    letter-spacing: 0.08em;
    color: rgba(47, 90, 70, 0.65);
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="copy">
      <div class="step"><b>${num}</b> ${escapeHtml(screen.eyebrow)}</div>
      <h1>${escapeHtml(screen.title)}</h1>
      <div class="rule"></div>
      <p class="sub">${escapeHtml(screen.sub)}</p>
    </div>
    <div class="phone-area">
      <div class="phone">
        <div class="glass">
          <img class="screen" src="${imageUrl}" alt="" />
        </div>
      </div>
    </div>
    <div class="brand">AI WORK STUDIO</div>
  </div>
</body>
</html>`;
}

async function ensureRaw(screen) {
  const rawPath = join(rawDir, `screenshot-phone-${screen.key}.png`);
  if (await exists(rawPath)) return rawPath;
  const nativePath = join(assets, `.native-${screen.key}.png`);
  if (!(await exists(nativePath))) {
    throw new Error(`Missing raw for ${screen.key}. Run capture first.`);
  }
  await sharp(nativePath)
    .resize(1080, 1920, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(rawPath);
  return rawPath;
}

async function main() {
  await mkdir(assets, { recursive: true });
  await mkdir(rawDir, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });

  for (const screen of SCREENS) {
    const rawPath = await ensureRaw(screen);
    const outName = `screenshot-${String(screen.n).padStart(2, "0")}.png`;
    const outPath = join(assets, outName);
    const imageUrl = `data:image/png;base64,${(await readFile(rawPath)).toString("base64")}`;
    const page = await context.newPage();
    await page.setContent(frameHtml({ screen, imageUrl }), { waitUntil: "load" });
    await page.waitForFunction(() => {
      const img = document.querySelector(".screen");
      return img && img.complete && img.naturalWidth > 0;
    }, { timeout: 15000 });
    await page.waitForTimeout(120);
    const buffer = await page.screenshot({ type: "png", animations: "disabled" });
    await page.close();
    await sharp(buffer).resize(W, H, { fit: "fill" }).png({ compressionLevel: 9 }).toFile(outPath);
    console.log(`wrote ${outName} ← ${screen.key}`);
  }

  await browser.close();

  // Remove old unnumbered phone frames so upload set stays clean.
  const stale = [
    "screenshot-phone-language.png",
    "screenshot-phone-auth.png",
    "screenshot-phone-tour.png",
    "screenshot-phone-workspace.png",
    "screenshot-phone-result.png",
    "screenshot-phone-history.png",
    "screenshot-phone-account.png",
    "screenshot-phone-guide.png",
    "screenshot-phone-advanced-controls.png",
  ];
  for (const name of stale) {
    const path = join(assets, name);
    if (await exists(path)) {
      await unlink(path);
      console.log(`removed stale ${name}`);
    }
  }

  console.log(`\nUpload screenshot-01.png … screenshot-08.png from:\n  ${assets}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
