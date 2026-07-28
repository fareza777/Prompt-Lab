import test from "node:test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { mermaidFlowchartToProcessFlow } from "../src/processFlow.js";

/**
 * Flowcharts are what produced the Android PNG failures: Mermaid's layout
 * engine throws "Could not find a suitable point for the given distance" and
 * the export dies with nothing to show. Converting them to a process flow
 * moves them onto the canvas renderer, which has no layout engine to fail.
 */

test("a plain flowchart becomes an ordered process flow", () => {
  const flow = mermaidFlowchartToProcessFlow(
    ["flowchart TD", "A[Terima berkas] --> B[Verifikasi] --> C[Arsipkan]"].join("\n")
  );
  assert.ok(flow, "flowchart was not converted");
  assert.deepEqual(
    flow.steps.map((s) => s.label),
    ["Terima berkas", "Verifikasi", "Arsipkan"]
  );
  assert.equal(flow.edges.length, 2);
  assert.deepEqual(flow.edges[0], { from: "A", to: "B" });
});

test("edges written on separate lines are followed", () => {
  const flow = mermaidFlowchartToProcessFlow(
    ["graph LR", "A[Mulai]", "B[Proses]", "C[Selesai]", "A --> B", "B --> C"].join("\n")
  );
  assert.equal(flow.steps.length, 3);
  assert.equal(flow.edges.length, 2);
});

test("labelled edges do not swallow the next node", () => {
  const flow = mermaidFlowchartToProcessFlow(
    ["flowchart TD", "A[Ajukan] -->|disetujui| B[Proses] -->|selesai| C[Arsip]"].join("\n")
  );
  assert.deepEqual(
    flow.steps.map((s) => s.label),
    ["Ajukan", "Proses", "Arsip"]
  );
  assert.equal(flow.edges.length, 2);
});

test("every node shape is read, including quoted labels with punctuation", () => {
  // Indonesian source documents are full of "Perangkat Daerah (PD)".
  const flow = mermaidFlowchartToProcessFlow(
    [
      "flowchart TD",
      'A["Sekretaris Daerah (Sekda)"] --> B[[Verifikasi]]',
      "B --> C{Setuju?}",
      "C --> D(Terbit)",
    ].join("\n")
  );
  const labels = flow.steps.map((s) => s.label);
  assert.ok(labels.includes("Sekretaris Daerah (Sekda)"), `got ${JSON.stringify(labels)}`);
  assert.ok(labels.includes("Verifikasi"));
  assert.ok(labels.includes("Setuju?"));
  assert.ok(labels.includes("Terbit"));
});

test("subgraph and styling lines are ignored without losing nodes", () => {
  const flow = mermaidFlowchartToProcessFlow(
    [
      "flowchart TD",
      "subgraph Tahap 1",
      "A[Mulai] --> B[Isi formulir]",
      "end",
      "classDef big fill:#fff",
      "B --> C[Kirim]",
    ].join("\n")
  );
  assert.deepEqual(
    flow.steps.map((s) => s.label),
    ["Mulai", "Isi formulir", "Kirim"]
  );
});

test("a node defined bare then labelled later keeps the label", () => {
  const flow = mermaidFlowchartToProcessFlow(
    ["flowchart TD", "A --> B", "A[Permohonan]", "B[Keputusan]"].join("\n")
  );
  const byId = Object.fromEntries(flow.steps.map((s) => [s.id, s.label]));
  assert.equal(byId.A, "Permohonan");
  assert.equal(byId.B, "Keputusan");
});

test("non-flowchart diagrams are left to Mermaid", () => {
  // A sequence or ER diagram is not a linear process; forcing it through the
  // process renderer would produce a meaningless list of boxes.
  for (const code of [
    "sequenceDiagram\n  Alice->>Bob: Halo\n  Bob-->>Alice: Hai",
    "erDiagram\n  PELANGGAN ||--o{ PESANAN : membuat",
    "mindmap\n  root((ide))\n    cabang",
  ]) {
    assert.equal(mermaidFlowchartToProcessFlow(code), null, `converted: ${code.split("\n")[0]}`);
  }
});

test("input too thin to be a flow returns null", () => {
  assert.equal(mermaidFlowchartToProcessFlow(""), null);
  assert.equal(mermaidFlowchartToProcessFlow("flowchart TD\nA[Hanya satu]"), null);
  assert.equal(mermaidFlowchartToProcessFlow("bukan diagram sama sekali"), null);
});

test("the export path routes a bare mermaid flowchart onto the canvas renderer", async () => {
  const { extractProcessFlow } = await import("../src/processFlow.js");
  const doc = [
    "# Alur Perizinan",
    "",
    "```mermaid",
    "flowchart TD",
    'A["Perangkat Daerah (PD)"] --> B[Verifikasi Sekda]',
    "B --> C{Disetujui?}",
    "C --> D[Terbit izin]",
    "```",
  ].join("\n");

  // No ```process fence exists, so the old path handed this to Mermaid.
  assert.equal(extractProcessFlow(doc), null, "test document should have no process fence");

  const source = await readFile(new URL("../src/exportDiagram.js", import.meta.url), "utf8");
  assert.match(source, /flowFromMermaidFlowchart/, "export does not attempt the conversion");
  assert.match(
    source,
    /extractProcessFlow\(output\) \|\| flowFromMermaidFlowchart\(output\)/,
    "conversion is not wired into the export entry point"
  );

  // The fence content itself must convert cleanly.
  const fence = /```mermaid\s*([\s\S]*?)```/i.exec(doc)[1];
  const flow = mermaidFlowchartToProcessFlow(fence);
  assert.ok(flow, "the fenced flowchart did not convert");
  assert.ok(
    flow.steps.some((s) => s.label === "Perangkat Daerah (PD)"),
    "parenthesised label was mangled"
  );
  assert.equal(flow.steps.length, 4);
});
