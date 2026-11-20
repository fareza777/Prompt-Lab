import { Shield, Sun, Moon, Star, Mail } from "lucide-react";
import Sheet from "./Sheet.jsx";
import ThemeEditor from "./ThemeEditor.jsx";
import { LANGUAGES } from "./i18n.js";
import { PLAY_STORE_LISTING_URL, SUPPORT_EMAIL } from "../aboutApp.js";

/**
 * Preferences and app info in one sheet.
 *
 * The app has no accounts: everything (history, templates, drafts) stays on
 * this device, so there is nothing to sign in to, upgrade, or delete here.
 */

function Preferences({ t, lang, setLang, themeMode, setThemeMode }) {
  // "Follow the system" was retired: it silently put a document tool into dark
  // mode for every user whose phone defaults there.
  const themes = [
    ["light", Sun, t("account.theme.light")],
    ["dark", Moon, t("account.theme.dark")],
  ];

  return (
    <>
      <div className="pl-field">
        <span className="pl-label" id="pref-lang">
          {t("account.language")}
        </span>
        <div className="pl-segment" role="group" aria-labelledby="pref-lang">
          {LANGUAGES.map((item) => (
            <button
              key={item.code}
              type="button"
              aria-pressed={lang === item.code}
              onClick={() => setLang(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pl-field">
        <span className="pl-label" id="pref-theme">
          {t("account.theme")}
        </span>
        <div className="pl-segment" role="group" aria-labelledby="pref-theme">
          {themes.map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={themeMode === value}
              onClick={() => setThemeMode(value)}
            >
              <Icon size={15} aria-hidden="true" style={{ marginRight: 6 }} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function Account({
  t,
  lang,
  setLang,
  themeMode,
  setThemeMode,
  open,
  onClose,
  paletteChoice,
  palette,
  onPickPreset,
  onEditColour,
  onResetPalette,
}) {
  return (
    <Sheet open={open} title={t("account.title")} closeLabel={t("nav.close")} onClose={onClose}>
      <Preferences
        t={t}
        lang={lang}
        setLang={setLang}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
      />

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)" }} />

      <ThemeEditor
        t={t}
        lang={lang}
        choice={paletteChoice}
        palette={palette}
        onPickPreset={onPickPreset}
        onEditColour={onEditColour}
        onReset={onResetPalette}
      />

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)" }} />

      <section aria-labelledby="about-ai-work-studio-title">
        <h3 className="pl-eyebrow" id="about-ai-work-studio-title">
          {t("about.title")}
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-3)",
            padding: "var(--s-3) 0",
          }}
        >
          <img
            src="/icons/icon-512.png"
            alt="AI Work Studio app icon"
            width="40"
            height="40"
            style={{ borderRadius: "var(--r-sm)" }}
          />
          <p className="pl-hint" style={{ margin: 0 }}>
            {t("about.blurb")}
          </p>
        </div>

        <div className="pl-actions">
          <a
            className="pl-btn pl-btn--sm"
            href={PLAY_STORE_LISTING_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Star size={15} aria-hidden="true" />
            {t("about.rate")}
          </a>
          <a
            className="pl-btn pl-btn--quiet pl-btn--sm"
            href={`mailto:${SUPPORT_EMAIL}`}
            aria-label={`Contact support by email at ${SUPPORT_EMAIL}`}
          >
            <Mail size={15} aria-hidden="true" />
            {t("account.help")}
          </a>
        </div>
      </section>

      <div className="pl-actions">
        <a className="pl-btn pl-btn--quiet pl-btn--sm" href="/privacy">
          <Shield size={15} aria-hidden="true" />
          {t("account.privacy")}
        </a>
        <a className="pl-btn pl-btn--quiet pl-btn--sm" href="/terms">
          {t("account.terms")}
        </a>
        <a className="pl-btn pl-btn--quiet pl-btn--sm" href="/privacy/delete-account">
          {t("about.deleteHelp")}
        </a>
      </div>

    </Sheet>
  );
}
