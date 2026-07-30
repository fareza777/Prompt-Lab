import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { buildPdfBuffer } from "../server/pdfExport.js";
import { extractPdfText } from "../server/pdfText.js";

async function fieldPhoto(width = 1800, height = 1200, slot = "") {
  const pixels = randomBytes(width * height * 3);
  const buffer = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .blur(3)
    .jpeg({ quality: 92 })
    .toBuffer();
  return {
    slot,
    name: `${slot || "foto"}.jpg`,
    dataUrl: `data:image/jpeg;base64,${buffer.toString("base64")}`,
  };
}

const REPORT = `# Laporan Kunjungan Lapangan Pasar Harapan

## Identitas Kunjungan

Kunjungan dilaksanakan pada 30 Juli 2026 pukul 09.15 WIB di Pasar Harapan.

## Tujuan

Memeriksa kondisi saluran air dan akses pengunjung.

## Temuan

- Saluran sisi timur memerlukan pembersihan.
- Akses utama dapat digunakan dengan baik.

## Rekomendasi

| Tindakan | Penanggung jawab | Waktu |
| --- | --- | --- |
| Pembersihan saluran | Pengelola pasar | Minggu berjalan |
| Pemeriksaan ulang | Tim lapangan | Pekan berikutnya |
`;

test("PDF export produces a readable, real PDF report", async () => {
  const buffer = await buildPdfBuffer({
    title: "Laporan Kunjungan Lapangan Pasar Harapan",
    content: REPORT,
    language: "id",
    plan: "Pro",
  });

  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  assert.ok(buffer.length > 1_000);
  const text = await extractPdfText(buffer);
  assert.match(text, /Laporan Kunjungan Lapangan Pasar Harapan/i);
  assert.match(text, /Rekomendasi/i);
  assert.match(text, /Pembersihan saluran/i);
});

test("a short text-only report stays on one page", async () => {
  const buffer = await buildPdfBuffer({
    title: "Laporan Ringkas",
    content: "# Laporan Ringkas\n\n## Ringkasan\n\nKondisi lokasi tercatat baik.",
    language: "id",
    plan: "Pro",
  });
  const source = buffer.toString("latin1");
  assert.equal((source.match(/\/Type\s*\/Page\b/g) || []).length, 1);
});

test("long PDF reports paginate instead of clipping content", async () => {
  const content = `${REPORT}\n${Array.from(
    { length: 90 },
    (_, index) => `Paragraf pemeriksaan ${index + 1}. Kondisi dicatat secara ringkas dan jelas.`
  ).join("\n\n")}`;
  const buffer = await buildPdfBuffer({ title: "Laporan Panjang", content, language: "id" });

  const source = buffer.toString("latin1");
  assert.ok((source.match(/\/Type\s*\/Page\b/g) || []).length >= 2);
});

test("photo-heavy PDF stays compact and carries documentation", async () => {
  const images = await Promise.all([
    fieldPhoto(1800, 1200, "lokasi"),
    fieldPhoto(1200, 1800, "temuan"),
    fieldPhoto(1800, 1200, "akses"),
  ]);
  const buffer = await buildPdfBuffer({
    title: "Laporan Kunjungan Lapangan",
    content: REPORT,
    language: "id",
    images,
  });

  assert.ok(
    buffer.length < 1_500_000,
    `expected compact PDF below 1.5 MB, received ${buffer.length} bytes`
  );
  assert.match(buffer.toString("latin1"), /\/Subtype\s*\/Image/);
});

test("an unreadable photograph does not fail PDF export", async () => {
  const buffer = await buildPdfBuffer({
    title: "Laporan",
    content: REPORT,
    images: [{ dataUrl: "data:image/jpeg;base64,bm90LWFuLWltYWdl" }],
  });

  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
});

test("the PDF route and client carry report photographs", async () => {
  const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
  assert.match(server, /import \{ buildPdfBuffer \} from "\.\/pdfExport\.js"/);
  assert.match(server, /app\.post\("\/api\/export\/pdf", express\.json\(\{ limit: "12mb" \}\)/);
  assert.match(server, /canExportFormat\(membership\.plan, "pdf"\)/);
  assert.match(server, /buildPdfBuffer\(\{/);
  assert.match(server, /attachmentDisposition\(title, "pdf"\)/);

  const main = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert.match(main, /\["docx", "pdf"\]\.includes\(format\)/);
});

test("PDF block renderers reset the flow cursor after lists and tables", async () => {
  const source = await readFile(new URL("../server/pdfExport.js", import.meta.url), "utf8");
  assert.match(source, /function resetFlowCursor\(doc\)/);
  assert.match(source, /function drawBlocks[\s\S]*resetFlowCursor\(doc\)/);
  assert.match(source, /async function drawDocumentation[\s\S]*ensureSpace\(doc, boxHeight \+ 80\)/);
});
