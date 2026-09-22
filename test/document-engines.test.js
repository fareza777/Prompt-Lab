import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJsonUrl = new URL("../package.json", import.meta.url);

test("isConvertibleDocument matches office/pdf attachments, not images", async () => {
  const { isConvertibleDocument } = await import("../src/documentConvert.js");
  assert.equal(isConvertibleDocument({ name: "laporan.pdf", type: "application/pdf" }), true);
  assert.equal(isConvertibleDocument({ name: "notulen.docx" }), true);
  assert.equal(isConvertibleDocument({ name: "deck.PPTX" }), true);
  assert.equal(isConvertibleDocument({ name: "data.xlsx" }), true);
  assert.equal(isConvertibleDocument({ name: "foto.jpg", type: "image/jpeg" }), false);
  assert.equal(isConvertibleDocument({ name: "catatan.md" }), false);
  assert.equal(isConvertibleDocument(null), false);
});

test("callSidecar rejects with 503 when SIDECAR_URL is not configured", async () => {
  delete process.env.SIDECAR_URL;
  const { callSidecar } = await import("../server/documents.js");
  await assert.rejects(
    () => callSidecar("/parse", { buffer: Buffer.from("x"), mimetype: "text/plain", originalname: "a.txt" }),
    (error) => {
      assert.equal(error.status, 503);
      assert.match(error.message, /not configured/i);
      return true;
    }
  );
});

test("callSidecar posts the file to the sidecar and returns parsed JSON", async () => {
  const seen = {};
  const fakeFetch = async (url, options) => {
    seen.url = url;
    seen.method = options.method;
    const form = options.body;
    seen.file = await form.get("file").text();
    return {
      ok: true,
      json: async () => ({ markdown: "# hi", engine: "markitdown" }),
    };
  };
  const previousFetch = globalThis.fetch;
  process.env.SIDECAR_URL = "http://sidecar.test:8790/";
  const { callSidecar } = await import(`../server/documents.js?cache=${Date.now()}`);
  globalThis.fetch = fakeFetch;
  try {
    const out = await callSidecar("/parse", {
      buffer: Buffer.from("doc body"),
      mimetype: "application/pdf",
      originalname: "a.pdf",
    });
    assert.equal(out.engine, "markitdown");
    assert.equal(seen.url, "http://sidecar.test:8790/parse");
    assert.equal(seen.method, "POST");
    assert.equal(seen.file, "doc body");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("document engines stay lazy chunks, never in the initial bundle", async () => {
  const pkg = JSON.parse(await readFile(packageJsonUrl, "utf8"));
  for (const dep of ["tesseract.js", "jscanify", "@techstark/opencv-js"]) {
    assert.ok(pkg.dependencies[dep], `${dep} missing from dependencies`);
  }
  const tools = await readFile(new URL("../src/ui/AttachmentTools.jsx", import.meta.url), "utf8");
  assert.ok(tools.includes('import("../webScan.js")'), "webScan.js must load lazily");
  assert.ok(tools.includes('import("../ocr.js")'), "ocr.js must load lazily");
  const webScan = await readFile(new URL("../src/webScan.js", import.meta.url), "utf8");
  assert.ok(webScan.includes('import("@techstark/opencv-js")'), "opencv must load lazily");
});
