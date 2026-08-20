import PDFDocument from "pdfkit";
import { normalizeExportContent, parseStructuredContent } from "./officeExport.js";
import { prepareExportImage } from "./exportImages.js";

const PAGE = { size: "A4", margin: 54 };
const COLOR = {
  ink: "#1f241f",
  muted: "#667067",
  accent: "#275c45",
  pale: "#edf4ef",
  rule: "#cbd8cf",
  white: "#ffffff",
};

function documentDate(language) {
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

function ensureSpace(doc, required) {
  const bottom = doc.page.height - PAGE.margin;
  if (doc.y + required > bottom) doc.addPage();
}

function resetFlowCursor(doc) {
  doc.x = PAGE.margin;
}

function drawHeading(doc, block) {
  resetFlowCursor(doc);
  const top = block.level === 1;
  ensureSpace(doc, top ? 58 : 42);
  doc.moveDown(top ? 0.75 : 0.45);
  doc
    .font("Helvetica-Bold")
    .fontSize(top ? 15 : block.level === 2 ? 12.5 : 11)
    .fillColor(top ? COLOR.accent : COLOR.ink)
    .text(block.text, { lineGap: 2 });
  if (top) {
    const y = doc.y + 3;
    doc.strokeColor(COLOR.accent).lineWidth(1).moveTo(PAGE.margin, y).lineTo(doc.page.width - PAGE.margin, y).stroke();
    doc.y = y + 7;
  } else {
    doc.moveDown(0.25);
  }
}

function drawParagraph(doc, text) {
  resetFlowCursor(doc);
  ensureSpace(doc, 34);
  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor(COLOR.ink)
    .text(text, { align: "justify", lineGap: 3 });
  doc.moveDown(0.55);
}

function drawList(doc, block) {
  block.items.forEach((item, index) => {
    ensureSpace(doc, 28);
    resetFlowCursor(doc);
    const marker = block.ordered ? `${index + 1}.` : "";
    const x = PAGE.margin;
    const y = doc.y;
    if (block.ordered) {
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COLOR.accent).text(marker, x, y, {
        width: 20,
        lineBreak: false,
      });
    } else {
      doc.fillColor(COLOR.accent).circle(x + 4, y + 6, 2).fill();
    }
    doc.font("Helvetica").fillColor(COLOR.ink).text(item, x + 22, y, {
      width: doc.page.width - PAGE.margin - (x + 22),
      lineGap: 2,
    });
    resetFlowCursor(doc);
    doc.moveDown(0.25);
  });
  doc.moveDown(0.25);
}

function normalizedRows(block) {
  const columns = Math.max(1, ...block.rows.map((row) => row.length));
  return {
    columns,
    rows: block.rows.map((row) =>
      Array.from({ length: columns }, (_, index) => String(row[index] || ""))
    ),
  };
}

function drawTable(doc, block) {
  resetFlowCursor(doc);
  const { columns, rows } = normalizedRows(block);
  const tableWidth = doc.page.width - PAGE.margin * 2;
  const cellWidth = tableWidth / columns;
  const padding = 6;

  rows.forEach((row, rowIndex) => {
    doc.font(rowIndex === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
    const height =
      Math.max(
        20,
        ...row.map((cell) =>
          doc.heightOfString(cell, { width: cellWidth - padding * 2, lineGap: 1 })
        )
      ) +
      padding * 2;
    ensureSpace(doc, height + (rowIndex === 0 ? 8 : 0));
    const y = doc.y;

    row.forEach((cell, columnIndex) => {
      const x = PAGE.margin + columnIndex * cellWidth;
      doc
        .fillColor(rowIndex === 0 ? COLOR.accent : rowIndex % 2 === 0 ? COLOR.pale : COLOR.white)
        .rect(x, y, cellWidth, height)
        .fill();
      doc.strokeColor(COLOR.rule).lineWidth(0.5).rect(x, y, cellWidth, height).stroke();
      doc
        .fillColor(rowIndex === 0 ? COLOR.white : COLOR.ink)
        .font(rowIndex === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8.5)
        .text(cell, x + padding, y + padding, {
          width: cellWidth - padding * 2,
          lineGap: 1,
        });
    });
    resetFlowCursor(doc);
    doc.y = y + height;
  });
  resetFlowCursor(doc);
  doc.moveDown(0.8);
}

function drawBlocks(doc, blocks) {
  for (const block of blocks) {
    resetFlowCursor(doc);
    if (block.type === "heading") drawHeading(doc, block);
    if (block.type === "paragraph") drawParagraph(doc, block.text);
    if (block.type === "list") drawList(doc, block);
    if (block.type === "table") drawTable(doc, block);
    if (block.type === "divider") {
      ensureSpace(doc, 24);
      doc
        .strokeColor(COLOR.rule)
        .lineWidth(0.75)
        .moveTo(PAGE.margin, doc.y + 4)
        .lineTo(doc.page.width - PAGE.margin, doc.y + 4)
        .stroke();
      doc.moveDown(1);
    }
    resetFlowCursor(doc);
  }
}

async function drawDocumentation(doc, images, language) {
  const prepared = (await Promise.all(images.map((image) => prepareExportImage(image))))
    .map((image, index) => ({ image, source: images[index] }))
    .filter((entry) => entry.image);
  if (!prepared.length) return;

  const single = prepared.length === 1;
  const gap = 14;
  const width = single
    ? doc.page.width - PAGE.margin * 2
    : (doc.page.width - PAGE.margin * 2 - gap) / 2;
  const boxHeight = single ? 300 : 222;
  ensureSpace(doc, boxHeight + 80);
  drawHeading(doc, {
    type: "heading",
    level: 1,
    text: language === "en" ? "Documentation" : "Dokumentasi",
  });

  for (let index = 0; index < prepared.length; index += 2) {
    ensureSpace(doc, boxHeight + 34);
    const rowY = doc.y;
    const pair = prepared.slice(index, index + 2);
    pair.forEach(({ image, source }, pairIndex) => {
      const x = PAGE.margin + pairIndex * (width + gap);
      doc
        .fillColor(COLOR.pale)
        .roundedRect(x, rowY, width, boxHeight, 4)
        .fill();
      doc.image(image.buffer, x + 6, rowY + 6, {
        fit: [width - 12, boxHeight - 12],
        align: "center",
        valign: "center",
      });
      const slot = String(source?.slot || "").toLowerCase();
      const label =
        slot === "before"
          ? language === "en"
            ? "Before"
            : "Sebelum"
          : slot === "after"
            ? language === "en"
              ? "After"
              : "Sesudah"
            : `${language === "en" ? "Photo" : "Foto"} ${index + pairIndex + 1}`;
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLOR.muted)
        .text(label, x, rowY + boxHeight + 6, { width, align: "center" });
    });
    resetFlowCursor(doc);
    doc.y = rowY + boxHeight + 30;
  }
}

function addFooters(doc, language, plan) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const pageNumber = index - range.start + 1;
    const label = `${language === "en" ? "Page" : "Halaman"} ${pageNumber}`;
    const brand = plan === "Free" ? "AI Work Studio  ·  " : "";
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLOR.muted)
      .text(`${brand}${label}`, PAGE.margin, doc.page.height - 36, {
        width: doc.page.width - PAGE.margin * 2,
        align: "center",
        lineBreak: false,
      });
    doc.page.margins.bottom = bottomMargin;
  }
}

export async function buildPdfBuffer({
  title = "AI Work Studio Export",
  content = "",
  language = "id",
  plan = "Free",
  images = [],
} = {}) {
  const ready = normalizeExportContent(content, { imageCount: images.length });
  const blocks = parseStructuredContent(ready, title);
  const doc = new PDFDocument({
    size: PAGE.size,
    margins: {
      top: PAGE.margin,
      right: PAGE.margin,
      bottom: PAGE.margin,
      left: PAGE.margin,
    },
    bufferPages: true,
    compress: true,
    info: {
      Title: title,
      Author: "AI Work Studio",
      Subject: language === "en" ? "Ready-to-use report" : "Laporan siap pakai",
    },
  });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(21)
    .fillColor(COLOR.ink)
    .text(title, { align: "left", lineGap: 3 });
  doc.moveDown(0.35);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLOR.muted)
    .text(documentDate(language));
  doc.moveDown(1);
  doc
    .strokeColor(COLOR.accent)
    .lineWidth(2)
    .moveTo(PAGE.margin, doc.y)
    .lineTo(doc.page.width - PAGE.margin, doc.y)
    .stroke();
  doc.moveDown(1);

  drawBlocks(doc, blocks);
  await drawDocumentation(doc, Array.isArray(images) ? images.slice(0, 8) : [], language);
  addFooters(doc, language, plan);
  doc.end();
  return finished;
}
