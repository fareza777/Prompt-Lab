import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  Flag,
  Star,
  Wand2,
} from "lucide-react";
import { createContentActionPayload } from "./contentRecord.js";

function Elapsed() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const minutes = String(Math.floor(seconds / 60)).padStart(1, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  return <time dateTime={`PT${seconds}S`}>{`${minutes}:${remainder}`}</time>;
}

function Working({ title, hint }) {
  return (
    <section className="pl-result pl-result--working" aria-live="polite">
      <div className="pl-working">
        <div className="pl-working-head">
          <span className="pl-spinner" aria-hidden="true" />
          <strong>{title}</strong>
          <Elapsed />
        </div>
        <span className="pl-working-track" aria-hidden="true">
          <i />
        </span>
        <div className="pl-document-skeleton" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <p>{hint}</p>
      </div>
    </section>
  );
}

export default function Result({
  t,
  prompt,
  metrics,
  isGenerating,
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
  runOutput,
  isRunning,
  runError,
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const output = String(runOutput || "").trim();
  const generatedPrompt = String(prompt || "").trim();
  const score = Number(metrics?.score) || 0;

  useEffect(() => {
    setPromptOpen(false);
  }, [output]);

  if (isGenerating) {
    return <Working title={t("result.working")} hint={t("result.workingHint")} />;
  }

  if (isRunning) {
    return <Working title={t("result.runWorking")} hint={t("result.runWorkingHint")} />;
  }

  if (!output && !runError) return null;

  return (
    <section className="pl-result" aria-label={t("result.title")}>
      <header className="pl-result-head">
        <div>
          <p className="pl-eyebrow">{t("result.eyebrow")}</p>
          <h2>{t("result.title")}</h2>
        </div>
        <span className="pl-result-status">{t("result.ready")}</span>
      </header>

      {output && (
        <article className="pl-doc pl-doc--output" aria-live="polite">
          {output}
        </article>
      )}

      {runError && (
        <div className="pl-notice pl-notice--danger" role="alert">
          {runError}
        </div>
      )}

      {output && (
        <>
          <p className="pl-notice pl-notice--quiet">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{t("result.aiNotice")}</span>
          </p>

          <div className="pl-actions pl-actions--primary">
            <button type="button" className="pl-btn" onClick={() => onCopy(output)}>
              {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
              {copied ? t("result.copied") : t("result.copy")}
            </button>

            <button
              type="button"
              className="pl-btn"
              onClick={() => onSave(createContentActionPayload("output", output))}
            >
              <Star size={17} aria-hidden="true" />
              {saved ? t("result.saved") : t("result.save")}
            </button>

            {canExportWord && (
              <button type="button" className="pl-btn" onClick={() => onExport("docx", output)}>
                <Download size={17} aria-hidden="true" />
                {t("result.exportWord")}
              </button>
            )}

            {canExportPpt && (
              <button type="button" className="pl-btn" onClick={() => onExport("pptx", output)}>
                <Download size={17} aria-hidden="true" />
                {t("result.exportPpt")}
              </button>
            )}
          </div>
        </>
      )}

      {generatedPrompt && (
        <div className="pl-prompt-disclosure">
          <button
            type="button"
            className="pl-text-action"
            aria-expanded={promptOpen}
            onClick={() => setPromptOpen((open) => !open)}
          >
            {t("result.viewPrompt")}
            <ChevronDown size={16} aria-hidden="true" />
          </button>

          {promptOpen && (
            <div className="pl-prompt-panel">
              <div className="pl-prompt-meta">
                <p className="pl-readiness" title={t("result.readinessHelp")}>
                  <span>{t("result.readiness")}</span>
                  <strong>{score}</strong>
                </p>
                <span className="pl-bar" aria-hidden="true">
                  <i style={{ width: `${Math.max(0, Math.min(100, score * 10))}%` }} />
                </span>
              </div>

              <article className="pl-doc pl-doc--prompt">{generatedPrompt}</article>

              <div className="pl-actions">
                <button type="button" className="pl-btn" onClick={() => onCopy(generatedPrompt)}>
                  <Copy size={17} aria-hidden="true" />
                  {t("result.copyPrompt")}
                </button>
                <button type="button" className="pl-btn" onClick={onImprove}>
                  <Wand2 size={17} aria-hidden="true" />
                  {t("result.improvePrompt")}
                </button>
                {canCompare && (
                  <button type="button" className="pl-btn" onClick={onCompare}>
                    <ArrowRightLeft size={17} aria-hidden="true" />
                    {t("result.comparePrompt")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {exportStatus && (
        <p className="pl-meta" role="status">
          {exportStatus}
        </p>
      )}

      <button
        type="button"
        className="pl-btn pl-btn--quiet pl-btn--sm pl-report-action"
        onClick={() => onReport(createContentActionPayload("output", output || generatedPrompt))}
      >
        <Flag size={15} aria-hidden="true" />
        {t("result.report")}
      </button>
    </section>
  );
}
