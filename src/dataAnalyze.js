// DuckDB-Wasm runs SQL over spreadsheet attachments entirely in the browser —
// nothing is uploaded, and the whole engine stays in a lazy chunk so the
// initial bundle never pays for it.

const SPREADSHEET_RE = /\.(csv|tsv|xlsx|xls)$/i;
const MAX_ANALYZE_BYTES = 25 * 1024 * 1024;
const MAX_TOP_VALUES = 3;
const MAX_SAMPLE_COLS = 24;

export function isSpreadsheetAttachment(item) {
  const name = String(item?.name || "");
  const type = String(item?.type || "");
  return SPREADSHEET_RE.test(name) || type === "text/csv" || type.includes("spreadsheetml");
}

export function isSupportedSpreadsheet(item) {
  return isSpreadsheetAttachment(item) && (item?.file?.size || 0) <= MAX_ANALYZE_BYTES;
}

// Split a CSV line on commas that are not inside double quotes. DuckDB does the
// heavy parsing inside SQL; this only powers header/name fallbacks.
export function splitCsvLine(line) {
  const out = [];
  const text = String(line);
  let current = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else quoted = false;
      } else current += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(current);
      current = "";
    } else current += ch;
  }
  out.push(current);
  return out;
}

// Column names come from user files — always double-quote them into SQL.
export function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

const NUMERIC_TYPES = /^(tinyint|smallint|integer|bigint|hugeint|utinyint|usmallint|uinteger|ubigint|float|double|decimal|real|numeric)/i;
const DATE_TYPES = /^(date|time|timestamp|interval)/i;

export function columnStatsSql(columnName, columnType) {
  const col = quoteIdent(columnName);
  if (NUMERIC_TYPES.test(columnType)) {
    return `SELECT count(*) AS total, count(${col}) AS non_null, ` +
      `approx_count_distinct(${col}) AS distinct_count, ` +
      `min(${col})::VARCHAR AS min_v, max(${col})::VARCHAR AS max_v, ` +
      `round(avg(${col})::DOUBLE, 4)::VARCHAR AS mean_v FROM t`;
  }
  if (DATE_TYPES.test(columnType)) {
    return `SELECT count(*) AS total, count(${col}) AS non_null, ` +
      `approx_count_distinct(${col}) AS distinct_count, ` +
      `min(${col})::VARCHAR AS min_v, max(${col})::VARCHAR AS max_v, ` +
      `NULL AS mean_v FROM t`;
  }
  return `SELECT count(*) AS total, count(${col}) AS non_null, ` +
    `approx_count_distinct(${col}) AS distinct_count, ` +
    `NULL AS min_v, NULL AS max_v, NULL AS mean_v FROM t`;
}

export function topValuesSql(columnName, limit = MAX_TOP_VALUES) {
  const col = quoteIdent(columnName);
  return `SELECT CAST(${col} AS VARCHAR) AS v, count(*) AS c FROM t ` +
    `WHERE ${col} IS NOT NULL GROUP BY 1 ORDER BY c DESC LIMIT ${Math.max(1, limit)}`;
}

// Pure markdown builder — unit-tested without the wasm engine.
export function buildAnalysisMarkdown({ sourceName, rowCount, columns }) {
  const lines = [
    `# Profil data — ${sourceName}`,
    "",
    `${rowCount.toLocaleString("id-ID")} baris · ${columns.length} kolom`,
    "",
  ];
  for (const col of columns) {
    const parts = [`non-null ${col.nonNull}`, `unik ${col.distinct}`];
    if (col.min != null && col.max != null) parts.push(`rentang ${col.min}–${col.max}`);
    if (col.mean != null) parts.push(`rata-rata ${col.mean}`);
    lines.push(`- **${col.name}** (${col.type}): ${parts.join(" · ")}`);
    if (col.topValues?.length) {
      lines.push(
        `  nilai teratas: ${col.topValues.map((tv) => `${tv.value} (${tv.count}×)`).join(", ")}`
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

let dbPromise = null;

async function loadDuckDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const duckdb = await import("@duckdb/duckdb-wasm");
      const [wasm, worker] = await Promise.all([
        import("@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url"),
        import("@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?worker"),
      ]);
      const mvp = { mainModule: wasm.default, mainWorker: worker.default };
      // MVP only: the eh bundle needs cross-origin isolation (SharedArrayBuffer),
      // which the app deliberately doesn't enable.
      const bundle = await duckdb.selectBundle({ mvp, eh: mvp });
      const db = new duckdb.AsyncDuckDB(
        new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING),
        new bundle.mainWorker()
      );
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function fileToCsvText(file) {
  if (/\.(csv|tsv)$/i.test(file.name || "") || file.type === "text/csv") {
    return { csv: await file.text(), source: "csv" };
  }
  // XLSX goes through SheetJS (also lazy) — first sheet only.
  const XLSX = await import("xlsx");
  const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const first = book.SheetNames[0];
  if (!first) throw new Error("Spreadsheet has no sheets");
  return { csv: XLSX.utils.sheet_to_csv(book.Sheets[first]), source: "xlsx" };
}

function rows(result) {
  return result?.toArray ? result.toArray().map((row) => row.toJSON()) : [];
}

/**
 * Profile one spreadsheet attachment with DuckDB-Wasm and return the summary as
 * a markdown File that flows through the normal attachment pipeline.
 */
export async function analyzeSpreadsheetAttachment(item) {
  const file = item?.file;
  if (!file) throw new Error("Missing file");
  if (file.size > MAX_ANALYZE_BYTES) {
    throw new Error(`File too large to analyze locally (max ${Math.round(MAX_ANALYZE_BYTES / 1048576)} MB)`);
  }

  const { csv, source } = await fileToCsvText(file);
  const db = await loadDuckDb();
  const conn = await db.connect();
  try {
    await db.registerFileText("source.csv", csv);
    await conn.query(
      `CREATE OR REPLACE TABLE t AS SELECT * FROM read_csv_auto('source.csv', header=true)`
    );

    const totalRows = Number(rows(await conn.query("SELECT count(*) AS c FROM t"))[0]?.c || 0);
    const described = rows(await conn.query("DESCRIBE t")).slice(0, MAX_SAMPLE_COLS);

    const columns = [];
    for (const d of described) {
      const name = String(d.column_name);
      const type = String(d.column_type);
      const stat = rows(await conn.query(columnStatsSql(name, type)))[0] || {};
      const entry = {
        name,
        type,
        nonNull: Number(stat.non_null || 0),
        distinct: Number(stat.distinct_count || 0),
        min: stat.min_v,
        max: stat.max_v,
        mean: stat.mean_v,
        topValues: [],
      };
      if (!NUMERIC_TYPES.test(type) && !DATE_TYPES.test(type)) {
        entry.topValues = rows(await conn.query(topValuesSql(name))).map((row) => ({
          value: String(row.v).slice(0, 60),
          count: Number(row.c || 0),
        }));
      }
      columns.push(entry);
    }

    const markdown = buildAnalysisMarkdown({
      sourceName: item.name,
      rowCount: totalRows,
      columns,
    });
    const stamp = item.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-") || "data";
    return new File([markdown], `${stamp}-profil.md`, { type: "text/markdown" });
  } finally {
    await conn.close().catch(() => {});
    void source;
  }
}
