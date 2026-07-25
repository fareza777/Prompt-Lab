import { Copy, Check, Download, Wand2, ArrowRightLeft, Star, Flag, AlertTriangle } from "lucide-react";

/**
 * The result, presented as a document.
 *
 * Improve and Compare used to be separate destinations; here they are actions
 * on the thing already on screen, which is how people actually think about
 * them ("make this better") and removes the manual copy-paste between tabs.
 */

export default function Result({
  t,
  prompt,
  metrics,
  isGenerating,
  generationStatus,
  copied,
  onCopy,
  onSave,
  saved,
  onImprove,
  onCompare,
  canCompare,
  onExport,
  canExportWord,
  canExportPpt,
  exportStatus,
  onReport,
}) {
  const score = Number(metrics?.score) || 0;

  if (isGenerating && !prompt) {
    return (
      <section className="pl-result" aria-live="polite">
        <div className="pl-progress">
          <span className="pl-spinner" aria-hidden="true" />
          <span>{generationStatus || t("canvas.generating")}</span>
        </div>
      </section>
    );
  }

  if (!prompt) return null;

  return (
    <section className="pl-result" aria-label={t("result.title")}>
      <div className="pl-result-head">
        <h2 className="pl-eyebrow">{t("result.title")}</h2>
        <p className="pl-readiness" title={t("result.readinessHelp")}>
          <span>{t("result.readiness")}</span>
          <strong>{score}</strong>
          <span className="pl-bar" aria-hidden="true">
            <i style={{ width: `${Math.max(0, Math.min(100, score * 10))}%` }} />
          </span>
        </p>
      </div>

      <article className={`pl-doc${isGenerating ? " pl-doc--busy" : ""}`} aria-live="polite">
        {prompt}
      </article>

      <p className="pl-notice">
        <AlertTriangle size={16} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
        <span>{t("result.aiNotice")}</span>
      </p>

      <div className="pl-actions">
        <button type="button" className="pl-btn pl-btn--primary" onClick={onCopy}>
          {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          {copied ? t("result.copied") : t("result.copy")}
        </button>

        <button type="button" className="pl-btn" onClick={onSave} disabled={isGenerating}>
          <Star size={17} aria-hidden="true" />
          {saved ? t("result.saved") : t("result.save")}
        </button>

        <button type="button" className="pl-btn" onClick={onImprove} disabled={isGenerating}>
          <Wand2 size={17} aria-hidden="true" />
          {t("result.improve")}
        </button>

        {canCompare && (
          <button type="button" className="pl-btn" onClick={onCompare} disabled={isGenerating}>
            <ArrowRightLeft size={17} aria-hidden="true" />
            {t("result.compare")}
          </button>
        )}

        {canExportWord && (
          <button
            type="button"
            className="pl-btn"
            onClick={() => onExport("docx")}
            disabled={isGenerating}
          >
            <Download size={17} aria-hidden="true" />
            {t("result.exportWord")}
          </button>
        )}

        {canExportPpt && (
          <button
            type="button"
            className="pl-btn"
            onClick={() => onExport("pptx")}
            disabled={isGenerating}
          >
            <Download size={17} aria-hidden="true" />
            {t("result.exportPpt")}
          </button>
        )}
      </div>

      {exportStatus && (
        <p className="pl-meta" role="status">
          {exportStatus}
        </p>
      )}

      <div className="pl-actions">
        <button type="button" className="pl-btn pl-btn--quiet pl-btn--sm" onClick={onReport}>
          <Flag size={15} aria-hidden="true" />
          {t("result.report")}
        </button>
      </div>
    </section>
  );
}
