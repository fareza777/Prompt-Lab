import {
  AlertTriangle,
  CalendarDays,
  Check,
  Download,
  FileText,
  LayoutDashboard,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Sheet from "./Sheet.jsx";

/**
 * The permanent home for the detailed explanation.
 *
 * First run stays short and skippable; the depth lives here, where someone can
 * reach it when they actually want it instead of before they have seen
 * anything work.
 */

// Mirrors the tour, minus the language step: pick, attach, create, find, send.
const ICONS = {
  templates: LayoutDashboard,
  input: FileText,
  build: Sparkles,
  calendar: CalendarDays,
  output: Download,
};
const GUIDE_STEPS = [
  { id: "templates" },
  { id: "input" },
  { id: "build" },
  { id: "calendar" },
  { id: "output" },
];

export default function Guide({ t, open, onClose, onReplay }) {
  return (
    <Sheet open={open} title={t("guide.title")} closeLabel={t("nav.close")} onClose={onClose}>
      <p className="pl-hint">{t("guide.intro")}</p>

      <section>
        <h3 className="pl-eyebrow" style={{ paddingBottom: "var(--s-3)" }}>
          {t("guide.section.workflow")}
        </h3>
        <ol className="pl-guide-steps">
          {GUIDE_STEPS.map((step, i) => {
            const Icon = ICONS[step.id] || FileText;
            return (
              <li key={step.id}>
                <span className="pl-guide-num" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div>
                  <strong>
                    {i + 1}. {t(`firstrun.${step.id}.title`)}
                  </strong>
                  <p>{t(`firstrun.${step.id}.body`)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h3 className="pl-eyebrow" style={{ paddingBottom: "var(--s-3)" }}>
          {t("guide.section.tips")}
        </h3>
        <ul className="pl-guide-list">
          {[1, 2, 3, 4].map((n) => (
            <li key={n}>
              <Check size={15} aria-hidden="true" />
              <span>{t(`guide.tip${n}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="pl-eyebrow" style={{ paddingBottom: "var(--s-3)" }}>
          {t("guide.section.limits")}
        </h3>
        <ul className="pl-guide-list pl-guide-list--muted">
          {[1, 2, 3, 4].map((n) => (
            <li key={n}>
              <AlertTriangle size={15} aria-hidden="true" />
              <span>{t(`guide.limit${n}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="pl-btn pl-btn--block" onClick={onReplay}>
        <RotateCcw size={16} aria-hidden="true" />
        {t("guide.replay")}
      </button>
    </Sheet>
  );
}
