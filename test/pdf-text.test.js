import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { extractPdfText } from "../server/pdfText.js";

const pdfSource = await readFile(new URL("../server/pdfText.js", import.meta.url), "utf8");

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

test("glyph indexes are decoded through the font's ToUnicode map", () => {
  // The real-world fix, verified against four genuine Indonesian government
  // PDFs that previously yielded zero characters between them. Asserted at
  // source level: building a subset-font PDF by hand that is faithful enough
  // to be worth trusting turned out to be more error-prone than the code it
  // was meant to guard.
  assert.match(pdfSource, /function parseCMap/);
  assert.match(pdfSource, /beginbfchar\(\[\\s\\S\]\*\?\)endbfchar/);
  assert.match(pdfSource, /beginbfrange\(\[\\s\\S\]\*\?\)endbfrange/);
  assert.match(pdfSource, /begincodespacerange/);
  // The selected font decides the mapping, so Tf has to be tracked.
  assert.match(pdfSource, /cmap = cmaps\.get\(match\[1\]\) \|\| null/);
  assert.match(pdfSource, /function decodeBytes/);
});

test("per-glyph positioning does not shatter words", () => {
  // Treating every Td as a newline turned "PEMERINTAH" into a column of ten
  // single letters, and the readable word count came out as zero.
  assert.match(pdfSource, /function joinShatteredText/);
  assert.match(pdfSource, /Math\.abs\(ty\) > 2 \? "\\n\\n" : " "/);
  assert.doesNotMatch(pdfSource, /\(T\\\*\|Td\|TD\|ET\)/, "Td is still treated as a line break");
});

test("the font dictionary is found when it is an indirect reference", async () => {
  // LibreOffice writes "/Font 7 0 R" rather than "/Font << /F1 4 0 R >>".
  // Matching only the inline form found no fonts at all, so every glyph code
  // stayed unmapped and the whole document was rejected as noise.
  const source = await readFile(new URL("../server/pdfText.js", import.meta.url), "utf8");
  assert.match(source, /isFont\(target\)/);
  assert.doesNotMatch(source, /\/Font\\s\*<</);
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
  assert.match(server, /import \{ extractPdfImages, extractPdfText \} from "\.\/pdfText\.js"/);
  assert.doesNotMatch(server, /async function extractPdfText/);
});

test("a scanned PDF falls back to reading its page images", async () => {
  // A scan has no text layer, so the only way to read it is to look at it.
  // Without this, the single largest category of unreadable upload stays
  // unreadable.
  assert.ok(pdfSource.includes("export async function extractPdfImages"));
  assert.ok(pdfSource.includes("Subtype") && pdfSource.includes("Image"), "image objects are not located");
  // Raw bitmaps need their real geometry; sharp will misread a guessed one.
  assert.ok(pdfSource.includes("Width"), "image width is not read");
  assert.ok(pdfSource.includes("BitsPerComponent"), "bit depth is not checked");
  assert.ok(pdfSource.includes("raw: { width, height, channels }"));
  // Logos and signature scribbles are not pages.
  assert.ok(pdfSource.includes("width < 500 || height < 500"));

  const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
  assert.match(server, /extractPdfImages\(file\.buffer, 3\)/);
  assert.match(server, /halaman dokumen hasil scan/);
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
  // A sentinel, not prose. The client's humaniser replaces any message it does
  // not recognise with the generic "something went wrong" — which is exactly
  // what swallowed the first attempt at this message in production.
  assert.match(server, /throw publicApiError\("UNREADABLE_DOCUMENT", 422\)/);

  const { humanizeApiError } = await import("../src/ui/errors.js");
  const { makeTranslator, translate } = await import("../src/ui/i18n.js");
  for (const lang of ["id", "en"]) {
    const shown = humanizeApiError("UNREADABLE_DOCUMENT", makeTranslator(lang));
    assert.equal(shown, translate(lang, "error.unreadableDocument"));
    assert.doesNotMatch(shown, /UNREADABLE_DOCUMENT/, "the raw sentinel reached the user");
    assert.notEqual(shown, translate(lang, "error.generic"));
    // It has to say what to do next, not just that something failed.
    assert.match(shown, lang === "id" ? /foto/i : /photo/i);
  }
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
