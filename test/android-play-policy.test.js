import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const buildGradleUrl = new URL("../android-app/app/build.gradle", import.meta.url);
const twaManifestUrl = new URL("../android-app/twa-manifest.json", import.meta.url);

test("Android release configuration meets the August 2026 Play requirements", async () => {
  const [buildGradle, twaManifestSource] = await Promise.all([
    readFile(buildGradleUrl, "utf8"),
    readFile(twaManifestUrl, "utf8"),
  ]);
  const twaManifest = JSON.parse(twaManifestSource);

  assert.match(buildGradle, /compileSdkVersion\s+36\b/);
  assert.match(buildGradle, /targetSdkVersion\s+36\b/);
  assert.match(buildGradle, /minSdkVersion\s+23\b/);
  assert.match(buildGradle, /versionCode\s+10\b/);
  assert.match(buildGradle, /versionName\s+"1\.0\.9"/);
  assert.match(buildGradle, /com\.google\.androidbrowserhelper:billing:1\.2\.0/);
  assert.match(buildGradle, /com\.android\.billingclient:billing:8\.3\.0/);
  assert.doesNotMatch(buildGradle, /com\.android\.billingclient:billing:7\./);

  assert.equal(twaManifest.minSdkVersion, 23);
  assert.equal(twaManifest.appVersionCode, 10);
  assert.equal(twaManifest.appVersionName, "1.0.9");
  assert.equal(twaManifest.appVersion, "1.0.9");
});
