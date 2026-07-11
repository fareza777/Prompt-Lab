import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
const SURFACE_EXPECTATIONS = Object.fromEntries(screens.map((name) => [name, `PromptLab / ${name}`]));
const PHONE_WIDTH = 1080;
const PHONE_HEIGHT = 1920;

const mobileChromeCss = `
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
  .v2-shell::before { display: none !important; }
  #app-splash { display: none !important; }
`;

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
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const buffer = await page.screenshot({ type: "png", fullPage: false, animations: "disabled" });
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash === previousHash) return buffer;
    previousHash = hash;
    await page.waitForTimeout(250);
  }
  throw new Error(`${name}: raster output did not stabilize after five captures`);
}

async function assertSurfaceReady(page, name) {
  const expectedBreadcrumb = SURFACE_EXPECTATIONS[name];
  const breadcrumb = page.locator(".v2-headerbar .v2-eyebrow");
  await breadcrumb.filter({ hasText: expectedBreadcrumb }).waitFor({ state: "visible" });
  const heading = page.locator(".v2-main h1").first();
  if (!(await heading.isVisible()) || !(await heading.innerText()).trim()) {
    throw new Error(`${name}: page heading is missing or empty`);
  }

  const layout = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    mainRight: document.querySelector(".v2-main")?.getBoundingClientRect().right,
  }));
  if (layout.documentWidth > layout.viewportWidth || layout.mainRight > layout.viewportWidth + 0.5) {
    throw new Error(`${name}: horizontal overflow detected: ${JSON.stringify(layout)}`);
  }

  const navState = await page.locator(".v2-bottom-nav button").evaluateAll((buttons) => {
    const colorToRgba = (color) => {
      const values = color.match(/[\d.]+/g)?.map(Number) || [];
      if (color.startsWith("rgb")) return [values[0], values[1], values[2], values[3] ?? 1];
      if (color.startsWith("oklch")) {
        const [lightness, chroma, hue, alpha = 1] = values;
        const radians = hue * Math.PI / 180;
        const a = chroma * Math.cos(radians);
        const b = chroma * Math.sin(radians);
        const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
        const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
        const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
        const gamma = (value) => 255 * (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);
        return [
          gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
          gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
          gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
          alpha,
        ];
      }
      throw new Error(`Unsupported computed color: ${color}`);
    };
    const luminance = ([r, g, b]) => {
      const channels = [r, g, b].map((value) => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const contrastRatio = (foreground, background, parentBackground) => {
      const alpha = background[3] ?? 1;
      const effectiveBackground = background.slice(0, 3).map((value, index) => value * alpha + parentBackground[index] * (1 - alpha));
      const lighter = Math.max(luminance(foreground), luminance(effectiveBackground));
      const darker = Math.min(luminance(foreground), luminance(effectiveBackground));
      return (lighter + 0.05) / (darker + 0.05);
    };

    return buttons.map((button) => {
      const style = getComputedStyle(button);
      const parentStyle = getComputedStyle(button.parentElement);
      const rect = button.getBoundingClientRect();
      const icon = button.querySelector("svg");
      const label = button.querySelector("span");
      const iconRect = icon?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      const accessibleName = (button.getAttribute("aria-label") || button.innerText || "").trim();
      const iconVisible = Boolean(icon && getComputedStyle(icon).visibility !== "hidden" && iconRect?.width && iconRect?.height);
      const insideViewport = rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
      const topElement = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const receivesPointer = Boolean(topElement && (topElement === button || button.contains(topElement)));
      const labelInsideButton = Boolean(labelRect && labelRect.left >= rect.left && labelRect.right <= rect.right && labelRect.top >= rect.top && labelRect.bottom <= rect.bottom);
      return {
        accessibleName,
        iconVisible,
        insideViewport,
        receivesPointer,
        labelInsideButton,
        contrastRatio: contrastRatio(colorToRgba(style.color), colorToRgba(style.backgroundColor), colorToRgba(parentStyle.backgroundColor)),
      };
    });
  });

  if (navState.length !== MOBILE_TABS.length) throw new Error(`${name}: expected five bottom navigation buttons`);
  for (const [index, state] of navState.entries()) {
    if (!state.accessibleName || !state.iconVisible || !state.insideViewport || !state.receivesPointer || !state.labelInsideButton || state.contrastRatio < 3) {
      throw new Error(`${name}: invalid bottom navigation button ${index + 1}: ${JSON.stringify(state)}`);
    }
  }
}

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
    .resize(PHONE_WIDTH, PHONE_HEIGHT, { fit: "fill", kernel: sharp.kernel.lanczos3 })
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
    viewport: { width: 360, height: 640 },
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
  await waitForStableRender(page);

  for (const name of screens) {
    // Start every surface from a fresh compositor frame. Reusing a long-lived
    // backdrop-heavy page can leave stale raster tiles in headless Chrome.
    await page.reload({ waitUntil: "networkidle" });
    if (await page.getByRole("button", { name: /Continue as Guest/i }).count()) {
      await page.getByRole("button", { name: /Continue as Guest/i }).click();
    }
    await page.waitForSelector(".v2-shell", { timeout: 30000 });
    await page.addStyleTag({ content: mobileChromeCss });
    await waitForStableRender(page);
    const bottom = page.locator(".v2-bottom-nav button").filter({ hasText: name });
    const header = page.locator(".v2-icon-btn[title='Settings']");
    if (name === "Settings" && (await header.count())) {
      await header.first().click({ timeout: 15000 });
    } else if (await bottom.count()) {
      // A fixed mobile nav is already validated with elementFromPoint below.
      // Dispatch in-page so Playwright does not auto-scroll the page beneath it
      // and move a content chip under the pointer between actionability checks.
      await bottom.first().evaluate((button) => button.click());
    } else {
      const side = page.locator(".v2-nav button").filter({ hasText: name });
      await side.first().click({ timeout: 15000 });
    }
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await waitForStableRender(page);
    await assertSurfaceReady(page, name);
    const file = join(outDir, `screenshot-phone-${name.toLowerCase()}.png`);
    const raw = await captureStableScreenshot(page, name);
    await exportPhoneScreenshot(raw, file);
  }

  await browser.close();
} finally {
  preview.kill("SIGTERM");
}

console.log(`\nPhone screenshots: ${PHONE_WIDTH}x${PHONE_HEIGHT} (9:16) in ${outDir}`);
