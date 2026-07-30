const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_QUALITY = 76;

function decodeDataUrl(value) {
  const raw = String(value || "");
  const comma = raw.indexOf(",");
  const encoded = comma >= 0 ? raw.slice(comma + 1) : raw;
  if (!encoded) return null;
  const buffer = Buffer.from(encoded, "base64");
  return buffer.length ? buffer : null;
}

/**
 * Prepare a phone photograph once for every document renderer.
 *
 * A bounded JPEG keeps field evidence legible while avoiding the multi-megabyte
 * PNG payloads produced when camera photographs are stored losslessly.
 */
export async function prepareExportImage(
  image,
  { maxEdge = DEFAULT_MAX_EDGE, quality = DEFAULT_QUALITY } = {}
) {
  const input = decodeDataUrl(image?.dataUrl);
  if (!input) return null;

  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(input)
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({
        quality,
        mozjpeg: true,
        chromaSubsampling: "4:2:0",
      })
      .toBuffer({ resolveWithObject: true });

    if (!data.length || !info.width || !info.height) return null;
    return {
      buffer: data,
      type: "jpg",
      width: info.width,
      height: info.height,
    };
  } catch {
    return null;
  }
}

export const EXPORT_IMAGE_POLICY = Object.freeze({
  maxEdge: DEFAULT_MAX_EDGE,
  quality: DEFAULT_QUALITY,
});
