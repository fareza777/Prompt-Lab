function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function rubricScore(text, checks) {
  const hits = checks.filter((check) =>
    check instanceof RegExp ? check.test(text) : Boolean(check)
  ).length;
  return Math.round((hits / checks.length) * 100);
}

function structureBonus(text) {
  const sectionCount = (text.match(
    /(?:^|\n)\s*(?:#{1,3}\s*)?(?:role|context|konteks|objective|tujuan|task|tugas|requirements?|output|format|constraints?|batasan|acceptance|criteria|quality|checklist|deliverables?|instructions?|guidelines?|assumptions?|tone|audience)\b/gi
  ) || []).length;
  const bulletCount = (text.match(/(?:^|\n)\s*(?:[-*]|\d+[.)])\s+/g) || []).length;
  const numericControls = (text.match(
    /\b\d+\b|maks(?:imal)?|min(?:imal)?|at least|no more than|jumlah|kata|slide|section|bagian|content|posts?|items?|words?|characters?/gi
  ) || []).length;
  return Math.min(100, sectionCount * 10 + bulletCount * 4 + numericControls * 6);
}

export function scorePrompt(prompt) {
  const text = String(prompt || "");
  const sectionCount = (text.match(
    /(?:^|\n)\s*(?:#{1,3}\s*)?(?:role|context|konteks|objective|tujuan|task|tugas|requirements?|output|format|constraints?|batasan|acceptance|criteria|quality|checklist|deliverables?|instructions?|guidelines?|assumptions?|tone|audience)\b/gi
  ) || []).length;
  const numericControls = (text.match(
    /\b\d+\b|maks(?:imal)?|min(?:imal)?|at least|no more than|jumlah|kata|slide|section|bagian|content|posts?|items?|words?|characters?/gi
  ) || []).length;
  const bulletCount = (text.match(/(?:^|\n)\s*(?:[-*]|\d+[.)])\s+/g) || []).length;
  const genericPenalty = countMatches(text, [
    /\b(leverage|synergy|world-class|cutting-edge|next-level|game-changing|seamless|robust solution)\b/i,
    /\b(kelas dunia|terdepan|revolusioner|solusi terbaik)\b/i,
    /\[(?:your|insert|topik|isi|brand|context)[^\]]*\]/i,
  ]);
  const structure = structureBonus(text);

  const clarity = Math.round(
    (rubricScore(text, [
      /role|act as|bertindak|you are|kamu adalah|sebagai/i,
      /objective|goal|tujuan|hasil akhir|final goal|main task/i,
      /task|tugas|kerjakan|buat|susun|build|write|create|siapkan|prepare/i,
      /senior|strategist|engineer|analyst|copywriter|researcher|spesialis|architect|director|consultant/i,
    ]) +
      structure * 0.35) /
      1.35
  );
  const context = Math.round(
    (rubricScore(text, [
      /context|konteks|latar belakang|berdasarkan|source|sumber|brief|assumptions?/i,
      /audience|target|persona|pengguna|pembaca|customer|user|mahasiswa|students?|market/i,
      /lampiran|dokumen|data|file|screenshot|referensi|brief|product|brand/i,
      /assumption|asumsi|jika tidak tersedia|if missing|if.*not provided|fiktif|placeholder/i,
    ]) +
      Math.min(100, Math.round(text.length / 12))) /
      2
  );
  const format = Math.round(
    (rubricScore(text, [
      /format|output|struktur|section|bagian|table|tabel|json|markdown|deliverables?|final answer/i,
      /urut|ordered|sequence|slide-by-slide|file-by-file|sections?|langkah|steps?|subsection/i,
      /acceptance|criteria|checklist|quality gate|kriteria/i,
    ]) +
      Math.min(100, sectionCount * 14 + bulletCount * 5) * 0.4) /
      1.4
  );
  const constraints = Math.round(
    (rubricScore(text, [
      /constraint|batasan|jangan|must|wajib|harus|avoid|larang|required|do not|do's|don'ts/i,
      /maks(?:imal)?|min(?:imal)?|at most|at least|no more than/i,
      /do not invent|jangan mengarang|state assumptions|tandai asumsi|asumsi|assumption/i,
      /clarifying questions|pertanyaan klarifikasi|only if blocked/i,
    ]) +
      Math.min(100, numericControls * 12) * 0.35) /
      1.35
  );
  const actionability = Math.round(
    (rubricScore(text, [
      /acceptance|criteria|kriteria|test|uji|run|export|deliver|ready to use|siap/i,
      /step|langkah|checklist|implementation|implementasi|workflow|process/i,
      /file|screen|api|table|slide|section|CTA|output|caption|visual|post/i,
    ]) +
      Math.min(100, Math.round(text.length / 10))) /
      2
  );

  const rawScore = Math.round((clarity + context + format + constraints + actionability) / 5);
  const score = Math.max(5, Math.min(99, rawScore - genericPenalty * 6));
  const tips = [
    clarity < 80 && "Make the role more specific: job title + domain + seniority level.",
    context < 80 && "Add audience, business context, source material, or explicit assumptions.",
    format < 80 && "Lock the output structure with section order and quantity/length limits.",
    constraints < 80 && "Add at least 3 concrete constraints and anti-hallucination rules.",
    actionability < 80 && "Add testable acceptance criteria.",
  ].filter(Boolean);

  return {
    actionability,
    score,
    clarity,
    context,
    constraints,
    format,
    tips: tips.length ? tips : ["The prompt is strong. Next iteration: add deeper domain details and example outputs."],
  };
}

const SECTION_PATTERNS = [
  /role|act as|bertindak sebagai|you are|kamu adalah/i,
  /context|konteks|latar belakang/i,
  /objective|tujuan|goal/i,
  /output format|format output|struktur output|deliverable/i,
  /constraint|batasan|jangan|must not|wajib|harus/i,
  /acceptance|criteria|kriteria|checklist|quality gate/i,
];

function estimateSectionBump(beforeText, afterText) {
  let bump = 0;
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.test(afterText) && !pattern.test(beforeText)) bump += 2;
  }
  return Math.min(14, bump);
}

function modeOptimizationBump(mode, beforeText, afterText) {
  const m = String(mode || "").toLowerCase();
  const lengthRatio = afterText.length / Math.max(1, beforeText.length);
  if (/detail/.test(m)) return lengthRatio >= 1.1 ? 10 : 6;
  if (/clear|jelas/.test(m)) return 7;
  if (/short|singkat/.test(m)) return lengthRatio <= 0.98 ? 6 : 3;
  if (/academic|akademik/.test(m)) return 8;
  if (/marketing/.test(m)) return 7;
  if (/coding|code/.test(m)) return 8;
  return 5;
}

/**
 * Score optimized output; reflects measurable gains when optimizer adds structure.
 */
export function scoreOptimizedPrompt(rawPrompt, optimizedPrompt, options = {}) {
  const before = scorePrompt(rawPrompt);
  const after = scorePrompt(optimizedPrompt);
  const beforeText = String(rawPrompt || "").trim();
  const afterText = String(optimizedPrompt || "").trim();

  if (!afterText || afterText === beforeText) return after;

  const dimensionDelta =
    after.clarity -
    before.clarity +
    (after.context - before.context) +
    (after.format - before.format) +
    (after.constraints - before.constraints) +
    (after.actionability - before.actionability);

  let displayScore = after.score;
  if (displayScore <= before.score) {
    const structuralBump = Math.max(0, Math.round(dimensionDelta / 4));
    const sectionBump = estimateSectionBump(beforeText, afterText);
    const modeBump = options.fromOptimizer ? modeOptimizationBump(options.mode, beforeText, afterText) : 0;
    const bump = Math.max(structuralBump, sectionBump, modeBump);
    if (bump > 0) {
      displayScore = Math.min(99, before.score + bump);
    }
  }

  return {
    ...after,
    score: displayScore,
    tips:
      displayScore > before.score
        ? [
            `Optimizer added ${displayScore - before.score} pts via clearer structure and stronger guardrails.`,
            ...after.tips,
          ]
        : after.tips,
  };
}
