/**
 * Unified compare/readiness scoring — shared by client and server.
 */

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function rubricScore(checks, text) {
  const hits = checks.filter((check) =>
    check instanceof RegExp ? check.test(text) : Boolean(check)
  ).length;
  return Math.round((hits / checks.length) * 100);
}

export function getLocalPromptRisks(prompt = "") {
  const risks = [];
  if (!/role|act as|bertindak/i.test(prompt)) risks.push("Role is not explicit.");
  if (!/format|output|struktur|json|markdown/i.test(prompt)) risks.push("Output format is not locked.");
  if (!/constraint|batasan|jangan|must|wajib/i.test(prompt)) risks.push("Constraints are weak.");
  return risks.length ? risks : ["No major issues detected."];
}

/** Extended 6-dimension score used by Compare (server + client local compare). */
export function scorePromptForCompare(prompt) {
  const text = String(prompt || "");
  const sectionCount = (text.match(
    /(?:^|\n)\s*(?:#{1,3}\s*)?(?:role|context|konteks|objective|tujuan|task|tugas|requirements|output|format|constraints|batasan|acceptance|criteria|quality|checklist)\b/gi
  ) || []).length;
  const numericControls = (text.match(
    /\b\d+\b|maks(?:imal)?|min(?:imal)?|at least|no more than|jumlah|kata|slide|section|bagian/gi
  ) || []).length;
  const genericPenalty = countMatches(text, [
    /\b(leverage|synergy|world-class|cutting-edge|next-level|game-changing|seamless|robust solution)\b/i,
    /\b(kelas dunia|terdepan|revolusioner|solusi terbaik)\b/i,
    /\[(?:your|insert|topik|isi|brand|context)[^\]]*\]/i,
  ]);

  const clarity = rubricScore(
    [
      /role|act as|bertindak/i,
      /objective|goal|tujuan|hasil akhir/i,
      /task|tugas|kerjakan|buat|susun|build|write/i,
      /senior|strategist|engineer|analyst|copywriter|researcher|spesialis/i,
      sectionCount >= 4,
    ],
    text
  );
  const context = rubricScore(
    [
      /context|konteks|latar belakang|berdasarkan|source|sumber/i,
      /audience|target|persona|pengguna|pembaca|customer/i,
      /lampiran|dokumen|data|file|screenshot|referensi/i,
      /assumption|asumsi|jika tidak tersedia/i,
      text.length >= 700,
    ],
    text
  );
  const format = rubricScore(
    [
      /format|output|struktur|section|bagian|table|tabel|json|markdown/i,
      /urut|ordered|sequence|slide-by-slide|file-by-file/i,
      numericControls >= 2,
      /acceptance|criteria|checklist|quality gate|kriteria/i,
      sectionCount >= 5,
    ],
    text
  );
  const constraints = rubricScore(
    [
      /constraint|batasan|jangan|must|wajib|harus|avoid|larang/i,
      /maks(?:imal)?|min(?:imal)?|at most|at least|no more than/i,
      /do not invent|jangan mengarang|state assumptions|tandai asumsi/i,
      /clarifying questions|pertanyaan klarifikasi|only if blocked/i,
      numericControls >= 3,
    ],
    text
  );
  const hallucinationResistance = rubricScore(
    [
      /jangan mengarang|do not invent|verify|source|citation|evidence|fakta/i,
      /asumsi|assumption|unknown|tidak tersedia/i,
      /clarifying questions|pertanyaan klarifikasi/i,
      /acceptance|quality gate|validasi/i,
      /lampiran|source|sumber|data/i,
    ],
    text
  );
  const actionability = rubricScore(
    [
      /acceptance|criteria|kriteria|test|uji|run|export|deliver/i,
      /step|langkah|checklist|implementation|implementasi/i,
      /file|screen|api|table|slide|section|CTA|output/i,
      numericControls >= 2,
      text.length >= 900,
    ],
    text
  );

  const rawOverall = Math.round(
    (clarity + context + format + constraints + hallucinationResistance + actionability) / 6
  );
  const overall = Math.max(5, Math.min(99, rawOverall - genericPenalty * 6));
  const risk = Math.max(5, Math.min(95, 100 - overall + genericPenalty * 4));

  return {
    actionability,
    clarity,
    constraints,
    context,
    format,
    hallucinationResistance,
    overall,
    risk,
    score: overall,
  };
}
