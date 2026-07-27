/**
 * Document → process-flow steps (infographic), independent of Mermaid layout bugs.
 * The model returns a ```process JSON fence; we render HTML/canvas (not fragile
 * SVG <text>, which sharp/Android often turn into empty boxes / tofu glyphs).
 */

const PROCESS_FENCE = /```process\s*([\s\S]*?)```/i;

const LAYOUT = {
  width: 720,
  boxH: 64,
  gap: 28,
  startY: 56,
  padX: 40,
};

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
  const title = cleanLabel(data.title || data.name || "Alur proses").slice(0, 120) || "Alur proses";
  const rawSteps = Array.isArray(data.steps)
    ? data.steps
    : Array.isArray(data.nodes)
      ? data.nodes
      : [];
  const steps = rawSteps
    .map((step, index) => {
      if (typeof step === "string") {
        const label = cleanLabel(step);
        if (!label) return null;
        return { id: `S${index + 1}`, label: label.slice(0, 80), detail: "" };
      }
      const label = cleanLabel(
        step?.label ||
          step?.title ||
          step?.name ||
          step?.text ||
          step?.langkah ||
          step?.step ||
          step?.aksi ||
          step?.uraian ||
          step?.content ||
          step?.deskripsi ||
          ""
      );
      if (!label) return null;
      return {
        id: String(step?.id || `S${index + 1}`).replace(/[^\w-]/g, "") || `S${index + 1}`,
        label: label.slice(0, 80),
        detail: cleanLabel(step?.detail || step?.note || step?.sub || "").slice(0, 160),
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

/** Shared geometry for HTML preview + canvas PNG. */
export function getProcessFlowLayout(flow, { width = LAYOUT.width } = {}) {
  const normalized = normalizeProcessFlow(flow);
  if (!normalized) return null;

  const boxW = Math.min(560, width - LAYOUT.padX * 2);
  const height = LAYOUT.startY + normalized.steps.length * (LAYOUT.boxH + LAYOUT.gap) + 24;
  const x = (width - boxW) / 2;

  return {
    ...normalized,
    width,
    height,
    boxW,
    boxH: LAYOUT.boxH,
    gap: LAYOUT.gap,
    startY: LAYOUT.startY,
    x,
  };
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

/**
 * Draw process infographic with Canvas fillText so PNG keeps readable labels.
 * (SVG <text> + sharp/librsvg often yields empty boxes / □□□ on Linux & Android.)
 */
export function paintProcessFlowOnCanvas(ctx, flow, { scale = 1 } = {}) {
  const layout = getProcessFlowLayout(flow);
  if (!layout || !ctx) return null;

  const { width, height, boxW, boxH, gap, startY, x, title, steps } = layout;
  ctx.save();
  if (scale !== 1) ctx.scale(scale, scale);

  ctx.fillStyle = "#FBF8F1";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#1F241F";
  ctx.font = "700 18px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, width / 2, 28, width - 48);

  steps.forEach((step, index) => {
    const y = startY + index * (boxH + gap);
    const isEnd = index === 0 || index === steps.length - 1;
    const fill = index === 0 ? "#2F5A46" : index === steps.length - 1 ? "#3A6B54" : "#FFFFFF";
    const textFill = isEnd ? "#FBF8F1" : "#1F241F";
    const detailFill = isEnd ? "#D8E5DD" : "#667067";

    roundRect(ctx, x, y, boxW, boxH, 14);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#2F5A46";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = textFill;
    ctx.font = "600 15px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    const labelY = step.detail ? y + 26 : y + boxH / 2;
    ctx.fillText(step.label, width / 2, labelY, boxW - 28);

    if (step.detail) {
      ctx.fillStyle = detailFill;
      ctx.font = "400 12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
      ctx.fillText(step.detail, width / 2, y + 46, boxW - 28);
    }

    if (index < steps.length - 1) {
      const ax = width / 2;
      const ay = y + boxH;
      ctx.strokeStyle = "#2F5A46";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay + 4);
      ctx.lineTo(ax, ay + gap - 6);
      ctx.stroke();
      ctx.fillStyle = "#2F5A46";
      ctx.beginPath();
      ctx.moveTo(ax - 6, ay + gap - 14);
      ctx.lineTo(ax, ay + gap - 4);
      ctx.lineTo(ax + 6, ay + gap - 14);
      ctx.closePath();
      ctx.fill();
    }
  });

  ctx.restore();
  return layout;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** SVG fallback for .svg download — prefer canvas PNG for actual images. */
export function buildProcessFlowSvg(flow, { width = LAYOUT.width } = {}) {
  const layout = getProcessFlowLayout(flow, { width });
  if (!layout) return "";

  const { height, boxW, boxH, gap, startY, x, title, steps } = layout;
  // Use Arial/Helvetica — more likely present on rasterizers than Segoe UI alone.
  const font = "Arial, Helvetica, sans-serif";

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">`,
    `<rect width="100%" height="100%" fill="#FBF8F1"/>`,
    `<text x="${width / 2}" y="32" text-anchor="middle" font-family="${font}" font-size="18" font-weight="700" fill="#1F241F">${escapeXml(title)}</text>`,
  ];

  steps.forEach((step, index) => {
    const y = startY + index * (boxH + gap);
    const fill = index === 0 ? "#2F5A46" : index === steps.length - 1 ? "#3A6B54" : "#FFFFFF";
    const stroke = "#2F5A46";
    const textFill = index === 0 || index === steps.length - 1 ? "#FBF8F1" : "#1F241F";
    parts.push(
      `<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
    );
    parts.push(
      `<text x="${width / 2}" y="${y + (step.detail ? 28 : 38)}" text-anchor="middle" font-family="${font}" font-size="15" font-weight="600" fill="${textFill}">${escapeXml(step.label)}</text>`
    );
    if (step.detail) {
      parts.push(
        `<text x="${width / 2}" y="${y + 48}" text-anchor="middle" font-family="${font}" font-size="12" fill="${
          index === 0 || index === steps.length - 1 ? "#D8E5DD" : "#667067"
        }">${escapeXml(step.detail)}</text>`
      );
    }
    if (index < steps.length - 1) {
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
