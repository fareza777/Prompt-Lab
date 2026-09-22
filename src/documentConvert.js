/**
 * Client for the server's optional document sidecar (Docling/MarkItDown
 * parse, PaddleOCR). A 503 from the API means the sidecar isn't deployed —
 * callers should fall back to in-browser tools, not retry.
 */

const DOCUMENT_RE = /\.(pdf|docx|pptx|xlsx|xls|html?|odt|rtf)$/i;

export function isConvertibleDocument(attachment) {
  const name = attachment?.name || "";
  return DOCUMENT_RE.test(name) || attachment?.type === "application/pdf";
}

export class SidecarUnavailable extends Error {}

async function postFile(apiBase, path, file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${apiBase}${path}`, { method: "POST", body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 503) throw new SidecarUnavailable(body?.error || "document service unavailable");
    throw new Error(body?.error || `document service error ${response.status}`);
  }
  return body;
}

/**
 * @returns {Promise<File>} `<name>-dokumen.md` attachment with the parsed markdown
 */
export async function convertDocumentToMarkdown(apiBase, attachment) {
  const { markdown } = await postFile(apiBase, "/api/documents/parse", attachment.file);
  const base = (attachment.name || "dokumen").replace(/\.[^.]+$/, "");
  return new File([markdown], `${base}-dokumen.md`, { type: "text/markdown" });
}

/**
 * @returns {Promise<File>} `<name>-ocr.md` — sidecar (PaddleOCR) output
 */
export async function ocrImageViaSidecar(apiBase, attachment) {
  const { text } = await postFile(apiBase, "/api/ocr", attachment.file);
  const base = (attachment.name || "image").replace(/\.[^.]+$/, "");
  const markdown = `# OCR — ${attachment.name}\n\n${(text || "").trim() || "_No text recognized._"}\n`;
  return new File([markdown], `${base}-ocr.md`, { type: "text/markdown" });
}
