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
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
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
  return new Paragraph({
    heading: levels[Math.max(0, block.level - 1)],
    keepNext: true,
    alignment: AlignmentType.LEFT,
    spacing: { before: block.level === 1 ? 280 : 220, after: 100 },
    children: [new TextRun({ text: block.text, bold: true, color: COLORS.ink })],
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
              shading: rowIndex === 0 ? { fill: COLORS.pale } : undefined,
              borders: { top: border, bottom: border, left: border, right: border },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[cellIndex] || "",
                      bold: rowIndex === 0,
                      color: COLORS.ink,
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

export async function buildDocxBuffer({
  title = "AI Work Studio Export",
  content = "",
  language = "id",
  plan = "Free",
} = {}) {
  const blocks = normalizeListsForDocx(parseStructuredContent(content, title));
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
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 160 },
            children: [new TextRun({ text: title, bold: true, color: COLORS.accent, size: 42 })],
          }),
          new Paragraph({
            spacing: { after: 360 },
            children: [
              new TextRun({
                text: language === "en" ? "Professional working document" : "Dokumen kerja profesional",
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
        const headers = rows[0];
        rows.slice(1).forEach((row) => {
          current.items.push(
            clipText(
              row
                .map((cell, index) => `${headers[index] || `Col ${index + 1}`}: ${cell || "—"}`)
                .join(" · "),
              170,
            ),
          );
        });
      }
    }
  }
  push();

  const slides = [];
  for (const section of sections) {
    if (section.kind === "section") {
      slides.push(section);
      continue;
    }
    let items = [...section.items].filter(Boolean);
    if (!items.length && section.title) {
      slides.push({ title: section.title || fallbackTitle, items: ["—"], kind: "content" });
      continue;
    }
    let part = 0;
    while (items.length) {
      const selected = [];
      let words = 0;
      while (items.length && selected.length < 5) {
        const candidate = items[0];
        const count = candidate.split(/\s+/).filter(Boolean).length;
        if (selected.length && words + count > 42) break;
        selected.push(items.shift());
        words += count;
      }
      if (!selected.length && items.length) selected.push(items.shift());
      const base = section.title || fallbackTitle;
      slides.push({
        title: part ? `${base} (${part + 1})` : base,
        items: selected,
        kind: "content",
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

  const sections = splitForSlides(parseStructuredContent(content, title), language).slice(0, 28);
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

    const bullets = (section.items.length ? section.items : ["—"]).map((text, index, list) => ({
      text: String(text).trim() || "—",
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
