import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BLOG_PATHS, HREFLANG_PAIRS, SEO_ROUTES, SITE, slugFromPath } from "./seo-routes.mjs";

const dist = join(process.cwd(), "dist");
const indexHtml = join(dist, "index.html");

function escAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function setMetaById(html, id, attr, value) {
  const re = new RegExp(`(<[^>]*\\bid="${id}"[^>]*\\b${attr}=")([^"]*)(")`, "i");
  if (re.test(html)) return html.replace(re, `$1${escAttr(value)}$3`);
  const reAlt = new RegExp(`(<[^>]*\\b${attr}=")([^"]*)("[^>]*\\bid="${id}")`, "i");
  return html.replace(reAlt, `$1${escAttr(value)}$3`);
}

function removeMetaById(html, id) {
  return html.replace(new RegExp(`\\s*<meta[^>]*\\bid="${id}"[^>]*>\\s*`, "gi"), "\n");
}

function isoArticleTime(date) {
  return `${date}T00:00:00.000Z`;
}

function applyKeywordsAndArticleMeta(html, path, route) {
  let out = html;
  const isArticle = route.ogType === "article" && route.headline;

  if (route.keywords) {
    out = setMetaById(out, "meta-keywords", "content", route.keywords);
  }

  if (isArticle) {
    out = setMetaById(out, "og-image-alt", "content", route.headline);
    if (route.datePublished) {
      out = setMetaById(
        out,
        "og-article-published",
        "content",
        isoArticleTime(route.datePublished)
      );
    }
    if (route.dateModified || route.datePublished) {
      out = setMetaById(
        out,
        "og-article-modified",
        "content",
        isoArticleTime(route.dateModified || route.datePublished)
      );
    }
    return out;
  }

  out = removeMetaById(out, "og-article-published");
  out = removeMetaById(out, "og-article-modified");

  if (path === "/" || path === "/blog") {
    out = setMetaById(out, "og-image-alt", "content", "PromptLab — AI Prompt Workspace");
  }

  return out;
}

function blogPostingSchema(route) {
  const posting = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: route.headline,
    description: route.description,
    author: { "@type": "Organization", name: "PromptLab" },
    publisher: { "@type": "Organization", name: "PromptLab", url: SITE },
    datePublished: route.datePublished,
    dateModified: route.dateModified,
    mainEntityOfPage: route.canonical,
    url: route.canonical,
    image: `${SITE}/og-image.png`,
    keywords: route.keywords,
  };
  if (route.inLanguage) posting.inLanguage = route.inLanguage;
  return JSON.stringify(posting, null, 4);
}

function breadcrumbSchema(route) {
  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
  ];
  if (route.headline) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: route.headline,
      item: route.canonical,
    });
  }
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items,
    },
    null,
    4
  );
}

function blogItemListSchema() {
  const articles = BLOG_PATHS.filter((p) => p !== "/blog").map((path, i) => {
    const route = SEO_ROUTES[path];
    return {
      "@type": "ListItem",
      position: i + 1,
      name: route.headline || route.title,
      url: route.canonical,
    };
  });
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "PromptLab Blog Articles",
      itemListElement: articles,
    },
    null,
    4
  );
}

function replaceScriptInner(html, id, jsonBody) {
  const re = new RegExp(
    `(<script[^>]*\\bid="${id}"[^>]*>)([\\s\\S]*?)(<\\/script>)`,
    "i"
  );
  if (!re.test(html)) throw new Error(`Script #${id} not found in index.html`);
  return html.replace(re, `$1\n    ${jsonBody}\n    $3`);
}

function applyHreflangStatic(html, path, canonical) {
  const pair = HREFLANG_PAIRS[path];
  let out = html;
  if (pair) {
    out = setMetaById(out, "hreflang-en", "href", pair.en);
    out = setMetaById(out, "hreflang-x-default", "href", pair.en);
    if (!out.includes('id="hreflang-id"')) {
      out = out.replace(
        '<link id="hreflang-x-default"',
        `<link id="hreflang-id" rel="alternate" hreflang="id" href="${escAttr(pair.id)}" />\n    <link id="hreflang-x-default"`
      );
    } else {
      out = setMetaById(out, "hreflang-id", "href", pair.id);
    }
    return out;
  }
  out = out.replace(/\s*<link id="hreflang-id"[^>]*>\s*/i, "\n");
  out = setMetaById(out, "hreflang-en", "href", canonical);
  out = setMetaById(out, "hreflang-x-default", "href", canonical);
  return out;
}

function patchHtml(baseHtml, path) {
  const route = SEO_ROUTES[path];
  if (!route) throw new Error(`Missing SEO route: ${path}`);

  let html = baseHtml.replace(
    /<html lang="[^"]*">/i,
    `<html lang="${route.lang}" data-route="${route.routeKey}">`
  );

  html = html.replace(
    /(<title id="page-title">)([^<]*)(<\/title>)/i,
    `$1${escText(route.title)}$3`
  );

  html = setMetaById(html, "meta-description", "content", route.description);
  html = setMetaById(html, "og-title", "content", route.title);
  html = setMetaById(html, "og-description", "content", route.description);
  html = setMetaById(html, "og-url", "content", route.canonical);
  html = setMetaById(html, "og-type", "content", route.ogType || "website");
  html = setMetaById(html, "twitter-title", "content", route.title);
  html = setMetaById(html, "twitter-description", "content", route.description);
  html = setMetaById(html, "canonical-link", "href", route.canonical);
  html = applyHreflangStatic(html, path, route.canonical);
  html = applyKeywordsAndArticleMeta(html, path, route);

  if (path === "/blog") {
    html = replaceScriptInner(html, "ld-breadcrumbs", breadcrumbSchema(route));
    html = replaceScriptInner(html, "ld-blog-postings", blogItemListSchema());
  } else if (route.headline) {
    html = replaceScriptInner(html, "ld-breadcrumbs", breadcrumbSchema(route));
    html = replaceScriptInner(html, "ld-blog-postings", blogPostingSchema(route));
  }

  return html;
}

export function generateSeoPages() {
  if (!existsSync(indexHtml)) {
    console.error("✗ dist/index.html not found — run vite build first");
    process.exit(1);
  }

  const baseHtml = readFileSync(indexHtml, "utf8");
  let count = 0;

  for (const path of BLOG_PATHS) {
    const slug = slugFromPath(path);
    const outPath =
      slug === ""
        ? join(dist, "blog", "index.html")
        : join(dist, "blog", slug, "index.html");

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, patchHtml(baseHtml, path), "utf8");
    count += 1;
    console.log(`✓ SEO page ${path} → ${outPath.replace(dist, "dist")}`);
  }

  console.log(`✓ ${count} static SEO blog pages generated`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  generateSeoPages();
}
