import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkdownBlocks } from "../src/ui/markdownBlocks.js";

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
