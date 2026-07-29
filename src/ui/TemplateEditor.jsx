import { useEffect, useId, useState } from "react";
import Sheet from "./Sheet.jsx";
import { listTemplates, localized, templateFields } from "../workTemplates.js";

/**
 * Where a user builds a template as specific as the built-in ones.
 *
 * The earlier version asked for a name and an instruction, which produced
 * vague templates that guessed at everything. A template is only as good as
 * what it pins down, so this asks for the same three things every built-in
 * template declares: the fields to collect, the sections the document must
 * have, and the rules the writing has to follow.
 *
 * Duplicating a built-in template is offered first and fills all of it in,
 * because editing something that already works beats facing an empty box.
 */

const EMPTY = {
  name: "",
  blurb: "",
  fields: "",
  sections: "",
  instruction: "",
  needsAttachment: true,
};

/** Renders a built-in template's fields back into the editor's line format. */
function fieldsToText(template, lang) {
  return templateFields(template)
    .map((field) => {
      const label = localized(field.label, lang) + (field.required ? "*" : "");
      return field.type === "text" ? label : `${label} | ${field.type}`;
    })
    .join("\n");
}

function Block({ label, hint, children }) {
  return (
    <div className="pl-field">
      <label className="pl-label">{label}</label>
      {children}
      {hint && <p className="pl-hint">{hint}</p>}
    </div>
  );
}

export default function TemplateEditor({ t, lang, open, onClose, onSave, editing }) {
  const [draft, setDraft] = useState(EMPTY);
  const nameId = useId();

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
      fields: fieldsToText(source, lang),
      sections: (source.sections?.[lang === "en" ? "en" : "id"] || []).join("\n"),
      instruction: localized(source.prompt, lang),
      needsAttachment: (source.input?.attachments?.min || 0) > 0,
    });
  };

  const canSave =
    draft.name.trim() && draft.instruction.trim() && draft.sections.trim();

  return (
    <Sheet open={open} title={t("editor.title")} closeLabel={t("nav.close")} onClose={onClose}>
      <p className="pl-hint">{t("editor.intro")}</p>

      <Block label={t("editor.duplicate")} hint={t("editor.duplicateHint")}>
        <select
          id={nameId}
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
      </Block>

      <Block label={t("editor.name")}>
        <input
          className="pl-input"
          value={draft.name}
          onChange={set("name")}
          placeholder={t("editor.namePlaceholder")}
        />
      </Block>

      <Block label={t("editor.blurb")} hint={t("editor.blurbHint")}>
        <input
          className="pl-input"
          value={draft.blurb}
          onChange={set("blurb")}
          placeholder={t("editor.blurbPlaceholder")}
        />
      </Block>

      <Block label={t("editor.fields")} hint={t("editor.fieldsHint")}>
        <textarea
          className="pl-textarea"
          value={draft.fields}
          onChange={set("fields")}
          placeholder={t("editor.fieldsPlaceholder")}
        />
      </Block>

      <Block label={t("editor.sections")} hint={t("editor.sectionsHint")}>
        <textarea
          className="pl-textarea"
          value={draft.sections}
          onChange={set("sections")}
          placeholder={t("editor.sectionsPlaceholder")}
        />
      </Block>

      <Block label={t("editor.instruction")} hint={t("editor.instructionHint")}>
        <textarea
          className="pl-textarea pl-textarea--tall"
          value={draft.instruction}
          onChange={set("instruction")}
          placeholder={t("editor.instructionPlaceholder")}
        />
      </Block>

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

      {!canSave && <p className="pl-hint pl-hint--requirement">{t("editor.incomplete")}</p>}

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
