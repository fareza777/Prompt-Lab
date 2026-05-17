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
const tones = ["Professional", "Casual", "Persuasive", "Creative"];
const models = ["ChatGPT", "Claude", "Gemini", "Grok", "Midjourney"];
const outputTypes = ["Application Code", "Word Document", "PPT", "Technical Design", "Analysis", "Content"];
const optimizerModes = ["Clearer", "Shorter", "More Detailed", "Academic", "Marketing", "Coding"];
const generationModes = ["Fast", "Balanced", "Patient Free"];
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
  Fast: {
    label: "Fast draft",
    detail: "Try the primary model, then use a short fallback if needed.",
    bestFor: "Short content, early ideas, lightweight prompt revisions.",
  },
  Balanced: {
    label: "Daily stable",
    detail: "Moderate timeout with a patient fallback path.",
    bestFor: "Documents, slides, app prompts, and normal daily work.",
  },
  "Patient Free": {
    label: "Chase the result",
    detail: "Gives free models more time before routing through the fallback chain.",
    bestFor: "Large files, OCR, complex prompts, or slow free models.",
  },
};

const templates = [
  {
    title: "Web App from Document",
    category: "Coding",
    model: "Claude",
    outputType: "Application Code",
    tone: "Professional",
    prompt:
      "Build a locally runnable web application from the attached file. The file is content reference only. The output must be complete application code, not a report.",
  },
  {
    title: "20-Slide Academic Deck",
    category: "Academic",
    model: "Claude",
    outputType: "PPT",
    tone: "Professional",
    prompt:
      "Create a prompt for a 20-slide academic presentation from the attached document, including visuals, tables, speaker notes, and a problem-analysis-solution storyline.",
  },
  {
    title: "Academic Word Report",
    category: "Academic",
    model: "Claude",
    outputType: "Word Document",
    tone: "Professional",
    prompt:
      "Create a prompt for an academic Word report from the attached document with introduction, discussion, analysis, conclusion, and recommendations.",
  },
  {
    title: "SMB Instagram Content",
    category: "Content Creator",
    model: "ChatGPT",
    outputType: "Content",
    tone: "Casual",
    prompt:
      "Create a 14-day content calendar for a local brand with hooks, visuals, captions, and CTAs.",
  },
  {
    title: "Partnership Proposal",
    category: "Business",
    model: "Claude",
    outputType: "Word Document",
    tone: "Persuasive",
    prompt:
      "Draft a partnership proposal with background, objectives, benefits, execution plan, and closing section.",
  },
  {
    title: "Code Debugging",
    category: "Coding",
    model: "ChatGPT",
    outputType: "Analysis",
    tone: "Professional",
    prompt:
      "Analyze the bug, explain the cause, provide a patch, and write relevant test cases.",
  },
  {
    title: "Product Image Prompt",
    category: "Image AI",
    model: "Midjourney",
    outputType: "Content",
    tone: "Creative",
    prompt:
      "Create a product visual prompt with composition, lighting, background, material, and negative prompt.",
  },
  {
    title: "Mobile App PRD",
    category: "Coding",
    model: "Claude",
    outputType: "Technical Design",
    tone: "Professional",
    prompt:
      "Create a product requirements document for a mobile app: problem, user persona, priority features, flow, data model, API, acceptance criteria, and roadmap.",
  },
  {
    title: "Government Implementation Plan",
    category: "Business",
    model: "Claude",
    outputType: "Technical Design",
    tone: "Professional",
    prompt:
      "Create an implementation plan for a public service app based on the attachment: architecture, features, SOPs, staff training, milestones, risks, and success indicators.",
  },
  {
    title: "Survey File Analysis",
    category: "Academic",
    model: "Gemini",
    outputType: "Analysis",
    tone: "Professional",
    prompt:
      "Analyze survey data from the attached file, identify key insights, barriers, problem priorities, recommendations, and a summary table.",
  },
  {
    title: "Claude 4 Style Prompt",
    category: "Business",
    model: "Claude",
    outputType: "Technical Design",
    tone: "Professional",
    prompt:
      "Turn my requirements into an explicit Claude prompt: use the document above, action verbs, length boundaries, ordered output, positive instructions, and Think before answering.",
  },
  {
    title: "Gemini Deep Research Brief",
    category: "Academic",
    model: "Gemini",
    outputType: "Analysis",
    tone: "Professional",
    prompt:
      "Create a research brief for Gemini: main questions, assumptions, sources to verify, findings table, counterarguments, and final recommendations.",
  },
  {
    title: "Grok/X Trend Breakdown",
    category: "Marketing",
    model: "Grok",
    outputType: "Content",
    tone: "Casual",
    prompt:
      "Analyze this social media trend/topic into content angles, hooks, counter-opinions, thread outlines, and sharp CTAs.",
  },
  {
    title: "OCR Screenshot to Task",
    category: "Academic",
    model: "Claude",
    outputType: "Analysis",
    tone: "Professional",
    prompt:
      "Read the attached screenshot/photo of the task, extract the important instructions, then turn them into a ready-to-use final prompt.",
  },
  {
    title: "Deck from Screen Photo",
    category: "Academic",
    model: "Claude",
    outputType: "PPT",
    tone: "Professional",
    prompt:
      "Create a prompt to generate a PPT from the attached screen/photo/presentation board. Include a slide-by-slide outline, original/replacement visuals, tables, and speaker notes.",
  },
  {
    title: "Full-Stack App Builder",
    category: "Coding",
    model: "Claude",
    outputType: "Application Code",
    tone: "Professional",
    prompt:
      "Create a prompt to build a runnable full-stack app: folder structure, UI, API, data model, state, validation, tests, and local run steps.",
  },
  {
    title: "Executive Summary Word",
    category: "Business",
    model: "Claude",
    outputType: "Word Document",
    tone: "Professional",
    prompt:
      "Create a prompt for an executive summary Word document from the attachment: context, problem, key data, solution, risks, recommendations, and supporting tables.",
  },
];

const defaultLibrary = [
  { id: "seed-1", title: "Milk coffee campaign for students", content: "Milk coffee campaign for students", folder: "Content", tag: "Marketing", createdAt: Date.now() - 300000 },
  { id: "seed-2", title: "Logo design client follow-up email", content: "Logo design client follow-up email", folder: "Work", tag: "Business", createdAt: Date.now() - 200000 },
  { id: "seed-3", title: "Skincare education carousel brief", content: "Skincare education carousel brief", folder: "Content", tag: "Content", createdAt: Date.now() - 100000 },
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
  return roles[category] || "professional prompt engineer";
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
    "I want to create a high-quality output from the available context.";
  const documentBlock = attachments.length
    ? `<documents>
${attachments
  .map(
    (file, index) =>
      `<document index="${index + 1}" name="${file.name}" type="${file.kind}" size="${file.sizeLabel}">
${file.excerpt ? file.excerpt : "Content is not available in the local preview. Use the file metadata as initial context."}
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
- Use clear, concrete English.
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
    "I want to create promotional content for a local milk coffee product targeting college students. The tone should be casual but still sell.";
  const attachmentContext = attachments.length
    ? `

Attachments to analyze:
${attachments
  .map(
    (file, index) =>
      `- Attachment ${index + 1}: ${file.name} (${file.kind}, ${file.sizeLabel})${
        file.excerpt ? `\n  Content excerpt: ${file.excerpt}` : ""
      }`
  )
  .join("\n")}

Attachment instructions:
- Use attachment content as context, not as the deliverable type
- Do not invent details that are not visible or unavailable in the attachment`
    : "";

  return `Act as a ${inferRole(category)}.

Transform the following request into the best possible output for ${model}:
"${cleanNarrative}"${attachmentContext}

Requested output type:
- ${outputType}

Goal:
- Understand the main context from the user's request
- Produce a clear, practical, ready-to-use output
- Avoid generic answers

Language style:
- ${tone}
- Clean and easy to understand
- Suitable for the intended audience

Output format:
1. Request summary
2. Strategic recommendation
3. Main output according to the requested output type
4. Quality checklist
5. Next iteration suggestions

Constraints:
- Ask at most 3 clarifying questions only when critical information is missing
- If the information is sufficient, provide the final answer directly
- Use concrete examples, not generic theory`;
}

function scorePrompt(prompt) {
  const checks = [
    prompt.includes("Act as") || prompt.includes("Role"),
    prompt.includes("Goal") || prompt.includes("Objective"),
    prompt.includes("Language style") || prompt.includes("Tone"),
    prompt.includes("Format") || prompt.includes("Output"),
    prompt.includes("Constraints"),
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
  const source = rawPrompt.trim() || "Write the old prompt here.";
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

  return `**Final Prompt**

**Role:** You are an AI specialist who understands user needs and can produce the requested deliverable accurately.

**Context:** The user's original prompt is:
${source}

**Objective:** Optimize the prompt using "${mode}" mode for ${targetModel}. Preserve the original intent and requested output type. Do not turn an app request into a document, a PPT request into Word, or a Word request into PPT unless the user explicitly asks for it.

**Output Format:**
1. Summary of the interpreted request
2. Main result according to the deliverable
3. Supporting details
4. Quality checklist
5. Up to 3 clarifying questions if critical information is missing

**Constraints:**
- Use English with a ${tone} tone.
- Do not invent data that was not provided.
- Use attachments as context when available, not as the output type selector.
- If the information is sufficient, proceed without asking for the file again.

**Improvement Checklist**
- Role, context, objective, output, and constraints are explicit.
- Deliverable guardrails are added to prevent wrong output formats.
- Clarifying questions are limited.`;
}

function App() {
  const [active, setActive] = useState("Builder");
  const [category, setCategory] = useState("Marketing");
  const [tone, setTone] = useState("Professional");
  const [model, setModel] = useState("ChatGPT");
  const [outputType, setOutputType] = useState("Application Code");
  const [narrative, setNarrative] = useState(
    "I want to create Instagram content to sell milk coffee. The target audience is college students, and the tone should be casual but still persuasive."
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
    () => localStorage.getItem("promptlab-generation-mode") || "Balanced"
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
    if (!generationModes.includes(generationMode)) setGenerationMode("Balanced");
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
      if (!response.ok) throw new Error(data.error || "Failed to generate prompt.");

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
      if (!response.ok) throw new Error(data.error || "Failed to optimize prompt.");
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
      setProviderTestStatus(data.ok ? "Health check OK" : "Health check failed");
    } catch {
      setSettingsStatus({ ok: false, provider: "unreachable", model: "-", fallbackModel: "-" });
      setProviderTestStatus("Backend is not connected");
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
      if (!response.ok || !data.ok) throw new Error(data.error || "Provider test failed.");
      setProviderTestStatus(`OK: ${data.model || modelSettings.primaryModel}`);
      setSettingsStatus((status) => ({
        ...(status || {}),
        ai: true,
        model: data.model || modelSettings.primaryModel,
        ok: true,
        provider: data.provider || status?.provider || "openrouter",
      }));
    } catch (error) {
      setProviderTestStatus(error.message || "Provider test failed.");
      setSettingsStatus((status) => ({ ...(status || {}), ok: false }));
    } finally {
      setIsTestingProvider(false);
    }
  }

  function saveModelSettings() {
    localStorage.setItem("promptlab-model-settings", JSON.stringify(modelSettings));
    setSettingsSavedAt(new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
    setProviderTestStatus("Settings saved in this browser.");
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
      if (!response.ok) throw new Error(`Failed to export ${format.toUpperCase()}.`);
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
      setErrorMessage(error.message || "Export failed.");
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

  return <V2App {...shared} />;
}

function V2Preview() {
  const surfaceTokens = ["bg-0", "bg-1", "bg-2", "bg-3", "bg-input"];
  const lineTokens = ["line-soft", "line", "line-strong"];
  const textTokens = ["fg", "fg-2", "fg-mute", "fg-subtle", "fg-faint"];
  const accentTokens = ["ac", "ac-2", "ac-3", "ac-soft", "ac-line", "ac-glow"];
  const semanticTokens = ["pos", "warn", "neg"];
  const radiusTokens = ["r-sm", "r", "r-md", "r-lg", "r-xl"];

  return (
    <main className="v2-preview" data-theme="v2">
      <section className="v2-preview-hero">
        <span className="v2-eyebrow">PromptLab v2 tokens</span>
        <h1>The cleanest <em>prompt</em>, before you hit run.</h1>
        <p>Swatch grid untuk validasi R1: OKLCH palette, font stack, radius, dan control samples.</p>
      </section>
      <V2TokenSection title="Surfaces" tokens={surfaceTokens} />
      <V2TokenSection title="Lines" tokens={lineTokens} />
      <V2TokenSection title="Text" tokens={textTokens} />
      <V2TokenSection title="Accent" tokens={accentTokens} />
      <V2TokenSection title="Semantic" tokens={semanticTokens} />
      <section className="v2-preview-section">
        <h2>Radius</h2>
        <div className="v2-radius-grid">
          {radiusTokens.map((token) => (
            <div className="v2-radius-swatch" style={{ borderRadius: `var(--${token})` }} key={token}>
              <span>--{token}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="v2-preview-section">
        <h2>Typography</h2>
        <div className="v2-type-card">
          <h3>Instrument Serif <em>italic accent</em></h3>
          <p>Geist drives the product interface. Geist Mono carries tokens, prompts, shortcuts, and technical rhythm.</p>
          <code>&lt;role&gt; senior prompt engineer &lt;/role&gt;</code>
        </div>
      </section>
    </main>
  );
}

function V2TokenSection({ title, tokens }) {
  return (
    <section className="v2-preview-section">
      <h2>{title}</h2>
      <div className="v2-token-grid">
        {tokens.map((token) => (
          <div className="v2-token-card" key={token}>
            <div className="v2-token-swatch" style={{ background: `var(--${token})` }} />
            <span>--{token}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function V2App(props) {
  const { active, setActive, settingsStatus, generationStatus, generationSource, generationModel, metrics, isGenerating } = props;
  return (
    <div className="v2-shell" data-theme="v2">
      <aside className="v2-sidebar">
        <div className="v2-brand">
          <div className="v2-brand-mark"><Sparkles size={20} /></div>
          <div>
            <strong>PromptLab</strong>
            <span>AI prompt workspace</span>
          </div>
        </div>
        <nav className="v2-nav">
          {navItems().map(([item, Icon]) => (
            <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)} title={item}>
              <Icon size={18} />
              <span>{item}</span>
            </button>
          ))}
        </nav>
        <div className="v2-recent-list">
          <span>Recent</span>
          <button>Campaign brief</button>
          <button>Claude app build</button>
          <button>Slide outline</button>
        </div>
        <div className="v2-side-card">
          <span>Session</span>
          <strong>{isGenerating ? "Generating" : "Ready"}</strong>
          <p>{statusLabel(generationStatus, generationSource)} · {generationModel}</p>
        </div>
      </aside>

      <main className="v2-main">
        <V2Header active={active} setActive={setActive} settingsStatus={settingsStatus} />
        {active === "Builder" && <V2Builder {...props} />}
        {active === "Optimizer" && <V2Optimizer {...props} />}
        {active === "Templates" && <V2Templates {...props} />}
        {active === "Library" && <V2Library {...props} />}
        {active === "Compare" && <V2Compare {...props} />}
        {active === "Settings" && <V2Settings {...props} />}
      </main>
      <BottomNav active={active} setActive={setActive} />
    </div>
  );
}

function V2Header({ active, setActive, settingsStatus }) {
  const subtitles = {
    Builder: "Parse intent, lock guardrails, and ship model-ready prompts.",
    Optimizer: "Diff an old prompt into a sharper, safer instruction.",
    Templates: "Start from production-ready prompt patterns.",
    Library: "Manage your best prompts as reusable work assets.",
    Compare: "Compare models and prompt versions before sending them.",
    Settings: "Configure provider, endpoint, model, timeout, and fallback.",
  };
  return (
    <header className="v2-headerbar">
      <div>
        <span className="v2-eyebrow">PromptLab / {active}</span>
        <strong>{subtitles[active] || subtitles.Builder}</strong>
      </div>
      <div className="v2-header-actions">
        <span className="v2-sync"><i /> Synced</span>
        <button className="v2-search" onClick={() => setActive("Library")}>
          <Search size={15} />
          <span>Search library</span>
          <kbd>⌘K</kbd>
        </button>
        <span className={`v2-health ${settingsStatus?.ok ? "ready" : ""}`}>
          {settingsStatus?.ok ? "Provider ready" : "Local fallback ready"}
        </span>
        <button className="v2-icon-btn" onClick={() => setActive("Settings")} title="Settings">
          <Settings size={18} />
        </button>
        <div className="v2-avatar">F</div>
      </div>
    </header>
  );
}

function V2PageIntro({ eyebrow, title, copy, children }) {
  return (
    <section className="v2-hero">
      <div className="v2-hero-copy">
        <span className="v2-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {children}
    </section>
  );
}

function V2Builder(props) {
  const {
    category, setCategory, tone, setTone, model, setModel, outputType, setOutputType,
    narrative, setNarrative, attachments, addAttachments, removeAttachment, prompt,
    metrics, generationStatus, generationSource, generationModel, warningMessage, errorMessage, copied,
    copyText, savePrompt, generatePrompt, isGenerating, exportStatus, exportFile,
  } = props;
  const promptSize = `${Math.max(1, Math.round(prompt.length / 4)).toLocaleString("en-US")} est. tokens`;

  return (
    <div className="v2-screen">
      <V2PageIntro
        eyebrow="Builder"
        title={<>The cleanest <em>prompt</em>, before you hit run.</>}
        copy="Turn raw ideas, files, and screenshots into precise instructions for Claude, ChatGPT, Gemini, and other creative models."
      >
        <div className="v2-hero-status">
          <span>Readiness</span>
          <strong>{metrics.score}</strong>
          <small>{statusLabel(generationStatus, generationSource)}</small>
        </div>
      </V2PageIntro>

      <section className="v2-stats-strip">
        <V2Stat label="Clarity" value={`${metrics.clarity}%`} detail="Intent and role parsed" />
        <V2Stat label="Prompt Size" value={promptSize} detail="local estimate" />
        <V2Stat label="Output format" value={`${metrics.format}%`} detail={outputType} />
        <V2Stat label="Engine" value={generationModel} detail="active routing" compact />
      </section>

      <section className="v2-studio-grid">
        <div className="v2-card v2-composer">
          <div className="v2-card-head">
            <div>
              <h2>Prompt Studio</h2>
              <p>Write freely, choose a target AI, attach context, then generate.</p>
            </div>
            <Bot size={22} />
          </div>
          <label className="v2-label">User request</label>
          <textarea className="v2-textarea large" value={narrative} onChange={(event) => setNarrative(event.target.value)} />
          <label className="v2-attach">
            <input type="file" multiple onChange={(event) => addAttachments(event.target.files)} />
            <Paperclip size={18} />
            <span><strong>Attach image, screenshot, or file</strong><small>PDF, DOCX, PPTX, TXT, JPG, PNG. Images are read with OCR during generation.</small></span>
          </label>
          {attachments.length > 0 && (
            <div className="v2-file-list">
              {attachments.map((file) => (
                <button key={file.id} onClick={() => removeAttachment(file.id)}>
                  <FileText size={14} /> {file.name} <X size={14} />
                </button>
              ))}
            </div>
          )}
          <div className="v2-field-grid">
            <V2ChipGroup label="Category" options={categories} value={category} onChange={setCategory} />
            <V2ChipGroup label="Tone" options={tones} value={tone} onChange={setTone} />
            <V2ChipGroup label="Target AI" options={models} value={model} onChange={setModel} />
            <V2ChipGroup label="Output Type" options={outputTypes} value={outputType} onChange={setOutputType} />
          </div>
          <div className="v2-actions">
            <button className="v2-btn primary" onClick={() => generatePrompt()} disabled={isGenerating}>
              <Sparkles size={17} /> {isGenerating ? "Generating..." : "Generate Prompt"}
            </button>
            <button className="v2-btn" onClick={() => savePrompt(prompt, narrative)}><Save size={17} />Save</button>
            <button className="v2-btn" onClick={() => copyText(prompt)}>{copied ? <Check size={17} /> : <Clipboard size={17} />}Copy</button>
          </div>
          {isGenerating && <V2GenerateLoader attachments={attachments} model={model} outputType={outputType} />}
          {warningMessage && <p className="v2-note warn">{warningMessage}</p>}
          {errorMessage && <p className="v2-note error">{errorMessage}</p>}
        </div>

        <V2ReadinessOutput
          prompt={prompt}
          metrics={metrics}
          generationStatus={generationStatus}
          generationSource={generationSource}
          generationModel={generationModel}
          copyText={copyText}
          savePrompt={savePrompt}
          exportFile={exportFile}
          narrative={narrative}
          exportStatus={exportStatus}
          isGenerating={isGenerating}
        />
      </section>
    </div>
  );
}

function V2GenerateLoader({ attachments, model, outputType }) {
  const steps = [
    ["Parse intent", "Role, audience, tone, and task boundaries"],
    [attachments.length ? "Read context" : "Scan context", attachments.length ? `${attachments.length} file(s) queued for extraction` : "No attachments, using narration only"],
    ["Route model", `${model} with fallback safety`],
    ["Build guardrails", `${outputType} format and constraints`],
    ["Package result", "Copy, save, and export targets"],
  ];

  return (
    <section className="v2-generate-loader" aria-live="polite">
      <div className="v2-loader-orb"><Sparkles size={20} /></div>
      <div className="v2-loader-main">
        <span className="v2-eyebrow">Live pipeline</span>
        <strong>Optimizing your prompt...</strong>
        <div className="v2-loader-bar"><i /></div>
      </div>
      <div className="v2-loader-steps">
        {steps.map(([title, body], index) => (
          <div key={title} style={{ "--delay": `${index * 0.18}s` }}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{title}</strong>
            <small>{body}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function V2ReadinessOutput({ prompt, metrics, generationStatus, generationSource, generationModel, copyText, savePrompt, exportFile, narrative, exportStatus, isGenerating }) {
  const [actionFeedback, setActionFeedback] = useState("");
  const confirmAction = (label, action) => {
    action();
    setActionFeedback(label);
    window.setTimeout(() => setActionFeedback(""), 1500);
  };

  return (
    <aside className="v2-output-stack">
      <div className="v2-card v2-readiness">
        <div className="v2-card-head">
          <div>
            <span className="v2-eyebrow">AI Readiness Console</span>
            <h2>PromptLab Intelligence</h2>
          </div>
          <Sparkles size={20} />
        </div>
        <div className="v2-score-row">
          <div className="v2-ring" style={{ "--score": `${metrics.score * 3.6}deg` }}><span>{metrics.score}</span></div>
          <div>
            <h3>Readiness Score</h3>
            <p>Structure, context, format, and constraints are checked before the prompt is used.</p>
          </div>
        </div>
        <V2Metric label="Clarity" value={metrics.clarity} />
        <V2Metric label="Context" value={metrics.context} />
        <V2Metric label="Output format" value={metrics.format} />
        <div className="v2-checklist">
          {["Intent parsed", "Guardrails active", "Export ready"].map((item, index) => (
            <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><small>Validated locally</small></div>
          ))}
        </div>
      </div>
      <div className="v2-card v2-output-card">
        <div className="v2-prompt-toolbar">
          <strong>Optimized Prompt</strong>
          <span>{statusLabel(generationStatus, generationSource)} · {generationModel}</span>
          {actionFeedback && <em>{actionFeedback}</em>}
          <button type="button" onClick={() => confirmAction("Copied", () => copyText(prompt))} title="Copy prompt" aria-label="Copy prompt">
            <Clipboard size={16} />
          </button>
          <button type="button" onClick={() => confirmAction("Saved", () => savePrompt(prompt, narrative))} title="Save prompt" aria-label="Save prompt">
            <Archive size={16} />
          </button>
        </div>
        <div className="v2-output-tabs">
          <button className="active">Optimized <em>v1</em></button>
          <button>Narration</button>
          <button>Schema</button>
        </div>
        <pre>{prompt}</pre>
        {isGenerating && (
          <div className="v2-stream-preview">
            <span>Streaming preview</span>
            <i />
            <i />
            <i />
          </div>
        )}
        <div className="v2-actions wrap">
          <button className="v2-btn" onClick={() => exportFile("docx", prompt, narrative)}><FileText size={16} />DOCX</button>
          <button className="v2-btn" onClick={() => exportFile("pptx", prompt, narrative)}><BookOpenText size={16} />PPTX</button>
          <span className="v2-small">{exportStatus || "Export saves the final prompt as a working file."}</span>
        </div>
      </div>
    </aside>
  );
}

function V2Optimizer({ optimizerResult, optimizerSource, isOptimizing, optimizerError, optimizerWarning, optimizePrompt, copyText, savePrompt, exportFile }) {
  const [rawPrompt, setRawPrompt] = useState("Make this prompt stronger for Instagram content about a milk coffee product.");
  const [mode, setMode] = useState("Clearer");
  const result = optimizerResult || buildLocalOptimizedPrompt(rawPrompt, mode, "Claude", "Professional");
  const beforeScore = scorePrompt(rawPrompt);
  const afterScore = scorePrompt(result);
  const summary = [
    ["Role", beforeScore.score > 60 ? "sharpened" : "added"],
    ["Context", `${Math.max(0, afterScore.context - beforeScore.context)} pt gain`],
    ["Format", "output schema locked"],
    ["Guardrail", "deliverable protected"],
    ["Tone", "more consistent"],
    ["Export", "DOCX ready"],
  ];
  return (
    <div className="v2-screen">
      <V2PageIntro eyebrow="Optimizer" title="Old prompts, refined into winning instructions." copy="Review before and after quality changes with a compact improvement summary." />
      <section className="v2-diff-grid">
        <div className="v2-card">
          <div className="v2-card-head"><h2>Input</h2><span className="v2-score-badge">{beforeScore.score}</span></div>
          <textarea className="v2-textarea" value={rawPrompt} onChange={(event) => setRawPrompt(event.target.value)} />
          <V2ChipGroup label="Mode Optimasi" options={optimizerModes} value={mode} onChange={setMode} />
          <div className="v2-actions">
            <button className="v2-btn primary" onClick={() => optimizePrompt(rawPrompt, mode)} disabled={isOptimizing}><Zap size={17} />{isOptimizing ? "Optimizing..." : "Optimize"}</button>
            <button className="v2-btn" onClick={() => copyText(rawPrompt)}><Clipboard size={17} />Copy original</button>
          </div>
          {optimizerWarning && <p className="v2-note warn">{optimizerWarning}</p>}
          {optimizerError && <p className="v2-note error">{optimizerError}</p>}
        </div>
        <div className="v2-card v2-output-card">
          <div className="v2-card-head"><div><h2>Optimized Result</h2><p>{optimizerSource}</p></div><span className="v2-score-badge hot">{afterScore.score}</span></div>
          <pre>{result}</pre>
          <div className="v2-actions wrap">
            <button className="v2-btn" onClick={() => copyText(result)}><Clipboard size={16} />Copy</button>
            <button className="v2-btn" onClick={() => savePrompt(result, rawPrompt)}><Save size={16} />Save</button>
            <button className="v2-btn" onClick={() => exportFile("docx", result, rawPrompt)}><FileText size={16} />DOCX</button>
          </div>
        </div>
      </section>
      <section className="v2-summary-grid">
        {summary.map(([label, value]) => <V2Stat key={label} label={label} value={value} detail="change summary" />)}
      </section>
    </div>
  );
}

function V2Templates({ setBuilderFromTemplate, search, setSearch }) {
  const [filter, setFilter] = useState("All");
  const options = ["All", ...new Set(templates.map((item) => item.category))];
  const filtered = templates.filter((item) => {
    const q = `${item.title} ${item.category} ${item.outputType} ${item.model} ${item.prompt}`.toLowerCase();
    return (filter === "All" || item.category === filter) && q.includes(search.toLowerCase());
  });
  return (
    <div className="v2-screen">
      <V2PageIntro eyebrow="Template Gallery" title="Featured prompts for serious output." copy="Fast filters for apps, reports, slides, content, coding, and visual prompts.">
        <div className="v2-hero-status"><span>Templates</span><strong>{filtered.length}</strong><small>ready to use</small></div>
      </V2PageIntro>
      <div className="v2-toolbar">
        <div className="v2-search wide"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates..." /></div>
        <div className="v2-chip-row">{options.map((item) => <button key={item} className={`v2-chip ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}</div>
      </div>
      <section className="v2-template-grid">
        {filtered.slice(0, 9).map((template) => (
          <button className="v2-template-card" key={template.title} onClick={() => setBuilderFromTemplate(template)}>
            <span>{template.category}</span>
            <strong>{template.title}</strong>
            <p>{template.prompt}</p>
            <small>{template.model} · {template.outputType}</small>
          </button>
        ))}
      </section>
    </div>
  );
}

function V2Library(props) {
  const {
    filteredLibrary, selectedLibrary, selectedLibraryId, setSelectedLibraryId, search, setSearch,
    updateLibraryItem, deleteLibraryItem, duplicateLibraryItem, copyText, setCompareA, setCompareB,
    setActive, setNarrative, setCategory, setOutputType, exportFile,
  } = props;
  const currentItem = filteredLibrary.find((item) => item.id === selectedLibraryId) || filteredLibrary[0] || selectedLibrary;
  const rows = filteredLibrary.slice(0, 8);
  const formatDate = (timestamp) => timestamp ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(timestamp) : "-";
  const useInBuilder = (item) => {
    setNarrative(item.content);
    if (categories.includes(item.tag)) setCategory(item.tag);
    if (outputTypes.includes(item.folder)) setOutputType(item.folder);
    setActive("Builder");
  };
  return (
    <div className="v2-screen">
      <V2PageIntro eyebrow="Library" title="Prompt archive that behaves like a workspace." copy="Search, edit, duplicate, export, and send prompts to Compare or Builder.">
        <div className="v2-hero-status"><span>Saved</span><strong>{filteredLibrary.length}</strong><small>prompts</small></div>
      </V2PageIntro>
      <section className="v2-stats-strip">
        <V2Stat label="Total" value={filteredLibrary.length} detail="stored prompts" />
        <V2Stat label="Categories" value={new Set(filteredLibrary.map((i) => i.tag)).size} detail="active tags" />
        <V2Stat label="Last updated" value={formatDate(currentItem?.updatedAt || currentItem?.createdAt)} detail={currentItem?.title || "-"} compact />
      </section>
      <section className="v2-library-grid">
        <div className="v2-card">
          <div className="v2-toolbar compact"><div className="v2-search wide"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search prompts..." /></div></div>
          <div className="v2-table">
            {rows.map((item) => (
              <button key={item.id} className={currentItem?.id === item.id ? "active" : ""} onClick={() => setSelectedLibraryId(item.id)}>
                <span>{item.title}<small>{item.tag} · {formatDate(item.updatedAt || item.createdAt)}</small></span>
                <em>{item.folder}</em>
              </button>
            ))}
          </div>
        </div>
        <div className="v2-card v2-editor">
          {currentItem ? (
            <>
              <label className="v2-label">Judul</label>
              <input className="v2-input" value={currentItem.title} onChange={(event) => updateLibraryItem(currentItem.id, { title: event.target.value })} />
              <div className="v2-two">
                <div><label className="v2-label">Folder</label><input className="v2-input" value={currentItem.folder} onChange={(event) => updateLibraryItem(currentItem.id, { folder: event.target.value })} /></div>
                <div><label className="v2-label">Tag</label><input className="v2-input" value={currentItem.tag} onChange={(event) => updateLibraryItem(currentItem.id, { tag: event.target.value })} /></div>
              </div>
              <label className="v2-label">Isi Prompt</label>
              <textarea className="v2-textarea" value={currentItem.content} onChange={(event) => updateLibraryItem(currentItem.id, { content: event.target.value })} />
              <div className="v2-actions wrap">
                <button className="v2-btn primary" onClick={() => useInBuilder(currentItem)}><PenLine size={16} />Use in Builder</button>
                <button className="v2-btn" onClick={() => copyText(currentItem.content)}><Clipboard size={16} />Copy</button>
                <button className="v2-btn" onClick={() => duplicateLibraryItem(currentItem)}><Plus size={16} />Duplicate</button>
                <button className="v2-btn" onClick={() => { setCompareA(currentItem.content); setActive("Compare"); }}><ArrowRightLeft size={16} />Compare A</button>
                <button className="v2-btn" onClick={() => { setCompareB(currentItem.content); setActive("Compare"); }}><ArrowRightLeft size={16} />Compare B</button>
                <button className="v2-btn" onClick={() => exportFile("docx", currentItem.content, currentItem.title)}><FileText size={16} />DOCX</button>
                <button className="v2-btn danger" onClick={() => deleteLibraryItem(currentItem.id)}><Trash2 size={16} />Delete</button>
              </div>
            </>
          ) : <p className="v2-small">No saved prompts yet.</p>}
        </div>
      </section>
    </div>
  );
}

function V2Compare({ compareA, setCompareA, compareB, setCompareB, setNarrative, savePrompt, copyText, setActive }) {
  const modelsToShow = ["ChatGPT", "Claude", "Gemini"];
  const prompts = [compareA, compareB].filter(Boolean);
  const basePrompt = prompts[0] || "Paste prompt di panel A/B untuk membandingkan kualitas instruksi.";
  const scoreA = scorePrompt(compareA || "");
  const scoreB = scorePrompt(compareB || "");
  const winnerPrompt = scoreA.score >= scoreB.score ? compareA : compareB;
  return (
    <div className="v2-screen">
      <V2PageIntro eyebrow="Compare Lab" title="Side-by-side model readiness matrix." copy="Three model cards, two prompt inputs, and a local score matrix to choose the strongest version." />
      <section className="v2-compare-grid">
        {modelsToShow.map((name, index) => {
          const score = Math.min(99, Math.max(42, scorePrompt(basePrompt).score + index * 3));
          return (
            <div className="v2-card v2-model-card" key={name}>
              <div className="v2-card-head"><h2>{name}</h2><span className="v2-score-badge">{score}</span></div>
              <p>{basePrompt.slice(0, 180)}{basePrompt.length > 180 ? "..." : ""}</p>
              <V2Metric label="Reasoning fit" value={score} />
              <V2Metric label="Format safety" value={Math.min(99, score + 4)} />
            </div>
          );
        })}
      </section>
      <section className="v2-diff-grid">
        <div className="v2-card">
          <div className="v2-card-head"><h2>Prompt A</h2><span className="v2-score-badge">{scoreA.score}</span></div>
          <textarea className="v2-textarea" value={compareA} onChange={(event) => setCompareA(event.target.value)} placeholder="Paste prompt A..." />
        </div>
        <div className="v2-card">
          <div className="v2-card-head"><h2>Prompt B</h2><span className="v2-score-badge hot">{scoreB.score}</span></div>
          <textarea className="v2-textarea" value={compareB} onChange={(event) => setCompareB(event.target.value)} placeholder="Paste prompt B..." />
        </div>
      </section>
      <div className="v2-card v2-score-matrix">
        <div><strong>Matrix</strong><span>A</span><span>B</span></div>
        {["Clarity", "Context", "Output format"].map((row) => (
          <div key={row}><strong>{row}</strong><span>{scoreA[row === "Clarity" ? "clarity" : row === "Context" ? "context" : "format"]}%</span><span>{scoreB[row === "Clarity" ? "clarity" : row === "Context" ? "context" : "format"]}%</span></div>
        ))}
        <div className="v2-actions wrap">
          <button className="v2-btn primary" disabled={!winnerPrompt?.trim()} onClick={() => { setNarrative(winnerPrompt); setActive("Builder"); }}><PenLine size={16} />Use winner</button>
          <button className="v2-btn" disabled={!winnerPrompt?.trim()} onClick={() => savePrompt(winnerPrompt, "Compare winner")}><Save size={16} />Save</button>
          <button className="v2-btn" disabled={!winnerPrompt?.trim()} onClick={() => copyText(winnerPrompt)}><Clipboard size={16} />Copy</button>
        </div>
      </div>
    </div>
  );
}

function V2Settings(props) {
  const {
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
  } = props;
  const fallbackModels = modelSettings.fallbackModels
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const providerReady = Boolean(settingsStatus?.ok && settingsStatus?.ai);
  const activeProfile = modeProfiles[generationMode] || modeProfiles.Balanced;
  const updateModelSetting = (key, value) => setModelSettings((settings) => ({ ...settings, [key]: value }));

  return (
    <div className="v2-screen v2-settings-screen">
      <V2PageIntro
        eyebrow="Model Command Center"
        title="Provider, endpoint, routing, and saved settings."
        copy="Configure the LLM stack used by PromptLab. Browser overrides are saved locally and sent to the backend during generation."
      >
        <div className="v2-hero-status">
          <span>Provider</span>
          <strong>{providerReady ? "Ready" : "Offline"}</strong>
          <small>{modelSettings.provider}</small>
        </div>
      </V2PageIntro>

      <section className="v2-settings-grid">
        <div className="v2-card v2-settings-card">
          <div className="v2-card-head">
            <div>
              <h2>Generation Mode</h2>
              <p>Choose how aggressively PromptLab waits before using fallback models.</p>
            </div>
            <span className={`v2-health ${providerReady ? "ready" : ""}`}>{providerReady ? "Ready" : "Offline"}</span>
          </div>
          <div className="v2-mode-grid">
            {generationModes.map((mode) => (
              <button key={mode} className={generationMode === mode ? "active" : ""} onClick={() => setGenerationMode(mode)}>
                <span>{mode}</span>
                <strong>{modeProfiles[mode].label}</strong>
                <small>{modeProfiles[mode].detail}</small>
              </button>
            ))}
          </div>
          <div className="v2-settings-summary">
            <span>Active Mode</span>
            <strong>{generationMode}</strong>
            <p>{activeProfile.bestFor}</p>
          </div>
          <div className="v2-info-grid">
            <V2Info label="API Base" value={apiBase || "Same-origin Vercel API"} />
            <V2Info label="Provider" value={settingsStatus?.provider || modelSettings.provider || "-"} />
            <V2Info label="Last Active Model" value={settingsStatus?.model || modelSettings.primaryModel || "-"} />
            <V2Info label="OCR Model" value={modelSettings.ocrModel || settingsStatus?.ocrModel || "-"} />
          </div>
        </div>

        <div className="v2-card v2-settings-card">
          <div className="v2-card-head">
            <div>
              <h2>Provider & Endpoint</h2>
              <p>Use Vercel env values by default, or override them from this browser.</p>
            </div>
            <button className="v2-btn" onClick={() => setModelSettings(defaultModelSettings)}>Reset</button>
          </div>
          <V2ChipGroup label="Provider" options={providerOptions} value={modelSettings.provider} onChange={(item) => updateModelSetting("provider", item)} />
          <label className="v2-label">Base URL / Endpoint</label>
          <input
            className="v2-input"
            value={modelSettings.baseUrl}
            onChange={(event) => updateModelSetting("baseUrl", event.target.value)}
            placeholder="https://openrouter.ai/api/v1"
          />
          <label className="v2-label">API Key Override, Optional</label>
          <input
            className="v2-input"
            type="password"
            value={modelSettings.apiKey}
            onChange={(event) => updateModelSetting("apiKey", event.target.value)}
            placeholder="Leave empty to use Vercel Environment Variables"
          />
          <p className="v2-small">If empty, the backend uses the API key from Vercel Environment Variables. If filled, the key is stored only in this browser.</p>
        </div>

        <div className="v2-card v2-settings-card">
          <div className="v2-card-head">
            <div>
              <h2>Model Routing</h2>
              <p>Primary model, OCR model, timeout, and fallback chain.</p>
            </div>
            <span className="v2-score-badge">{modelSettings.timeoutMs || "auto"} ms</span>
          </div>
          <label className="v2-label">Primary Model</label>
          <input className="v2-input" value={modelSettings.primaryModel} onChange={(event) => updateModelSetting("primaryModel", event.target.value)} />
          <label className="v2-label">OCR / Vision Model</label>
          <input className="v2-input" value={modelSettings.ocrModel} onChange={(event) => updateModelSetting("ocrModel", event.target.value)} />
          <label className="v2-label">Primary Timeout, ms</label>
          <input className="v2-input" value={modelSettings.timeoutMs} onChange={(event) => updateModelSetting("timeoutMs", event.target.value.replace(/[^\d]/g, ""))} />
          <label className="v2-label">Fallback Models, One Model Per Line</label>
          <textarea className="v2-textarea small" value={modelSettings.fallbackModels} onChange={(event) => updateModelSetting("fallbackModels", event.target.value)} />
        </div>

        <div className="v2-card v2-settings-card">
          <div className="v2-card-head">
            <div>
              <h2>Fallback Chain</h2>
              <p>PromptLab tries these models when the primary route fails or times out.</p>
            </div>
            <span className="v2-score-badge hot">{fallbackModels.length}</span>
          </div>
          <div className="v2-fallback-list">
            {(fallbackModels.length ? fallbackModels : ["No fallback models configured"]).map((modelName, index) => (
              <div key={`${modelName}-${index}`}>
                <span>{index + 1}</span>
                <strong>{modelName}</strong>
              </div>
            ))}
          </div>
          <div className="v2-actions wrap">
            <button className="v2-btn primary" onClick={saveModelSettings}><Save size={16} />Save Settings</button>
            <button className="v2-btn primary" onClick={testProvider} disabled={isTestingProvider}><Zap size={16} />{isTestingProvider ? "Testing..." : "Test Provider"}</button>
            <button className="v2-btn" onClick={refreshHealth}><Gauge size={16} />Health</button>
            <button className="v2-btn" onClick={() => navigator.clipboard?.writeText(apiBase).catch(() => {})}><Clipboard size={16} />Copy API Base</button>
          </div>
          {settingsSavedAt && <p className="v2-note">Settings last saved at {settingsSavedAt}</p>}
          {providerTestStatus && <p className="v2-note">{providerTestStatus}</p>}
        </div>

        <div className="v2-card v2-settings-card v2-runbook">
          <div className="v2-card-head">
            <div>
              <h2>Runbook</h2>
              <p>Quick checks when generation feels slow or fallback is used too often.</p>
            </div>
            <Settings size={20} />
          </div>
          {[
            "Use Patient Free for large files, OCR, or slow free models.",
            "If local fallback always appears, run Test Provider and check the backend.",
            "For production changes, update Vercel Environment Variables and redeploy.",
            "Increase primary timeout when a healthy primary model is being skipped too quickly.",
          ].map((item, index) => (
            <div className="v2-runbook-row" key={item}><span>{index + 1}</span><p>{item}</p></div>
          ))}
        </div>
      </section>
    </div>
  );
}

function V2Info({ label, value }) {
  return (
    <div className="v2-info">
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

function V2Stat({ label, value, detail, compact }) {
  return (
    <div className={`v2-stat ${compact ? "compact" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function V2ChipGroup({ label, options, value, onChange }) {
  return (
    <div className="v2-chip-group">
      <span>{label}</span>
      <div className="v2-chip-row">
        {options.map((option) => (
          <button key={option} className={`v2-chip ${value === option ? "active" : ""}`} onClick={() => onChange(option)}>{option}</button>
        ))}
      </div>
    </div>
  );
}

function V2Metric({ label, value }) {
  return (
    <div className="v2-metric">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <i><b style={{ width: `${value}%` }} /></i>
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
