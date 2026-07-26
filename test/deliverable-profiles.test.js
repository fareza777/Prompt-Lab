import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDeliverableInstruction,
  detectDeliverableProfile,
  validateFinishedOutput,
} from "../src/deliverableProfiles.js";

test("meeting photos select minutes with an anti-fabrication contract", () => {
  const profile = detectDeliverableProfile({
    narrative: "Buat notulen dari foto rapat sosialisasi di kelurahan",
    outputType: "Word Document",
  });
  assert.equal(profile, "minutes");
  const instruction = buildDeliverableInstruction({ profile, language: "id" });
  assert.match(instruction, /agenda/i);
  assert.match(instruction, /keputusan/i);
  assert.match(instruction, /jangan mengarang/i);
});

test("reports and presentations receive different structure contracts", () => {
  const report = buildDeliverableInstruction({ profile: "report", language: "en" });
  const slides = buildDeliverableInstruction({ profile: "presentation", language: "en" });
  assert.match(report, /executive summary/i);
  assert.match(report, /findings/i);
  assert.match(slides, /one main message per slide/i);
  assert.match(slides, /8–12 slides/i);
});

test("validator removes prompt leakage and flags repeated headings", () => {
  const checked = validateFinishedOutput(
    "Here is the prompt:\n# Laporan\n\n# Laporan\n\n## Temuan\nIsi",
    "report",
  );
  assert.doesNotMatch(checked.content, /Here is the prompt/i);
  assert.ok(checked.warnings.includes("repeated_heading"));
  assert.equal(checked.valid, true);
});

test("validator leaves factual gaps untouched", () => {
  const source = "# Notulen\n\nTanggal: Belum tersedia\n\n## Keputusan\nBelum tersedia";
  assert.equal(validateFinishedOutput(source, "minutes").content, source);
});
