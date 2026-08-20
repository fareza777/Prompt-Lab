import { useId, useMemo } from "react";
import { ArrowLeft, ImagePlus, Paperclip, Sparkles, X } from "lucide-react";
import {
  acceptFor,
  localized,
  templateFields,
  templateSlots,
  validateTemplateInput,
} from "../workTemplates.js";

/**
 * The second screen: supply what this template needs.
 *
 * The fields are the point. A photograph cannot say what the meeting was
 * called, who handed what to whom, or which date to put at the top, and asking
 * for those few facts is the difference between a document that is ready and
 * one the user has to go and correct. Date and time arrive pre-filled.
 */

/** Turns a validation code into the sentence the user should read. */
function requirementMessage(problem, t, lang) {
  if (!problem) return "";
  switch (problem.code) {
    case "need_images":
      return t("tpl.needImages", { n: problem.need });
    case "need_files":
      return t("tpl.needFiles", { n: problem.need });
    case "need_slot":
      return t("tpl.needSlot", { label: localized(problem.label, lang) });
    case "need_field":
      return t("tpl.needField", { label: localized(problem.label, lang) });
    case "need_source":
      return t("tpl.needSource");
    case "too_many":
      return t("tpl.tooMany", { n: problem.max });
    default:
      return "";
  }
}

function Field({ field, lang, value, onChange, disabled, t }) {
  const id = useId();
  const label = localized(field.label, lang);
  const placeholder = localized(field.placeholder, lang);
  // A fallback field is only optional while an attachment stands in for it, so
  // labelling it "optional" outright would be a lie.
  const marksOptional = !field.required && field.mode !== "fallback";
  const common = {
    id,
    value: value ?? "",
    disabled,
    onChange: (event) => onChange(field.id, event.target.value),
  };

  return (
    <div className="pl-field">
      <label className="pl-label" htmlFor={id}>
        {label}
        {marksOptional && <span className="pl-label-note"> · {t("tpl.optional")}</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea className="pl-textarea pl-textarea--short" placeholder={placeholder} {...common} />
      ) : (
        <input
          className="pl-input"
          type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
          placeholder={placeholder}
          {...common}
        />
      )}
    </div>
  );
}

function AttachmentList({ files, onRemove, t }) {
  if (!files.length) return null;
  return (
    <ul className="pl-files">
      {files.map((file) => (
        <li className="pl-file" key={file.id}>
          <Paperclip size={15} aria-hidden="true" />
          <span className="pl-file-name">{file.name}</span>
          <button
            type="button"
            className="pl-icon-btn"
            style={{ width: 32, height: 32 }}
            onClick={() => onRemove(file.id)}
            aria-label={t("canvas.removeFile", { name: file.name })}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Picker({ template, label, slot, onAdd, disabled, t }) {
  return (
    <label className="pl-attach pl-attach--block">
      <input
        type="file"
        multiple
        accept={acceptFor(template)}
        disabled={disabled}
        onChange={(event) => {
          onAdd(event.target.files, slot);
          event.target.value = "";
        }}
      />
      <ImagePlus size={18} aria-hidden="true" />
      <span>{label || t("tpl.attachFiles")}</span>
    </label>
  );
}

export default function TemplateWorkbench({
  t,
  lang,
  template,
  attachments,
  addAttachments,
  removeAttachment,
  values,
  setValue,
  onGenerate,
  onBack,
  isBusy,
  errorMessage,
  planMaxAttachments,
  disabled,
  disabledReason,
}) {
  const spec = template.input.attachments;
  const slots = templateSlots(template);
  const fields = templateFields(template);
  const photosOnly = spec.kinds.length === 1 && spec.kinds[0] === "image";

  /**
   * What this user can actually attach.
   *
   * The template asks for up to eight photos while the free plan allows three,
   * and the picker used to accept all eight and drop the extras with only a
   * passing warning. Losing evidence silently is worse than being told the
   * limit up front.
   */
  const allowed = Math.max(1, Math.min(spec.max || 0, planMaxAttachments || spec.max || 0));
  const atLimit = attachments.length >= allowed;

  const problem = useMemo(
    () => validateTemplateInput(template, { attachments, values }),
    [template, attachments, values]
  );

  const canGenerate = !problem && !isBusy && !disabled;
  const hint = requirementMessage(problem, t, lang);

  return (
    <section className="pl-bench" aria-labelledby="bench-title">
      <div className="pl-bench-head">
        <button type="button" className="pl-btn pl-template-back" onClick={onBack}>
          <ArrowLeft size={19} strokeWidth={2.2} aria-hidden="true" />
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

          {slots ? (
            // Two labelled pickers rather than one pile: which photo is the
            // "before" decides the whole document, so it is asked, not guessed.
            slots.map((slot) => (
              <div className="pl-slot" key={slot.id}>
                <h3 className="pl-label">{localized(slot.label, lang)}</h3>
                <AttachmentList
                  files={attachments.filter((file) => file.slot === slot.id)}
                  onRemove={removeAttachment}
                  t={t}
                />
                <Picker
                  template={template}
                  label={localized(slot.label, lang)}
                  slot={slot.id}
                  onAdd={addAttachments}
                  disabled={isBusy || atLimit}
                  t={t}
                />
              </div>
            ))
          ) : (
            <>
              <AttachmentList files={attachments} onRemove={removeAttachment} t={t} />
              <Picker
                template={template}
                label={photosOnly ? t("tpl.attachPhotos") : t("tpl.attachFiles")}
                onAdd={addAttachments}
                disabled={isBusy || atLimit}
                t={t}
              />
            </>
          )}

          <p className="pl-hint">
            {atLimit
              ? t("tpl.limitReached", { n: allowed })
              : t("tpl.limitRemaining", { n: allowed - attachments.length })}
          </p>
        </div>
      )}

      {fields.length > 0 && (
        <div className="pl-bench-block">
          <h2 className="pl-eyebrow">{t("tpl.detailsTitle")}</h2>
          {fields.map((field) => (
            <Field
              key={field.id}
              field={field}
              lang={lang}
              value={values[field.id]}
              onChange={setValue}
              disabled={isBusy}
              t={t}
            />
          ))}
        </div>
      )}

      {hint && !errorMessage && <p className="pl-hint pl-hint--requirement">{hint}</p>}

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
