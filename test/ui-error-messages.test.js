import test from "node:test";
import assert from "node:assert/strict";
import { humanizeApiError } from "../src/ui/errors.js";
import { makeTranslator, translate } from "../src/ui/i18n.js";

const id = makeTranslator("id");
const en = makeTranslator("en");

test("raw network failures never reach the user", () => {
  for (const raw of [
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Load failed",
    "network request failed",
  ]) {
    assert.equal(humanizeApiError(raw, id), translate("id", "error.offline"));
    assert.equal(humanizeApiError(raw, en), translate("en", "error.offline"));
  }
});

test("auth, quota, and rate-limit failures map to their own guidance", () => {
  assert.equal(
    humanizeApiError("Sign in to use AI features and your token quota.", id),
    translate("id", "error.needAccount")
  );
  assert.equal(
    humanizeApiError("Invalid session. Please sign in again.", id),
    translate("id", "error.needAccount")
  );
  assert.equal(humanizeApiError("Usage quota exceeded", id), translate("id", "error.quota"));
  assert.equal(
    humanizeApiError("Too many AI requests", id),
    translate("id", "error.rateLimited")
  );
  assert.equal(
    humanizeApiError("AI took too long to respond", id),
    translate("id", "error.timeout")
  );
});

test("unrecognised messages fall back rather than leaking internals", () => {
  const leaky = "TypeError: Cannot read properties of undefined (reading 'choices')";
  assert.equal(humanizeApiError(leaky, id), translate("id", "error.generic"));
  assert.doesNotMatch(humanizeApiError(leaky, id), /TypeError|undefined/);
});

test("empty input produces no message", () => {
  assert.equal(humanizeApiError("", id), "");
  assert.equal(humanizeApiError(null, id), "");
  assert.equal(humanizeApiError(undefined, id), "");
});

test("every error key resolves in both languages", () => {
  const keys = [
    "error.generic",
    "error.offline",
    "error.needAccount",
    "error.quota",
    "error.rateLimited",
    "error.timeout",
    "error.busy",
    "error.notConfigured",
    "error.fileTooLarge",
    "error.unsupportedFile",
  ];
  for (const key of keys) {
    for (const lang of ["id", "en"]) {
      const value = translate(lang, key);
      assert.notEqual(value, key, `${key} is missing for ${lang}`);
      assert.ok(value.length > 5, `${key} is suspiciously short for ${lang}`);
    }
  }
});

test("Indonesian and English tables cover the same keys", () => {
  // A key present in one language but not the other silently falls back and
  // shows the wrong language to somebody.
  const source = ["id", "en"];
  const seen = {};
  for (const lang of source) seen[lang] = new Set();

  // Probe through the public API using the union of keys used by the UI.
  // The brand name is deliberately identical in both, so it is not probed here.
  const probes = [
    "canvas.title",
    "canvas.generate",
    "result.aiNotice",
    "improve.added",
    "improve.removed",
    "improve.wordDelta",
    "compare.heuristicNote",
    "compare.providerNote",
    "about.rate",
    "trial.left",
    "report.submit",
  ];
  for (const key of probes) {
    const idValue = translate("id", key);
    const enValue = translate("en", key);
    assert.notEqual(idValue, key, `${key} missing in id`);
    assert.notEqual(enValue, key, `${key} missing in en`);
    assert.notEqual(idValue, enValue, `${key} is identical in both languages`);
  }
});
