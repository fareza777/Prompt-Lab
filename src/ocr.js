/**
 * In-browser OCR via Tesseract.js — the fallback for image attachments when
 * neither the native ML Kit scanner nor the Python sidecar is reachable.
 * The wasm core + traineddata download lazily (~15 MB first run, cached in
 * IndexedDB by idb-keyval afterwards).
 */

const LANGS = "eng+ind"; // English + Indonesian traineddata

/**
 * @param {File} imageFile image attachment (jpeg/png/webp)
 * @returns {Promise<File>} `<name>-ocr.md` with the recognized text
 */
export async function ocrImageToMarkdownFile(imageFile) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(LANGS, 1, { cacheMethod: "write" });
  try {
    const { data } = await worker.recognize(imageFile);
    const text = (data?.text || "").trim();
    const base = (imageFile.name || "image").replace(/\.[^.]+$/, "");
    const markdown = `# OCR — ${imageFile.name}\n\n${text || "_Tidak ada teks terbaca / no text recognized._"}\n`;
    return new File([markdown], `${base}-ocr.md`, { type: "text/markdown" });
  } finally {
    await worker.terminate();
  }
}
