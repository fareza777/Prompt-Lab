import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = process.cwd();
const outDir = join(root, "playstore", "assets");
const port = 4173;
const baseUrl = `http://127.0.0.1:${port}`;

const screens = ["Builder", "Optimizer", "Templates", "Library", "Settings"];
const PHONE_WIDTH = 1080;
const PHONE_HEIGHT = 1920;

const mobileChromeCss = `
  .v2-shell { grid-template-columns: 1fr !important; min-height: 100vh !important; }
  .v2-sidebar {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: center !important;
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    height: 84px !important;
    width: 100% !important;
    padding: 10px 6px calc(10px + env(safe-area-inset-bottom)) !important;
    border-top: 1px solid rgba(125, 211, 252, 0.2) !important;
    background: rgba(6, 16, 17, 0.96) !important;
    backdrop-filter: blur(16px) !important;
    z-index: 1000 !important;
  }
  .v2-brand, .v2-recent-list, .v2-quota-card, .v2-side-card { display: none !important; }
  .v2-nav {
    display: flex !important;
    flex-direction: row !important;
    gap: 4px !important;
    width: 100% !important;
    justify-content: space-between !important;
  }
  .v2-nav button {
    flex: 1 !important;
    min-height: 56px !important;
    padding: 6px 4px !important;
    flex-direction: column !important;
    gap: 4px !important;
    font-size: 10px !important;
  }
  .v2-nav button span { display: block !important; font-size: 10px !important; line-height: 1.1 !important; }
  .v2-main { padding: 12px 12px 100px !important; }
  .v2-headerbar { flex-wrap: wrap !important; gap: 8px !important; }
  .v2-studio-grid, .v2-diff-grid, .v2-library-grid { grid-template-columns: 1fr !important; }
  .v2-hero h1 { font-size: clamp(28px, 7vw, 40px) !important; }
  #app-splash { display: none !important; }
`;

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (response.ok) return resolve();
      } catch {
        // retry
      }
      if (Date.now() - start > timeoutMs) return reject(new Error(`Server not ready: ${url}`));
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
    .resize(PHONE_WIDTH, PHONE_HEIGHT, { fit: "cover", position: "top" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(file, optimized);
  const meta = await sharp(optimized).metadata();
  console.log("wrote", file, `${meta.width}x${meta.height}`, `${Math.round(optimized.length / 1024)} KB`);
}

await mkdir(outDir, { recursive: true });

const preview = startPreview();
try {
  await waitForServer(baseUrl);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: PHONE_WIDTH, height: PHONE_HEIGHT },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });

  await page.addInitScript(() => {
    localStorage.setItem("promptlab-onboarded", "true");
    localStorage.setItem("promptlab-guest", "true");
    localStorage.removeItem("promptlab-auth-intent");
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".v2-shell", { timeout: 30000 });
  await page.addStyleTag({ content: mobileChromeCss });
  await page.waitForTimeout(1500);

  for (const name of screens) {
    const nav = page.locator(".v2-nav button").filter({ hasText: name });
    await nav.first().click({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const file = join(outDir, `screenshot-phone-${name.toLowerCase()}.png`);
    const raw = await page.screenshot({ type: "png", fullPage: false });
    await exportPhoneScreenshot(raw, file);
  }

  await browser.close();
} finally {
  preview.kill("SIGTERM");
}

console.log(`\nPhone screenshots: ${PHONE_WIDTH}x${PHONE_HEIGHT} (9:16) in ${outDir}`);
