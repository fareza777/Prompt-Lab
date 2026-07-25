import { Clock, Trash2, Copy, Search } from "lucide-react";
import Sheet from "./Sheet.jsx";

/**
 * The library, demoted from a destination to a drawer.
 *
 * Opening an item loads it back into the canvas — there is no separate place
 * to read or edit a saved result, because the canvas already is that place.
 */

function formatWhen(value, lang) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
      day: "numeric",
      month: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function History({
  t,
  lang,
  open,
  onClose,
  items,
  search,
  setSearch,
  onOpenItem,
  onDelete,
  onDuplicate,
  syncStatus,
  isLocalOnly,
}) {
  return (
    <Sheet open={open} title={t("history.title")} closeLabel={t("nav.close")} onClose={onClose}>
      <div className="pl-field">
        <label className="pl-label" htmlFor="history-search">
          {t("history.search")}
        </label>
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-faint)",
            }}
          />
          <input
            id="history-search"
            className="pl-input"
            style={{ paddingLeft: 36 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("history.search")}
          />
        </div>
      </div>

      <p className="pl-meta">
        {t("history.count", { n: items.length })} ·{" "}
        {isLocalOnly ? t("history.local") : syncStatus || t("history.synced")}
      </p>

      {items.length === 0 ? (
        <div className="pl-empty">
          <Clock size={22} aria-hidden="true" />
          <p>{t("history.empty")}</p>
          <p className="pl-hint">{t("history.emptyHint")}</p>
        </div>
      ) : (
        <ul className="pl-list">
          {items.map((item) => (
            <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                className="pl-row"
                onClick={() => onOpenItem(item)}
                style={{ borderBottom: "none" }}
              >
                <span className="pl-row-text">
                  <strong>{item.title || t("history.open")}</strong>
                  <span>
                    {[item.folder, formatWhen(item.updatedAt || item.createdAt, lang)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="pl-icon-btn"
                onClick={() => onDuplicate(item.id)}
                aria-label={`${t("history.duplicate")}: ${item.title || ""}`}
              >
                <Copy size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="pl-icon-btn"
                onClick={() => onDelete(item.id)}
                aria-label={`${t("history.delete")}: ${item.title || ""}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
