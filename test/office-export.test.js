import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  buildDocxBuffer,
  buildPptxBuffer,
  parseStructuredContent,
} from "../server/officeExport.js";

test("semantic parser retains headings, bullets, and markdown tables", () => {
  const blocks = parseStructuredContent(
    "# Laporan\n\n- Satu\n- Dua\n\n| PIC | Aksi |\n|---|---|\n| Sari | Survei |",
  );
  assert.deepEqual(blocks.map((block) => block.type), ["heading", "list", "table"]);
});

test("DOCX contains professional document parts and new branding", async () => {
  const buffer = await buildDocxBuffer({
    title: "Laporan Sosialisasi",
    content: "## Ringkasan\nKegiatan berjalan baik.\n\n## Tindak Lanjut\n| Aksi | PIC |\n|---|---|\n| Survei | Sari |",
    language: "id",
    plan: "Free",
  });
  const zip = await JSZip.loadAsync(buffer);
  assert.ok(zip.file("word/document.xml"));
  assert.ok(zip.file("word/footer1.xml"));
  const footer = await zip.file("word/footer1.xml").async("string");
  assert.match(footer, /AI Work Studio/);
  assert.doesNotMatch(footer, /PromptLab/);
});

test("PPTX creates multiple slides with AI Work Studio metadata", async () => {
  const buffer = await buildPptxBuffer({
    title: "Rencana Kegiatan",
    content: "# Konteks\nMasalah utama\n\n# Rekomendasi\n- Langkah satu\n- Langkah dua",
    language: "id",
  });
  const zip = await JSZip.loadAsync(buffer);
  assert.ok(zip.file("ppt/slides/slide1.xml"));
  assert.ok(zip.file("ppt/slides/slide2.xml"));
  const core = await zip.file("docProps/core.xml").async("string");
  assert.match(core, /AI Work Studio/);
});
