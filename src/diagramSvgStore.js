/** Last successfully painted Mermaid SVG — export reads this first. */

const SVG_KEY = "__PL_DIAGRAM_SVG__";
const CODE_KEY = "__PL_DIAGRAM_CODE__";
const STORAGE_SVG = "pl-diagram-svg-v1";
const STORAGE_CODE = "pl-diagram-code-v1";

function root() {
  return typeof globalThis !== "undefined" ? globalThis : undefined;
}

function writeStorage(key, value) {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

function readStorage(key) {
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage.getItem(key) || "";
  } catch {
    /* ignore */
  }
  return "";
}

export function rememberRenderedDiagramSvg(svg, code = "") {
  const value = String(svg || "").trim();
  if (!value || !/<svg[\s>]/i.test(value)) return;
  const g = root();
  if (g) {
    g[SVG_KEY] = value;
    if (code) g[CODE_KEY] = String(code);
  }
  writeStorage(STORAGE_SVG, value);
  if (code) writeStorage(STORAGE_CODE, String(code));
}

export function readRenderedDiagramSvg() {
  const g = root();
  return String(g?.[SVG_KEY] || readStorage(STORAGE_SVG) || "");
}

export function readRenderedDiagramCode() {
  const g = root();
  return String(g?.[CODE_KEY] || readStorage(STORAGE_CODE) || "");
}

export function clearRenderedDiagramSvg() {
  const g = root();
  if (g) {
    g[SVG_KEY] = "";
    g[CODE_KEY] = "";
  }
  try {
    sessionStorage.removeItem(STORAGE_SVG);
    sessionStorage.removeItem(STORAGE_CODE);
  } catch {
    /* ignore */
  }
}
