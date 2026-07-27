import assert from "node:assert/strict";
import test from "node:test";
import { buildDocxBuffer, buildPptxBuffer } from "../server/officeExport.js";

const sample = `# Instruksi Sekretaris Daerah

## Ringkasan
Dokumen ini mengatur alur kerja.

\`\`\`mermaid
flowchart TD
  A["Sekretaris Daerah (Sekda)"] --> B["Perangkat Daerah (PD)"]
\`\`\`

- Poin satu
- Poin dua
`;

test("docx export builds a zip with mermaid content", async () => {
  const buffer = await buildDocxBuffer({
    title: "Tes",
    content: sample,
    language: "id",
    plan: "Free",
  });
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000);
  assert.equal(buffer[0], 0x50); // PK
  assert.equal(buffer[1], 0x4b);
});

test("pptx export builds a zip with mermaid content", async () => {
  const buffer = await buildPptxBuffer({
    title: "Tes",
    content: sample,
    language: "id",
  });
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  assert.ok(bytes.length > 1000);
  assert.equal(bytes[0], 0x50);
});
