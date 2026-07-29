import { useId, useMemo } from "react";
import { ArrowLeft, ImagePlus, Paperclip, Sparkles, X } from "lucide-react";
import { acceptFor, localized, validateTemplateInput } from "../workTemplates.js";

/**
 * The second screen: supply the material for the chosen template.
 *
 * Only what this particular template needs is shown — a comparison asks for
 * two photos, a summary asks for a document, minutes accept a pasted
 * transcript instead of any file at all. The old composer asked everyone for
 * the same four things and left them to work out which mattered.
 */

/** Turns a validation code into the sentence the user should read. */
function requirementMessage(problem, t) {
  if (!problem) return "";
  switch (problem.code) {
    case "need_images":
      return t("tpl.needImages", { n: problem.need });
    case "need_files":
      return t("tpl.needFiles", { n: problem.need });
    case "need_source":
      return t("tpl.needSource");
    case "need_note":
      return t("tpl.needNote");
    case "too_many":
      return t("tpl.tooMany", { n: problem.max });
    default:
      return "";
  }
}

export default function TemplateWorkbench({
  t,
  lang,
  template,
  attachments,
  addAttachments,
  removeAttachment,
  note,
  setNote,
  onGenerate,
  onBack,
  isBusy,
  errorMessage,
  disabled,
  disabledReason,
}) {
  const noteId = useId();
  const spec = template.input.attachments;
  const noteSpec = template.input.note || { mode: "optional" };
  const photosOnly = spec.kinds.length === 1 && spec.kinds[0] === "image";

  const problem = useMemo(
    () => validateTemplateInput(template, { attachments, note }),
    [template, attachments, note]
  );

  const canGenerate = !problem && !isBusy && !disabled;
  // The requirement is guidance while the form is being filled, not an error;
  // it only turns into a blocking message once something is actually wrong
  // beyond "nothing supplied yet".
  const hint = requirementMessage(problem, t);

  return (
    <section className="pl-bench" aria-labelledby="bench-title">
      <div className="pl-bench-head">
        <button type="button" className="pl-btn pl-btn--quiet pl-btn--sm" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          {t("tpl.change")}
        </button>
      </div>

      <div className="pl-bench-title">
        <h1 id="bench-title">{localized(template.name, lang)}</h1>
        <p>{localized(template.blurb, lang)}</p>
      </div>

      {spec.max > 0 && (
        <div className="pl-bench-block">
          <h2 className="pl-eyebrow">{t("tpl.attachTitle")}</h2>

          {attachments.length > 0 && (
            <ul className="pl-files">
              {attachments.map((file) => (
                <li className="pl-file" key={file.id}>
                  <Paperclip size={15} aria-hidden="true" />
                  <span className="pl-file-name">{file.name}</span>
                  <button
                    type="button"
                    className="pl-icon-btn"
                    style={{ width: 32, height: 32 }}
                    onClick={() => removeAttachment(file.id)}
                    aria-label={t("canvas.removeFile", { name: file.name })}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="pl-attach pl-attach--block">
            <input
              type="file"
              multiple
              accept={acceptFor(template)}
              disabled={isBusy || attachments.length >= spec.max}
              onChange={(event) => {
                addAttachments(event.target.files);
                event.target.value = "";
              }}
            />
            <ImagePlus size={18} aria-hidden="true" />
            <span>{photosOnly ? t("tpl.attachPhotos") : t("tpl.attachFiles")}</span>
          </label>
        </div>
      )}

      <div className="pl-bench-block">
        <label className="pl-label" htmlFor={noteId}>
          {localized(noteSpec.label, lang) || t("canvas.title")}
          {noteSpec.mode === "optional" && (
            <span className="pl-label-note"> · {t("tpl.optional")}</span>
          )}
        </label>
        <textarea
          id={noteId}
          className="pl-textarea pl-textarea--short"
          value={note}
          disabled={isBusy}
          onChange={(event) => setNote(event.target.value)}
          placeholder={localized(noteSpec.placeholder, lang)}
        />
      </div>

      {hint && !errorMessage && (
        <p className="pl-hint pl-hint--requirement">{hint}</p>
      )}

      {disabled && disabledReason && (
        <div className="pl-notice pl-notice--warn" role="status">
          {disabledReason}
        </div>
      )}
      {errorMessage && (
        <div className="pl-notice pl-notice--danger" role="alert">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        className="pl-btn pl-btn--primary pl-btn--block pl-btn--lg"
        onClick={onGenerate}
        disabled={!canGenerate}
      >
        <Sparkles size={18} aria-hidden="true" />
        {isBusy ? t("canvas.generating") : t("tpl.generate")}
      </button>
    </section>
  );
}
