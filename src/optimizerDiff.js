const WEAK_PHRASES = [
  /\bmake (it |this )?stronger\b/gi,
  /\bsound friendly\b/gi,
  /\bnot too salesy\b/gi,
  /\bwrite me\b/gi,
  /\bget them to\b/gi,
  /\bgood\b/gi,
  /\bnice\b/gi,
  /\betc\.?\b/gi,
  /\bsomething\b/gi,
];

export function highlightWeakSegments(text = "") {
  const source = String(text);
  if (!source.trim()) return [{ text: source, weak: false }];

  const matches = [];
  for (const pattern of WEAK_PHRASES) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    let match = re.exec(source);
    while (match) {
      matches.push({ start: match.index, end: match.index + match[0].length });
      match = re.exec(source);
    }
  }

  if (!matches.length) return [{ text: source, weak: false }];

  matches.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const item of matches) {
    const last = merged[merged.length - 1];
    if (!last || item.start > last.end) merged.push({ ...item });
    else last.end = Math.max(last.end, item.end);
  }

  const segments = [];
  let cursor = 0;
  for (const item of merged) {
    if (item.start > cursor) segments.push({ text: source.slice(cursor, item.start), weak: false });
    segments.push({ text: source.slice(item.start, item.end), weak: true });
    cursor = item.end;
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor), weak: false });
  return segments;
}

export function inferOptimizerChanges(before = "", after = "", mode = "Clearer") {
  const changes = [];
  const add = (type, label, body) => changes.push({ type, label, body });

  if (/<role>|\*\*role\*\*|peran:/i.test(after) && !/<role>|\*\*role\*\*|peran:/i.test(before)) {
    add("added", "Role definition", "Pinned a concrete specialist role for the model.");
  }
  if (/acceptance criteria|kriteria penerimaan/i.test(after)) {
    add("added", "Acceptance criteria", "Added measurable success checks and output caps.");
  }
  if (/output format|format output|format keluaran/i.test(after) && !/output format|format output/i.test(before)) {
    add("added", "Output schema", "Defined ordered sections and deliverable structure.");
  }
  if (/constraint|batasan|guardrail/i.test(after) && !/constraint|batasan|guardrail/i.test(before)) {
    add("added", "Guardrails", "Added limits, banned vague phrasing, and safety boundaries.");
  }
  if (/audience|audiens|target user/i.test(after) && !/audience|audiens/i.test(before)) {
    add("added", "Audience profile", "Named the reader, segment, and context assumptions.");
  }
  if (/stack|file structure|struktur file|testing/i.test(after) && mode === "Coding") {
    add("added", "Implementation spec", "Added stack, files, states, and test expectations.");
  }

  const modeDefaults = {
    Clearer: { type: "tighten", label: "Clarity pass", body: "Removed ambiguity and locked task boundaries." },
    Shorter: { type: "tighten", label: "Compression", body: "Reduced repetition while preserving deliverable intent." },
    "More Detailed": { type: "added", label: "Depth expansion", body: "Expanded requirements, edge cases, and validation steps." },
    Academic: { type: "added", label: "Academic structure", body: "Formal tone, evidence handling, and section order." },
    Marketing: { type: "added", label: "Conversion framing", body: "Strengthened audience, offer, proof, and CTA path." },
    Coding: { type: "added", label: "Engineering detail", body: "Runnable spec with implementation and QA hooks." },
  };

  const fallback = modeDefaults[mode] || modeDefaults.Clearer;
  if (changes.length < 4) add(fallback.type, fallback.label, fallback.body);

  const wordDelta = after.split(/\s+/).filter(Boolean).length - before.split(/\s+/).filter(Boolean).length;
  if (wordDelta > 40 && mode === "More Detailed") {
    add("added", "Scope expansion", `Added about ${wordDelta} words of concrete requirements.`);
  }

  return changes.slice(0, 6);
}

export function countWords(text = "") {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}
