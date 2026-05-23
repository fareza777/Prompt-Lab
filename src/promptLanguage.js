/**
 * Detect user input language and keep generated prompts in the same language.
 */

const ID_MARKERS =
  /\b(yang|dan|di|ke|dari|untuk|dengan|ini|itu|tidak|adalah|akan|atau|pada|sebagai|agar|bisa|buat|tulis|jelaskan|kebutuhan|kamu|saya|kami|harus|mohon|tolong|buatkan|perlu|secara|tersebut|melalui|antara|serta|juga|dalam|oleh|karena|supaya|guna|aplikasi|laporan|presentasi|narasi)\b/gi;

const EN_MARKERS =
  /\b(the|and|for|with|this|that|your|you|make|create|write|should|will|about|from|into|using|please|need|want|stronger|content|prompt|help|describe|explain|build|generate|improve|instagram|product|coffee|marketing|audience|deliverable)\b/gi;

/**
 * @param {string} text
 * @returns {"en"|"id"}
 */
export function detectOutputLanguage(text) {
  const sample = String(text || "").trim().slice(0, 6000);
  if (!sample) return "id";

  const idScore = (sample.match(ID_MARKERS) || []).length;
  const enScore = (sample.match(EN_MARKERS) || []).length;

  if (enScore > idScore) return "en";
  if (idScore > enScore) return "id";

  const latinOnly = /^[\x00-\x7F\s]+$/.test(sample);
  if (latinOnly && /\b(the|and|for|with|make|create|your)\b/i.test(sample)) return "en";

  return "id";
}

/**
 * @param {...(string|undefined|null)} sources
 * @returns {"en"|"id"}
 */
export function resolveOutputLanguage(...sources) {
  const combined = sources
    .flat()
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");

  return detectOutputLanguage(combined);
}

/**
 * @param {"en"|"id"} code
 */
export function getLanguageMeta(code) {
  if (code === "en") {
    return {
      code: "en",
      label: "English",
      architectLabel: "senior prompt architect",
      audienceLine: "Clear, practical, and audience-appropriate.",
      styleLine: "Use clear, concrete English.",
      constraintLine: (tone) => `Use English with a ${tone} tone.`,
      criticSystem:
        "You are PromptLab Quality Critic. Audit a prompt as a senior prompt engineer. Output strict bullet points in English listing concrete defects (max 6). No preface, no praise, no rewrites.",
      refinerSystem:
        "You are PromptLab Refiner. Rewrite a prompt to fix all listed defects. Output only the final improved prompt in English, ready to copy. No preface, no critique, no brief, no commentary.",
      dialectMeta: "Output language: English",
      ocrHint:
        "Extract readable text from the image. Return English when the screenshot is in English. Preserve headings, bullets, tables, labels, and numbers.",
    };
  }

  return {
    code: "id",
    label: "Indonesian",
    architectLabel: "senior prompt architect Indonesia",
    audienceLine: "Jelas, praktis, dan cocok untuk audiens Indonesia.",
    styleLine: "Gunakan bahasa Indonesia yang jelas dan konkret.",
    constraintLine: (tone) => `Gunakan bahasa Indonesia dengan tone ${tone}.`,
    criticSystem:
      "You are PromptLab Quality Critic. Audit a prompt as a senior prompt engineer. Output strict bullet points in Indonesian listing concrete defects (max 6). No preface, no praise, no rewrites.",
    refinerSystem:
      "You are PromptLab Refiner. Rewrite a prompt to fix all listed defects. Output only the final improved prompt in Indonesian, ready to copy. No preface, no critique, no brief, no commentary.",
    dialectMeta: "Output language: Indonesian",
    ocrHint:
      "Ekstrak teks yang terbaca dari gambar. Kembalikan bahasa Indonesia jika teks di screenshot berbahasa Indonesia. Pertahankan heading, bullet, tabel, label, dan angka.",
  };
}

/**
 * @param {"en"|"id"} code
 */
export function getLanguageLockInstruction(code) {
  const meta = getLanguageMeta(code);
  return `Language rule (critical):
- User input language: ${meta.label}.
- The final prompt MUST be written entirely in ${meta.label}.
- Do not switch to another language unless the user explicitly requests it.`;
}
