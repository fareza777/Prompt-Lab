import React from "react";

export function V2EmptyState({ icon: Icon, title, copy, actionLabel, onAction }) {
  return (
    <div className="v2-empty-state">
      {Icon ? <div className="v2-empty-icon"><Icon size={28} /></div> : null}
      <strong>{title}</strong>
      {copy ? <p>{copy}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="v2-btn primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
