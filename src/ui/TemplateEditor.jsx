import { useEffect, useId, useState } from "react";
import Sheet from "./Sheet.jsx";
import { listTemplates, localized } from "../workTemplates.js";

/**
 * Four fields, deliberately.
 *
 * A template is really six things (see workTemplateDefinitions.js), but asking
 * a user for length targets and export formats would turn a two-minute task
 * into a form nobody finishes. The rest takes sensible defaults, and
 * duplicating a built-in template is offered first because editing something
 * that already works is far easier than facing an empty box.
 */

const EMPTY = { name: "", blurb: "", instruction: "", sections: "", needsAttachment: true };

export default function TemplateEditor({ t, lang, open, onClose, onSave, editing }) {
  const [draft, setDraft] = useState(EMPTY);
  const nameId = useId();
  const instructionId = useId();
  const sectionsId = useId();

  useEffect(() => {
    if (!open) return;
    setDraft(editing ? { ...EMPTY, ...editing } : EMPTY);
  }, [open, editing]);

  const set = (key) => (event) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));

  const duplicate = (id) => {
    const source = listTemplates().find((template) => template.id === id);
    if (!source) return;
    setDraft({
      name: `${localized(source.name, lang)} (${t("editor.copySuffix")})`,
      blurb: localized(source.blurb, lang),
      instruction: localized(source.prompt, lang),
      sections: (source.sections?.[lang === "en" ? "en" : "id"] || []).join("\n"),
      needsAttachment: (source.input?.attachments?.min || 0) > 0,
    });
  };

  const canSave = draft.name.trim() && draft.instruction.trim();

  return (
    <Sheet open={open} title={t("editor.title")} closeLabel={t("nav.close")} onClose={onClose}>
      <div className="pl-field">
        <label className="pl-label" htmlFor={`${nameId}-dup`}>
          {t("editor.duplicate")}
        </label>
        <select
          id={`${nameId}-dup`}
          className="pl-select"
          value=""
          onChange={(event) => duplicate(event.target.value)}
        >
          <option value="">{t("editor.duplicatePick")}</option>
          {listTemplates().map((template) => (
            <option key={template.id} value={template.id}>
              {localized(template.name, lang)}
            </option>
          ))}
        </select>
      </div>

      <div className="pl-field">
        <label className="pl-label" htmlFor={nameId}>
          {t("editor.name")}
        </label>
        <input
          id={nameId}
          className="pl-input"
          value={draft.name}
          onChange={set("name")}
          placeholder={t("editor.namePlaceholder")}
        />
      </div>

      <div className="pl-field">
        <label className="pl-label" htmlFor={instructionId}>
          {t("editor.instruction")}
        </label>
        <textarea
          id={instructionId}
          className="pl-textarea"
          value={draft.instruction}
          onChange={set("instruction")}
          placeholder={t("editor.instructionPlaceholder")}
        />
        <p className="pl-hint">{t("editor.instructionHint")}</p>
      </div>

      <div className="pl-field">
        <label className="pl-label" htmlFor={sectionsId}>
          {t("editor.sections")}
        </label>
        <textarea
          id={sectionsId}
          className="pl-textarea pl-textarea--short"
          value={draft.sections}
          onChange={set("sections")}
          placeholder={t("editor.sectionsPlaceholder")}
        />
        <p className="pl-hint">{t("editor.sectionsHint")}</p>
      </div>

      <label className="pl-check">
        <input
          type="checkbox"
          checked={draft.needsAttachment}
          onChange={(event) =>
            setDraft((current) => ({ ...current, needsAttachment: event.target.checked }))
          }
        />
        <span>{t("editor.needsAttachment")}</span>
      </label>

      <button
        type="button"
        className="pl-btn pl-btn--primary pl-btn--block"
        disabled={!canSave}
        onClick={() => {
          onSave(draft);
          onClose();
        }}
      >
        {t("editor.save")}
      </button>
    </Sheet>
  );
}
