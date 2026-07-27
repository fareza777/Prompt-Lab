import assert from "node:assert/strict";
import test from "node:test";
import { buildDocxBuffer, buildPptxBuffer, parseStructuredContent } from "../server/officeExport.js";

async function assertDocx(name, content, title = name) {
  const buffer = await buildDocxBuffer({ title, content, language: "id", plan: "Free" });
  assert.ok(Buffer.isBuffer(buffer), `${name}: not a buffer`);
  assert.ok(buffer.length > 500, `${name}: too small (${buffer.length})`);
  assert.equal(buffer[0], 0x50, `${name}: not a zip`);
}

test("docx handles control characters", async () => {
  await assertDocx("control", "Judul\n\nTeks dengan \u0000 null dan \u0008 bell");
});

test("docx handles mermaid fence and Indonesian labels", async () => {
  await assertDocx(
    "mermaid",
    [
      "# Instruksi Sekda",
      "",
      "```mermaid",
      "flowchart TD",
      '  A[Sekretaris Daerah (Sekda)] --> B[Perangkat Daerah (PD)]',
      "```",
      "",
      "1. Baca dokumen",
      "2. Tindak lanjut",
    ].join("\n")
  );
});

test("docx handles tables and long titles", async () => {
  await assertDocx(
    "X".repeat(200),
    ["| A | B |", "| --- | --- |", "| satu | dua |", "", "Paragraf penutup."].join("\n")
  );
});

test("docx handles empty content", async () => {
  await assertDocx("empty", "");
});

test("parseStructuredContent skips fenced code as paragraphs not crash", () => {
  const blocks = parseStructuredContent(
    ["Intro", "", "```mermaid", "flowchart TD", "  A --> B", "```", "", "Outro"].join("\n"),
    "Title"
  );
  assert.ok(blocks.length >= 2);
});

test("pptx builds from the same mermaid document", async () => {
  const buffer = await buildPptxBuffer({
    title: "Instruksi",
    content: ["# Alur", "", "- Langkah 1", "- Langkah 2", "", "```mermaid", "flowchart TD", "  A --> B", "```"].join(
      "\n"
    ),
    language: "id",
  });
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  assert.ok(bytes.length > 1000);
  assert.equal(bytes[0], 0x50);
});
