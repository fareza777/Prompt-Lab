import { useMemo, useState } from "react";
import { Wand2 } from "lucide-react";
import Sheet from "./Sheet.jsx";
import { OPTIMIZER_MODES } from "./options.js";
import { buildSemanticDiff, summarizeSemanticDiff, countWords } from "../optimizerDiff.js";

/**
 * "Improve" — the former Optimizer tab, rebuilt as an action on the current
 * result. The user picks a direction, sees the rewrite, and either takes it or
 * keeps what they had. Nothing is replaced without an explicit choice.
 */

export default function Improve({
  t,
  open,
  onClose,
  isOptimizing,
  original,
  result,
  error,
  warning,
  onRun,
  onApply,
}) {
  const [mode, setMode] = useState(OPTIMIZER_MODES[0]);

  /** What actually changed, so "Improve" is not a black box. */
  const changeNote = useMemo(() => {
    if (!result || !original) return "";
    const { added, removed } = summarizeSemanticDiff(buildSemanticDiff(original, result));
    const net = countWords(result) - countWords(original);
    const parts = [];
    if (added) parts.push(t("improve.added", { n: added }));
    if (removed) parts.push(t("improve.removed", { n: removed }));
    if (net) parts.push(t("improve.wordDelta", { delta: net > 0 ? `+${net}` : `${net}` }));
    return parts.join(" · ");
  }, [original, result, t]);

  const close = () => {
    onClose();
  };

  return (
    <Sheet open={open} title={t("improve.title")} closeLabel={t("nav.close")} onClose={close}>
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="pl-label" style={{ paddingBottom: "var(--s-2)" }}>
          {t("improve.pick")}
        </legend>
        <div className="pl-actions">
          {OPTIMIZER_MODES.map((option) => (
            <button
              key={option}
              type="button"
              className={`pl-btn pl-btn--sm${mode === option ? " pl-btn--primary" : ""}`}
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
              disabled={isOptimizing}
            >
              {t(`improve.mode.${option}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        className="pl-btn pl-btn--primary pl-btn--block"
        onClick={() => onRun(mode)}
        disabled={isOptimizing}
      >
        <Wand2 size={17} aria-hidden="true" />
        {isOptimizing ? t("result.improving") : t("result.improve")}
      </button>

      {error && (
        <div className="pl-notice pl-notice--danger" role="alert">
          {error}
        </div>
      )}
      {warning && !error && (
        <div className="pl-notice pl-notice--warn" role="status">
          {warning}
        </div>
      )}

      {isOptimizing && (
        <div className="pl-progress">
          <span className="pl-spinner" aria-hidden="true" />
          <span>{t("result.improving")}</span>
        </div>
      )}

      {result && !isOptimizing && (
        <>
          {changeNote && <p className="pl-meta">{changeNote}</p>}
          <article className="pl-doc" aria-label={t("compare.after")}>
            {result}
          </article>
          <div className="pl-actions">
            <button type="button" className="pl-btn pl-btn--primary" onClick={onApply}>
              {t("improve.apply")}
            </button>
            <button type="button" className="pl-btn" onClick={close}>
              {t("improve.keep")}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
