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
