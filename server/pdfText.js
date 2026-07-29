/**
 * Text extraction from PDF.
 *
 * The previous implementation scanned the file's raw bytes for `(text) Tj`.
 * That only finds anything in a PDF whose content streams are stored
 * uncompressed, which almost none are: Word, Google Docs, LibreOffice and
 * every scanner wrap their page content in /FlateDecode. So a normal PDF
 * yielded an empty excerpt, the model was handed nothing, and the summary it
 * wrote was generic — which is exactly what it should be when there is no
 * source to summarise.
 *
 * This inflates the streams first, then reads the text-showing operators in
 * document order so the words come out in reading order rather than grouped
 * by operator type.
 */

import { inflateSync, inflateRawSync, unzipSync } from "node:zlib";

const MAX_CHARS = 15000;

/** Inflates one stream, trying the wrappers a PDF writer might have used. */
function inflate(buffer) {
  for (const decode of [inflateSync, unzipSync, inflateRawSync]) {
    try {
      const out = decode(buffer);
      if (out?.length) return out;
    } catch {
      /* try the next wrapper */
    }
  }
  return null;
}

/**
 * Every page-content stream in the file, decompressed where needed.
 *
 * Streams are located by scanning bytes rather than by parsing the object
 * graph: a full parser is a large amount of code for a job where missing one
 * stream costs a paragraph, not correctness.
 */
function contentStreams(buffer) {
  const streams = [];
  const marker = Buffer.from("stream");
  const endMarker = Buffer.from("endstream");

  let at = 0;
  while (at < buffer.length && streams.length < 400) {
    const start = buffer.indexOf(marker, at);
    if (start < 0) break;
    const end = buffer.indexOf(endMarker, start);
    if (end < 0) break;

    // The dictionary immediately before the keyword says how it is encoded.
    const dictFrom = Math.max(0, start - 800);
    const dict = buffer.toString("latin1", dictFrom, start);

    // Skip the EOL that must follow the "stream" keyword.
    let from = start + marker.length;
    if (buffer[from] === 0x0d) from += 1;
    if (buffer[from] === 0x0a) from += 1;

    const raw = buffer.subarray(from, end);
    at = end + endMarker.length;

    if (/\/Image|\/DCTDecode|\/JPXDecode|\/CCITTFaxDecode/.test(dict)) continue;

    if (/\/FlateDecode/.test(dict)) {
      const out = inflate(raw);
      if (out) streams.push(out.toString("latin1"));
      continue;
    }
    // Uncompressed, or a filter we cannot undo — the operator scan below will
    // simply find nothing in the latter case.
    if (!/\/Filter/.test(dict)) streams.push(raw.toString("latin1"));
  }

  return streams;
}

function decodeLiteral(value) {
  return value
    .replace(/\\(\d{1,3})/g, (_match, octal) => String.fromCharCode(Number.parseInt(octal, 8)))
    .replace(/\\([nrtbf()\\])/g, (_match, char) => {
      const map = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
      return map[char] || char;
    });
}

function decodeHex(value) {
  const clean = value.replace(/[^0-9A-Fa-f]/g, "");
  const bytes = clean.match(/.{1,2}/g)?.map((hex) => Number.parseInt(hex, 16)) || [];
  if (!bytes.length) return "";
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      out += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    }
    return out;
  }
  return Buffer.from(bytes).toString("latin1");
}

/** Pulls the strings out of a `[ (a) -250 (b) ] TJ` array, spacing included. */
function decodeArray(body) {
  let out = "";
  const token = /\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]*>|-?[\d.]+/g;
  let match;
  while ((match = token.exec(body))) {
    const piece = match[0];
    if (piece.startsWith("(")) out += decodeLiteral(piece.slice(1, -1));
    else if (piece.startsWith("<")) out += decodeHex(piece.slice(1, -1));
    // A large negative kern is how PDF writers render a word space.
    else if (Number(piece) < -120) out += " ";
  }
  return out;
}

/**
 * Reads text operators in document order.
 *
 * Ordering matters: extracting all `Tj` strings and then all `TJ` arrays, as
 * the old code did for its two patterns, interleaves the document's sentences
 * into nonsense once a file uses both.
 */
function readOperators(content) {
  const pattern =
    /(\[(?:[^\[\]\\]|\\.)*\])\s*TJ|(\((?:[^()\\]|\\.)*\))\s*(?:Tj|'|")|(<[0-9A-Fa-f\s]*>)\s*(?:Tj|'|")|(T\*|Td|TD|ET)/g;

  let out = "";
  let match;
  while ((match = pattern.exec(content))) {
    if (match[1]) out += decodeArray(match[1]);
    else if (match[2]) out += decodeLiteral(match[2].slice(1, -1));
    else if (match[3]) out += decodeHex(match[3].slice(1, -1));
    else out += "\n";
  }
  return out;
}

/**
 * How much of this looks like language.
 *
 * A PDF using an embedded subset font with no ToUnicode map decodes to bytes
 * that are glyph indexes, not characters. Feeding that to the model is worse
 * than feeding nothing, because it produces a confident summary of noise.
 */
function readableRatio(text) {
  if (!text) return 0;
  const letters = text.match(/[\p{L}\p{N}]/gu)?.length || 0;
  return letters / text.length;
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<string>} extracted text, or "" when the file cannot be read
 */
export async function extractPdfText(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return "";

  const streams = contentStreams(buffer);
  let text = streams.map(readOperators).join("\n");

  // Some very old writers really do store content uncompressed inline; fall
  // back to scanning the whole file the way the original did.
  if (!text.trim()) text = readOperators(buffer.toString("latin1"));

  const cleaned = text
    .replace(/\r/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  if (cleaned.length < 20) return "";
  if (readableRatio(cleaned) < 0.5) return "";

  return cleaned.slice(0, MAX_CHARS);
}
