/**
 * Auto phased delivery for vague app-building briefs (e.g. "buat aplikasi editor foto").
 */

import { shouldUseStructuredAudit } from "./structuredAuditDelivery.js";

const APP_SIGNAL =
  /\b(aplikasi|app|web\s*app|website|situs|dashboard|sistem|perangkat\s*lunak|software|frontend|backend|full[\s-]?stack|tool|tools|editor|builder|kasir|pos)\b/i;

/** Game builds without the word "aplikasi" (e.g. "buat game mario"). */
const GAME_BUILD_SIGNAL =
  /\b(game|permainan|platformer|platform\s*game|side[\s-]?scroll(?:er)?|mario|mega\s*man|phaser|godot|unity\s*2d|game\s*action|aksi\s*2d)\b/i;

const KIND_RULES = [
  {
    kind: "game_platformer",
    match:
      /\b(game|permainan|platformer|platform\s*game|side[\s-]?scroll(?:er)?|mario|mega\s*man|phaser|godot|unity\s*2d|game\s*action|aksi\s*2d)\b|\b(game|permainan)\b[\s\S]{0,80}\b(level|story|cerita|mario|platformer)\b|\b(level|story|cerita)\b[\s\S]{0,80}\b(game|permainan)\b/i,
    label: { id: "game platformer 2D (HTML5/Phaser)", en: "2D platformer game (HTML5/Phaser)" },
  },
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
  game_platformer: [
    {
      id: "phase_1",
      title: { id: "Fase 1 — Prototype 1 level playable", en: "Phase 1 — Single-level playable prototype" },
      goal: {
        id: "Satu level jalan di browser: player lompat/gerak, platform solid, 1 musuh patroli, goal flag, HUD minimal (nyawa + level).",
        en: "One browser-playable level: move/jump, solid platforms, one patrolling enemy, goal flag, minimal HUD (lives + level).",
      },
      includes: {
        id: [
          "Phaser 3 (atau HTML5 canvas) — scene Boot, Preload, Game",
          "kontrol keyboard (panah/WASD)",
          "gravitasi + collision platform",
          "1 musuh patroli (stomp atau hindari)",
          "menang/kalah + restart",
          "grafis placeholder (geometri/warna)",
          "state loading / error asset",
        ],
        en: [
          "Phaser 3 (or HTML5 canvas) — Boot, Preload, Game scenes",
          "keyboard controls (arrows/WASD)",
          "gravity + platform collision",
          "one patrolling enemy (stomp or avoid)",
          "win/lose + restart",
          "placeholder graphics (shapes/colors)",
          "loading / asset error state",
        ],
      },
      excludes: {
        id: [
          "100 level manual atau generator penuh",
          "cerita/cutscene/ending",
          "power-up (jamur/bintang), pipa teleport",
          "level select multi-halaman",
        ],
        en: [
          "100 manual levels or full generator",
          "story/cutscenes/ending",
          "power-ups (mushroom/star), warp pipes",
          "multi-screen level select",
        ],
      },
      deliverables: {
        id: ["index.html", "game.js", "scenes dasar", "1 level hardcoded atau JSON tunggal", "README buka di browser"],
        en: ["index.html", "game.js", "base scenes", "one hardcoded or single JSON level", "README open in browser"],
      },
      acceptance: {
        id: [
          "Player bisa gerak & lompat tanpa jatuh melalui platform",
          "Musuh bergerak; kontak = kalah atau stomp (pilih satu, konsisten)",
          "Capai goal → layar menang; nyawa habis → kalah",
          "Bisa dijalankan tanpa build (atau npm run dev jika Vite)",
        ],
        en: [
          "Player moves and jumps without falling through platforms",
          "Enemy moves; contact = lose or stomp (pick one, stay consistent)",
          "Reach goal → win screen; out of lives → lose",
          "Runs without build step (or npm run dev if using Vite)",
        ],
      },
    },
    {
      id: "phase_2",
      title: { id: "Fase 2 — Konten & mekanik inti", en: "Phase 2 — Core content & mechanics" },
      goal: {
        id: "5–10 level dari data JSON, koin/skor, 2 tipe musuh, platform bergerak atau breakable, pause, level select.",
        en: "5–10 JSON-driven levels, coins/score, 2 enemy types, moving or breakable platforms, pause, level select.",
      },
      includes: {
        id: [
          "array level JSON (5–10 entri, bukan 100)",
          "koin + HUD skor",
          "2 tipe musuh (mis. patrol + flying)",
          "platform bergerak ATAU breakable",
          "pause (P) + resume/restart",
          "empty state jika daftar level kosong",
        ],
        en: [
          "level JSON array (5–10 entries, not 100)",
          "coins + score HUD",
          "2 enemy types (e.g. patrol + flying)",
          "moving OR breakable platforms",
          "pause (P) + resume/restart",
          "empty state when level list is empty",
        ],
      },
      excludes: {
        id: ["generator 100 level", "cutscene cerita tiap 10 level", "ending statistik penuh"],
        en: ["100-level generator", "story cutscene every 10 levels", "full ending statistics"],
      },
      deliverables: {
        id: ["levels.js (data)", "player.js / enemy.js", "hud.js", "level select sederhana"],
        en: ["levels.js (data)", "player.js / enemy.js", "hud.js", "simple level select"],
      },
      acceptance: {
        id: [
          "Bisa memilih & menyelesaikan minimal 3 level berbeda",
          "Koin menambah skor",
          "Pause tidak merusak physics saat resume",
        ],
        en: [
          "Can select and clear at least 3 distinct levels",
          "Coins increase score",
          "Pause does not break physics on resume",
        ],
      },
    },
    {
      id: "phase_3",
      title: { id: "Fase 3 — 100 level, cerita, polish", en: "Phase 3 — 100 levels, story, polish" },
      goal: {
        id: "Generator procedural hingga 100 level (kesulitan naik tiap 10 level), intro + cutscene tiap 10 level + ending, power-up opsional, QA.",
        en: "Procedural generator up to 100 levels (difficulty ramp every 10), intro + cutscene every 10 levels + ending, optional power-ups, QA.",
      },
      includes: {
        id: [
          "generateLevel(difficulty) — jangan tulis 100 level manual",
          "scene Intro, CutScene, Ending (teks cerita Bahasa Indonesia)",
          "parameter difficulty 1–10 per kelompok 10 level",
          "power-up opsional (jamur/bintang) jika disebut di brief",
          "checklist QA + komentar // asumsi:",
        ],
        en: [
          "generateLevel(difficulty) — do not hand-write 100 levels",
          "Intro, CutScene, Ending scenes (Indonesian story text)",
          "difficulty 1–10 per block of 10 levels",
          "optional power-ups (mushroom/star) if in brief",
          "QA checklist + // asumsi: comments",
        ],
      },
      excludes: {
        id: ["multiplayer online", "mobile touch penuh (kecuali diminta)", "fitur di luar brief awal"],
        en: ["online multiplayer", "full mobile touch (unless requested)", "features outside initial brief"],
      },
      deliverables: {
        id: ["levelGenerator.js", "story.js", "README arsitektur + cara run", "acceptance criteria global"],
        en: ["levelGenerator.js", "story.js", "architecture README + run steps", "global acceptance criteria"],
      },
      acceptance: {
        id: [
          "Level 1 dan 100 bisa dimainkan (via generator + seed)",
          "Cutscene muncul setelah level 10, 20, … (mock teks OK)",
          "Ending setelah level 100 dengan ringkasan skor",
          "Tidak ada TODO kosong di kode produksi",
        ],
        en: [
          "Levels 1 and 100 are playable (generator + seed)",
          "Cutscene after levels 10, 20, … (text mock OK)",
          "Ending after level 100 with score summary",
          "No empty TODOs in production code",
        ],
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
  if (shouldUseStructuredAudit(narrative, category, outputType)) return false;
  const text = `${narrative} ${category} ${outputType}`;
  if (resolvePhasedAppKind(narrative) === "game_platformer") return true;
  if (GAME_BUILD_SIGNAL.test(narrative) && /application code|kode aplikasi/i.test(outputType)) return true;
  if (GAME_BUILD_SIGNAL.test(narrative) && /\b(Coding|Developer|Engineering)\b/i.test(category)) return true;
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
  const { phases, productLabel, lang, kind } = plan;
  const header =
    lang === "en"
      ? `Phased delivery (mandatory): the final prompt you write must document ALL phases below (Phase 1, 2, and 3) in full — goals, in/out scope, deliverables, and acceptance criteria for each. Do NOT shorten the prompt to Phase 1 only. Split *implementation* across phases (Phase 1 code first), not the *prompt document*. Do NOT dump every feature into Phase 1 implementation scope.`
      : `Pengiriman bertahap (wajib): prompt final yang Anda tulis harus mendokumentasikan SEMUA fase di bawah (Fase 1, 2, dan 3) secara lengkap — goal, scope masuk/keluar, deliverable, dan acceptance criteria tiap fase. Jangan memotong output prompt hanya ke Fase 1. Pisahkan *implementasi kode* per fase (coding mulai Fase 1), bukan *dokumen prompt*. Jangan masukkan semua fitur ke scope implementasi Fase 1.`;

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

  const footerBase =
    lang === "en"
      ? `Final prompt structure (required): section "Implementation phases" with complete specs for Phase 1, Phase 2, and Phase 3 (never omit Phase 2 or 3), then stack assumptions, constraints, and global acceptance criteria after all phases are done. Add a short subsection "Coding order": when the user pastes this prompt into a coding AI, that agent should implement Phase 1 code first and stop until the user says "continue to phase 2" — but your job here is to deliver the full three-phase prompt text. Browser-heavy features (e.g. FFmpeg.wasm) may use an honest mock in Phase 1–2.`
      : `Struktur output prompt final (wajib): bagian "Fase implementasi" berisi spesifikasi LENGKAP Fase 1, Fase 2, dan Fase 3 (jangan hilangkan Fase 2 atau 3), lalu asumsi stack, constraints, dan acceptance criteria global setelah ketiga fase terdokumentasi. Tambahkan subbagian singkat "Urutan coding": saat user paste ke AI coding, agent itu mulai kode Fase 1 dulu dan berhenti sampai user bilang "lanjut fase 2" — tugas Anda di sini adalah menulis prompt utuh tiga fase, bukan hanya Fase 1. Fitur berat browser (mis. FFmpeg.wasm) boleh mock jujur di Fase 1–2.`;

  const gameFooter =
    kind === "game_platformer"
      ? lang === "en"
        ? `Game rules: default stack Phaser 3 + HTML5. If the brief mentions 100 levels, document procedural generation in Phase 3 (not 100 hand-written levels in Phase 1). Story/cutscenes/ending stay in Phase 3 specs. The prompt document must still describe all three phases in full; only the coding-agent execution starts at Phase 1.`
        : `Aturan game: stack default Phaser 3 + HTML5. Jika brief menyebut 100 level, jelaskan generator procedural di Fase 3 (bukan 100 level manual di Fase 1). Cerita/cutscene/ending tetap didokumentasikan di spesifikasi Fase 3. Dokumen prompt tetap harus lengkap tiga fase; yang dibatasi hanya eksekusi coding (mulai Fase 1 dulu).`
      : "";

  return `${header}\n\n${phaseSections}\n\n${footerBase}${gameFooter ? `\n\n${gameFooter}` : ""}`;
}

export function buildPhasedAppDeliveryInstruction(narrative = "", category = "", outputType = "", outputLanguage = "id") {
  if (!shouldUsePhasedAppDelivery(narrative, category, outputType)) return "";
  const plan = getPhasedAppPlan(narrative, outputLanguage);
  return formatPhasedAppDeliveryBlock(plan);
}
