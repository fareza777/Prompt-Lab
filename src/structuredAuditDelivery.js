/**
 * Structured audit frameworks when user asks for audit/review/evaluation (not app building).
 */

const AUDIT_SIGNAL =
  /\b(audit|auditori|tinjau|evaluasi|review|assessment|penilaian|cek\s*kualitas|quality\s*assurance|laporan\s*audit|temuan|finding)\b/i;

const BUILD_SIGNAL = /\b(buat|bangun|develop|implementasikan|kerjakan|coding|generate\s*kode)\b/i;

const AUDIT_KIND_RULES = [
  {
    kind: "game_audit",
    match:
      /\b(audit|tinjau|evaluasi|review|penilaian)\b[\s\S]{0,100}\b(game|permainan|gameplay|level\s*design|platformer|mobile\s*game)\b|\b(game|permainan|gameplay)\b[\s\S]{0,100}\b(audit|tinjau|evaluasi|review)\b/i,
    label: { id: "audit game", en: "game audit" },
  },
  {
    kind: "landing_audit",
    match:
      /\b(audit|tinjau|evaluasi|review)\b[\s\S]{0,80}\b(landing|konversi|conversion|cta|halaman\s*jual|funnel)\b|\b(landing|konversi|conversion)\b[\s\S]{0,80}\b(audit|tinjau|evaluasi)\b/i,
    label: { id: "audit landing / konversi", en: "landing / conversion audit" },
  },
  {
    kind: "code_audit",
    match:
      /\b(audit|tinjau|review|code\s*review)\b[\s\S]{0,80}\b(kode|code|repo|repositori|pull\s*request|pr\b|refactor|typescript|javascript)\b|\b(kode|code|repo)\b[\s\S]{0,80}\b(audit|tinjau|review)\b/i,
    label: { id: "audit kode / PR", en: "code / PR audit" },
  },
  {
    kind: "security_audit",
    match: /\b(security|keamanan|vulnerability|kerentanan|owasp|pentest|sql\s*injection|xss|csrf|authn|authz)\b/i,
    label: { id: "audit keamanan", en: "security audit" },
  },
  {
    kind: "app_product_audit",
    match:
      /\b(audit|tinjau|evaluasi|review)\b[\s\S]{0,80}\b(aplikasi|app|produk|product|ux|ui|fitur)\b|\b(aplikasi|app|produk)\b[\s\S]{0,80}\b(audit|tinjau|evaluasi)\b/i,
    label: { id: "audit aplikasi / produk", en: "app / product audit" },
  },
];

const AUDIT_TEMPLATES = {
  game_audit: {
    role: {
      id: "Senior Game Auditor (gameplay, level design, tech, UX, monetisasi)",
      en: "Senior Game Auditor (gameplay, level design, tech, UX, monetization)",
    },
    dimensions: {
      id: [
        "Gameplay & mekanik (kontrol, kesulitan, progression, replayability)",
        "Desain level & konten (variasi, pacing, struktur tantangan)",
        "Grafis & audio (kualitas visual, konsistensi, SFX, musik)",
        "Kinerja teknis (FPS, loading, bug, crash, optimasi)",
        "Monetisasi & model bisnis (IAP, iklan, fairness) — tulis N/A jika tidak ada",
        "UX (onboarding, navigasi, feedback, aksesibilitas dasar)",
      ],
      en: [
        "Gameplay & mechanics (controls, difficulty, progression, replayability)",
        "Level & content design (variety, pacing, challenge structure)",
        "Graphics & audio (visual quality, consistency, SFX, music)",
        "Technical performance (FPS, loading, bugs, crashes, optimization)",
        "Monetization & business model (IAP, ads, fairness) — state N/A if none",
        "UX (onboarding, navigation, feedback, basic accessibility)",
      ],
    },
    requiredInputs: {
      id: [
        "Nama/title game (atau [ASUMSI] jika tidak disebut)",
        "Platform (Web / mobile / PC) dan status (prototype / beta / live)",
        "Genre & target audiens",
        "Bukti: link build, video gameplay, metrik (retention, crash rate), atau GDD — jika tidak ada, audit berbasis asumsi eksplisit",
      ],
      en: [
        "Game name/title (or [ASSUMPTION] if omitted)",
        "Platform (Web / mobile / PC) and status (prototype / beta / live)",
        "Genre & target audience",
        "Evidence: build link, gameplay video, metrics, or GDD — if missing, assumption-based audit",
      ],
    },
    wordTarget: { id: "1500–2000 kata", en: "1500–2000 words" },
  },
  landing_audit: {
    role: {
      id: "Senior CRO / Landing Page Auditor",
      en: "Senior CRO / Landing Page Auditor",
    },
    dimensions: {
      id: [
        "Value proposition & headline clarity",
        "Offer, pricing, dan bukti sosial (trust)",
        "CTA, form friction, dan mobile layout",
        "Copy & objection handling",
        "Visual hierarchy & brand consistency",
        "Measurement (analytics events, funnel gaps)",
      ],
      en: [
        "Value proposition & headline clarity",
        "Offer, pricing, and social proof",
        "CTA, form friction, and mobile layout",
        "Copy & objection handling",
        "Visual hierarchy & brand consistency",
        "Measurement (analytics events, funnel gaps)",
      ],
    },
    requiredInputs: {
      id: ["URL atau screenshot halaman", "Tujuan konversi (lead, beli, daftar)", "Audiens & sumber traffic"],
      en: ["URL or page screenshots", "Conversion goal", "Audience & traffic source"],
    },
    wordTarget: { id: "1200–1800 kata", en: "1200–1800 words" },
  },
  code_audit: {
    role: {
      id: "Senior Staff Engineer — code review & arsitektur",
      en: "Senior Staff Engineer — code review & architecture",
    },
    dimensions: {
      id: [
        "Arsitektur & separation of concerns",
        "Correctness, edge cases, error handling",
        "Keamanan dasar (input, auth, secrets)",
        "Performa & kompleksitas",
        "Testability & observability",
        "Maintainability & konsistensi gaya",
      ],
      en: [
        "Architecture & separation of concerns",
        "Correctness, edge cases, error handling",
        "Baseline security (input, auth, secrets)",
        "Performance & complexity",
        "Testability & observability",
        "Maintainability & style consistency",
      ],
    },
    requiredInputs: {
      id: ["Repo/PR/diff atau cuplikan modul inti", "Stack & constraints", "Area risiko yang user khawatirkan"],
      en: ["Repo/PR/diff or core module snippets", "Stack & constraints", "User-stated risk areas"],
    },
    wordTarget: { id: "1000–1600 kata", en: "1000–1600 words" },
  },
  security_audit: {
    role: {
      id: "Application Security Auditor (OWASP-minded)",
      en: "Application Security Auditor (OWASP-minded)",
    },
    dimensions: {
      id: [
        "Authn/Authz & session management",
        "Input validation & injection (SQLi, XSS, CSRF)",
        "Secrets, config, dependency CVE",
        "API & rate limiting / abuse",
        "Data privacy & logging sensitif",
        "Deployment & transport (HTTPS, headers)",
      ],
      en: [
        "Authn/Authz & session management",
        "Input validation & injection (SQLi, XSS, CSRF)",
        "Secrets, config, dependency CVE",
        "API & rate limiting / abuse",
        "Data privacy & sensitive logging",
        "Deployment & transport (HTTPS, headers)",
      ],
    },
    requiredInputs: {
      id: ["Scope (endpoint, modul, full app)", "Stack", "Threat model singkat jika ada"],
      en: ["Scope (endpoint, module, full app)", "Stack", "Brief threat model if any"],
    },
    wordTarget: { id: "1200–2000 kata", en: "1200–2000 words" },
  },
  app_product_audit: {
    role: {
      id: "Senior Product / UX Auditor",
      en: "Senior Product / UX Auditor",
    },
    dimensions: {
      id: [
        "Problem-solution fit & alur utama",
        "IA & navigasi",
        "States: loading, empty, error",
        "Aksesibilitas & copy UI",
        "Kinerja persepsi & reliability",
        "Prioritas backlog per dampak",
      ],
      en: [
        "Problem-solution fit & core flow",
        "IA & navigation",
        "Loading, empty, error states",
        "Accessibility & UI copy",
        "Perceived performance & reliability",
        "Backlog priorities by impact",
      ],
    },
    requiredInputs: {
      id: ["Deskripsi produk", "Persona", "Screenshot atau flow utama"],
      en: ["Product description", "Persona", "Screenshots or main flows"],
    },
    wordTarget: { id: "1200–1800 kata", en: "1200–1800 words" },
  },
  generic_audit: {
    role: {
      id: "Senior Auditor — analisis terstruktur berbasis bukti",
      en: "Senior Auditor — structured evidence-based analysis",
    },
    dimensions: {
      id: [
        "Scope & tujuan audit",
        "Temuan utama per area yang user sebut",
        "Risiko & dampak (likelihood × severity)",
        "Kepatuhan terhadap constraints user",
        "Gap vs acceptance criteria",
        "Rekomendasi prioritas",
      ],
      en: [
        "Scope & audit objectives",
        "Key findings per user-stated area",
        "Risk & impact (likelihood × severity)",
        "Compliance with user constraints",
        "Gaps vs acceptance criteria",
        "Priority recommendations",
      ],
    },
    requiredInputs: {
      id: ["Subjek yang diaudit", "Data/bukti yang tersedia", "Kriteria sukses"],
      en: ["Audit subject", "Available data/evidence", "Success criteria"],
    },
    wordTarget: { id: "1000–1800 kata", en: "1000–1800 words" },
  },
};

function pickLang(code) {
  return String(code || "id").toLowerCase().startsWith("en") ? "en" : "id";
}

export function shouldUseStructuredAudit(narrative = "", category = "", outputType = "") {
  const text = `${narrative} ${category} ${outputType}`;
  if (!AUDIT_SIGNAL.test(text)) return false;
  if (BUILD_SIGNAL.test(narrative) && !AUDIT_SIGNAL.test(narrative)) return false;
  return true;
}

export function resolveAuditKind(narrative = "") {
  const text = String(narrative || "");
  for (const rule of AUDIT_KIND_RULES) {
    if (rule.match.test(text)) return rule.kind;
  }
  if (AUDIT_SIGNAL.test(text)) return "generic_audit";
  return null;
}

export function getStructuredAuditPlan(narrative = "", outputLanguage = "id") {
  const lang = pickLang(outputLanguage);
  const kind = resolveAuditKind(narrative) || "generic_audit";
  const rule = AUDIT_KIND_RULES.find((item) => item.kind === kind);
  const label = rule?.label?.[lang] || (lang === "en" ? "structured audit" : "audit terstruktur");
  const template = AUDIT_TEMPLATES[kind] || AUDIT_TEMPLATES.generic_audit;
  return { kind, label, template, lang };
}

function listBlock(items, lang) {
  const list = items[lang] || items.id || [];
  return list.map((line) => `- ${line}`).join("\n");
}

export function formatStructuredAuditBlock(plan) {
  if (!plan?.template) return "";
  const { template, label, lang } = plan;
  const header =
    lang === "en"
      ? `Structured audit framework (mandatory): the final prompt must instruct the AI to produce a complete ${label} report in ONE response (do not split into "phase 1 only"). Use evidence-based analysis; tag missing data as [ASSUMPTION].`
      : `Kerangka audit terstruktur (wajib): prompt final harus menginstruksikan AI menulis laporan ${label} LENGKAP dalam SATU respons (jangan pecah "hanya bagian 1"). Analisis berbasis bukti; tandai data kosong dengan [ASUMSI].`;

  const sectionFormat =
    lang === "en"
      ? `Per dimension, require: **Key findings** (2–3 sentences), **Score 1–5** (with rationale), **Detailed analysis** (≥3 bullets), **Priority recommendations** (≤2).`
      : `Per dimensi, wajib: **Temuan utama** (2–3 kalimat), **Skor 1–5** (dengan alasan), **Analisis detail** (≥3 poin), **Rekomendasi prioritas** (≤2).`;

  const footer =
    lang === "en"
      ? `End the report with **Executive summary** (≤200 words): average score, top 3 critical findings, next steps. Max ${template.wordTarget[lang] || template.wordTarget.id}. Ban vague phrases ("best practice", "seamless", "world-class"). Optional: ask ≤3 clarifying questions at the start only if blocking; otherwise proceed with [ASSUMPTION].`
      : `Akhiri dengan **Ringkasan eksekutif** (≤200 kata): skor rata-rata, 3 temuan kritis, langkah berikutnya. Panjang ${template.wordTarget[lang] || template.wordTarget.id}. Larang frasa kosong ("best practice", "seamless", "world-class"). Opsional: tanya klarifikasi ≤3 di awal hanya jika blocker; selain itu lanjut dengan [ASUMSI].`;

  return [
    header,
    "",
    lang === "en" ? "**Suggested role:**" : "**Role yang disarankan:**",
    template.role[lang] || template.role.id,
    "",
    lang === "en" ? "**Required inputs (prompt must ask user to provide or assume):**" : "**Input wajib (prompt harus minta atau asumsikan):**",
    listBlock(template.requiredInputs, lang),
    "",
    lang === "en" ? "**Audit dimensions (all required):**" : "**Dimensi audit (semua wajib):**",
    listBlock(template.dimensions, lang),
    "",
    sectionFormat,
    "",
    footer,
  ].join("\n");
}

export function buildStructuredAuditInstruction(narrative = "", category = "", outputType = "", outputLanguage = "id") {
  if (!shouldUseStructuredAudit(narrative, category, outputType)) return "";
  const plan = getStructuredAuditPlan(narrative, outputLanguage);
  return formatStructuredAuditBlock(plan);
}
