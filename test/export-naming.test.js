import assert from "node:assert/strict";
import test from "node:test";
import { deriveExportTitle, toDownloadFilename } from "../src/exportNaming.js";
import { extractMermaidCode } from "../src/exportDiagram.js";

test("deriveExportTitle prefers markdown heading", () => {
  const title = deriveExportTitle({
    content: `# Alur Onboarding Karyawan\n\nRingkasan singkat.`,
    narrative: "buat diagram",
  });
  assert.equal(title, "Alur Onboarding Karyawan");
});

test("deriveExportTitle falls back to attachment stem", () => {
  const title = deriveExportTitle({
    content: "```mermaid\nflowchart TD\nA-->B\n```",
    narrative: "buat diagram",
    attachmentNames: ["SOP-Pengadaan-2026.pdf"],
  });
  assert.equal(title, "SOP-Pengadaan-2026");
});

test("toDownloadFilename sanitizes for downloads", () => {
  assert.equal(
    toDownloadFilename("Alur Onboarding / Karyawan?", "png"),
    "Alur-Onboarding-Karyawan.png"
  );
});

test("extractMermaidCode reads fenced block", () => {
  const code = extractMermaidCode("# Title\n\n```mermaid\nflowchart TD\n  A-->B\n```\n");
  assert.match(code, /flowchart TD/);
});
