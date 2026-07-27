/**
 * ASCII-only filenames for HTTP Content-Disposition and mobile share sheets.
 * Node rejects non-Latin1 header values with:
 *   Invalid character in header content ["Content-Disposition"]
 */

export function safeFilename(title) {
  const cleaned = String(title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return cleaned || "AI-Work-Studio-Export";
}

export function attachmentDisposition(title, extension) {
  const ext = String(extension || "bin").replace(/^\./, "").toLowerCase();
  const name = `${safeFilename(title)}.${ext}`;
  return `attachment; filename="${name}"`;
}
