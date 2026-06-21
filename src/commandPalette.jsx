import React, { useEffect, useMemo, useState } from "react";
import { BookOpenText, Library, PenLine, Search } from "lucide-react";

export function V2CommandPalette({
  open,
  onClose,
  library = [],
  templates = [],
  recentPrompts = [],
  onOpenLibrary,
  onOpenTemplates,
  onOpenBuilder,
  onUseTemplate,
  onUseLibraryItem,
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (text) => !q || String(text || "").toLowerCase().includes(q);
    const libraryHits = library
      .filter((item) => match(`${item.title} ${item.content} ${item.folder} ${item.tag}`))
      .slice(0, 6)
      .map((item) => ({
        id: `lib-${item.id}`,
        group: "Library",
        title: item.title,
        detail: item.folder,
        onSelect: () => onUseLibraryItem?.(item),
      }));
    const templateHits = templates
      .filter((item) => match(`${item.title} ${item.category} ${item.prompt}`))
      .slice(0, 6)
      .map((item) => ({
        id: `tpl-${item.id || item.title}`,
        group: "Templates",
        title: item.title,
        detail: item.category,
        onSelect: () => onUseTemplate?.(item),
      }));
    const recentHits = recentPrompts
      .filter((item) => match(`${item.title} ${item.content}`))
      .slice(0, 4)
      .map((item) => ({
        id: `recent-${item.id}`,
        group: "Recent",
        title: item.title,
        detail: "Saved prompt",
        onSelect: () => onUseLibraryItem?.(item),
      }));
    return [...recentHits, ...libraryHits, ...templateHits];
  }, [library, templates, recentPrompts, query, onUseLibraryItem, onUseTemplate]);

  if (!open) return null;

  return (
    <div className="v2-command-backdrop" role="presentation" onClick={onClose}>
      <div className="v2-command-panel" role="dialog" aria-label="Command palette" onClick={(event) => event.stopPropagation()}>
        <div className="v2-command-search">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search library, templates, recent..."
          />
          <kbd>Esc</kbd>
        </div>
        <div className="v2-command-quick">
          <button type="button" onClick={() => { onOpenBuilder?.(); onClose?.(); }}><PenLine size={14} /> Builder</button>
          <button type="button" onClick={() => { onOpenLibrary?.(); onClose?.(); }}><Library size={14} /> Library</button>
          <button type="button" onClick={() => { onOpenTemplates?.(); onClose?.(); }}><BookOpenText size={14} /> Templates</button>
        </div>
        <div className="v2-command-results">
          {results.length === 0 ? (
            <p className="v2-small">No matches. Try another keyword.</p>
          ) : (
            results.map((item) => (
              <button key={item.id} type="button" className="v2-command-item" onClick={() => { item.onSelect?.(); onClose?.(); }}>
                <span>{item.group}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
