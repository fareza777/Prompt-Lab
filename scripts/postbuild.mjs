// postbuild.mjs — split app shell (/app) from marketing site (/)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { generateSeoPages } from "./generate-seo-pages.mjs";
import { generateSitemap } from "./generate-sitemap.mjs";

const dist = join(process.cwd(), "dist");
const indexHtml = join(dist, "index.html");
const appHtml = join(dist, "app.html");
const isDirectRun = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

const APP_NOINDEX = '<meta name="robots" content="noindex, nofollow" data-app-noindex="1" />';
const APP_MARKER = "<!-- ============================== APP ============================== -->";
const ROUTE_SWITCHER_MARKER = "<!-- ============================== ROUTE SWITCHER";

/** Walk from `<div` at openIndex and return index after its matching `</div>`. */
export function findClosingDiv(html, openIndex) {
  let depth = 0;
  let i = openIndex;
  while (i < html.length) {
    if (html.startsWith("<div", i)) {
      const next = html[i + 4];
      if (next === " " || next === ">" || next === "\n" || next === "\r" || next === "\t") {
        depth += 1;
        i += 4;
        continue;
      }
    }
    if (html.startsWith("</div>", i)) {
      depth -= 1;
      if (depth === 0) return i + "</div>".length;
      i += "</div>".length;
      continue;
    }
    i += 1;
  }
  return -1;
}

/** `/app` shell must not ship landing/blog/article DOM — prevents footer overlap with React auth gate. */
export function stripMarketingForApp(html) {
  const headEndMatch = /<\/head\s*>/i.exec(html);
  const bodySearchStart = headEndMatch ? headEndMatch.index + headEndMatch[0].length : 0;
  const bodyTagMatch = /<body[^>]*>/i.exec(html.slice(bodySearchStart));
  if (!bodyTagMatch) return html;

  const bodyContentStart = bodySearchStart + bodyTagMatch.index + bodyTagMatch[0].length;
  const appStart = html.indexOf(APP_MARKER);
  if (appStart === -1) return html;

  const appRootOpen = html.indexOf('<div id="app-root">', appStart);
  if (appRootOpen === -1) return html;

  const appRootEnd = findClosingDiv(html, appRootOpen);
  if (appRootEnd === -1) return html;

  const routeStart = html.indexOf(ROUTE_SWITCHER_MARKER);
  const tail =
    routeStart !== -1
      ? `\n\n    ${html.slice(routeStart)}`
      : html.slice(html.lastIndexOf("</body>"));

  return `${html.slice(0, bodyContentStart)}\n    ${html.slice(appStart, appRootEnd)}${tail}`;
}

function patchAppHtml(html) {
  let out = stripMarketingForApp(html)
    .replace("<html lang=\"en\">", "<html lang=\"en\" class=\"boot-app\" data-route=\"app\">")
    .replace('<html lang="en" class="boot-app">', '<html lang="en" class="boot-app" data-route="app">');

  if (!out.includes("data-app-noindex")) {
    out = out.replace("</head>", `  ${APP_NOINDEX}\n</head>`);
  }

  return out;
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

function stripArticleMeta(html) {
  return html.replace(
    /\s*<meta id="og-article-(?:published|modified)"[^>]*>\s*/gi,
    "\n"
  );
}

if (isDirectRun && existsSync(indexHtml)) {
  const raw = readFileSync(indexHtml, "utf8");
  const patched = patchBuiltHtml(raw);
  writeFileSync(indexHtml, patched);
  writeFileSync(appHtml, stripArticleMeta(patchAppHtml(patched)));
  console.log("✓ index.html → app.html (app shell, noindex)");
  generateSeoPages();
  writeFileSync(indexHtml, stripArticleMeta(patched));
  generateSitemap(dist);
  generateSitemap(join(process.cwd(), "public"));
  console.log("✓ sitemap.xml → dist/ and public/");
} else if (isDirectRun) {
  console.error("✗ index.html not found in dist/");
}
