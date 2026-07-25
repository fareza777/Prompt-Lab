import { useState } from "react";
import {
  ArrowRight,
  Check,
  FileText,
  Sparkles,
  Wand2,
  Download,
  Languages,
} from "lucide-react";
import { LANGUAGES } from "./i18n.js";

/**
 * First run: pick a language, then a walkthrough of the actual workflow.
 *
 * Every step is skippable and each one carries a direct "start now" exit. The
 * previous build put a three-step wall in front of an auth wall, and new users
 * left before seeing anything the product does — so depth is offered here, but
 * never enforced. The same content stays reachable afterwards from Guide.
 */

const STEPS = [
  {
    id: "input",
    icon: FileText,
    art: "input",
  },
  {
    id: "build",
    icon: Sparkles,
    art: "build",
  },
  {
    id: "improve",
    icon: Wand2,
    art: "improve",
  },
  {
    id: "output",
    icon: Download,
    art: "output",
  },
];

function StepArt({ kind }) {
  if (kind === "input") {
    return (
      <div className="pl-art pl-art--input" aria-hidden="true">
        <span className="pl-art-chip">Catatan</span>
        <span className="pl-art-chip">Foto</span>
        <span className="pl-art-chip">PDF</span>
        <span className="pl-art-chip">Excel</span>
        <span className="pl-art-chip">Word</span>
      </div>
    );
  }
  if (kind === "build") {
    return (
      <div className="pl-art pl-art--doc" aria-hidden="true">
        <i style={{ width: "62%" }} />
        <i style={{ width: "94%" }} />
        <i style={{ width: "86%" }} />
        <i style={{ width: "70%" }} />
        <i style={{ width: "90%" }} />
      </div>
    );
  }
  if (kind === "improve") {
    return (
      <div className="pl-art pl-art--compare" aria-hidden="true">
        <div>
          <span>Sebelum</span>
          <i style={{ width: "48%" }} />
          <i style={{ width: "62%" }} />
        </div>
        <div className="is-after">
          <span>Sesudah</span>
          <i style={{ width: "88%" }} />
          <i style={{ width: "96%" }} />
        </div>
      </div>
    );
  }
  return (
    <div className="pl-art pl-art--out" aria-hidden="true">
      <span>.docx</span>
      <span>.pptx</span>
    </div>
  );
}

function LanguageGate({ onPick }) {
  return (
    <section className="pl-firstrun-card" aria-labelledby="lang-title">
      <span className="pl-firstrun-mark" aria-hidden="true">
        <Languages size={22} />
      </span>
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
            onClick={() => onPick(item.code)}
          >
            <strong>{item.nativeLabel}</strong>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

export default function FirstRun({ t, lang, onPickLanguage, onFinish }) {
  const [stage, setStage] = useState(lang ? "tour" : "language");
  const [index, setIndex] = useState(0);

  if (stage === "language") {
    return (
      <main className="pl-firstrun" data-stage="language">
        <LanguageGate
          onPick={(code) => {
            onPickLanguage(code);
            setStage("tour");
          }}
        />
      </main>
    );
  }

  const step = STEPS[index];
  const Icon = step.icon;
  const isLast = index === STEPS.length - 1;

  return (
    <main className="pl-firstrun" data-stage="tour">
      <section className="pl-firstrun-card" aria-labelledby="tour-title">
        <header className="pl-firstrun-top">
          <span className="pl-eyebrow">
            {index + 1} / {STEPS.length}
          </span>
          <button type="button" className="pl-btn pl-btn--quiet pl-btn--sm" onClick={onFinish}>
            {t("firstrun.skip")}
          </button>
        </header>

        <span className="pl-firstrun-mark" aria-hidden="true">
          <Icon size={22} />
        </span>

        <h1 id="tour-title">{t(`firstrun.${step.id}.title`)}</h1>
        <p className="pl-firstrun-lede">{t(`firstrun.${step.id}.body`)}</p>

        <StepArt kind={step.art} />

        <ul className="pl-firstrun-points">
          {[1, 2, 3].map((n) => {
            const key = `firstrun.${step.id}.point${n}`;
            const text = t(key);
            if (text === key) return null;
            return (
              <li key={n}>
                <Check size={15} aria-hidden="true" />
                <span>{text}</span>
              </li>
            );
          })}
        </ul>

        <div className="pl-firstrun-dots" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.id} className={i === index ? "is-active" : ""} />
          ))}
        </div>

        <div className="pl-firstrun-actions">
          {index > 0 && (
            <button type="button" className="pl-btn" onClick={() => setIndex(index - 1)}>
              {t("nav.back")}
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              className="pl-btn pl-btn--primary"
              onClick={() => setIndex(index + 1)}
            >
              {t("firstrun.next")}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
          {isLast && (
            <button type="button" className="pl-btn pl-btn--primary" onClick={onFinish}>
              {t("firstrun.start")}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
        </div>

        {!isLast && (
          <button type="button" className="pl-firstrun-jump" onClick={onFinish}>
            {t("firstrun.startNow")}
          </button>
        )}
      </section>
    </main>
  );
}

export { STEPS as FIRST_RUN_STEPS };
