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

await mkdir(outDir, { recursive: true });

const preview = startPreview();
try {
  await waitForServer(baseUrl);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  await page.addInitScript(() => {
    localStorage.setItem("promptlab-onboarded", "true");
    localStorage.setItem("promptlab-guest", "true");
    localStorage.removeItem("promptlab-auth-intent");
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".v2-shell", { timeout: 30000 });
  await page.waitForTimeout(1200);

  for (const name of screens) {
    const nav = page.locator(".v2-nav button").filter({ hasText: name });
    await nav.first().click({ timeout: 15000 });
    await page.waitForTimeout(1000);
    const file = join(outDir, `screenshot-phone-${name.toLowerCase()}.png`);
    const raw = await page.screenshot({ type: "png" });
    const optimized = await sharp(raw)
      .resize({ width: 1080, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(file, optimized);
    console.log("wrote", file);
  }

  await browser.close();
} finally {
  preview.kill("SIGTERM");
}

console.log(`\nScreenshots saved in ${outDir}`);
