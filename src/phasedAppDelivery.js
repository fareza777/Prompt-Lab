/**
 * Auto phased delivery for vague app-building briefs (e.g. "buat aplikasi editor foto").
 */

const APP_SIGNAL =
  /\b(aplikasi|app|web\s*app|website|situs|dashboard|sistem|platform|perangkat\s*lunak|software|frontend|backend|full[\s-]?stack|tool|tools|editor|builder|kasir|pos)\b/i;

const KIND_RULES = [
  {
    kind: "video_editor",
    match: /\b(editor\s*video|video\s*editor|edit\s*video|potong\s*video|timeline|klip\s*video)\b/i,
    label: { id: "aplikasi editor video", en: "video editor application" },
  },
  {
    kind: "photo_editor",
    match: /\b(editor\s*foto|foto\s*editor|edit\s*foto|photo\s*editor|image\s*editor|gambar|foto)\b/i,
    label: { id: "aplikasi editor foto", en: "photo editor application" },
  },
  {
    kind: "pos_retail",
    match: /\b(kasir|pos|point\s*of\s*sale|checkout|struk|inventory|stok)\b/i,
    label: { id: "aplikasi kasir / POS", en: "POS / checkout application" },
  },
  {
    kind: "dashboard",
    match: /\b(dashboard|analytics|monitoring|admin\s*panel|laporan\s*real[\s-]?time)\b/i,
    label: { id: "dashboard operasional", en: "operational dashboard" },
  },
];

const PHASE_TEMPLATES = {
  video_editor: [
    {
      id: "phase_1",
      title: { id: "Fase 1 — MVP alur inti", en: "Phase 1 — Core MVP flow" },
      goal: {
        id: "Upload media, timeline dasar, trim klip, preview play, state loading/empty/error.",
        en: "Upload media, basic timeline, trim clips, preview playback, loading/empty/error states.",
      },
      includes: {
        id: ["unggah MP4/WebM", "timeline 1 trek video", "trim in/out", "preview player", "UI 3 panel dasar"],
        en: ["MP4/WebM upload", "single-track timeline", "trim in/out", "preview player", "basic 3-panel UI"],
      },
      excludes: {
        id: ["transisi kompleks", "export MP4 produksi penuh", "multi-track lanjutan"],
        en: ["complex transitions", "full production MP4 export", "advanced multi-track"],
      },
      deliverables: {
        id: ["struktur folder", "komponen Timeline + Preview + Library", "store state", "cara run lokal"],
        en: ["folder structure", "Timeline + Preview + Library components", "state store", "local run steps"],
      },
      acceptance: {
        id: [
          "File video terunggah dan muncul di library",
          "Klip bisa ditambah ke timeline",
          "Trim mengubah durasi klip di preview",
          "Loading/error tampil jelas",
        ],
        en: [
          "Video file uploads and appears in library",
          "Clip can be placed on timeline",
          "Trim changes clip duration in preview",
          "Loading/error states are visible",
        ],
      },
    },
    {
      id: "phase_2",
      title: { id: "Fase 2 — Editing & overlay", en: "Phase 2 — Editing & overlay" },
      goal: {
        id: "Teks/overlay, transisi dasar, undo/redo, toolbar lengkap.",
        en: "Text/overlay, basic transitions, undo/redo, full toolbar.",
      },
      includes: {
        id: ["teks & subtitle", "min. 2 transisi (fade, dissolve)", "undo/redo 20 langkah", "duplikasi/hapus klip"],
        en: ["text & subtitles", "min. 2 transitions (fade, dissolve)", "undo/redo 20 steps", "duplicate/delete clips"],
      },
      excludes: {
        id: ["render farm", "kolaborasi real-time"],
        en: ["render farm", "real-time collaboration"],
      },
      deliverables: {
        id: ["komponen TextOverlay, TransitionPicker, Toolbar", "integrasi ke store"],
        en: ["TextOverlay, TransitionPicker, Toolbar components", "store integration"],
      },
      acceptance: {
        id: ["Teks tampil di preview dan bisa diedit", "Transisi terlihat antar klip", "Undo memulihkan aksi terakhir"],
        en: ["Text visible on preview and editable", "Transition visible between clips", "Undo restores last action"],
      },
    },
    {
      id: "phase_3",
      title: { id: "Fase 3 — Export & hardening", en: "Phase 3 — Export & hardening" },
      goal: {
        id: "Export MP4 (720p/1080p) dengan worker/mock jujur, QA, responsif desktop.",
        en: "MP4 export (720p/1080p) with honest worker/mock, QA, desktop responsive layout.",
      },
      includes: {
        id: ["tombol ekspor tunggal", "FFmpeg.wasm atau mock terdokumentasi", "responsive min 1024px", "checklist QA"],
        en: ["single export CTA", "FFmpeg.wasm or documented mock", "responsive min 1024px", "QA checklist"],
      },
      excludes: {
        id: ["fitur di luar scope brief awal"],
        en: ["features outside initial brief scope"],
      },
      deliverables: {
        id: ["useExport hook", "export progress UI", "dokumentasi keterbatasan export"],
        en: ["useExport hook", "export progress UI", "export limitations doc"],
      },
      acceptance: {
        id: ["Ekspor menghasilkan file unduh atau pesan error eksplisit", "UI tidak freeze saat render", "Semua teks UI konsisten"],
        en: ["Export downloads file or shows explicit error", "UI does not freeze during render", "All UI copy consistent"],
      },
    },
  ],
  photo_editor: [
    {
      id: "phase_1",
      title: { id: "Fase 1 — MVP canvas", en: "Phase 1 — Canvas MVP" },
      goal: {
        id: "Upload gambar, canvas preview, crop/rotate dasar, simpan unduh PNG/JPG.",
        en: "Image upload, canvas preview, basic crop/rotate, PNG/JPG download.",
      },
      includes: {
        id: ["unggah JPG/PNG", "canvas + zoom fit", "crop", "rotate 90°", "export gambar"],
        en: ["JPG/PNG upload", "canvas + fit zoom", "crop", "90° rotate", "image export"],
      },
      excludes: {
        id: ["layer lanjutan", "AI retouch", "batch processing"],
        en: ["advanced layers", "AI retouch", "batch processing"],
      },
      deliverables: {
        id: ["Canvas, Toolbar dasar, UploadZone", "store gambar", "run lokal"],
        en: ["Canvas, basic Toolbar, UploadZone", "image store", "local run"],
      },
      acceptance: {
        id: ["Gambar terbuka di canvas", "Crop mengubah area tampil", "Export mengunduh file"],
        en: ["Image opens on canvas", "Crop changes visible area", "Export downloads file"],
      },
    },
    {
      id: "phase_2",
      title: { id: "Fase 2 — Adjustments & filters", en: "Phase 2 — Adjustments & filters" },
      goal: {
        id: "Brightness/contrast, preset filter, undo/redo, panel kontrol.",
        en: "Brightness/contrast, preset filters, undo/redo, control panel.",
      },
      includes: {
        id: ["slider adjust", "3+ preset filter", "undo/redo", "before/after toggle"],
        en: ["adjustment sliders", "3+ filter presets", "undo/redo", "before/after toggle"],
      },
      excludes: { id: ["RAW developer pro"], en: ["pro RAW workflow"] },
      deliverables: {
        id: ["AdjustmentPanel, FilterPicker, history stack"],
        en: ["AdjustmentPanel, FilterPicker, history stack"],
      },
      acceptance: {
        id: ["Slider mengubah preview real-time", "Undo mengembalikan edit", "Filter bisa diterapkan & reset"],
        en: ["Sliders update preview in real time", "Undo restores edit", "Filters apply and reset"],
      },
    },
    {
      id: "phase_3",
      title: { id: "Fase 3 — Polish & states", en: "Phase 3 — Polish & states" },
      goal: {
        id: "Empty/error/loading, keyboard shortcuts, responsive, dokumentasi asumsi.",
        en: "Empty/error/loading, keyboard shortcuts, responsive layout, assumption docs.",
      },
      includes: {
        id: ["state UI lengkap", "shortcut dasar", "responsive desktop", "README setup"],
        en: ["full UI states", "basic shortcuts", "desktop responsive", "setup README"],
      },
      excludes: { id: [], en: [] },
      deliverables: {
        id: ["README", "acceptance checklist", "komentar // asumsi: di kode"],
        en: ["README", "acceptance checklist", "// asumsi: comments in code"],
      },
      acceptance: {
        id: ["Empty state saat belum ada gambar", "Error format file jelas", "Aplikasi usable di 1024px+"],
        en: ["Empty state when no image", "Clear unsupported file error", "Usable at 1024px+"],
      },
    },
  ],
  generic_app: [
    {
      id: "phase_1",
      title: { id: "Fase 1 — MVP alur utama", en: "Phase 1 — Core user flow MVP" },
      goal: {
        id: "Satu happy-path end-to-end yang bisa dijalankan lokal.",
        en: "One end-to-end happy path runnable locally.",
      },
      includes: {
        id: ["layar utama", "data mock", "form/list dasar", "navigasi", "state loading/empty"],
        en: ["main screen", "mock data", "basic form/list", "navigation", "loading/empty state"],
      },
      excludes: { id: ["fitur sekunder", "admin kompleks"], en: ["secondary features", "complex admin"] },
      deliverables: {
        id: ["struktur proyek", "screen utama", "mock API/store", "instruksi npm run dev"],
        en: ["project structure", "main screen", "mock API/store", "npm run dev steps"],
      },
      acceptance: {
        id: ["Alur utama bisa diklik tanpa error", "Mock data tampil", "README run lokal ada"],
        en: ["Main flow clickable without error", "Mock data visible", "Local run README exists"],
      },
    },
    {
      id: "phase_2",
      title: { id: "Fase 2 — Fitur inti & validasi", en: "Phase 2 — Core features & validation" },
      goal: {
        id: "Lengkapi fitur yang disebut user + validasi + error handling.",
        en: "Complete user-requested features + validation + error handling.",
      },
      includes: {
        id: ["CRUD/aksi inti", "validasi form", "toast error", "edge case utama"],
        en: ["core CRUD/actions", "form validation", "error toasts", "main edge cases"],
      },
      excludes: { id: ["optimasi performa lanjutan"], en: ["advanced performance tuning"] },
      deliverables: {
        id: ["komponen fitur", "types", "tests manual checklist"],
        en: ["feature components", "types", "manual test checklist"],
      },
      acceptance: {
        id: ["Setiap tombol utama punya hasil atau error jelas", "Validasi form berjalan"],
        en: ["Each primary button works or shows clear error", "Form validation works"],
      },
    },
    {
      id: "phase_3",
      title: { id: "Fase 3 — Polish, QA, dokumentasi", en: "Phase 3 — Polish, QA, docs" },
      goal: {
        id: "Responsif, aksesibilitas dasar, README, acceptance criteria final.",
        en: "Responsive layout, basic a11y, README, final acceptance criteria.",
      },
      includes: {
        id: ["responsive", "copy UI final", "README", "daftar asumsi teknis"],
        en: ["responsive", "final UI copy", "README", "technical assumptions list"],
      },
      excludes: { id: [], en: [] },
      deliverables: {
        id: ["dokumentasi deploy lokal", "checklist QA"],
        en: ["local deploy docs", "QA checklist"],
      },
      acceptance: {
        id: ["Checklist QA lulus untuk scope", "Tidak ada TODO kosong di kode produksi"],
        en: ["QA checklist passes for scope", "No empty TODOs in production code"],
      },
    },
  ],
};

function pickLang(code) {
  return String(code || "id").toLowerCase().startsWith("en") ? "en" : "id";
}

export function shouldUsePhasedAppDelivery(narrative = "", category = "", outputType = "") {
  const text = `${narrative} ${category} ${outputType}`;
  if (!APP_SIGNAL.test(text)) return false;
  if (/application code|kode aplikasi/i.test(outputType)) return true;
  if (/\b(Coding|Developer|Engineering)\b/i.test(category)) return true;
  if (APP_SIGNAL.test(narrative)) return true;
  return false;
}

export function resolvePhasedAppKind(narrative = "") {
  const text = String(narrative || "");
  for (const rule of KIND_RULES) {
    if (rule.match.test(text)) return rule.kind;
  }
  if (APP_SIGNAL.test(text)) return "generic_app";
  return null;
}

export function getPhasedAppPlan(narrative = "", outputLanguage = "id") {
  const lang = pickLang(outputLanguage);
  const kind = resolvePhasedAppKind(narrative) || "generic_app";
  const rule = KIND_RULES.find((item) => item.kind === kind);
  const productLabel = rule?.label?.[lang] || (lang === "en" ? "application" : "aplikasi");
  const phases = PHASE_TEMPLATES[kind] || PHASE_TEMPLATES.generic_app;
  return { kind, productLabel, phases, lang };
}

function listBlock(items, lang) {
  const list = items[lang] || items.id || [];
  return list.map((line) => `- ${line}`).join("\n");
}

export function formatPhasedAppDeliveryBlock(plan) {
  if (!plan?.phases?.length) return "";
  const { phases, productLabel, lang } = plan;
  const header =
    lang === "en"
      ? `Phased delivery (mandatory): split the final prompt for building a ${productLabel} into the phases below. Do NOT dump all features into phase 1. Each phase must state scope in/out, deliverables, and testable acceptance criteria. Tell the coding AI to implement phase-by-phase (stop after each phase unless user asks to continue).`
      : `Pengiriman bertahap (wajib): pecah prompt final untuk membangun ${productLabel} menjadi fase-fase di bawah. Jangan memasukkan semua fitur ke fase 1. Setiap fase harus punya scope masuk/keluar, deliverable, dan acceptance criteria yang bisa dites. Instruksikan AI coding untuk implementasi per fase (berhenti setelah tiap fase kecuali user minta lanjut).`;

  const phaseSections = phases
    .map((phase, index) => {
      const title = phase.title[lang] || phase.title.id;
      const goal = phase.goal[lang] || phase.goal.id;
      const includes = listBlock(phase.includes, lang);
      const excludes = listBlock(phase.excludes, lang);
      const deliverables = listBlock(phase.deliverables, lang);
      const acceptance = listBlock(phase.acceptance, lang);
      const inLabel = lang === "en" ? "In scope" : "Masuk scope";
      const outLabel = lang === "en" ? "Out of scope (do not build yet)" : "Luar scope (jangan dulu)";
      const delLabel = lang === "en" ? "Deliverables" : "Deliverable";
      const accLabel = lang === "en" ? "Acceptance criteria" : "Acceptance criteria";
      return [
        `### ${index + 1}. ${title}`,
        `**Goal:** ${goal}`,
        `**${inLabel}:**`,
        includes,
        `**${outLabel}:**`,
        excludes,
        `**${delLabel}:**`,
        deliverables,
        `**${accLabel}:**`,
        acceptance,
      ].join("\n");
    })
    .join("\n\n");

  const footer =
    lang === "en"
      ? `Final prompt output structure must include a section "Implementation phases" with Phase 1, 2, 3 as above, then stack/tech assumptions, constraints, and global acceptance criteria. Warn that browser-heavy features (e.g. FFmpeg.wasm export) may need an honest mock in Phase 1–2.`
      : `Struktur output prompt final wajib menyertakan bagian "Fase implementasi" (Fase 1, 2, 3 seperti di atas), lalu asumsi stack/teknis, constraints, dan acceptance criteria global. Ingatkan fitur berat browser (mis. export FFmpeg.wasm) boleh mock jujur di Fase 1–2.`;

  return `${header}\n\n${phaseSections}\n\n${footer}`;
}

export function buildPhasedAppDeliveryInstruction(narrative = "", category = "", outputType = "", outputLanguage = "id") {
  if (!shouldUsePhasedAppDelivery(narrative, category, outputType)) return "";
  const plan = getPhasedAppPlan(narrative, outputLanguage);
  return formatPhasedAppDeliveryBlock(plan);
}
