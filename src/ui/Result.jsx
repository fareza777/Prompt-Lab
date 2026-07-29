import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Flag,
  Star,
} from "lucide-react";
import { createContentActionPayload } from "./contentRecord.js";
import { groupDocumentSections, parseMarkdownBlocks } from "./markdownBlocks.js";
import { MERMAID_INIT } from "../mermaidConfig.js";
import { rememberRenderedDiagramSvg } from "../diagramSvgStore.js";
import { renderMermaidResilient, sanitizeMermaidCode } from "../mermaidRender.js";
import {
  buildProcessFlowSvg,
  getProcessFlowLayout,
  parseProcessJson,
  processFlowToMermaid,
} from "../processFlow.js";

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

function ProcessFlowBlock({ code, t }) {
  const flow = useMemo(() => parseProcessJson(code), [code]);
  const layout = useMemo(() => (flow ? getProcessFlowLayout(flow) : null), [flow]);
  const svg = useMemo(() => (flow ? buildProcessFlowSvg(flow) : ""), [flow]);

  useEffect(() => {
    if (!flow || !svg) return;
    // Keep SVG in store for .svg download; PNG uses canvas fillText instead.
    rememberRenderedDiagramSvg(svg, processFlowToMermaid(flow));
  }, [flow, svg]);

  if (!flow || !layout) {
    return (
      <pre className="pl-code-block">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <figure className="pl-process-flow">
      <div className="pl-process-flow__canvas" data-pl-diagram="1" data-pl-process="1">
        <div className="pl-process-flow__board">
          <h3 className="pl-process-flow__title">{layout.title}</h3>
          <ol className="pl-process-flow__steps">
            {layout.steps.map((step, index) => {
              const tone =
                index === 0 ? "start" : index === layout.steps.length - 1 ? "end" : "mid";
              return (
                <li key={step.id} className={`pl-process-flow__step pl-process-flow__step--${tone}`}>
                  <div className="pl-process-flow__box">
                    <span className="pl-process-flow__label">{step.label}</span>
                    {step.detail ? (
                      <span className="pl-process-flow__detail">{step.detail}</span>
                    ) : null}
                  </div>
                  {index < layout.steps.length - 1 ? (
                    <span className="pl-process-flow__arrow" aria-hidden="true" />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <p className="pl-meta">{t("result.diagramInfographicHint")}</p>
    </figure>
  );
}

function MermaidBlock({ code, t }) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    setError("");
    const clean = sanitizeMermaidCode(code);

    (async () => {
      try {
        // Degrades through curve and edge-label variants rather than giving up
        // on the first layout error.
        const { svg: rendered } = await renderMermaidResilient(clean, {
          id: `pl-mmd-${reactId}`,
          timeoutMs: 14000,
          init: MERMAID_INIT,
        });
        if (!cancelled) {
          setSvg(rendered);
          rememberRenderedDiagramSvg(rendered, clean);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "render_failed");
          setShowSource(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, reactId]);

  return (
    <figure className="pl-mermaid">
      {svg ? (
        <div
          className="pl-mermaid__canvas"
          data-pl-diagram="1"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : !error ? (
        <p className="pl-meta">{t("result.diagramDrawing")}</p>
      ) : null}
      {error ? <p className="pl-notice pl-notice--quiet">{t("result.diagramError")}</p> : null}
      <button
        type="button"
        className="pl-btn pl-btn--quiet pl-btn--sm"
        onClick={() => setShowSource((value) => !value)}
      >
        {t("result.diagramSource")}
      </button>
      {showSource ? (
        <pre className="pl-code-block">
          <code>{code}</code>
        </pre>
      ) : null}
    </figure>
  );
}

function BlockView({ block, index, t }) {
  const key = `${block.type}-${index}`;
  if (block.type === "heading") {
    const Heading = `h${Math.min(4, Math.max(3, block.level))}`;
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
  if (block.type === "code") {
    if (block.lang === "process") {
      return <ProcessFlowBlock key={key} code={block.text} t={t} />;
    }
    if (block.lang === "mermaid") {
      return <MermaidBlock key={key} code={block.text} t={t} />;
    }
    return (
      <pre className="pl-code-block" key={key}>
        <code>{block.text}</code>
      </pre>
    );
  }
  return <p key={key}>{renderInline(block.text)}</p>;
}

/**
 * The finished document as one continuous page.
 *
 * This replaced a collapsible accordion, which is a chat pattern: it opened the
 * first section and folded the rest away, so a two-page report arrived looking
 * like a list of unread items. A document the user is about to send should be
 * readable top to bottom the moment it appears — that single change is most of
 * what separates "the machine printed some text" from "here is your document".
 *
 * Section grouping is still used, because it carries the heading level that
 * decides whether a title sets as the document title or a section heading.
 */
function DocumentPage({ sections, t }) {
  return (
    <article className="pl-doc pl-doc--output pl-doc--page" aria-label={t("result.sections")}>
      {sections.map((section) => (
        <section key={section.id} className="pl-doc-part">
          {section.title &&
            (section.level === 1 ? (
              <h1>{renderInline(section.title)}</h1>
            ) : (
              <h2>{renderInline(section.title)}</h2>
            ))}
          {section.blocks.map((block, blockIndex) => (
            <BlockView key={`${section.id}-${blockIndex}`} block={block} index={blockIndex} t={t} />
          ))}
        </section>
      ))}
    </article>
  );
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

function ResultActions({
  t,
  output,
  copied,
  onCopy,
  onSave,
  saved,
  onExport,
  canExportWord,
  canExportPpt,
  canExportSheet,
  exportStatus,
  hasDiagram,
}) {
  return (
    <div className="pl-result-toolbar">
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

        {hasDiagram && (
          <>
            <button
              type="button"
              className="pl-btn pl-btn--primary"
              onClick={() => {
                try {
                  window.dispatchEvent(new CustomEvent("pl:open-diagram-sections"));
                } catch {
                  /* ignore */
                }
                window.setTimeout(() => onExport("png", output), 80);
              }}
            >
              <Download size={17} aria-hidden="true" />
              {t("result.exportPng")}
            </button>
            <button
              type="button"
              className="pl-btn"
              onClick={() => {
                try {
                  window.dispatchEvent(new CustomEvent("pl:open-diagram-sections"));
                } catch {
                  /* ignore */
                }
                window.setTimeout(() => onExport("svg", output), 80);
              }}
            >
              <Download size={17} aria-hidden="true" />
              {t("result.exportSvg")}
            </button>
          </>
        )}

        {canExportWord && (
          <button
            type="button"
            className={`pl-btn${hasDiagram ? "" : " pl-btn--primary"}`}
            onClick={() => onExport("docx", output)}
          >
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

        {/* Offered only by templates whose deliverable is a table. */}
        {canExportSheet && (
          <button type="button" className="pl-btn" onClick={() => onExport("xlsx", output)}>
            <Download size={17} aria-hidden="true" />
            {t("tpl.exportXlsx")}
          </button>
        )}
      </div>
      {hasDiagram && <p className="pl-meta">{t("result.exportDiagramHint")}</p>}
      {exportStatus && (
        <p className="pl-meta" role="status">
          {exportStatus}
        </p>
      )}
    </div>
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
  canExportSheet,
  exportStatus,
  onReport,
  runOutput,
  isRunning,
  runError,
  onStartOver,
}) {
  const output = String(runOutput || "").trim();
  // While text is still arriving the document is re-parsed on every delta, and
  // half-written fences would send Mermaid into repeated failed renders. The
  // rich view is therefore built only once the run has finished.
  const streaming = isRunning && Boolean(output);
  const sections = useMemo(
    () => (streaming ? [] : groupDocumentSections(parseMarkdownBlocks(output))),
    [output, streaming]
  );
  const hasDiagram = useMemo(
    () =>
      /```process/i.test(output) ||
      /```mermaid/i.test(output) ||
      /^(flowchart|sequenceDiagram|classDiagram|erDiagram|mindmap|graph)\b/im.test(output),
    [output]
  );

  if (isGenerating) {
    return <Working title={t("result.working")} hint={t("result.workingHint")} />;
  }

  // Nothing has arrived yet, so there is only the wait to show.
  if (isRunning && !output) {
    return <Working title={t("result.runWorking")} hint={t("result.runWorkingHint")} />;
  }

  // Text is arriving: show it growing rather than hiding it behind a spinner.
  // The whole point of streaming is that the user stops staring at nothing.
  if (streaming) {
    return (
      <section className="pl-result" aria-label={t("result.title")} aria-busy="true">
        <header className="pl-result-head">
          <div>
            <p className="pl-eyebrow">{t("result.eyebrow")}</p>
            <h2>{t("result.title")}</h2>
          </div>
          <span className="pl-result-status pl-result-status--live">
            <span className="pl-spinner" aria-hidden="true" />
            {t("result.streaming")}
          </span>
        </header>
        <div className="pl-doc pl-doc--streaming" aria-live="polite">
          {output}
        </div>
      </section>
    );
  }

  if (!output && !runError) return null;

  return (
    <section className="pl-result" aria-label={t("result.title")}>
      {/* A failed run must not be dressed as a finished one. Announcing
          "Ready to continue / Done" above an error message is how the failure
          screen read before: as though work had been delivered. */}
      <header className="pl-result-head">
        <div>
          <p className="pl-eyebrow">{t("result.eyebrow")}</p>
          <h2>{output ? t("result.title") : t("result.failedTitle")}</h2>
        </div>
        {output && <span className="pl-result-status">{t("result.ready")}</span>}
      </header>

      {output && (
        <ResultActions
          t={t}
          output={output}
          copied={copied}
          onCopy={onCopy}
          onSave={onSave}
          saved={saved}
          onExport={onExport}
          canExportWord={canExportWord}
          canExportPpt={canExportPpt}
          canExportSheet={canExportSheet}
          exportStatus={exportStatus}
          hasDiagram={hasDiagram}
        />
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
          <DocumentPage sections={sections} t={t} />
        </>
      )}

      {onStartOver && output && (
        <button type="button" className="pl-btn pl-btn--block" onClick={onStartOver}>
          {t("tpl.startOver")}
        </button>
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
