import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildSitemapEntries,
  renderSitemapXml,
  SITEMAP_EXTRA,
} from "../scripts/generate-sitemap.mjs";
import { BLOG_PATHS, SEO_ROUTES, SITE } from "../scripts/seo-routes.mjs";

test("sitemap XML is well-formed and balanced", () => {
  const xml = renderSitemapXml();
  const open = (xml.match(/<url>/g) || []).length;
  const close = (xml.match(/<\/url>/g) || []).length;
  assert.equal(open, close);
  assert.equal(open > 0, true);
  assert.ok(!xml.includes("<url>\n    <url>"));
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
});

test("sitemap includes all indexable marketing routes", () => {
  const locs = buildSitemapEntries().map((entry) => entry.loc);
  assert.ok(locs.includes(SITE));
  for (const path of BLOG_PATHS) {
    assert.ok(locs.includes(SEO_ROUTES[path].canonical), `missing ${path}`);
  }
  for (const extra of SITEMAP_EXTRA) {
    assert.ok(locs.includes(`${SITE}${extra.path}`));
  }
});

test("dist and public sitemap match generator output after build", () => {
  const generated = renderSitemapXml().replace(/\r\n/g, "\n");
  const distXml = readFileSync(join(process.cwd(), "dist", "sitemap.xml"), "utf8").replace(
    /\r\n/g,
    "\n"
  );
  const publicXml = readFileSync(join(process.cwd(), "public", "sitemap.xml"), "utf8").replace(
    /\r\n/g,
    "\n"
  );
  assert.equal(distXml, generated);
  assert.equal(publicXml, generated);
});