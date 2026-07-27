import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMermaidDeliveryAddon,
  defaultDiagramNarrative,
  detectDiagramIntent,
} from "../src/mermaidDelivery.js";
import {
  detectDeliverableProfile,
  validateFinishedOutput,
} from "../src/deliverableProfiles.js";

test("detectDiagramIntent triggers on Diagram output type", () => {
  assert.equal(detectDiagramIntent({ outputType: "Diagram" }), true);
  assert.equal(detectDiagramIntent({ narrative: "buat flowchart dari SOP" }), true);
  assert.equal(detectDiagramIntent({ narrative: "buat infografis alur" }), true);
  assert.equal(detectDiagramIntent({ narrative: "tulis laporan bulanan", outputType: "Word Document" }), false);
});

test("diagram addon requires a process fence", () => {
  const addon = buildMermaidDeliveryAddon({
    outputType: "Diagram",
    outputLanguage: "id",
  });
  assert.match(addon, /process_diagram/);
  assert.match(addon, /```process/);
  assert.match(addon, /DEFAULT RINGKAS|5–8/);
  assert.match(addon, /bagus\/cantik\/profesional/);
  assert.match(defaultDiagramNarrative("id"), /ringkas|dokumen|infografis|alur/i);
});

test("diagram addon stays concise for bagus and expands only for lengkap", () => {
  const concise = buildMermaidDeliveryAddon({
    narrative: "buatkan diagram yang bagus",
    outputType: "Diagram",
    outputLanguage: "id",
  });
  assert.match(concise, /5–8/);
  assert.doesNotMatch(concise, /boleh sampai 12 langkah/);

  const expanded = buildMermaidDeliveryAddon({
    narrative: "buatkan diagram lengkap dan detail",
    outputType: "Diagram",
    outputLanguage: "id",
  });
  assert.match(expanded, /8–12/);
});

test("diagram profile builds mermaid from process JSON", () => {
  assert.equal(detectDeliverableProfile({ outputType: "Diagram" }), "diagram");
  const raw = `# Alur

\`\`\`process
{"title":"Alur","steps":[{"id":"S1","label":"Mulai"},{"id":"S2","label":"Selesai"}],"edges":[{"from":"S1","to":"S2"}]}
\`\`\`
`;
  const checked = validateFinishedOutput(raw, "diagram");
  assert.match(checked.content, /```process/);
  assert.match(checked.content, /```mermaid/);
  assert.match(checked.content, /flowchart TD/);
  assert.equal(checked.warnings.includes("missing_mermaid_fence"), false);
});

test("diagram profile wraps bare mermaid source", () => {
  const checked = validateFinishedOutput("flowchart TD\n  A --> B", "diagram");
  assert.match(checked.content, /```mermaid/);
});

test("diagram profile repairs missing diagram type inside fence", () => {
  const checked = validateFinishedOutput(
    "```mermaid\nA[Mulai] --> B[Selesai]\n```",
    "diagram"
  );
  assert.match(checked.content, /```mermaid\nflowchart TD/);
  assert.match(checked.content, /Mulai/);
});

test("diagram profile normalizes Flowchart casing", () => {
  const checked = validateFinishedOutput("```mermaid\nFlowchart LR\n  A --> B\n```", "diagram");
  assert.match(checked.content, /flowchart LR/);
});
