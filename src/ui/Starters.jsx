import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import Sheet from "./Sheet.jsx";

/**
 * Templates, demoted from a destination to an empty-state suggestion.
 *
 * A short list appears only while the canvas is untouched; the full set moves
 * into a searchable sheet. Nothing here competes with the composer once the
 * user has started writing.
 */

function starterSummary(template) {
  const text = String(template.prompt || "").trim();
  return text.length > 96 ? `${text.slice(0, 93)}…` : text;
}

function StarterRow({ template, onPick, translateCategory }) {
  return (
    <button type="button" className="pl-starter" onClick={() => onPick(template)}>
      <span className="pl-starter-icon" aria-hidden="true">
        <FileText size={17} />
      </span>
      <span className="pl-starter-text">
        <strong>{template.title}</strong>
        <span>
          {translateCategory(template.category)} · {starterSummary(template)}
        </span>
      </span>
    </button>
  );
}

export default function Starters({ t, templates, onPick }) {
  const [allOpen, setAllOpen] = useState(false);
  const [query, setQuery] = useState("");

  const translateCategory = (value) => t(`opt.category.${value}`);

  const preview = useMemo(() => templates.slice(0, 3), [templates]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return templates;
    return templates.filter((template) =>
      `${template.title} ${template.category} ${template.prompt}`.toLowerCase().includes(needle)
    );
  }, [templates, query]);

  const pick = (template) => {
    setAllOpen(false);
    onPick(template);
  };

  if (!templates.length) return null;

  return (
    <section className="pl-starters" aria-labelledby="starters-title">
      <div className="pl-starters-head">
        <h2 className="pl-eyebrow" id="starters-title">
          {t("starters.title")}
        </h2>
        <button
          type="button"
          className="pl-btn pl-btn--quiet pl-btn--sm"
          onClick={() => setAllOpen(true)}
        >
          {t("starters.all")}
        </button>
      </div>

      {preview.map((template) => (
        <StarterRow
          key={template.title}
          template={template}
          onPick={pick}
          translateCategory={translateCategory}
        />
      ))}

      <Sheet
        open={allOpen}
        title={t("starters.title")}
        closeLabel={t("nav.close")}
        onClose={() => setAllOpen(false)}
      >
        <div className="pl-field">
          <label className="pl-label" htmlFor="starter-search">
            {t("starters.search")}
          </label>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--ink-faint)",
              }}
            />
            <input
              id="starter-search"
              className="pl-input"
              style={{ paddingLeft: 36 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("starters.search")}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="pl-empty">{t("starters.empty")}</p>
        ) : (
          <div className="pl-starters">
            {filtered.map((template) => (
              <StarterRow
                key={template.title}
                template={template}
                onPick={pick}
                translateCategory={translateCategory}
              />
            ))}
          </div>
        )}
      </Sheet>
    </section>
  );
}
