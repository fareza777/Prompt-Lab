import assert from "node:assert/strict";
import test from "node:test";
import { attachmentDisposition, safeFilename } from "../server/exportFilename.js";

test("safeFilename strips smart punctuation that breaks HTTP headers", () => {
  const name = safeFilename(
    "Ins. Sekda No. e-0033 Tahun 2026 — ttg “Perangkat Daerah (PD)”"
  );
  assert.match(name, /^[A-Za-z0-9._-]+$/);
  assert.doesNotMatch(name, /[\u201C\u201D\u2014\u2013]/);
  assert.ok(name.length > 8);
});

test("attachmentDisposition is ASCII-only for Node setHeader", () => {
  const header = attachmentDisposition("Surat Edaran — “Sekda” (2026)", "docx");
  assert.match(header, /^attachment; filename="[A-Za-z0-9._-]+\.docx"$/);
  // Node rejects non-ASCII / controls in header values.
  assert.equal(/[^\t\x20-\x7e]/.test(header), false);
});
