/**
 * Multimodal image helpers for generate + run.
 * Compress photos before vision calls so serverless body limits stay workable.
 */

export async function compressImageForVision(buffer, mime = "image/jpeg") {
  const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (!input.length) return { buffer: input, mime };

  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(input)
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    return { buffer: out, mime: "image/jpeg" };
  } catch {
    return { buffer: input, mime: mime || "image/jpeg" };
  }
}

export function toDataUrl(buffer, mime = "image/jpeg") {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** OpenAI-compatible multimodal user content: text + image_url parts. */
export function buildVisionUserContent(text, imageAttachments = []) {
  const body = String(text || "");
  const images = (imageAttachments || []).filter(
    (file) =>
      file?.dataUrl &&
      String(file.mime || file.mimetype || "").startsWith("image/")
  );

  if (!images.length) return body;

  return [
    { type: "text", text: body },
    ...images.map((file) => ({
      type: "image_url",
      image_url: { url: file.dataUrl },
    })),
  ];
}

export function imageVisionExtractPrompt(langHint = "id") {
  const id = langHint !== "en";
  return id
    ? [
        "Analisis gambar ini untuk pembuatan dokumen kerja.",
        "1) Ekstrak SEMUA teks yang terbaca (OCR): heading, label, angka, tabel, tulisan tangan.",
        "2) Jelaskan singkat apa yang terlihat: objek, orang/aktivitas, layout, bagan, suasana.",
        "Jika hampir tidak ada teks, tetap deskripsikan isi visual dengan jelas.",
        "Jawab dalam bahasa yang sama dengan teks di gambar; jika tidak ada teks, gunakan bahasa Indonesia.",
        "Jangan bilang kamu tidak bisa melihat gambar.",
      ].join(" ")
    : [
        "Analyze this image for workplace document creation.",
        "1) Extract ALL readable text (OCR): headings, labels, numbers, tables, handwriting.",
        "2) Briefly describe what is visible: objects, people/actions, layout, charts, scene.",
        "If there is almost no text, still describe the visual content clearly.",
        "Reply in the language of any text in the image; otherwise English.",
        "Do not say you cannot see the image.",
      ].join(" ");
}

export function runVisionDirective(langHint = "id") {
  const id = langHint !== "en";
  return id
    ? [
        "Jika ada foto/gambar terlampir: LIHAT isinya (vision multimodal).",
        "Gunakan teks + visual di foto sebagai sumber utama. Jangan mengarang yang tidak terlihat.",
        "Jangan bilang kamu tidak bisa melihat gambar.",
      ].join(" ")
    : [
        "If photos/images are attached: LOOK at them (multimodal vision).",
        "Use visible text and visuals as primary source. Do not invent unseen details.",
        "Do not say you cannot see images.",
      ].join(" ");
}
