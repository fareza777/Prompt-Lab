import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as Y from "yjs";
import {
  buildAnalysisMarkdown,
  columnStatsSql,
  isSpreadsheetAttachment,
  isSupportedSpreadsheet,
  quoteIdent,
  splitCsvLine,
  topValuesSql,
} from "../src/dataAnalyze.js";
import { mergeRankedLists, searchWorkspace } from "../src/workspaceSearch.js";
import { pushVersionToArray, snapshotToDraft, MAX_VERSIONS } from "../src/draftStore.js";

const packageJsonUrl = new URL("../package.json", import.meta.url);

test("spreadsheet detection covers csv/tsv/xlsx by name and mime", () => {
  assert.equal(isSpreadsheetAttachment({ name: "data.csv" }), true);
  assert.equal(isSpreadsheetAttachment({ name: "DATA.TSV" }), true);
  assert.equal(isSpreadsheetAttachment({ name: "buku.xlsx" }), true);
  assert.equal(
    isSpreadsheetAttachment({ name: "blob", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    true
  );
  assert.equal(isSpreadsheetAttachment({ name: "foto.png", type: "image/png" }), false);
  assert.equal(isSpreadsheetAttachment({ name: "notes.md" }), false);
  assert.equal(isSupportedSpreadsheet({ name: "big.csv", file: { size: 60 * 1024 * 1024 } }), false);
});

test("splitCsvLine respects quoted commas", () => {
  assert.deepEqual(splitCsvLine('a,"b,c",d'), ["a", "b,c", "d"]);
  assert.deepEqual(splitCsvLine('"x""y",z'), ['x"y', "z"]);
});

test("quoteIdent neutralizes quote injection", () => {
  assert.equal(quoteIdent('weird"col'), '"weird""col"');
  assert.equal(quoteIdent("normal"), '"normal"');
});

test("stats SQL quotes every identifier", () => {
  const sql = columnStatsSql('name"; DROP TABLE t; --', "VARCHAR");
  assert.match(sql, /"name""; DROP TABLE t; --"/);
  const numeric = columnStatsSql("revenue", "DOUBLE");
  assert.match(numeric, /min\("revenue"\)/);
  assert.match(topValuesSql("kota"), /GROUP BY 1 ORDER BY c DESC LIMIT 3/);
});

test("buildAnalysisMarkdown renders profile sections", () => {
  const md = buildAnalysisMarkdown({
    sourceName: "sales.csv",
    rowCount: 120,
    columns: [
      { name: "revenue", type: "DOUBLE", nonNull: 120, distinct: 118, min: "1", max: "99", mean: "42.5", topValues: [] },
      { name: "city", type: "VARCHAR", nonNull: 118, distinct: 5, topValues: [{ value: "Jakarta", count: 60 }] },
    ],
  });
  assert.match(md, /# Profil data — sales\.csv/);
  assert.match(md, /120 baris · 2 kolom/);
  assert.match(md, /\*\*revenue\*\* \(DOUBLE\): non-null 120 · unik 118 · rentang 1–99 · rata-rata 42\.5/);
  assert.match(md, /nilai teratas: Jakarta \(60×\)/);
});

test("Orama index finds library items by content, not just substring", async () => {
  const items = [
    { id: "a", title: "Weekly report", content: "Penjualan naik dua kali lipat di cabang Surabaya." },
    { id: "b", title: "Meeting notes", content: "Bahas roadmap kuartal depan." },
  ];
  const hits = await searchWorkspace(items, "surabaya");
  assert.equal(hits[0]?.id, "a");
  const fuzzy = await searchWorkspace(items, "roadmapp"); // tolerance:1 still matches
  assert.equal(fuzzy[0]?.id, "b");
});

test("mergeRankedLists fuses lexical and semantic orderings", () => {
  const fused = mergeRankedLists(
    [{ id: "a" }, { id: "b" }, { id: "c" }],
    [{ id: "c" }, { id: "a" }]
  );
  assert.equal(fused[0].id, "a"); // top-1 lexical + top-2 semantic beats pure top-1
  assert.equal(fused[1].id, "c");
});

test("pushVersionToArray dedupes and caps the rolling list", () => {
  const doc = new Y.Doc();
  const arr = doc.getArray("versions");
  const long = "x".repeat(80);
  assert.equal(pushVersionToArray(arr, long), true);
  assert.equal(pushVersionToArray(arr, long), false); // identical content skipped
  pushVersionToArray(arr, `${long}-other`);
  assert.equal(pushVersionToArray(arr, long), false); // non-adjacent dupe skipped too
  assert.equal(arr.get(1).markdown.endsWith("-other"), true);
  assert.equal(pushVersionToArray(arr, "tiny"), false); // below min length
  for (let i = 0; i < MAX_VERSIONS + 3; i++) {
    pushVersionToArray(arr, `${long}-${i}`);
  }
  assert.equal(arr.length, MAX_VERSIONS);
  assert.ok(arr.get(arr.length - 1).markdown.endsWith(`-${MAX_VERSIONS + 2}`));
});

test("parseSheetXml decodes shared strings, sparse cells, and escapes", async () => {
  const { parseSheetXml, rowsToCsv } = await import("../src/xlsxToCsv.js");
  const xml =
    '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="C1"><v>42</v></c></row>' +
    '<row><c r="A2" t="inlineStr"><is><t>a,b &amp; c</t></is></c><c r="B2" t="b"><v>1</v></c></row></sheetData></worksheet>';
  const rows = parseSheetXml(xml, ["Jakarta"]);
  assert.deepEqual(rows, [["Jakarta", "", "42"], ["a,b & c", "TRUE"]]);
  assert.equal(rowsToCsv(rows), 'Jakarta,,42\n"a,b & c",TRUE');
});

test("snapshotToDraft normalizes partial state", () => {
  const draft = snapshotToDraft({ narrative: "halo", savedAt: "nope" });
  assert.equal(draft.narrative, "halo");
  assert.deepEqual(draft.attachments, []);
  assert.equal(snapshotToDraft(null), null);
});

test("heavy engines ship as lazy chunks, never in the initial bundle", async () => {
  const pkg = JSON.parse(await readFile(packageJsonUrl, "utf8"));
  for (const dep of ["@duckdb/duckdb-wasm", "@orama/orama", "@huggingface/transformers", "yjs", "y-indexeddb", "jszip"]) {
    assert.ok(pkg.dependencies[dep], `${dep} missing from dependencies`);
  }
  const main = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
  for (const mod of ["draftStore.js", "workspaceSearch.js", "semanticSearch.js"]) {
    assert.match(main, new RegExp(`import\\("\\./${mod.replace(".", "\\.")}"\\)`), `${mod} must stay a dynamic import`);
  }
});
