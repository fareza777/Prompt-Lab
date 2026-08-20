import assert from "node:assert/strict";
import test from "node:test";
import { getLanguageLockInstruction } from "../src/promptLanguage.js";
import { validateFinishedOutput } from "../src/deliverableProfiles.js";

test("Indonesian output contract forbids accidental foreign scripts and mojibake", () => {
  const instruction = getLanguageLockInstruction("id");

  assert.match(instruction, /Latin script/i);
  assert.match(instruction, /Chinese|Japanese|Korean/i);
  assert.match(instruction, /mojibake/i);
});

test("finished Indonesian documents flag unexpected CJK output", () => {
  const checked = validateFinishedOutput("# Laporan\n\nKegiatan dengan celana训练.", "report", "id");

  assert.ok(checked.warnings.includes("unexpected_script"));
});

test("finished documents repair common UTF-8/Windows-1252 mojibake", () => {
  const checked = validateFinishedOutput("# Laporan\n\nKegiatan berjalan â€” lancar Â± 1 jam.", "report", "id");

  assert.match(checked.content, /Kegiatan berjalan - lancar \+\/- 1 jam/);
  assert.doesNotMatch(checked.content, /â€”|Â±/);
});
