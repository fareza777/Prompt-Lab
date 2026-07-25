import Sheet from "./Sheet.jsx";
import { getCompareEvaluationMeta } from "../compareProvenance.js";

/**
 * "Compare" — the former Compare tab. It no longer asks the user to paste two
 * prompts: the two versions are the one they had and the one Improve produced,
 * which is the only comparison that arises in practice.
 */

const CRITERIA = ["clarity", "context", "format", "constraints"];

function ScoreTable({ t, scores }) {
  if (!scores?.A || !scores?.B) return null;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--t-sm)" }}>
      <thead>
        <tr>
          <th scope="col" style={{ textAlign: "left", padding: "var(--s-2) 0", color: "var(--ink-mute)", fontWeight: 500 }} />
          <th scope="col" style={{ textAlign: "right", padding: "var(--s-2) 0", color: "var(--ink-mute)", fontWeight: 500 }}>
            {t("compare.before")}
          </th>
          <th scope="col" style={{ textAlign: "right", padding: "var(--s-2) 0", color: "var(--ink-mute)", fontWeight: 500 }}>
            {t("compare.after")}
          </th>
        </tr>
      </thead>
      <tbody>
        {CRITERIA.map((key) => (
          <tr key={key} style={{ borderTop: "1px solid var(--rule)" }}>
            <th scope="row" style={{ textAlign: "left", padding: "var(--s-2) 0", fontWeight: 400 }}>
              {t(`compare.criteria.${key}`)}
            </th>
            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {scores.A[key] ?? "—"}
            </td>
            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
              {scores.B[key] ?? "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Compare({
  t,
  open,
  onClose,
  before,
  after,
  result,
  isComparing,
  error,
  warning,
  onRun,
}) {
  const hasPair = Boolean(String(before || "").trim() && String(after || "").trim());

  return (
    <Sheet open={open} title={t("compare.title")} closeLabel={t("nav.close")} onClose={onClose}>
      {!hasPair ? (
        <p className="pl-empty">{t("compare.empty")}</p>
      ) : (
        <>
          <button
            type="button"
            className="pl-btn pl-btn--primary pl-btn--block"
            onClick={onRun}
            disabled={isComparing}
          >
            {isComparing ? t("compare.running") : t("compare.run")}
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

          {isComparing && (
            <div className="pl-progress">
              <span className="pl-spinner" aria-hidden="true" />
              <span>{t("compare.running")}</span>
            </div>
          )}

          {result && !isComparing && (
            <>
              {result.summary && <p>{result.summary}</p>}
              <ScoreTable t={t} scores={result.scores} />
              {/* Always state where the score came from, so a locally computed
                  result is never mistaken for an AI judgement. */}
              <p className="pl-hint">
                {getCompareEvaluationMeta(result).isHeuristic
                  ? t("compare.heuristicNote")
                  : t("compare.providerNote")}
              </p>
            </>
          )}

          <div>
            <h3 className="pl-eyebrow" style={{ paddingBottom: "var(--s-2)" }}>
              {t("compare.before")}
            </h3>
            <article className="pl-doc" style={{ maxHeight: 220, overflowY: "auto" }}>
              {before}
            </article>
          </div>

          <div>
            <h3 className="pl-eyebrow" style={{ paddingBottom: "var(--s-2)" }}>
              {t("compare.after")}
            </h3>
            <article className="pl-doc" style={{ maxHeight: 220, overflowY: "auto" }}>
              {after}
            </article>
          </div>
        </>
      )}
    </Sheet>
  );
}
