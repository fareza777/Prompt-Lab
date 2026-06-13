import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { BLOG_PATHS, SEO_ROUTES, slugFromPath } from "../scripts/seo-routes.mjs";

test("every blog path has static SEO page after build", () => {
  for (const path of BLOG_PATHS) {
    const slug = slugFromPath(path);
    const file =
      slug === ""
        ? join(process.cwd(), "dist", "blog", "index.html")
        : join(process.cwd(), "dist", "blog", slug, "index.html");
    assert.equal(existsSync(file), true, `missing ${file}`);
    const html = readFileSync(file, "utf8");
    const route = SEO_ROUTES[path];
    assert.ok(html.includes(route.canonical), `canonical missing for ${path}`);
    assert.ok(
      html.includes(route.title) || html.includes(route.title.replace(/&/g, "&amp;")),
      `title missing for ${path}`
    );
    assert.ok(html.includes(`data-route="${route.routeKey}"`));
    assert.ok(html.includes(`lang="${route.lang}"`));
  }
});

test("article pages embed single BlogPosting schema", () => {
  const path = "/blog/prompt-engineering-guide";
  const html = readFileSync(
    join(process.cwd(), "dist", "blog", "prompt-engineering-guide", "index.html"),
    "utf8"
  );
  assert.ok(html.includes('"@type": "BlogPosting"'));
  assert.ok(!html.includes('"@type": "ItemList"'));
  assert.ok(html.includes('"headline": "The Complete Guide to Prompt Engineering in 2026"'));
});

test("blog index embeds ItemList schema", () => {
  const html = readFileSync(join(process.cwd(), "dist", "blog", "index.html"), "utf8");
  assert.ok(html.includes('"@type": "ItemList"'));
  assert.ok(html.includes("https://prompt-lab.xyz/blog"));
});
