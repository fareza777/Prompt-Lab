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
    ...["builder", "optimizer", "templates", "library", "compare", "settings"]
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

test("capture script targets the current five-tab V2 navigation and all six surfaces", async () => {
  const source = await readFile(join(root, "scripts", "capture-playstore-screenshots.mjs"), "utf8");
  assert.match(source, /const MOBILE_TABS = \["Builder", "Optimizer", "Templates", "Library", "Compare"\];/);
  assert.match(source, /const screens = \[\.\.\.MOBILE_TABS, "Settings"\];/);
  assert.match(source, /\.v2-bottom-nav/);
  assert.doesNotMatch(source, /\.bottom-nav(?![\w-])/);
});

test("capture validates every surface and bottom navigation before writing PNGs", async () => {
  const source = await readFile(join(root, "scripts", "capture-playstore-screenshots.mjs"), "utf8");
  assert.match(source, /const SURFACE_EXPECTATIONS =/);
  assert.match(source, /async function assertSurfaceReady/);
  assert.match(source, /await assertSurfaceReady\(page, name\)/);
  assert.match(source, /document\.fonts\.ready/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /contrastRatio/);
  assert.match(source, /accessibleName/);
  assert.match(source, /iconVisible/);
  assert.match(source, /insideViewport/);
  assert.match(source, /receivesPointer/);
  assert.match(source, /labelInsideButton/);
});

test("capture uses natural responsive CSS at a 1080x1920 device viewport", async () => {
  const source = await readFile(join(root, "scripts", "capture-playstore-screenshots.mjs"), "utf8");
  assert.match(source, /viewport: \{ width: 360, height: 640 \}/);
  assert.match(source, /deviceScaleFactor: 3/);
  assert.doesNotMatch(source, /\.v2-shell \{/);
  assert.doesNotMatch(source, /grid-template-columns: repeat\(5/);
});

test("production CSS gives bottom navigation buttons explicit V2 styling", async () => {
  const css = await readFile(join(root, "src", "styles.css"), "utf8");
  assert.match(css, /\.v2-nav button,\s*\.v2-bottom-nav button,/);
  assert.match(css, /\.v2-nav button,\s*\.v2-bottom-nav button \{[\s\S]*display: flex;/);
  assert.match(css, /@media \(max-width: 1180px\) \{[\s\S]*?\.v2-shell > \.v2-main \{[\s\S]*?z-index: auto;[\s\S]*?\.v2-bottom-nav \{[\s\S]*?z-index: 1000;/);
  assert.match(css, /\.v2-bottom-nav button \{[\s\S]*?flex-direction: column;[\s\S]*?font-size: 10px;/);
});

test("production entry graph stays within the documented initial JS and CSS budget", async () => {
  const config = await readFile(join(root, "vite.config.js"), "utf8");
  assert.match(config, /INITIAL_JS_BUDGET_KB = 700/);
  assert.match(config, /INITIAL_CSS_BUDGET_KB = 80/);
  assert.match(config, /enforceInitialAssetBudget/);
  for (const chunk of ["react", "icons", "supabase", "vendor"]) {
    assert.match(config, new RegExp(`return "${chunk}"`));
  }

  const files = await readdir(join(root, "dist", "assets"), { withFileTypes: true });
  const sizes = await Promise.all(files.filter((file) => file.isFile()).map(async (file) => ({
    name: file.name,
    bytes: (await readFile(join(root, "dist", "assets", file.name))).length,
  })));
  const jsKb = sizes.filter(({ name }) => name.endsWith(".js")).reduce((sum, file) => sum + file.bytes, 0) / 1024;
  const cssKb = sizes.filter(({ name }) => name.endsWith(".css")).reduce((sum, file) => sum + file.bytes, 0) / 1024;
  assert.ok(jsKb <= 700, `initial JS is ${jsKb.toFixed(1)} KiB`);
  assert.ok(cssKb <= 80, `initial CSS is ${cssKb.toFixed(1)} KiB`);
});
