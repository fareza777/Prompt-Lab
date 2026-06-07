import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const productionUrl = process.argv[2] || "https://prompt-lab.xyz";

function check(label, ok, detail = "") {
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status} ${label}${detail ? ` - ${detail}` : ""}`);
  return ok;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

let failed = 0;
const manifestPath = join(root, "public", "manifest.webmanifest");
const swPath = join(root, "public", "sw.js");
const icon192 = join(root, "public", "icons", "icon-192.png");
const icon512 = join(root, "public", "icons", "icon-512.png");
const maskable512 = join(root, "public", "icons", "maskable-512.png");

failed += check("manifest exists", existsSync(manifestPath)) ? 0 : 1;
failed += check("service worker exists", existsSync(swPath)) ? 0 : 1;
failed += check("192px icon exists", existsSync(icon192)) ? 0 : 1;
failed += check("512px icon exists", existsSync(icon512)) ? 0 : 1;
failed += check("maskable icon exists", existsSync(maskable512)) ? 0 : 1;

if (existsSync(manifestPath)) {
  const manifest = readJson(manifestPath);
  failed += check("manifest display standalone", manifest.display === "standalone", manifest.display) ? 0 : 1;
  const validStart = manifest.start_url === "/" || manifest.start_url === "/app";
  const validScope = manifest.scope === "/" || manifest.scope === "/app";
  failed += check("manifest start_url", validStart, manifest.start_url) ? 0 : 1;
  failed += check("manifest scope", validScope, manifest.scope) ? 0 : 1;
  failed += check("manifest has PNG icons", manifest.icons?.some((icon) => icon.type === "image/png")) ? 0 : 1;
  failed += check("manifest has maskable icon", manifest.icons?.some((icon) => String(icon.purpose || "").includes("maskable"))) ? 0 : 1;
}

try {
  const response = await fetch(`${productionUrl.replace(/\/$/, "")}/manifest.webmanifest`, { redirect: "follow" });
  let validProductionManifest = false;
  if (response.ok) {
    try {
      const manifest = await response.json();
      validProductionManifest = manifest.display === "standalone" && manifest.icons?.some((icon) => icon.type === "image/png");
    } catch {
      validProductionManifest = false;
    }
  }
  failed += check("production manifest reachable", validProductionManifest, `${response.status}`) ? 0 : 1;
} catch (error) {
  failed += 1;
  check("production manifest reachable", false, error.message);
}

try {
  const response = await fetch(`${productionUrl.replace(/\/$/, "")}/.well-known/assetlinks.json`, { redirect: "follow" });
  let validAssetLinks = false;
  let fingerprintCount = 0;
  if (response.ok) {
    try {
      const json = await response.json();
      validAssetLinks = Array.isArray(json) && json.some((entry) => entry?.target?.package_name);
      fingerprintCount = json?.[0]?.target?.sha256_cert_fingerprints?.length || 0;
    } catch {
      validAssetLinks = false;
    }
  }
  check("assetlinks live", validAssetLinks, validAssetLinks ? `${response.status}, ${fingerprintCount} fingerprint(s)` : "not installed yet");
  if (fingerprintCount < 2) {
    console.log("WARN Add Play App Signing SHA-256 to assetlinks.json — see playstore/HILANGKAN_BAR_URL.md");
  }
} catch (error) {
  check("assetlinks live", false, "not installed yet");
}

try {
  const dalUrl = new URL("https://digitalassetlinks.googleapis.com/v1/statements:list");
  dalUrl.searchParams.set("source.web.site", productionUrl.replace(/\/$/, ""));
  dalUrl.searchParams.set("relation", "delegate_permission/common.handle_all_urls");
  const dalResponse = await fetch(dalUrl);
  const dalJson = dalResponse.ok ? await dalResponse.json() : { statements: [] };
  const linked = Array.isArray(dalJson.statements) && dalJson.statements.some(
    (item) => item?.target?.androidApp?.packageName === "app.promptlab.twa"
  );
  if (!linked) {
    console.log("WARN TWA not verified by Google yet — URL bar may show until Play signing SHA-256 is added and app is reinstalled.");
  }
  check("Google Digital Asset Links", linked, linked ? "app.promptlab.twa linked" : "not linked yet");
} catch (error) {
  check("Google Digital Asset Links", false, error.message);
}

if (failed > 0) {
  console.error(`\n${failed} required readiness check(s) failed.`);
  process.exit(1);
}

console.log("\nRequired PWA checks passed. Assetlinks can be installed after Android signing fingerprint is available.");
