import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { findClosingDiv, stripMarketingForApp } from "../scripts/postbuild.mjs";

const indexHtml = readFileSync(join(process.cwd(), "index.html"), "utf8");

test("findClosingDiv matches nested app-root container", () => {
  const open = indexHtml.indexOf('<div id="app-root">');
  const close = findClosingDiv(indexHtml, open);
  assert.ok(close > open);
  assert.ok(indexHtml.slice(open, close).includes('id="root"'));
  assert.ok(indexHtml.slice(close - 20, close + 6).includes("</div>"));
});

test("stripMarketingForApp keeps only app shell and route scripts", () => {
  const stripped = stripMarketingForApp(indexHtml);
  assert.ok(!stripped.includes('id="landing-page"'), "landing page must be removed from app shell");
  assert.ok(!stripped.includes('id="blog-page"'), "blog page must be removed from app shell");
  assert.ok(!stripped.includes('id="article-page-marketing"'), "article pages must be removed from app shell");
  assert.ok(stripped.includes('id="app-root"'), "app root must remain");
  assert.ok(stripped.includes("ROUTE SWITCHER"), "route switcher scripts must remain");
});
