import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import JSZip from "jszip";
import { buildDocxBuffer, normalizeExportContent } from "../server/officeExport.js";
import { buildPdfBuffer } from "../server/pdfExport.js";
import { extractPdfText } from "../server/pdfText.js";

async function photo(width = 900, height = 600) {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: "#336699" },
  })
    .jpeg()
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

const CONTENT_WITH_GENERATED_PHOTO_BLOCK = `# Laporan Kegiatan

## Ringkasan
Kegiatan berjalan lancar.

## Dokumentasi
Foto 1 - Suasana kegiatan.
Foto 2 - Foto kedua yang sebenarnya tidak ada.
`;

test("export content removes model photo captions when the exporter owns the photos", () => {
  const cleaned = normalizeExportContent(CONTENT_WITH_GENERATED_PHOTO_BLOCK, { imageCount: 1 });

  assert.match(cleaned, /Kegiatan berjalan lancar/);
  assert.doesNotMatch(cleaned, /Dokumentasi|Foto 1|Foto 2/);
});

test("DOCX export emits one canonical photo section for one photo", async () => {
  const buffer = await buildDocxBuffer({
    title: "Laporan Kegiatan",
    content: CONTENT_WITH_GENERATED_PHOTO_BLOCK,
    language: "id",
    images: [{ dataUrl: await photo(), name: "kegiatan.jpg" }],
  });
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml").async("string");

  assert.equal((xml.match(/Dokumentasi/g) || []).length, 1);
  assert.equal((xml.match(/Foto 1/g) || []).length, 1);
  assert.doesNotMatch(xml, /Foto 2/);
});

test("PDF export emits one large-photo section for one photo", async () => {
  const buffer = await buildPdfBuffer({
    title: "Laporan Kegiatan",
    content: CONTENT_WITH_GENERATED_PHOTO_BLOCK,
    language: "id",
    plan: "Pro",
    images: [{ dataUrl: await photo(), name: "kegiatan.jpg" }],
  });
  const text = await extractPdfText(buffer);

  assert.equal((text.match(/Dokumentasi/g) || []).length, 1);
  assert.equal((text.match(/Foto 1/g) || []).length, 1);
  assert.doesNotMatch(text, /Foto 2/);
});
