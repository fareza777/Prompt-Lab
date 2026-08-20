/**
 * Strip AI scaffolding so finished documents are ready to send/share.
 * Removes section-purpose blurbs, quality checklists, and trailing assumption
 * footnotes that models often append when trained on outline contracts.
 */

/**
 * Words that name a piece of the document rather than the subject matter.
 *
 * The distinction matters: "Tujuan section:" is scaffolding, but "Tujuan
 * Program:" and "Tujuan Evaluasi:" are real content a report is expected to
 * contain, so the qualifier is restricted to structural words only.
 */
const STRUCTURE_WORD = "(?:section|bagian|sub-?bagian|bab|slide|chapter|subbab)";

/** "Tujuan section:", "Purpose of section:", "Tujuan dari bagian:". */
const PURPOSE_QUALIFIER = `(?:\\s+(?:of|for|dari|untuk|pada)?\\s*${STRUCTURE_WORD})?`;
const EMPHASIS = "(?:\\*{1,3}|_{1,2})?";

const PURPOSE_LINE = new RegExp(
  // Emphasis may close immediately after the colon — "**Tujuan section:** ..." —
  // so it is allowed on both sides rather than only at the end of the line.
  `^\\s*${EMPHASIS}\\s*(?:Tujuan|Section\\s*goal|Goal|Purpose)${PURPOSE_QUALIFIER}\\s*[:：]${EMPHASIS}[^\\n]*?${EMPHASIS}\\s*$`,
  "gim"
);

const PURPOSE_ITALIC_BLOCK = new RegExp(
  `^\\s*\\*(?:Tujuan|Section\\s*goal|Goal|Purpose)${PURPOSE_QUALIFIER}\\s*[:：][^*\\n]+\\*\\s*$`,
  "gim"
);

/**
 * Headings that are scaffolding rather than content.
 *
 * The outline entries were added after a production run shipped a section
 * literally titled "OUTLINE LAPORAN" listing the sections that followed it.
 * stripLeadingOutline could not catch it: that only handles plain numbered
 * lines at the very top of the document, and this arrived as a heading with a
 * heading-form list under it.
 */
const META_SECTION_HEADING =
  /^(#{1,6})\s*(?:Daftar Periksa Kualitas(?:\s*\([^)]*\))?|Quality Checklist|Implementation Checklist|Review Checklist|Acceptance Criteria|Kriteria Penerimaan|Outline(?:\s+(?:Laporan|Dokumen|Report|Document))?|Kerangka(?:\s+(?:Laporan|Dokumen))?|Daftar Isi|Table of Contents)\s*$/i;

const TRAILING_ASUMSI =
  /\n+(?:#{1,6}\s*)?(?:\*{0,2})?Asumsi(?:\s*\([^)]*\))?\s*[:：][\s\S]*$/i;

const ENCODING_ARTIFACTS = [
  [/\u00e2\u20ac\u201d/g, "-"],
  [/\u00e2\u20ac\u201c/g, "-"],
  [/\u00e2\u20ac\u00a2/g, "-"],
  [/\u00c2\u00b1/g, "+/-"],
  [/\u00c2\u00b7/g, "-"],
  [/\u00e2\u20ac\u00a6/g, "..."],
  [/\ufffd/g, ""],
];

function normalizeEncodingArtifacts(text) {
  return ENCODING_ARTIFACTS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    text
  );
}

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
/**
 * Removes headings with nothing underneath them.
 *
 * Models routinely emit a section per outline item and then leave several
 * unfilled, and stripping a scaffolding line can empty one that did have a
 * body. In a document those become bare headings; in a deck they became
 * slides showing a single dash. The contract asks for relevant sections only.
 *
 * A heading followed by a deeper heading is a parent and is kept.
 */
function stripEmptyHeadings(text) {
  const lines = String(text).split("\n");
  const headingAt = (index) => {
    const match = /^(#{1,6})\s+\S/.exec(lines[index] || "");
    return match ? match[1].length : 0;
  };

  const drop = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    const level = headingAt(i);
    if (!level) continue;

    let next = i + 1;
    while (next < lines.length && !lines[next].trim()) next += 1;

    // End of document, or the next thing is a sibling/ancestor heading.
    const nextLevel = next < lines.length ? headingAt(next) : 0;
    if (next >= lines.length || (nextLevel && nextLevel <= level)) drop.add(i);
  }

  if (!drop.size) return text;
  return lines.filter((_, index) => !drop.has(index)).join("\n");
}

/**
 * Profiles whose output is not a document and must survive untouched.
 *
 * "prompt" is the Image Prompt template: its whole deliverable is text a user
 * pastes into an image model, so the scaffolding strippers below — which exist
 * to clean up reports — would only damage it.
 */
const VERBATIM_PROFILES = new Set(["diagram", "prompt"]);

export function sanitizeReadyDocument(content = "", profile = "general") {
  if (VERBATIM_PROFILES.has(profile)) return String(content || "");

  let text = String(content || "")
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .trim();
  if (!text) return "";

  text = normalizeEncodingArtifacts(text);
  text = stripLeadingOutline(text);
  text = text.replace(PURPOSE_ITALIC_BLOCK, "");
  text = text.replace(PURPOSE_LINE, "");
  // Catch remaining "*Tujuan: ...*" variants with long sentences.
  text = text.replace(/^\s*\*+[^*\n]*(?:Tujuan|Section\s*goal)\s*[:：][^*\n]*\*+\s*$/gim, "");
  text = stripMetaSections(text);
  text = text.replace(TRAILING_ASUMSI, "");
  // Runs after the removals above, so a section emptied by them goes too.
  text = stripEmptyHeadings(text);

  // Drop orphan horizontal rules left after removals.
  text = text.replace(/\n(?:---|\*\*\*|___)\s*\n(?=\n|#{1,6}\s|$)/g, "\n\n");
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}
