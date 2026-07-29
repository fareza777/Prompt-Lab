import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Trash2 } from "lucide-react";
import Sheet from "./Sheet.jsx";
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
    setSelected(toDateKey(now));
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }, [open]);

  const byDate = useMemo(() => groupByDate(items), [items]);
  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const headings = useMemo(() => weekdayLabels(lang), [lang]);
  const dayItems = byDate.get(selected) || [];

  const page = (delta) => setCursor((current) => shiftMonth(current.year, current.month, delta));

  return (
    <Sheet open={open} title={t("cal.title")} closeLabel={t("nav.close")} onClose={onClose}>
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
          {dayItems.map((item) => (
            <li key={item.id} className="pl-cal-item">
              <button type="button" className="pl-cal-open" onClick={() => onOpenItem(item)}>
                <FileText size={16} aria-hidden="true" />
                <span>
                  <strong>{item.title || t("cal.untitled")}</strong>
                  <small>{item.templateName || item.folder || ""}</small>
                </span>
              </button>
              <div className="pl-cal-item-actions">
                {/* Filing a document under the day it actually happened is the
                    common case: people write up on Friday what they did on
                    Tuesday. */}
                <label className="pl-cal-date">
                  <span className="pl-sr-only">{t("cal.changeDate")}</span>
                  <input
                    type="date"
                    value={recordDateKey(item)}
                    onChange={(event) => onChangeDate?.(item.id, event.target.value)}
                  />
                </label>
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
