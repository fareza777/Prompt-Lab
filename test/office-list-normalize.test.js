import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDocxBuffer,
  normalizeListsForDocx,
  parseStructuredContent,
} from "../server/officeExport.js";

test("Poin-Poin Penting numbered lists become bullets for Word", () => {
  const markdown = [
    "# Laporan Mingguan",
    "",
    "## 2. Ringkasan",
    "1. Ringkas satu",
    "2. Ringkas dua",
    "",
    "## 3. Poin-Poin Penting",
    "",
    "### 3.1 Dinamika Pasar",
    "8. Permintaan ritel stabil",
    "9. Promosi nasional",
    "",
    "### 3.2 Operasional",
    "10. Distribusi memenuhi target",
    "11. Stok aman",
    "",
    "## 4. Langkah Kerja",
    "1. Kumpulkan data",
    "2. Validasi",
  ].join("\n");

  const blocks = normalizeListsForDocx(parseStructuredContent(markdown, "Laporan"));
  const poinLists = [];
  let inPoin = false;
  let inProcedure = false;
  for (const block of blocks) {
    if (block.type === "heading") {
      if (/Poin-Poin/i.test(block.text)) inPoin = true;
      if (/Langkah Kerja/i.test(block.text)) {
        inPoin = false;
        inProcedure = true;
      }
    }
    if (block.type === "list") {
      if (inPoin) poinLists.push(block);
      if (inProcedure) {
        assert.equal(block.ordered, true, "procedure lists stay ordered");
      }
    }
  }
  assert.ok(poinLists.length >= 2);
  for (const list of poinLists) {
    assert.equal(list.ordered, false, `expected bullets, got ordered=${list.ordered} items=${list.items}`);
  }
});

test("docx still builds after list normalization", async () => {
  const buffer = await buildDocxBuffer({
    title: "Laporan",
    content: [
      "## 3. Poin-Poin Penting",
      "### 3.1 Pasar",
      "8. Item A",
      "9. Item B",
      "### 3.2 Ops",
      "10. Item C",
    ].join("\n"),
    language: "id",
    plan: "Free",
  });
  assert.ok(buffer.length > 1000);
  assert.equal(buffer[0], 0x50);
});
