import { useEffect } from "react";
import { Download, Share2, X } from "lucide-react";

/**
 * Android TWA ignores silent <a download>. After PNG is ready, show the image
 * and require a fresh tap to Share/Save (user gesture).
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

  const { url, filename, extension } = offer;
  const label = String(extension || "png").toUpperCase();

  async function shareNow() {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || "image/png" });
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

    // Fallback: open the image — user can long-press → Save.
    try {
      window.open(url, "_blank", "noopener");
      onShared?.("open");
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
        aria-label={t("result.saveDiagramTitle")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pl-sheet-head">
          <h2>{t("result.saveDiagramTitle")}</h2>
          <button type="button" className="pl-btn pl-btn--quiet pl-btn--sm" onClick={onClose}>
            <X size={18} aria-hidden="true" />
            {t("result.saveDiagramClose")}
          </button>
        </div>
        <div className="pl-sheet-body">
          <p className="pl-meta">{t("result.saveDiagramHint")}</p>
          <div className="pl-diagram-save__preview">
            <img src={url} alt={filename} />
          </div>
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
