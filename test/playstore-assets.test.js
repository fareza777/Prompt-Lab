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
    ...Array.from({ length: 8 }, (_, index) => [
      `screenshot-${String(index + 1).padStart(2, "0")}.png`,
      [1080, 1920],
    ]),
  ]);

  for (const [name, [width, height]] of expected) {
    const metadata = await sharp(join(assets, name)).metadata();
    assert.deepEqual([metadata.width, metadata.height], [width, height], name);
  }
});

test("feature graphic copy stays inside the 64px safe padding", async () => {
  const source = await readFile(join(root, "scripts", "generate-playstore-assets.mjs"), "utf8");
  assert.match(source, /<svg width="1024" height="500"/);
  assert.match(source, /<text x="430"/);
  assert.doesNotMatch(source, /<text x="(?:9[7-9]\d|10\d\d)"/);
  assert.doesNotMatch(source, /Turn ideas and files into structured prompts for ChatGPT, Claude, Gemini, and more\./);
});

test("screenshot generator uses the eight real RAW 2 captures in chronological order", async () => {
  const source = await readFile(join(root, "scripts", "frame-playstore-screenshots.mjs"), "utf8");
  assert.match(source, /const rawDir = join\(assetsDir, "RAW 2"\)/);
  assert.match(source, /files\.length !== story\.length/);
  assert.match(source, /\.sort\(\(a, b\) => a\.localeCompare\(b\)\)/);
  assert.match(source, /screenshot-\$\{String\(index \+ 1\)\.padStart\(2, "0"\)\}\.png/);
});

test("screenshot narrative covers discovery, document creation, organization, and export", async () => {
  const source = await readFile(join(root, "scripts", "frame-playstore-screenshots.mjs"), "utf8");
  for (const claim of [
    "Semua pekerjaan",
    "Foto masuk",
    "Dokumen panjang",
    "Template yang pas",
    "tertata otomatis",
    "Siap dibagikan",
    "Data pun beres",
    "Mudah sejak",
  ]) {
    assert.match(source, new RegExp(claim));
  }
  assert.match(source, /bagikan PDF, atau unduh Word/);
});

test("screenshot generator preserves real UI pixels inside a rounded phone frame", async () => {
  const source = await readFile(join(root, "scripts", "frame-playstore-screenshots.mjs"), "utf8");
  assert.match(source, /const width = 1080/);
  assert.match(source, /const height = 1920/);
  assert.match(source, /kernel: sharp\.kernel\.lanczos3/);
  assert.match(source, /blend: "dest-in"/);
  assert.doesNotMatch(source, /imagegen|generative fill|mock UI/i);
});

test("Remotion promo is Full HD, 30 seconds, and driven by all eight real captures", async () => {
  const rootSource = await readFile(join(root, "playstore", "remotion", "root.jsx"), "utf8");
  const source = await readFile(join(root, "playstore", "remotion", "video.jsx"), "utf8");
  assert.match(rootSource, /durationInFrames=\{900\}/);
  assert.match(rootSource, /fps=\{30\}/);
  assert.match(rootSource, /width=\{1920\}/);
  assert.match(rootSource, /height=\{1080\}/);
  assert.match(source, /AI WORK STUDIO/);
  assert.match(source, /Html5Audio/);
  for (let index = 1; index <= 8; index += 1) {
    assert.match(source, new RegExp(`shot${index}`));
  }
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
  for (const chunk of ["react", "icons", "supabase"]) {
    assert.match(config, new RegExp(`return "${chunk}"`));
  }
  assert.doesNotMatch(config, /return "vendor"/);

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
