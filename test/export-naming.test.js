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

test("extractMermaidCode strips accidental fence wrappers and prose", async () => {
  const { sanitizeMermaidCode } = await import("../src/exportDiagram.js");
  const cleaned = sanitizeMermaidCode("Ringkasan\n\n```mermaid\nflowchart LR\n  A-->B\n```\n");
  assert.equal(cleaned.startsWith("flowchart"), true);
  assert.doesNotMatch(cleaned, /```/);
});

test("isLikelyUiIconSvg rejects Lucide-sized icons", async () => {
  const { isLikelyUiIconSvg } = await import("../src/exportDiagram.js");
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
  assert.equal(isLikelyUiIconSvg(icon), true);
  const diagram = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="100" height="40"/><path d="M0 0"/><text>A</text><rect width="100" height="40"/></svg>`;
  assert.equal(isLikelyUiIconSvg(diagram), false);
});

