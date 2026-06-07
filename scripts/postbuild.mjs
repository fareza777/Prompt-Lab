// postbuild.mjs — split SEO landing (/) from React app (/app)
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const indexHtml = join(dist, "index.html");
const landingHtml = join(dist, "landing.html");
const appHtml = join(dist, "app.html");

function patchAppHtml(html) {
  return html
    .replace("<html lang=\"en\">", "<html lang=\"en\" class=\"boot-app\">")
    .replace('<div id="app-root" class="app-hidden">', '<div id="app-root">')
    .replace('<div id="landing-page" class="landing-hidden">', '<div id="landing-page" class="landing-hidden" hidden>')
    .replace('<div id="blog-page" class="landing-hidden">', '<div id="blog-page" class="landing-hidden" hidden>');
}

// 1. Copy Vite bundle (monolith) → app.html for /app
if (existsSync(indexHtml)) {
  const raw = readFileSync(indexHtml, "utf8");
  writeFileSync(appHtml, patchAppHtml(raw));
  console.log("✓ index.html → app.html (app shell)");
}

// 2. Landing-only page becomes /
if (existsSync(landingHtml)) {
  let landing = readFileSync(landingHtml, "utf8");
  if (!landing.includes("display-mode: standalone")) {
    const redirect = `<script>(function(){var s=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;if(s)location.replace("/app");})();</script>`;
    landing = landing.replace("</head>", `  ${redirect}\n</head>`);
  }
  writeFileSync(indexHtml, landing);
  console.log("✓ landing.html → index.html (SEO home)");
} else {
  console.error("✗ landing.html not found in dist/");
}
