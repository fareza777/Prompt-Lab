import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const buildGradleUrl = new URL("../android/app/build.gradle", import.meta.url);
const variablesGradleUrl = new URL("../android/variables.gradle", import.meta.url);
const manifestUrl = new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url);
const capacitorConfigUrl = new URL("../capacitor.config.json", import.meta.url);
const packageJsonUrl = new URL("../package.json", import.meta.url);
const billingPluginUrl = new URL(
  "../android/app/src/main/java/app/promptlab/twa/PlayBillingPlugin.java",
  import.meta.url
);

test("Android release configuration meets the August 2026 Play requirements", async () => {
  const [buildGradle, variablesGradle, manifest, capacitorSource, billingPlugin, pkgSource] =
    await Promise.all([
      readFile(buildGradleUrl, "utf8"),
      readFile(variablesGradleUrl, "utf8"),
      readFile(manifestUrl, "utf8"),
      readFile(capacitorConfigUrl, "utf8"),
      readFile(billingPluginUrl, "utf8"),
      readFile(packageJsonUrl, "utf8"),
    ]);
  const capacitorConfig = JSON.parse(capacitorSource);
  const pkg = JSON.parse(pkgSource);

  assert.match(variablesGradle, /compileSdkVersion\s*=\s*36\b/);
  assert.match(variablesGradle, /targetSdkVersion\s*=\s*36\b/);
  assert.match(variablesGradle, /minSdkVersion\s*=\s*2[34]\b/);
  assert.match(buildGradle, /versionCode\s+32\b/);
  assert.match(buildGradle, /versionName\s+"1\.3\.0"/);
  assert.match(buildGradle, /com\.android\.billingclient:billing:8\.3\.0/);
  assert.doesNotMatch(buildGradle, /com\.android\.billingclient:billing:7\./);
  assert.doesNotMatch(buildGradle, /androidbrowserhelper/);

  assert.equal(capacitorConfig.appId, "app.promptlab.twa");
  assert.equal(capacitorConfig.appName, "AI Work Studio");
  assert.equal(capacitorConfig.server.url, "https://prompt-lab.xyz/app");
  assert.equal(capacitorConfig.webDir, "dist");

  assert.match(manifest, /android\.permission\.POST_NOTIFICATIONS/);
  assert.match(manifest, /android:autoVerify="true"/);
  assert.match(manifest, /android:host="prompt-lab\.xyz"/);

  assert.match(billingPlugin, /@CapacitorPlugin\(name = "PlayBilling"\)/);
  assert.match(billingPlugin, /launchBillingFlow/);
  assert.match(billingPlugin, /acknowledgePurchase/);

  // Without @capacitor/app the native App plugin is not compiled in and
  // installNativeAppLinkHandler() silently no-ops — App Links never navigate.
  assert.ok(pkg.dependencies["@capacitor/app"], "@capacitor/app must be a dependency");
  assert.ok(pkg.dependencies["@capacitor/core"], "@capacitor/core must be a dependency");
  assert.ok(pkg.dependencies["@capacitor/android"], "@capacitor/android must be a dependency");
});
