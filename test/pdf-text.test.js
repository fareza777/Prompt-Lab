import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { extractPdfText } from "../server/pdfText.js";

/**
 * The failure this guards against is silent and expensive: a PDF whose text
 * cannot be read produces an empty excerpt, the model is handed nothing, and
 * the user gets a confident generic summary of a document it never saw.
 */

/** Builds a small PDF whose page content is stored the way real writers store it. */
function makePdf(content, { compress = true } = {}) {
  const body = compress ? deflateSync(Buffer.from(content, "latin1")) : Buffer.from(content, "latin1");
  const filter = compress ? " /Filter /FlateDecode" : "";
  const head = Buffer.from(
    `%PDF-1.4\n` +
      `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n` +
      `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n` +
      `3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n` +
      `4 0 obj << /Length ${body.length}${filter} >>\nstream\n`,
    "latin1"
  );
  const tail = Buffer.from(`\nendstream\nendobj\ntrailer << /Root 1 0 R >>\n%%EOF\n`, "latin1");
  return Buffer.concat([head, body, tail]);
}

const PAGE = [
  "BT /F1 12 Tf 72 720 Td",
  "(Laporan Realisasi Anggaran Triwulan I) Tj",
  "T*",
  "[(Total belanja mencapai ) -250 (Rp 1.250.000.000) -250 ( atau 62 persen dari pagu.)] TJ",
  "T*",
  "(Sisa anggaran dialokasikan untuk kegiatan triwulan berikutnya.) Tj",
  "ET",
].join("\n");

test("a compressed PDF is read, which is what every real writer produces", async () => {
  // Word, Google Docs, LibreOffice and scanners all use FlateDecode. The old
  // extractor scanned raw bytes for "(text) Tj" and so found nothing here.
  const text = await extractPdfText(makePdf(PAGE));
  assert.match(text, /Laporan Realisasi Anggaran Triwulan I/);
  assert.match(text, /Rp 1\.250\.000\.000/);
  assert.match(text, /62 persen dari pagu/);
  assert.match(text, /Sisa anggaran dialokasikan/);
});

test("kerned arrays keep their word spaces", async () => {
  // "[(Total belanja mencapai ) -250 (Rp ...)] TJ" must not run together.
  const text = await extractPdfText(makePdf(PAGE));
  assert.doesNotMatch(text, /mencapaiRp/);
  assert.match(text, /mencapai\s+Rp/);
});

test("text comes out in reading order, not grouped by operator", async () => {
  // Extracting every Tj first and every TJ afterwards interleaves a document's
  // sentences into nonsense as soon as it uses both.
  const text = await extractPdfText(makePdf(PAGE));
  assert.ok(
    text.indexOf("Laporan Realisasi") < text.indexOf("Total belanja"),
    "the title arrived after the body"
  );
  assert.ok(
    text.indexOf("Total belanja") < text.indexOf("Sisa anggaran"),
    "the TJ array was hoisted out of order"
  );
});

test("an uncompressed PDF still works", async () => {
  const text = await extractPdfText(makePdf(PAGE, { compress: false }));
  assert.match(text, /Laporan Realisasi Anggaran Triwulan I/);
});

test("hex strings are decoded", async () => {
  const hex = Buffer.from(
    "Nota Dinas Kepala Bagian Umum tentang penyesuaian jadwal",
    "latin1"
  ).toString("hex");
  const text = await extractPdfText(makePdf(`BT <${hex}> Tj ET`));
  assert.match(text, /Nota Dinas Kepala Bagian Umum/);
});

test("a scanned PDF with no text layer returns nothing rather than noise", async () => {
  // An image-only page has no text operators at all. Returning "" lets the
  // caller say so instead of summarising an empty string.
  const scanned = makePdf("q 612 0 0 792 0 0 cm /Im0 Do Q");
  assert.equal(await extractPdfText(scanned), "");
});

test("glyph-index garbage is rejected instead of being summarised", async () => {
  // A subset font with no ToUnicode map decodes to control bytes. Feeding that
  // to the model produces a confident summary of noise.
  const garbage = Array.from({ length: 60 }, (_, i) => `\\${(i % 8) + 1}`).join("");
  const text = await extractPdfText(makePdf(`BT (${garbage}) Tj ET`));
  assert.equal(text, "");
});

test("a non-PDF buffer is handled without throwing", async () => {
  assert.equal(await extractPdfText(Buffer.from("not a pdf at all")), "");
  assert.equal(await extractPdfText(Buffer.alloc(0)), "");
  assert.equal(await extractPdfText(null), "");
});

test("the server uses the shared extractor rather than its own copy", async () => {
  const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
  assert.match(server, /import \{ extractPdfText \} from "\.\/pdfText\.js"/);
  assert.doesNotMatch(server, /async function extractPdfText/);
});

test("an unreadable upload is reported rather than summarised as nothing", async () => {
  // Otherwise the model writes a confident, entirely generic summary of a
  // document it never saw — which is exactly what was being reported.
  const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
  assert.match(server, /const documentUploads = \(req\.files \|\| \[\]\)/);
  assert.match(
    server,
    /if \(documentUploads\.length && !templateDocuments\.length && !visionAttachments\.length\)/
  );
  assert.match(server, /Teks di berkas itu tidak bisa dibaca/);
  assert.match(server, /could not be read/);
});

test("the summary asks for section-by-section detail, not a skim", async () => {
  const { getTemplate, buildTemplateInstruction } = await import("../src/workTemplates.js");
  const template = getTemplate("summary");
  // A one-page skim was the other half of the "too generic" report.
  assert.deepEqual(template.length.words, [700, 1100]);
  const instruction = buildTemplateInstruction({ template, language: "id", values: {} });
  assert.match(instruction, /## Pembahasan per Bagian/);
  assert.match(instruction, /## Angka dan Data Penting/);
  assert.match(instruction, /Untuk SETIAP bab\/bagian utama/);
  assert.match(instruction, /Jangan menulis kalimat kosong/);
  assert.match(instruction, /Muat SEMUA angka penting/);
});
