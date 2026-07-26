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
  assert.equal(detectDiagramIntent({ narrative: "tulis laporan bulanan", outputType: "Word Document" }), false);
});

test("mermaid addon requires a mermaid fence", () => {
  const addon = buildMermaidDeliveryAddon({
    outputType: "Diagram",
    outputLanguage: "id",
  });
  assert.match(addon, /mermaid_diagram/);
  assert.match(addon, /```mermaid/);
  assert.match(defaultDiagramNarrative("id"), /dokumen/i);
});

test("diagram profile preserves mermaid fence", () => {
  assert.equal(detectDeliverableProfile({ outputType: "Diagram" }), "diagram");
  const raw = `# Alur

\`\`\`mermaid
flowchart TD
  A[Mulai] --> B[Selesai]
\`\`\`
`;
  const checked = validateFinishedOutput(raw, "diagram");
  assert.match(checked.content, /```mermaid/);
  assert.equal(checked.warnings.includes("missing_mermaid_fence"), false);
});

test("diagram profile wraps bare mermaid source", () => {
  const checked = validateFinishedOutput("flowchart TD\n  A --> B", "diagram");
  assert.match(checked.content, /```mermaid/);
});
