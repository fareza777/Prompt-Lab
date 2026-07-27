/**
 * Document → process-flow steps (infographic), independent of Mermaid layout bugs.
 * The model returns a ```process JSON fence; we render SVG and optionally build
 * a guaranteed-valid Mermaid flowchart for export.
 */

const PROCESS_FENCE = /```process\s*([\s\S]*?)```/i;

export function extractProcessFlow(markdown = "") {
  const text = String(markdown || "");
  const fenced = text.match(PROCESS_FENCE);
  if (fenced?.[1]?.trim()) {
    const parsed = parseProcessJson(fenced[1]);
    if (parsed) return parsed;
  }
  return null;
}

export function parseProcessJson(raw = "") {
  try {
    let body = String(raw || "").trim();
    body = body.replace(/^\uFEFF/, "");
    // Tolerate accidental prose around JSON.
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) body = body.slice(start, end + 1);
    const data = JSON.parse(body);
    return normalizeProcessFlow(data);
  } catch {
    return null;
  }
}

export function normalizeProcessFlow(data = {}) {
  const title = String(data.title || data.name || "Alur proses").trim().slice(0, 120);
  const rawSteps = Array.isArray(data.steps)
    ? data.steps
    : Array.isArray(data.nodes)
      ? data.nodes
      : [];
  const steps = rawSteps
    .map((step, index) => {
      if (typeof step === "string") {
        return { id: `S${index + 1}`, label: cleanLabel(step), detail: "" };
      }
      const label = cleanLabel(step?.label || step?.title || step?.name || step?.text || "");
      if (!label) return null;
      return {
        id: String(step?.id || `S${index + 1}`).replace(/[^\w-]/g, "") || `S${index + 1}`,
        label: label.slice(0, 80),
        detail: cleanLabel(step?.detail || step?.note || "").slice(0, 160),
      };
    })
    .filter(Boolean)
    .slice(0, 12);

  if (steps.length < 2) return null;

  const ids = new Set(steps.map((s) => s.id));
  let edges = Array.isArray(data.edges)
    ? data.edges
        .map((edge) => ({
          from: String(edge?.from || edge?.source || "").trim(),
          to: String(edge?.to || edge?.target || "").trim(),
        }))
        .filter((edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to)
    : [];

  if (!edges.length) {
    edges = steps.slice(0, -1).map((step, index) => ({
      from: step.id,
      to: steps[index + 1].id,
    }));
  }

  return { title, steps, edges };
}

function cleanLabel(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[`*#_]/g, "")
    .trim();
}

/** Deterministic Mermaid — always quoted labels, linear-friendly flowchart. */
export function processFlowToMermaid(flow) {
  const normalized = normalizeProcessFlow(flow);
  if (!normalized) return "";
  const lines = ["flowchart TD"];
  for (const step of normalized.steps) {
    const label = step.label.replace(/"/g, "'");
    lines.push(`  ${step.id}["${label}"]`);
  }
  for (const edge of normalized.edges) {
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }
  return lines.join("\n");
}

/**
 * Ensure markdown has a valid process fence and a matching mermaid fence.
 */
export function ensureProcessDiagramDocument(markdown = "", lang = "id") {
  let text = String(markdown || "").trim();
  let flow = extractProcessFlow(text);

  if (!flow) {
    // Last resort: invent nothing — leave as-is for other repair paths.
    return text;
  }

  const mermaid = processFlowToMermaid(flow);
  const processJson = JSON.stringify(
    {
      title: flow.title,
      steps: flow.steps.map(({ id, label, detail }) =>
        detail ? { id, label, detail } : { id, label }
      ),
      edges: flow.edges,
    },
    null,
    2
  );

  if (!PROCESS_FENCE.test(text)) {
    const heading = lang === "en" ? "# Process flow" : "# Alur proses";
    text = `${heading}\n\n\`\`\`process\n${processJson}\n\`\`\`\n`;
  } else {
    text = text.replace(PROCESS_FENCE, `\`\`\`process\n${processJson}\n\`\`\``);
  }

  if (/```mermaid\s*[\s\S]*?```/i.test(text)) {
    text = text.replace(/```mermaid\s*[\s\S]*?```/i, `\`\`\`mermaid\n${mermaid}\n\`\`\``);
  } else {
    text = `${text.trim()}\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n`;
  }

  return text.trim();
}

/** Simple SVG infographic — no Mermaid dependency. */
export function buildProcessFlowSvg(flow, { width = 720 } = {}) {
  const normalized = normalizeProcessFlow(flow);
  if (!normalized) return "";

  const boxW = Math.min(560, width - 80);
  const boxH = 64;
  const gap = 28;
  const arrowH = 18;
  const startY = 56;
  const height = startY + normalized.steps.length * (boxH + gap) + 24;
  const x = (width - boxW) / 2;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(normalized.title)}">`,
    `<rect width="100%" height="100%" fill="#FBF8F1"/>`,
    `<text x="${width / 2}" y="32" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="18" font-weight="700" fill="#1F241F">${escapeXml(normalized.title)}</text>`,
  ];

  normalized.steps.forEach((step, index) => {
    const y = startY + index * (boxH + gap);
    const fill = index === 0 ? "#2F5A46" : index === normalized.steps.length - 1 ? "#3A6B54" : "#FFFFFF";
    const stroke = "#2F5A46";
    const textFill = index === 0 || index === normalized.steps.length - 1 ? "#FBF8F1" : "#1F241F";
    parts.push(
      `<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
    );
    parts.push(
      `<text x="${width / 2}" y="${y + (step.detail ? 28 : 38)}" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="15" font-weight="600" fill="${textFill}">${escapeXml(step.label)}</text>`
    );
    if (step.detail) {
      parts.push(
        `<text x="${width / 2}" y="${y + 48}" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="12" fill="${index === 0 || index === normalized.steps.length - 1 ? "#D8E5DD" : "#667067"}">${escapeXml(step.detail)}</text>`
      );
    }
    if (index < normalized.steps.length - 1) {
      const ax = width / 2;
      const ay = y + boxH;
      parts.push(
        `<path d="M${ax} ${ay + 4} L${ax} ${ay + gap - 6}" stroke="#2F5A46" stroke-width="2.5" fill="none"/>`,
        `<path d="M${ax - 6} ${ay + gap - 14} L${ax} ${ay + gap - 4} L${ax + 6} ${ay + gap - 14}" fill="#2F5A46"/>`
      );
    }
  });

  parts.push("</svg>");
  return parts.join("");
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
