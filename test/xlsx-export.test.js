import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { buildXlsxBuffer, tablesFromContent } from "../server/xlsxExport.js";
import { canExportFormat } from "../src/planEntitlements.js";

/**
 * The recap templates promise a spreadsheet, so the failure that matters here
 * is not an ugly workbook but a corrupted one: a row shifted by a missing
 * cell, or a figure silently reinterpreted.
 */

async function workbook(content, title = "Rekap") {
  const buffer = await buildXlsxBuffer({ content, title, language: "id" });
  const zip = await JSZip.loadAsync(buffer);
  const sheets = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  return {
    zip,
    book: await zip.file("xl/workbook.xml").async("string"),
    sheets: await Promise.all(sheets.map((name) => zip.file(name).async("string"))),
  };
}

const TABLE = [
  "# Rekap Pengeluaran",
  "",
  "## Bulan Mei",
  "",
  "| No | Uraian | Jumlah |",
  "| --- | --- | --- |",
  "| 1 | Konsumsi rapat | 750000 |",
  "| 2 | ATK | 125000 |",
].join("\n");

test("the workbook carries every part Excel requires", async () => {
  const { zip } = await workbook(TABLE);
  for (const part of [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/worksheets/sheet1.xml",
  ]) {
    assert.ok(zip.file(part), `${part} is missing`);
  }
  // The styles relationship must not collide with a sheet relationship.
  const rels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  const ids = [...rels.matchAll(/Id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "duplicate relationship id");
});

test("a markdown table becomes a sheet named after its heading", async () => {
  const { book, sheets } = await workbook(TABLE);
  assert.match(book, /name="Bulan Mei"/);
  assert.match(sheets[0], /Konsumsi rapat/);
  assert.match(sheets[0], /Uraian/);
  // The header row is frozen and filterable or a long recap is unusable.
  assert.match(sheets[0], /state="frozen"/);
  assert.match(sheets[0], /<autoFilter ref="A1:C1"\/>/);
});

test("plain integers are numeric but ambiguous figures stay text", async () => {
  // "1.500" is one thousand five hundred in Indonesian and 1.5 in English.
  // Guessing would silently rewrite the user's data, so it stays a string.
  const content = [
    "| Item | Angka |",
    "| --- | --- |",
    "| Polos | 750000 |",
    "| Bertitik | 1.500 |",
    "| Bersatuan | Rp 2.000 |",
  ].join("\n");
  const { sheets } = await workbook(content);

  assert.match(sheets[0], /<c r="B2" s="2"><v>750000<\/v><\/c>/, "a plain integer was not numeric");
  assert.match(sheets[0], /r="B3"[^>]*t="inlineStr"[\s\S]{0,60}1\.500/, "1.500 was reinterpreted");
  assert.match(sheets[0], /r="B4"[^>]*t="inlineStr"/);
});

test("ragged rows are padded so columns never shift", async () => {
  const content = [
    "| A | B | C |",
    "| --- | --- | --- |",
    "| satu | dua | tiga |",
    "| hanya-satu |",
  ].join("\n");
  const [table] = tablesFromContent(content);
  assert.deepEqual(table.rows[2], ["hanya-satu", "", ""]);

  const { sheets } = await workbook(content);
  // The short row keeps its two empty trailing cells rather than ending early.
  assert.match(sheets[0], /<row r="3"><c r="A3"[\s\S]*?hanya-satu[\s\S]*?<c r="B3" s="2"\/><c r="C3" s="2"\/><\/row>/);
});

test("several tables become several sheets with unique legal names", async () => {
  const content = [
    "## Rekap: Mei/2026",
    "| A |",
    "| --- |",
    "| x |",
    "",
    "## Rekap: Mei/2026",
    "| A |",
    "| --- |",
    "| y |",
  ].join("\n");
  const { book, sheets } = await workbook(content);
  assert.equal(sheets.length, 2);
  // ":" and "/" are illegal in a tab name, and the duplicate must be suffixed.
  assert.doesNotMatch(book, /name="[^"]*[:/][^"]*"/);
  const names = [...book.matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(names).size, 2, `sheet names collided: ${names.join(", ")}`);
});

test("markup characters in a cell do not break the file", async () => {
  const content = ["| No | Ket |", "| --- | --- |", '| 1 | Biaya < 5 & "lain" |'].join("\n");
  const { sheets } = await workbook(content);
  assert.match(sheets[0], /Biaya &lt; 5 &amp; &quot;lain&quot;/);
  assert.doesNotMatch(sheets[0], /<t[^>]*>[^<]*<(?!\/t)/);
});

test("a single-column table is still a table", async () => {
  // Attendance and checklist sheets are often one column wide; the divider
  // pattern used to require a second column and dropped them into prose.
  const content = ["## Peserta", "| Nama |", "| --- |", "| Rina |", "| Budi |"].join("\n");
  const [table] = tablesFromContent(content);
  assert.ok(table, "a one-column table was not detected");
  assert.deepEqual(table.rows, [["Nama"], ["Rina"], ["Budi"]]);
});

test("a document with no table still produces a readable workbook", async () => {
  // The model is told to return tables; when it does not, an empty file would
  // be a dead end, so the text goes into one column instead.
  const { sheets, book } = await workbook("# Catatan\n\n- Poin pertama\n- Poin kedua", "Catatan");
  assert.equal(sheets.length, 1);
  assert.match(book, /name="Catatan"/);
  assert.match(sheets[0], /Poin pertama/);
  assert.match(sheets[0], /Poin kedua/);
});

test("the export route exists and is reachable on the free tier", async () => {
  const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
  assert.match(server, /app\.post\("\/api\/export\/xlsx"/);
  assert.match(server, /buildXlsxBuffer/);
  assert.match(server, /spreadsheetml\.sheet/);
  // Four templates produce nothing but a spreadsheet, so locking it would
  // leave them useless for the tier most people are on.
  assert.equal(canExportFormat("Free", "xlsx"), true);
  assert.equal(canExportFormat("Free", "pptx"), false);
});

test("columns beyond Z are addressed correctly", async () => {
  const headers = Array.from({ length: 28 }, (_, i) => `K${i + 1}`);
  const content = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    `| ${headers.map((_, i) => `v${i}`).join(" | ")} |`,
  ].join("\n");
  const { sheets } = await workbook(content);
  assert.match(sheets[0], /r="AA1"/);
  assert.match(sheets[0], /r="AB1"/);
  assert.match(sheets[0], /<autoFilter ref="A1:AB1"\/>/);
});
