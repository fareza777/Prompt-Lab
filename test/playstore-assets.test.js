import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

const root = process.cwd();
const assets = join(root, "playstore", "assets");

test("Play Store graphics have the required dimensions", async () => {
  const expected = new Map([
    ["app-icon-512.png", [512, 512]],
    ["feature-graphic-1024x500.png", [1024, 500]],
    ...["workspace", "result", "prompt-tools", "history", "account", "guide"]
      .map((screen) => [`screenshot-phone-${screen}.png`, [1080, 1920]]),
  ]);

  for (const [name, [width, height]] of expected) {
    const metadata = await sharp(join(assets, name)).metadata();
    assert.deepEqual([metadata.width, metadata.height], [width, height], name);
  }
});

test("feature graphic copy stays inside the 64px safe padding", async () => {
  const source = await readFile(join(root, "scripts", "generate-playstore-assets.mjs"), "utf8");
  assert.match(source, /const FEATURE_TEXT_RIGHT = 960;/);
  assert.match(source, /wrapSvgText\([\s\S]*FEATURE_TEXT_RIGHT/);
  assert.doesNotMatch(source, /Turn ideas and files into structured prompts for ChatGPT, Claude, Gemini, and more\./);
});

test("capture script targets the current result-first workspace and all six surfaces", async () => {
  const source = await readFile(join(root, "scripts", "capture-playstore-screenshots.mjs"), "utf8");
  assert.match(source, /const screens = \["workspace", "result", "prompt-tools", "history", "account", "guide"\];/);
  assert.match(source, /promptlab-library/);
  assert.match(source, /pl-workbench/);
  assert.match(source, /result\.viewPrompt|Lihat prompt/);
  assert.doesNotMatch(source, /MOBILE_TABS|v2-bottom-nav/);
});

test("capture validates every result-first surface before writing PNGs", async () => {
  const source = await readFile(join(root, "scripts", "capture-playstore-screenshots.mjs"), "utf8");
  assert.match(source, /const SURFACE_EXPECTATIONS =/);
  assert.match(source, /async function assertSurfaceReady/);
  assert.match(source, /await assertSurfaceReady\(page, name\)/);
  assert.match(source, /document\.fonts\.ready/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /document\.documentElement\.scrollWidth/);
  assert.match(source, /async function captureStableScreenshot/);
  assert.match(source, /browser\.newContext/);
  assert.match(source, /await context\.close\(\)/);
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /backdrop-filter: none !important/);
  assert.match(source, /\.pl-top/);
});

test("capture uses natural responsive CSS at a 1080x1920 device viewport", async () => {
  const source = await readFile(join(root, "scripts", "capture-playstore-screenshots.mjs"), "utf8");
  assert.match(source, /viewport: \{ width: 360, height: 640 \}/);
  assert.match(source, /deviceScaleFactor: 1/);
  assert.match(source, /kernel: sharp\.kernel\.lanczos3/);
  assert.match(source, /resize\(PHONE_WIDTH, PHONE_HEIGHT, \{ fit: "fill"/);
  assert.doesNotMatch(source, /\.v2-shell|grid-template-columns: repeat\(5/);
});

test("promo pipeline uses the warm result-first release identity", async () => {
  const source = await readFile(join(root, "scripts", "create-promo-video.mjs"), "utf8");
  assert.match(source, /AI WORK STUDIO/);
  assert.match(source, /#F7F3EB/i);
  assert.doesNotMatch(source, /#050a0c|FROM IDEA TO PROMPT/);
});

test("production CSS gives bottom navigation buttons explicit V2 styling", async () => {
  const css = await readFile(join(root, "src", "styles.css"), "utf8");
  assert.match(css, /\.v2-nav button,\s*\.v2-bottom-nav button,/);
  assert.match(css, /\.v2-nav button,\s*\.v2-bottom-nav button \{[\s\S]*display: flex;/);
  assert.match(css, /@media \(max-width: 1180px\) \{[\s\S]*?\.v2-shell > \.v2-main \{[\s\S]*?z-index: auto;[\s\S]*?\.v2-bottom-nav \{[\s\S]*?z-index: 1000;/);
  assert.match(css, /\.v2-bottom-nav button \{[\s\S]*?flex-direction: column;[\s\S]*?font-size: 10px;/);
  assert.match(css, /@media \(max-width: 760px\) \{[\s\S]*?\.v2-card,[\s\S]*?\.v2-diff-grid > \* \{[\s\S]*?min-width: 0;/);
  assert.match(css, /\.v2-chip-row \{[\s\S]*?flex-wrap: wrap;[\s\S]*?overflow-x: visible;/);
});

test("production entry graph stays within the documented initial JS and CSS budget", async () => {
  const config = await readFile(join(root, "vite.config.js"), "utf8");
  assert.match(config, /INITIAL_JS_BUDGET_KB = 700/);
  assert.match(config, /INITIAL_CSS_BUDGET_KB = 80/);
  assert.match(config, /enforceInitialAssetBudget/);
  for (const chunk of ["react", "icons", "supabase", "vendor"]) {
    assert.match(config, new RegExp(`return "${chunk}"`));
  }

  // "Initial" means what the app route actually loads before it is usable:
  // the entry document's own <script>/<link> graph. Assets fetched later
  // through a dynamic import (the admin console) are excluded on purpose —
  // counting them made lazy-loading unable to satisfy the budget it exists to
  // encourage.
  const appHtml = await readFile(join(root, "dist", "app.html"), "utf8");
  const referenced = new Set(
    [...appHtml.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)].map((match) => match[1])
  );
  assert.ok(referenced.size > 0, "app.html references no build assets");

  const files = await readdir(join(root, "dist", "assets"), { withFileTypes: true });
  const sizes = await Promise.all(
    files
      .filter((file) => file.isFile() && referenced.has(file.name))
      .map(async (file) => ({
        name: file.name,
        bytes: (await readFile(join(root, "dist", "assets", file.name))).length,
      }))
  );
  const jsKb = sizes.filter(({ name }) => name.endsWith(".js")).reduce((sum, file) => sum + file.bytes, 0) / 1024;
  const cssKb = sizes.filter(({ name }) => name.endsWith(".css")).reduce((sum, file) => sum + file.bytes, 0) / 1024;
  assert.ok(jsKb <= 700, `initial JS is ${jsKb.toFixed(1)} KiB`);
  assert.ok(cssKb <= 80, `initial CSS is ${cssKb.toFixed(1)} KiB`);

  // The admin console must stay off the initial path.
  const adminAssets = files.filter((file) => file.name.startsWith("AdminConsole"));
  assert.ok(adminAssets.length > 0, "admin console should be emitted as its own chunk");
  for (const asset of adminAssets) {
    assert.ok(!referenced.has(asset.name), `${asset.name} must not load on the initial path`);
  }
});
