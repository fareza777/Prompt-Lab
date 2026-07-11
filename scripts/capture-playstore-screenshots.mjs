import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = process.cwd();
const outDir = join(root, "playstore", "assets");
const port = 4173;
const baseUrl = `http://127.0.0.1:${port}`;

const MOBILE_TABS = ["Builder", "Optimizer", "Templates", "Library", "Compare"];
const screens = [...MOBILE_TABS, "Settings"];
const PHONE_WIDTH = 1080;
const PHONE_HEIGHT = 1920;

const mobileChromeCss = `
  .v2-shell { grid-template-columns: 1fr !important; min-height: 100vh !important; }
  .v2-sidebar { display: none !important; }
  .v2-bottom-nav {
    display: grid !important;
    position: fixed !important;
    left: 12px !important;
    right: 12px !important;
    bottom: max(12px, env(safe-area-inset-bottom)) !important;
    z-index: 1000 !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    gap: 4px !important;
    padding: 5px !important;
    background: rgba(12, 20, 26, 0.96) !important;
    border: 1px solid rgba(148, 163, 184, 0.22) !important;
    border-radius: 16px !important;
  }
  .v2-bottom-nav button {
    min-height: 48px !important;
    font-size: 10px !important;
  }
  .v2-main { padding: 12px 12px 110px !important; }
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

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({
    viewport: { width: PHONE_WIDTH, height: PHONE_HEIGHT },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });

  await page.addInitScript(() => {
    localStorage.setItem("promptlab-onboarded", "1");
    localStorage.removeItem("promptlab-guest");
    localStorage.removeItem("promptlab-auth-intent");
  });

  await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
  if (await page.getByRole("button", { name: /Continue as Guest/i }).count()) {
    await page.getByRole("button", { name: /Continue as Guest/i }).click();
  }
  await page.waitForSelector(".v2-shell", { timeout: 30000 });
  await page.addStyleTag({ content: mobileChromeCss });
  await page.waitForTimeout(1500);

  for (const name of screens) {
    const bottom = page.locator(".v2-bottom-nav button").filter({ hasText: name });
    const header = page.locator(".v2-icon-btn[title='Settings']");
    if (name === "Settings" && (await header.count())) {
      await header.first().click({ timeout: 15000 });
    } else if (await bottom.count()) {
      await bottom.first().click({ timeout: 15000 });
    } else {
      const side = page.locator(".v2-nav button").filter({ hasText: name });
      await side.first().click({ timeout: 15000 });
    }
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
