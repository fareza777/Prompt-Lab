import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  FileOutput,
  Languages,
  LayoutDashboard,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { LANGUAGES, makeTranslator } from "./i18n.js";

/**
 * The tour follows the flow the app actually has: pick a template, attach the
 * material, create, find it again by date, send it.
 *
 * The old second-to-last step explained Improve and Compare, which no longer
 * exist, and the menu step never mentioned the calendar.
 */
const TOUR_STEPS = [
  {
    id: "templates",
    icon: LayoutDashboard,
    titleKey: "firstrun.templates.title",
    bodyKey: "firstrun.templates.body",
    points: [
      "firstrun.templates.point1",
      "firstrun.templates.point2",
      "firstrun.templates.point3",
    ],
  },
  {
    id: "input",
    icon: Paperclip,
    titleKey: "firstrun.input.title",
    bodyKey: "firstrun.input.body",
    points: ["firstrun.input.point1", "firstrun.input.point2", "firstrun.input.point3"],
  },
  {
    id: "build",
    icon: Sparkles,
    titleKey: "firstrun.build.title",
    bodyKey: "firstrun.build.body",
    points: ["firstrun.build.point1", "firstrun.build.point2", "firstrun.build.point3"],
  },
  {
    id: "calendar",
    icon: CalendarDays,
    titleKey: "firstrun.calendar.title",
    bodyKey: "firstrun.calendar.body",
    points: ["firstrun.calendar.point1", "firstrun.calendar.point2", "firstrun.calendar.point3"],
  },
  {
    id: "output",
    icon: FileOutput,
    titleKey: "firstrun.output.title",
    bodyKey: "firstrun.output.body",
    points: ["firstrun.output.point1", "firstrun.output.point2", "firstrun.output.point3"],
  },
];

function LanguageStage({ onPickLanguage }) {
  return (
    <main className="pl-firstrun" data-stage="language">
      <section className="pl-firstrun-card" aria-labelledby="lang-title">
        <span className="pl-firstrun-mark" aria-hidden="true">
          <Languages size={22} />
        </span>
        <p className="pl-eyebrow">AI Work Studio</p>
        <h1 id="lang-title">Pilih bahasa · Choose language</h1>
        <p className="pl-firstrun-lede">
          Bahasa tampilan saja. Kamu tetap bisa meminta hasil dalam bahasa apa pun.
          <br />
          Interface language only. You can still ask for output in any language.
        </p>
        <div className="pl-firstrun-langs">
          {LANGUAGES.map((item) => (
            <button
              key={item.code}
              type="button"
              className="pl-lang-btn"
              lang={item.code}
              onClick={() => onPickLanguage(item.code)}
            >
              <strong>{item.nativeLabel}</strong>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function TourStage({ t, onFinish, onSkip }) {
  const [index, setIndex] = useState(0);
  const last = TOUR_STEPS.length - 1;
  /**
   * Clamped because two taps land before React re-renders.
   *
   * Functional updates queue, so a double-tap on Next ran the index past the
   * final step, TOUR_STEPS[index] came back undefined, and reading .icon threw
   * — crashing the very first screen a new user sees into the error boundary.
   */
  const step = TOUR_STEPS[Math.min(index, last)];
  const Icon = step.icon;
  const isLast = index >= last;

  return (
    <main className="pl-firstrun" data-stage="tour">
      <section className="pl-firstrun-card" aria-labelledby="tour-title">
        <div className="pl-firstrun-top">
          <span className="pl-firstrun-mark" aria-hidden="true">
            <Icon size={22} />
          </span>
          <button type="button" className="pl-firstrun-jump" onClick={onSkip}>
            {t("firstrun.skip")}
          </button>
        </div>

        <p className="pl-eyebrow">
          {t("firstrun.stepOf", { n: index + 1, total: TOUR_STEPS.length })}
        </p>
        <h1 id="tour-title">{t(step.titleKey)}</h1>
        <p className="pl-firstrun-lede">{t(step.bodyKey)}</p>

        <ul className="pl-firstrun-points">
          {step.points.map((key) => (
            <li key={key}>
              <Check size={16} aria-hidden="true" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>

        <div className="pl-firstrun-dots" aria-hidden="true">
          {TOUR_STEPS.map((item, dotIndex) => (
            <span key={item.id} className={dotIndex === Math.min(index, last) ? "is-active" : ""} />
          ))}
        </div>

        <div className="pl-firstrun-actions">
          {!isLast ? (
            <button
              type="button"
              className="pl-btn pl-btn--primary pl-btn--block"
              onClick={() => setIndex((value) => Math.min(value + 1, last))}
            >
              {t("firstrun.next")}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="pl-btn pl-btn--primary pl-btn--block" onClick={onFinish}>
              {t("firstrun.start")}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
          <button type="button" className="pl-firstrun-jump" onClick={onSkip}>
            {t("firstrun.startNow")}
          </button>
        </div>
      </section>
    </main>
  );
}

export default function FirstRun({
  stage = "language",
  t,
  lang,
  onPickLanguage,
  onFinish,
  onSkipTour,
}) {
  const translator = useMemo(() => t || makeTranslator(lang || "id"), [t, lang]);

  if (stage === "tour") {
    return (
      <TourStage
        t={translator}
        onFinish={onFinish}
        onSkip={onSkipTour || onFinish}
      />
    );
  }

  return <LanguageStage onPickLanguage={onPickLanguage} />;
}

export { TOUR_STEPS };
