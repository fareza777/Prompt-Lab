import { useId } from "react";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import {
  PALETTE_KEYS,
  PALETTE_PRESETS,
  contrastRatio,
  paletteProblems,
} from "./themePalette.js";

const localizedName = (field, lang) => field?.[lang === "en" ? "en" : "id"] || field?.id || "";

/**
 * Colour settings.
 *
 * Presets come first because they are guaranteed readable — every one is held
 * to the same contrast floor by a test. The free editor below them was asked
 * for and is genuinely useful, but it can produce a page nobody can read, so it
 * reports the contrast it is about to create rather than letting the user find
 * out by trying to read a report on it.
 */

const SWATCH_ORDER = PALETTE_KEYS;

function Swatch({ id, value, label, onChange }) {
  const inputId = useId();
  return (
    <div className="pl-swatch">
      <label className="pl-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="color"
        value={value}
        onChange={(event) => onChange(id, event.target.value)}
      />
      <code>{value}</code>
    </div>
  );
}

function problemMessage(problem, t) {
  const ratio = problem.ratio ? problem.ratio.toFixed(1) : "";
  switch (problem.code) {
    case "text_on_page":
      return t("theme.warnTextPage", { ratio });
    case "text_on_card":
      return t("theme.warnTextCard", { ratio });
    case "accent_on_page":
      return t("theme.warnAccent", { ratio });
    case "page_and_card":
      return t("theme.warnLayers");
    default:
      return t("theme.warnInvalid");
  }
}

export default function ThemeEditor({ t, lang, choice, palette, onPickPreset, onEditColour, onReset }) {
  const problems = paletteProblems(palette);
  const activePreset = choice?.preset || "";
  const custom = Boolean(choice?.palette);

  return (
    <section aria-labelledby="theme-title">
      <h3 className="pl-eyebrow" id="theme-title">
        {t("theme.title")}
      </h3>
      <p className="pl-hint">{t("theme.intro")}</p>

      <div className="pl-preset-grid">
        {PALETTE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`pl-preset${activePreset === preset.id ? " is-active" : ""}`}
            aria-pressed={activePreset === preset.id}
            onClick={() => onPickPreset(preset.id)}
          >
            <span className="pl-preset-chips" aria-hidden="true">
              <i style={{ background: preset.palette.paper }} />
              <i style={{ background: preset.palette.surface }} />
              <i style={{ background: preset.palette.accent }} />
              <i style={{ background: preset.palette.ink }} />
            </span>
            <span className="pl-preset-name">
              {localizedName(preset.name, lang)}
              {activePreset === preset.id && <Check size={14} aria-hidden="true" />}
            </span>
          </button>
        ))}
      </div>

      <h4 className="pl-label pl-theme-subhead">{t("theme.customTitle")}</h4>
      <p className="pl-hint">{t("theme.customHint")}</p>

      <div className="pl-swatches">
        {SWATCH_ORDER.map((key) => (
          <Swatch
            key={key}
            id={key}
            value={palette[key]}
            label={t(`theme.colour.${key}`)}
            onChange={onEditColour}
          />
        ))}
      </div>

      {problems.length > 0 ? (
        <div className="pl-notice pl-notice--warn" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{problemMessage(problems[0], t)}</span>
        </div>
      ) : (
        <p className="pl-hint">
          {t("theme.contrastOk", {
            ratio: contrastRatio(palette.ink, palette.paper).toFixed(1),
          })}
        </p>
      )}

      {(custom || activePreset) && (
        <button type="button" className="pl-btn pl-btn--quiet pl-btn--sm" onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          {t("theme.reset")}
        </button>
      )}
    </section>
  );
}
