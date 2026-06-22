import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BLOG_PATHS, SEO_ROUTES, SITE } from "./seo-routes.mjs";

/** @type {{ path: string; lastmod: string; changefreq: string; priority: number }[]} */
export const SITEMAP_EXTRA = [
  {
    path: "/privacy",
    lastmod: "2026-06-05",
    changefreq: "monthly",
    priority: 0.3,
  },
  {
    path: "/privacy/delete-account",
    lastmod: "2026-06-05",
    changefreq: "monthly",
    priority: 0.2,
  },
];

function maxIsoDate(...dates) {
  return dates.filter(Boolean).sort().at(-1) ?? "2026-06-05";
}

function articleLastmod(path) {
  const route = SEO_ROUTES[path];
  return route?.dateModified || route?.datePublished || null;
}

export function buildSitemapEntries() {
  const articlePaths = BLOG_PATHS.filter((path) => path !== "/blog");
  const latestArticleDate = maxIsoDate(...articlePaths.map(articleLastmod));

  /** @type {{ loc: string; lastmod: string; changefreq: string; priority: number }[]} */
  const entries = [
    {
      loc: SITE,
      lastmod: latestArticleDate,
      changefreq: "weekly",
      priority: 1.0,
    },
  ];

  for (const path of BLOG_PATHS) {
    const route = SEO_ROUTES[path];
    entries.push({
      loc: route.canonical,
      lastmod: path === "/blog" ? latestArticleDate : maxIsoDate(articleLastmod(path)),
      changefreq: path === "/blog" ? "weekly" : "monthly",
      priority: path === "/blog" ? 0.8 : 0.7,
    });
  }

  for (const extra of SITEMAP_EXTRA) {
    entries.push({
      loc: `${SITE}${extra.path}`,
      lastmod: extra.lastmod,
      changefreq: extra.changefreq,
      priority: extra.priority,
    });
  }

  return entries;
}

export function renderSitemapXml(entries = buildSitemapEntries()) {
  const body = entries
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function generateSitemap(targetDir = join(process.cwd(), "public")) {
  const xml = renderSitemapXml();
  const outPath = join(targetDir, "sitemap.xml");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, xml, "utf8");
  return outPath;
}

const isCliEntry =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntry) {
  const out = generateSitemap();
  const entries = buildSitemapEntries();
  console.log(`✓ sitemap.xml generated (${entries.length} URLs) → ${out.replace(process.cwd(), ".")}`);
}