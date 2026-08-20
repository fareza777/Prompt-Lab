/** Keep only the portable image fields returned to the browser for export. */
export function serializeExportImages(images = [], limit = 8) {
  return (Array.isArray(images) ? images : [])
    .filter((image) => image?.dataUrl && String(image.dataUrl).startsWith("data:image/"))
    .slice(0, limit)
    .map((image) => ({
      dataUrl: image.dataUrl,
      slot: String(image.slot || ""),
      name: String(image.filename || image.name || "foto.jpg"),
    }));
}
