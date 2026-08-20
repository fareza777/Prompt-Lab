import assert from "node:assert/strict";
import test from "node:test";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { buildDocxBuffer } from "../server/officeExport.js";
import { extractDocumentImages } from "../server/documentImages.js";
import { serializeExportImages } from "../server/exportImagesPayload.js";

async function jpeg() {
  return sharp({
    create: { width: 900, height: 600, channels: 3, background: "#336699" },
  })
    .jpeg()
    .toBuffer();
}

function pdfWithTextAndPhoto(image) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(12).text("Teks laporan tetap terbaca.");
    doc.image(image, 40, 80, { width: 450 });
    doc.end();
  });
}

test("PDF attachments keep embedded photos even when the PDF also has text", async () => {
  const buffer = await pdfWithTextAndPhoto(await jpeg());
  const images = await extractDocumentImages({
    buffer,
    mimetype: "application/pdf",
    originalname: "laporan.pdf",
  });

  assert.equal(images.length, 1);
  assert.equal(images[0].mime, "image/jpeg");
});

test("DOCX attachments keep embedded photos for later export", async () => {
  const dataUrl = `data:image/jpeg;base64,${(await jpeg()).toString("base64")}`;
  const docx = await buildDocxBuffer({
    title: "Laporan",
    content: "# Laporan\n\nIsi.",
    images: [{ dataUrl, name: "foto.jpg" }],
  });
  const images = await extractDocumentImages({
    buffer: docx,
    mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    originalname: "laporan.docx",
  });

  assert.equal(images.length, 1);
  assert.equal(images[0].mime, "image/jpeg");
});

test("embedded photos are returned in the portable shape used by export", () => {
  const images = serializeExportImages([
    { dataUrl: "data:image/jpeg;base64,abc", filename: "laporan.pdf (foto 1)", slot: "" },
    { dataUrl: "data:text/plain;base64,abc", filename: "not-an-image.txt" },
  ]);

  assert.deepEqual(images, [
    { dataUrl: "data:image/jpeg;base64,abc", slot: "", name: "laporan.pdf (foto 1)" },
  ]);
});
