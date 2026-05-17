import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  ArrowRightLeft,
  BookOpenText,
  Bot,
  BrainCircuit,
  Check,
  Clipboard,
  Clock3,
  FileText,
  FolderOpen,
  Gauge,
  Layers3,
  Library,
  Menu,
  MessageSquareText,
  Paperclip,
  PenLine,
  Plus,
  Rocket,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

const categories = ["Marketing", "Content Creator", "Business", "Coding", "Academic", "Image AI"];
const tones = ["Profesional", "Santai", "Persuasif", "Kreatif"];
const models = ["ChatGPT", "Claude", "Gemini", "Grok", "Midjourney"];
const outputTypes = ["Kode Aplikasi", "Dokumen Word", "PPT", "Desain Teknis", "Analisis", "Konten"];
const optimizerModes = ["Lebih Jelas", "Lebih Singkat", "Lebih Detail", "Akademik", "Marketing", "Coding"];
const generationModes = ["Cepat", "Seimbang", "Sabar Gratis"];
const providerOptions = ["openrouter", "openai", "custom"];
const defaultModelSettings = {
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
  fallbackModels:
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free\nopenai/gpt-oss-20b:free\nqwen/qwen3-next-80b-a3b-instruct:free",
  ocrModel: "baidu/qianfan-ocr-fast:free",
  primaryModel: "google/gemma-4-26b-a4b-it:free",
  provider: "openrouter",
  timeoutMs: "40000",
};
const modeProfiles = {
  Cepat: {
    label: "Draft cepat",
    detail: "Coba model utama, lalu fallback singkat jika perlu.",
    bestFor: "Konten pendek, ide awal, revisi prompt ringan.",
  },
  Seimbang: {
    label: "Harian stabil",
    detail: "Timeout sedang dengan fallback yang masih cukup sabar.",
    bestFor: "Dokumen, PPT, prompt aplikasi, pekerjaan normal.",
  },
  "Sabar Gratis": {
    label: "Kejar hasil",
    detail: "Mencoba seluruh fallback lebih lama saat model gratis antre.",
    bestFor: "File besar, OCR, prompt kompleks, model free sedang lambat.",
  },
};

const templates = [
  {
    title: "Aplikasi Web dari Dokumen",
    category: "Coding",
    model: "Claude",
    outputType: "Kode Aplikasi",
    tone: "Profesional",
    prompt:
      "Buat aplikasi web yang bisa dijalankan secara lokal berdasarkan file terlampir. File hanya referensi konten. Output harus berupa kode aplikasi lengkap, bukan laporan.",
  },
  {
    title: "PPT Akademik 20 Slide",
    category: "Academic",
    model: "Claude",
    outputType: "PPT",
    tone: "Profesional",
    prompt:
      "Buat prompt untuk menyusun PPT akademik 20 slide dari dokumen terlampir, lengkap dengan visual, tabel, speaker notes, dan alur problem-analysis-solution.",
  },
  {
    title: "Laporan Word Akademik",
    category: "Academic",
    model: "Claude",
    outputType: "Dokumen Word",
    tone: "Profesional",
    prompt:
      "Buat prompt untuk menyusun laporan Word akademik dari dokumen terlampir dengan pendahuluan, pembahasan, analisis, kesimpulan, dan rekomendasi.",
  },
  {
    title: "Konten Instagram UMKM",
    category: "Content Creator",
    model: "ChatGPT",
    outputType: "Konten",
    tone: "Santai",
    prompt:
      "Buat kalender konten 14 hari untuk brand lokal dengan hook, visual, caption, dan CTA.",
  },
  {
    title: "Proposal Kerja Sama",
    category: "Business",
    model: "Claude",
    outputType: "Dokumen Word",
    tone: "Persuasif",
    prompt:
      "Susun proposal kemitraan dengan latar belakang, tujuan, benefit, rencana eksekusi, dan penutup.",
  },
  {
    title: "Debug Kode",
    category: "Coding",
    model: "ChatGPT",
    outputType: "Analisis",
    tone: "Profesional",
    prompt:
      "Analisis bug berikut, jelaskan penyebab, beri patch, dan tulis test case yang relevan.",
  },
  {
    title: "Prompt Gambar Produk",
    category: "Image AI",
    model: "Midjourney",
    outputType: "Konten",
    tone: "Kreatif",
    prompt:
      "Buat prompt visual produk dengan komposisi, lighting, background, material, dan negative prompt.",
  },
  {
    title: "PRD Aplikasi Mobile",
    category: "Coding",
    model: "Claude",
    outputType: "Desain Teknis",
    tone: "Profesional",
    prompt:
      "Buat product requirement document untuk aplikasi mobile: problem, user persona, fitur prioritas, flow, data model, API, acceptance criteria, dan roadmap.",
  },
  {
    title: "Rencana Implementasi Pemerintah",
    category: "Business",
    model: "Claude",
    outputType: "Desain Teknis",
    tone: "Profesional",
    prompt:
      "Buat rencana implementasi aplikasi layanan publik berdasarkan lampiran: arsitektur, fitur, SOP, pelatihan staf, milestone, risiko, dan indikator keberhasilan.",
  },
  {
    title: "Analisis File Survei",
    category: "Academic",
    model: "Gemini",
    outputType: "Analisis",
    tone: "Profesional",
    prompt:
      "Analisis data survei dari file terlampir, cari insight utama, hambatan, prioritas masalah, rekomendasi, dan tabel ringkasan.",
  },
  {
    title: "Claude 4 Style Prompt",
    category: "Business",
    model: "Claude",
    outputType: "Desain Teknis",
    tone: "Profesional",
    prompt:
      "Ubah kebutuhan saya menjadi prompt Claude yang eksplisit: gunakan dokumen di atas, action verbs, batas panjang, output berurutan, positive instructions, dan Think before answering.",
  },
  {
    title: "Gemini Deep Research Brief",
    category: "Academic",
    model: "Gemini",
    outputType: "Analisis",
    tone: "Profesional",
    prompt:
      "Buat brief riset untuk Gemini: pertanyaan utama, asumsi, sumber yang perlu diverifikasi, tabel temuan, kontra-argumen, dan rekomendasi final.",
  },
  {
    title: "Grok/X Trend Breakdown",
    category: "Marketing",
    model: "Grok",
    outputType: "Konten",
    tone: "Santai",
    prompt:
      "Analisis tren/topik sosial media berikut menjadi angle konten, hook, opini kontra, thread outline, dan CTA yang tajam.",
  },
  {
    title: "OCR Screenshot to Task",
    category: "Academic",
    model: "Claude",
    outputType: "Analisis",
    tone: "Profesional",
    prompt:
      "Baca screenshot/foto tugas yang saya lampirkan, ekstrak instruksi penting, lalu ubah menjadi prompt final yang siap dipakai.",
  },
  {
    title: "PPT dari Foto Layar",
    category: "Academic",
    model: "Claude",
    outputType: "PPT",
    tone: "Profesional",
    prompt:
      "Buat prompt untuk menghasilkan PPT dari foto layar/papan presentasi terlampir. Sertakan slide-by-slide outline, visual asli/pengganti, tabel, dan speaker notes.",
  },
  {
    title: "Full-Stack App Builder",
    category: "Coding",
    model: "Claude",
    outputType: "Kode Aplikasi",
    tone: "Profesional",
    prompt:
      "Buat prompt untuk membangun aplikasi full-stack siap jalan: struktur folder, UI, API, data model, state, validasi, test, dan cara run lokal.",
  },
  {
    title: "Executive Summary Word",
    category: "Business",
    model: "Claude",
    outputType: "Dokumen Word",
    tone: "Profesional",
    prompt:
      "Buat prompt untuk menyusun executive summary Word dari lampiran: konteks, masalah, data kunci, solusi, risiko, rekomendasi, dan lampiran tabel.",
  },
];

const defaultLibrary = [
  { id: "seed-1", title: "Campaign promo kopi susu untuk mahasiswa", content: "Campaign promo kopi susu untuk mahasiswa", folder: "Content", tag: "Marketing", createdAt: Date.now() - 300000 },
  { id: "seed-2", title: "Email follow-up client desain logo", content: "Email follow-up client desain logo", folder: "Work", tag: "Business", createdAt: Date.now() - 200000 },
  { id: "seed-3", title: "Brief carousel edukasi skincare", content: "Brief carousel edukasi skincare", folder: "Content", tag: "Content", createdAt: Date.now() - 100000 },
];

const readableFileTypes = ["application/json", "text/csv", "text/markdown", "text/plain"];

function inferRole(category) {
  const roles = {
    Marketing: "growth marketing strategist",
    "Content Creator": "social media strategist",
    Business: "business development consultant",
    Coding: "senior software engineer",
    Academic: "academic research assistant",
    "Image AI": "AI visual prompt director",
  };
  return roles[category] || "prompt engineer profesional";
}

function isClaudeTarget(model) {
  return /claude/i.test(model);
}

function buildClaudePrompt({
  narrative,
  category,
  tone,
  outputType,
  attachments,
  mode = "builder",
}) {
  const cleanNarrative =
    narrative.trim() ||
    "Aku ingin membuat output berkualitas tinggi dari konteks yang tersedia.";
  const documentBlock = attachments.length
    ? `<documents>
${attachments
  .map(
    (file, index) =>
      `<document index="${index + 1}" name="${file.name}" type="${file.kind}" size="${file.sizeLabel}">
${file.excerpt ? file.excerpt : "Isi belum tersedia di preview lokal. Gunakan metadata file sebagai konteks awal."}
</document>`
  )
  .join("\n")}
</documents>

`
    : "";

  const reasoningLine =
    mode === "optimizer"
      ? "Think before answering (maximum reasoning), then output only the final optimized prompt."
      : "Think before answering (maximum reasoning), then produce the requested final output.";

  return `${documentBlock}<task>
${cleanNarrative}
</task>

Act as a ${inferRole(category)}.

Goal:
- Produce the exact deliverable requested in <task>.
- Use the selected output type as the primary boundary: ${outputType}.
- Use attached documents as source material, not as the deliverable type.

Execution steps:
1. Identify the requested deliverable.
2. Extract only relevant facts from <documents>, if present.
3. Build the answer in the exact order named under Output.
4. Include concrete details, examples, tables, diagrams, file structure, or visual instructions when they support the deliverable.
5. Ask up to 3 specific questions only when a missing fact blocks the work.

Output:
1. Scope summary: 2-4 bullets.
2. Final deliverable: complete content for ${outputType}.
3. Quality checklist: 5 checks.
4. Next iteration: 1-3 useful improvements.

Length:
- Keep bullets under 18 words unless technical detail requires more.
- Use tables when comparing risks, clauses, features, milestones, or data.
- Keep clarifying questions short and numbered.

Style:
- ${tone}.
- Use plain, concrete Indonesian.
- Use action verbs: define, extract, build, map, rank, rewrite, verify.
- Replace vague wording with specific boundaries, counts, order, and acceptance criteria.

Tool and evidence instruction:
- If web/search/tools are available and current facts are required, verify important claims with sources.
- If tools are not available, state which claims depend on provided documents.

${reasoningLine}`;
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeLibrary(raw) {
  if (!Array.isArray(raw)) return defaultLibrary;
  return raw.map((item, index) =>
    typeof item === "string"
      ? {
          id: `legacy-${index}-${Date.now()}`,
          title: item,
          content: item,
          folder: "General",
          tag: "Legacy",
          createdAt: Date.now() - index,
        }
      : {
          id: item.id || `item-${index}-${Date.now()}`,
          title: item.title || "Untitled prompt",
          content: item.content || item.title || "",
          folder: item.folder || "General",
          tag: item.tag || "Prompt",
          createdAt: item.createdAt || Date.now(),
          updatedAt: item.updatedAt || item.createdAt || Date.now(),
        }
  );
}

function buildPrompt(narrative, category, tone, model, outputType, attachments) {
  if (isClaudeTarget(model)) {
    return buildClaudePrompt({ narrative, category, tone, outputType, attachments });
  }

  const cleanNarrative =
    narrative.trim() ||
    "Aku ingin membuat konten promosi untuk produk kopi susu lokal, targetnya mahasiswa, bahasanya santai tapi tetap menjual.";
  const attachmentContext = attachments.length
    ? `

Lampiran yang perlu dianalisis:
${attachments
  .map(
    (file, index) =>
      `- Lampiran ${index + 1}: ${file.name} (${file.kind}, ${file.sizeLabel})${
        file.excerpt ? `\n  Cuplikan isi: ${file.excerpt}` : ""
      }`
  )
  .join("\n")}

Instruksi untuk lampiran:
- Gunakan isi lampiran sebagai konteks, bukan sebagai penentu jenis output
- Jangan mengarang detail yang tidak terlihat atau tidak tersedia dari lampiran`
    : "";

  return `Bertindaklah sebagai ${inferRole(category)}.

Ubah kebutuhan berikut menjadi hasil terbaik untuk ${model}:
"${cleanNarrative}"${attachmentContext}

Jenis output yang diminta:
- ${outputType}

Tujuan:
- Pahami konteks utama dari narasi user
- Buat output yang jelas, praktis, dan siap digunakan
- Hindari jawaban generik

Gaya bahasa:
- ${tone}
- Rapi dan mudah dipahami
- Sesuai audiens Indonesia

Format output:
1. Ringkasan kebutuhan
2. Rekomendasi strategi
3. Output utama sesuai jenis output yang diminta
4. Checklist kualitas
5. Saran iterasi berikutnya

Batasan:
- Tanyakan maksimal 3 pertanyaan klarifikasi hanya jika informasi penting belum ada
- Jika informasi sudah cukup, langsung berikan jawaban final
- Gunakan contoh konkret, bukan teori umum`;
}

function scorePrompt(prompt) {
  const checks = [
    prompt.includes("Bertindaklah") || prompt.includes("Role"),
    prompt.includes("Tujuan") || prompt.includes("Objective"),
    prompt.includes("Gaya bahasa") || prompt.includes("Tone"),
    prompt.includes("Format") || prompt.includes("Output"),
    prompt.includes("Batasan") || prompt.includes("Constraints"),
    prompt.length > 500,
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return {
    score,
    clarity: Math.min(98, score + 4),
    context: Math.max(45, score - 3),
    format: Math.min(99, score + 8),
  };
}

function buildLocalOptimizedPrompt(rawPrompt, mode, targetModel, tone) {
  const source = rawPrompt.trim() || "Tuliskan prompt lama di sini.";
  if (isClaudeTarget(targetModel)) {
    return buildClaudePrompt({
      narrative: `Optimize this prompt for Claude while preserving the original deliverable:\n\n${source}`,
      category: "Business",
      tone,
      outputType: "Optimized Claude Prompt",
      attachments: [],
      mode: "optimizer",
    });
  }

  return `**Prompt Final**

**Role:** Anda adalah AI specialist yang memahami kebutuhan user dan mampu menghasilkan output sesuai deliverable yang diminta.

**Context:** Prompt awal user adalah:
${source}

**Objective:** Optimalkan prompt tersebut dengan mode "${mode}" untuk ${targetModel}. Pertahankan maksud utama dan jenis output yang diminta. Jangan mengubah permintaan aplikasi menjadi dokumen, permintaan PPT menjadi Word, atau permintaan Word menjadi PPT kecuali user meminta eksplisit.

**Output Format:**
1. Ringkasan pemahaman kebutuhan
2. Hasil utama sesuai deliverable
3. Detail pendukung
4. Checklist kualitas
5. Maksimal 3 pertanyaan klarifikasi jika informasi krusial belum tersedia

**Constraints:**
- Gunakan bahasa Indonesia dengan tone ${tone}.
- Jangan mengarang data yang tidak diberikan.
- Gunakan lampiran sebagai konteks bila tersedia, bukan sebagai penentu jenis output.
- Jika informasi cukup, langsung kerjakan tanpa meminta file ulang.

**Checklist Perbaikan**
- Struktur role, context, objective, output, dan constraints sudah eksplisit.
- Deliverable guard ditambahkan agar hasil tidak salah format.
- Instruksi klarifikasi dibuat terbatas.`;
}

function App() {
  const [active, setActive] = useState("Builder");
  const [category, setCategory] = useState("Marketing");
  const [tone, setTone] = useState("Profesional");
  const [model, setModel] = useState("ChatGPT");
  const [outputType, setOutputType] = useState("Kode Aplikasi");
  const [narrative, setNarrative] = useState(
    "Aku mau bikin konten Instagram buat jualan kopi susu, targetnya anak kuliah, bahasanya santai tapi tetap jualan."
  );
  const [attachments, setAttachments] = useState([]);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generationSource, setGenerationSource] = useState("local");
  const [generationModel, setGenerationModel] = useState("Local draft");
  const [generationStatus, setGenerationStatus] = useState("local");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [settingsStatus, setSettingsStatus] = useState(null);
  const [generationMode, setGenerationMode] = useState(
    () => localStorage.getItem("promptlab-generation-mode") || "Seimbang"
  );
  const [modelSettings, setModelSettings] = useState(() => {
    try {
      return { ...defaultModelSettings, ...JSON.parse(localStorage.getItem("promptlab-model-settings")) };
    } catch {
      return defaultModelSettings;
    }
  });
  const [providerTestStatus, setProviderTestStatus] = useState("");
  const [isTestingProvider, setIsTestingProvider] = useState(false);
  const [settingsSavedAt, setSettingsSavedAt] = useState("");
  const [optimizerResult, setOptimizerResult] = useState("");
  const [optimizerSource, setOptimizerSource] = useState("local");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizerError, setOptimizerError] = useState("");
  const [optimizerWarning, setOptimizerWarning] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [library, setLibrary] = useState(() => {
    try {
      return normalizeLibrary(JSON.parse(localStorage.getItem("promptlab-library")));
    } catch {
      return defaultLibrary;
    }
  });

  const localPrompt = useMemo(
    () => buildPrompt(narrative, category, tone, model, outputType, attachments),
    [narrative, category, tone, model, outputType, attachments]
  );
  const prompt = generatedPrompt || localPrompt;
  const metrics = useMemo(() => scorePrompt(prompt), [prompt]);
  const apiBase = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://127.0.0.1:8787" : "");

  useEffect(() => {
    localStorage.setItem("promptlab-library", JSON.stringify(library.slice(0, 60)));
  }, [library]);

  useEffect(() => {
    localStorage.setItem("promptlab-generation-mode", generationMode);
  }, [generationMode]);

  useEffect(() => {
    localStorage.setItem("promptlab-model-settings", JSON.stringify(modelSettings));
  }, [modelSettings]);

  useEffect(() => {
    setGeneratedPrompt("");
    setGenerationSource("local");
    setGenerationModel("Local draft");
    setGenerationStatus("local");
    setWarningMessage("");
  }, [narrative, category, tone, model, outputType, attachments.length]);

  useEffect(() => {
    if (active === "Settings") refreshHealth();
  }, [active]);

  function setBuilderFromTemplate(template) {
    setNarrative(template.prompt);
    setCategory(categories.includes(template.category) ? template.category : category);
    if (models.includes(template.model)) setModel(template.model);
    if (tones.includes(template.tone)) setTone(template.tone);
    setOutputType(template.outputType || outputType);
    setActive("Builder");
  }

  function copyText(text = prompt) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function savePrompt(content = prompt, titleSeed = narrative) {
    const title = titleSeed.trim().split(/\s+/).slice(0, 8).join(" ") || "Prompt baru";
    const item = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
      title,
      content,
      folder: outputType,
      tag: category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setLibrary((items) => [item, ...items]);
    setSelectedLibraryId(item.id);
  }

  function updateLibraryItem(id, patch) {
    setLibrary((items) => items.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item)));
  }

  function deleteLibraryItem(id) {
    setLibrary((items) => items.filter((item) => item.id !== id));
    if (selectedLibraryId === id) setSelectedLibraryId("");
  }

  function duplicateLibraryItem(item) {
    if (!item) return;
    const copy = {
      ...item,
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
      title: `${item.title} Copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setLibrary((items) => [copy, ...items]);
    setSelectedLibraryId(copy.id);
  }

  async function generatePrompt(customNarrative = narrative, customOutputType = outputType) {
    setIsGenerating(true);
    setErrorMessage("");
    setWarningMessage("");

    try {
      const formData = new FormData();
      formData.append("narrative", customNarrative);
      formData.append("category", category);
      formData.append("tone", tone);
      formData.append("model", model);
      formData.append("outputType", customOutputType);
      formData.append("generationMode", generationMode);
      formData.append("primaryModel", modelSettings.primaryModel);
      formData.append("fallbackModels", modelSettings.fallbackModels);
      formData.append("ocrModel", modelSettings.ocrModel);
      formData.append("provider", modelSettings.provider);
      formData.append("baseUrl", modelSettings.baseUrl);
      formData.append("apiKey", modelSettings.apiKey);
      formData.append("timeoutMs", modelSettings.timeoutMs);
      attachments.forEach((item) => formData.append("attachments", item.file));

      const response = await fetch(`${apiBase}/api/generate-prompt`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal generate prompt.");

      setGeneratedPrompt(data.prompt || localPrompt);
      setGenerationSource(data.source || "server");
      setGenerationModel(data.model || (data.source === "fallback" ? "Local fallback" : "Local draft"));
      setGenerationStatus(data.modelStatus || data.source || "server");
      setWarningMessage(data.warning || "");
      return data.prompt || localPrompt;
    } catch (error) {
      setGeneratedPrompt(localPrompt);
      setGenerationSource("local");
      setGenerationModel("Local draft");
      setGenerationStatus("local-error");
      setErrorMessage(error.message || "Backend belum tersedia, memakai prompt lokal.");
      return localPrompt;
    } finally {
      setIsGenerating(false);
    }
  }

  async function optimizePrompt(rawPrompt, mode) {
    setIsOptimizing(true);
    setOptimizerError("");
    setOptimizerWarning("");

    try {
      const response = await fetch(`${apiBase}/api/optimize-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: rawPrompt,
          mode,
          targetModel: model,
          tone,
          generationMode,
          ...modelSettings,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal optimasi prompt.");
      setOptimizerResult(data.prompt || buildLocalOptimizedPrompt(rawPrompt, mode, model, tone));
      setOptimizerSource(data.source || "server");
      setOptimizerWarning(data.warning || "");
      return data.prompt;
    } catch (error) {
      const fallback = buildLocalOptimizedPrompt(rawPrompt, mode, model, tone);
      setOptimizerResult(fallback);
      setOptimizerSource("local");
      setOptimizerError(error.message || "Backend belum tersedia, memakai optimizer lokal.");
      return fallback;
    } finally {
      setIsOptimizing(false);
    }
  }

  async function addAttachments(fileList) {
    const files = Array.from(fileList || []);
    const nextFiles = await Promise.all(
      files.slice(0, 6).map(async (file) => {
        const canRead = readableFileTypes.includes(file.type) || /\.(txt|md|json|csv)$/i.test(file.name);
        const rawText = canRead ? await file.text().catch(() => "") : "";
        const excerpt = rawText.replace(/\s+/g, " ").trim().slice(0, 360);
        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
          name: file.name,
          type: file.type || "unknown",
          kind: file.type?.startsWith("image/") ? "gambar/screenshot" : "file",
          sizeLabel: formatBytes(file.size),
          preview: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
          excerpt,
          file,
        };
      })
    );
    setAttachments((items) => [...nextFiles, ...items].slice(0, 8));
  }

  function removeAttachment(id) {
    setAttachments((items) => {
      const target = items.find((item) => item.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return items.filter((item) => item.id !== id);
    });
  }

  async function refreshHealth() {
    try {
      const params = new URLSearchParams({
        provider: modelSettings.provider || "",
        baseUrl: modelSettings.baseUrl || "",
        primaryModel: modelSettings.primaryModel || "",
        ocrModel: modelSettings.ocrModel || "",
      });
      const response = await fetch(`${apiBase}/api/health?${params}`);
      const data = await response.json();
      setSettingsStatus(data);
      setProviderTestStatus(data.ok ? "Health check OK" : "Health check gagal");
    } catch {
      setSettingsStatus({ ok: false, provider: "unreachable", model: "-", fallbackModel: "-" });
      setProviderTestStatus("Backend tidak terhubung");
    }
  }

  async function testProvider() {
    setIsTestingProvider(true);
    setProviderTestStatus("Testing provider...");
    try {
      const response = await fetch(`${apiBase}/api/test-provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelSettings),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Provider test gagal.");
      setProviderTestStatus(`OK: ${data.model || modelSettings.primaryModel}`);
      setSettingsStatus((status) => ({
        ...(status || {}),
        ai: true,
        model: data.model || modelSettings.primaryModel,
        ok: true,
        provider: data.provider || status?.provider || "openrouter",
      }));
    } catch (error) {
      setProviderTestStatus(error.message || "Provider test gagal.");
      setSettingsStatus((status) => ({ ...(status || {}), ok: false }));
    } finally {
      setIsTestingProvider(false);
    }
  }

  function saveModelSettings() {
    localStorage.setItem("promptlab-model-settings", JSON.stringify(modelSettings));
    setSettingsSavedAt(new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
    setProviderTestStatus("Settings tersimpan di browser ini.");
  }

  async function exportFile(format, content = prompt, titleSeed = narrative) {
    const formatLabel = format.toUpperCase();
    try {
      setExportStatus(`Preparing ${formatLabel}...`);
      const response = await fetch(`${apiBase}/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleSeed.trim().split(/\s+/).slice(0, 10).join(" ") || "PromptLab Export",
          content,
        }),
      });
      if (!response.ok) throw new Error(`Gagal export ${format.toUpperCase()}.`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `promptlab-export.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportStatus(`${formatLabel} downloaded`);
      window.setTimeout(() => setExportStatus(""), 2200);
    } catch (error) {
      setErrorMessage(error.message || "Export gagal.");
      setExportStatus(`${formatLabel} failed`);
    }
  }

  const filteredLibrary = library.filter((item) =>
    `${item.title} ${item.content} ${item.folder} ${item.tag}`.toLowerCase().includes(search.toLowerCase())
  );
  const selectedLibrary = library.find((item) => item.id === selectedLibraryId) || filteredLibrary[0];

  const shared = {
    active,
    setActive,
    category,
    setCategory,
    tone,
    setTone,
    model,
    setModel,
    outputType,
    setOutputType,
    narrative,
    setNarrative,
    attachments,
    addAttachments,
    removeAttachment,
    prompt,
    metrics,
    generationSource,
    generationModel,
    generationStatus,
    warningMessage,
    errorMessage,
    copied,
    copyText,
    savePrompt,
    generatePrompt,
    isGenerating,
    library,
    filteredLibrary,
    selectedLibrary,
    selectedLibraryId,
    setSelectedLibraryId,
    updateLibraryItem,
    deleteLibraryItem,
    duplicateLibraryItem,
    search,
    setSearch,
    compareA,
    setCompareA,
    compareB,
    setCompareB,
    settingsStatus,
    refreshHealth,
    generationMode,
    setGenerationMode,
    modelSettings,
    setModelSettings,
    saveModelSettings,
    settingsSavedAt,
    providerTestStatus,
    isTestingProvider,
    testProvider,
    exportStatus,
    exportFile,
    apiBase,
    setBuilderFromTemplate,
    optimizerResult,
    optimizerSource,
    isOptimizing,
    optimizerError,
    optimizerWarning,
    optimizePrompt,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <Nav active={active} setActive={setActive} />
        <div className="sidebar-card">
          <Gauge size={18} />
          <div>
            <strong>Prompt Score</strong>
            <p>Struktur, konteks, dan format dicek sebelum dipakai.</p>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <Topbar active={active} setActive={setActive} />
        {active === "Builder" && <BuilderView {...shared} />}
        {active === "Optimizer" && <OptimizerView {...shared} />}
        {active === "Templates" && <TemplatesView {...shared} />}
        {active === "Library" && <LibraryView {...shared} />}
        {active === "Compare" && <CompareView {...shared} />}
        {active === "Settings" && <SettingsView {...shared} />}
      </main>

      <BottomNav active={active} setActive={setActive} />
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Sparkles size={20} />
      </div>
      <div>
        <strong>PromptLab</strong>
        <span>AI prompt workspace</span>
      </div>
    </div>
  );
}

function navItems() {
  return [
    ["Builder", PenLine],
    ["Optimizer", Wand2],
    ["Templates", BookOpenText],
    ["Library", Library],
    ["Compare", ArrowRightLeft],
    ["Settings", Settings],
  ];
}

function Nav({ active, setActive }) {
  return (
    <nav className="nav-list">
      {navItems().map(([item, Icon]) => (
        <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)} title={item}>
          <Icon size={18} />
          <span>{item}</span>
        </button>
      ))}
    </nav>
  );
}

function BottomNav({ active, setActive }) {
  return (
    <nav className="bottom-nav">
      {navItems().map(([item, Icon]) => (
        <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>
          <Icon size={18} />
          <span>{item}</span>
        </button>
      ))}
    </nav>
  );
}

function Topbar({ active, setActive }) {
  const titles = {
    Builder: ["Prompt Terbaik Untuk AI", "Ubah ide mentah, file, dan screenshot menjadi instruksi presisi untuk Claude, ChatGPT, Gemini, dan model kreatif lainnya."],
    Optimizer: ["Poles Prompt Lama Jadi Lebih Tajam", "Perkuat scope, output, batasan, dan gaya bahasa tanpa mengubah tujuan awal."],
    Templates: ["Galeri Template untuk Kerja Serius", "Mulai dari pola terbaik untuk aplikasi, PPT, laporan Word, riset, coding, visual, dan konten."],
    Library: ["Ruang Arsip Prompt Terbaik", "Simpan, edit, bandingkan, dan pakai ulang prompt yang sudah terbukti bekerja."],
    Compare: ["A/B Lab untuk Prompt yang Lebih Menang", "Bandingkan struktur, konteks, format output, dan risiko salah hasil sebelum dikirim ke AI."],
    Settings: ["Command Center Model AI", "Atur mode generate, cek provider, pantau fallback, dan pastikan engine siap dipakai."],
  };
  const [title, subtitle] = titles[active] || titles.Builder;
  return (
    <header className="topbar">
      <div className="topbar-aura" aria-hidden="true" />
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {active === "Builder" && (
          <div className="hero-capabilities" aria-label="PromptLab capabilities">
            <span>OCR Screenshot</span>
            <span>Model Fallback</span>
            <span>DOCX/PPTX Export</span>
          </div>
        )}
      </div>
      <button className="icon-button" title="Settings" onClick={() => setActive("Settings")}>
        <Settings size={20} />
      </button>
    </header>
  );
}

function BuilderView(props) {
  return (
    <>
      <section className="content-grid">
        <BuilderPanel {...props} />
        <ResultPanel {...props} />
      </section>
      <BuilderCommandStrip {...props} />
      <section className="lower-grid">
        <LibraryPreview {...props} />
        <ComparePreview setActive={props.setActive} />
      </section>
    </>
  );
}

function BuilderCommandStrip({ metrics, attachments, model, outputType, generationMode, generationStatus }) {
  const items = [
    { icon: ShieldCheck, label: "Quality Gate", value: `${metrics.score}% ready`, tone: "mint" },
    { icon: BrainCircuit, label: "Target Engine", value: model, tone: "blue" },
    { icon: Layers3, label: "Deliverable", value: outputType, tone: "cyan" },
    { icon: Clock3, label: "Mode", value: generationMode || statusLabel(generationStatus), tone: "amber" },
  ];

  return (
    <section className="command-strip" aria-label="Builder command summary">
      {items.map(({ icon: Icon, label, value, tone }) => (
        <div className={`command-card ${tone}`} key={label}>
          <Icon size={18} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <div className="command-card files">
        <Paperclip size={18} />
        <span>Context Files</span>
        <strong>{attachments.length ? `${attachments.length} attached` : "Drop to enrich"}</strong>
      </div>
    </section>
  );
}

function BuilderPanel({
  narrative,
  setNarrative,
  attachments,
  addAttachments,
  removeAttachment,
  category,
  setCategory,
  tone,
  setTone,
  model,
  setModel,
  outputType,
  setOutputType,
  generatePrompt,
  savePrompt,
  isGenerating,
}) {
  return (
    <div className="builder-panel">
      <div className="panel-heading">
        <div>
          <h2>Prompt Studio</h2>
          <p>Tulis bebas, pilih target AI, lampirkan bahan, lalu biarkan PromptLab merapikan instruksinya.</p>
        </div>
        <Bot size={22} />
      </div>
      <label className="field-label" htmlFor="narrative">Narasi user</label>
      <textarea id="narrative" value={narrative} onChange={(event) => setNarrative(event.target.value)} placeholder="Ceritakan kebutuhanmu dengan bahasa biasa..." />
      <AttachmentZone attachments={attachments} addAttachments={addAttachments} removeAttachment={removeAttachment} />
      <div className="control-grid">
        <ControlGroup label="Kategori" options={categories} value={category} onChange={setCategory} />
        <ControlGroup label="Tone" options={tones} value={tone} onChange={setTone} />
        <ControlGroup label="Target AI" options={models} value={model} onChange={setModel} />
        <ControlGroup label="Jenis Output" options={outputTypes} value={outputType} onChange={setOutputType} />
      </div>
      <div className="builder-actions">
        <button className="primary-button" onClick={() => generatePrompt()} disabled={isGenerating}>
          <Rocket size={18} />
          {isGenerating ? "Generating..." : "Generate Prompt"}
        </button>
        <button className="secondary-button" onClick={() => savePrompt()}>
          <Save size={18} />
          Save
        </button>
      </div>
    </div>
  );
}

function AttachmentZone({ attachments, addAttachments, removeAttachment }) {
  return (
    <>
      <div className="attach-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
        event.preventDefault();
        addAttachments(event.dataTransfer.files);
      }}>
        <input id="attachments" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,.xlsx" onChange={(event) => addAttachments(event.target.files)} />
        <label htmlFor="attachments">
          <Paperclip size={18} />
          <span>Attach gambar, screenshot, atau file</span>
          <strong>Foto tugas, layar presentasi, PDF, PPT, DOC, TXT. Gambar dicoba dibaca OCR saat generate.</strong>
        </label>
      </div>
      {attachments.length > 0 && (
        <div className="attachment-list">
          {attachments.map((file) => (
            <div className="attachment-item" key={file.id}>
              {file.preview ? <img src={file.preview} alt={file.name} /> : <div className="file-icon"><FileText size={18} /></div>}
              <div>
                <strong>{file.name}</strong>
                <span>{file.kind} · {file.sizeLabel}</span>
                {file.excerpt && <em>Isi file terbaca</em>}
              </div>
              <button onClick={() => removeAttachment(file.id)} title="Remove file"><X size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function statusLabel(status, source) {
  if (status === "primary-model") return "Primary model";
  if (status === "fallback-model") return "Fallback model";
  if (status === "local-fallback") return "Local fallback";
  if (status === "local-error") return "Local backup";
  if (source === "fallback") return "Local fallback";
  if (source === "openrouter") return "OpenRouter";
  if (source === "openai") return "OpenAI";
  return "Local draft";
}

function ResultPanel({
  prompt,
  metrics,
  generationSource,
  generationModel,
  generationStatus,
  copied,
  copyText,
  savePrompt,
  warningMessage,
  errorMessage,
  narrative,
  exportStatus,
  exportFile,
}) {
  return (
    <aside className="result-panel">
      <div className="intel-header">
        <div>
          <span>AI Readiness Console</span>
          <strong>PromptLab Intelligence</strong>
        </div>
        <Sparkles size={20} />
      </div>
      <div className="score-row">
        <div className="score-ring" style={{ "--score": `${metrics.score}%` }}>
          <span>{metrics.score}</span>
        </div>
        <div>
          <h2>Readiness Score</h2>
          <p>Struktur, konteks, format, dan batasan dicek sebelum prompt dipakai.</p>
        </div>
      </div>
      <div className="metric-list">
        <Metric label="Clarity" value={metrics.clarity} />
        <Metric label="Context" value={metrics.context} />
        <Metric label="Output format" value={metrics.format} />
      </div>
      <div className="route-stack">
        <div>
          <span>01</span>
          <strong>Intent parsed</strong>
          <small>Role, tujuan, dan output terbaca.</small>
        </div>
        <div>
          <span>02</span>
          <strong>Guardrails active</strong>
          <small>Format dan batasan dikunci.</small>
        </div>
        <div>
          <span>03</span>
          <strong>Export ready</strong>
          <small>Copy, DOCX, dan PPTX siap.</small>
        </div>
      </div>
      <div className="prompt-output">
        <div className="prompt-toolbar">
          <span>Optimized Prompt <em>{statusLabel(generationStatus, generationSource)}</em></span>
          <div>
            <button className="icon-button small" onClick={() => copyText(prompt)} title="Copy">
              {copied ? <Check size={16} /> : <Clipboard size={16} />}
            </button>
            <button className="icon-button small" onClick={() => savePrompt(prompt)} title="Save">
              <Archive size={16} />
            </button>
          </div>
        </div>
        <pre>{prompt}</pre>
      </div>
      <div className="generation-status">
        <span>Engine</span>
        <strong>{generationModel}</strong>
      </div>
      {warningMessage && <p className="warning-note">{warningMessage}</p>}
      {errorMessage && <p className="error-note">{errorMessage}</p>}
      <div className="before-after">
        <div><span>Before</span><p>{narrative}</p></div>
        <div><span>After</span><p>Role, goal, tone, format, batasan, dan konteks lampiran sudah dipisah jelas.</p></div>
      </div>
      <div className="delivery-pack">
        <div>
          <span>Delivery Pack</span>
          <strong>Ambil prompt sebagai file kerja</strong>
          <p>DOCX/PPTX berisi prompt final untuk ditempel ke Claude, ChatGPT, Gemini, Grok, atau model lain.</p>
        </div>
        <div className="delivery-actions">
          <button className="secondary-button" onClick={() => copyText(prompt)}><Clipboard size={18} />Copy</button>
          <button className="secondary-button" onClick={() => savePrompt(prompt)}><Archive size={18} />Save</button>
          <button className="secondary-button" onClick={() => exportFile("docx", prompt, narrative)}><FileText size={18} />DOCX</button>
          <button className="secondary-button" onClick={() => exportFile("pptx", prompt, narrative)}><BookOpenText size={18} />PPTX</button>
        </div>
        <p className="delivery-note">
          {exportStatus || "Catatan: export ini menyimpan prompt, bukan membuat laporan final otomatis."}
        </p>
      </div>
    </aside>
  );
}

function OptimizerView({
  optimizerResult,
  optimizerSource,
  isOptimizing,
  optimizerError,
  optimizerWarning,
  optimizePrompt,
  copyText,
  savePrompt,
  exportFile,
}) {
  const [rawPrompt, setRawPrompt] = useState("Buat prompt yang lebih bagus untuk konten Instagram produk kopi susu.");
  const [mode, setMode] = useState("Lebih Jelas");
  const beforeScore = scorePrompt(rawPrompt);
  const result = optimizerResult || buildLocalOptimizedPrompt(rawPrompt, mode, "Target AI", "Profesional");
  const afterScore = scorePrompt(result);

  async function runOptimize() {
    await optimizePrompt(rawPrompt, mode);
  }

  return (
    <section className="content-grid">
      <div className="builder-panel">
        <div className="panel-heading"><div><h2>Optimizer</h2><p>Paste prompt lama, pilih mode, lalu perbaiki.</p></div><Wand2 size={22} /></div>
        <div className="optimizer-score-grid">
          <div><span>Before</span><strong>{beforeScore.score}</strong><small>struktur awal</small></div>
          <div><span>After</span><strong>{afterScore.score}</strong><small>estimasi hasil</small></div>
          <div><span>Mode</span><strong>{mode}</strong><small>strategi optimasi</small></div>
        </div>
        <label className="field-label">Prompt lama</label>
        <textarea value={rawPrompt} onChange={(event) => setRawPrompt(event.target.value)} />
        <div className="control-grid single">
          <ControlGroup label="Mode Optimasi" options={optimizerModes} value={mode} onChange={setMode} />
        </div>
        <div className="builder-actions">
          <button className="primary-button" onClick={runOptimize} disabled={isOptimizing}><Zap size={18} />{isOptimizing ? "Optimizing..." : "Optimize Prompt"}</button>
          <button className="secondary-button" onClick={() => copyText(rawPrompt)}><Clipboard size={18} />Copy Original</button>
        </div>
        {optimizerWarning && <p className="warning-note">{optimizerWarning}</p>}
        {optimizerError && <p className="error-note">{optimizerError}</p>}
      </div>
      <div className="result-panel">
        <div className="panel-heading">
          <div>
            <h2>Optimized Result</h2>
            <p>Hasil optimasi siap disimpan ke Library.</p>
          </div>
          <strong className="status-pill">{optimizerSource}</strong>
        </div>
        <div className="metric-list">
          <Metric label="Clarity" value={afterScore.clarity} />
          <Metric label="Context" value={afterScore.context} />
          <Metric label="Output format" value={afterScore.format} />
        </div>
        <div className="prompt-output"><pre>{result}</pre></div>
        <div className="builder-actions">
          <button className="secondary-button" onClick={() => copyText(result)}><Clipboard size={18} />Copy</button>
          <button className="secondary-button" onClick={() => savePrompt(result, rawPrompt)}><Save size={18} />Save</button>
          <button className="secondary-button" onClick={() => exportFile("docx", result, rawPrompt)}><FileText size={18} />DOCX</button>
        </div>
      </div>
    </section>
  );
}

function TemplatesView({ setBuilderFromTemplate, search, setSearch }) {
  const [templateCategory, setTemplateCategory] = useState("Semua");
  const [templateModel, setTemplateModel] = useState("Semua");
  const [templateOutput, setTemplateOutput] = useState("Semua");
  const templateCategories = ["Semua", ...new Set(templates.map((template) => template.category))];
  const templateModels = ["Semua", ...new Set(templates.map((template) => template.model || "General"))];
  const templateOutputs = ["Semua", ...new Set(templates.map((template) => template.outputType))];
  const filtered = templates.filter((template) => {
    const matchesSearch = `${template.title} ${template.category} ${template.outputType} ${template.model} ${template.prompt}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = templateCategory === "Semua" || template.category === templateCategory;
    const matchesModel = templateModel === "Semua" || template.model === templateModel;
    const matchesOutput = templateOutput === "Semua" || template.outputType === templateOutput;
    return matchesSearch && matchesCategory && matchesModel && matchesOutput;
  });
  return (
    <section className="builder-panel">
      <div className="section-title">
        <div>
          <h2>Template Gallery</h2>
          <p>Pilih pola prompt sesuai model, output, dan pekerjaan.</p>
        </div>
        <div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari template..." /></div>
      </div>
      <div className="template-filter">
        <span>Category</span>
        {templateCategories.map((item) => (
          <button key={item} className={templateCategory === item ? "selected" : ""} onClick={() => setTemplateCategory(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="template-filter">
        <span>Target AI</span>
        {templateModels.map((item) => (
          <button key={item} className={templateModel === item ? "selected" : ""} onClick={() => setTemplateModel(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="template-filter">
        <span>Output</span>
        {templateOutputs.map((item) => (
          <button key={item} className={templateOutput === item ? "selected" : ""} onClick={() => setTemplateOutput(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="template-gallery">
        {filtered.map((template) => (
          <button key={template.title} onClick={() => setBuilderFromTemplate(template)}>
            <span>{template.category} · {template.outputType}</span>
            <strong>{template.title}</strong>
            <p>{template.prompt}</p>
            <small>{template.model || "General"} · {template.tone || "Auto"}</small>
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p className="empty-state">Belum ada template yang cocok.</p>}
    </section>
  );
}

function LibraryView({
  filteredLibrary,
  selectedLibrary,
  selectedLibraryId,
  setSelectedLibraryId,
  search,
  setSearch,
  updateLibraryItem,
  deleteLibraryItem,
  duplicateLibraryItem,
  copyText,
  setCompareA,
  setCompareB,
  setActive,
  setNarrative,
  setCategory,
  setOutputType,
  exportFile,
}) {
  const [folderFilter, setFolderFilter] = useState("Semua");
  const folderOptions = ["Semua", ...new Set(filteredLibrary.map((item) => item.folder || "General"))];
  const visibleLibrary = filteredLibrary.filter((item) => folderFilter === "Semua" || item.folder === folderFilter);
  const currentItem = visibleLibrary.find((item) => item.id === selectedLibraryId) || visibleLibrary[0] || selectedLibrary;

  function useInBuilder(item) {
    if (!item) return;
    setNarrative(item.content);
    if (categories.includes(item.tag)) setCategory(item.tag);
    if (outputTypes.includes(item.folder)) setOutputType(item.folder);
    setActive("Builder");
  }

  function formatDate(timestamp) {
    if (!timestamp) return "-";
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(timestamp);
  }

  return (
    <section className="content-grid">
      <div className="library-panel">
        <div className="section-title">
          <h2>Saved Prompts</h2>
          <div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari prompt..." /></div>
        </div>
        <div className="template-filter compact">
          {folderOptions.map((item) => (
            <button key={item} className={folderFilter === item ? "selected" : ""} onClick={() => setFolderFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        {visibleLibrary.map((item) => (
          <button className={`library-row ${currentItem?.id === item.id ? "selected" : ""}`} key={item.id} onClick={() => setSelectedLibraryId(item.id)}>
            <FolderOpen size={18} />
            <span>
              {item.title}
              <em>{item.tag} · {formatDate(item.updatedAt || item.createdAt)}</em>
            </span>
            <small>{item.folder}</small>
          </button>
        ))}
        {visibleLibrary.length === 0 && <p className="empty-state">Belum ada prompt yang cocok.</p>}
      </div>
      <div className="result-panel">
        {currentItem ? (
          <>
            <label className="field-label">Judul</label>
            <input className="text-input" value={currentItem.title} onChange={(event) => updateLibraryItem(currentItem.id, { title: event.target.value })} />
            <div className="library-meta-grid">
              <div>
                <label className="field-label">Folder / Output</label>
                <input className="text-input" value={currentItem.folder} onChange={(event) => updateLibraryItem(currentItem.id, { folder: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Tag / Kategori</label>
                <input className="text-input" value={currentItem.tag} onChange={(event) => updateLibraryItem(currentItem.id, { tag: event.target.value })} />
              </div>
            </div>
            <label className="field-label">Isi Prompt</label>
            <textarea value={currentItem.content} onChange={(event) => updateLibraryItem(currentItem.id, { content: event.target.value })} />
            <div className="library-meta-note">
              <span>Dibuat {formatDate(currentItem.createdAt)}</span>
              <span>Diupdate {formatDate(currentItem.updatedAt || currentItem.createdAt)}</span>
            </div>
            <div className="builder-actions wrap">
              <button className="primary-button" onClick={() => useInBuilder(currentItem)}><PenLine size={18} />Use in Builder</button>
              <button className="secondary-button" onClick={() => copyText(currentItem.content)}><Clipboard size={18} />Copy</button>
              <button className="secondary-button" onClick={() => duplicateLibraryItem(currentItem)}><Plus size={18} />Duplicate</button>
              <button className="secondary-button" onClick={() => { setCompareA(currentItem.content); setActive("Compare"); }}><ArrowRightLeft size={18} />Compare A</button>
              <button className="secondary-button" onClick={() => { setCompareB(currentItem.content); setActive("Compare"); }}><ArrowRightLeft size={18} />Compare B</button>
              <button className="secondary-button" onClick={() => exportFile("docx", currentItem.content, currentItem.title)}><FileText size={18} />DOCX</button>
              <button className="secondary-button" onClick={() => exportFile("pptx", currentItem.content, currentItem.title)}><BookOpenText size={18} />PPTX</button>
              <button className="secondary-button danger" onClick={() => deleteLibraryItem(currentItem.id)}><Trash2 size={18} />Delete</button>
            </div>
          </>
        ) : <p>Tidak ada prompt tersimpan.</p>}
      </div>
    </section>
  );
}

function compareAdvice(prompt, score) {
  const checks = [
    { label: "Role jelas", ok: /role|bertindaklah|anda adalah|act as/i.test(prompt), fix: "Tambahkan peran spesifik di awal prompt." },
    { label: "Konteks lengkap", ok: /context|konteks|latar belakang|berdasarkan|lampiran/i.test(prompt), fix: "Jelaskan sumber konteks, audiens, dan situasi pemakaian." },
    { label: "Format output", ok: /format|output|struktur|tabel|json|markdown|slide|dokumen/i.test(prompt), fix: "Tentukan bentuk jawaban dan urutannya." },
    { label: "Batasan", ok: /constraint|batasan|jangan|harus|maksimal|minimal|wajib/i.test(prompt), fix: "Tambah batasan jumlah, nada, scope, atau hal yang harus dipenuhi." },
    { label: "Kriteria selesai", ok: /acceptance|checklist|validasi|kriteria|berhasil|selesai/i.test(prompt), fix: "Tambahkan checklist kualitas atau acceptance criteria." },
  ];
  const missing = checks.filter((item) => !item.ok).map((item) => item.fix);
  const summary = score.score >= 85
    ? "Siap dipakai. Iterasi berikutnya cukup poles detail kecil."
    : score.score >= 70
      ? "Cukup kuat, tapi masih bisa dibuat lebih eksplisit."
      : "Masih rawan hasil generik. Perlu role, konteks, format, dan batasan lebih tegas.";

  return { checks, missing, summary };
}

function CompareView({
  compareA,
  setCompareA,
  compareB,
  setCompareB,
  setNarrative,
  savePrompt,
  copyText,
  setActive,
}) {
  const scoreA = scorePrompt(compareA || "");
  const scoreB = scorePrompt(compareB || "");
  const adviceA = compareAdvice(compareA || "", scoreA);
  const adviceB = compareAdvice(compareB || "", scoreB);
  const winner = scoreA.score === scoreB.score ? "Seimbang" : scoreA.score > scoreB.score ? "Prompt A lebih kuat" : "Prompt B lebih kuat";
  const winnerPrompt = scoreA.score >= scoreB.score ? compareA : compareB;
  const winnerLabel = scoreA.score === scoreB.score ? "Prompt A" : scoreA.score > scoreB.score ? "Prompt A" : "Prompt B";

  function useWinner() {
    if (!winnerPrompt.trim()) return;
    setNarrative(winnerPrompt);
    setActive("Builder");
  }

  return (
    <section className="builder-panel">
      <div className="section-title">
        <div>
          <h2>Compare Prompts</h2>
          <p>Uji dua versi prompt sebelum dikirim ke AI. Pilih yang paling jelas, lengkap, dan minim salah tafsir.</p>
        </div>
        <strong className="status-pill">{winner}</strong>
      </div>
      <div className="compare-scoreboard">
        <CompareScore label="Prompt A" score={scoreA} active={winnerLabel === "Prompt A"} />
        <CompareScore label="Prompt B" score={scoreB} active={winnerLabel === "Prompt B" && scoreA.score !== scoreB.score} />
      </div>
      <div className="compare-editor">
        <div><label className="field-label">Prompt A · Score {scoreA.score}</label><textarea value={compareA} onChange={(event) => setCompareA(event.target.value)} placeholder="Paste prompt A..." /></div>
        <div><label className="field-label">Prompt B · Score {scoreB.score}</label><textarea value={compareB} onChange={(event) => setCompareB(event.target.value)} placeholder="Paste prompt B..." /></div>
      </div>
      <div className="compare-columns">
        <CompareAdvice title="Audit Prompt A" advice={adviceA} />
        <CompareAdvice title="Audit Prompt B" advice={adviceB} />
      </div>
      <div className="builder-actions wrap">
        <button className="primary-button" onClick={useWinner} disabled={!winnerPrompt.trim()}><PenLine size={18} />Use {winnerLabel} in Builder</button>
        <button className="secondary-button" onClick={() => savePrompt(winnerPrompt, `${winnerLabel} Compare Winner`)} disabled={!winnerPrompt.trim()}><Save size={18} />Save Winner</button>
        <button className="secondary-button" onClick={() => copyText(winnerPrompt)} disabled={!winnerPrompt.trim()}><Clipboard size={18} />Copy Winner</button>
      </div>
    </section>
  );
}

function CompareScore({ label, score, active }) {
  return (
    <div className={`compare-score ${active ? "active" : ""}`}>
      <span>{label}</span>
      <strong>{score.score}</strong>
      <div className="mini-metrics">
        <small>Clarity {score.clarity}%</small>
        <small>Context {score.context}%</small>
        <small>Format {score.format}%</small>
      </div>
    </div>
  );
}

function CompareAdvice({ title, advice }) {
  return (
    <div>
      <span>{title}</span>
      <p>{advice.summary}</p>
      <ul className="compare-checks">
        {advice.checks.map((item) => (
          <li key={item.label} className={item.ok ? "ok" : ""}>
            {item.ok ? "OK" : "Fix"} · {item.label}
          </li>
        ))}
      </ul>
      {advice.missing.length > 0 && (
        <p className="compare-next">Next: {advice.missing.slice(0, 2).join(" ")}</p>
      )}
    </div>
  );
}

function SettingsView({
  settingsStatus,
  refreshHealth,
  apiBase,
  generationMode,
  setGenerationMode,
  modelSettings,
  setModelSettings,
  saveModelSettings,
  settingsSavedAt,
  providerTestStatus,
  isTestingProvider,
  testProvider,
}) {
  const fallbackModels = modelSettings.fallbackModels
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const providerReady = Boolean(settingsStatus?.ok && settingsStatus?.ai);
  const activeProfile = modeProfiles[generationMode] || modeProfiles.Seimbang;
  const updateModelSetting = (key, value) => setModelSettings((settings) => ({ ...settings, [key]: value }));

  return (
    <section className="content-grid">
      <div className="builder-panel">
        <div className="panel-heading">
          <div>
            <h2>LLM Settings</h2>
            <p>Atur provider, endpoint, model, timeout, dan fallback untuk generate PromptLab.</p>
          </div>
          <strong className={`status-pill ${providerReady ? "ready" : "offline"}`}>
            {providerReady ? "Ready" : "Offline"}
          </strong>
        </div>
        <div className="mode-cards">
          {generationModes.map((mode) => (
            <button key={mode} className={generationMode === mode ? "selected" : ""} onClick={() => setGenerationMode(mode)}>
              <span>{mode}</span>
              <strong>{modeProfiles[mode].label}</strong>
              <p>{modeProfiles[mode].detail}</p>
            </button>
          ))}
        </div>
        <div className="settings-mode">
          <span>Mode aktif</span>
          <strong>{generationMode}</strong>
          <p>{activeProfile.bestFor}</p>
        </div>
        <div className="settings-grid">
          <InfoBox label="API Base" value={apiBase} />
          <InfoBox label="Provider" value={settingsStatus?.provider || modelSettings.provider || "-"} />
          <InfoBox label="Model aktif terakhir" value={settingsStatus?.model || "-"} />
          <InfoBox label="OCR aktif" value={modelSettings.ocrModel || settingsStatus?.ocrModel || "-"} />
        </div>
        <div className="model-settings-panel">
          <div className="section-title">
            <h2>Provider & Endpoint</h2>
            <button className="ghost-button" onClick={() => setModelSettings(defaultModelSettings)}>Reset</button>
          </div>
          <label className="field-label">Provider</label>
          <div className="provider-switch">
            {providerOptions.map((item) => (
              <button key={item} className={modelSettings.provider === item ? "selected" : ""} onClick={() => updateModelSetting("provider", item)}>
                {item}
              </button>
            ))}
          </div>
          <label className="field-label">Base URL / endpoint</label>
          <input
            className="text-input"
            value={modelSettings.baseUrl}
            onChange={(event) => updateModelSetting("baseUrl", event.target.value)}
            placeholder="https://openrouter.ai/api/v1"
          />
          <label className="field-label">API key override, opsional</label>
          <input
            className="text-input"
            type="password"
            value={modelSettings.apiKey}
            onChange={(event) => updateModelSetting("apiKey", event.target.value)}
            placeholder="Kosongkan untuk memakai ENV Vercel"
          />
          <p className="settings-help">Jika kosong, backend memakai API key dari Environment Variables Vercel. Jika diisi, key tersimpan di browser ini.</p>
        </div>
        <div className="model-settings-panel">
          <div className="section-title">
            <h2>Model Routing</h2>
            <span className="status-pill">{modelSettings.timeoutMs || "auto"} ms</span>
          </div>
          <label className="field-label">Model utama</label>
          <input
            className="text-input"
            value={modelSettings.primaryModel}
            onChange={(event) => updateModelSetting("primaryModel", event.target.value)}
            placeholder="google/gemma-4-26b-a4b-it:free"
          />
          <label className="field-label">OCR / Vision model</label>
          <input
            className="text-input"
            value={modelSettings.ocrModel}
            onChange={(event) => updateModelSetting("ocrModel", event.target.value)}
            placeholder="baidu/qianfan-ocr-fast:free"
          />
          <label className="field-label">Primary timeout, ms</label>
          <input
            className="text-input"
            value={modelSettings.timeoutMs}
            onChange={(event) => updateModelSetting("timeoutMs", event.target.value.replace(/[^\d]/g, ""))}
            placeholder="40000"
          />
          <label className="field-label">Fallback models, satu model per baris</label>
          <textarea
            className="model-list-input"
            value={modelSettings.fallbackModels}
            onChange={(event) => updateModelSetting("fallbackModels", event.target.value)}
            placeholder="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
          />
        </div>
        <div className="fallback-panel">
          <div className="section-title">
            <h2>Fallback Chain</h2>
            <span className="status-pill">{fallbackModels.length} model</span>
          </div>
          {(fallbackModels.length ? fallbackModels : [settingsStatus?.fallbackModel || "-"]).map((modelName, index) => (
            <div className="fallback-row" key={`${modelName}-${index}`}>
              <span>{index + 1}</span>
              <strong>{modelName}</strong>
            </div>
          ))}
        </div>
        <div className="builder-actions">
          <button className="primary-button" onClick={saveModelSettings}>
            <Save size={18} />Save Settings
          </button>
          <button className="primary-button" onClick={testProvider} disabled={isTestingProvider}>
            <Zap size={18} />{isTestingProvider ? "Testing..." : "Test Provider"}
          </button>
          <button className="secondary-button" onClick={refreshHealth}><Gauge size={18} />Health</button>
          <button className="secondary-button" onClick={() => navigator.clipboard?.writeText(apiBase).catch(() => {})}><Clipboard size={18} />Copy API Base</button>
        </div>
        {settingsSavedAt && <p className="provider-test-note">Settings terakhir disimpan: {settingsSavedAt}</p>}
        {providerTestStatus && <p className="provider-test-note">{providerTestStatus}</p>}
      </div>
      <div className="result-panel">
        <div className="panel-heading">
          <div>
            <h2>Runbook</h2>
            <p>Panduan pendek saat generate terasa lambat atau fallback lokal muncul.</p>
          </div>
          <Settings size={22} />
        </div>
        <div className="runbook-list">
          <div><span>1</span><p>Pakai <strong>Sabar Gratis</strong> untuk file besar, OCR, atau model free sedang antre.</p></div>
          <div><span>2</span><p>Jika selalu local fallback, tekan <strong>Test Provider</strong> dan cek API backend.</p></div>
          <div><span>3</span><p>Ganti key/model lewat file <strong>.env</strong>, lalu restart API.</p></div>
          <div><span>4</span><p>Untuk akses HP, buka frontend Tailscale dan pastikan backend lokal tetap hidup.</p></div>
        </div>
      </div>
    </section>
  );
}

function LibraryPreview({ filteredLibrary, setActive }) {
  return (
    <div className="library-panel">
      <div className="section-title">
        <h2>Library</h2>
        <button className="ghost-button" onClick={() => setActive("Library")}><Plus size={16} />Open</button>
      </div>
      {filteredLibrary.slice(0, 4).map((item) => (
        <button className="library-row" key={item.id} onClick={() => setActive("Library")}>
          <FolderOpen size={18} />
          <span>{item.title}</span>
          <ArrowRightLeft size={15} />
        </button>
      ))}
    </div>
  );
}

function ComparePreview({ setActive }) {
  return (
    <div className="compare-panel">
      <div className="section-title"><h2>A/B Prompt Lab</h2><button className="ghost-button" onClick={() => setActive("Compare")}><Search size={16} />Analyze</button></div>
      <div className="compare-columns">
        <div><span>Versi Cepat</span><p>Bagus untuk draft awal, tapi kurang batasan dan format.</p></div>
        <div><span>Versi Engineer</span><p>Lebih presisi karena memuat role, konteks, output, dan constraints.</p></div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return <div className="info-box"><span>{label}</span><strong>{String(value)}</strong></div>;
}

function ControlGroup({ label, options, value, onChange }) {
  return (
    <div className="control-group">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button key={option} className={value === option ? "selected" : ""} onClick={() => onChange(option)}>{option}</button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <div className="meter"><i style={{ width: `${value}%` }} /></div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
} else if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations?.().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}
