import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { BLOG_PATHS, SEO_ROUTES } from "../scripts/seo-routes.mjs";

const indexHtml = readFileSync(join(process.cwd(), "index.html"), "utf8");

test("every blog article route has visibility CSS and DOM container", () => {
  for (const path of BLOG_PATHS) {
    if (path === "/blog") continue;

    const route = SEO_ROUTES[path];
    const articleId = route.routeKey.replace(/^article/, "article-page");
    const showRuleRe = new RegExp(
      `html\\[data-route="${route.routeKey}"\\]\\s+#${articleId}\\s*\\{\\s*display:\\s*block\\s*!important;\\s*\\}`,
      "i"
    );
    const hideLandingRe = new RegExp(
      `html\\[data-route="${route.routeKey}"\\]\\s+#landing-page\\s*\\{\\s*display:\\s*none\\s*!important;\\s*\\}`,
      "i"
    );

    assert.ok(showRuleRe.test(indexHtml), `missing article show rule for ${path} (#${articleId})`);
    assert.ok(hideLandingRe.test(indexHtml), `missing landing hide rule for ${path}`);
    assert.ok(
      indexHtml.includes(`id="${articleId}"`),
      `missing article container #${articleId} for ${path}`
    );
    assert.ok(
      indexHtml.includes(`data-page-h1="${route.h1}"`),
      `missing h1 marker data-page-h1="${route.h1}" for ${path}`
    );
  }
});