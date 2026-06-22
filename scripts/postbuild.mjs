// postbuild.mjs — split app shell (/app) from marketing site (/)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateSeoPages } from "./generate-seo-pages.mjs";
import { generateSitemap } from "./generate-sitemap.mjs";

const dist = join(process.cwd(), "dist");
const indexHtml = join(dist, "index.html");
const appHtml = join(dist, "app.html");

const APP_NOINDEX = '<meta name="robots" content="noindex, nofollow" data-app-noindex="1" />';

function patchAppHtml(html) {
  let out = html
    .replace("<html lang=\"en\">", "<html lang=\"en\" class=\"boot-app\">")
    .replace('<div id="app-root">', '<div id="app-root">');

  if (!out.includes("data-app-noindex")) {
    out = out.replace("</head>", `  ${APP_NOINDEX}\n  <script src="/seo-route.js"></script>\n</head>`);
  }

  return out
    .replace("<html lang=\"en\" class=\"boot-app\">", "<html lang=\"en\" class=\"boot-app\" data-route=\"app\">");
}

function relocateModuleScriptsToBody(html) {
  const scriptTags = [];
  const withoutHeadScripts = html.replace(
    /\s*<script type="module"[^>]*><\/script>\s*/g,
    (match) => {
      scriptTags.push(match.trim());
      return "\n";
    }
  );
  const linkTags = [];
  const withoutPreloads = withoutHeadScripts.replace(
    /\s*<link rel="modulepreload"[^>]*>\s*/g,
    (match) => {
      linkTags.push(match.trim());
      return "\n";
    }
  );
  const bundle = [...linkTags, ...scriptTags].join("\n    ");
  if (!bundle) return html;
  return withoutPreloads.replace("</body>", `    ${bundle}\n  </body>`);
}

function patchBuiltHtml(html) {
  return relocateModuleScriptsToBody(html);
}

if (existsSync(indexHtml)) {
  const raw = readFileSync(indexHtml, "utf8");
  const patched = patchBuiltHtml(raw);
  writeFileSync(indexHtml, patched);
  writeFileSync(appHtml, patchAppHtml(patched));
  console.log("✓ index.html → app.html (app shell, noindex)");
  generateSeoPages();
  generateSitemap(dist);
  generateSitemap(join(process.cwd(), "public"));
  console.log("✓ sitemap.xml → dist/ and public/");
} else {
  console.error("✗ index.html not found in dist/");
}
