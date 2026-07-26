/**
 * Frame raw captures into premium 3D-looking Play Store screenshots.
 *
 * Thickness = a dedicated side slab (always wide on screen), not a foreshortened
 * CSS-3D edge. Screen fills an exact 9:16 glass. Copy is clear Indonesian.
 */
import { access, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = process.cwd();
const assets = join(root, "playstore", "assets");
const rawDir = join(assets, "raw");
const W = 1080;
const H = 1920;

const PHONE_W = 500;
const PHONE_H = Math.round((PHONE_W * 1920) / 1080); // ≈ 889
const BEZEL = 12;
const SIDE = 78;

const SCREENS = [
  {
    key: "language",
    eyebrow: "Mulai",
    lines: ["Pilih bahasa", "yang nyaman dipakai"],
    sub: "Antarmuka Indonesia atau English. Bahasa untuk hasil kerja tetap bisa kamu tentukan sendiri.",
    side: "right",
  },
  {
    key: "auth",
    eyebrow: "Masuk",
    lines: ["Masuk dengan akun,", "atau coba dulu sebagai tamu"],
    sub: "Tidak wajib daftar sekarang. Mode tamu tanpa email, cocok untuk mencoba aplikasi.",
    side: "left",
  },
  {
    key: "tour",
    eyebrow: "Pengenalan",
    lines: ["Ikuti panduan singkat", "sebelum mulai bekerja"],
    sub: "Kami jelaskan alur dari input sampai hasil jadi. Lewati saja jika sudah paham.",
    side: "right",
  },
  {
    key: "workspace",
    eyebrow: "Buat hasil",
    lines: ["Tulis apa yang kamu butuhkan,", "lalu tekan Buat hasil"],
    sub: "Lampirkan foto, PDF, atau Word bila perlu. AI memakai isinya sebagai konteks.",
    side: "left",
  },
  {
    key: "result",
    eyebrow: "Hasil",
    lines: ["Dokumen jadi muncul", "langsung di layar"],
    sub: "Buka atau tutup tiap bagian. Salin, simpan, atau unduh sebagai Word dan PowerPoint.",
    side: "right",
  },
  {
    key: "history",
    eyebrow: "Riwayat",
    lines: ["Simpan hasil kerja,", "buka kembali kapan saja"],
    sub: "Pekerjaan sebelumnya tetap tersimpan di Riwayat dan siap dilanjutkan.",
    side: "left",
  },
  {
    key: "account",
    eyebrow: "Pengaturan",
    lines: ["Atur akun, tampilan,", "dan sisa kuota"],
    sub: "Ganti bahasa, aktifkan dark mode, lihat kuota mingguan, dan kelola paket langganan.",
    side: "right",
  },
  {
    key: "guide",
    eyebrow: "Bantuan",
    lines: ["Butuh penjelasan?", "Buka menu Panduan"],
    sub: "Tips praktis, alur kerja, dan batasan AI tersedia tanpa keluar dari aplikasi.",
    side: "left",
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
  const sideRight = screen.side === "right";
  const lean = sideRight ? -7 : 7; // whole mock leans like a real product shot

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
    position: relative; width: ${W}px; height: ${H}px;
    background:
      radial-gradient(ellipse 70% 42% at 90% 0%, rgba(47,90,70,0.13), transparent 55%),
      radial-gradient(ellipse 48% 32% at 0% 100%, rgba(232,224,210,0.95), transparent 50%),
      linear-gradient(170deg, #FCFAF5 0%, #F7F3EB 55%, #EFE8DB 100%);
  }
  .copy { position: absolute; left: 56px; right: 56px; top: 78px; z-index: 4; }
  .eyebrow {
    display: inline-block; margin-bottom: 14px; padding: 7px 14px;
    border-radius: 999px; background: rgba(47,90,70,0.12);
    color: #2F5A46; font-size: 20px; font-weight: 650;
  }
  h1 {
    font-size: 52px; line-height: 1.16; font-weight: 780;
    letter-spacing: -0.028em; color: #172029;
  }
  h1 span { display: block; }
  .rule {
    width: 64px; height: 5px; margin: 16px 0 14px;
    border-radius: 999px; background: #2F5A46;
  }
  .sub {
    max-width: 900px; font-size: 26px; line-height: 1.4;
    font-weight: 500; color: #4A534C;
  }
  .scene {
    position: absolute; left: 0; right: 0; bottom: 40px; height: 1160px;
    display: grid; place-items: end center;
  }

  /* Assembly: front + thick side. Leans as one object. */
  .mock {
    position: relative;
    width: ${PHONE_W + SIDE - 8}px;
    height: ${PHONE_H + 24}px;
    transform: rotate(${lean}deg);
    filter:
      drop-shadow(${sideRight ? 26 : -26}px 40px 34px rgba(14,20,18,0.30))
      drop-shadow(0 8px 14px rgba(14,20,18,0.14));
  }

  .phone {
    position: absolute;
    top: 0;
    ${sideRight ? "left: 0;" : `left: ${SIDE - 8}px;`}
    width: ${PHONE_W}px;
    height: ${PHONE_H}px;
    border-radius: 42px;
    background: linear-gradient(155deg, #404954 0%, #1B2027 42%, #0A0C10 100%);
    box-shadow:
      inset 0 0 0 1.5px rgba(255,255,255,0.18),
      inset 0 1px 0 rgba(255,255,255,0.26);
    overflow: hidden;
    z-index: 2;
  }
  .glass {
    position: absolute;
    inset: ${BEZEL}px;
    border-radius: 32px;
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
  .sheen {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(118deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 20%, transparent 42%);
  }

  /* Thick chassis edge — stays wide on the canvas (not foreshortened). */
  .side {
    position: absolute;
    top: 18px;
    height: ${PHONE_H - 36}px;
    width: ${SIDE}px;
    ${sideRight ? `left: ${PHONE_W - 10}px;` : "left: 0;"}
    z-index: 1;
    border-radius: ${sideRight ? "8px 18px 18px 8px" : "18px 8px 8px 18px"};
    background: linear-gradient(
      ${sideRight ? "90deg" : "270deg"},
      #6A7480 0%,
      #3E4854 14%,
      #252C35 42%,
      #14191F 72%,
      #07090C 100%
    );
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,0.12),
      inset ${sideRight ? -12 : 12}px 0 18px rgba(0,0,0,0.4);
    /* Trapezoid so it reads as perspective depth */
    clip-path: ${
      sideRight
        ? "polygon(0 0, 100% 14px, 100% calc(100% - 14px), 0 100%)"
        : "polygon(0 14px, 100% 0, 100% 100%, 0 calc(100% - 14px))"
    };
  }
  .side::before {
    content: "";
    position: absolute;
    top: 16%;
    ${sideRight ? "right: 24%;" : "left: 24%;"}
    width: 36%;
    height: 78px;
    border-radius: 5px;
    background: rgba(0,0,0,0.5);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  }
  .side::after {
    content: "";
    position: absolute;
    top: 40%;
    ${sideRight ? "right: 30%;" : "left: 30%;"}
    width: 28%;
    height: 48px;
    border-radius: 4px;
    background: rgba(255,255,255,0.1);
  }

  .brand {
    position: absolute; left: 56px; bottom: 32px; z-index: 5;
    font-size: 18px; font-weight: 650; letter-spacing: 0.07em;
    color: rgba(47, 90, 70, 0.7);
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
      <div class="mock">
        <div class="side" aria-hidden="true"></div>
        <div class="phone">
          <div class="glass">
            <img class="screen" src="${imageUrl}" alt="" />
            <div class="sheen"></div>
          </div>
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
    const imageUrl = `data:image/png;base64,${(await readFile(rawPath)).toString("base64")}`;
    const page = await context.newPage();
    await page.setContent(frameHtml({ screen, imageUrl }), { waitUntil: "load" });
    await page.waitForFunction(() => {
      const img = document.querySelector(".screen");
      return img && img.complete && img.naturalWidth > 0;
    }, { timeout: 15000 });
    await page.waitForTimeout(140);
    const buffer = await page.screenshot({ type: "png", animations: "disabled" });
    await page.close();
    await sharp(buffer).resize(W, H, { fit: "fill" }).png({ compressionLevel: 9 }).toFile(outPath);
    console.log(`framed ${screen.key}`);
  }

  await browser.close();
  console.log(`\nUpload from:\n  ${assets}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
