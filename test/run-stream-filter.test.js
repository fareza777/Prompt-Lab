import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * The filter lives in server/index.js, which starts a listener on import, so it
 * is extracted here to be exercised without booting the server.
 */
const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
const start = server.indexOf("const REASONING_TAGS =");
const end = server.indexOf("function sanitizeRunOutput");
assert.ok(start > 0 && end > start, "reasoning filter source not found");
// eslint-disable-next-line no-new-func
const createReasoningStreamFilter = new Function(
  `${server.slice(start, end)}; return createReasoningStreamFilter;`
)();

/** Feeds text through the filter in fixed-size chunks, like a real stream. */
function streamThrough(text, chunkSize) {
  const filter = createReasoningStreamFilter();
  let out = "";
  for (let i = 0; i < text.length; i += chunkSize) {
    out += filter.push(text.slice(i, i + chunkSize));
  }
  return out + filter.flush();
}

test("reasoning never reaches the user, at any chunk size", () => {
  const input =
    "<think>The user wants minutes. I should start with the date.</think>" +
    "# Notulen Rapat\n\nTanggal: 12 Mei 2026";
  // Chunk size 1 splits every tag across boundaries — the hardest case.
  for (const size of [1, 2, 3, 5, 7, 13, 64, 4096]) {
    const out = streamThrough(input, size);
    assert.doesNotMatch(out, /<think>|<\/think>/i, `tag leaked at chunk size ${size}`);
    assert.doesNotMatch(out, /The user wants minutes/i, `reasoning leaked at chunk size ${size}`);
    assert.match(out, /# Notulen Rapat/, `content lost at chunk size ${size}`);
    assert.match(out, /Tanggal: 12 Mei 2026/, `tail lost at chunk size ${size}`);
  }
});

test("content before a reasoning block survives", () => {
  const out = streamThrough("Judul\n<think>hmm</think>\nIsi", 3);
  assert.match(out, /Judul/);
  assert.match(out, /Isi/);
  assert.doesNotMatch(out, /hmm/);
});

test("multiple reasoning blocks are all removed", () => {
  const out = streamThrough("A<think>x</think>B<thinking>y</thinking>C", 2);
  assert.equal(out.replace(/\s/g, ""), "ABC");
});

test("a stream ending mid-reasoning emits nothing from it", () => {
  // Truncated response: the opener arrived, the closer never did.
  const out = streamThrough("Intro\n<think>still deciding how to", 4);
  assert.match(out, /Intro/);
  assert.doesNotMatch(out, /still deciding/);
});

test("ordinary angle brackets are not mistaken for reasoning", () => {
  const input = "Gunakan tag <b>tebal</b> dan bandingkan 3 < 5 > 1";
  assert.equal(streamThrough(input, 3), input);
});

test("a trailing partial tag is held back rather than emitted", () => {
  const filter = createReasoningStreamFilter();
  // "<thi" could still become "<think>", so it must not be forwarded yet.
  const emitted = filter.push("Selesai<thi");
  assert.equal(emitted, "Selesai");
  assert.doesNotMatch(emitted, /<thi/);
  // Once proven to be a real tag, the buffered fragment is discarded, not shown.
  filter.push("nk>secret</think>");
  assert.doesNotMatch(filter.flush(), /secret|<thi/);
});

test("a held-back fragment that turns out to be content is still delivered", () => {
  const filter = createReasoningStreamFilter();
  filter.push("Nilai <");
  const rest = filter.push("5 lebih kecil");
  assert.match(filter.flush() + rest, /5 lebih kecil/);
});

test("no text is lost when the stream contains no reasoning at all", () => {
  const doc = "# Laporan\n\n| Tugas | PIC |\n|---|---|\n| Audit | Rina |\n\nSelesai.";
  for (const size of [1, 8, 100]) {
    assert.equal(streamThrough(doc, size), doc, `content changed at chunk size ${size}`);
  }
});
