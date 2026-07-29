import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
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
  Search,
  Sparkles,
  Table,
  Trash2,
  Users,
  Workflow,
} from "lucide-react";
import Sheet from "./Sheet.jsx";
import { getTemplate } from "../workTemplates.js";

/** Named explicitly so the icon set stays tree-shakeable. */
const ROW_ICONS = {
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
import {
  buildMonthGrid,
  dayLabel,
  groupByDate,
  monthLabel,
  recordDateKey,
  shiftMonth,
  toDateKey,
  weekdayLabels,
} from "./resultCalendar.js";

/**
 * Everything produced, arranged by the day it belongs to.
 *
 * This is what makes the app worth reopening: a document written today is
 * findable in three weeks without remembering its name. Picking a day and
 * seeing what happened is the whole interaction, so the month grid does
 * nothing except point at days that have something.
 */

function DayCell({ cell, count, selected, today, onSelect, t }) {
  const state = [
    cell.inMonth ? "" : "is-outside",
    selected ? "is-selected" : "",
    today ? "is-today" : "",
    count ? "has-items" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={`pl-cal-day ${state}`}
      onClick={() => onSelect(cell.key)}
      aria-pressed={selected}
      aria-label={count ? t("cal.dayWithCount", { date: cell.key, n: count }) : cell.key}
    >
      <span>{cell.day}</span>
      {count > 0 && <span className="pl-cal-dot" aria-hidden="true" />}
    </button>
  );
}

/**
 * Moves a document to the day the work actually happened.
 *
 * The native picker is opened from the icon so the row shows a topic and
 * nothing else. showPicker is the supported route in current Chrome and the
 * Android WebView; clicking the input is the fallback everywhere else.
 */
/** The icon of the template a document came from, falling back to a page. */
function TemplateIcon({ templateId }) {
  const name = getTemplate(templateId)?.icon;
  const Icon = ROW_ICONS[name] || FileText;
  return <Icon size={16} aria-hidden="true" />;
}

function MoveDate({ item, t, onChangeDate }) {
  const ref = useRef(null);

  return (
    <>
      <button
        type="button"
        className="pl-icon-btn"
        onClick={() => {
          const input = ref.current;
          if (!input) return;
          if (typeof input.showPicker === "function") input.showPicker();
          else input.click();
        }}
        aria-label={t("cal.changeDate")}
      >
        <CalendarClock size={16} aria-hidden="true" />
      </button>
      <input
        ref={ref}
        className="pl-sr-only"
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={recordDateKey(item)}
        onChange={(event) => onChangeDate?.(item.id, event.target.value)}
      />
    </>
  );
}

export default function Calendar({
  t,
  lang,
  open,
  onClose,
  items = [],
  onOpenItem,
  onDelete,
  onChangeDate,
}) {
  const todayKey = toDateKey(new Date());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(todayKey);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Reopening should land on today rather than wherever the user paged to
  // during a previous visit.
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setQuery("");
    setSelected(toDateKey(now));
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }, [open]);

  /**
   * Search across titles and document bodies.
   *
   * Picking days one at a time stops working somewhere around forty documents,
   * and the thing a person remembers is a phrase from inside the report, not
   * the date they filed it. Matching the body — which for a photographed
   * document is the text read out of it — is what makes the archive usable.
   */
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.title || ""} ${item.templateName || ""} ${item.output || item.content || ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [items, query]);

  const byDate = useMemo(() => groupByDate(matches), [matches]);
  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const headings = useMemo(() => weekdayLabels(lang), [lang]);
  const dayItems = byDate.get(selected) || [];

  const page = (delta) => setCursor((current) => shiftMonth(current.year, current.month, delta));

  return (
    <Sheet open={open} title={t("cal.title")} closeLabel={t("nav.close")} onClose={onClose}>
      <div className="pl-gallery-search">
        <Search size={16} aria-hidden="true" />
        <input
          className="pl-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("cal.search")}
          aria-label={t("cal.search")}
        />
      </div>

      {query.trim() && (
        <p className="pl-hint">{t("cal.searchCount", { n: matches.length })}</p>
      )}

      <div className="pl-cal-head">
        <button
          type="button"
          className="pl-icon-btn"
          onClick={() => page(-1)}
          aria-label={t("cal.prevMonth")}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <strong>{monthLabel(cursor.year, cursor.month, lang)}</strong>
        <button
          type="button"
          className="pl-icon-btn"
          onClick={() => page(1)}
          aria-label={t("cal.nextMonth")}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="pl-cal-grid" role="grid" aria-label={t("cal.title")}>
        {headings.map((label) => (
          <div className="pl-cal-heading" key={label} role="columnheader">
            {label}
          </div>
        ))}
        {grid.flat().map((cell) => (
          <DayCell
            key={cell.key}
            cell={cell}
            count={(byDate.get(cell.key) || []).length}
            selected={cell.key === selected}
            today={cell.key === todayKey}
            onSelect={setSelected}
            t={t}
          />
        ))}
      </div>

      <h3 className="pl-eyebrow pl-cal-daytitle">{dayLabel(selected, lang)}</h3>

      {dayItems.length === 0 ? (
        <p className="pl-empty">{t("cal.empty")}</p>
      ) : (
        <ul className="pl-cal-list">
          {/* Only the topic. The day is already the heading above this list,
              so repeating the date in every row was noise, and the template
              name told the user nothing they had not just chosen. */}
          {dayItems.map((item) => (
            <li key={item.id} className="pl-cal-item">
              <button type="button" className="pl-cal-open" onClick={() => onOpenItem(item)}>
                {/* The template's own icon, so a day's list can be read at a
                    glance rather than by reading every title. */}
                <TemplateIcon templateId={item.templateId} />
                <strong>{item.title || t("cal.untitled")}</strong>
              </button>
              <div className="pl-cal-item-actions">
                {/* Re-dating stays reachable — people write up on Friday what
                    they did on Tuesday — but the input itself is off-screen
                    and opened from the icon, so the row stays clean. */}
                <MoveDate item={item} t={t} onChangeDate={onChangeDate} />
                <button
                  type="button"
                  className="pl-icon-btn"
                  onClick={() => onDelete?.(item.id)}
                  aria-label={t("cal.delete")}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="pl-hint">
        <Download size={14} aria-hidden="true" /> {t("cal.openHint")}
      </p>
    </Sheet>
  );
}
