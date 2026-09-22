/**
 * pdf-lib post-processing for generated PDFs and a merge tool for uploaded
 * ones. pdfkit builds the document; pdf-lib stamps it afterwards with
 * metadata and a footer so every exported page carries the brand + page number.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const BRAND = "AI Work Studio";
const INK = { r: 0.25, g: 0.28, b: 0.25 };
const RULE = { r: 0.78, g: 0.83, b: 0.79 };

/** Adds metadata + a bottom rule with "AI Work Studio" and page numbers. */
export async function stampPdfBuffer(input, { title } = {}) {
  const doc = await PDFDocument.load(input);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  doc.setTitle(String(title || "AI Work Studio document"));
  doc.setAuthor(BRAND);
  doc.setCreator(BRAND);
  doc.setProducer(`${BRAND} (pdf-lib)`);
  doc.setCreationDate(new Date());

  const pages = doc.getPages();
  const total = pages.length;
  for (const [index, page] of pages.entries()) {
    const { width } = page.getSize();
    const y = 24;
    const margin = 40;
    page.drawLine({
      start: { x: margin, y: y + 13 },
      end: { x: width - margin, y: y + 13 },
      thickness: 0.6,
      color: rgb(RULE.r, RULE.g, RULE.b),
    });
    page.drawText(BRAND, { x: margin, y, size: 8, font, color: rgb(INK.r, INK.g, INK.b) });
    const label = `${index + 1} / ${total}`;
    page.drawText(label, {
      x: width - margin - font.widthOfTextAtSize(label, 8),
      y,
      size: 8,
      font,
      color: rgb(INK.r, INK.g, INK.b),
    });
  }
  return Buffer.from(await doc.save());
}

/** Concatenates uploaded PDF buffers into one document, in the order sent. */
export async function mergePdfBuffers(buffers) {
  const out = await PDFDocument.create();
  for (const buffer of buffers) {
    const src = await PDFDocument.load(buffer);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) out.addPage(page);
  }
  if (out.getPageCount() === 0) throw new Error("No pages to merge.");
  return Buffer.from(await out.save());
}
