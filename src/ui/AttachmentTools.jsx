import { useEffect, useState } from "react";
// Only icons already used by the entry bundle — importing a fresh lucide icon
// here would inflate the shared "icons" chunk for every user, even though this
// component itself is lazy.
import { Download, ImagePlus, Search } from "lucide-react";
import { detectLanguage } from "./i18n.js";
import { canScanDocuments, consumeLostScanWarning, scanDocumentToFile } from "../documentScan.js";
import { analyzeSpreadsheetAttachment, isSupportedSpreadsheet } from "../dataAnalyze.js";
import { importUrlToFile } from "../urlImport.js";
import { downloadBlob, isPdfAttachment, mergePdfAttachments } from "../pdfTools.js";

/**
 * Extra ways to feed a template: scan a paper document (native app only,
 * ML Kit scanner + OCR), import a web page as clean markdown (Defuddle via
 * /api/fetch-url), merge attached PDFs into one download (pdf-lib), and
 * profile CSV/XLSX attachments locally with DuckDB-Wasm.
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

export default function AttachmentTools({ apiBase, attachments, onFiles, disabled, atLimit }) {
  const lang = detectLanguage();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Reaching this component after a process-death reload means the scan that
    // was in flight never delivered its file — surface that instead of silence.
    if (consumeLostScanWarning()) setError(lt(detectLanguage(), "scanLost"));
  }, []);

  const pdfCount = attachments.filter(isPdfAttachment).length;
  const sheets = attachments.filter(isSupportedSpreadsheet);
  const showScan = canScanDocuments();

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

  const scanDocument = () =>
    run("scan", async () => {
      const file = await scanDocumentToFile();
      if (file) onFiles([file]);
    });

  const mergePdfs = () =>
    run("merge", async () => {
      const blob = await mergePdfAttachments(apiBase, attachments);
      downloadBlob(blob, "merged.pdf");
    });

  const analyzeData = () =>
    run("analyze", async () => {
      const files = [];
      for (const sheet of sheets) files.push(await analyzeSpreadsheetAttachment(sheet));
      if (files.length) onFiles(files);
    });

  const anyBusy = Boolean(busy) || disabled;

  return (
    <div className="pl-source-tools">
      <button type="button" className="pl-tool-button" disabled={anyBusy || atLimit} onClick={importUrl}>
        <Search size={14} /> {busy === "url" ? lt(lang, "importing") : lt(lang, "fromUrl")}
      </button>
      {showScan ? (
        <button type="button" className="pl-tool-button" disabled={anyBusy || atLimit} onClick={scanDocument}>
          <ImagePlus size={14} /> {busy === "scan" ? lt(lang, "scanning") : lt(lang, "scanDoc")}
        </button>
      ) : null}
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
      {error ? (
        <p className="pl-notice pl-notice--danger pl-source-tools-error">{error}</p>
      ) : null}
    </div>
  );
}
