/**
 * Capture fresh phone screenshots from the current AI Work Studio GUI.
 * Includes boot surfaces (language, auth, tour) plus the main workspace.
 *
 * Output:
 *   playstore/assets/raw/screenshot-phone-*.png  (1080×1920)
 *   playstore/assets/.native-*.png               (native capture)
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = process.cwd();
const outDir = join(root, "playstore", "assets");
const rawDir = join(outDir, "raw");
const PHONE_WIDTH = 1080;
const PHONE_HEIGHT = 1920;

const SCREENS = [
  { key: "language", boot: "language", expect: '[data-stage="language"]' },
  { key: "auth", boot: "auth", expect: '[data-stage="auth"]' },
  { key: "tour", boot: "tour", expect: '[data-stage="tour"]' },
  { key: "workspace", boot: "app", expect: ".pl-workbench .pl-composer" },
  { key: "result", boot: "app", expect: ".pl-doc--output" },
  { key: "history", boot: "app", expect: '[role="dialog"]' },
  { key: "account", boot: "app", expect: '[role="dialog"]' },
  { key: "guide", boot: "app", expect: '[role="dialog"]' },
];

const captureCss = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  html.boot-app #app-splash,
  html[data-route="app"] #app-splash,
  #app-splash {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }
  .pl-top { background: var(--paper-raised) !important; }
`;

const savedOutput = {
  id: "playstore-result",
  title: "Peluncuran produk — ringkasan eksekutif",
  contentType: "output",
  request: "Buat ringkasan eksekutif untuk peluncuran produk baru.",
  prompt:
    "Tulis ringkasan eksekutif peluncuran produk untuk pemimpin bisnis. Sertakan tujuan, audiens, pesan utama, rencana 30 hari, risiko, dan langkah berikutnya.",
  output: `# Ringkasan Eksekutif

Peluncuran ini memosisikan produk sebagai cara paling sederhana bagi tim kecil untuk mengubah pekerjaan berulang menjadi hasil yang terukur.

## Fokus 30 Hari
- Minggu 1: validasi pesan dengan pelanggan awal
- Minggu 2: siapkan materi penjualan dan demo
- Minggu 3: jalankan peluncuran terbatas
- Minggu 4: ukur aktivasi, retensi, dan umpan balik

## Langkah Berikutnya
Tetapkan pemilik untuk setiap metrik, jadwalkan tinjauan mingguan, dan prioritaskan perbaikan berdasarkan dampak pelanggan.`,
  content:
    "Ringkasan Eksekutif\n\nPeluncuran ini memosisikan produk sebagai cara paling sederhana bagi tim kecil untuk mengubah pekerjaan berulang menjadi alur yang terukur.",
  folder: "Pekerjaan",
  createdAt: Date.UTC(2026, 6, 26),
  updatedAt: Date.UTC(2026, 6, 26),
};

function storageFor(boot) {
  const base = {
    "promptlab-ui-theme": "light",
    "promptlab-trial-used": "0",
  };
  if (boot === "language") {
    return {
      ...base,
      clear: ["promptlab-ui-lang", "promptlab-onboarded", "promptlab-auth-gate", "promptlab-guest"],
    };
  }
  if (boot === "auth") {
    return {
      ...base,
      "promptlab-ui-lang": "id",
      clear: ["promptlab-onboarded", "promptlab-auth-gate", "promptlab-guest"],
    };
  }
  if (boot === "tour") {
    return {
      ...base,
      "promptlab-ui-lang": "id",
      "promptlab-auth-gate": "1",
      "promptlab-guest": "1",
      clear: ["promptlab-onboarded"],
    };
  }
  return {
    ...base,
    "promptlab-ui-lang": "id",
    "promptlab-onboarded": "1",
    "promptlab-auth-gate": "1",
    "promptlab-guest": "1",
    "promptlab-library": JSON.stringify([savedOutput]),
    clear: [],
  };
}

async function waitForStableRender(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(250);
}

async function captureStableScreenshot(page, name) {
  let previousHash = "";
  let lastBuffer = null;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const buffer = await page.screenshot({ type: "png", fullPage: false, animations: "disabled" });
    lastBuffer = buffer;
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash === previousHash) return buffer;
    previousHash = hash;
    await page.waitForTimeout(250);
  }
  // Prefer a usable frame over a hard fail — timers/network can jitter pixels.
  console.warn(`${name}: using last frame after stability retries`);
  return lastBuffer;
}

async function navigateToSurface(page, key) {
  if (key === "tour") {
    const next = page.getByRole("button", { name: /Lanjut|Next/i });
    if (await next.count()) {
      await next.first().click();
      await page.waitForTimeout(200);
      await next.first().click();
      await page.waitForTimeout(200);
    }
    return;
  }
  if (key === "result") {
    await page.getByRole("button", { name: "Riwayat" }).click();
    await page.getByRole("button", { name: /^Peluncuran produk/ }).click();
    await page.locator(".pl-doc--output").waitFor({ state: "visible" });
    await page.locator(".pl-result-tray").scrollIntoViewIfNeeded();
    return;
  }
  if (key === "history") {
    await page.getByRole("button", { name: "Riwayat" }).click();
    return;
  }
  if (key === "account") {
    await page.getByRole("button", { name: "Akun" }).click();
    return;
  }
  if (key === "guide") {
    await page.getByRole("button", { name: "Panduan" }).click();
    return;
  }
  if (key === "workspace") {
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  }
}

function waitForServer(url, timeoutMs = 90000) {
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

async function isServerReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function findFreePort(start = 4188) {
  for (let port = start; port < start + 40; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error("No free preview port available");
}

function startPreview(port) {
  return spawn("npx", ["vite", "preview", "--port", String(port), "--host", "127.0.0.1", "--strictPort"], {
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

let preview = null;
let baseUrl = "";

const reuseCandidates = [4179, 4173, 4180, 4188];
for (const port of reuseCandidates) {
  const url = `http://127.0.0.1:${port}/app`;
  if (await isServerReady(url)) {
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Reusing preview at ${baseUrl}`);
    break;
  }
}

if (!baseUrl) {
  const port = await findFreePort(4188);
  baseUrl = `http://127.0.0.1:${port}`;
  preview = startPreview(port);
  await waitForServer(`${baseUrl}/app`);
  console.log(`Started preview at ${baseUrl}`);
}

const appUrl = `${baseUrl}/app`;

try {
  const browser = await chromium.launch({ channel: "chrome" });

  for (const screen of SCREENS) {
    const seed = storageFor(screen.boot);
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await context.addInitScript(({ seed }) => {
      for (const key of seed.clear || []) localStorage.removeItem(key);
      for (const [key, value] of Object.entries(seed)) {
        if (key === "clear") continue;
        localStorage.setItem(key, value);
      }
    }, { seed });

    const page = await context.newPage();
    await page.goto(appUrl, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: captureCss });
    await page.evaluate(() => {
      const splash = document.getElementById("app-splash");
      if (splash) splash.remove();
    });
    await navigateToSurface(page, screen.key);
    await waitForStableRender(page);
    await page.locator(screen.expect).waitFor({ state: "visible", timeout: 20000 });
    await page.waitForFunction(() => !document.getElementById("app-splash"));

    const theme = await page.evaluate(() => document.documentElement.dataset.uiTheme || "");
    if (theme && theme !== "light") {
      throw new Error(`${screen.key}: expected light theme, got ${theme}`);
    }

    const rawCapture = await captureStableScreenshot(page, screen.key);
    await writeFile(join(outDir, `.native-${screen.key}.png`), rawCapture);
    await exportPhoneScreenshot(rawCapture, join(rawDir, `screenshot-phone-${screen.key}.png`));
    console.log(`captured ${screen.key}`);
    await context.close();
  }

  await browser.close();
} finally {
  if (preview) preview.kill("SIGTERM");
}

console.log(`Raw phone screenshots: ${PHONE_WIDTH}x${PHONE_HEIGHT} in ${rawDir}`);
console.log("Frame for Play Console with: npm run playstore:frame");
