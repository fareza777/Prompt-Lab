import { ArrowRight, Languages } from "lucide-react";
import { LANGUAGES } from "./i18n.js";

export default function FirstRun({ onPickLanguage, onFinish }) {
  const pickLanguage = (code) => {
    onPickLanguage(code);
    onFinish();
  };

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
              onClick={() => pickLanguage(item.code)}
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
