// postbuild.mjs — rename files after vite build
import { renameSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const indexHtml = join(dist, "index.html");
const landingHtml = join(dist, "landing.html");
const appHtml = join(dist, "app.html");

// 1. Copy React app index.html → app.html
if (existsSync(indexHtml)) {
  copyFileSync(indexHtml, appHtml);
  console.log("✓ index.html → app.html");
}

// 2. Copy landing.html → index.html
if (existsSync(landingHtml)) {
  copyFileSync(landingHtml, indexHtml);
  console.log("✓ landing.html → index.html");
} else {
  console.error("✗ landing.html not found in dist/");
}
