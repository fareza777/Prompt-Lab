function splitTableRow(line) {
  return String(line)
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableDivider(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isBlockStart(lines, index) {
  const line = lines[index] || "";
  const next = lines[index + 1] || "";
  return (
    /^#{1,6}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^[-*+]\s+/.test(line) ||
    /^\d+[.)]\s+/.test(line) ||
    (line.includes("|") && isTableDivider(next))
  );
}

export function parseMarkdownBlocks(markdown) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      index += 1;
      continue;
    }

    if (line.includes("|") && isTableDivider(lines[index + 1] || "")) {
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const unordered = line.match(/^[-*+]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(
          isOrdered ? /^\d+[.)]\s+(.+)$/ : /^[-*+]\s+(.+)$/
        );
        if (!item) break;
        items.push(item[1].trim());
        index += 1;
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines, index)
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

/**
 * Group a flat markdown block list into top-level report sections.
 * H1/H2 start a new card; deeper headings stay inside the open section.
 */
export function groupDocumentSections(blocks = []) {
  const sections = [];
  let current = null;

  const startSection = (title, level) => {
    current = {
      id: `section-${sections.length + 1}`,
      title: String(title || "").trim(),
      level: level || 2,
      blocks: [],
    };
    sections.push(current);
  };

  for (const block of blocks) {
    if (block.type === "heading" && block.level <= 2) {
      startSection(block.text, block.level);
      continue;
    }
    if (!current) startSection("", 1);
    current.blocks.push(block);
  }

  if (!sections.length) {
    return [{ id: "section-1", title: "", level: 1, blocks: [] }];
  }
  return sections;
}
