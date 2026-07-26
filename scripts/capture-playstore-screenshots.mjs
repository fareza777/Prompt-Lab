import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = process.cwd();
const outDir = join(root, "playstore", "assets");
const rawDir = join(outDir, "raw");
const port = 4173;
const baseUrl = `http://127.0.0.1:${port}`;
const screens = ["workspace", "result", "prompt-tools", "history", "account", "guide"];
const SURFACE_EXPECTATIONS = {
  workspace: ".pl-workbench .pl-composer",
  result: ".pl-doc--output",
  "prompt-tools": ".pl-prompt-panel",
  history: '[role="dialog"]',
  account: '[role="dialog"]',
  guide: '[role="dialog"]',
};
const PHONE_WIDTH = 1080;
const PHONE_HEIGHT = 1920;

const captureCss = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  #app-splash { display: none !important; }
  .pl-top { background: var(--paper-raised) !important; }
`;

const savedOutput = {
  id: "playstore-result",
  title: "Peluncuran produk — ringkasan eksekutif",
  contentType: "output",
  request: "Buat ringkasan eksekutif untuk peluncuran produk baru.",
  prompt:
    "Tulis ringkasan eksekutif peluncuran produk untuk pemimpin bisnis. Sertakan tujuan, audiens, pesan utama, rencana 30 hari, risiko, dan langkah berikutnya.",
  output:
    "Ringkasan Eksekutif\n\nPeluncuran ini memosisikan produk sebagai cara paling sederhana bagi tim kecil untuk mengubah pekerjaan berulang menjadi alur yang terukur.\n\nFokus 30 Hari\n• Minggu 1: validasi pesan dengan pelanggan awal.\n• Minggu 2: siapkan materi penjualan dan demo.\n• Minggu 3: jalankan peluncuran terbatas.\n• Minggu 4: ukur aktivasi, retensi, dan umpan balik.\n\nLangkah Berikutnya\nTetapkan pemilik untuk setiap metrik, jadwalkan tinjauan mingguan, dan prioritaskan perbaikan berdasarkan dampak pelanggan.",
  content:
    "Ringkasan Eksekutif\n\nPeluncuran ini memosisikan produk sebagai cara paling sederhana bagi tim kecil untuk mengubah pekerjaan berulang menjadi alur yang terukur.",
  folder: "Pekerjaan",
  createdAt: Date.UTC(2026, 6, 26),
  updatedAt: Date.UTC(2026, 6, 26),
};

async function waitForStableRender(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(200);
}

async function captureStableScreenshot(page, name) {
  let previousHash = "";
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const buffer = await page.screenshot({ type: "png", fullPage: false, animations: "disabled" });
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash === previousHash) return buffer;
    previousHash = hash;
    await page.waitForTimeout(200);
  }
  throw new Error(`${name}: raster output did not stabilize after five captures`);
}

async function assertSurfaceReady(page, name) {
  await page.locator(".pl-shell").waitFor({ state: "visible" });
  const expected = SURFACE_EXPECTATIONS[name];
  await page.locator(expected).waitFor({ state: "visible" });

  const layout = await page.evaluate(() => ({
    bodyClass: document.body.className,
    theme: document.documentElement.dataset.uiTheme,
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  if (!layout.bodyClass.includes("pl") || layout.theme !== "light") {
    throw new Error(`${name}: premium light app shell is not active: ${JSON.stringify(layout)}`);
  }
  if (layout.documentWidth > layout.viewportWidth) {
    throw new Error(`${name}: horizontal overflow detected: ${JSON.stringify(layout)}`);
  }
}

async function openSavedResult(page) {
  await page.getByRole("button", { name: "Riwayat" }).click();
  await page.getByRole("button", { name: /^Peluncuran produk/ }).click();
  await page.locator(".pl-doc--output").waitFor({ state: "visible" });
}

async function navigateToSurface(page, name) {
  if (name === "result" || name === "prompt-tools") {
    await openSavedResult(page);
    if (name === "prompt-tools") {
      await page.getByRole("button", { name: /Lihat prompt/i }).click();
    }
    await page.locator(".pl-result-tray").scrollIntoViewIfNeeded();
  } else if (name === "history") {
    await page.getByRole("button", { name: "Riwayat" }).click();
  } else if (name === "account") {
    await page.getByRole("button", { name: "Akun" }).click();
  } else if (name === "guide") {
    await page.getByRole("button", { name: "Panduan" }).click();
  }
  if (name !== "result" && name !== "prompt-tools") {
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  }
}

function waitForServer(url, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (response.ok) return resolve();
      } catch {
        // Preview is still starting.
      }
      if (Date.now() - started > timeoutMs) return reject(new Error(`Server not ready: ${url}`));
      setTimeout(tick, 500);
    };
    tick();
  });
}

function startPreview() {
  return spawn("npm", ["run", "preview", "--", "--port", String(port), "--host", "127.0.0.1"], {
    cwd: root,
    shell: true,
    stdio: "ignore",
  });
}

async function exportPhoneScreenshot(rawBuffer, file) {
  const optimized = await sharp(rawBuffer)
    .resize(PHONE_WIDTH, PHONE_HEIGHT, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(file, optimized);
}

await mkdir(outDir, { recursive: true });
await mkdir(rawDir, { recursive: true });

const preview = startPreview();
try {
  await waitForServer(`${baseUrl}/app`);
  const browser = await chromium.launch({ channel: "chrome" });
  for (const name of screens) {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    await context.addInitScript((record) => {
      localStorage.setItem("promptlab-onboarded", "1");
      localStorage.setItem("promptlab-ui-lang", "id");
      localStorage.setItem("promptlab-ui-theme", "light");
      localStorage.setItem("promptlab-library", JSON.stringify([record]));
      localStorage.setItem("promptlab-trial-used", "0");
    }, savedOutput);
    const page = await context.newPage();
    await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: captureCss });
    await navigateToSurface(page, name);
    await waitForStableRender(page);
    await assertSurfaceReady(page, name);
    const rawCapture = await captureStableScreenshot(page, name);
    await writeFile(join(outDir, `.native-${name}.png`), rawCapture);
    await exportPhoneScreenshot(rawCapture, join(rawDir, `screenshot-phone-${name}.png`));
    await context.close();
  }
  await browser.close();
} finally {
  preview.kill("SIGTERM");
}

console.log(`Raw phone screenshots: ${PHONE_WIDTH}x${PHONE_HEIGHT} in ${rawDir}`);
console.log("Frame for Play Console with: npm run playstore:frame");
