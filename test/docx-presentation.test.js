import test from "node:test";
import assert from "node:assert/strict";
import { buildDocxBuffer } from "../server/officeExport.js";
import JSZip from "jszip";

const ACCENT = "2F5A46";
const PALE = "EEF2EC";

async function docXml(content, title, language = "id") {
  const buffer = await buildDocxBuffer({ content, title, language, plan: "Pro" });
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("word/document.xml").async("string");
}

const texts = (xml) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);

test("a document names what it is instead of a generic subtitle", async () => {
  const cases = [
    ["Laporan Evaluasi Pelatihan", "# Laporan\n\nIsi laporan.", "LAPORAN"],
    ["Notulen Rapat Mingguan", "# Notulen\n\nPembahasan.", "NOTULEN RAPAT"],
    ["Proposal Kerjasama", "# Proposal\n\nLatar belakang.", "PROPOSAL"],
  ];
  for (const [title, content, expected] of cases) {
    const xml = await docXml(content, title);
    assert.equal(texts(xml)[0], expected, `${title} was labelled wrongly`);
    assert.doesNotMatch(xml, /Dokumen kerja profesional/, "generic subtitle survived");
  }
});

test("the title wins over an incidental word in the body", async () => {
  // "Audit vendor" in a follow-up table used to relabel a report as ANALISIS,
  // because the shared detector scans title and body together and checks
  // analysis before report.
  const content = [
    "# Laporan Evaluasi",
    "",
    "## Rencana Tindak Lanjut",
    "",
    "| Tugas | PIC |",
    "| --- | --- |",
    "| Audit vendor | Rina |",
  ].join("\n");
  const xml = await docXml(content, "Laporan Evaluasi Pelatihan");
  assert.equal(texts(xml)[0], "LAPORAN");
});

test("an English document labels itself in English", async () => {
  const xml = await docXml("# Minutes\n\nDiscussion.", "Weekly Meeting Minutes", "en");
  assert.equal(texts(xml)[0], "MEETING MINUTES");
});

test("the cover carries a date but not the tool that typed it", async () => {
  // The brand used to sit beside the date under the title. A report someone
  // sends to their manager should not advertise the app in its masthead.
  const xml = await docXml("# Laporan\n\nIsi.", "Laporan Bulanan");
  assert.match(texts(xml)[2], /\d{4}/, "no year on the cover line");
  assert.doesNotMatch(texts(xml)[2], /AI Work Studio/);
});

test("tables read as tables, not as a faint grid", async () => {
  const content = [
    "# Rencana",
    "",
    "| Tugas | PIC | Tenggat |",
    "| --- | --- | --- |",
    "| Audit | Rina | 12 Mei |",
    "| Revisi | Budi | 20 Mei |",
  ].join("\n");
  const xml = await docXml(content, "Rencana Kerja");
  // Header row filled with the accent colour and set in white.
  assert.match(xml, new RegExp(`w:fill="${ACCENT}"`), "table header has no accent fill");
  assert.match(xml, /w:color w:val="FFFFFF"/, "header text is not reversed out");
  // Body rows alternate so long tables stay readable.
  assert.match(xml, new RegExp(`w:fill="${PALE}"`), "no zebra striping on body rows");
});

test("top-level headings are ruled so a long document can be skimmed", async () => {
  const xml = await docXml("# Bagian Satu\n\nIsi.\n\n# Bagian Dua\n\nIsi.", "Laporan");
  assert.match(xml, new RegExp(`w:color w:val="${ACCENT}"`), "headings are not accented");
  assert.match(xml, /<w:pBdr>/, "no rule under top-level headings");
});

test("body content survives the presentation changes", async () => {
  const content = "# Ringkasan\n\nKalimat pertama.\n\n- Poin satu\n- Poin dua";
  const xml = await docXml(content, "Ringkasan Kebijakan");
  const all = texts(xml).join(" ");
  for (const fragment of ["Kalimat pertama.", "Poin satu", "Poin dua"]) {
    assert.ok(all.includes(fragment), `${fragment} was lost`);
  }
});
