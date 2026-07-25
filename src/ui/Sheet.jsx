import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * The one overlay primitive. Every secondary surface (history, account,
 * improve, compare, report) is a Sheet, so modal behaviour is implemented and
 * tested once: focus moves in, is trapped while open, Escape closes, and focus
 * returns to whatever opened it.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function Sheet({ open, title, onClose, closeLabel = "Close", children, footer }) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  const titleId = useRef(`sheet-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;

    // Move focus into the panel without stealing it from an autofocused field.
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const first = panel.querySelector(FOCUSABLE);
      (first || panel).focus({ preventScroll: true });
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      const restore = restoreRef.current;
      if (restore && typeof restore.focus === "function") {
        restore.focus({ preventScroll: true });
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="pl-scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="pl-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="pl-sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="pl-icon-btn" onClick={onClose} aria-label={closeLabel}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="pl-sheet-body">{children}</div>
        {footer}
      </div>
    </>
  );
}
