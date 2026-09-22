/**
 * Client side of the PDF toolkit: detect PDF attachments and merge them
 * server-side (POST /api/pdf/merge, pdf-lib) into a single download.
 */

export function isPdfAttachment(file) {
  return file?.type === "application/pdf" || /\.pdf$/i.test(file?.name || "");
}

export async function mergePdfAttachments(apiBase, attachments) {
  const pdfs = attachments.filter(isPdfAttachment);
  if (pdfs.length < 2) throw new Error("Attach at least two PDF files.");
  const form = new FormData();
  for (const item of pdfs) {
    form.append("files", item.file, item.name);
  }
  const response = await fetch(`${apiBase}/api/pdf/merge`, { method: "POST", body: form });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return response.blob();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
