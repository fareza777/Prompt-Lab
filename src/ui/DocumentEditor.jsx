import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Check } from "lucide-react";
import { detectLanguage } from "./i18n.js";

/**
 * In-place rich-text editing for a finished run. The run's output is markdown;
 * tiptap-markdown translates it into a ProseMirror document and back, so the
 * user edits the formatted result — not raw markdown source — and every change
 * flows back through onChange as markdown for the rest of the app (export,
 * save, copy) to keep working untouched.
 *
 * Labels live here rather than the shared i18n table and the toolbar uses text
 * glyphs instead of lucide icons: this file is a lazy chunk, and keeping those
 * bytes here is what keeps them out of the initial bundle.
 */

const LABELS = {
  tools: { id: "Alat edit dokumen", en: "Document editing tools" },
  bold: { id: "Tebal", en: "Bold" },
  italic: { id: "Miring", en: "Italic" },
  heading: { id: "Judul", en: "Heading" },
  bullet: { id: "Daftar", en: "Bulleted list" },
  numbered: { id: "Daftar bernomor", en: "Numbered list" },
  undo: { id: "Urungkan", en: "Undo" },
  redo: { id: "Ulangi", en: "Redo" },
};

function lt(lang, key) {
  return LABELS[key]?.[lang] || LABELS[key]?.id || key;
}

function Tool({ glyph, label, active, disabled, onClick, className = "" }) {
  return (
    <button
      type="button"
      className={`pl-editor-tool${active ? " is-active" : ""} ${className}`}
      title={label}
      aria-label={label}
      aria-pressed={Boolean(active)}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {glyph}
    </button>
  );
}

export default function DocumentEditor({ t, markdown, onChange, onDone }) {
  const lang = detectLanguage();
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: markdown,
    onUpdate: ({ editor: active }) => {
      onChange?.(active.storage.markdown.getMarkdown());
    },
  });

  if (!editor) return null;

  return (
    <div className="pl-editor">
      <div className="pl-editor-bar" role="toolbar" aria-label={lt(lang, "tools")}>
        <Tool
          glyph={<strong>B</strong>}
          label={lt(lang, "bold")}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <Tool
          glyph={<em>I</em>}
          label={lt(lang, "italic")}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <Tool
          glyph="H2"
          label={lt(lang, "heading")}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <Tool
          glyph="• —"
          label={lt(lang, "bullet")}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <Tool
          glyph="1."
          label={lt(lang, "numbered")}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <span className="pl-editor-sep" aria-hidden="true" />
        <Tool
          glyph="⟲"
          label={lt(lang, "undo")}
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <Tool
          glyph="⟳"
          label={lt(lang, "redo")}
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
        <button type="button" className="pl-btn pl-btn--sm pl-editor-done" onClick={onDone}>
          <Check size={15} aria-hidden="true" /> {t("common.done")}
        </button>
      </div>
      <EditorContent editor={editor} className="pl-editor-content" />
    </div>
  );
}
