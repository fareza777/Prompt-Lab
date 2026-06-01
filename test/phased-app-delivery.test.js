import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPhasedAppDeliveryInstruction,
  resolvePhasedAppKind,
  shouldUsePhasedAppDelivery,
} from "../src/phasedAppDelivery.js";

test("detects photo editor brief for phased delivery", () => {
  assert.equal(shouldUsePhasedAppDelivery("buat aplikasi editor foto", "Coding", "Application Code"), true);
  assert.equal(resolvePhasedAppKind("buat aplikasi editor foto"), "photo_editor");
});

test("detects video editor brief for phased delivery", () => {
  assert.equal(resolvePhasedAppKind("buat aplikasi editor video yang fiturnya lengkap"), "video_editor");
});

test("phased block includes three phases and MVP language", () => {
  const block = buildPhasedAppDeliveryInstruction(
    "buat aplikasi editor foto",
    "Coding",
    "Application Code",
    "id"
  );
  assert.match(block, /Fase 1/i);
  assert.match(block, /Fase 2/i);
  assert.match(block, /Fase 3/i);
  assert.match(block, /jangan memasukkan semua fitur ke fase 1/i);
});

test("non-app brief skips phased delivery", () => {
  assert.equal(shouldUsePhasedAppDelivery("buat caption instagram kopi", "Marketing", "Content"), false);
  assert.equal(buildPhasedAppDeliveryInstruction("buat caption instagram kopi", "Marketing", "Content"), "");
});
