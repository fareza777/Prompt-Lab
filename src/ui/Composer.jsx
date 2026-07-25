import { useId, useState } from "react";
import { Paperclip, ChevronDown, X, Sparkles, FileText } from "lucide-react";
import { CATEGORIES, TONES, MODELS, OUTPUT_TYPES } from "./options.js";

/**
 * The input surface.
 *
 * Only three things are visible before the user acts: what they want, an
 * optional attachment, and the button. The four routing selects live behind a
 * disclosure because sensible defaults already cover the common case, and
 * showing them up front reads as work owed before any value is returned.
 */

function Field({ label, value, onChange, options, translateOption, disabled }) {
  const id = useId();
  return (
    <div className="pl-field">
      <label className="pl-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="pl-select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {translateOption(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Composer({
  t,
  narrative,
  setNarrative,
  attachments,
  addAttachments,
  removeAttachment,
  maxAttachments,
  onGenerate,
  isGenerating,
  category,
  setCategory,
  tone,
  setTone,
  model,
  setModel,
  outputType,
  setOutputType,
  errorMessage,
  warningMessage,
  disabled,
  disabledReason,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const requestId = useId();
  const advancedId = useId();

  const atAttachmentLimit = attachments.length >= maxAttachments;
  const canGenerate = Boolean(String(narrative || "").trim()) && !isGenerating && !disabled;

  return (
    <div className="pl-stack">
      <div className="pl-composer">
        <label className="pl-sr" htmlFor={requestId}>
          {t("canvas.title")}
        </label>
        <textarea
          id={requestId}
          className="pl-textarea"
          value={narrative}
          onChange={(event) => setNarrative(event.target.value)}
          placeholder={t("canvas.placeholder")}
        />

        {attachments.length > 0 && (
          <ul className="pl-files">
            {attachments.map((file) => (
              <li className="pl-file" key={file.id}>
                <FileText size={15} aria-hidden="true" />
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

        <div className="pl-composer-foot">
          <label className="pl-attach">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,.xlsx"
              disabled={atAttachmentLimit || isGenerating}
              onChange={(event) => {
                addAttachments(event.target.files);
                event.target.value = "";
              }}
            />
            <Paperclip size={17} aria-hidden="true" />
            <span>{t("canvas.attach")}</span>
          </label>

          <button
            type="button"
            className="pl-btn pl-btn--primary"
            onClick={() => onGenerate()}
            disabled={!canGenerate}
          >
            <Sparkles size={17} aria-hidden="true" />
            {isGenerating ? t("canvas.generating") : t("canvas.generate")}
          </button>
        </div>

        <div className="pl-advanced">
          <button
            type="button"
            className="pl-advanced-toggle"
            aria-expanded={advancedOpen}
            aria-controls={advancedId}
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            <ChevronDown size={16} aria-hidden="true" />
            {t("advanced.toggle")}
          </button>

          {advancedOpen && (
            <div className="pl-advanced-body" id={advancedId}>
              <Field
                label={t("advanced.outputType")}
                value={outputType}
                onChange={setOutputType}
                options={OUTPUT_TYPES}
                translateOption={(value) => t(`opt.output.${value}`)}
                disabled={isGenerating}
              />
              <Field
                label={t("advanced.category")}
                value={category}
                onChange={setCategory}
                options={CATEGORIES}
                translateOption={(value) => t(`opt.category.${value}`)}
                disabled={isGenerating}
              />
              <Field
                label={t("advanced.tone")}
                value={tone}
                onChange={setTone}
                options={TONES}
                translateOption={(value) => t(`opt.tone.${value}`)}
                disabled={isGenerating}
              />
              <Field
                label={t("advanced.model")}
                value={model}
                onChange={setModel}
                options={MODELS}
                translateOption={(value) => value}
                disabled={isGenerating}
              />
              <p className="pl-hint" style={{ gridColumn: "1 / -1" }}>
                {t("advanced.hint")}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="pl-hint">{t("canvas.attachHint")}</p>

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
      {warningMessage && !errorMessage && (
        <div className="pl-notice pl-notice--warn" role="status">
          {warningMessage}
        </div>
      )}
    </div>
  );
}
