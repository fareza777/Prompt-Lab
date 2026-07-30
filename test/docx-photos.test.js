import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { buildDocxBuffer } from "../server/officeExport.js";

/**
 * A report that says "photographs attached" and attaches nothing is not a
 * finished document, so the export has to carry the evidence itself.
 */

/** A solid-colour JPEG as a data URL, the shape the client sends. */
async function photo(width, height, colour) {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: colour },
  })
    .jpeg()
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function docx(options) {
  const buffer = await buildDocxBuffer({ content: "# Judul\n\n## Isi\nParagraf.", ...options });
  const zip = await JSZip.loadAsync(buffer);
  // JSZip lists the directory entry itself, which is not an image.
  const media = Object.keys(zip.files).filter(
    (name) => name.startsWith("word/media/") && !zip.files[name].dir
  );
  return {
    zip,
    media,
    xml: await zip.file("word/document.xml").async("string"),
  };
}

test("attached photographs end up inside the document", async () => {
  const images = [
    { dataUrl: await photo(400, 300, "#336699"), name: "a.jpg" },
    { dataUrl: await photo(400, 300, "#993366"), name: "b.jpg" },
  ];
  const { media, xml } = await docx({ title: "Laporan Kegiatan", language: "id", images });

  assert.equal(media.length, 2, `expected two embedded images, found ${media.length}`);
  assert.ok(media.every((name) => /\.jpe?g$/i.test(name)), `expected JPEG media: ${media.join(", ")}`);
  assert.match(xml, /<w:drawing>/, "no drawing element was emitted");
  assert.match(xml, /Dokumentasi/);
  assert.match(xml, /Foto 1/);
  assert.match(xml, /Foto 2/);
});

test("before and after photos are laid out in two labelled columns", async () => {
  const images = [
    { dataUrl: await photo(400, 300, "#336699"), slot: "before" },
    { dataUrl: await photo(400, 300, "#993366"), slot: "after" },
  ];
  const { media, xml } = await docx({ title: "Laporan Sebelum & Sesudah", language: "id", images });

  assert.equal(media.length, 2);
  assert.match(xml, /<w:tbl>/, "the pair was not put in a table");
  assert.match(xml, /Sebelum/);
  assert.match(xml, /Sesudah/);
  // A stacked layout would caption them "Foto 1 / Foto 2" instead.
  assert.doesNotMatch(xml, /Foto 1/);
});

test("a portrait photo keeps its proportions", async () => {
  // Word stretches an image to whatever size it is told, so guessing the
  // aspect ratio smears a portrait photo into a landscape one.
  const { xml } = await docx({
    title: "Laporan",
    images: [{ dataUrl: await photo(300, 900, "#224466") }],
  });
  const extent = /<wp:extent cx="(\d+)" cy="(\d+)"/.exec(xml);
  assert.ok(extent, "no image extent was written");
  const [, cx, cy] = extent.map(Number);
  assert.ok(cy > cx * 2.5, `portrait ratio lost: ${cx} x ${cy}`);
});

test("an unreadable image is skipped rather than failing the whole export", async () => {
  const { media, xml } = await docx({
    title: "Laporan",
    images: [{ dataUrl: "data:image/jpeg;base64,bm90LWFuLWltYWdl" }],
  });
  assert.equal(media.length, 0);
  // The document itself still came out.
  assert.match(xml, /Paragraf\./);
});

test("no photos means no empty documentation heading", async () => {
  const { xml } = await docx({ title: "Laporan", images: [] });
  assert.doesNotMatch(xml, /Dokumentasi/);
});

test("the brand no longer sits in the document masthead", async () => {
  // A report sent to a manager should not carry the name of the tool that
  // typed it beside its date.
  const source = await readFile(new URL("../server/officeExport.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\$\{dateLabel\}\s*·\s*\$\{BRAND\}/);
  const { xml } = await docx({ title: "Laporan Kegiatan", plan: "Pro" });
  assert.doesNotMatch(xml, /AI Work Studio/);
});

test("the export route accepts photographs", async () => {
  const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
  assert.match(server, /images: Array\.isArray\(req\.body\?\.images\)/);
  // Base64 photographs do not fit in the old 2mb body limit.
  assert.match(server, /app\.post\("\/api\/export\/docx", express\.json\(\{ limit: "12mb" \}\)/);

  const main = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert.match(main, /async function readAttachmentImages/);
  assert.match(main, /format === "docx" \? await readAttachmentImages\(attachments\) : \[\]/);
  assert.match(main, /slot: item\.slot \|\| ""/);
});
