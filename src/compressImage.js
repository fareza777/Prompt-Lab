/**
 * Browser-side image shrink before upload so vision fits serverless limits.
 */

export async function compressImageFileForUpload(file, { maxEdge = 1280, quality = 0.72 } = {}) {
  if (!file || !String(file.type || "").startsWith("image/")) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
    });
    if (!blob || blob.size >= file.size) return file;

    const name = String(file.name || "photo.jpg").replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressAttachmentImages(attachments = []) {
  const list = Array.isArray(attachments) ? attachments : [];
  return Promise.all(
    list.map(async (item) => {
      if (!item?.file || !String(item.type || "").startsWith("image/")) return item;
      const compressed = await compressImageFileForUpload(item.file);
      if (compressed === item.file) return item;
      return {
        ...item,
        file: compressed,
        type: compressed.type || "image/jpeg",
        sizeLabel: undefined,
      };
    })
  );
}
