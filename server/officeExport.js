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

const BRAND = "AI Work Studio";
const COLORS = {
  ink: "242A27",
  muted: "66706A",
  accent: "315C48",
  pale: "EEF2EC",
  rule: "D8DED9",
  paper: "FAF8F3",
  white: "FFFFFF",
};

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

function blocksToDocx(blocks) {
  const children = [];
  for (const block of blocks) {
    if (block.type === "heading") children.push(docxHeading(block));
    if (block.type === "paragraph") {
      children.push(
        new Paragraph({
          spacing: { after: 150, line: 300 },
          children: [new TextRun({ text: block.text, color: COLORS.ink, size: 22 })],
        }),
      );
    }
    if (block.type === "list") {
      block.items.forEach((item, index) =>
        children.push(
          new Paragraph({
            bullet: block.ordered ? undefined : { level: 0 },
            numbering: block.ordered ? { reference: "ordered-list", level: 0 } : undefined,
            spacing: { after: 70 },
            children: [new TextRun({ text: item, size: 22, color: COLORS.ink })],
          }),
        ),
      );
    }
    if (block.type === "table") {
      children.push(docxTable(block));
      children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    }
    if (block.type === "divider") {
      children.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.rule } },
          spacing: { after: 160 },
        }),
      );
    }
  }
  return children;
}

export async function buildDocxBuffer({
  title = "AI Work Studio Export",
  content = "",
  language = "id",
  plan = "Free",
} = {}) {
  const blocks = parseStructuredContent(content, title);
  const footerText = plan === "Free" ? `Created with ${BRAND}  ·  ` : "";
  const doc = new Document({
    creator: BRAND,
    title,
    description: `Professional document created with ${BRAND}`,
    numbering: {
      config: [
        {
          reference: "ordered-list",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }],
        },
      ],
    },
    styles: {
      default: { document: { run: { font: "Aptos", size: 22, color: COLORS.ink } } },
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
          ...blocksToDocx(blocks),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

function splitForSlides(blocks) {
  const sections = [];
  let current = { title: "", items: [] };
  const push = () => {
    if (current.title || current.items.length) sections.push(current);
    current = { title: "", items: [] };
  };
  for (const block of blocks) {
    if (block.type === "heading") {
      push();
      current.title = block.text;
    } else if (block.type === "list") current.items.push(...block.items);
    else if (block.type === "paragraph") current.items.push(block.text);
    else if (block.type === "table") {
      current.items.push(...block.rows.slice(1).map((row) => row.join(" — ")));
    }
  }
  push();
  return sections.flatMap((section) => {
    const chunks = [];
    let items = [...section.items];
    do {
      const selected = [];
      let words = 0;
      while (items.length && selected.length < 6) {
        const candidate = items[0];
        const count = candidate.split(/\s+/).filter(Boolean).length;
        if (selected.length && words + count > 45) break;
        selected.push(items.shift());
        words += count;
      }
      if (!selected.length && items.length) selected.push(items.shift());
      chunks.push({
        title: chunks.length ? `${section.title || "Overview"} — continued` : section.title || "Overview",
        items: selected,
      });
    } while (items.length);
    return chunks;
  });
}

export async function buildPptxBuffer({
  title = "AI Work Studio Presentation",
  content = "",
  language = "id",
} = {}) {
  const { default: pptxgen } = await import("pptxgenjs");
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = BRAND;
  pptx.company = BRAND;
  pptx.subject = title;
  pptx.title = title;
  pptx.lang = language === "en" ? "en-US" : "id-ID";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
    lang: pptx.lang,
  };

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.paper };
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.24,
    h: 7.5,
    line: { color: COLORS.accent, transparency: 100 },
    fill: { color: COLORS.accent },
  });
  titleSlide.addText(title, {
    x: 0.9,
    y: 2.15,
    w: 11.2,
    h: 1.25,
    fontFace: "Aptos Display",
    fontSize: 34,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    breakLine: false,
    fit: "shrink",
  });
  titleSlide.addText(BRAND, {
    x: 0.92,
    y: 3.62,
    w: 5,
    h: 0.35,
    fontFace: "Aptos",
    fontSize: 13,
    color: COLORS.accent,
    margin: 0,
  });

  const sections = splitForSlides(parseStructuredContent(content, title)).slice(0, 30);
  sections.forEach((section, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.paper };
    slide.addText(section.title, {
      x: 0.7,
      y: 0.48,
      w: 11.5,
      h: 0.58,
      fontFace: "Aptos Display",
      fontSize: 25,
      bold: true,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.7,
      y: 1.18,
      w: 1.15,
      h: 0,
      line: { color: COLORS.accent, width: 3 },
    });
    const runs = section.items.map((text) => ({
      text,
      options: { bullet: { indent: 18 }, breakLine: true, hanging: 4 },
    }));
    slide.addText(runs, {
      x: 0.92,
      y: 1.55,
      w: 11.25,
      h: 4.85,
      fontFace: "Aptos",
      fontSize: 21,
      color: COLORS.ink,
      margin: 0.05,
      breakLine: false,
      valign: "top",
    });
    slide.addText(`${BRAND}   ·   ${index + 2}`, {
      x: 9.3,
      y: 7.0,
      w: 3.25,
      h: 0.22,
      align: "right",
      fontFace: "Aptos",
      fontSize: 9,
      color: COLORS.muted,
      margin: 0,
    });
  });
  return pptx.write({ outputType: "nodebuffer" });
}
