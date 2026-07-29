import { useMemo, useState } from "react";
import {
  ClipboardList,
  FileSearch,
  FileText,
  Grid3x3,
  Images,
  Languages,
  ListChecks,
  Mail,
  MapPin,
  Megaphone,
  Plane,
  Plus,
  Presentation,
  ScrollText,
  Search,
  Sparkles,
  Table,
  Users,
  Workflow,
} from "lucide-react";
import { groupTemplates, listTemplates, localized } from "../workTemplates.js";

/**
 * The first screen: pick the job.
 *
 * Choosing up front is what lets every downstream step be specific — the
 * instruction, the section skeleton, the length, and which export buttons the
 * result offers. A card grid rather than a list because the icon and the one
 * line of blurb are what make the choice obvious at a glance.
 */

/**
 * Named explicitly rather than resolved from the whole lucide namespace: a
 * wildcard import defeats tree-shaking and pulls every icon into the bundle,
 * which the build's size gate would reject.
 */
const ICONS = {
  ClipboardList,
  FileSearch,
  FileText,
  Grid3x3,
  Images,
  Languages,
  ListChecks,
  Mail,
  MapPin,
  Megaphone,
  Plane,
  Presentation,
  ScrollText,
  Sparkles,
  Table,
  Users,
  Workflow,
};

function Icon({ name, size = 20 }) {
  // An unknown name must not blank the card; the generic document icon stands in.
  const Component = ICONS[name] || FileText;
  return <Component size={size} aria-hidden="true" />;
}

function TemplateCard({ template, lang, onPick }) {
  return (
    <button type="button" className="pl-tpl-card" onClick={() => onPick(template)}>
      <span className="pl-tpl-icon">
        <Icon name={template.icon} />
      </span>
      <strong className="pl-tpl-name">{localized(template.name, lang)}</strong>
      <span className="pl-tpl-blurb">{localized(template.blurb, lang)}</span>
    </button>
  );
}

export default function TemplateGallery({
  t,
  lang,
  onPick,
  customTemplates = [],
  onNewTemplate,
}) {
  const [query, setQuery] = useState("");

  const all = useMemo(() => [...listTemplates(), ...customTemplates], [customTemplates]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((template) =>
      `${localized(template.name, lang)} ${localized(template.blurb, lang)}`
        .toLowerCase()
        .includes(needle)
    );
  }, [all, query, lang]);

  const groups = useMemo(() => {
    const grouped = groupTemplates(matches.filter((template) => !template.custom));
    const mine = matches.filter((template) => template.custom);
    return mine.length ? [...grouped, { group: "custom", templates: mine }] : grouped;
  }, [matches]);

  return (
    <section className="pl-gallery" aria-labelledby="gallery-title">
      <div className="pl-gallery-head">
        <h1 id="gallery-title">{t("tpl.galleryTitle")}</h1>
        <p>{t("tpl.gallerySubtitle")}</p>
      </div>

      <div className="pl-gallery-search">
        <Search size={16} aria-hidden="true" />
        <input
          className="pl-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("tpl.search")}
          aria-label={t("tpl.search")}
        />
      </div>

      {groups.length === 0 ? (
        <p className="pl-empty">{t("tpl.searchEmpty")}</p>
      ) : (
        groups.map(({ group, templates }) => (
          <div className="pl-tpl-group" key={group}>
            <h2 className="pl-eyebrow">{t(`tpl.group.${group}`)}</h2>
            <div className="pl-tpl-grid">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} lang={lang} onPick={onPick} />
              ))}
              {group === "custom" && onNewTemplate && (
                <button type="button" className="pl-tpl-card pl-tpl-card--new" onClick={onNewTemplate}>
                  <span className="pl-tpl-icon">
                    <Plus size={20} aria-hidden="true" />
                  </span>
                  <strong className="pl-tpl-name">{t("editor.new")}</strong>
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {/* When nothing custom exists yet there is no "My templates" group to
          hang the button on, so it is offered once at the end instead. */}
      {onNewTemplate && !customTemplates.length && (
        <button type="button" className="pl-btn pl-btn--quiet pl-gallery-new" onClick={onNewTemplate}>
          <Plus size={16} aria-hidden="true" />
          {t("editor.new")}
        </button>
      )}
    </section>
  );
}
