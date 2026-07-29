/**
 * Date handling for the calendar view.
 *
 * Kept free of React so the arithmetic can be tested directly — off-by-one
 * errors in a month grid are invisible until someone's report lands on the
 * wrong day, and a report filed under the wrong date is worse than no report.
 *
 * Everything works in the device's local time. A document made at 23:30 must
 * appear on that evening's date, not tomorrow's, which is what UTC keys would
 * produce for anyone east of Greenwich — including every user in Indonesia.
 */

const pad = (value) => String(value).padStart(2, "0");

/** "YYYY-MM-DD" in local time. */
export function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A local Date at midnight from a "YYYY-MM-DD" key. */
export function fromDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The day a record belongs to.
 *
 * `activityDate` wins over `createdAt` because the two differ constantly in
 * practice: people write up Tuesday's site visit on Friday, and the report has
 * to file under Tuesday for the calendar to be worth opening.
 */
export function recordDateKey(record) {
  const explicit = String(record?.activityDate || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  return toDateKey(record?.createdAt || record?.updatedAt || Date.now());
}

/** Records grouped by day key, newest first within each day. */
export function groupByDate(records = []) {
  const map = new Map();
  for (const record of records) {
    const key = recordDateKey(record);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  return map;
}

/**
 * Six weeks of cells covering the month, padded with neighbouring days.
 *
 * A fixed six-week grid keeps the calendar from changing height as the user
 * pages through months, which otherwise makes the whole screen jump.
 */
export function buildMonthGrid(year, month, { weekStartsOn = 1 } = {}) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(year, month, 1 - offset);

  const weeks = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + day);
      days.push({
        date,
        key: toDateKey(date),
        day: date.getDate(),
        inMonth: date.getMonth() === month && date.getFullYear() === year,
      });
    }
    weeks.push(days);
  }
  return weeks;
}

/** Month shifted by `delta`, without the day-31 overflow of setMonth. */
export function shiftMonth(year, month, delta) {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function monthLabel(year, month, language = "id") {
  return new Date(year, month, 1).toLocaleDateString(language === "en" ? "en-GB" : "id-ID", {
    month: "long",
    year: "numeric",
  });
}

export function dayLabel(key, language = "id") {
  const date = fromDateKey(key);
  if (!date) return "";
  return date.toLocaleDateString(language === "en" ? "en-GB" : "id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Weekday initials in grid order, from the runtime's own locale data. */
export function weekdayLabels(language = "id", weekStartsOn = 1) {
  const locale = language === "en" ? "en-GB" : "id-ID";
  // 2024-01-01 was a Monday, so it anchors the sequence without hardcoding names.
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 1 + ((index + weekStartsOn - 1 + 7) % 7));
    return date.toLocaleDateString(locale, { weekday: "short" });
  });
}
