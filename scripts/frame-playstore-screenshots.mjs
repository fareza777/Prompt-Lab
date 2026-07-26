/**
 * Frame raw captures into premium 3D side-angle Play Store screenshots.
 *
 * Uses Playwright + CSS perspective so the phone reads as a real product shot
 * with Indonesian promo headlines matching AI Work Studio.
 *
 * Input:  playstore/assets/raw/screenshot-phone-*.png
 * Output: playstore/assets/screenshot-phone-*.png (1080×1920)
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = process.cwd();
const assets = join(root, "playstore", "assets");
const rawDir = join(assets, "raw");
const W = 1080;
const H = 1920;

const SCREENS = [
  {
    key: "language",
    eyebrow: "AI Work Studio",
    lines: ["Mulai dengan", "bahasa kamu"],
    sub: "Antarmuka Indonesia atau English — hasil tetap bisa bahasa apa pun.",
    angle: -26,
  },
  {
    key: "auth",
    eyebrow: "Masuk cepat",
    lines: ["Punya akun,", "atau lanjut tamu"],
    sub: "Tanpa email pun bisa coba. Daftar nanti saat butuh sync.",
    angle: 24,
  },
  {
    key: "tour",
    eyebrow: "Onboarding jelas",
    lines: ["Dari input", "sampai output"],
    sub: "Alur kerja dijelaskan langkah demi langkah — bisa dilewati kapan saja.",
    angle: -22,
  },
  {
    key: "workspace",
    eyebrow: "Satu ruang kerja",
    lines: ["Tulis apa adanya.", "AI yang merapikan"],
    sub: "Lampirkan foto, PDF, atau Word. Konteks dibaca otomatis.",
    angle: 28,
  },
  {
    key: "result",
    eyebrow: "Hasil final dulu",
    lines: ["Dokumen siap pakai,", "bukan draf mentah"],
    sub: "Kartu bisa dibuka-tutup. Salin, simpan, atau ekspor dari atas.",
    angle: -24,
  },
  {
    key: "history",
    eyebrow: "Riwayat kerja",
    lines: ["Simpan hasil.", "Buka lagi kapan saja"],
    sub: "Kerjaan terbaik tidak hilang — siap dilanjutkan besok.",
    angle: 22,
  },
  {
    key: "account",
    eyebrow: "Akun & tampilan",
    lines: ["Kuota, tema,", "dan paketmu"],
    sub: "Atur bahasa, dark mode, dan langganan di satu tempat.",
    angle: -28,
  },
  {
    key: "guide",
    eyebrow: "Bantuan singkat",
    lines: ["Panduan selalu", "satu ketuk jauh"],
    sub: "Workflow, tips, dan batas AI — tanpa keluar dari aplikasi.",
    angle: 26,
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
  const headline = screen.lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("<br/>");
  const yaw = screen.angle;
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<style>
  @font-face {
    font-family: "Segoe UI";
    src: local("Segoe UI"), local("Segoe UI Variable");
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${W}px;
    height: ${H}px;
    overflow: hidden;
    background: #F7F3EB;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #1F241F;
  }
  .stage {
    position: relative;
    width: ${W}px;
    height: ${H}px;
    background:
      radial-gradient(ellipse 70% 42% at 86% 8%, rgba(47, 90, 70, 0.14), transparent 58%),
      radial-gradient(ellipse 60% 40% at 8% 92%, rgba(232, 224, 210, 0.95), transparent 55%),
      linear-gradient(165deg, #FBF8F1 0%, #F7F3EB 48%, #EFE8DB 100%);
  }
  .stage::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 30%, rgba(255,255,255,0.35), transparent 28%),
      radial-gradient(circle at 78% 68%, rgba(47,90,70,0.05), transparent 30%);
    pointer-events: none;
  }
  .copy {
    position: absolute;
    left: 72px;
    right: 72px;
    top: 96px;
    z-index: 3;
    text-align: left;
  }
  .eyebrow {
    display: inline-block;
    margin-bottom: 18px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(47, 90, 70, 0.10);
    color: #2F5A46;
    font-size: 22px;
    font-weight: 650;
    letter-spacing: 0.02em;
  }
  h1 {
    font-size: 64px;
    line-height: 1.08;
    font-weight: 800;
    letter-spacing: -0.035em;
    color: #1A2330;
  }
  h1 span { display: block; }
  .rule {
    width: 88px;
    height: 6px;
    margin: 22px 0 20px;
    border-radius: 999px;
    background: #2F5A46;
  }
  .sub {
    max-width: 780px;
    font-size: 28px;
    line-height: 1.45;
    font-weight: 500;
    color: #555E56;
  }
  .scene {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1280px;
    display: grid;
    place-items: end center;
    perspective: 1800px;
    perspective-origin: 50% 40%;
    overflow: visible;
  }
  .phone-wrap {
    position: relative;
    transform-style: preserve-3d;
    transform:
      translate3d(0, 36px, 0)
      rotateY(${yaw}deg)
      rotateX(8deg)
      rotateZ(${yaw > 0 ? -2.5 : 2.5}deg);
    filter: drop-shadow(0 42px 48px rgba(26, 35, 48, 0.28))
            drop-shadow(0 8px 16px rgba(26, 35, 48, 0.16));
  }
  .phone {
    position: relative;
    width: 620px;
    height: 1240px;
    border-radius: 54px;
    padding: 14px;
    background: linear-gradient(160deg, #2A3038 0%, #11151B 55%, #0B0E12 100%);
    box-shadow:
      inset 0 0 0 2px rgba(255,255,255,0.08),
      inset 0 1px 0 rgba(255,255,255,0.18);
  }
  .phone::after {
    content: "";
    position: absolute;
    inset: 10px;
    border-radius: 46px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
    pointer-events: none;
  }
  .screen {
    width: 100%;
    height: 100%;
    border-radius: 42px;
    object-fit: cover;
    background: #fffdf8;
    display: block;
  }
  .brand {
    position: absolute;
    left: 72px;
    bottom: 48px;
    z-index: 4;
    font-size: 20px;
    font-weight: 650;
    letter-spacing: 0.04em;
    color: rgba(47, 90, 70, 0.72);
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="copy">
      <div class="eyebrow">${escapeHtml(screen.eyebrow)}</div>
      <h1>${headline}</h1>
      <div class="rule"></div>
      <p class="sub">${escapeHtml(screen.sub)}</p>
    </div>
    <div class="scene">
      <div class="phone-wrap">
        <div class="phone">
          <img class="screen" src="${imageUrl}" alt="" />
        </div>
      </div>
    </div>
    <div class="brand">AI WORK STUDIO</div>
  </div>
</body>
</html>`;
}

async function ensureRawSources() {
  for (const screen of SCREENS) {
    const name = `screenshot-phone-${screen.key}.png`;
    const rawPath = join(rawDir, name);
    if (await exists(rawPath)) continue;
    const nativePath = join(assets, `.native-${screen.key}.png`);
    if (!(await exists(nativePath))) {
      throw new Error(`Missing raw source for ${name}. Run capture first.`);
    }
    await sharp(nativePath)
      .resize(1080, 1920, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png()
      .toFile(rawPath);
    console.log("raw from native:", name);
  }
}

async function main() {
  await mkdir(assets, { recursive: true });
  await mkdir(rawDir, { recursive: true });
  await ensureRawSources();

  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });

  for (const screen of SCREENS) {
    const rawPath = join(rawDir, `screenshot-phone-${screen.key}.png`);
    const outPath = join(assets, `screenshot-phone-${screen.key}.png`);
    const rawBuffer = await readFile(rawPath);
    const imageUrl = `data:image/png;base64,${rawBuffer.toString("base64")}`;
    const html = frameHtml({ screen, imageUrl });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForFunction(() => {
      const img = document.querySelector(".screen");
      return img && img.complete && img.naturalWidth > 0;
    }, { timeout: 15000 });
    await page.waitForTimeout(120);
    const buffer = await page.screenshot({ type: "png", animations: "disabled" });
    await page.close();

    await sharp(buffer)
      .resize(W, H, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    console.log(`framed 3D ${screen.key}`);
  }

  await browser.close();

  // Keep README upload list in sync.
  const readmePath = join(assets, "README.md");
  if (await exists(readmePath)) {
    let readme = await readFile(readmePath, "utf8");
    readme = readme.replace(
      /upload the six result-first surfaces:.*?$/m,
      "upload the eight current surfaces: `language`, `auth`, `tour`, `workspace`, `result`, `history`, `account`, and `guide`",
    );
    await writeFile(readmePath, readme);
  }

  console.log(`\nUpload the framed files from:\n  ${assets}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
