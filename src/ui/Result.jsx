import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Flag,
  Star,
} from "lucide-react";
import { createContentActionPayload } from "./contentRecord.js";
import { parseMarkdownBlocks } from "./markdownBlocks.js";

function renderInline(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${index}-${part}`}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={`${index}-${part}`}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
}

function DocumentOutput({ content }) {
  const blocks = parseMarkdownBlocks(content);

  return blocks.map((block, index) => {
    const key = `${block.type}-${index}`;
    if (block.type === "heading") {
      const Heading = `h${Math.min(4, block.level)}`;
      return <Heading key={key}>{renderInline(block.text)}</Heading>;
    }
    if (block.type === "list") {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List key={key}>
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </List>
      );
    }
    if (block.type === "table") {
      return (
        <div className="pl-doc-table-wrap" key={key}>
          <table>
            <thead>
              <tr>
                {block.headers.map((header, cellIndex) => (
                  <th key={`${key}-head-${cellIndex}`}>{renderInline(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${key}-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${key}-${rowIndex}-${cellIndex}`}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (block.type === "quote") {
      return <blockquote key={key}>{renderInline(block.text)}</blockquote>;
    }
    return <p key={key}>{renderInline(block.text)}</p>;
  });
}

function Elapsed() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const minutes = String(Math.floor(seconds / 60)).padStart(1, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  return <time dateTime={`PT${seconds}S`}>{`${minutes}:${remainder}`}</time>;
}

function Working({ title, hint }) {
  return (
    <section className="pl-result pl-result--working" aria-live="polite">
      <div className="pl-working">
        <div className="pl-working-head">
          <span className="pl-spinner" aria-hidden="true" />
          <strong>{title}</strong>
          <Elapsed />
        </div>
        <span className="pl-working-track" aria-hidden="true">
          <i />
        </span>
        <div className="pl-document-skeleton" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <p>{hint}</p>
      </div>
    </section>
  );
}

export default function Result({
  t,
  isGenerating,
  copied,
  onCopy,
  onSave,
  saved,
  onExport,
  canExportWord,
  canExportPpt,
  exportStatus,
  onReport,
  runOutput,
  isRunning,
  runError,
}) {
  const output = String(runOutput || "").trim();

  if (isGenerating) {
    return <Working title={t("result.working")} hint={t("result.workingHint")} />;
  }

  if (isRunning) {
    return <Working title={t("result.runWorking")} hint={t("result.runWorkingHint")} />;
  }

  if (!output && !runError) return null;

  return (
    <section className="pl-result" aria-label={t("result.title")}>
      <header className="pl-result-head">
        <div>
          <p className="pl-eyebrow">{t("result.eyebrow")}</p>
          <h2>{t("result.title")}</h2>
        </div>
        <span className="pl-result-status">{t("result.ready")}</span>
      </header>

      {output && (
        <article className="pl-doc pl-doc--output" aria-live="polite">
          <DocumentOutput content={output} />
        </article>
      )}

      {runError && (
        <div className="pl-notice pl-notice--danger" role="alert">
          {runError}
        </div>
      )}

      {output && (
        <>
          <p className="pl-notice pl-notice--quiet">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{t("result.aiNotice")}</span>
          </p>

          <div className="pl-actions pl-actions--primary">
            <button type="button" className="pl-btn" onClick={() => onCopy(output)}>
              {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
              {copied ? t("result.copied") : t("result.copy")}
            </button>

            <button
              type="button"
              className="pl-btn"
              onClick={() => onSave(createContentActionPayload("output", output))}
            >
              <Star size={17} aria-hidden="true" />
              {saved ? t("result.saved") : t("result.save")}
            </button>

            {canExportWord && (
              <button type="button" className="pl-btn" onClick={() => onExport("docx", output)}>
                <Download size={17} aria-hidden="true" />
                {t("result.exportWord")}
              </button>
            )}

            {canExportPpt && (
              <button type="button" className="pl-btn" onClick={() => onExport("pptx", output)}>
                <Download size={17} aria-hidden="true" />
                {t("result.exportPpt")}
              </button>
            )}
          </div>
        </>
      )}

      {exportStatus && (
        <p className="pl-meta" role="status">
          {exportStatus}
        </p>
      )}

      <button
        type="button"
        className="pl-btn pl-btn--quiet pl-btn--sm pl-report-action"
        onClick={() => onReport(createContentActionPayload("output", output))}
      >
        <Flag size={15} aria-hidden="true" />
        {t("result.report")}
      </button>
    </section>
  );
}
