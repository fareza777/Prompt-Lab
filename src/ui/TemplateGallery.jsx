import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
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
import { TEMPLATE_GROUPS, groupTemplates, listTemplates, localized } from "../workTemplates.js";

/**
 * Home: four group cards. Tap a group to open its existing templates.
 * Template names and blurbs stay exactly as defined in the catalogue.
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

/** Only icons already used elsewhere in this file — avoids missing-export crashes. */
const GROUP_ICONS = {
  report: FileText,
  meeting: ClipboardList,
  extract: Table,
  utility: Sparkles,
  custom: Sparkles,
};

function Icon({ name, size = 20 }) {
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
      <ChevronRight size={18} className="pl-tpl-card__chevron" aria-hidden="true" />
    </button>
  );
}

function GroupCard({ group, label, countLabel, onOpen }) {
  const GroupIcon = GROUP_ICONS[group] || FileText;
  return (
    <button type="button" className="pl-group-card" onClick={() => onOpen(group)}>
      <span className="pl-group-card__icon" aria-hidden="true">
        <GroupIcon size={22} />
      </span>
      <span className="pl-group-card__text">
        <strong>{label}</strong>
        <span>{countLabel}</span>
      </span>
      <ChevronRight size={18} className="pl-group-card__chevron" aria-hidden="true" />
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
  const [activeGroup, setActiveGroup] = useState(null);

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

  const homeGroups = useMemo(() => {
    const byId = new Map(groupTemplates(listTemplates()).map((entry) => [entry.group, entry]));
    const rows = TEMPLATE_GROUPS.map((group) => ({
      group,
      templates: byId.get(group)?.templates || [],
    })).filter((entry) => entry.templates.length > 0);
    if (customTemplates.length) {
      rows.push({ group: "custom", templates: customTemplates });
    }
    return rows;
  }, [customTemplates]);

  const activeEntry = useMemo(() => {
    if (!activeGroup) return null;
    if (activeGroup === "custom") {
      return { group: "custom", templates: customTemplates };
    }
    return (
      groupTemplates(listTemplates()).find((entry) => entry.group === activeGroup) || null
    );
  }, [activeGroup, customTemplates]);

  const searching = Boolean(query.trim());

  const openGroup = (group) => {
    setQuery("");
    setActiveGroup(group);
  };

  const goHome = () => {
    setActiveGroup(null);
  };

  return (
    <section className="pl-gallery" aria-labelledby="gallery-title">
      <div className="pl-gallery-head">
        {activeGroup ? (
          <button type="button" className="pl-gallery-back" onClick={goHome}>
            <ChevronLeft size={20} aria-hidden="true" />
            <span>{t(`tpl.group.${activeGroup}`)}</span>
          </button>
        ) : (
          <>
            <h1 id="gallery-title">{t("tpl.galleryTitle")}</h1>
            <p>{t("tpl.gallerySubtitle")}</p>
          </>
        )}
      </div>

      <div className="pl-gallery-search">
        <Search size={16} aria-hidden="true" />
        <input
          className="pl-input"
          type="search"
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            if (next.trim()) setActiveGroup(null);
          }}
          placeholder={t("tpl.search")}
          aria-label={t("tpl.search")}
        />
      </div>

      {searching ? (
        groups.length === 0 ? (
          <p className="pl-empty">{t("tpl.searchEmpty")}</p>
        ) : (
          groups.map(({ group, templates }) => (
            <div className="pl-tpl-group" key={group}>
              <h2 className="pl-eyebrow">{t(`tpl.group.${group}`)}</h2>
              <div className="pl-tpl-grid pl-tpl-grid--list">
                {templates.map((template) => (
                  <TemplateCard key={template.id} template={template} lang={lang} onPick={onPick} />
                ))}
              </div>
            </div>
          ))
        )
      ) : activeGroup && activeEntry ? (
        <div className="pl-tpl-group">
          <div className="pl-tpl-grid pl-tpl-grid--list">
            {activeEntry.templates.map((template) => (
              <TemplateCard key={template.id} template={template} lang={lang} onPick={onPick} />
            ))}
            {activeGroup === "custom" && onNewTemplate ? (
              <button type="button" className="pl-tpl-card pl-tpl-card--new" onClick={onNewTemplate}>
                <span className="pl-tpl-icon">
                  <Plus size={20} aria-hidden="true" />
                </span>
                <strong className="pl-tpl-name">{t("editor.new")}</strong>
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="pl-group-stack">
          {homeGroups.map(({ group, templates }) => (
            <GroupCard
              key={group}
              group={group}
              label={t(`tpl.group.${group}`)}
              countLabel={t("tpl.templateCount", { n: templates.length })}
              onOpen={openGroup}
            />
          ))}
          {onNewTemplate && !customTemplates.length ? (
            <button type="button" className="pl-btn pl-btn--quiet pl-gallery-new" onClick={onNewTemplate}>
              <Plus size={16} aria-hidden="true" />
              {t("editor.new")}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
