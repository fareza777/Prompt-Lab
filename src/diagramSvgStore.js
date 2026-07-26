/** Last successfully painted Mermaid SVG — export reads this first. */
let lastSvg = "";
let lastCode = "";

export function rememberRenderedDiagramSvg(svg, code = "") {
  const value = String(svg || "").trim();
  if (!value || !/<svg[\s>]/i.test(value)) return;
  lastSvg = value;
  if (code) lastCode = String(code);
}

export function readRenderedDiagramSvg() {
  return lastSvg;
}

export function readRenderedDiagramCode() {
  return lastCode;
}

export function clearRenderedDiagramSvg() {
  lastSvg = "";
  lastCode = "";
}
