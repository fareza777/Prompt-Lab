import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProcessFlowSvg,
  ensureProcessDiagramDocument,
  extractProcessFlow,
  processFlowToMermaid,
} from "../src/processFlow.js";

const sampleJson = {
  title: "Alur Instruksi Sekda",
  steps: [
    { id: "S1", label: "Terima instruksi" },
    { id: "S2", label: "Disposisi ke PD" },
    { id: "S3", label: "Lapor balik" },
  ],
  edges: [
    { from: "S1", to: "S2" },
    { from: "S2", to: "S3" },
  ],
};

test("processFlowToMermaid builds quoted flowchart", () => {
  const code = processFlowToMermaid(sampleJson);
  assert.match(code, /^flowchart TD/);
  assert.match(code, /S1\["Terima instruksi"\]/);
  assert.match(code, /S1 --> S2/);
});

test("buildProcessFlowSvg returns root svg", () => {
  const svg = buildProcessFlowSvg(sampleJson);
  assert.match(svg, /<svg[\s>]/);
  assert.match(svg, /Alur Instruksi Sekda/);
  assert.match(svg, /Terima instruksi/);
});

test("normalize accepts Indonesian step field aliases", async () => {
  const { normalizeProcessFlow, getProcessFlowLayout } = await import("../src/processFlow.js");
  const flow = normalizeProcessFlow({
    title: "Alur",
    steps: [
      { id: "A", langkah: "Terima surat" },
      { id: "B", aksi: "Disposisi" },
      { id: "C", uraian: "Selesai" },
    ],
  });
  assert.equal(flow.steps.length, 3);
  assert.equal(flow.steps[0].label, "Terima surat");
  const layout = getProcessFlowLayout(flow);
  assert.ok(layout.height > 100);
  assert.equal(layout.steps[1].label, "Disposisi");
});

test("ensureProcessDiagramDocument injects mermaid from process JSON", () => {
  const markdown = [
    "# Alur",
    "",
    "```process",
    JSON.stringify(sampleJson),
    "```",
  ].join("\n");
  const out = ensureProcessDiagramDocument(markdown, "id");
  assert.match(out, /```process/);
  assert.match(out, /```mermaid\nflowchart TD/);
  assert.ok(extractProcessFlow(out));
});
