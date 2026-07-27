/**
 * Strip AI scaffolding so finished documents are ready to send/share.
 * Removes section-purpose blurbs, quality checklists, and trailing assumption
 * footnotes that models often append when trained on outline contracts.
 */

const PURPOSE_LINE =
  /^\s*(?:\*{1,3}|_{1,2})?\s*(?:Tujuan|Section\s*goal|Goal|Purpose)\s*[:：][^*\n_]*?(?:\*{1,3}|_{1,2})?\s*$/gim;

const PURPOSE_ITALIC_BLOCK =
  /^\s*\*(?:Tujuan|Section\s*goal|Goal|Purpose)\s*[:：][^*\n]+\*\s*$/gim;

const META_SECTION_HEADING =
  /^(#{1,6})\s*(?:Daftar Periksa Kualitas(?:\s*\([^)]*\))?|Quality Checklist|Implementation Checklist|Review Checklist|Acceptance Criteria|Kriteria Penerimaan)\s*$/i;

const TRAILING_ASUMSI =
  /\n+(?:#{1,6}\s*)?(?:\*{0,2})?Asumsi(?:\s*\([^)]*\))?\s*[:：][\s\S]*$/i;

/** Leading outline that only repeats upcoming numbered section titles. */
function stripLeadingOutline(text) {
  const lines = String(text).split(/\r?\n/);
  let index = 0;
  while (index < lines.length && !lines[index].trim()) index += 1;

  const outline = [];
  let cursor = index;
  while (cursor < lines.length) {
    const line = lines[cursor].trim();
    if (!line) {
      if (outline.length) break;
      cursor += 1;
      continue;
    }
    // Outline items like "2. Latar Belakang..." without being under a heading yet.
    if (/^\d+[.)]\s+\S/.test(line) && !/^#{1,6}\s/.test(line)) {
      outline.push(cursor);
      cursor += 1;
      continue;
    }
    break;
  }

  if (outline.length < 3) return text;

  // Only strip when the next real content is a markdown heading (typical TOC dump).
  let next = cursor;
  while (next < lines.length && !lines[next].trim()) next += 1;
  if (next >= lines.length || !/^#{1,6}\s+\d+[.)]?\s*/.test(lines[next].trim())) {
    return text;
  }

  const drop = new Set(outline);
  return lines.filter((_, i) => !drop.has(i)).join("\n");
}

function stripMetaSections(text) {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  let skipping = false;
  let skipLevel = 99;

  for (const line of lines) {
    const heading = line.trim().match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      if (META_SECTION_HEADING.test(`${heading[1]} ${title}`)) {
        skipping = true;
        skipLevel = level;
        continue;
      }
      if (skipping && level <= skipLevel) {
        skipping = false;
      }
    }
    if (skipping) continue;
    out.push(line);
  }
  return out.join("\n");
}

/**
 * @param {string} content
 * @param {string} [profile]
 * @returns {string}
 */
export function sanitizeReadyDocument(content = "", profile = "general") {
  if (profile === "diagram") return String(content || "");

  let text = String(content || "").replace(/\r\n?/g, "\n").trim();
  if (!text) return "";

  text = stripLeadingOutline(text);
  text = text.replace(PURPOSE_ITALIC_BLOCK, "");
  text = text.replace(PURPOSE_LINE, "");
  // Catch remaining "*Tujuan: ...*" variants with long sentences.
  text = text.replace(/^\s*\*+[^*\n]*(?:Tujuan|Section\s*goal)\s*[:：][^*\n]*\*+\s*$/gim, "");
  text = stripMetaSections(text);
  text = text.replace(TRAILING_ASUMSI, "");

  // Drop orphan horizontal rules left after removals.
  text = text.replace(/\n(?:---|\*\*\*|___)\s*\n(?=\n|#{1,6}\s|$)/g, "\n\n");
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}
