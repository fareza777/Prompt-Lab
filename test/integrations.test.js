import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { mergePdfBuffers, stampPdfBuffer } from "../server/pdfToolkit.js";
import { fetchCleanArticle } from "../server/urlImport.js";

const packageJsonUrl = new URL("../package.json", import.meta.url);
const manifestUrl = new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url);

async function makePdf(text) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([400, 300]);
  page.drawText(text, { x: 40, y: 260, size: 12, font });
  return Buffer.from(await doc.save());
}

const publicLookup = async () => [{ address: "93.184.216.34" }];

function htmlResponse(body, status = 200, contentType = "text/html") {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => (key === "content-type" ? contentType : null) },
    text: async () => body,
  };
}

test("stampPdfBuffer stamps metadata and a footer on every page", async () => {
  const stamped = await stampPdfBuffer(await makePdf("hello"), { title: "Surat Uji" });
  const doc = await PDFDocument.load(stamped);
  assert.equal(doc.getTitle(), "Surat Uji");
  assert.equal(doc.getAuthor(), "AI Work Studio");
  assert.equal(doc.getPageCount(), 1);
});

test("mergePdfBuffers concatenates PDFs in order", async () => {
  const merged = await mergePdfBuffers([await makePdf("first"), await makePdf("second")]);
  const doc = await PDFDocument.load(merged);
  assert.equal(doc.getPageCount(), 2);
  assert.match(merged.subarray(0, 5).toString(), /%PDF/);
});

test("mergePdfBuffers rejects an empty merge", async () => {
  await assert.rejects(() => mergePdfBuffers([]), /No pages/);
});

test("fetchCleanArticle rejects non-http(s) and private targets", async () => {
  await assert.rejects(() => fetchCleanArticle("ftp://example.com/x"), /http/);
  await assert.rejects(() => fetchCleanArticle("not a url"), /valid URL/i);
  await assert.rejects(
    () =>
      fetchCleanArticle("http://internal-service/x", {
        lookup: async () => [{ address: "10.0.0.8" }],
        fetchImpl: async () => {
          throw new Error("must not fetch");
        },
      }),
    /not allowed/
  );
  await assert.rejects(
    () =>
      fetchCleanArticle("http://localhost:8080/x", {
        lookup: async () => [{ address: "127.0.0.1" }],
      }),
    /not allowed/
  );
});

test("fetchCleanArticle follows redirects and revalidates each host", async () => {
  const seen = [];
  const defuddleImpl = (html, url) => ({
    title: "Readable",
    contentMarkdown: `MD:${url}`,
  });
  const article = await fetchCleanArticle("https://example.com/a", {
    lookup: publicLookup,
    defuddleImpl,
    fetchImpl: async (url) => {
      seen.push(url);
      if (seen.length === 1) {
        return {
          ok: false,
          status: 302,
          headers: { get: (k) => (k === "location" ? "https://example.net/b" : null) },
          text: async () => "",
        };
      }
      return htmlResponse("<html><body>ok</body></html>");
    },
  });
  assert.equal(seen.length, 2);
  assert.equal(article.url, "https://example.net/b");
  assert.equal(article.markdown, "MD:https://example.net/b");
  assert.equal(article.title, "Readable");
});

test("fetchCleanArticle rejects non-page content types", async () => {
  await assert.rejects(
    () =>
      fetchCleanArticle("https://example.com/file.zip", {
        lookup: publicLookup,
        fetchImpl: async () => htmlResponse("PK\x03\x04", 200, "application/zip"),
      }),
    /not a readable web page/
  );
});

test("Capacitor integrations are declared as dependencies and in the manifest", async () => {
  const [pkgSource, manifest] = await Promise.all([
    readFile(packageJsonUrl, "utf8"),
    readFile(manifestUrl, "utf8"),
  ]);
  const deps = JSON.parse(pkgSource).dependencies || {};

  // Monetisation, scanner+OCR, PDF toolkit, URL import, rich editor.
  for (const dep of [
    "@capacitor-community/admob",
    "@capacitor-mlkit/document-scanner",
    "@capacitor-mlkit/text-recognition",
    "pdf-lib",
    "defuddle",
    "@tiptap/react",
    "@tiptap/starter-kit",
    "tiptap-markdown",
  ]) {
    assert.ok(deps[dep], `missing dependency ${dep}`);
  }

  assert.match(manifest, /com\.google\.android\.gms\.ads\.APPLICATION_ID/);
  assert.match(manifest, /ca-app-pub-3940256099942544/);
});
