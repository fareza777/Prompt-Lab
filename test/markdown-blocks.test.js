import assert from "node:assert/strict";
import test from "node:test";
import { groupDocumentSections, parseMarkdownBlocks } from "../src/ui/markdownBlocks.js";

test("parses professional document headings, paragraphs, and lists", () => {
  const blocks = parseMarkdownBlocks(`# Laporan Kegiatan

## Ringkasan
Kegiatan berjalan tertib.

- Jadwal lanjutan
- Penanggung jawab`);

  assert.deepEqual(blocks, [
    { type: "heading", level: 1, text: "Laporan Kegiatan" },
    { type: "heading", level: 2, text: "Ringkasan" },
    { type: "paragraph", text: "Kegiatan berjalan tertib." },
    { type: "list", ordered: false, items: ["Jadwal lanjutan", "Penanggung jawab"] },
  ]);
});

test("parses markdown tables into headers and rows", () => {
  const blocks = parseMarkdownBlocks(`| Agenda | Status |
| --- | --- |
| Sosialisasi | Selesai |`);

  assert.deepEqual(blocks, [
    {
      type: "table",
      headers: ["Agenda", "Status"],
      rows: [["Sosialisasi", "Selesai"]],
    },
  ]);
});

test("groups report content into collapsible top-level sections", () => {
  const sections = groupDocumentSections(
    parseMarkdownBlocks(`# Laporan

## Ringkasan
Paragraf satu.

## Temuan
- Poin A
- Poin B

### Detail
Isi detail.`),
  );

  assert.equal(sections.length, 3);
  assert.equal(sections[0].title, "Laporan");
  assert.equal(sections[1].title, "Ringkasan");
  assert.equal(sections[2].title, "Temuan");
  assert.equal(sections[2].blocks[0].type, "list");
  assert.equal(sections[2].blocks[1].type, "heading");
  assert.equal(sections[2].blocks[1].level, 3);
});
