import test from "node:test";
import assert from "node:assert/strict";
import {
  quoteUnsafeMermaidLabels,
  dropEmptyEdgeLabels,
  stripEdgeLabels,
  sanitizeMermaidCode,
} from "../src/mermaidRender.js";

/**
 * Regression cover for the diagram failures seen in production logs on Android:
 * a parse error from unquoted brackets, and a layout error from edge-label
 * positioning. Indonesian source documents are full of "X (Y)" constructs, so
 * the parser case is the common one.
 */

test("quotes a bracketed label from a real source document", () => {
  const code = "flowchart TD\n  A[Sekretaris Daerah (Sekda)] --> B[Perangkat Daerah]";
  assert.match(quoteUnsafeMermaidLabels(code), /A\["Sekretaris Daerah \(Sekda\)"\]/);
});

test("quotes every shape mermaid parses literally", () => {
  const cases = [
    ["flowchart TD\n  A(Mulai (awal)) --> B[Ok]", /A\("Mulai \(awal\)"\)/],
    ["flowchart TD\n  A{Setuju (ya)?} --> B[Ok]", /A\{"Setuju \(ya\)\?"\}/],
    ["flowchart TD\n  A[[Modul (utama)]] --> B[Ok]", /A\[\["Modul \(utama\)"\]\]/],
    ["flowchart TD\n  A((Pusat (inti))) --> B[Ok]", /A\(\("Pusat \(inti\)"\)\)/],
    ["flowchart TD\n  A([Mulai (start)]) --> B[Ok]", /A\(\["Mulai \(start\)"\]\)/],
  ];
  for (const [code, expected] of cases) {
    assert.match(quoteUnsafeMermaidLabels(code), expected, code);
  }
});

test("matches the closing bracket by nesting, not by first occurrence", () => {
  // Naively taking the first ")" produced A("Mulai (awal")) — itself invalid.
  const out = quoteUnsafeMermaidLabels("flowchart TD\n  A(Mulai (awal)) --> B[Ok]");
  assert.doesNotMatch(out, /"Mulai \(awal"/);
  assert.match(out, /"Mulai \(awal\)"/);
});

test("repairs several labels on one line", () => {
  const out = quoteUnsafeMermaidLabels("flowchart TD\n  A[Unit (A)] --> B[Unit (B)]");
  assert.match(out, /A\["Unit \(A\)"\]/);
  assert.match(out, /B\["Unit \(B\)"\]/);
});

test("leaves already-quoted and plain labels untouched", () => {
  const quoted = 'flowchart TD\n  A["Sudah (dikutip)"] --> B[Aman]';
  assert.equal(quoteUnsafeMermaidLabels(quoted), quoted);
  const plain = "flowchart TD\n  A[Mulai] --> B[Selesai]";
  assert.equal(quoteUnsafeMermaidLabels(plain), plain);
});

test("only touches flowchart-family syntax", () => {
  // Other diagram types do not use bracket node shapes; rewriting them would
  // corrupt valid source.
  const seq = "sequenceDiagram\n  participant A as Sekda (Kepala)\n  A->>B: kirim (surat)";
  assert.equal(quoteUnsafeMermaidLabels(seq), seq);
  const er = "erDiagram\n  PEGAWAI ||--o{ TUGAS : memiliki";
  assert.equal(quoteUnsafeMermaidLabels(er), er);
});

test("ignores directive and style lines", () => {
  const code = "flowchart TD\n  A[Ok] --> B[Ok]\n  style A fill:#fff,stroke:#000\n  %% note (comment)";
  const out = quoteUnsafeMermaidLabels(code);
  assert.match(out, /style A fill:#fff,stroke:#000/);
  assert.match(out, /%% note \(comment\)/);
});

test("drops degenerate empty edge labels", () => {
  assert.equal(
    dropEmptyEdgeLabels("flowchart TD\n  A[Satu] -->|| B[Dua]"),
    "flowchart TD\n  A[Satu] --> B[Dua]"
  );
});

test("stripEdgeLabels removes captions but keeps the graph", () => {
  const out = stripEdgeLabels("flowchart TD\n  A[Sekda] -->|menugaskan| B[PD]");
  assert.doesNotMatch(out, /menugaskan/);
  assert.match(out, /A\[Sekda\]/);
  assert.match(out, /B\[PD\]/);
  assert.match(out, /-->/);
});

test("sanitize applies the repair end to end", () => {
  const raw = "```mermaid\nflowchart TD\n  A[Sekretaris Daerah (Sekda)] --> B[Ok]\n```";
  const out = sanitizeMermaidCode(raw);
  assert.match(out, /^flowchart TD/);
  assert.match(out, /A\["Sekretaris Daerah \(Sekda\)"\]/);
  assert.doesNotMatch(out, /```/);
});

test("sanitize still recovers a missing diagram type", () => {
  // The earlier production failure: model emitted edges with no type line.
  const out = sanitizeMermaidCode("A[Mulai] --> B[Selesai]");
  assert.match(out, /^flowchart TD/);
});

test("the model is shown a process JSON contract", async () => {
  const { buildMermaidDeliveryInstruction } = await import("../src/mermaidDelivery.js");
  for (const lang of ["id", "en"]) {
    const instruction = buildMermaidDeliveryInstruction(lang);
    assert.match(instruction, /```process/);
    assert.match(instruction, /"steps"/);
  }
});
