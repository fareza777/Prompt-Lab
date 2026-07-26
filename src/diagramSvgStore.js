/** Last successfully painted Mermaid SVG — export reads this first. */

const SVG_KEY = "__PL_DIAGRAM_SVG__";
const CODE_KEY = "__PL_DIAGRAM_CODE__";

function root() {
  return typeof globalThis !== "undefined" ? globalThis : undefined;
}

export function rememberRenderedDiagramSvg(svg, code = "") {
  const value = String(svg || "").trim();
  if (!value || !/<svg[\s>]/i.test(value)) return;
  const g = root();
  if (g) {
    g[SVG_KEY] = value;
    if (code) g[CODE_KEY] = String(code);
  }
}

export function readRenderedDiagramSvg() {
  const g = root();
  return String(g?.[SVG_KEY] || "");
}

export function readRenderedDiagramCode() {
  const g = root();
  return String(g?.[CODE_KEY] || "");
}

export function clearRenderedDiagramSvg() {
  const g = root();
  if (g) {
    g[SVG_KEY] = "";
    g[CODE_KEY] = "";
  }
}
