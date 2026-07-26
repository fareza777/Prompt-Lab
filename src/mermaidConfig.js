/** Shared Mermaid init — kept tiny so the UI can load it without html-to-image. */
export const MERMAID_INIT = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "neutral",
  fontFamily: "system-ui, Segoe UI, sans-serif",
  flowchart: { htmlLabels: false, useMaxWidth: false },
  sequence: { useMaxWidth: false },
  er: { useMaxWidth: false },
  class: { useMaxWidth: false },
};
