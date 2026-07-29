import { Check, Loader2 } from "lucide-react";

/**
 * The waiting screen.
 *
 * The server still streams — that is what stopped long documents from losing
 * the race against the function timeout — but the tokens are no longer painted
 * on screen. Watching a document assemble itself word by word reads as a
 * machine thinking out loud; a finished page reads as work delivered.
 *
 * The stages are driven by real events (first byte received, stream closed),
 * not a timer, so the screen never claims progress that has not happened.
 */

const STEPS = ["reading", "drafting", "finishing"];

export default function TemplateProgress({ t, templateName, phase = "reading" }) {
  const current = Math.max(0, STEPS.indexOf(phase));

  return (
    <section className="pl-tpl-progress" aria-live="polite" aria-busy="true">
      <p className="pl-eyebrow">{templateName}</p>
      <h2>{t("tpl.working")}</h2>

      <ol className="pl-tpl-progress-steps">
        {STEPS.map((step, index) => {
          const state = index < current ? "done" : index === current ? "active" : "waiting";
          return (
            <li key={step} className={`pl-tpl-progress-step is-${state}`}>
              <span className="pl-tpl-progress-mark" aria-hidden="true">
                {state === "done" ? (
                  <Check size={14} />
                ) : state === "active" ? (
                  <Loader2 size={14} className="pl-spin" />
                ) : (
                  <span className="pl-tpl-progress-dot" />
                )}
              </span>
              {t(`tpl.step.${step}`)}
            </li>
          );
        })}
      </ol>

      <p className="pl-hint">{t("tpl.workingHint")}</p>
    </section>
  );
}
