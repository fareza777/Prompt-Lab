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
  assert.match(block, /jangan memotong output prompt hanya ke Fase 1/i);
});

test("detects mario-style game brief without the word aplikasi", () => {
  const narrative =
    "buat game action seperti mario bros yang bagus dan asik. game yg panjang bisa 100 level, dan ada storynya";
  assert.equal(shouldUsePhasedAppDelivery(narrative, "", ""), true);
  assert.equal(resolvePhasedAppKind(narrative), "game_platformer");
});

test("game phased block documents all phases and defers 100 levels to phase 3", () => {
  const block = buildPhasedAppDeliveryInstruction(
    "buat game action seperti mario bros. 100 level dan story",
    "Coding",
    "Application Code",
    "id"
  );
  assert.match(block, /Fase 1/i);
  assert.match(block, /Fase 2/i);
  assert.match(block, /Fase 3/i);
  assert.match(block, /SEMUA fase|Fase 1, 2, dan 3/i);
  assert.match(block, /jangan memotong output prompt hanya ke Fase 1/i);
  assert.match(block, /generator procedural/i);
  assert.match(block, /Urutan coding/i);
});

test("non-app brief skips phased delivery", () => {
  assert.equal(shouldUsePhasedAppDelivery("buat caption instagram kopi", "Marketing", "Content"), false);
  assert.equal(buildPhasedAppDeliveryInstruction("buat caption instagram kopi", "Marketing", "Content"), "");
});
