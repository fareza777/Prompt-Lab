import assert from "node:assert/strict";
import test from "node:test";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { normalizeRunAttachments } from "../server/index.js";

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
    doc.fontSize(12).text("Ringkasan sumber harus mengambil teks ini.");
    doc.image(image, 40, 80, { width: 360 });
    doc.end();
  });
}

test("direct runs normalize PDF text, PDF pages, and photos for vision", async () => {
  const image = await jpeg();
  const sources = await normalizeRunAttachments(
    [
      {
        buffer: await pdfWithTextAndPhoto(image),
        mimetype: "application/pdf",
        originalname: "sumber.pdf",
        size: 1,
      },
      {
        buffer: image,
        mimetype: "image/jpeg",
        originalname: "foto.jpg",
        size: image.length,
      },
    ],
    {},
    "Free"
  );

  assert.equal(sources.documents.length, 1);
  assert.match(sources.documents[0].excerpt, /Ringkasan sumber/);
  assert.ok(sources.vision.some((file) => /sumber\.pdf \(foto/i.test(file.filename)));
  assert.ok(sources.vision.some((file) => file.filename === "foto.jpg"));
});
