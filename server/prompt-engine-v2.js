import { buildImageVideoPromptAddon } from "../src/imageVideoPromptDelivery.js";
import { getLanguageLockInstruction, getLanguageMeta } from "../src/promptLanguage.js";
import { buildPhasedAppDeliveryInstruction } from "../src/phasedAppDelivery.js";
import { buildStructuredAuditInstruction } from "../src/structuredAuditDelivery.js";

const QUALITY_LEVELS = {
  simple: {
    minimumSections: 4,
    minimumCharacters: 280,
    requirementCount: 3,
    constraintCount: 2,
    acceptanceCount: 1,
  },
  standard: {
    minimumSections: 5,
    minimumCharacters: 450,
    requirementCount: 5,
    constraintCount: 3,
    acceptanceCount: 2,
  },
  complex: {
    minimumSections: 5,
    minimumCharacters: 650,
    requirementCount: 7,
    constraintCount: 4,
    acceptanceCount: 3,
  },
};

export function assessBuilderComplexity(payload = {}) {
  const text = `${payload.narrative || ""} ${payload.category || ""} ${payload.outputType || ""}`.toLowerCase();
  const attachmentCount = Array.isArray(payload.attachments)
    ? payload.attachments.length
    : Math.max(0, Number(payload.attachmentCount) || 0);
  const highStakes = /\b(legal|hukum|contract|kontrak|compliance|regulasi|finance|financial|keuangan|cashflow|pajak|tax|medical|medis|healthcare|kesehatan|patient|pasien|medication|obat)\b/i.test(text);
  const complexSignals = [
    /application code|aplikasi|web app|mobile app|full[ -]?stack|backend|frontend|api\b/i.test(text),
    /\b(ppt|powerpoint|presentation|presentasi|pitch deck|slide deck|video prompt|image prompt|structured audit|audit lengkap)\b/i.test(text),
    /\b(reconcile|rekonsiliasi|multi-file|multiple documents|beberapa dokumen|systematic review|research paper)\b/i.test(text),
    attachmentCount >= 2,
    String(payload.narrative || "").length >= 500,
  ];
  const standardSignals = [
    /\b(marketing|campaign|kampanye|landing page|conversion|funnel|strategy|strategi|analysis|analisis|report|laporan|proposal)\b/i.test(text),
    highStakes,
    attachmentCount === 1,
  ];
  const isShortForm = /\b(email|caption|subject line|short post|pesan singkat|follow-up|follow up)\b/i.test(text);
  const reasons = [];

  if (complexSignals.some(Boolean)) {
    if (complexSignals[0]) reasons.push("implementation deliverable");
    if (complexSignals[1]) reasons.push("structured media deliverable");
    if (complexSignals[2]) reasons.push("multi-source reasoning");
    if (attachmentCount >= 2) reasons.push("multiple attachments");
    if (complexSignals[4]) reasons.push("long source brief");
    if (highStakes) reasons.push("regulated or high-stakes domain");
    return { level: "complex", highStakes, reasons };
  }

  if (isShortForm && !standardSignals.some(Boolean)) {
    return { level: "simple", highStakes: false, reasons: ["short-form deliverable"] };
  }

  if (standardSignals[0]) reasons.push("multi-section professional deliverable");
  if (highStakes) reasons.push("regulated or high-stakes domain");
  if (attachmentCount === 1) reasons.push("attachment-backed request");
  if (!reasons.length) reasons.push("general professional request");
  return { level: "standard", highStakes, reasons };
}

export function getBuilderQualityPolicy(payload = {}) {
  const complexity = assessBuilderComplexity(payload);
  return {
    ...complexity,
    ...QUALITY_LEVELS[complexity.level],
  };
}

export function buildDepthDirective(payload = {}) {
  const policy = getBuilderQualityPolicy(payload);
  const isEnglish = String(payload.outputLanguage || "id").toLowerCase().startsWith("en");
  const lines = isEnglish
    ? [
        `<depth_mandate profile="${policy.level}">`,
        `- Include at least ${policy.requirementCount} concrete requirements, at least ${policy.constraintCount} constraints, and at least ${policy.acceptanceCount} testable acceptance criteria.`,
        "- Add detail only when it improves execution; do not pad simple deliverables.",
      ]
    : [
        `<depth_mandate profile="${policy.level}">`,
        `- Sertakan minimal ${policy.requirementCount} requirement konkret, ${policy.constraintCount} batasan, dan ${policy.acceptanceCount} acceptance criteria yang bisa diuji.`,
        "- Tambahkan detail hanya jika membantu eksekusi; jangan memanjangkan deliverable sederhana.",
      ];
  if (policy.highStakes) {
    lines.push(
      isEnglish
        ? "- Verify evidence, state uncertainty, avoid authoritative professional claims, and flag decisions that require qualified professional review."
        : "- Lakukan verifikasi bukti, nyatakan ketidakpastian, hindari klaim otoritatif, dan tandai keputusan yang memerlukan review profesional."
    );
  }
  lines.push("</depth_mandate>");
  return lines.join("\n");
}

export function isPromptBelowQualityFloor(prompt, policy = QUALITY_LEVELS.standard) {
  return String(prompt || "").trim().length < (Number(policy?.minimumCharacters) || QUALITY_LEVELS.standard.minimumCharacters);
}

/**
 * PromptLab Prompt Engine v2
 * --------------------------------------------------------------------------
 * Implementasi 10 optimasi engine prompt:
 *   1. System prompt restructure → XML/section tags
 *   2. Post-generation structure validator (+ retry hint)
 *   3. Critique-refine helper config (untuk dipanggil untuk semua tier)
 *   4. Domain pack diperluas (17 domain, multi-domain detection)
 *   5. Few-shot examples per optimizer mode
 *   6. Compare Judge swap-position (bias mitigation)
 *   7. Model dialect rendering layer (Claude/GPT/Gemini/DeepSeek/Qwen)
 *   8. Eval harness lightweight (score deltas → log)
 *   9. Self-consistency: signal kapan generate n=2
 *  10. PII / secret guardrail pre-send
 *
 * Modul ini sengaja dipisah dari `server/index.js` agar mudah di-test
 * dan di-eval secara independen.
 */

// ---------------------------------------------------------------------------
// 1) System prompts ber-struktur XML
// ---------------------------------------------------------------------------

/**
 * @param {{ modelTarget?: string, outputType?: string, tone?: string, category?: string }} payload
 * @returns {string}
 */
export function buildIntentSystemPromptXml(payload = {}) {
  const target = payload.modelTarget || payload.targetModel || "General";
  const deliverable = payload.outputType || "tidak dipilih";
  const tone = payload.tone || "Profesional";
  const langCode = payload.outputLanguage || "id";
  const meta = getLanguageMeta(langCode);
  return [
    `<role>PromptLab Intent Engine — ${meta.architectLabel}.</role>`,
    `<objective>Decompose user intent → expand domain knowledge → lock deliverable → render ONE ready-to-use prompt in ${meta.label}, no chatty preface.</objective>`,
    "<deliverable_lock priority=\"critical\">",
    `  Selected deliverable: ${deliverable}`,
    "  - User minta PPT → output prompt untuk membuat PPT.",
    "  - User minta Word/dokumen → output prompt untuk Word-style report.",
    "  - User minta aplikasi/app/website → output prompt untuk runnable application code.",
    "  - User minta Image Prompt → output prompt text-to-image (main + negative + ratio + model tuning).",
    "  - User minta Video Prompt → output prompt text-to-video dengan durasi, scene list, camera, dan negative prompt.",
    "  - Jangan pernah swap deliverable di tengah render.",
    "</deliverable_lock>",
    `<target_ai>${target}</target_ai>`,
    `<tone>${tone}</tone>`,
    "<rendering_rules>",
    "  - Sertakan: role, context, objective, requirements, constraints, output format, acceptance criteria.",
    "  - Gunakan action verbs (define, extract, map, rank, build, verify).",
    "  - Kuantifikasi jumlah/panjang/struktur sesuai kebutuhan.",
    "  - Sebutkan kapan AI harus klarifikasi (hanya jika informasi blocker).",
    "</rendering_rules>",
    "<forbidden>",
    "  - Preface basa-basi (\"Tentu!\", \"Berikut adalah...\").",
    "  - Engine brief atau meta-komentar di output final.",
    "  - Mengubah deliverable yang sudah dipilih user.",
    "  - Placeholder kosong seperti [isi topik] tanpa di-instantiate.",
    "  - Switching output language away from the user's input language.",
    "</forbidden>",
    `<language>${getLanguageLockInstruction(langCode).replace(/\n/g, "\n  ")}</language>`,
    (() => {
      const audit = buildStructuredAuditInstruction(
        payload.narrative || "",
        payload.category || "",
        payload.outputType || deliverable,
        langCode
      );
      const phased = buildPhasedAppDeliveryInstruction(
        payload.narrative || "",
        payload.category || "",
        payload.outputType || deliverable,
        langCode
      );
      const blocks = [];
      if (audit) blocks.push(`<structured_audit>\n${audit.replace(/\n/g, "\n  ")}\n</structured_audit>`);
      if (phased) blocks.push(`<phased_delivery>\n${phased.replace(/\n/g, "\n  ")}\n</phased_delivery>`);
      const media = buildImageVideoPromptAddon({ ...payload, outputLanguage: langCode });
      if (media) blocks.push(media.replace(/\n/g, "\n  "));
      return blocks.join("\n");
    })(),
    "<output>Return only the final prompt, langsung copy-paste ready.</output>",
  ].join("\n");
}

/**
 * Compact system prompt for MiniMax — same deliverable lock, far fewer tokens than full XML engine.
 * @param {object} payload
 * @returns {string}
 */
export function buildLeanIntentSystemPrompt(payload = {}) {
  const target = payload.modelTarget || payload.targetModel || "General";
  const deliverable = payload.outputType || "tidak dipilih";
  const tone = payload.tone || "Profesional";
  const langCode = payload.outputLanguage || "id";
  const meta = getLanguageMeta(langCode);
  const media = buildImageVideoPromptAddon({ ...payload, outputLanguage: langCode });
  const blocks = [
    `<role>PromptLab — ${meta.architectLabel}.</role>`,
    `<objective>Render ONE copy-paste-ready prompt in ${meta.label}. No chatty preface.</objective>`,
    `<deliverable_lock>Deliverable: ${deliverable}. Never swap deliverable type.</deliverable_lock>`,
    `<target_ai>${target}</target_ai>`,
    `<tone>${tone}</tone>`,
    getLanguageLockInstruction(langCode),
  ];
  if (media) blocks.push(media);
  blocks.push("<output>Return only the final prompt.</output>");
  return blocks.join("\n");
}

/**
 * @param {object} payload
 * @returns {string}
 */
export function buildOptimizerSystemPromptXml(payload = {}) {
  const target = payload.targetModel || "General";
  const tone = payload.tone || "Profesional";
  const mode = payload.mode || "Lebih Jelas";
  const langCode = payload.outputLanguage || "id";
  const meta = getLanguageMeta(langCode);
  return [
    `<role>PromptLab Optimizer Engine — ${meta.architectLabel}.</role>`,
    `<objective>Improve an existing prompt using optimization mode as a meta-prompt layer. Preserve original intent, deliverable, and ${meta.label} language. Return only the final optimized prompt.</objective>`,
    `<optimization_mode>${mode}</optimization_mode>`,
    `<target_ai>${target}</target_ai>`,
    `<tone>${tone}</tone>`,
    "<rules>",
    "  - Jangan ubah jenis deliverable yang diminta prompt lama.",
    "  - Apply mode optimasi secara spesifik, bukan rewrite generik.",
    "  - Tambahkan role/context/output format/constraints/acceptance jika belum ada.",
    "  - Pertahankan fakta yang sudah ada di prompt lama.",
    "</rules>",
    "<forbidden>preface, engine brief, meta-komentar, judul \"PromptLab Optimizer Engine\", language switch</forbidden>",
    `<language>${getLanguageLockInstruction(langCode).replace(/\n/g, "\n  ")}</language>`,
    "<output>final optimized prompt only, ready to copy.</output>",
  ].join("\n");
}

/**
 * @param {object} payload
 * @returns {string}
 */
export function buildCompareSystemPromptXml(payload = {}) {
  const target = payload.targetModel || "General";
  return [
    "<role>PromptLab Compare Judge — neutral prompt evaluator.</role>",
    "<objective>Evaluate two prompts AS prompts (jangan eksekusi). Score on 6 dimensions and pick a winner.</objective>",
    `<target_ai>${target}</target_ai>`,
    "<bias_guard>",
    "  - Jangan favoritkan prompt yang lebih panjang otomatis.",
    "  - Jangan favoritkan posisi A atau B.",
    "  - Skor murni berdasarkan kualitas prompt, bukan estetika.",
    "</bias_guard>",
    "<output>strict JSON only, no markdown, no preface.</output>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 2) Post-generation structure validator
// ---------------------------------------------------------------------------

const REQUIRED_SECTIONS = [
  { id: "role", patterns: [/\brole\b/i, /\bperan\b/i, /bertindak sebagai/i, /act as/i] },
  { id: "context", patterns: [/\bcontext\b/i, /\bkonteks\b/i, /\bbackground\b/i, /\blatar\b/i] },
  { id: "task", patterns: [/\btask\b/i, /\btugas\b/i, /\bobjective\b/i, /\btujuan\b/i, /\bgoal\b/i] },
  { id: "output_format", patterns: [/output format/i, /format output/i, /format\s*:/i, /struktur output/i, /deliverable/i] },
  { id: "constraints", patterns: [/\bconstraint/i, /\bbatasan\b/i, /\blarangan\b/i, /tidak boleh/i, /must not/i, /jangan/i] },
  { id: "acceptance", patterns: [/acceptance criteria/i, /quality gate/i, /kriteria sukses/i, /checklist/i, /success criteria/i] },
];

/**
 * Validasi prompt punya section esensial.
 * @param {string} prompt
 * @returns {{ valid: boolean, missing: string[], score: number }}
 */
export function validatePromptStructure(prompt) {
  const text = String(prompt || "");
  const missing = [];
  let hits = 0;
  for (const section of REQUIRED_SECTIONS) {
    const found = section.patterns.some((re) => re.test(text));
    if (found) hits += 1;
    else missing.push(section.id);
  }
  const score = Math.round((hits / REQUIRED_SECTIONS.length) * 100);
  // Toleran: ≥4 dari 6 dianggap valid. Kurang dari itu → retry hint.
  return { valid: hits >= 4, missing, score };
}

/**
 * Bangun retry instruction untuk menambahkan section yang hilang.
 * @param {string} basePrompt
 * @param {string[]} missing
 * @returns {string}
 */
export function buildStructureRetryInstruction(basePrompt, missing) {
  if (!missing.length) return "";
  const labelMap = {
    role: "Role / Peran spesifik",
    context: "Context / Konteks",
    task: "Task / Tugas terukur",
    output_format: "Output Format / struktur deliverable",
    constraints: "Constraints / Batasan konkret (≥3)",
    acceptance: "Acceptance Criteria / Quality gates",
  };
  const labels = missing.map((id) => `- ${labelMap[id] || id}`).join("\n");
  return [
    "Prompt berikut masih kurang section penting. Lengkapi dengan menambahkan:",
    labels,
    "",
    "Prompt yang harus dilengkapi:",
    "---",
    basePrompt,
    "---",
    "",
    "Output: prompt final lengkap, tanpa preface.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 4) Domain pack diperluas (17 domain)
// ---------------------------------------------------------------------------

/**
 * Multi-domain detection. Mengembalikan primary + secondary kalau ada.
 * @param {object} payload
 * @returns {{ primary: string, secondary: string|null, confidence: number }}
 */
export function detectDomains(payload = {}) {
  const text = `${payload.narrative || ""} ${payload.category || ""} ${payload.outputType || ""}`.toLowerCase();
  const signals = [
    { domain: "marketing conversion workflow", weight: 35, re: /\b(marketing|iklan|ads|kampanye|campaign|copywriting|landing|funnel|conversion|leads|cta|brand)\b/i },
    { domain: "runnable application", weight: 45, re: /\b(aplikasi|app|website|web app|mobile app|dashboard|sistem|platform|software|frontend|backend|full-?stack|api|kasir|pos)\b/i },
    { domain: "presentation planning", weight: 45, re: /\b(ppt|powerpoint|presentasi|presentation|slide|deck|pitch)\b/i },
    { domain: "structured document", weight: 25, re: /\b(word|docx|dokumen|laporan|report|proposal|memo|sop|kebijakan)\b/i },
    { domain: "creative photo editing tool", weight: 55, re: /\b(edit foto|photo editor|image editor|editor foto)\b/i },
    {
      domain: "AI image generation prompt",
      weight: 65,
      re: /\b(image prompt|text[\s-]?to[\s-]?image|t2i|midjourney|dall-?e|flux|stable diffusion|sdxl|ideogram|leonardo|firefly|image ai)\b/i,
    },
    {
      domain: "AI video generation prompt",
      weight: 65,
      re: /\b(video prompt|text[\s-]?to[\s-]?video|t2v|runway|kling|sora|pika|haiper|luma|veo|minimax video|hailuo|seedance|video ai|generate video)\b/i,
    },
    { domain: "survey or form analysis", weight: 45, re: /\b(survey|kuesioner|questionnaire|formulir|riset|responden|sample)\b/i },
    { domain: "legal & compliance", weight: 70, re: /\b(legal|hukum|contract|kontrak|perjanjian|nda|tos|privacy|gdpr|uu pdp|compliance|regulasi)\b/i },
    { domain: "finance & accounting", weight: 60, re: /\b(finance|financial|keuangan|akuntansi|laporan keuangan|pajak|tax|invoice|cashflow|budget|investor|valuation)\b/i },
    { domain: "education k12 & higher", weight: 55, re: /\b(pelajaran|materi|curriculum|kurikulum|silabus|guru|murid|siswa|mahasiswa|rpp|modul ajar|lesson plan)\b/i },
    { domain: "ux research & product discovery", weight: 50, re: /\b(ux|user research|persona|user journey|usability|wireframe|prototype|product discovery|jtbd)\b/i },
    { domain: "ecommerce & marketplace ops", weight: 50, re: /\b(tokopedia|shopee|lazada|marketplace|product listing|toko online|katalog|sku|promo)\b/i },
    { domain: "healthcare & clinical", weight: 70, re: /\b(healthcare|health|medical|medication|patient|clinic|kesehatan|medis|dokter|pasien|klinik|diagnosa|obat|farmasi|rumah sakit|edukasi pasien)\b/i },
    { domain: "data analytics & reporting", weight: 60, re: /\b(analisis data|data analysis|dashboard data|spreadsheet|sql|bigquery|metabase|kpi|metrics|cohort|funnel analytics|tableau|power bi)\b/i },
    { domain: "hr & people ops", weight: 50, re: /\b(hr|sdm|rekrutmen|recruitment|onboarding|kpi karyawan|job description|interview|appraisal)\b/i },
    { domain: "customer support & ops", weight: 50, re: /\b(customer support|cs|helpdesk|ticket|faq|knowledge base|escalation|sla)\b/i },
    { domain: "social media content", weight: 45, re: /\b(tiktok|instagram|reels|twitter|x post|threads|linkedin|caption|hashtag|short video|konten medsos)\b/i },
    { domain: "video script & podcast", weight: 45, re: /\b(youtube|video script|naskah|voice over|vo|podcast|episode|shorts script)\b/i },
  ];
  const outputBonuses = {
    "application code": "runnable application",
    ppt: "presentation planning",
    "word document": "structured document",
    "image prompt": "AI image generation prompt",
    "video prompt": "AI video generation prompt",
  };
  const scores = signals.map((signal, index) => {
    const regex = new RegExp(signal.re.source, "gi");
    const occurrences = (text.match(regex) || []).length;
    const outputBonus = outputBonuses[String(payload.outputType || "").toLowerCase()] === signal.domain ? 220 : 0;
    return { ...signal, index, score: occurrences * signal.weight + outputBonus };
  }).filter((signal) => signal.score > 0);
  if (scores.length === 0) {
    return { primary: "generic prompt", secondary: null, confidence: 0 };
  }
  scores.sort((a, b) => b.score - a.score || a.index - b.index);
  const secondScore = scores[1]?.score || 0;
  const confidence = Math.round((scores[0].score / (scores[0].score + secondScore || scores[0].score)) * 100);
  return {
    primary: scores[0].domain,
    secondary: scores[1]?.domain || null,
    confidence,
  };
}

/**
 * Domain pack diperluas. Mengembalikan pack untuk primary + secondary (kalau ada).
 * @param {object} payload
 * @returns {{ primary: object, secondary: object|null, domains: {primary:string, secondary:string|null, confidence:number} }}
 */
export function getExpandedDomainPack(payload = {}) {
  const domains = detectDomains(payload);
  const packs = EXPANDED_PACKS;
  return {
    primary: packs[domains.primary] || packs["generic prompt"],
    secondary: domains.secondary ? packs[domains.secondary] : null,
    domains,
  };
}

const EXPANDED_PACKS = {
  "marketing conversion workflow": {
    domain: "marketing conversion workflow",
    role: "senior conversion strategist untuk pasar Indonesia",
    requirements: ["definisikan audience segment", "tulis offer + proof", "map objection", "tulis CTA path", "siapkan varian per channel"],
    constraints: ["hindari klaim tanpa bukti", "CTA harus eksplisit", "tandai asumsi"],
    outputControls: ["section landing page terurut", "limit kata per section", "jumlah varian"],
    qualityGates: ["pesan sesuai audiens", "offer konkret", "CTA measurable", "tanpa buzzword kosong"],
  },
  "runnable application": {
    domain: "runnable application",
    role: "senior full-stack product engineer",
    requirements: ["tentukan stack", "daftar screen", "data model", "API/mock API", "states + validation", "local run steps"],
    constraints: ["hindari arsitektur kabur", "sertakan empty/loading/error states", "harus runnable"],
    outputControls: ["folder structure", "file-by-file plan", "acceptance tests", "manual QA steps"],
    qualityGates: ["app bisa di-run lokal", "flow utama testable", "UI states tercover", "data contract eksplisit"],
  },
  "presentation planning": {
    domain: "presentation planning",
    role: "senior presentation strategist",
    requirements: ["definisikan audiens", "story arc", "slide sequence", "visual per slide", "speaker notes"],
    constraints: ["lock slide count", "hindari visual generik", "kaitkan visual dengan fakta"],
    outputControls: ["slide-by-slide table", "visual guidance", "speaker notes", "export criteria"],
    qualityGates: ["narrative logis", "tiap slide 1 fungsi", "visual mendukung klaim"],
  },
  "structured document": {
    domain: "structured document",
    role: "senior technical & editorial writer",
    requirements: ["tujuan dokumen", "section map", "evidence handling", "tabel/contoh", "review checklist"],
    constraints: ["jangan rekayasa fakta", "tandai asumsi", "preserve citation"],
    outputControls: ["outline", "section goals", "panjang kata", "quality checklist"],
    qualityGates: ["section lengkap", "klaim traceable", "rekomendasi actionable"],
  },
  "creative photo editing tool": {
    domain: "creative photo editing tool",
    role: "senior AI visual prompt director",
    requirements: ["subject", "composition", "lighting", "style", "negative prompt", "export ratio"],
    constraints: ["hindari edit mustahil", "preserve identitas saat dibutuhkan", "tandai asumsi visual"],
    outputControls: ["main prompt", "negative prompt", "variant style", "quality settings"],
    qualityGates: ["intent visual jelas", "constraint mengurangi artifact", "settings eksplisit"],
  },
  "AI image generation prompt": {
    domain: "AI image generation prompt",
    role: "senior text-to-image prompt director (Midjourney, DALL·E, Flux, SDXL)",
    requirements: [
      "subject & action/pose",
      "environment",
      "lighting recipe",
      "style & medium",
      "composition & camera/lens",
      "negative prompt",
      "aspect ratio",
      "model-specific tuning",
    ],
    constraints: ["hindari teks panjang di gambar kecuali diminta", "tandai asumsi visual", "pisahkan main vs negative"],
    outputControls: ["main prompt", "negative prompt", "aspect ratio", "2 variants (safe/bold)", "model notes"],
    qualityGates: ["6-part formula lengkap", "negative prompt mengurangi artifact", "ratio & style eksplisit"],
  },
  "AI video generation prompt": {
    domain: "AI video generation prompt",
    role: "senior text-to-video prompt director (Runway, Kling, Sora, Pika, MiniMax/Hailuo, Luma, Veo)",
    requirements: [
      "total duration (seconds)",
      "aspect ratio & platform",
      "scene list with timestamps",
      "camera move per scene",
      "lighting & mood",
      "motion speed & continuity",
      "negative prompt",
      "audio/SFX cues (optional)",
    ],
    constraints: [
      "satu ide visual per beat",
      "hook dalam 0–3 detik pertama",
      "jangan scene tanpa camera direction",
      "tandai continuity karakter/props",
    ],
    outputControls: [
      "master prompt",
      "shot list table (time | visual | camera | motion | audio)",
      "negative prompt",
      "platform export notes",
    ],
    qualityGates: ["durasi eksplisit", "setiap scene punya camera+motion", "hook kuat", "continuity jelas"],
  },
  "survey or form analysis": {
    domain: "survey or form analysis",
    role: "senior research analyst",
    requirements: ["map questions", "segment responses", "rank findings", "limitations", "next actions"],
    constraints: ["jangan overclaim", "pisahkan data dari interpretasi", "tandai sample gap"],
    outputControls: ["findings table", "priority ranking", "risk notes", "recommendations"],
    qualityGates: ["insight sitasi data", "limitasi visible", "aksi prioritized"],
  },
  "legal & compliance": {
    domain: "legal & compliance",
    role: "senior legal counsel Indonesia (UU PDP & KUHPerdata aware)",
    requirements: ["definisikan para pihak", "scope kewajiban", "definisikan istilah kunci", "klausul risiko", "mekanisme dispute"],
    constraints: ["jangan menjadi nasihat hukum final", "tandai ambiguitas regulasi", "sebut yurisdiksi"],
    outputControls: ["section terstruktur (Pihak, Definisi, Kewajiban, Ketentuan Khusus, Penutup)", "tabel kewajiban", "disclaimer"],
    qualityGates: ["bahasa formal & presisi", "klausul tidak saling bentrok", "ada disclaimer non-advis"],
  },
  "finance & accounting": {
    domain: "finance & accounting",
    role: "senior FP&A analyst (PSAK & IFRS aware)",
    requirements: ["periode laporan", "metrik utama (revenue, COGS, margin, cashflow)", "asumsi model", "skenario", "rekomendasi"],
    constraints: ["jangan invent angka", "tandai asumsi", "konsisten satuan (Rp/USD)"],
    outputControls: ["tabel angka", "skenario base/best/worst", "ringkasan eksekutif"],
    qualityGates: ["angka konsisten", "asumsi transparan", "rekomendasi terukur"],
  },
  "education k12 & higher": {
    domain: "education k12 & higher",
    role: "senior instructional designer (Kurikulum Merdeka aware)",
    requirements: ["capaian pembelajaran", "alur kegiatan", "asesmen", "diferensiasi", "alokasi waktu"],
    constraints: ["sesuai level kelas", "bahasa age-appropriate", "tandai prasyarat"],
    outputControls: ["RPP/modul ajar", "lembar kerja", "rubrik asesmen"],
    qualityGates: ["aktivitas terukur", "asesmen selaras capaian", "diferensiasi nyata"],
  },
  "ux research & product discovery": {
    domain: "ux research & product discovery",
    role: "senior UX researcher (JTBD & evaluative research)",
    requirements: ["riset question", "metode (interview/usability/diary)", "kriteria partisipan", "skenario task", "rencana analisis"],
    constraints: ["hindari leading questions", "konsen etika", "tandai bias risiko"],
    outputControls: ["discussion guide", "task scenarios", "consent script", "analysis plan"],
    qualityGates: ["pertanyaan answerable", "metode sesuai tujuan", "etika jelas"],
  },
  "ecommerce & marketplace ops": {
    domain: "ecommerce & marketplace ops",
    role: "senior marketplace operator (Tokopedia/Shopee/Lazada)",
    requirements: ["judul produk SEO", "deskripsi terstruktur", "varian + stok", "harga + promo", "spesifikasi"],
    constraints: ["patuhi rules marketplace", "jangan langgar trademark", "info pengiriman jujur"],
    outputControls: ["judul (≤70 karakter)", "deskripsi (5 paragraf)", "FAQ produk", "kata kunci"],
    qualityGates: ["keyword density wajar", "spesifikasi lengkap", "USP eksplisit"],
  },
  "healthcare & clinical": {
    domain: "healthcare & clinical",
    role: "senior medical writer (bukan pengganti dokter)",
    requirements: ["audiens (pasien/awam/profesional)", "topik kondisi", "sumber referensi", "level kedalaman", "call-to-action edukasi"],
    constraints: ["WAJIB disclaimer non-medis", "jangan beri diagnosis spesifik", "rujuk profesional"],
    outputControls: ["ringkasan kondisi", "tanda & gejala", "kapan harus ke dokter", "FAQ", "disclaimer"],
    qualityGates: ["bahasa empatik", "referensi credible", "disclaimer prominent"],
  },
  "data analytics & reporting": {
    domain: "data analytics & reporting",
    role: "senior analytics engineer (SQL + BI tools)",
    requirements: ["pertanyaan bisnis", "metric definition", "skema data", "kueri/transformasi", "visualisasi"],
    constraints: ["validasi assumption data", "tandai data gap", "konsisten naming"],
    outputControls: ["query/dbt model", "dashboard layout", "metric dictionary"],
    qualityGates: ["metric reproducible", "edge case dihandle", "performance dipikirkan"],
  },
  "hr & people ops": {
    domain: "hr & people ops",
    role: "senior people ops specialist",
    requirements: ["definisikan role/level", "kompetensi inti", "tahapan proses", "kriteria evaluasi", "template komunikasi"],
    constraints: ["non-discriminatory wording", "patuhi UU Ketenagakerjaan Indonesia", "tandai sensitive data"],
    outputControls: ["job description / scorecard / email template", "tahapan timeline", "rubrik penilaian"],
    qualityGates: ["bias-free language", "kriteria objektif", "proses kompliansi"],
  },
  "customer support & ops": {
    domain: "customer support & ops",
    role: "senior CX operations lead",
    requirements: ["definisikan ticket type", "tahapan triage", "template balasan", "escalation path", "SLA"],
    constraints: ["nada empatik tapi tegas", "tandai sensitive issue (refund/legal)", "konsisten brand voice"],
    outputControls: ["macros/canned response", "decision tree", "FAQ", "SLA matrix"],
    qualityGates: ["balasan personal-feel", "decision tree lengkap", "SLA realistis"],
  },
  "social media content": {
    domain: "social media content",
    role: "senior social media strategist (algo-aware Indonesia)",
    requirements: ["platform (IG/TikTok/X/LinkedIn)", "content pillar", "hook 3 detik", "CTA", "hashtag/mention"],
    constraints: ["sesuaikan durasi/limit karakter", "hindari trigger ban platform", "respect copyright musik"],
    outputControls: ["caption", "script hook+body+CTA", "list hashtag", "thumbnail brief"],
    qualityGates: ["hook tajam", "value delivery jelas", "CTA terarah"],
  },
  "video script & podcast": {
    domain: "video script & podcast",
    role: "senior script writer (YouTube/podcast Indonesia)",
    requirements: ["durasi target", "audiens", "hook 15 detik pertama", "outline segmen", "CTA penutup"],
    constraints: ["bahasa lisan natural", "transisi antar segmen halus", "hindari jargon tanpa konteks"],
    outputControls: ["full script per segmen", "cue B-roll/SFX", "timestamp", "show notes"],
    qualityGates: ["hook menahan retensi", "alur jelas", "CTA spesifik"],
  },
  "generic prompt": {
    domain: "generic prompt",
    role: "senior prompt architect",
    requirements: ["lock intent", "definisikan audiens", "tentukan format output", "constraints", "quality gates"],
    constraints: ["hindari kata generik", "preserve deliverable", "tanya hanya blocker"],
    outputControls: ["role", "context", "task", "requirements", "constraints", "acceptance criteria"],
    qualityGates: ["spesifik", "actionable", "testable", "siap copy"],
  },
};

// ---------------------------------------------------------------------------
// 5) Few-shot examples per optimizer mode
// ---------------------------------------------------------------------------

const FEW_SHOT = {
  clarity: `Contoh sebelum: "Tulis artikel marketing tentang produk skincare."
Contoh sesudah:
Role: Senior copywriter beauty & wellness.
Konteks: Brand X meluncurkan serum vitamin C untuk wanita 25-35 di Indonesia.
Tugas: Tulis artikel 800 kata yang mendorong pembelian melalui edukasi manfaat & social proof.
Output: 5 section (hook, masalah, solusi, proof, CTA), heading H2.
Constraints: Hindari klaim medis, sebut 3 ingredient utama, sertakan 1 testimoni placeholder.
Acceptance: Hook ≤ 35 kata, CTA spesifik (link/produk), bebas typo.`,
  compression: `Contoh sebelum: paragraf 400 kata bertele-tele dengan banyak repetisi.
Contoh sesudah: 6 bullet point berisi role, konteks, tugas, output, constraints, acceptance — total < 120 kata, tidak kehilangan intent atau quality gate.`,
  detail: `Contoh sebelum: "Buat aplikasi todo list."
Contoh sesudah: Spesifikasi 25 baris: stack (React + Supabase), 4 screen (List, Detail, Settings, Auth), data model (id, title, done, due_date, user_id), API CRUD, empty/loading/error states tiap screen, validasi (title ≤ 120 char), test (Vitest 80%+), local run (npm i & npm run dev).`,
  academic: `Contoh sebelum: "Tulis paper tentang AI di pendidikan."
Contoh sesudah: Tentukan research question, scope (K-12 Indonesia 2020-2025), metode (systematic literature review), struktur IMRaD, gaya sitasi APA 7, larangan klaim tanpa rujukan, batas 4000 kata, abstrak ≤ 250 kata.`,
  marketing: `Contoh sebelum: "Promo produk baru."
Contoh sesudah: Audiens (ibu rumah tangga 28-40, urban Jabodetabek), offer (diskon 30% + free shipping H1), proof (rating 4.8 dari 1.2k review), objection (harga vs kualitas), CTA (beli sekarang link X), 3 varian (IG caption, WA broadcast, landing hero).`,
  implementation: `Contoh sebelum: "Tambahkan fitur login Google."
Contoh sesudah: File yang harus diubah (auth.ts, useAuth.ts, login.tsx), API endpoint /api/auth/google, env vars (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET), state machine (idle→loading→success/error), test case (success/cancel/network-error), local run command, manual QA checklist 5 langkah.`,
};

/**
 * Ambil few-shot example untuk mode optimizer.
 * @param {string} mode
 * @returns {string}
 */
export function getFewShotForMode(mode) {
  const norm = String(mode || "").toLowerCase();
  if (/clear|jelas/.test(norm)) return FEW_SHOT.clarity;
  if (/short|singkat|compress/.test(norm)) return FEW_SHOT.compression;
  if (/detail/.test(norm)) return FEW_SHOT.detail;
  if (/academic|akademik/.test(norm)) return FEW_SHOT.academic;
  if (/marketing/.test(norm)) return FEW_SHOT.marketing;
  if (/coding|kode|implement/.test(norm)) return FEW_SHOT.implementation;
  return FEW_SHOT.clarity;
}

// ---------------------------------------------------------------------------
// 6) Compare Judge swap-position helper
// ---------------------------------------------------------------------------

/**
 * Tukar A & B di payload (untuk position-swap bias mitigation).
 * @param {{ promptA: string, promptB: string }} payload
 * @returns {object}
 */
export function buildSwappedComparePayload(payload) {
  return {
    ...payload,
    promptA: payload.promptB,
    promptB: payload.promptA,
  };
}

/**
 * Merge dua hasil compare (original + swapped) → skor rata-rata, winner berdasarkan
 * majority/avg overall.
 * @param {object} original
 * @param {object} swapped
 * @returns {object}
 */
export function mergeComparePositionSwap(original, swapped) {
  if (!original) return swapped;
  if (!swapped) return original;
  // Di swapped, "A" sebenarnya prompt B asli — flip dulu
  const flippedSwapped = {
    ...swapped,
    winner: swapped.winner === "A" ? "B" : swapped.winner === "B" ? "A" : "tie",
    scores: { A: swapped.scores?.B || {}, B: swapped.scores?.A || {} },
    risks: { A: swapped.risks?.B || [], B: swapped.risks?.A || [] },
    best_for: { A: swapped.best_for?.B || "", B: swapped.best_for?.A || "" },
  };
  const avgScores = (a = {}, b = {}) => {
    const keys = ["clarity", "context", "format", "constraints", "risk", "overall"];
    const out = {};
    for (const k of keys) {
      const av = Number(a[k]) || 0;
      const bv = Number(b[k]) || 0;
      out[k] = Math.round((av + bv) / 2);
    }
    return out;
  };
  const mergedScores = {
    A: avgScores(original.scores?.A, flippedSwapped.scores?.A),
    B: avgScores(original.scores?.B, flippedSwapped.scores?.B),
  };
  const overallA = mergedScores.A.overall;
  const overallB = mergedScores.B.overall;
  let winner = "tie";
  if (overallA > overallB + 2) winner = "A";
  else if (overallB > overallA + 2) winner = "B";
  return {
    ...original,
    winner,
    winner_label: winner === "A" ? "Prompt A" : winner === "B" ? "Prompt B" : "Tie",
    scores: mergedScores,
    bias_mitigation: "position-swap-averaged",
  };
}

// ---------------------------------------------------------------------------
// 7) Model dialect rendering layer
// ---------------------------------------------------------------------------

/**
 * Render prompt ke "dialect" target AI. Tujuan: instruction-following lebih tinggi
 * tanpa mengubah substansi.
 * @param {string} prompt
 * @param {string} targetModel
 * @returns {string}
 */
export function renderForModelDialect(prompt, targetModel, outputLanguage = "id") {
  const text = String(prompt || "");
  if (!text.trim()) return text;
  const target = String(targetModel || "").toLowerCase();
  const meta = getLanguageMeta(outputLanguage);

  if (/claude/.test(target)) {
    // Claude suka XML tag + explicit role + "Think before answering".
    if (/<\w+>/.test(text)) return text; // sudah ada tag, jangan double
    return [
      "<role>Assistant senior sesuai konteks di bawah.</role>",
      "<task>",
      text.trim(),
      "</task>",
      "<thinking_hint>Think before answering. Strukturkan internal dulu sebelum menulis output final.</thinking_hint>",
    ].join("\n");
  }
  if (/gemini/.test(target)) {
    // Gemini suka detailed instruction + explicit format example.
    return `${text.trim()}\n\nFormat catatan: ikuti urutan section di atas. Kalau salah satu section tidak relevan untuk request ini, tetap tulis section dengan keterangan "tidak berlaku" dan alasannya.`;
  }
  if (/deepseek|qwen/.test(target)) {
    return `[Meta: follow the structure strictly. ${meta.dialectMeta}. Do not skip sections.]\n\n${text.trim()}`;
  }
  if (/gpt|chatgpt|openai|o1|o3|o4/.test(target)) {
    // GPT suka markdown headers + numbered steps. Pastikan ada list.
    if (/^[#-]/m.test(text) || /^\d+\.\s/m.test(text)) return text;
    return `${text.trim()}\n\nFormat: gunakan markdown headers (##) untuk setiap section dan numbered list untuk langkah konkret.`;
  }
  return text;
}

// ---------------------------------------------------------------------------
// 8) Lightweight eval harness
// ---------------------------------------------------------------------------

/**
 * Skor prompt secara lokal berdasarkan heuristik struktur.
 * @param {string} prompt
 * @returns {number} 0-100
 */
export function localPromptScore(prompt) {
  const text = String(prompt || "");
  if (!text.trim()) return 0;
  const { score: structScore } = validatePromptStructure(text);
  const length = text.length;
  const lengthScore = length < 200 ? 20 : length < 500 ? 60 : length < 3000 ? 90 : 75;
  const hasNumbers = /\b\d+\b/.test(text) ? 10 : 0;
  const hasBullets = /^[-*\d]+[\.)]?\s/m.test(text) ? 10 : 0;
  const genericPenalty = /\b(seamless|cutting-?edge|kelas dunia|terbaik|revolusioner|world-?class)\b/i.test(text) ? -15 : 0;
  return Math.max(0, Math.min(100, Math.round(structScore * 0.5 + lengthScore * 0.3 + hasNumbers + hasBullets + genericPenalty)));
}

/**
 * Eval delta: bandingkan baseline (raw user input) vs PromptLab output.
 * Hasil dapat dikirim ke logging/telemetry untuk dashboard "win rate".
 * @param {string} rawInput
 * @param {string} promptLabOutput
 * @returns {{ baseline: number, optimized: number, delta: number, win: boolean }}
 */
export function evalDelta(rawInput, promptLabOutput) {
  const baseline = localPromptScore(rawInput);
  const optimized = localPromptScore(promptLabOutput);
  return {
    baseline,
    optimized,
    delta: optimized - baseline,
    win: optimized > baseline,
  };
}

// ---------------------------------------------------------------------------
// 9) Self-consistency: kapan generate n=2
// ---------------------------------------------------------------------------

/**
 * Tentukan apakah request layak dapat self-consistency pass (n=2 candidate).
 * Kriteria: deliverable kritis (code, akademik), budget cukup, premium mode atau
 * domain berisiko tinggi.
 * @param {object} payload
 * @param {number} remainingBudgetMs
 * @returns {boolean}
 */
export function shouldRunSelfConsistency(payload, remainingBudgetMs) {
  if (remainingBudgetMs < 30000) return false;
  const text = `${payload.narrative || ""} ${payload.outputType || ""} ${payload.mode || ""}`.toLowerCase();
  const isHighStakes = /\b(aplikasi|app|kode|code|paper|akademik|academic|kontrak|legal|finance|keuangan|medical|kesehatan)\b/i.test(text);
  if (payload.qualityMode === "premium") return isHighStakes;
  return isHighStakes && remainingBudgetMs > 45000;
}

/**
 * Pilih kandidat terbaik dari list prompt berdasarkan `localPromptScore`.
 * @param {string[]} candidates
 * @returns {{ best: string, scores: number[] }}
 */
export function pickBestCandidate(candidates) {
  const valid = candidates.filter((c) => c && c.trim());
  if (valid.length === 0) return { best: "", scores: [] };
  const scores = valid.map(localPromptScore);
  let bestIdx = 0;
  for (let i = 1; i < scores.length; i += 1) {
    if (scores[i] > scores[bestIdx]) bestIdx = i;
  }
  return { best: valid[bestIdx], scores };
}

// ---------------------------------------------------------------------------
// 10) PII / secret guardrail
// ---------------------------------------------------------------------------

const PII_PATTERNS = [
  { id: "api_key_sk", re: /\bsk-[a-z0-9]{20,}\b/gi, label: "API key (sk-...)" },
  { id: "api_key_openrouter", re: /\bsk-or-[a-z0-9-]{20,}\b/gi, label: "OpenRouter key" },
  { id: "google_api_key", re: /\bAIza[0-9A-Za-z_-]{30,}\b/g, label: "Google API key" },
  { id: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/g, label: "AWS access key" },
  { id: "bearer", re: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/g, label: "Bearer token" },
  { id: "credit_card", re: /\b(?:\d[ -]*?){13,19}\b/g, label: "Possible credit card", postValidate: (match) => luhnCheck(match.replace(/\D/g, "")) },
  { id: "indo_ktp", re: /\b\d{16}\b/g, label: "Possible NIK/KTP (16 digit)" },
  { id: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, label: "Email address", warnOnly: true },
  { id: "phone_id", re: /\b(?:\+?62|0)8\d{8,11}\b/g, label: "Indonesian phone number", warnOnly: true },
];

function luhnCheck(digits) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Scan dan opsional redact PII/secret di teks user sebelum dikirim ke provider.
 * - `mode = "redact"` → ganti dengan placeholder + return findings
 * - `mode = "warn"` → return findings, teks utuh
 * @param {string} text
 * @param {{ mode?: "redact"|"warn" }} options
 * @returns {{ sanitized: string, findings: Array<{id:string,label:string,count:number,blocking:boolean}> }}
 */
export function scrubPII(text, { mode = "redact" } = {}) {
  let sanitized = String(text || "");
  const findings = [];
  for (const p of PII_PATTERNS) {
    const matches = sanitized.match(p.re) || [];
    if (matches.length === 0) continue;
    const validMatches = p.postValidate ? matches.filter(p.postValidate) : matches;
    if (validMatches.length === 0) continue;
    findings.push({
      id: p.id,
      label: p.label,
      count: validMatches.length,
      blocking: !p.warnOnly,
    });
    if (mode === "redact" && !p.warnOnly) {
      for (const m of validMatches) {
        sanitized = sanitized.split(m).join(`[REDACTED:${p.id}]`);
      }
    }
  }
  return { sanitized, findings };
}

// ---------------------------------------------------------------------------
// Versi engine — untuk tracking di telemetri
// ---------------------------------------------------------------------------
export const PROMPT_ENGINE_VERSION = "v2.0.0";
