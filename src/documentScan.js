import { isNativeAndroidApp } from "./playBilling.js";

/**
 * On-device document scanning + OCR for the Capacitor build. The Google ML Kit
 * document scanner returns page images; text recognition turns each into text
 * we can attach to the current template like any other source file.
 * The plugin modules load lazily inside the native-only path so the web bundle
 * never downloads them.
 */

export function canScanDocuments() {
  return isNativeAndroidApp();
}

const SCAN_PENDING_KEY = "pl-scan-pending";

/**
 * The scanner runs in a separate activity — Android may kill the app process
 * (and reload the WebView) before its result arrives, especially on low-RAM
 * devices. We mark a scan in-flight so the next launch can at least tell the
 * user their scan never made it back instead of failing silently.
 */
export function consumeLostScanWarning() {
  try {
    const at = Number(localStorage.getItem(SCAN_PENDING_KEY) || 0);
    localStorage.removeItem(SCAN_PENDING_KEY);
    return Boolean(at) && Date.now() - at < 15 * 60 * 1000;
  } catch {
    return false;
  }
}

async function ensureScannerModule(DocumentScanner) {
  try {
    const { available } = await DocumentScanner.isGoogleDocumentScannerModuleAvailable();
    if (!available) await DocumentScanner.installGoogleDocumentScannerModule();
  } catch {
    // If the availability check itself fails, try the scan anyway — the plugin
    // surfaces a usable error when the module is genuinely missing.
  }
}

/** Runs the scanner UI then OCRs every page. Returns a File, or null when cancelled/empty. */
export async function scanDocumentToFile() {
  if (!canScanDocuments()) return null;
  try {
    localStorage.setItem(SCAN_PENDING_KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
  try {
    return await scanDocumentToFileInner();
  } finally {
    try {
      localStorage.removeItem(SCAN_PENDING_KEY);
    } catch {
      /* storage unavailable */
    }
  }
}

async function scanDocumentToFileInner() {
  const [{ DocumentScanner }, { TextRecognition }] = await Promise.all([
    import("@capacitor-mlkit/document-scanner"),
    import("@capacitor-mlkit/text-recognition"),
  ]);
  await ensureScannerModule(DocumentScanner);
  const { scannedImages = [] } = await DocumentScanner.scanDocument({
    resultFormats: "JPEG",
    pageLimit: 4,
    galleryImportAllowed: true,
    scannerMode: "FULL",
  });
  if (!scannedImages.length) return null;

  const parts = [];
  for (const path of scannedImages.slice(0, 4)) {
    const { text } = await TextRecognition.processImage({ path }).catch(() => ({ text: "" }));
    if (text?.trim()) parts.push(text.trim());
  }
  if (!parts.length) return null;

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new File([parts.join("\n\n---\n\n")], `scan-${stamp}.md`, { type: "text/markdown" });
}
