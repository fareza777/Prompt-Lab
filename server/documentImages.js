import JSZip from "jszip";
import { extractPdfImages } from "./pdfText.js";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_BY_EXTENSION = Object.freeze({
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
});

function isPdf(file = {}) {
  return file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname || "");
}

function isDocx(file = {}) {
  return file.mimetype === DOCX_MIME || /\.docx$/i.test(file.originalname || "");
}

function imageMime(name) {
  const extension = String(name).split(".").pop()?.toLowerCase();
  return MIME_BY_EXTENSION[extension] || "application/octet-stream";
}

/**
 * Extract photos embedded inside document attachments.
 * Text-bearing PDFs still contain useful photos, so extraction must not depend
 * on text extraction returning an empty result.
 */
export async function extractDocumentImages(file = {}, limit = 8) {
  if (!Buffer.isBuffer(file.buffer) || !file.buffer.length) return [];
  if (isPdf(file)) return extractPdfImages(file.buffer, limit);
  if (!isDocx(file)) return [];

  const zip = await JSZip.loadAsync(file.buffer);
  const names = Object.keys(zip.files).filter(
    (name) =>
      name.startsWith("word/media/") &&
      !zip.files[name].dir &&
      MIME_BY_EXTENSION[name.split(".").pop()?.toLowerCase()]
  );
  const images = [];
  for (const name of names.slice(0, limit)) {
    const buffer = await zip.file(name).async("nodebuffer");
    if (buffer?.length) images.push({ buffer, mime: imageMime(name) });
  }
  return images;
}
