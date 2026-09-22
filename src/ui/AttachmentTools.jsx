import { useEffect, useRef, useState } from "react";
// Only icons already used by the entry bundle — importing a fresh lucide icon
// here would inflate the shared "icons" chunk for every user, even though this
// component itself is lazy.
import { Download, ImagePlus, Search } from "lucide-react";
import { detectLanguage } from "./i18n.js";
import { canScanDocuments, consumeLostScanWarning, scanDocumentToFile } from "../documentScan.js";
import { analyzeSpreadsheetAttachment, isSupportedSpreadsheet } from "../dataAnalyze.js";
import { importUrlToFile } from "../urlImport.js";
import { downloadBlob, isPdfAttachment, mergePdfAttachments } from "../pdfTools.js";
import {
  convertDocumentToMarkdown,
  isConvertibleDocument,
  ocrImageViaSidecar,
  SidecarUnavailable,
} from "../documentConvert.js";

/**
 * Extra ways to feed a template: scan a paper document (native ML Kit, or a
 * jscanify+OpenCV camera capture in the browser), OCR images (PaddleOCR
 * sidecar → Tesseract.js fallback), parse office docs to markdown (Docling /
 * MarkItDown sidecar), import a web page (Defuddle), merge PDFs (pdf-lib),
 * and profile spreadsheets (DuckDB-Wasm).
 *
 * Like DocumentEditor this file ships as a lazy chunk, so its labels live in
 * a local table instead of the shared i18n dictionary — that keeps them out
 * of the initial bundle.
 */

const LABELS = {
  fromUrl: { id: "Dari URL", en: "From URL" },
  urlPrompt: { id: "Tempel tautan halaman web", en: "Paste a web page link" },
  importing: { id: "Mengambil…", en: "Fetching…" },
  scanDoc: { id: "Pindai dokumen", en: "Scan document" },
  scanning: { id: "Memindai…", en: "Scanning…" },
  mergePdfs: { id: "Gabung {count} PDF", en: "Merge {count} PDFs" },
  merging: { id: "Menggabung…", en: "Merging…" },
  analyze: { id: "Analisis {count} data", en: "Analyze {count} sheets" },
  analyzing: { id: "Menganalisis…", en: "Analyzing…" },
  analyzeNoRoom: {
    id: "Cuma tersisa {n} slot lampiran — hapus lampiran atau upgrade dulu.",
    en: "Only {n} attachment slots left — remove an attachment or upgrade first.",
  },
  ocr: { id: "OCR {count} gambar", en: "OCR {count} images" },
  ocrBusy: { id: "Membaca teks…", en: "Reading text…" },
  convert: { id: "Dokumen → Markdown", en: "Document → Markdown" },
  converting: { id: "Mengonversi…", en: "Converting…" },
  convertUnavailable: {
    id: "Konversi dokumen belum disiapkan di server ini.",
    en: "Document conversion isn't set up on this server.",
  },
  scanFallback: {
    id: "Garis dokumen tak terdeteksi — foto asli dipakai.",
    en: "No paper outline found — the original photo was attached.",
  },
  importFailed: { id: "Gagal mengimpor.", en: "Import failed." },
  scanLost: {
    id: "Pindaian sebelumnya hilang karena aplikasi dimuat ulang.",
    en: "The last scan was lost when the app reloaded.",
  },
};

function lt(lang, key, vars = {}) {
  const raw = LABELS[key]?.[lang] || LABELS[key]?.id || key;
  return raw.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

export default function AttachmentTools({ apiBase, attachments, onFiles, disabled, atLimit, slotsLeft }) {
  const lang = detectLanguage();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const cameraInputRef = useRef(null);

  useEffect(() => {
    // Reaching this component after a process-death reload means the scan that
    // was in flight never delivered its file — surface that instead of silence.
    if (consumeLostScanWarning()) setError(lt(detectLanguage(), "scanLost"));
  }, []);

  const pdfCount = attachments.filter(isPdfAttachment).length;
  const sheets = attachments.filter(isSupportedSpreadsheet);
  const images = attachments.filter((item) => item?.type?.startsWith("image/"));
  const docs = attachments.filter(isConvertibleDocument);
  const nativeScan = canScanDocuments();

  async function run(action, job) {
    if (busy || disabled) return;
    setBusy(action);
    setError("");
    try {
      await job();
    } catch (event) {
      setError(event?.message || lt(lang, "importFailed"));
    } finally {
      setBusy("");
    }
  }

  const importUrl = () => {
    const url = window.prompt(lt(lang, "urlPrompt"));
    if (!url?.trim()) return;
    run("url", async () => {
      const file = await importUrlToFile(apiBase, url.trim());
      onFiles([file]);
    });
  };

  const scanDocument = () => {
    if (nativeScan) {
      run("scan", async () => {
        const file = await scanDocumentToFile();
        if (file) onFiles([file]);
      });
      return;
    }
    // Web path: capture a photo, then jscanify perspective-corrects it.
    cameraInputRef.current?.click();
  };

  const onCameraCapture = (event) => {
    const photo = event.target.files?.[0];
    event.target.value = "";
    if (!photo) return;
    run("scan", async () => {
      const { scanPhotoToFile } = await import("../webScan.js");
      const { file, corrected } = await scanPhotoToFile(photo);
      onFiles([file]);
      if (!corrected) setError(lt(lang, "scanFallback"));
    });
  };

  const mergePdfs = () =>
    run("merge", async () => {
      const blob = await mergePdfAttachments(apiBase, attachments);
      downloadBlob(blob, "merged.pdf");
    });

  const analyzeData = () => {
    // Each sheet yields a new *-profil.md attachment; profiling more sheets
    // than there are free slots would silently evict existing files.
    if (Number.isFinite(slotsLeft) && sheets.length > slotsLeft) {
      setError(lt(lang, "analyzeNoRoom", { n: slotsLeft }));
      return;
    }
    run("analyze", async () => {
      const files = [];
      for (const sheet of sheets) files.push(await analyzeSpreadsheetAttachment(sheet));
      if (files.length) onFiles(files);
    });
  };

  const ocrImages = () =>
    run("ocr", async () => {
      const files = [];
      for (const image of images) {
        try {
          files.push(await ocrImageViaSidecar(apiBase, image));
        } catch (error) {
          if (!(error instanceof SidecarUnavailable)) throw error;
          // No PaddleOCR sidecar — Tesseract.js does the reading in-browser.
          const { ocrImageToMarkdownFile } = await import("../ocr.js");
          files.push(await ocrImageToMarkdownFile(image.file));
        }
      }
      if (files.length) onFiles(files);
    });

  const convertDocs = () =>
    run("convert", async () => {
      const files = [];
      try {
        for (const doc of docs) files.push(await convertDocumentToMarkdown(apiBase, doc));
      } catch (error) {
        if (error instanceof SidecarUnavailable) {
          setError(lt(lang, "convertUnavailable"));
          return;
        }
        throw error;
      }
      if (files.length) onFiles(files);
    });

  const anyBusy = Boolean(busy) || disabled;

  return (
    <div className="pl-source-tools">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onCameraCapture}
      />
      <button type="button" className="pl-tool-button" disabled={anyBusy || atLimit} onClick={importUrl}>
        <Search size={14} /> {busy === "url" ? lt(lang, "importing") : lt(lang, "fromUrl")}
      </button>
      <button type="button" className="pl-tool-button" disabled={anyBusy || atLimit} onClick={scanDocument}>
        <ImagePlus size={14} /> {busy === "scan" ? lt(lang, "scanning") : lt(lang, "scanDoc")}
      </button>
      {pdfCount >= 2 ? (
        <button type="button" className="pl-tool-button" disabled={anyBusy} onClick={mergePdfs}>
          <Download size={14} /> {busy === "merge" ? lt(lang, "merging") : lt(lang, "mergePdfs", { count: pdfCount })}
        </button>
      ) : null}
      {sheets.length ? (
        <button type="button" className="pl-tool-button" disabled={anyBusy || atLimit} onClick={analyzeData}>
          <Search size={14} /> {busy === "analyze" ? lt(lang, "analyzing") : lt(lang, "analyze", { count: sheets.length })}
        </button>
      ) : null}
      {images.length ? (
        <button type="button" className="pl-tool-button" disabled={anyBusy || atLimit} onClick={ocrImages}>
          <Search size={14} /> {busy === "ocr" ? lt(lang, "ocrBusy") : lt(lang, "ocr", { count: images.length })}
        </button>
      ) : null}
      {docs.length ? (
        <button type="button" className="pl-tool-button" disabled={anyBusy || atLimit} onClick={convertDocs}>
          <Download size={14} /> {busy === "convert" ? lt(lang, "converting") : lt(lang, "convert")}
        </button>
      ) : null}
      {error ? (
        <p className="pl-notice pl-notice--danger pl-source-tools-error">{error}</p>
      ) : null}
    </div>
  );
}
