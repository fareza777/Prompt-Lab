import { useEffect } from "react";
import { Download, FileText, Share2, X } from "lucide-react";

/**
 * Android TWA ignores silent <a download>. After any export blob is ready,
 * show a sheet and require a fresh tap to Share/Save (user gesture).
 */
export default function DiagramSaveSheet({ offer, onClose, onShared, t }) {
  useEffect(() => {
    if (!offer) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [offer, onClose]);

  if (!offer) return null;

  const { url, filename, extension, blob } = offer;
  const ext = String(extension || "bin").toLowerCase();
  const label = ext.toUpperCase();
  const isImage = /^(png|svg|jpe?g|webp|gif)$/i.test(ext);
  const mime =
    blob?.type ||
    (ext === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : ext === "pptx"
        ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        : ext === "png"
          ? "image/png"
          : ext === "svg"
            ? "image/svg+xml"
            : "application/octet-stream");

  const titleKey =
    ext === "docx"
      ? "result.saveWordTitle"
      : ext === "pptx"
        ? "result.savePptTitle"
        : "result.saveDiagramTitle";
  const hintKey =
    ext === "docx" || ext === "pptx" ? "result.saveOfficeHint" : "result.saveDiagramHint";

  async function shareNow() {
    try {
      const fileBlob = blob || (await fetch(url).then((r) => r.blob()));
      const file = new File([fileBlob], filename, { type: mime });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        onShared?.("share");
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        onShared?.("share-abort");
        return;
      }
    }

    try {
      window.open(url, "_blank", "noopener");
      onShared?.(isImage ? "open" : "preview");
    } catch {
      onShared?.("preview");
    }
  }

  return (
    <div className="pl-scrim" role="presentation" onClick={onClose}>
      <div
        className="pl-sheet pl-diagram-save"
        role="dialog"
        aria-modal="true"
        aria-label={t(titleKey)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pl-sheet-head">
          <h2>{t(titleKey)}</h2>
          <button type="button" className="pl-btn pl-btn--quiet pl-btn--sm" onClick={onClose}>
            <X size={18} aria-hidden="true" />
            {t("result.saveDiagramClose")}
          </button>
        </div>
        <div className="pl-sheet-body">
          <p className="pl-meta">{t(hintKey)}</p>
          {isImage ? (
            <div className="pl-diagram-save__preview">
              <img src={url} alt={filename} />
            </div>
          ) : (
            <div className="pl-diagram-save__file" aria-hidden="true">
              <FileText size={40} />
            </div>
          )}
          <p className="pl-meta">
            {filename} · {label}
          </p>
          <div className="pl-actions pl-actions--primary">
            <button type="button" className="pl-btn pl-btn--primary" onClick={shareNow}>
              <Share2 size={17} aria-hidden="true" />
              {t("result.saveDiagramShare")}
            </button>
            <a className="pl-btn" href={url} download={filename}>
              <Download size={17} aria-hidden="true" />
              {t("result.saveDiagramDownload")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
