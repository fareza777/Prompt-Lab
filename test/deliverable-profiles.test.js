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
  assert.match(report, /CONCISE|600–900/i);
  assert.match(report, /LENGTH \(system default\)/i);
  assert.match(slides, /one main message per slide/i);
  assert.match(slides, /8–12 slides/i);
});

test("diagram defaults concise including when user says bagus", () => {
  const instruction = buildDeliverableInstruction({
    profile: "diagram",
    language: "id",
    narrative: "buatkan diagram yang bagus",
  });
  assert.match(instruction, /RINGKAS|5–8/);
  assert.match(instruction, /Bagus.*jelas|bukan Mermaid rumit/i);
  assert.doesNotMatch(instruction, /boleh 8–12 langkah process/);
});

test("reports default concise unless user asks for lengkap", async () => {
  const { wantsExpandedDeliverable, buildDeliverableInstruction } = await import(
    "../src/deliverableProfiles.js"
  );
  assert.equal(wantsExpandedDeliverable("buat laporan bulanan"), false);
  assert.equal(wantsExpandedDeliverable("buat laporan lengkap dan detail"), true);

  const concise = buildDeliverableInstruction({
    profile: "report",
    language: "id",
    narrative: "buat laporan dari file ini",
  });
  assert.match(concise, /RINGKAS|default sistem/i);
  assert.doesNotMatch(concise, /User meminta versi lengkap/);

  const expanded = buildDeliverableInstruction({
    profile: "report",
    language: "id",
    narrative: "buat laporan lengkap dari file ini",
  });
  assert.match(expanded, /User meminta versi lengkap/);
});

test("validator removes prompt leakage and the duplicate empty heading with it", () => {
  const checked = validateFinishedOutput(
    "Here is the prompt:\n# Laporan\n\n# Laporan\n\n## Temuan\nIsi",
    "report",
  );
  assert.doesNotMatch(checked.content, /Here is the prompt/i);
  // The first "# Laporan" has nothing under it, so it is now removed rather
  // than merely flagged — a warning nothing reads left the stray heading in
  // the finished document.
  assert.equal((checked.content.match(/^#\s+Laporan\s*$/gm) || []).length, 1);
  assert.match(checked.content, /## Temuan/);
  assert.equal(checked.valid, true);
});

test("a genuine repeated heading is still flagged", () => {
  // Both headings have content, so neither is stripped and the warning stands.
  const checked = validateFinishedOutput("# Laporan\nIsi satu.\n\n# Laporan\nIsi dua.", "report");
  assert.ok(checked.warnings.includes("repeated_heading"));
});

test("validator leaves factual gaps untouched", () => {
  const source = "# Notulen\n\nTanggal: Belum tersedia\n\n## Keputusan\nBelum tersedia";
  assert.equal(validateFinishedOutput(source, "minutes").content, source);
});
