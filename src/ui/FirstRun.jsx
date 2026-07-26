import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  FileOutput,
  Languages,
  LayoutDashboard,
  Sparkles,
  Wand2,
} from "lucide-react";
import { LANGUAGES, makeTranslator } from "./i18n.js";

const TOUR_STEPS = [
  {
    id: "input",
    icon: Sparkles,
    titleKey: "firstrun.input.title",
    bodyKey: "firstrun.input.body",
    points: ["firstrun.input.point1", "firstrun.input.point2", "firstrun.input.point3"],
  },
  {
    id: "build",
    icon: FileOutput,
    titleKey: "firstrun.build.title",
    bodyKey: "firstrun.build.body",
    points: ["firstrun.build.point1", "firstrun.build.point2", "firstrun.build.point3"],
  },
  {
    id: "improve",
    icon: Wand2,
    titleKey: "firstrun.improve.title",
    bodyKey: "firstrun.improve.body",
    points: ["firstrun.improve.point1", "firstrun.improve.point2", "firstrun.improve.point3"],
  },
  {
    id: "menus",
    icon: LayoutDashboard,
    titleKey: "firstrun.menus.title",
    bodyKey: "firstrun.menus.body",
    points: ["firstrun.menus.point1", "firstrun.menus.point2", "firstrun.menus.point3"],
  },
  {
    id: "output",
    icon: Check,
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
  const step = TOUR_STEPS[index];
  const Icon = step.icon;
  const isLast = index === TOUR_STEPS.length - 1;

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
            <span key={item.id} className={dotIndex === index ? "is-active" : ""} />
          ))}
        </div>

        <div className="pl-firstrun-actions">
          {!isLast ? (
            <button
              type="button"
              className="pl-btn pl-btn--primary pl-btn--block"
              onClick={() => setIndex((value) => value + 1)}
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
