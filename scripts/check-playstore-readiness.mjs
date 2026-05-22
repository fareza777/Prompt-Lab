import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const productionUrl = process.argv[2] || "https://promptlab-six-phi.vercel.app";

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
  failed += check("manifest start_url", manifest.start_url === "/", manifest.start_url) ? 0 : 1;
  failed += check("manifest scope", manifest.scope === "/", manifest.scope) ? 0 : 1;
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
  if (response.ok) {
    try {
      const json = await response.json();
      validAssetLinks = Array.isArray(json) && json.some((entry) => entry?.target?.package_name);
    } catch {
      validAssetLinks = false;
    }
  }
  check("assetlinks live", validAssetLinks, validAssetLinks ? `${response.status}` : "not installed yet");
} catch (error) {
  check("assetlinks live", false, "not installed yet");
}

if (failed > 0) {
  console.error(`\n${failed} required readiness check(s) failed.`);
  process.exit(1);
}

console.log("\nRequired PWA checks passed. Assetlinks can be installed after Android signing fingerprint is available.");
