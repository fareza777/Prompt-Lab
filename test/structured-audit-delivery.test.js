import test from "node:test";
import assert from "node:assert/strict";
import { shouldUsePhasedAppDelivery } from "../src/phasedAppDelivery.js";
import {
  buildStructuredAuditInstruction,
  resolveAuditKind,
  shouldUseStructuredAudit,
} from "../src/structuredAuditDelivery.js";

test("detects game audit narrative", () => {
  const narrative = "buat laporan audit game platformer mobile yang sudah rilis";
  assert.equal(shouldUseStructuredAudit(narrative, "Research", "Report"), true);
  assert.equal(resolveAuditKind(narrative), "game_audit");
});

test("audit blocks phased delivery for same topic", () => {
  const narrative = "audit game mario bros 100 level";
  assert.equal(shouldUseStructuredAudit(narrative, "", ""), true);
  assert.equal(shouldUsePhasedAppDelivery(narrative, "Coding", "Application Code"), false);
});

test("build game still uses phased not audit framework", () => {
  const narrative = "buat game action mario 100 level";
  assert.equal(shouldUseStructuredAudit(narrative, "Coding", "Application Code"), false);
  assert.equal(shouldUsePhasedAppDelivery(narrative, "Coding", "Application Code"), true);
});

test("audit block includes dimensions and single full report", () => {
  const block = buildStructuredAuditInstruction("audit game gameplay", "Research", "Report", "id");
  assert.match(block, /Gameplay & mekanik/i);
  assert.match(block, /Ringkasan eksekutif/i);
  assert.match(block, /SATU respons/i);
  assert.match(block, /\[ASUMSI\]/i);
});
