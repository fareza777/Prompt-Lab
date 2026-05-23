import test from "node:test";
import assert from "node:assert/strict";
import {
  detectOutputLanguage,
  getLanguageLockInstruction,
  resolveOutputLanguage,
} from "../src/promptLanguage.js";

test("detectOutputLanguage prefers English for English briefs", () => {
  assert.equal(
    detectOutputLanguage("Make this prompt stronger for Instagram content about a milk coffee product."),
    "en"
  );
});

test("detectOutputLanguage prefers Indonesian for Indonesian briefs", () => {
  assert.equal(
    detectOutputLanguage("Buat prompt untuk konten Instagram tentang kopi susu lokal."),
    "id"
  );
});

test("resolveOutputLanguage follows the dominant source language", () => {
  assert.equal(
    resolveOutputLanguage("buat landing page kopi", "Make this prompt stronger for Instagram."),
    "en"
  );
});

test("language lock instruction names the output language", () => {
  assert.match(getLanguageLockInstruction("en"), /English/i);
  assert.match(getLanguageLockInstruction("id"), /Indonesian/i);
});
