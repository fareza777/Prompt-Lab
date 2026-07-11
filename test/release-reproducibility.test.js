import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { BLOG_PATHS, SEO_ROUTES } from "../scripts/seo-routes.mjs";

const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
const verifyWorkflow = readFileSync(
  join(process.cwd(), ".github", "workflows", "verify.yml"),
  "utf8"
);
const releaseGuide = readFileSync(join(process.cwd(), "playstore", "PRODUCTION_GO_LIVE.md"), "utf8");
const readme = readFileSync(join(process.cwd(), "playstore", "README.md"), "utf8");
const sourceHtml = readFileSync(join(process.cwd(), "index.html"), "utf8");

test("release dependencies use reproducible concrete versions", () => {
  for (const [name, version] of Object.entries({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  })) {
    assert.notEqual(version, "latest", `${name} must not use latest`);
  }
});

test("production runbook covers required server and Play Console gates", () => {
  for (const requirement of [
    /KV_REST_API_URL/,
    /KV_REST_API_TOKEN/,
    /KV_REST_TIMEOUT_MS/,
    /fail.closed/i,
    /011_atomic_quota_usage\.sql/,
    /012_billing_idempotency\.sql/,
    /Real.time Developer Notifications|RTDN/,
    /physical device|perangkat fisik/i,
    /Data Safety/,
    /Content Rating/,
    /playstore:assets/,
  ]) assert.match(releaseGuide, requirement);
});

test("Play Store README describes the tracked wrapper as current source", () => {
  assert.match(readme, /android-app\/.*tracked|tracked.*android-app\//i);
  assert.doesNotMatch(readme, /Generated Android project: `android-app\/` \(ignored by Git\)/);
});

test("source HTML does not contain known malformed blog-link fragments", () => {
  assert.doesNotMatch(sourceHtml, /href="[^"]+"\s*\n\s*<a href=/);
  assert.doesNotMatch(sourceHtml, /href="[^"]+",\s*"color:/);
});

test("release source tracks Android build inputs but ignores signing material", () => {
  const ignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");
  assert.doesNotMatch(ignore, /^android-app\/$/m);
  assert.match(ignore, /^android-app\/keystore\.properties$/m);
  assert.match(ignore, /^android-app\/local\.properties$/m);
  assert.match(ignore, /^android-app\/app\/build\/$/m);
});

test("npm test builds static output before running dist-dependent tests", () => {
  assert.match(packageJson.scripts.test, /^npm run build && node --test /);
});

test("CI builds before invoking npm test", () => {
  assert.ok(verifyWorkflow.indexOf("- run: npm run build") < verifyWorkflow.indexOf("- run: npm test"));
});

test("every article source has complete static route metadata", () => {
  for (const path of BLOG_PATHS.filter((path) => path !== "/blog")) {
    const route = SEO_ROUTES[path];
    assert.ok(route.headline);
    assert.match(route.datePublished, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("importing postbuild helpers does not rebuild release files", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", 'await import("./scripts/postbuild.mjs")'],
    { cwd: process.cwd(), encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("index.html"), false);
});

test("postbuild CLI generates static SEO pages", () => {
  const fixture = mkdtempSync(join(tmpdir(), "promptlab-postbuild-"));

  try {
    cpSync(join(process.cwd(), "dist"), join(fixture, "dist"), { recursive: true });
    cpSync(join(process.cwd(), "scripts"), join(fixture, "scripts"), { recursive: true });

    const result = spawnSync(process.execPath, ["scripts/postbuild.mjs"], {
      cwd: fixture,
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes("static SEO blog pages generated"), true);
  } finally {
    rmSync(fixture, { force: true, recursive: true });
  }
});
