// Minimal XLSX → CSV reader built on jszip (already a dependency) — avoids
// pulling SheetJS, whose npm build carries unpatched high-severity advisories.
// Covers the common cases: shared strings, inline strings, booleans, numbers,
// and sparse cells via the `r="B3"` address attribute. Date cells stay as
// their serial numbers, which is fine for a data profile.

import JSZip from "jszip";

function decodeEntities(text) {
  return String(text)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (m, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

function columnIndex(ref) {
  const letters = String(ref || "").match(/^[A-Z]+/i);
  if (!letters) return -1;
  let index = 0;
  for (const ch of letters[0].toUpperCase()) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

function tags(xml, name) {
  const out = [];
  const re = new RegExp(`<${name}(\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g");
  let m;
  while ((m = re.exec(xml))) out.push({ attrs: m[1] || "", body: m[2] });
  return out;
}

function attr(attrs, name) {
  const m = String(attrs).match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : "";
}

function cellText(cell, sharedStrings) {
  const type = attr(cell.attrs, "t");
  if (type === "inlineStr") {
    const texts = [...cell.body.matchAll(/<t(\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[2]);
    return decodeEntities(texts.join(""));
  }
  const v = cell.body.match(/<v(\s[^>]*)?>([\s\S]*?)<\/v>/);
  const raw = v ? v[2] : "";
  if (type === "s") return sharedStrings[Number(raw)] ?? "";
  if (type === "b") return raw === "1" ? "TRUE" : "FALSE";
  return decodeEntities(raw);
}

export function parseSheetXml(xml, sharedStrings) {
  return tags(xml, "row").map((row) => {
    const cells = [];
    for (const cell of tags(row.body, "c")) {
      const index = columnIndex(attr(cell.attrs, "r"));
      const text = cellText(cell, sharedStrings);
      if (index >= 0) cells[index] = text;
      else cells.push(text);
    }
    // Fill explicit gaps so commas keep columns aligned.
    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = "";
    return cells;
  });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function firstSheetPath(zip) {
  const names = Object.keys(zip.files).filter((name) =>
    /^xl\/worksheets\/[^/]+\.xml$/i.test(name)
  );
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return names[0] || null;
}

export async function xlsxFileToCsv(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sharedStrings = [];
  const sharedFile = zip.file("xl/sharedStrings.xml");
  if (sharedFile) {
    const xml = await sharedFile.async("text");
    for (const si of tags(xml, "si")) {
      const texts = [...si.body.matchAll(/<t(\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[2]);
      sharedStrings.push(decodeEntities(texts.join("")));
    }
  }
  const sheetPath = firstSheetPath(zip);
  if (!sheetPath) throw new Error("Spreadsheet has no sheets");
  const sheetXml = await zip.file(sheetPath).async("text");
  return rowsToCsv(parseSheetXml(sheetXml, sharedStrings));
}
