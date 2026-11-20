// cf-prune-large-assets.mjs — Cloudflare Workers Static Assets rejects files
// larger than 25 MiB. The only such file Vite emits is onnxruntime-web's
// asyncify wasm, which Transformers.js never requests in the browser (it
// points ONNX Runtime at jsDelivr by default). DuckDB's wasm is loaded from
// jsDelivr in src/dataAnalyze.js. Anything else oversized fails the build so
// it is not silently dropped.
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join, relative } from "node:path";

const LIMIT = 25 * 1024 * 1024;
const SAFE_TO_DROP = [/^assets\/ort-wasm-simd-threaded\.asyncify-[\w-]+\.wasm$/];
const dist = join(process.cwd(), "dist");

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const blocked = [];
for (const file of walk(dist)) {
  const size = statSync(file).size;
  if (size <= LIMIT) continue;
  const rel = relative(dist, file).split("\\").join("/");
  if (SAFE_TO_DROP.some((re) => re.test(rel))) {
    unlinkSync(file);
    console.log(`✓ pruned ${rel} (${(size / 1048576).toFixed(1)} MiB, served from jsDelivr)`);
  } else {
    blocked.push(`${rel} (${(size / 1048576).toFixed(1)} MiB)`);
  }
}
if (blocked.length) {
  console.error(`✘ assets over 25 MiB (Cloudflare limit):\n  ${blocked.join("\n  ")}`);
  process.exit(1);
}
