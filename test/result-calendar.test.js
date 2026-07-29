import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMonthGrid,
  fromDateKey,
  groupByDate,
  recordDateKey,
  shiftMonth,
  toDateKey,
  weekdayLabels,
} from "../src/ui/resultCalendar.js";

test("date keys are local, not UTC", () => {
  // Indonesia is UTC+7..+9. toISOString() on a late-evening timestamp rolls
  // over to the next day there, filing the document under the wrong date.
  const lateEvening = new Date(2026, 6, 29, 23, 30, 0);
  assert.equal(toDateKey(lateEvening), "2026-07-29");

  const earlyMorning = new Date(2026, 0, 1, 0, 15, 0);
  assert.equal(toDateKey(earlyMorning), "2026-01-01");
});

test("a key round-trips through a local midnight Date", () => {
  const date = fromDateKey("2026-02-28");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 1);
  assert.equal(date.getDate(), 28);
  assert.equal(toDateKey(date), "2026-02-28");
  assert.equal(fromDateKey("not-a-date"), null);
  assert.equal(fromDateKey(""), null);
});

test("the activity date wins over when the document was written", () => {
  // Someone writes up Tuesday's visit on Friday; it has to file under Tuesday.
  const record = {
    activityDate: "2026-07-21",
    createdAt: new Date(2026, 6, 24, 9, 0, 0).getTime(),
  };
  assert.equal(recordDateKey(record), "2026-07-21");

  // Without one, the creation time is used.
  assert.equal(
    recordDateKey({ createdAt: new Date(2026, 6, 24, 9, 0, 0).getTime() }),
    "2026-07-24"
  );
  // A malformed value must not be trusted into the grid.
  assert.equal(
    recordDateKey({ activityDate: "24/07/2026", createdAt: new Date(2026, 6, 24).getTime() }),
    "2026-07-24"
  );
});

test("records group by day, newest first inside each day", () => {
  const records = [
    { id: "a", createdAt: new Date(2026, 6, 20, 8, 0).getTime() },
    { id: "b", createdAt: new Date(2026, 6, 20, 16, 0).getTime() },
    { id: "c", activityDate: "2026-07-18", createdAt: new Date(2026, 6, 25).getTime() },
  ];
  const grouped = groupByDate(records);
  assert.deepEqual(
    grouped.get("2026-07-20").map((r) => r.id),
    ["b", "a"]
  );
  assert.deepEqual(
    grouped.get("2026-07-18").map((r) => r.id),
    ["c"]
  );
  assert.equal(grouped.size, 2);
});

test("the month grid always has six weeks and starts on the right weekday", () => {
  // July 2026 starts on a Wednesday.
  const grid = buildMonthGrid(2026, 6);
  assert.equal(grid.length, 6);
  assert.ok(grid.every((week) => week.length === 7));

  // Monday-first, so the row begins on 29 June.
  assert.equal(grid[0][0].key, "2026-06-29");
  assert.equal(grid[0][0].inMonth, false);
  assert.equal(grid[0][2].key, "2026-07-01");
  assert.equal(grid[0][2].inMonth, true);

  const inMonth = grid.flat().filter((cell) => cell.inMonth);
  assert.equal(inMonth.length, 31);
  assert.equal(inMonth[30].key, "2026-07-31");
});

test("a month starting exactly on the first weekday is not padded by a blank week", () => {
  // June 2026 starts on a Monday; the first cell must be 1 June, not 25 May.
  const grid = buildMonthGrid(2026, 5);
  assert.equal(grid[0][0].key, "2026-06-01");
  assert.equal(grid[0][0].inMonth, true);
});

test("February in a leap year keeps all 29 days", () => {
  const inMonth = buildMonthGrid(2024, 1)
    .flat()
    .filter((cell) => cell.inMonth);
  assert.equal(inMonth.length, 29);
  assert.equal(inMonth[28].key, "2024-02-29");
});

test("paging months does not overflow on long months", () => {
  // setMonth(-1) on 31 March lands on 3 March; the arithmetic here must not.
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 2, -14), { year: 2025, month: 0 });
  assert.deepEqual(shiftMonth(2026, 6, 0), { year: 2026, month: 6 });
});

test("a finished document is filed without the user pressing save", async () => {
  const { readFile } = await import("node:fs/promises");
  const main = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
  // The calendar is only worth opening if nothing had to be remembered.
  assert.match(main, /function fileTemplateResult/);
  assert.match(main, /fileTemplateResult\(template, content, note, language\)/);
  assert.match(main, /activityDate: toDateKey\(new Date\(\)\)/);
  assert.match(main, /templateId: template\.id/);
  // A heading that is merely the template's first required section is not a
  // title: it filed every set of minutes under "Identitas Rapat".
  assert.match(main, /const sectionNames = new Set\(/);
  assert.match(main, /!sectionNames\.has\(heading\.toLowerCase\(\)\)/);
  // And it must be movable afterwards.
  assert.match(main, /function setResultDate/);
  assert.match(main, /\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/);
});

test("reopening a filed document restores its template, not just its text", async () => {
  const { readFile } = await import("node:fs/promises");
  const shell = await readFile(new URL("../src/ui/Shell.jsx", import.meta.url), "utf8");
  // Without the template the export row would be wrong: a recap must still
  // offer Excel weeks later.
  assert.match(shell, /getTemplate\(item\.templateId\)/);
  assert.match(shell, /if \(template\) setActiveTemplate\(template\)/);
  // Custom templates live outside the built-in registry and must resolve too.
  assert.match(shell, /userTemplates\.find\(\(candidate\) => candidate\.id === item\.templateId\)/);
  assert.match(shell, /open=\{sheet === "calendar"\}/);
  assert.match(shell, /onChangeDate=\{setResultDate\}/);
  // Only finished documents belong on a calendar of work done.
  assert.match(shell, /item\.contentType === "output"/);
});

test("weekday headings line up with the grid's first column", () => {
  const labels = weekdayLabels("en", 1);
  assert.equal(labels.length, 7);
  assert.match(labels[0], /^Mon/i);
  assert.match(labels[6], /^Sun/i);
});
