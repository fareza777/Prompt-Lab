import { createRequire } from "node:module";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { sanitizeReadyDocument } from "../src/readyDocumentSanitize.js";
import { detectDeliverableProfile } from "../src/deliverableProfiles.js";

// Vercel serverless resolves dynamic import("pptxgenjs") to the ESM build and
// then crashes with "Cannot use import statement outside a module". Force CJS.
const require = createRequire(import.meta.url);
function loadPptxGen() {
  // createRequire hits the package "require" export (CJS). Dynamic import()
  // resolves to the ESM build and crashes on Vercel serverless.
  const mod = require("pptxgenjs");
  return mod?.default || mod;
}

const BRAND = "AI Work Studio";
const COLORS = {
  ink: "1F241F",
  muted: "667067",
  accent: "2F5A46",
  accentSoft: "DFE9E1",
  pale: "EEF2EC",
  rule: "D8D0C2",
  paper: "FAF8F3",
  paperDeep: "F0EBE1",
  white: "FFFFFF",
};

const FONT_HEAD = "Calibri";
const FONT_BODY = "Calibri";

const stripInline = (value = "") =>
  String(value)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();

function isTableDivider(line) {
  // The trailing column was previously required, so a single-column table
  // ("| Nama |") was never recognised and silently degraded into paragraphs.
  // Attendance and recap sheets are frequently one column wide.
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => stripInline(cell));
}

export function parseStructuredContent(content = "", title = "") {
  const lines = String(content).replace(/\r/g, "").split("\n");
  const blocks = [];
  let paragraph = [];
  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text: stripInline(text) });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const text = stripInline(heading[2]);
      if (!(blocks.length === 0 && title && text.toLowerCase() === title.toLowerCase())) {
        blocks.push({ type: "heading", level: Math.min(3, heading[1].length), text });
      }
      continue;
    }

    if (line.includes("|") && isTableDivider(lines[index + 1] || "")) {
      flushParagraph();
      const rows = [parseTableRow(line)];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "table", rows });
      continue;
    }

    const list = line.match(/^([-*+]|\d+[.)])\s+(.+)$/);
    if (list) {
      flushParagraph();
      const ordered = /^\d/.test(list[1]);
      const items = [stripInline(list[2])];
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim().match(/^([-*+]|\d+[.)])\s+(.+)$/);
        if (!next || /^\d/.test(next[1]) !== ordered) break;
        items.push(stripInline(next[2]));
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      blocks.push({ type: "divider" });
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return blocks.slice(0, 1000);
}

function docxHeading(block) {
  const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];
  const isTop = block.level === 1;
  return new Paragraph({
    heading: levels[Math.max(0, block.level - 1)],
    keepNext: true,
    alignment: AlignmentType.LEFT,
    spacing: { before: isTop ? 340 : 240, after: isTop ? 140 : 100 },
    // A ruled top-level heading gives a long report visible structure when
    // skimmed; without it every heading reads at the same weight.
    border: isTop
      ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.accent, space: 6 } }
      : undefined,
    children: [
      new TextRun({
        text: block.text,
        bold: true,
        color: isTop ? COLORS.accent : COLORS.ink,
      }),
    ],
  });
}

function docxTable(block) {
  const columnCount = Math.max(1, ...block.rows.map((row) => row.length));
  const border = { style: BorderStyle.SINGLE, size: 4, color: COLORS.rule };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: block.rows.map(
      (row, rowIndex) =>
        new TableRow({
          tableHeader: rowIndex === 0,
          children: Array.from({ length: columnCount }, (_, cellIndex) =>
            new TableCell({
              width: { size: Math.floor(100 / columnCount), type: WidthType.PERCENTAGE },
              // Accent header with white text, then zebra body rows — the same
              // treatment the slides use, so a table scans instead of blending
              // into the page as a faint grid.
              shading:
                rowIndex === 0
                  ? { fill: COLORS.accent }
                  : rowIndex % 2 === 0
                    ? { fill: COLORS.pale }
                    : undefined,
              borders: { top: border, bottom: border, left: border, right: border },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[cellIndex] || "",
                      bold: rowIndex === 0,
                      color: rowIndex === 0 ? COLORS.white : COLORS.ink,
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          ),
        }),
    ),
  });
}

function isBulletSectionHeading(text = "") {
  return /\b(poin|penting|temuan|ringkasan|indikator|rekomendasi|highlight|finding|key\s*point|observasi|catatan)\b/i.test(
    String(text)
  ) && !/\b(langkah|tahapan?|prosedur|sop|urutan|langkah\s*kerja)\b/i.test(String(text));
}

function isProcedureHeading(text = "") {
  return /\b(langkah|tahapan?|prosedur|sop|urutan|langkah\s*kerja|procedure|steps?)\b/i.test(
    String(text)
  );
}

/**
 * Reports often emit continuous "1. 2. 3." lists under "Poin-Poin Penting".
 * Those should export as bullets. True procedures keep ordered numbering,
 * each list with its own restarting sequence.
 */
export function normalizeListsForDocx(blocks = []) {
  let bulletSectionLevel = null;
  return blocks.map((block) => {
    if (block.type === "heading") {
      const level = Number(block.level) || 2;
      if (bulletSectionLevel != null && level <= bulletSectionLevel) {
        bulletSectionLevel = null;
      }
      if (isBulletSectionHeading(block.text)) {
        bulletSectionLevel = level;
      } else if (isProcedureHeading(block.text)) {
        bulletSectionLevel = null;
      }
      return block;
    }
    if (block.type !== "list") return block;
    if (bulletSectionLevel != null && block.ordered) {
      return { ...block, ordered: false };
    }
    return block;
  });
}

function blocksToDocx(blocks) {
  const children = [];
  let orderedListIndex = 0;
  for (const block of blocks) {
    if (block.type === "heading") children.push(docxHeading(block));
    if (block.type === "paragraph") {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 160, line: 312, lineRule: "auto" },
          children: [new TextRun({ text: block.text, color: COLORS.ink, size: 22 })],
        }),
      );
    }
    if (block.type === "list") {
      const reference = block.ordered ? `ordered-list-${orderedListIndex++}` : null;
      block.items.forEach((item) =>
        children.push(
          new Paragraph({
            bullet: block.ordered ? undefined : { level: 0 },
            numbering: reference ? { reference, level: 0 } : undefined,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 80, line: 300 },
            children: [new TextRun({ text: item, size: 22, color: COLORS.ink })],
          }),
        ),
      );
    }
    if (block.type === "table") {
      children.push(docxTable(block));
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
    }
    if (block.type === "divider") {
      children.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.rule } },
          spacing: { after: 180 },
        }),
      );
    }
  }
  return { children, orderedListCount: orderedListIndex };
}

/** What the document calls itself on its own cover line. */
const DOC_KIND_LABEL = {
  id: {
    report: "Laporan",
    minutes: "Notulen Rapat",
    analysis: "Analisis",
    proposal: "Proposal",
    sop: "Prosedur Operasional Standar",
    presentation: "Ringkasan Presentasi",
    diagram: "Dokumen Proses",
    general: "Dokumen Kerja",
  },
  en: {
    report: "Report",
    minutes: "Meeting Minutes",
    analysis: "Analysis",
    proposal: "Proposal",
    sop: "Standard Operating Procedure",
    presentation: "Presentation Summary",
    diagram: "Process Document",
    general: "Working Document",
  },
};

function docKindLabel(profile, language) {
  const table = DOC_KIND_LABEL[language === "en" ? "en" : "id"];
  return table[profile] || table.general;
}

function formatDocDate(language) {
  try {
    return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return "";
  }
}

export async function buildDocxBuffer({
  title = "AI Work Studio Export",
  content = "",
  language = "id",
  plan = "Free",
} = {}) {
  const ready = sanitizeReadyDocument(content, "report");
  // "Dokumen kerja profesional" sat on every export regardless of what it was.
  // Minutes should say minutes, a report should say report.
  //
  // The title decides first. The shared detector scans title and body together
  // and checks "analysis" before "report", so a single incidental word in the
  // body — "Audit vendor" in a follow-up table — was enough to label a
  // document titled "Laporan Evaluasi" as ANALISIS. The body is only consulted
  // when the title says nothing.
  const titleProfile = detectDeliverableProfile({ narrative: title });
  const profile =
    titleProfile !== "general"
      ? titleProfile
      : detectDeliverableProfile({ narrative: title, content: ready });
  const kindLabel = docKindLabel(profile, language);
  const dateLabel = formatDocDate(language);
  const blocks = normalizeListsForDocx(parseStructuredContent(ready, title));
  const { children, orderedListCount } = blocksToDocx(blocks);
  const numberingConfig = Array.from({ length: Math.max(1, orderedListCount) }, (_, index) => ({
    reference: `ordered-list-${index}`,
    levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }],
  }));
  const footerText = plan === "Free" ? `Created with ${BRAND}  ·  ` : "";
  const doc = new Document({
    creator: BRAND,
    title,
    description: `Professional document created with ${BRAND}`,
    numbering: {
      config: numberingConfig,
    },
    styles: {
      default: { document: { run: { font: "Calibri", size: 22, color: COLORS.ink } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1247, right: 1247, bottom: 1247, left: 1247 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: title, color: COLORS.muted, size: 16 })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: footerText, color: COLORS.muted, size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: COLORS.muted, size: 16 }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Kicker above the title, the way a real document masthead reads.
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: kindLabel.toUpperCase(),
                bold: true,
                color: COLORS.accent,
                size: 18,
                characterSpacing: 40,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 120 },
            children: [new TextRun({ text: title, bold: true, color: COLORS.ink, size: 44 })],
          }),
          new Paragraph({
            spacing: { after: 420 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.accent, space: 10 },
            },
            children: [
              new TextRun({
                text: dateLabel ? `${dateLabel}  ·  ${BRAND}` : BRAND,
                color: COLORS.muted,
                size: 18,
              }),
            ],
          }),
          ...children,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

function clipText(value = "", max = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

/**
 * Leading figure in an item, e.g. "82% peserta lulus" or "Rp 1,2 miliar".
 *
 * The symbol and word units are separate branches on purpose: a trailing \b
 * after "%" never matches, because "%" and the following space are both
 * non-word characters, so "82%" was being captured as plain "82".
 */
const LEADING_STAT =
  /^(?:Rp\s*)?[+-]?\d[\d.,]*(?:\s*%|\s*(?:persen|juta|miliar|ribu|rb|jt|k|hari|bulan|tahun|orang|peserta|slide|halaman)\b)?/i;

/**
 * Picks a slide shape from the content itself.
 *
 * Every content slide used to be a title plus a bullet list, which is what
 * makes a generated deck read like pasted text. Short items become cards,
 * figures become stat callouts, and longer lists split into two columns so a
 * 16:9 slide is not mostly empty.
 */
function pickLayout(items = []) {
  const list = items.filter(Boolean);
  if (!list.length) return "bullets";

  const shortEnough = (text, max) => String(text).split(/\s+/).filter(Boolean).length <= max;

  if (list.length >= 2 && list.length <= 4 && list.every((item) => LEADING_STAT.test(String(item).trim()))) {
    return "stats";
  }
  if (list.length >= 2 && list.length <= 4 && list.every((item) => shortEnough(item, 14))) {
    return "cards";
  }
  if (list.length >= 4 && list.every((item) => shortEnough(item, 16))) {
    return "columns";
  }
  return "bullets";
}

function splitForSlides(blocks, language = "id") {
  const fallbackTitle = language === "en" ? "Overview" : "Ringkasan";
  const sections = [];
  let current = { title: "", items: [], kind: "content" };
  const push = () => {
    if (current.title || current.items.length) sections.push(current);
    current = { title: "", items: [], kind: "content" };
  };

  for (const block of blocks) {
    if (block.type === "heading") {
      // Level-1 headings become section openers when they stand alone.
      if (block.level === 1 && (current.title || current.items.length)) push();
      if (block.level === 1) {
        push();
        sections.push({ title: clipText(block.text, 80), items: [], kind: "section" });
        continue;
      }
      push();
      current.title = clipText(block.text, 90);
      continue;
    }
    if (block.type === "list") {
      current.items.push(...block.items.map((item) => clipText(item, 160)));
      continue;
    }
    if (block.type === "paragraph") {
      current.items.push(clipText(block.text, 180));
      continue;
    }
    if (block.type === "table") {
      const rows = block.rows || [];
      if (rows.length > 1) {
        // A table flattened into "Col: value · Col: value" bullets loses the
        // one thing that made it readable. Carry it through as a table and let
        // the renderer draw a real one.
        const title = current.title;
        // The heading belongs to the table slide. Pushing it as its own
        // section too would emit an empty slide showing only a dash.
        if (current.items.length) push();
        else current = { title: "", items: [], kind: "content" };
        sections.push({
          kind: "table",
          title,
          headers: rows[0].map((cell) => clipText(cell, 40)),
          rows: rows.slice(1, 11).map((row) => row.map((cell) => clipText(cell, 60))),
        });
      }
    }
  }
  push();

  const slides = [];
  for (const section of sections) {
    if (section.kind === "section" || section.kind === "table") {
      slides.push(section);
      continue;
    }
    let items = [...section.items].filter(Boolean);
    if (!items.length) {
      // A heading with nothing under it produced a slide showing only a dash.
      // Models emit those constantly — an outline of sections they then leave
      // empty, or a section whose only line was scaffolding that has since
      // been stripped. Either way it is not a slide.
      continue;
    }
    // Short parallel items fit two columns comfortably, so capping every slide
    // at five split a six-step list into a full slide plus a lone orphan.
    const allShort = items.every((item) => item.split(/\s+/).filter(Boolean).length <= 16);
    const maxPerSlide = allShort ? 8 : 5;
    const wordBudget = allShort ? 90 : 42;

    let part = 0;
    while (items.length) {
      const selected = [];
      let words = 0;
      while (items.length && selected.length < maxPerSlide) {
        const candidate = items[0];
        const count = candidate.split(/\s+/).filter(Boolean).length;
        if (selected.length && words + count > wordBudget) break;
        selected.push(items.shift());
        words += count;
      }
      if (!selected.length && items.length) selected.push(items.shift());
      const base = section.title || fallbackTitle;
      slides.push({
        title: part ? `${base} (${part + 1})` : base,
        items: selected,
        kind: "content",
        layout: pickLayout(selected),
      });
      part += 1;
    }
  }
  return slides;
}

function addAccentRail(pptx, slide, wide = false) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: wide ? 0.28 : 0.18,
    h: 7.5,
    fill: { color: COLORS.accent },
    line: { color: COLORS.accent },
  });
}

/** Splits "82% peserta lulus" into the figure and the words after it. */
function splitStat(text) {
  const raw = String(text || "").trim();
  const match = raw.match(LEADING_STAT);
  if (!match) return { figure: "", label: raw };
  const figure = match[0].trim().replace(/[:.\s]+$/, "");
  const label = raw.slice(match[0].length).replace(/^[\s:—-]+/, "").trim();
  return { figure, label: label || raw };
}

/** Equal-width tiles — used for a handful of short, parallel points. */
function addCards(pptx, slide, items) {
  const count = items.length;
  const gap = 0.35;
  const left = 0.85;
  const total = 11.6;
  const width = (total - gap * (count - 1)) / count;

  items.forEach((item, index) => {
    const x = left + index * (width + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y: 1.9,
      w: width,
      h: 3.1,
      rectRadius: 0.12,
      fill: { color: COLORS.white },
      line: { color: COLORS.rule, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: x + 0.35,
      y: 2.3,
      w: 0.5,
      h: 0.06,
      fill: { color: COLORS.accent },
      line: { color: COLORS.accent },
    });
    slide.addText(String(index + 1).padStart(2, "0"), {
      x: x + 0.35,
      y: 2.5,
      w: width - 0.7,
      h: 0.4,
      fontFace: FONT_BODY,
      fontSize: 13,
      bold: true,
      color: COLORS.accent,
      margin: 0,
    });
    slide.addText(String(item), {
      x: x + 0.35,
      y: 2.95,
      w: width - 0.7,
      h: 1.8,
      fontFace: FONT_BODY,
      fontSize: 15,
      color: COLORS.ink,
      margin: 0,
      valign: "top",
    });
  });
}

/** Large figures with a caption underneath. */
function addStats(pptx, slide, items) {
  const count = items.length;
  const gap = 0.4;
  const left = 0.85;
  const total = 11.6;
  const width = (total - gap * (count - 1)) / count;

  items.forEach((item, index) => {
    const { figure, label } = splitStat(item);
    const x = left + index * (width + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y: 2.0,
      w: width,
      h: 2.9,
      rectRadius: 0.12,
      fill: { color: COLORS.accentSoft },
      line: { color: COLORS.accentSoft },
    });
    slide.addText(figure || "—", {
      x: x + 0.25,
      y: 2.35,
      w: width - 0.5,
      h: 1.0,
      fontFace: FONT_HEAD,
      fontSize: 40,
      bold: true,
      color: COLORS.accent,
      align: "center",
      margin: 0,
    });
    slide.addText(label, {
      x: x + 0.25,
      y: 3.45,
      w: width - 0.5,
      h: 1.2,
      fontFace: FONT_BODY,
      fontSize: 14,
      color: COLORS.ink,
      align: "center",
      margin: 0,
      valign: "top",
    });
  });
}

/** Two balanced bullet columns so a wide slide is not half empty. */
function addColumns(pptx, slide, items) {
  const half = Math.ceil(items.length / 2);
  const columns = [items.slice(0, half), items.slice(half)];
  columns.forEach((column, index) => {
    if (!column.length) return;
    slide.addText(
      column.map((text, i) => ({
        text: String(text),
        options: { bullet: true, breakLine: i < column.length - 1, paraSpaceAfter: 10 },
      })),
      {
        x: index === 0 ? 0.85 : 6.95,
        y: 1.6,
        w: 5.5,
        h: 4.9,
        fontFace: FONT_BODY,
        fontSize: 16,
        color: COLORS.ink,
        margin: 0.05,
        valign: "top",
      }
    );
  });
}

/** A real table, rather than rows flattened into bullet text. */
function addDataTable(pptx, slide, headers, rows) {
  const head = headers.map((cell) => ({
    text: String(cell || ""),
    options: { bold: true, color: COLORS.white, fill: { color: COLORS.accent } },
  }));
  const body = rows.map((row, rowIndex) =>
    row.map((cell) => ({
      text: String(cell || "—"),
      options: { fill: { color: rowIndex % 2 ? COLORS.pale : COLORS.white } },
    }))
  );
  slide.addTable([head, ...body], {
    x: 0.85,
    y: 1.6,
    w: 11.6,
    fontFace: FONT_BODY,
    fontSize: 13,
    color: COLORS.ink,
    border: { type: "solid", color: COLORS.rule, pt: 1 },
    align: "left",
    valign: "middle",
    margin: 6,
    autoPage: false,
  });
}

function addFooter(pptx, slide, pageLabel) {
  slide.addText(pageLabel, {
    x: 0.7,
    y: 7.05,
    w: 11.8,
    h: 0.28,
    align: "right",
    fontFace: FONT_BODY,
    fontSize: 10,
    color: COLORS.muted,
    margin: 0,
  });
}

export async function buildPptxBuffer({
  title = "AI Work Studio Presentation",
  content = "",
  language = "id",
} = {}) {
  const PptxGenJS = loadPptxGen();
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE_16x9", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE_16x9";
  pptx.author = BRAND;
  pptx.company = BRAND;
  pptx.subject = title;
  pptx.title = title;
  pptx.theme = {
    headFontFace: FONT_HEAD,
    bodyFontFace: FONT_BODY,
    lang: language === "en" ? "en-US" : "id-ID",
  };

  const safeTitle = clipText(title, 90) || BRAND;
  const subtitle =
    language === "en" ? "Professional working presentation" : "Presentasi kerja profesional";

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.paper };
  addAccentRail(pptx, titleSlide, true);
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 6.85,
    w: 13.333,
    h: 0.65,
    fill: { color: COLORS.paperDeep },
    line: { color: COLORS.paperDeep },
  });
  titleSlide.addText(BRAND, {
    x: 0.95,
    y: 1.55,
    w: 11,
    h: 0.35,
    fontFace: FONT_BODY,
    fontSize: 13,
    color: COLORS.accent,
    bold: true,
    margin: 0,
  });
  titleSlide.addText(safeTitle, {
    x: 0.95,
    y: 2.1,
    w: 11.2,
    h: 1.5,
    fontFace: FONT_HEAD,
    fontSize: 36,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    valign: "middle",
  });
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0.95,
    y: 3.75,
    w: 1.5,
    h: 0.06,
    fill: { color: COLORS.accent },
    line: { color: COLORS.accent },
  });
  titleSlide.addText(subtitle, {
    x: 0.95,
    y: 4.05,
    w: 10,
    h: 0.4,
    fontFace: FONT_BODY,
    fontSize: 15,
    color: COLORS.muted,
    margin: 0,
  });
  titleSlide.addText(language === "en" ? "Created with AI Work Studio" : "Dibuat dengan AI Work Studio", {
    x: 0.95,
    y: 7.02,
    w: 11,
    h: 0.28,
    fontFace: FONT_BODY,
    fontSize: 11,
    color: COLORS.muted,
    margin: 0,
  });

  const ready = sanitizeReadyDocument(content, "presentation");
  const sections = splitForSlides(parseStructuredContent(ready, title), language).slice(0, 28);
  if (!sections.length) {
    sections.push({
      title: language === "en" ? "Overview" : "Ringkasan",
      items: [language === "en" ? "No slide content was available." : "Konten slide belum tersedia."],
      kind: "content",
    });
  }

  let page = 2;
  sections.forEach((section) => {
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.paper };
    addAccentRail(pptx, slide);

    if (section.kind === "section") {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.18,
        y: 0,
        w: 13.153,
        h: 7.5,
        fill: { color: COLORS.accentSoft },
        line: { color: COLORS.accentSoft },
      });
      slide.addText(language === "en" ? "Section" : "Bagian", {
        x: 1.1,
        y: 2.55,
        w: 10.5,
        h: 0.35,
        fontFace: FONT_BODY,
        fontSize: 13,
        color: COLORS.accent,
        bold: true,
        margin: 0,
      });
      slide.addText(section.title || (language === "en" ? "Overview" : "Ringkasan"), {
        x: 1.1,
        y: 3.0,
        w: 10.8,
        h: 1.2,
        fontFace: FONT_HEAD,
        fontSize: 32,
        bold: true,
        color: COLORS.ink,
        margin: 0,
      });
      addFooter(pptx, slide, `${BRAND}  ·  ${page}`);
      page += 1;
      return;
    }

    slide.addText(section.title || (language === "en" ? "Overview" : "Ringkasan"), {
      x: 0.75,
      y: 0.38,
      w: 11.8,
      h: 0.7,
      fontFace: FONT_HEAD,
      fontSize: 26,
      bold: true,
      color: COLORS.ink,
      margin: 0,
      valign: "middle",
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.75,
      y: 1.15,
      w: 1.4,
      h: 0.055,
      fill: { color: COLORS.accent },
      line: { color: COLORS.accent },
    });

    if (section.kind === "table") {
      addDataTable(pptx, slide, section.headers || [], section.rows || []);
      addFooter(pptx, slide, `${BRAND}  ·  ${page}`);
      page += 1;
      return;
    }

    const items = (section.items || []).map((text) => String(text).trim()).filter(Boolean);
    const layout = section.layout || "bullets";

    if (layout === "stats" && items.length) {
      addStats(pptx, slide, items);
    } else if (layout === "cards" && items.length) {
      addCards(pptx, slide, items);
    } else if (layout === "columns" && items.length) {
      addColumns(pptx, slide, items);
    } else {
      const bullets = (items.length ? items : ["—"]).map((text, index, list) => ({
        text: text || "—",
        options: {
          bullet: true,
          breakLine: index < list.length - 1,
          paraSpaceAfter: 12,
        },
      }));
      slide.addText(bullets, {
        x: 0.85,
        y: 1.5,
        w: 11.6,
        h: 5.1,
        fontFace: FONT_BODY,
        fontSize: 18,
        color: COLORS.ink,
        margin: 0.05,
        valign: "top",
        paraSpaceAfter: 10,
      });
    }

    addFooter(pptx, slide, `${BRAND}  ·  ${page}`);
    page += 1;
  });

  const closing = pptx.addSlide();
  closing.background = { color: COLORS.paper };
  addAccentRail(pptx, closing, true);
  closing.addText(language === "en" ? "Thank you" : "Terima kasih", {
    x: 0.95,
    y: 2.7,
    w: 11.2,
    h: 0.8,
    fontFace: FONT_HEAD,
    fontSize: 36,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });
  closing.addText(BRAND, {
    x: 0.95,
    y: 3.6,
    w: 11.2,
    h: 0.4,
    fontFace: FONT_BODY,
    fontSize: 16,
    color: COLORS.accent,
    margin: 0,
  });
  addFooter(pptx, closing, `${BRAND}  ·  ${page}`);

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}
