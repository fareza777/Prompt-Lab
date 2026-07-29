/**
 * Spreadsheet export.
 *
 * The recap, table-extract, attendance and action-item templates all ask the
 * model for Markdown tables; this turns those tables into a real .xlsx so the
 * numbers can be sorted and totalled instead of retyped.
 *
 * Written directly with JSZip rather than pulling in a spreadsheet library:
 * the file is a zip of six small XML parts, and the project already ships
 * JSZip for the Office readers.
 */

import JSZip from "jszip";
import { parseStructuredContent } from "./officeExport.js";

const HEADER_FILL = "FF2F5A46";
const RULE = "FFD8D0C2";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** Characters below 0x20 are illegal in XML and make Excel refuse the file. */
const escapeXml = (value = "") =>
  String(value)
    .replace(CONTROL_CHARACTERS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function columnLetter(index) {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

/**
 * Only whole numbers with no separators become numeric cells.
 *
 * "1.500" means one thousand five hundred in Indonesian and one-and-a-half in
 * English, and the app runs in both. The templates instruct the model to copy
 * figures verbatim, so a wrong guess here silently changes the user's data —
 * a far worse outcome than a column that needs converting in Excel. Anything
 * carrying a separator, currency, or unit stays text.
 */
function numericValue(text) {
  const trimmed = String(text).trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number.isSafeInteger(Number(trimmed)) ? trimmed : null;
}

function cellXml(reference, value, style) {
  const number = style === 1 ? null : numericValue(value);
  if (number !== null) {
    return `<c r="${reference}" s="${style}"><v>${number}</v></c>`;
  }
  const text = escapeXml(value);
  if (!text) return `<c r="${reference}" s="${style}"/>`;
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

function sheetXml(rows) {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));

  // Width follows the longest cell so nothing arrives as ####, but is clamped
  // so one long sentence cannot push the other columns off the screen.
  const widths = Array.from({ length: columnCount }, (_, column) => {
    const longest = rows.reduce(
      (max, row) => Math.max(max, String(row[column] ?? "").length),
      0
    );
    return Math.min(52, Math.max(10, longest + 4));
  });

  const cols = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");

  const body = rows
    .map((row, rowIndex) => {
      const cells = Array.from({ length: columnCount }, (_, column) =>
        cellXml(`${columnLetter(column)}${rowIndex + 1}`, row[column] ?? "", rowIndex === 0 ? 1 : 2)
      ).join("");
      return `<row r="${rowIndex + 1}"${rowIndex === 0 ? ' ht="24" customHeight="1"' : ""}>${cells}</row>`;
    })
    .join("");

  const lastColumn = columnLetter(columnCount - 1);
  // Freezing and filtering the header row is what makes a long recap usable.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${lastColumn}1"/></worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="${HEADER_FILL}"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="${RULE}"/></left><right style="thin"><color rgb="${RULE}"/></right><top style="thin"><color rgb="${RULE}"/></top><bottom style="thin"><color rgb="${RULE}"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

/** Excel rejects these characters in a tab name and caps it at 31 characters. */
function sheetName(raw, taken) {
  let name = String(raw || "")
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  if (!name) name = "Sheet";
  let candidate = name;
  let suffix = 2;
  while (taken.has(candidate.toLowerCase())) {
    const room = 31 - String(suffix).length - 1;
    candidate = `${name.slice(0, room)} ${suffix}`;
    suffix += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Every Markdown table in the document, named after the heading above it.
 *
 * Ragged rows are padded so the sheet stays rectangular — a short row would
 * otherwise shift later columns up a cell and quietly corrupt the data.
 */
export function tablesFromContent(content = "", title = "") {
  const blocks = parseStructuredContent(content, title);
  const tables = [];
  let heading = "";

  for (const block of blocks) {
    if (block.type === "heading") {
      heading = block.text;
      continue;
    }
    if (block.type !== "table" || !block.rows?.length) continue;
    const width = Math.max(...block.rows.map((row) => row.length));
    tables.push({
      name: heading || title,
      rows: block.rows.map((row) =>
        Array.from({ length: width }, (_, index) => String(row[index] ?? "").trim())
      ),
    });
  }
  return tables;
}

/**
 * A readable sheet for a document that came back without any table.
 *
 * The model is instructed to return tables, but an empty workbook would be a
 * dead end for the user; the text goes into one column instead.
 */
function fallbackRows(content, language) {
  const header = language === "en" ? "Content" : "Isi";
  const lines = String(content || "")
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s*/, "").replace(/^[-*+]\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 500);
  return [[header], ...lines.map((line) => [line])];
}

/**
 * @param {object} options
 * @param {string} options.content  finished Markdown from the model
 * @param {string} [options.title]
 * @param {string} [options.language]
 * @returns {Promise<Buffer>}
 */
export async function buildXlsxBuffer({ content = "", title = "", language = "id" } = {}) {
  const found = tablesFromContent(content, title);
  const taken = new Set();
  const sheets = (found.length ? found : [{ name: title, rows: fallbackRows(content, language) }]).map(
    (table) => ({ name: sheetName(table.name || title || "Sheet", taken), rows: table.rows })
  );

  const zip = new JSZip();
  const stylesRel = `rId${sheets.length + 1}`;

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
      .map(
        (_, index) =>
          `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  );

  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join("")}</sheets></workbook>`
  );

  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map(
        (_, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
      )
      .join(
        ""
      )}<Relationship Id="${stylesRel}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  );

  zip.file("xl/styles.xml", STYLES_XML);
  sheets.forEach((sheet, index) => {
    zip.file(`xl/worksheets/sheet${index + 1}.xml`, sheetXml(sheet.rows));
  });

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
