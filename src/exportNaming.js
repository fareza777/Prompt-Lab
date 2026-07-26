/**
 * Derive download/document titles from finished output, request, or attachment names.
 */

function cleanTitle(value = "") {
  return String(value)
    .replace(/[*_`#]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function looksGenericLabel(title = "") {
  const value = String(title).trim();
  return /^(ai work studio|promptlab|export|untitled|hasil kerja|finished work|diagram)\b/i.test(
    value
  );
}

function looksGenericAsk(title = "") {
  const value = String(title).trim();
  if (looksGenericLabel(value)) return true;
  return /^(buat|create|make|turn|ubah|generate)\b[\s\S]{0,80}\b(diagram|flowchart|mermaid|bagan)\b/i.test(
    value
  );
}

/**
 * @param {{ content?: string, narrative?: string, attachmentNames?: string[] }} input
 * @returns {string}
 */
export function deriveExportTitle({ content = "", narrative = "", attachmentNames = [] } = {}) {
  const text = String(content || "");

  const heading = text.match(/^#{1,3}\s+(.+)$/m)?.[1];
  if (heading) {
    const cleaned = cleanTitle(heading);
    if (cleaned && !looksGenericLabel(cleaned)) return cleaned;
  }

  const fileStem = cleanTitle(String(attachmentNames[0] || "").replace(/\.[^.]+$/, ""));
  if (fileStem && !looksGenericLabel(fileStem)) return fileStem;

  const ask = cleanTitle(narrative);
  if (ask.length >= 8 && !looksGenericAsk(ask)) {
    return ask.split(/\s+/).slice(0, 12).join(" ");
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      /^```/.test(trimmed) ||
      /^(flowchart|sequenceDiagram|classDiagram|erDiagram|mindmap|graph)\b/i.test(trimmed)
    ) {
      continue;
    }
    if (/^[-*+]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) continue;
    const cleaned = cleanTitle(trimmed.replace(/^>\s?/, ""));
    if (cleaned.length >= 8 && !looksGenericLabel(cleaned) && !looksGenericAsk(cleaned)) {
      return cleaned.slice(0, 80);
    }
  }

  return "AI-Work-Studio-Export";
}

/**
 * @param {string} title
 * @param {string} extension without dot
 */
export function toDownloadFilename(title, extension) {
  const stem = cleanTitle(title)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const ext = String(extension || "")
    .replace(/^\./, "")
    .toLowerCase();
  return `${stem || "AI-Work-Studio-Export"}.${ext || "bin"}`;
}

export async function triggerBrowserDownload(blob, filename) {
  const type = blob.type || "application/octet-stream";
  let file = null;
  try {
    if (typeof File !== "undefined") {
      file = new File([blob], filename, { type });
    }
  } catch {
    file = null;
  }

  // Android TWA / many mobile browsers ignore <a download> for blobs.
  // Web Share with a File is the reliable "save/share" path there.
  const preferShare =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || "") &&
    typeof navigator.canShare === "function" &&
    file;

  if (preferShare) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return { method: "share" };
      }
    } catch (error) {
      // User cancelled share — treat as handled, not a hard failure.
      if (error?.name === "AbortError") return { method: "share-abort" };
      // Fall through to anchor / open if share rejected for other reasons.
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    // Don't force _blank on Android — it often opens a blank tab and looks like failure.
    if (!/Android/i.test(navigator.userAgent || "")) {
      link.target = "_blank";
    }
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { method: "anchor" };
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
