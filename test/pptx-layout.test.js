import test from "node:test";
import assert from "node:assert/strict";
import { buildPptxBuffer } from "../server/officeExport.js";
import JSZip from "jszip";

/**
 * A deck where every content slide is a title plus a bullet list reads like
 * pasted text. These check that the layout follows the content — and, most
 * importantly, that a table survives as a table instead of being flattened
 * into "Column: value · Column: value" bullet lines.
 */

/** Returns the XML of every slide in the generated deck. */
async function slidesOf(content, title = "Deck") {
  const buffer = await buildPptxBuffer({ content, title, language: "id" });
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  return Promise.all(names.map((name) => zip.file(name).async("string")));
}

test("a markdown table becomes a real table, not bullet text", async () => {
  const content = [
    "# Rencana",
    "",
    "## Tindak Lanjut",
    "",
    "| Tugas | Penanggung Jawab | Tenggat |",
    "| --- | --- | --- |",
    "| Audit vendor | Rina | 12 Mei |",
    "| Revisi SOP | Budi | 20 Mei |",
  ].join("\n");

  const slides = await slidesOf(content);
  const xml = slides.join("");
  // <a:tbl> is the DrawingML table element; its absence means the rows were
  // flattened into text.
  assert.match(xml, /<a:tbl>/, "no table element was emitted");
  assert.match(xml, /Penanggung Jawab/);
  assert.match(xml, /Audit vendor/);
  // The old behaviour joined cells with a middle dot into one bullet line.
  assert.doesNotMatch(xml, /Tugas: Audit vendor/, "table was flattened into bullet text");
});

test("a few short parallel points become cards rather than bullets", async () => {
  const content = ["# Fokus", "", "## Tiga Prioritas", "", "- Kualitas data", "- Kecepatan rilis", "- Biaya operasional"].join("\n");
  const slides = await slidesOf(content);
  const xml = slides.join("");
  // Cards are drawn as rounded rectangles and numbered 01/02/03.
  assert.match(xml, /roundRect/, "no card shapes were drawn");
  assert.match(xml, />01</);
  assert.match(xml, />03</);
});

test("figures become stat callouts", async () => {
  const content = ["# Hasil", "", "## Capaian", "", "- 82% peserta lulus", "- 1240 jam pelatihan", "- 15 unit terlibat"].join("\n");
  const slides = await slidesOf(content);
  const xml = slides.join("");
  assert.match(xml, />82%</, "the figure was not isolated as a callout");
  assert.match(xml, /peserta lulus/, "the caption was lost");
});

test("longer short lists split into two columns", async () => {
  const items = ["Perencanaan awal", "Pengumpulan data", "Analisis temuan", "Penyusunan draf", "Reviu internal", "Finalisasi"];
  const content = ["# Proses", "", "## Tahapan", "", ...items.map((i) => `- ${i}`)].join("\n");
  const slides = await slidesOf(content);
  const xml = slides.join("");
  for (const item of items) assert.match(xml, new RegExp(item), `${item} missing from the deck`);
});

test("prose still renders as ordinary bullets", async () => {
  const long =
    "Program ini dijalankan sepanjang enam bulan dengan melibatkan seluruh unit kerja dan mitra eksternal yang relevan bagi transformasi digital perusahaan.";
  const content = ["# Konteks", "", "## Latar Belakang", "", `- ${long}`, `- ${long}`].join("\n");
  const slides = await slidesOf(content);
  const xml = slides.join("");
  assert.match(xml, /buChar|buAutoNum/, "long prose should stay bulleted");
});

test("every slide still carries the brand footer and the deck opens and closes", async () => {
  const content = "# Judul\n\n## Bagian\n\n- Satu\n- Dua";
  const slides = await slidesOf(content);
  assert.ok(slides.length >= 3, "expected a title slide, content, and a closing slide");
  assert.match(slides.join(""), /AI Work Studio/);
});

test("a table heading does not also produce an empty slide", async () => {
  // The heading belongs to the table slide; emitting it as its own section too
  // put a slide showing only a dash immediately before the table.
  const content = [
    "# Rencana",
    "",
    "## Tindak Lanjut",
    "",
    "| Tugas | PIC |",
    "| --- | --- |",
    "| Audit | Rina |",
  ].join("\n");

  const slides = await slidesOf(content);
  const dashOnly = slides.filter((xml) => {
    const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).filter(Boolean);
    const body = texts.filter((t) => !/AI Work Studio|Tindak Lanjut|·/.test(t));
    return body.length === 1 && body[0] === "—";
  });
  assert.equal(dashOnly.length, 0, "an empty placeholder slide was emitted");
});

test("a short list stays on one slide instead of leaving an orphan", async () => {
  // Six short steps used to split 5 + 1, stranding the last one on its own.
  const steps = ["Perencanaan", "Pengumpulan data", "Analisis", "Penyusunan draf", "Reviu", "Finalisasi"];
  const content = ["# Proses", "", "## Tahapan", "", ...steps.map((s) => `- ${s}`)].join("\n");
  const slides = await slidesOf(content);
  const withSteps = slides.filter((xml) => steps.some((s) => xml.includes(s)));
  assert.equal(withSteps.length, 1, `steps spread across ${withSteps.length} slides`);
  for (const step of steps) assert.match(withSteps[0], new RegExp(step));
});

test("headings with no content do not become slides", async () => {
  // Reported from real use: decks came back with many near-blank slides. Each
  // was a heading the model left unfilled, rendered as a slide showing "—".
  const content = [
    "# Laporan Evaluasi",
    "",
    "## Latar Belakang",
    "Program enam bulan.",
    "",
    "## Metodologi",
    "",
    "## Temuan",
    "- Kelulusan 82%",
    "- Penerapan rendah",
    "",
    "## Analisis",
    "",
    "## Penutup",
  ].join("\n");

  const slides = await slidesOf(content);
  const bodies = slides.map((xml) =>
    [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
      .map((m) => m[1])
      .filter((t) => t && !/^AI Work Studio|·\s*\d+$/.test(t))
  );

  const dashSlides = bodies.filter((body) => body.includes("—"));
  assert.equal(dashSlides.length, 0, "a placeholder slide was emitted");

  for (const gone of ["Metodologi", "Analisis", "Penutup"]) {
    assert.ok(
      !slides.some((xml) => xml.includes(gone)),
      `${gone} had no content but still became a slide`
    );
  }
  // The sections that did have content are all still there.
  const all = slides.join("");
  for (const kept of ["Latar Belakang", "Program enam bulan.", "Kelulusan 82%", "Penerapan rendah"]) {
    assert.ok(all.includes(kept), `${kept} was lost`);
  }
});
