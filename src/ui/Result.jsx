import { useEffect, useState } from "react";
import {
  Copy,
  Check,
  Download,
  Wand2,
  ArrowRightLeft,
  Star,
  Flag,
  AlertTriangle,
  Play,
} from "lucide-react";

/**
 * The result, presented as a document.
 *
 * Two things can live here: the prompt PromptLab built, and — once the user
 * runs it — the finished content that prompt produced. The prompt used to be
 * the end of the line, which left the user to paste it into a chat app to get
 * anything usable; running it here closes that gap without hiding the prompt
 * from people who want it.
 *
 * Improve and Compare act on the prompt, since that is what they rewrite.
 */

/** Counts up while a request is in flight, so the wait is legible. */
function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(1, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return <time dateTime={`PT${seconds}S`}>{`${mm}:${ss}`}</time>;
}

function Working({ title, hint }) {
  return (
    <div className="pl-working">
      <div className="pl-working-head">
        <span className="pl-spinner" aria-hidden="true" />
        <strong>{title}</strong>
        <Elapsed />
      </div>
      <span className="pl-working-track" aria-hidden="true">
        <i />
      </span>
      <p>{hint}</p>
    </div>
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
  onRun,
  runOutput,
  isRunning,
  runError,
}) {
  const [view, setView] = useState("prompt");

  // A finished run is what the user came for, so surface it as soon as it lands.
  useEffect(() => {
    if (runOutput) setView("output");
  }, [runOutput]);

  useEffect(() => {
    if (!runOutput) setView("prompt");
  }, [prompt, runOutput]);

  const score = Number(metrics?.score) || 0;

  if (isGenerating && !prompt) {
    return (
      <section className="pl-result" aria-live="polite">
        <Working title={t("result.working")} hint={t("result.workingHint")} />
      </section>
    );
  }

  if (!prompt) return null;

  const showingOutput = view === "output" && Boolean(runOutput);
  const visibleText = showingOutput ? runOutput : prompt;

  return (
    <section className="pl-result" aria-label={t("result.title")}>
      <div className="pl-result-head">
        {runOutput ? (
          <div className="pl-segment" role="group" aria-label={t("result.title")}>
            <button
              type="button"
              aria-pressed={!showingOutput}
              onClick={() => setView("prompt")}
            >
              {t("result.tabPrompt")}
            </button>
            <button
              type="button"
              aria-pressed={showingOutput}
              onClick={() => setView("output")}
            >
              {t("result.tabOutput")}
            </button>
          </div>
        ) : (
          <h2 className="pl-eyebrow">{t("result.title")}</h2>
        )}

        {!showingOutput && (
          <p className="pl-readiness" title={t("result.readinessHelp")}>
            <span>{t("result.readiness")}</span>
            <strong>{score}</strong>
            <span className="pl-bar" aria-hidden="true">
              <i style={{ width: `${Math.max(0, Math.min(100, score * 10))}%` }} />
            </span>
          </p>
        )}
      </div>

      <article className="pl-doc" aria-live="polite">
        {visibleText}
      </article>

      <p className="pl-notice">
        <AlertTriangle size={16} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
        <span>{t("result.aiNotice")}</span>
      </p>

      {/* Running the prompt is the primary next step while only the prompt exists. */}
      {!runOutput && !isRunning && (
        <div className="pl-runcta">
          <button type="button" className="pl-btn pl-btn--primary" onClick={onRun}>
            <Play size={17} aria-hidden="true" />
            {t("result.run")}
          </button>
          <p className="pl-hint">{t("result.runHint")}</p>
        </div>
      )}

      {isRunning && (
        <Working title={t("result.runWorking")} hint={t("result.runWorkingHint")} />
      )}

      {runError && (
        <div className="pl-notice pl-notice--danger" role="alert">
          {runError}
        </div>
      )}

      <div className="pl-actions">
        <button type="button" className="pl-btn" onClick={() => onCopy(visibleText)}>
          {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          {copied ? t("result.copied") : t("result.copy")}
        </button>

        <button
          type="button"
          className="pl-btn"
          onClick={() => onSave(visibleText)}
          disabled={isGenerating || isRunning}
        >
          <Star size={17} aria-hidden="true" />
          {saved ? t("result.saved") : t("result.save")}
        </button>

        {!showingOutput && (
          <button
            type="button"
            className="pl-btn"
            onClick={onImprove}
            disabled={isGenerating || isRunning}
          >
            <Wand2 size={17} aria-hidden="true" />
            {t("result.improve")}
          </button>
        )}

        {!showingOutput && canCompare && (
          <button
            type="button"
            className="pl-btn"
            onClick={onCompare}
            disabled={isGenerating || isRunning}
          >
            <ArrowRightLeft size={17} aria-hidden="true" />
            {t("result.compare")}
          </button>
        )}

        {canExportWord && (
          <button
            type="button"
            className="pl-btn"
            onClick={() => onExport("docx", visibleText)}
            disabled={isGenerating || isRunning}
          >
            <Download size={17} aria-hidden="true" />
            {t("result.exportWord")}
          </button>
        )}

        {canExportPpt && (
          <button
            type="button"
            className="pl-btn"
            onClick={() => onExport("pptx", visibleText)}
            disabled={isGenerating || isRunning}
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
