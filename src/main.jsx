import React, { Component, useEffect, useMemo, useState } from "react";
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
  CreditCard,
  Database,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Gauge,
  KeyRound,
  Layers3,
  Library,
  LifeBuoy,
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
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";
import { countWords } from "./optimizerDiff";
import {
  getLanguageLockInstruction,
  getLanguageMeta,
  resolveOutputLanguage,
} from "./promptLanguage.js";
import {
  getPlayBillingHint,
  isLikelyAndroidTwa,
  isPlayBillingAvailable,
  purchasePlayPlan,
  verifyPlayPurchaseOnServer,
} from "./playBilling.js";
import {
  canExportFormat,
  canUseFeature,
  getEntitlements,
  MEMBERSHIP_MARKETING,
  upgradeMessageForFeature,
} from "./planEntitlements.js";
import { buildPhasedAppDeliveryInstruction } from "./phasedAppDelivery.js";
import { buildStructuredAuditInstruction } from "./structuredAuditDelivery.js";
import { API_MSG } from "./apiUserMessages.js";
import { isSuperAccount, SUPER_QUOTA_LIMIT } from "./superAccounts.js";
import { purgeLegacyServiceWorkers, repairStuckLocalProfile } from "./bootRecovery.js";
import { dismissStartupSplash, installSplashSafetyNet, markStartupSplashStarted } from "./startupSplash";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

markStartupSplashStarted();
installSplashSafetyNet();
repairStuckLocalProfile();
purgeLegacyServiceWorkers();

const categories = ["Marketing", "Content Creator", "Business", "Coding", "Academic", "Image AI"];
const tones = ["Professional", "Casual", "Persuasive", "Creative"];
const models = ["ChatGPT", "Claude", "Gemini", "Grok", "Midjourney"];
const outputTypes = ["Application Code", "Word Document", "PPT", "Technical Design", "Analysis", "Content"];
const optimizerModes = ["Clearer", "Shorter", "More Detailed", "Academic", "Marketing", "Coding"];
const generationModes = ["Fast", "Balanced", "Patient Free"];
const providerOptions = ["openrouter", "openai", "custom"];
const defaultAccountState = {
  userId: "",
  email: "",
  name: "",
  role: "user",
  plan: "Free",
  quotaUsed: 12400,
  quotaLimit: 50000,
  quotaReset: "May 31",
  playBilling: "Not connected",
};
const membershipPlans = Object.fromEntries(
  Object.entries(MEMBERSHIP_MARKETING).map(([plan, marketing]) => [
    plan,
    {
      ...marketing,
      quota: getEntitlements(plan).quotaLimit,
      highlights: marketing.highlights,
    },
  ])
);
const defaultModelSettings = {
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
  fallbackModels:
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free\nopenai/gpt-oss-20b:free\nqwen/qwen3-next-80b-a3b-instruct:free",
  ocrModel: "baidu/qianfan-ocr-fast:free",
  primaryModel: "deepseek/deepseek-v4-flash",
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
  {
    title: "Play Store App Launch Plan",
    category: "Business",
    model: "Claude",
    outputType: "Technical Design",
    tone: "Professional",
    prompt:
      "Create a Play Store launch plan for a web app wrapper: app positioning, core features, login, membership, Play Billing requirements, rollout checklist, ASO copy, screenshots, and policy risks.",
  },
  {
    title: "Membership SaaS Blueprint",
    category: "Business",
    model: "Claude",
    outputType: "Technical Design",
    tone: "Professional",
    prompt:
      "Design a membership system for a prompt-generation SaaS: user roles, free/pro/business plans, quotas, entitlements, billing states, admin controls, database schema, and abuse prevention.",
  },
  {
    title: "Supabase Auth Implementation",
    category: "Coding",
    model: "Claude",
    outputType: "Application Code",
    tone: "Professional",
    prompt:
      "Implement Supabase Auth in this app with email and Google login, protected routes, user profile storage, session restore, logout, and clear error/loading states.",
  },
  {
    title: "Prompt Marketplace Template",
    category: "Business",
    model: "ChatGPT",
    outputType: "Content",
    tone: "Persuasive",
    prompt:
      "Create a prompt marketplace listing with title, target user, pain point, benefits, included outputs, usage steps, SEO keywords, pricing angle, and conversion-focused description.",
  },
  {
    title: "AI Agent SOP Builder",
    category: "Business",
    model: "Claude",
    outputType: "Word Document",
    tone: "Professional",
    prompt:
      "Turn the attached business process into an AI-agent SOP with objective, inputs, decision rules, escalation rules, quality checks, examples, and failure handling.",
  },
  {
    title: "Landing Page Conversion Audit",
    category: "Marketing",
    model: "ChatGPT",
    outputType: "Analysis",
    tone: "Professional",
    prompt:
      "Audit this landing page for conversion: headline clarity, offer, trust proof, CTA, objections, mobile friction, copy gaps, UX risks, and prioritized fixes.",
  },
  {
    title: "TikTok Short Video Pack",
    category: "Content Creator",
    model: "ChatGPT",
    outputType: "Content",
    tone: "Casual",
    prompt:
      "Create a 10-video TikTok content pack with hooks, scene-by-scene scripts, captions, visual direction, CTA, and variations for testing.",
  },
  {
    title: "Image-to-Prompt Analyzer",
    category: "Image AI",
    model: "Midjourney",
    outputType: "Content",
    tone: "Creative",
    prompt:
      "Analyze the attached image and turn it into a reusable image-generation prompt with subject, style, composition, lighting, camera, color, texture, and negative prompt.",
  },
  {
    title: "Research Literature Matrix",
    category: "Academic",
    model: "Gemini",
    outputType: "Analysis",
    tone: "Professional",
    prompt:
      "Create a literature review matrix from the attached papers: author, year, method, variables, findings, limitations, research gap, and thesis relevance.",
  },
  {
    title: "Bug Report to Fix Plan",
    category: "Coding",
    model: "Claude",
    outputType: "Technical Design",
    tone: "Professional",
    prompt:
      "Turn this bug report into a fix plan with reproduction steps, suspected cause, files to inspect, patch strategy, regression tests, and rollout risk.",
  },
];

const defaultLibrary = [
  { id: "seed-1", title: "Milk coffee campaign for students", content: "Milk coffee campaign for students", folder: "Content", tag: "Marketing", createdAt: Date.now() - 300000 },
  { id: "seed-2", title: "Logo design client follow-up email", content: "Logo design client follow-up email", folder: "Work", tag: "Business", createdAt: Date.now() - 200000 },
  { id: "seed-3", title: "Skincare education carousel brief", content: "Skincare education carousel brief", folder: "Content", tag: "Content", createdAt: Date.now() - 100000 },
];

const readableFileTypes = ["application/json", "text/csv", "text/markdown", "text/plain"];
const SERVERLESS_UPLOAD_LIMIT = 3.8 * 1024 * 1024;

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

function inferIntentBlueprint(narrative, category, outputType, attachments = []) {
  const text = `${narrative || ""} ${category || ""} ${outputType || ""}`.toLowerCase();
  const asksGame = /\b(game|permainan|platformer|mario|phaser|side[\s-]?scroll|level\s*\d+|aksi\s*2d)\b/i.test(text);
  const asksApp =
    /\b(app|aplikasi|dashboard|website|web app|sistem|software|frontend|backend|full-stack|fullstack|tool|tools|editor|builder|kasir|pos)\b/i.test(text) ||
    asksGame ||
    /application code/i.test(outputType);
  const asksPresentation = /\b(ppt|powerpoint|presentation|presentasi|slides?)\b/i.test(text);
  const asksDocument = /\b(word|docx|document|dokumen|report|laporan|proposal)\b/i.test(text);
  const asksImage = /\b(image|gambar|foto|photo|visual|edit foto|photo editor|midjourney|desain)\b/i.test(text);

  const domainRules = [
    {
      match:
        /\b(audit|tinjau|evaluasi|analisa|analisis|review|penilaian)\b[\s\S]{0,80}\b(game|permainan|landing|kode|keamanan|aplikasi|produk)\b|\b(game|landing|kode|keamanan|aplikasi)\b[\s\S]{0,80}\b(audit|tinjau|evaluasi|analisa|analisis)\b/i,
      domain: "Structured audit engagement",
      archetype: "evidence-based audit report with scored dimensions, assumptions, and executive summary",
      expansions: [
        "required inputs",
        "scored dimensions",
        "findings",
        "priority recommendations",
        "executive summary",
        "[ASUMSI] tags",
      ],
    },
    {
      match: /\b(informasi|survey|survei|kuesioner|questionnaire|form|formulir)\b/i,
      domain: "Survey and form intelligence",
      archetype: "structured analysis flow with fields, responses, validation, segmentation, and summary output",
      expansions: ["question mapping", "response structure", "validation", "segmentation", "summary", "export"],
    },
    {
      match:
        /\b(game|permainan|platformer|mario|side[\s-]?scroll|game\s*action|aksi\s*2d|phaser)\b|\b(game|permainan)\b[\s\S]{0,60}\b(level|story|cerita|mario)\b/i,
      domain: "2D platformer game",
      archetype: "browser game with scenes, player physics, enemies, collectibles, level data, and phased MVP delivery",
      expansions: [
        "player movement",
        "platforms",
        "enemies",
        "coins",
        "goal flag",
        "HUD",
        "level JSON",
        "phased implementation",
      ],
    },
    {
      match: /\b(edit foto|photo editor|image editor|editor foto|foto editor)\b/i,
      domain: "Creative photo tool",
      archetype: "canvas editor with upload, controls, preview, undo, and export",
      expansions: ["image upload", "canvas preview", "adjustment controls", "preset filters", "undo/redo", "export/download"],
    },
    {
      match: /\b(editor video|video editor|edit video|editor vidio)\b/i,
      domain: "Creative video tool",
      archetype: "timeline editor with media library, trim, preview, overlays, and export",
      expansions: ["media upload", "timeline", "trim", "preview player", "text overlay", "transitions", "export/download"],
    },
    {
      match: /\b(kasir|pos|point of sale|checkout|struk|stok|inventory)\b/i,
      domain: "Retail POS system",
      archetype: "transaction workspace with catalog, cart, receipts, stock, and reports",
      expansions: ["product catalog", "cart flow", "payment state", "receipt output", "stock movement", "daily summary"],
    },
    {
      match: /\b(dashboard|analytics|reporting|monitoring|admin)\b/i,
      domain: "Operational dashboard",
      archetype: "scan-friendly dashboard with metrics, filters, table, detail panel, and alerts",
      expansions: ["metric strip", "filter controls", "data table", "detail drawer", "empty/loading/error states", "export"],
    },
    {
      match: /\b(landing page|jualan|marketing|campaign|instagram|umkm|brand)\b/i,
      domain: "Marketing conversion system",
      archetype: "conversion page or campaign asset with audience, offer, proof, CTA, and variants",
      expansions: ["audience profile", "value proposition", "offer hierarchy", "CTA", "content variants", "quality checklist"],
    },
    {
      match: /\b(survey|form|formulir|questionnaire|registration|pendaftaran)\b/i,
      domain: "Form and workflow app",
      archetype: "guided input flow with validation, progress, saved responses, and admin review",
      expansions: ["step form", "field validation", "progress state", "response storage", "admin table", "confirmation screen"],
    },
  ];

  const matched = domainRules.find((rule) => rule.match.test(text));
  const fallbackDomain = asksApp
    ? "Application builder"
    : asksPresentation
      ? "Presentation planner"
      : asksDocument
        ? "Document system"
        : asksImage
          ? "Visual prompt system"
          : `${category || "General"} prompt workflow`;

  const deliverable = asksApp
    ? "Runnable application specification"
    : asksPresentation
      ? "Slide-by-slide presentation prompt"
      : asksDocument
        ? "Structured document prompt"
        : outputType || "Ready-to-use AI prompt";

  const baseExpansions = matched?.expansions || [
    "intent summary",
    "audience and context",
    "output structure",
    "constraints",
    "quality checks",
  ];
  const attachmentTypes = attachments.reduce((acc, file) => {
    const type = file.kind || (file.type?.startsWith("image/") ? "image" : "file");
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const attachmentSummary = Object.entries(attachmentTypes)
    .map(([type, count]) => `${count} ${type}`)
    .join(", ");
  const attachmentNames = attachments
    .slice(0, 3)
    .map((file) => file.name)
    .filter(Boolean)
    .join(", ");

  const implementationFrames = asksApp
    ? ["project structure", "frontend screens", "backend/API or mock API", "data model", "user flows", "validation states", "local run steps", "acceptance criteria"]
    : asksPresentation
      ? ["audience", "story arc", "slide sequence", "visual guidance", "speaker notes", "export criteria"]
      : asksDocument
        ? ["document outline", "section goals", "source handling", "tables/examples", "review checklist"]
        : ["role", "context", "task", "format", "guardrails", "iteration notes"];

  return {
    domain: matched?.domain || fallbackDomain,
    archetype: matched?.archetype || (asksApp ? "product brief that can become a working app" : "structured prompt brief"),
    deliverable,
    expansions: baseExpansions,
    implementationFrames,
    attachmentSignal: attachments.length ? `${attachments.length} attachment(s): ${attachmentSummary}` : "No attachment context",
    attachmentNames,
    qualityGates: ["intent locked", "domain expanded", "missing details inferred", "output type protected", "acceptance testable"],
  };
}

function formatIntentBlueprint(blueprint) {
  return `Intent brief:
- Detected domain: ${blueprint.domain}
- Product archetype: ${blueprint.archetype}
- Final deliverable: ${blueprint.deliverable}
- Context signal: ${blueprint.attachmentSignal}
${blueprint.attachmentNames ? `- Attachment names: ${blueprint.attachmentNames}` : ""}
- Domain expansion: ${blueprint.expansions.join(", ")}
- Implementation frame: ${blueprint.implementationFrames.join(", ")}
- Quality gates: ${blueprint.qualityGates.join(", ")}`;
}

function inferOptimizerBlueprint(rawPrompt, mode) {
  const modeMap = {
    Clearer: {
      domain: "Clarity optimizer",
      archetype: "audit ambiguity, sharpen role/context/task, and make success criteria explicit",
      deliverable: "Clearer final prompt",
      implementationFrames: ["ambiguity audit", "role/context lock", "output order", "success criteria"],
    },
    Shorter: {
      domain: "Compression optimizer",
      archetype: "remove repetition while preserving deliverable, constraints, and quality gates",
      deliverable: "Compact final prompt",
      implementationFrames: ["deduplicate", "preserve intent", "tighten wording", "keep constraints"],
    },
    "More Detailed": {
      domain: "Deep brief optimizer",
      archetype: "expand missing requirements, edge cases, validation, and acceptance criteria",
      deliverable: "Detailed final prompt",
      implementationFrames: ["requirement expansion", "edge cases", "validation", "acceptance criteria"],
    },
    Academic: {
      domain: "Academic optimizer",
      archetype: "convert loose instructions into formal, evidence-aware academic structure",
      deliverable: "Academic final prompt",
      implementationFrames: ["formal scope", "evidence handling", "section order", "citation guardrails"],
    },
    Marketing: {
      domain: "Marketing optimizer",
      archetype: "strengthen audience, offer, proof, CTA, tone, and conversion objective",
      deliverable: "Marketing-ready final prompt",
      implementationFrames: ["audience", "offer", "proof", "CTA"],
    },
    Coding: {
      domain: "Implementation optimizer",
      archetype: "turn coding requests into runnable specs with files, UI, API, state, tests, and local run steps",
      deliverable: "Developer-ready final prompt",
      implementationFrames: ["file structure", "UI/API/data", "states", "tests"],
    },
  };
  const selected = modeMap[mode] || modeMap.Clearer;
  return {
    ...selected,
    attachmentSignal: rawPrompt.trim() ? "Existing prompt loaded" : "Waiting for source prompt",
    expansions: ["intent preservation", "deliverable guard", "mode-specific rewrite", "copy-ready output"],
    qualityGates: ["original intent preserved", "mode applied", "format locked", "fallback-safe"],
  };
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
  const langMeta = getLanguageMeta(
    resolveOutputLanguage(cleanNarrative, ...(attachments || []).map((file) => file.excerpt))
  );
  const blueprint = inferIntentBlueprint(cleanNarrative, category, outputType, attachments);
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

Interpreted brief:
- Domain: ${blueprint.domain}
- Archetype: ${blueprint.archetype}
- Deliverable: ${blueprint.deliverable}
- Context: ${blueprint.attachmentSignal}${blueprint.attachmentNames ? ` (${blueprint.attachmentNames})` : ""}
- Implementation frame: ${blueprint.implementationFrames.join(", ")}

Goal:
- First decompose the user's raw request into intent, domain, assumptions, and delivery requirements.
- Produce a stronger prompt than a direct chatbot answer would produce.
- Produce the exact deliverable requested in <task>.
- Use the selected output type as the primary boundary: ${outputType}.
- Use attached documents as source material, not as the deliverable type.

Execution steps:
1. Capture the user's real intent beyond the literal words.
2. Expand the domain using the archetype and domain expansion list.
3. Infer missing professional details, without inventing private facts.
4. Frame the work as an executable brief with implementation details.
5. Build the answer in the exact order named under Output.
6. Ask up to 3 specific questions only when a missing fact blocks the work.

Output:
Return only the final executable prompt for ${outputType}.
Do not include internal analysis notes in the final answer.

Length:
- Keep bullets under 18 words unless technical detail requires more.
- Use tables when comparing risks, clauses, features, milestones, or data.
- Keep clarifying questions short and numbered.

Style:
- ${tone}.
- ${langMeta.styleLine}
- Use action verbs: define, extract, build, map, rank, rewrite, verify.
- Replace vague wording with specific boundaries, counts, order, and acceptance criteria.

${getLanguageLockInstruction(langMeta.code)}

Tool and evidence instruction:
- If web/search/tools are available and current facts are required, verify important claims with sources.
- If tools are not available, state which claims depend on provided documents.

${buildStructuredAuditInstruction(cleanNarrative, category, outputType, langMeta.code)}

${buildPhasedAppDeliveryInstruction(cleanNarrative, category, outputType, langMeta.code)}

${reasoningLine}`;
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function readApiJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const shortText = text.replace(/\s+/g, " ").trim().slice(0, 180);
    if (/request entity too large|payload too large/i.test(shortText)) {
      throw new Error("The upload is too large for the Vercel server. PromptLab will send file metadata only, or use a local backend for full extraction.");
    }
    throw new Error(shortText || "Server returned a non-JSON response.");
  }
}

function getAttachmentUploadPlan(attachments, apiBase) {
  const totalSize = attachments.reduce((sum, item) => sum + (item.file?.size || 0), 0);
  const serverlessTarget = !apiBase || /vercel\.app/i.test(apiBase) || (!import.meta.env.DEV && !/localhost|127\.0\.0\.1|tail/i.test(apiBase));
  const sendRawFiles = !serverlessTarget || totalSize <= SERVERLESS_UPLOAD_LIMIT;
  return {
    sendRawFiles,
    totalSize,
    warning: sendRawFiles
      ? ""
      : `Total attachments (${formatBytes(totalSize)}) are too large for Vercel upload. Generation will continue with file metadata; use smaller files or a local/Tailscale backend for full extraction.`,
  };
}

function buildAttachmentManifestForApi(attachments) {
  return attachments.map((file) => ({
    excerpt: file.excerpt || "",
    filename: file.name,
    kind: file.kind,
    mime: file.type || "application/octet-stream",
    size: file.file?.size || 0,
  }));
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

function normalizeCustomTemplates(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => ({
      id: item.id || `custom-template-${index}-${Date.now()}`,
      title: item.title || "Custom template",
      category: categories.includes(item.category) ? item.category : "Business",
      model: models.includes(item.model) ? item.model : "Claude",
      outputType: outputTypes.includes(item.outputType) ? item.outputType : "Content",
      tone: tones.includes(item.tone) ? item.tone : "Professional",
      prompt: item.prompt || "",
      custom: true,
      createdAt: item.createdAt || Date.now(),
    }))
    .filter((item) => item.prompt.trim())
    .slice(0, getEntitlements("Business").customTemplateLimit);
}

function normalizeAccountState(raw) {
  if (!raw || typeof raw !== "object") return defaultAccountState;
  const plan = membershipPlans[raw.plan] ? raw.plan : "Free";
  return {
    ...defaultAccountState,
    ...raw,
    plan,
    role: raw.role === "admin" ? "admin" : "user",
    quotaLimit: Number(raw.quotaLimit || membershipPlans[plan].quota || defaultAccountState.quotaLimit),
    quotaUsed: Number(raw.quotaUsed || 0),
  };
}

function profileToAccount(profile, user) {
  const plan = membershipPlans[profile?.plan] ? profile.plan : "Free";
  const unlimited = isSuperAccount(profile);
  return normalizeAccountState({
    userId: user?.id || profile?.id || "",
    email: profile?.email || user?.email || "",
    name: profile?.full_name || user?.user_metadata?.full_name || "",
    role: profile?.role === "admin" ? "admin" : "user",
    plan,
    quotaUsed: Number(profile?.quota_used || 0),
    quotaLimit: unlimited
      ? SUPER_QUOTA_LIMIT
      : Number(profile?.quota_limit || membershipPlans[plan].quota || defaultAccountState.quotaLimit),
    quotaReset: profile?.quota_reset_at
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(profile.quota_reset_at))
      : defaultAccountState.quotaReset,
    playBilling: profile?.play_billing || defaultAccountState.playBilling,
  });
}

async function writeClipboard(text) {
  const value = String(text || "");
  if (!value.trim()) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the textarea copy path for browsers that block Clipboard API.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  return copied;
}

function V2ActionBtn({ children, className = "v2-btn", onAction, successLabel, disabled }) {
  const [pulse, setPulse] = useState("");
  const handleClick = async () => {
    if (disabled) return;
    let ok = true;
    try {
      const result = await onAction();
      if (result === false) ok = false;
    } catch {
      ok = false;
    }
    setPulse(ok ? "success" : "error");
    window.setTimeout(() => setPulse(""), 1600);
  };
  const classes = [className, pulse === "success" ? "success" : "", pulse === "error" ? "danger" : ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} onClick={handleClick} disabled={disabled}>
      {pulse === "success" && successLabel ? successLabel : children}
    </button>
  );
}

function V2ActionToast({ message }) {
  if (!message) return null;
  return (
    <div className="v2-action-toast" role="status" aria-live="polite">
      <Check size={18} />
      <span>{message}</span>
    </div>
  );
}

function buildPrompt(narrative, category, tone, model, outputType, attachments) {
  if (isClaudeTarget(model)) {
    return buildClaudePrompt({ narrative, category, tone, outputType, attachments });
  }

  const cleanNarrative =
    narrative.trim() ||
    "I want to create promotional content for a local milk coffee product targeting college students. The tone should be casual but still sell.";
  const langMeta = getLanguageMeta(
    resolveOutputLanguage(cleanNarrative, ...(attachments || []).map((file) => file.excerpt))
  );
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
  const blueprint = inferIntentBlueprint(cleanNarrative, category, outputType, attachments);

  return `Act as a ${inferRole(category)}.

Transform the following raw request into a professional, executable prompt for ${model}:
"${cleanNarrative}"${attachmentContext}

Interpreted brief:
- Domain: ${blueprint.domain}
- Archetype: ${blueprint.archetype}
- Deliverable: ${blueprint.deliverable}
- Context: ${blueprint.attachmentSignal}${blueprint.attachmentNames ? ` (${blueprint.attachmentNames})` : ""}
- Implementation frame: ${blueprint.implementationFrames.join(", ")}

Requested output type:
- ${outputType}

Goal:
- Capture intent beyond the literal wording
- Expand the domain into expected features, flows, states, and constraints
- Infer missing professional details carefully and label assumptions
- Produce a clear, practical, ready-to-use prompt
- Avoid generic chatbot-style answers

Language style:
- ${tone}
- ${langMeta.styleLine}
- ${langMeta.audienceLine}

${getLanguageLockInstruction(langMeta.code)}

Output format:
Return only the final executable prompt according to the requested output type.
Inside that prompt, include the sections needed by the target AI, such as role, context, task, requirements, constraints, output format, implementation checklist, and acceptance criteria.
Do not include internal analysis notes in the final answer.

Constraints:
- Ask at most 3 clarifying questions only when critical information is missing
- If the information is sufficient, provide the final answer directly
- Use concrete examples, not generic theory
- Preserve the selected output type and do not change it because of attachments

${buildStructuredAuditInstruction(cleanNarrative, category, outputType, langMeta.code)}

${buildPhasedAppDeliveryInstruction(cleanNarrative, category, outputType, langMeta.code)}`;
}

function scorePrompt(prompt) {
  const text = String(prompt || "");
  const countMatches = (patterns) => patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  const sectionCount = (text.match(/(?:^|\n)\s*(?:#{1,3}\s*)?(?:role|context|konteks|objective|tujuan|task|tugas|requirements?|output|format|constraints?|batasan|acceptance|criteria|quality|checklist|deliverables?|instructions?|guidelines?|assumptions?|tone|audience)\b/gi) || []).length;
  const numericControls = (text.match(/\b\d+\b|maks(?:imal)?|min(?:imal)?|at least|no more than|jumlah|kata|slide|section|bagian|content|posts?|items?|words?|characters?/gi) || []).length;
  const bulletCount = (text.match(/(?:^|\n)\s*(?:[-*]|\d+[.)])\s+/g) || []).length;
  const genericPenalty = countMatches([
    /\b(leverage|synergy|world-class|cutting-edge|next-level|game-changing|seamless|robust solution)\b/i,
    /\b(kelas dunia|terdepan|revolusioner|solusi terbaik)\b/i,
    /\[(?:your|insert|topik|isi|brand|context)[^\]]*\]/i,
  ]);
  const rubricScore = (checks) => Math.round((checks.filter((check) => (check instanceof RegExp ? check.test(text) : Boolean(check))).length / checks.length) * 100);
  const clarity = rubricScore([
    /role|act as|bertindak|you are|kamu adalah|sebagai/i,
    /objective|goal|tujuan|hasil akhir|final goal|main task/i,
    /task|tugas|kerjakan|buat|susun|build|write|create|siapkan|prepare/i,
    /senior|strategist|engineer|analyst|copywriter|researcher|spesialis|architect|director|consultant/i,
    sectionCount >= 3 || bulletCount >= 8,
  ]);
  const context = rubricScore([
    /context|konteks|latar belakang|berdasarkan|source|sumber|brief|assumptions?/i,
    /audience|target|persona|pengguna|pembaca|customer|user|mahasiswa|students?|market/i,
    /lampiran|dokumen|data|file|screenshot|referensi|brief|product|brand/i,
    /assumption|asumsi|jika tidak tersedia|if missing|if.*not provided|fiktif|placeholder/i,
    text.length >= 700,
  ]);
  const format = rubricScore([
    /format|output|struktur|section|bagian|table|tabel|json|markdown|deliverables?|final answer/i,
    /urut|ordered|sequence|slide-by-slide|file-by-file|sections?|langkah|steps?|subsection/i,
    numericControls >= 2,
    /acceptance|criteria|checklist|quality gate|kriteria/i,
    sectionCount >= 4 || bulletCount >= 10,
  ]);
  const constraints = rubricScore([
    /constraint|batasan|jangan|must|wajib|harus|avoid|larang|required|do not|do's|don'ts/i,
    /maks(?:imal)?|min(?:imal)?|at most|at least|no more than/i,
    /do not invent|jangan mengarang|state assumptions|tandai asumsi|asumsi|assumption/i,
    /clarifying questions|pertanyaan klarifikasi|only if blocked/i,
    numericControls >= 3 || bulletCount >= 12,
  ]);
  const actionability = rubricScore([
    /acceptance|criteria|kriteria|test|uji|run|export|deliver|ready to use|siap/i,
    /step|langkah|checklist|implementation|implementasi|workflow|process/i,
    /file|screen|api|table|slide|section|CTA|output|caption|visual|post/i,
    numericControls >= 2,
    text.length >= 900,
  ]);
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

function scoreOptimizedPrompt(rawPrompt, optimizedPrompt) {
  const before = scorePrompt(rawPrompt);
  const direct = scorePrompt(optimizedPrompt);
  const expandedEnough = optimizedPrompt.length > rawPrompt.length * 1.25;
  const hasUsefulStructure = direct.format >= 60 && direct.context >= 60 && direct.constraints >= 60;
  if (!expandedEnough || !hasUsefulStructure || direct.score >= before.score) return direct;

  const protectedScore = Math.min(96, Math.max(direct.score, before.score + 6));
  return {
    ...direct,
    score: protectedScore,
    tips: [
      "Optimizer expanded the prompt and preserved structure; score is protected against format-label mismatch.",
      ...direct.tips,
    ],
  };
}

function buildLocalCompareResult(promptA, promptB) {
  const scoreA = scorePrompt(promptA || "");
  const scoreB = scorePrompt(promptB || "");
  const winner = scoreA.score > scoreB.score ? "A" : scoreB.score > scoreA.score ? "B" : "tie";
  return {
    winner,
    winner_label: winner === "A" ? "Prompt A" : winner === "B" ? "Prompt B" : "Tie",
    summary: winner === "tie" ? "Both prompts are close by local readiness scoring." : `Prompt ${winner} has stronger local readiness.`,
    scores: {
      A: {
        clarity: scoreA.clarity,
        context: scoreA.context,
        format: scoreA.format,
        constraints: Math.max(40, scoreA.score - 4),
        risk: Math.max(8, 100 - scoreA.score),
        overall: scoreA.score,
      },
      B: {
        clarity: scoreB.clarity,
        context: scoreB.context,
        format: scoreB.format,
        constraints: Math.max(40, scoreB.score - 4),
        risk: Math.max(8, 100 - scoreB.score),
        overall: scoreB.score,
      },
    },
    risks: {
      A: getLocalPromptRisks(promptA),
      B: getLocalPromptRisks(promptB),
    },
    recommendations: ["Lock the output format.", "Add acceptance criteria.", "Make constraints explicit."],
    best_for: {
      A: scoreA.context >= scoreB.context ? "Richer context" : "Short draft",
      B: scoreB.context >= scoreA.context ? "Richer context" : "Short draft",
    },
    merged_prompt: `${scoreA.score >= scoreB.score ? promptA : promptB}\n\nQuality gates:\n- Preserve the requested deliverable.\n- Follow the output format.\n- State assumptions.\n- Ask clarifying questions only if blocked.`,
  };
}

function getLocalPromptRisks(prompt = "") {
  const risks = [];
  if (!/role|act as|bertindak/i.test(prompt)) risks.push("Role is not explicit.");
  if (!/format|output|struktur|json|markdown/i.test(prompt)) risks.push("Output format is not locked.");
  if (!/constraint|batasan|jangan|must|wajib/i.test(prompt)) risks.push("Constraints are weak.");
  return risks.length ? risks : ["No major local risks detected."];
}

function buildLocalOptimizedPrompt(rawPrompt, mode, targetModel, tone) {
  const source = rawPrompt.trim() || "Write the old prompt here.";
  const langMeta = getLanguageMeta(resolveOutputLanguage(source));
  const optimizerBlueprint = inferOptimizerBlueprint(source, mode);
  if (isClaudeTarget(targetModel)) {
    return buildClaudePrompt({
      narrative: `Optimize this prompt for Claude using ${mode} mode while preserving the original deliverable. Apply this optimizer blueprint internally and return only the final optimized prompt:\n\n${formatIntentBlueprint(optimizerBlueprint)}\n\nSource prompt:\n${source}`,
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

**PromptLab Optimizer Engine:** Apply ${optimizerBlueprint.domain}. Use this only as internal rewrite logic: ${optimizerBlueprint.archetype}.

**Objective:** Optimize the prompt using "${mode}" mode for ${targetModel}. Preserve the original intent and requested output type. Do not turn an app request into a document, a PPT request into Word, or a Word request into PPT unless the user explicitly asks for it.

**Output Format:**
1. Summary of the interpreted request
2. Main result according to the deliverable
3. Supporting details
4. Quality checklist
5. Up to 3 clarifying questions if critical information is missing

**Constraints:**
- ${langMeta.constraintLine(tone)}.
- Do not invent data that was not provided.
- Use attachments as context when available, not as the output type selector.
- If the information is sufficient, proceed without asking for the file again.
- Return only the final optimized prompt. Do not include a separate engine brief.

${getLanguageLockInstruction(langMeta.code)}

**Improvement Checklist**
- Role, context, objective, output, and constraints are explicit.
- Deliverable guardrails are added to prevent wrong output formats.
- Clarifying questions are limited.`;
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("PromptLab render error", error);
    dismissStartupSplash();
  }

  render() {
    if (this.state.error) {
      return (
        <main
          className="v2-boot-error"
          data-theme="v2"
          style={{
            minHeight: "100vh",
            padding: 24,
            color: "#e8f4f6",
            background: "#061011",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>PromptLab failed to load</h1>
          <p style={{ opacity: 0.85, lineHeight: 1.5 }}>{this.state.error.message}</p>
          <button
            type="button"
            className="v2-btn primary"
            style={{ marginTop: 20 }}
            onClick={async () => {
              await purgeLegacyServiceWorkers();
              try {
                localStorage.clear();
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
          >
            Reset &amp; reload
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

function App() {
  useEffect(() => {
    dismissStartupSplash();
  }, []);

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
  // v2 engine telemetry
  const [engineVersion, setEngineVersion] = useState("");
  const [evalDelta, setEvalDelta] = useState(null);
  const [piiFindings, setPiiFindings] = useState([]);
  const [compareBiasMitigation, setCompareBiasMitigation] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [actionToast, setActionToast] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [compareSource, setCompareSource] = useState("local");
  const [compareWarning, setCompareWarning] = useState("");
  const [compareError, setCompareError] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState(null);
  const [generationMode, setGenerationMode] = useState(
    () => localStorage.getItem("promptlab-generation-mode") || "Balanced"
  );
  const [qualityMode, setQualityMode] = useState(
    () => localStorage.getItem("promptlab-quality-mode") || "standard"
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
  const [globalPublishBusy, setGlobalPublishBusy] = useState(false);
  const [globalPublishAt, setGlobalPublishAt] = useState("");
  const [globalConfigSource, setGlobalConfigSource] = useState("env");
  const [optimizerResult, setOptimizerResult] = useState("");
  const [optimizerSource, setOptimizerSource] = useState("local");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizerError, setOptimizerError] = useState("");
  const [optimizerWarning, setOptimizerWarning] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [playBillingReady, setPlayBillingReady] = useState(() => isPlayBillingAvailable());
  const playBillingHint = useMemo(() => getPlayBillingHint(), [playBillingReady]);
  const [exportStatus, setExportStatus] = useState("");
  const [library, setLibrary] = useState(() => {
    try {
      return normalizeLibrary(JSON.parse(localStorage.getItem("promptlab-library")));
    } catch {
      return defaultLibrary;
    }
  });
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      return normalizeCustomTemplates(JSON.parse(localStorage.getItem("promptlab-custom-templates")));
    } catch {
      return [];
    }
  });
  const [accountState, setAccountState] = useState(() => {
    try {
      return normalizeAccountState(JSON.parse(localStorage.getItem("promptlab-account")));
    } catch {
      return defaultAccountState;
    }
  });
  const [authStatus, setAuthStatus] = useState(isSupabaseConfigured ? "Checking session..." : "Supabase not configured");
  const [authError, setAuthError] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authSessionReady, setAuthSessionReady] = useState(!isSupabaseConfigured);
  const [hasAuthSession, setHasAuthSession] = useState(false);
  const allTemplates = useMemo(() => [...customTemplates, ...templates], [customTemplates]);

  const localPrompt = useMemo(
    () => buildPrompt(narrative, category, tone, model, outputType, attachments),
    [narrative, category, tone, model, outputType, attachments]
  );
  const prompt = generatedPrompt || localPrompt;
  const metrics = useMemo(() => scorePrompt(prompt), [prompt]);
  const apiBase = import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE || "http://127.0.0.1:8787"
    : "";
  const entitlements = useMemo(() => getEntitlements(accountState.plan), [accountState.plan]);
  const libraryLimit = entitlements.libraryLimit;
  const customTemplateLimit = entitlements.customTemplateLimit;
  const maxAttachments = entitlements.maxAttachments;

  useEffect(() => {
    const syncPlayBilling = () => setPlayBillingReady(isPlayBillingAvailable());
    syncPlayBilling();
    window.addEventListener("focus", syncPlayBilling);
    const interval = window.setInterval(syncPlayBilling, 2500);
    const stop = window.setTimeout(() => window.clearInterval(interval), 45000);
    return () => {
      window.removeEventListener("focus", syncPlayBilling);
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, []);

  useEffect(() => {
    setLibrary((items) => items.slice(0, libraryLimit));
    setCustomTemplates((items) => items.slice(0, customTemplateLimit));
  }, [libraryLimit, customTemplateLimit]);

  useEffect(() => {
    localStorage.setItem("promptlab-library", JSON.stringify(library.slice(0, libraryLimit)));
  }, [library, libraryLimit]);

  useEffect(() => {
    localStorage.setItem("promptlab-custom-templates", JSON.stringify(customTemplates.slice(0, customTemplateLimit)));
  }, [customTemplates, customTemplateLimit]);

  useEffect(() => {
    localStorage.setItem("promptlab-account", JSON.stringify(accountState));
  }, [accountState]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    async function bootstrapSession() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setAuthError(error.message);
        setAuthStatus("Session check failed");
        setHasAuthSession(false);
        setAuthSessionReady(true);
        return;
      }
      const user = data.session?.user;
      if (user) {
        setHasAuthSession(true);
        setAuthStatus("Signed in");
        await loadUserProfile(user);
      } else {
        setHasAuthSession(false);
        setAccountState(defaultAccountState);
        setAuthStatus("Signed out");
      }
      setAuthSessionReady(true);
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        setHasAuthSession(true);
        setAuthSessionReady(true);
        setAuthStatus("Signed in");
        loadUserProfile(user);
      } else {
        setHasAuthSession(false);
        setAuthSessionReady(true);
        setAccountState(defaultAccountState);
        setAuthStatus("Signed out");
      }
    });

    bootstrapSession();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authSessionReady && accountState.role === "admin" && accountState.userId) {
      loadAdminRuntimeConfig();
    }
  }, [authSessionReady, accountState.role, accountState.userId]);

  useEffect(() => {
    localStorage.setItem("promptlab-generation-mode", generationMode);
  }, [generationMode]);

  useEffect(() => {
    localStorage.setItem("promptlab-quality-mode", qualityMode);
  }, [qualityMode]);

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

  useEffect(() => {
    setCompareResult(null);
    setCompareWarning("");
    setCompareError("");
  }, [compareA, compareB]);

  function setBuilderFromTemplate(template) {
    setNarrative(template.prompt);
    setCategory(categories.includes(template.category) ? template.category : category);
    if (models.includes(template.model)) setModel(template.model);
    if (tones.includes(template.tone)) setTone(template.tone);
    setOutputType(template.outputType || outputType);
    setActive("Builder");
  }

  function flashAction(message) {
    if (!message) return;
    setActionToast(message);
    window.setTimeout(() => setActionToast(""), 2200);
  }

  async function copyText(text = prompt) {
    const ok = await writeClipboard(text);
    setCopied(ok);
    setCopyStatus(ok ? "Copied" : "Copy failed");
    flashAction(ok ? "Copied to clipboard" : "Copy failed");
    window.setTimeout(() => {
      setCopied(false);
      setCopyStatus("");
    }, 1600);
    return ok;
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
    setLibrary((items) => [item, ...items].slice(0, libraryLimit));
    setSelectedLibraryId(item.id);
    flashAction("Saved to library");
    return true;
  }

  function saveCustomTemplate(template) {
    const cleanPrompt = String(template.prompt || "").trim();
    if (!cleanPrompt) return null;
    const item = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
      title: String(template.title || "Custom template").trim() || "Custom template",
      category: categories.includes(template.category) ? template.category : category,
      model: models.includes(template.model) ? template.model : model,
      outputType: outputTypes.includes(template.outputType) ? template.outputType : outputType,
      tone: tones.includes(template.tone) ? template.tone : tone,
      prompt: cleanPrompt,
      custom: true,
      createdAt: Date.now(),
    };
    setCustomTemplates((items) => [item, ...items].slice(0, customTemplateLimit));
    return item;
  }

  function deleteCustomTemplate(id) {
    setCustomTemplates((items) => items.filter((item) => item.id !== id));
  }

  async function loadUserProfile(user) {
    if (!supabase || !user?.id) return;
    setAuthError("");
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,plan,quota_used,quota_limit,quota_reset_at,play_billing")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setAuthError(`Profile error: ${error.message}`);
      setAccountState((account) => ({
        ...account,
        userId: user.id,
        email: user.email || account.email,
        name: user.user_metadata?.full_name || account.name,
      }));
      return;
    }

    if (data) {
      setAccountState(profileToAccount(data, user));
      return;
    }

    const draftProfile = {
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || "",
    };
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert(draftProfile)
      .select("id,email,full_name,role,plan,quota_used,quota_limit,quota_reset_at,play_billing")
      .maybeSingle();

    if (insertError) {
      setAuthError(`Profile create error: ${insertError.message}`);
      setAccountState(profileToAccount(draftProfile, user));
      return;
    }

    setAccountState(profileToAccount(inserted || draftProfile, user));
  }

  async function signInWithPassword(email, password) {
    if (!supabase) {
      setAuthError("Supabase is not configured.");
      return;
    }
    setIsAuthBusy(true);
    setAuthError("");
    setAuthStatus("Signing in...");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setIsAuthBusy(false);
    if (error) {
      setAuthError(error.message);
      setAuthStatus("Sign in failed");
      return;
    }
    setHasAuthSession(Boolean(data.session));
    setAuthSessionReady(true);
    setAuthStatus("Signed in");
    await loadUserProfile(data.user);
  }

  async function signUpWithPassword(email, password, fullName) {
    if (!supabase) {
      setAuthError("Supabase is not configured.");
      return;
    }
    setIsAuthBusy(true);
    setAuthError("");
    setAuthStatus("Creating account...");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || "" } },
    });
    setIsAuthBusy(false);
    if (error) {
      setAuthError(error.message);
      setAuthStatus("Sign up failed");
      return;
    }
    if (data.user && data.session) {
      setHasAuthSession(true);
      setAuthSessionReady(true);
      setAuthStatus("Signed in");
      await loadUserProfile(data.user);
    } else {
      setAuthStatus("Check your email to confirm your account.");
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("promptlab-guest");
    localStorage.removeItem("promptlab-onboarded");
    localStorage.removeItem("promptlab-auth-intent");
    setHasAuthSession(false);
    setAuthSessionReady(true);
    setAccountState(defaultAccountState);
    setAuthStatus("Signed out");
  }

  async function getAuthHeaders() {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function getAccessToken() {
    if (!supabase) return "";
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function upgradeViaPlayBilling(planName) {
    if (!accountState.userId) {
      setBillingMessage("Sign in to upgrade your plan.");
      return;
    }
    if (!isPlayBillingAvailable()) {
      setBillingMessage(
        isLikelyAndroidTwa()
          ? "Play Billing is not available yet. Install PromptLab from the Play Store (closed testing), not a regular browser."
          : "Upgrades are only available in the PromptLab Android app on Google Play."
      );
      return;
    }
    setBillingBusy(true);
    setBillingMessage("");
    let completeBilling = null;
    try {
      const purchase = await purchasePlayPlan(planName);
      completeBilling = purchase.completeBilling;
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      const data = await verifyPlayPurchaseOnServer(apiBase, token, {
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken,
      });
      await completeBilling?.(true);
      if (data.quota) applyServerQuota(data.quota);
      else await loadUserProfile({ id: accountState.userId, email: accountState.email });
      setBillingMessage(data.message || `Upgraded to ${planName} successfully.`);
      flashAction(`Plan ${planName} active`);
    } catch (error) {
      await completeBilling?.(false);
      setBillingMessage(error.message || "Upgrade failed.");
    } finally {
      setBillingBusy(false);
    }
  }

  function applyServerQuota(quota) {
    if (!quota) return;
    setAccountState((account) => normalizeAccountState({
      ...account,
      email: quota.email || account.email,
      name: quota.fullName || account.name,
      playBilling: quota.playBilling || account.playBilling,
      plan: quota.plan || account.plan,
      quotaLimit: quota.quotaLimit ?? account.quotaLimit,
      quotaReset: quota.quotaResetAt
        ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(quota.quotaResetAt))
        : account.quotaReset,
      quotaUsed: quota.quotaUsed ?? account.quotaUsed,
      role: quota.role || account.role,
    }));
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
    setLibrary((items) => [copy, ...items].slice(0, libraryLimit));
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
      formData.append("qualityMode", qualityMode);
      const uploadPlan = getAttachmentUploadPlan(attachments, apiBase);
      formData.append("attachmentManifest", JSON.stringify(buildAttachmentManifestForApi(attachments)));
      if (uploadPlan.sendRawFiles) {
        attachments.forEach((item) => formData.append("attachments", item.file));
      }

      const response = await fetch(`${apiBase}/api/generate-prompt`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: formData,
      });

      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Failed to generate prompt.");

      setGeneratedPrompt(data.prompt || localPrompt);
      setGenerationSource(data.source || "server");
      setGenerationModel(data.model || (data.source === "fallback" ? "Local fallback" : "Local draft"));
      setGenerationStatus(data.modelStatus || data.source || "server");
      applyServerQuota(data.quota);
      setWarningMessage([uploadPlan.warning, data.warning].filter(Boolean).join(" "));
      setEngineVersion(data.engineVersion || "");
      setEvalDelta(data.evalDelta || null);
      setPiiFindings(Array.isArray(data.piiFindings) ? data.piiFindings : []);
      return data.prompt || localPrompt;
    } catch (error) {
      const message = error.message || API_MSG.backendUnavailableLocalPrompt;
      const quotaOnly = /usage quota|quota exceeded|quota token|failed to record quota/i.test(message);
      setGeneratedPrompt(localPrompt);
      setGenerationSource("local");
      setGenerationModel("Local draft");
      setGenerationStatus(quotaOnly ? "local-quota-warning" : "local-error");
      if (quotaOnly) {
        setErrorMessage("");
        setWarningMessage(message);
      } else {
        setErrorMessage(message);
      }
      return localPrompt;
    } finally {
      setIsGenerating(false);
    }
  }

  function clearOptimizerResult() {
    setOptimizerResult("");
    setOptimizerSource("local");
    setOptimizerError("");
    setOptimizerWarning("");
  }

  async function optimizePrompt(rawPrompt, mode) {
    setIsOptimizing(true);
    setOptimizerError("");
    setOptimizerWarning("");

    if (!canUseFeature(accountState.plan, "aiOptimize")) {
      const fallback = buildLocalOptimizedPrompt(rawPrompt, mode, model, tone);
      setOptimizerResult(fallback);
      setOptimizerSource("local");
      setOptimizerWarning(upgradeMessageForFeature("aiOptimize"));
      setIsOptimizing(false);
      return fallback;
    }

    try {
      const response = await fetch(`${apiBase}/api/optimize-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({
          prompt: rawPrompt,
          mode,
          targetModel: model,
          tone,
          generationMode,
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Failed to optimize prompt.");
      setOptimizerResult(data.prompt || buildLocalOptimizedPrompt(rawPrompt, mode, model, tone));
      setOptimizerSource(data.source || "server");
      setOptimizerWarning(data.warning || "");
      applyServerQuota(data.quota);
      setEngineVersion(data.engineVersion || engineVersion);
      setPiiFindings(Array.isArray(data.piiFindings) ? data.piiFindings : []);
      return data.prompt;
    } catch (error) {
      const message = error.message || "Backend unavailable, using local optimizer.";
      const quotaOnly = /quota token|quota exceeded|usage quota/i.test(message);
      if (quotaOnly) {
        setOptimizerError(message);
        setOptimizerWarning("");
        return null;
      }
      const fallback = buildLocalOptimizedPrompt(rawPrompt, mode, model, tone);
      setOptimizerResult(fallback);
      setOptimizerSource("local");
      setOptimizerError(message);
      return fallback;
    } finally {
      setIsOptimizing(false);
    }
  }

  async function comparePrompts() {
    setIsComparing(true);
    setCompareError("");
    setCompareWarning("");

    if (!canUseFeature(accountState.plan, "aiCompare")) {
      const fallback = buildLocalCompareResult(compareA, compareB);
      setCompareResult(fallback);
      setCompareSource("Local judge");
      setCompareWarning(upgradeMessageForFeature("aiCompare"));
      setIsComparing(false);
      return fallback;
    }

    try {
      const response = await fetch(`${apiBase}/api/compare-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({
          promptA: compareA,
          promptB: compareB,
          targetModel: model,
          useCase: outputType,
          generationMode,
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Failed to compare prompts.");
      setCompareResult(data.result || null);
      setCompareSource(data.model || data.source || "AI judge");
      setCompareWarning(data.warning || "");
      applyServerQuota(data.quota);
      setCompareBiasMitigation(data.result?.bias_mitigation || "");
      return data.result;
    } catch (error) {
      const message = error.message || "Compare provider unavailable, using local judge.";
      const quotaOnly = /quota token|quota exceeded|usage quota/i.test(message);
      if (quotaOnly) {
        setCompareError(message);
        setCompareWarning("");
        return null;
      }
      const fallback = buildLocalCompareResult(compareA, compareB);
      setCompareResult(fallback);
      setCompareSource("Local judge");
      setCompareError(message);
      return fallback;
    } finally {
      setIsComparing(false);
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
          kind: file.type?.startsWith("image/") ? "image/screenshot" : "file",
          sizeLabel: formatBytes(file.size),
          preview: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
          excerpt,
          file,
        };
      })
    );
    setAttachments((items) => {
      const merged = [...nextFiles, ...items].slice(0, maxAttachments);
      if (merged.length >= maxAttachments && nextFiles.length > 0) {
        setWarningMessage(`Maximum ${maxAttachments} attachments for the ${accountState.plan} plan. Upgrade to add more.`);
      }
      return merged;
    });
  }

  function removeAttachment(id) {
    setAttachments((items) => {
      const target = items.find((item) => item.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return items.filter((item) => item.id !== id);
    });
  }

  function applyRuntimeConfigToModelSettings(config) {
    if (!config) return;
    setModelSettings((prev) => ({
      ...prev,
      provider: config.provider || prev.provider,
      baseUrl: config.baseUrl || prev.baseUrl,
      primaryModel: config.primaryModel || prev.primaryModel,
      ocrModel: config.ocrModel || prev.ocrModel,
      timeoutMs: config.timeoutMs ? String(config.timeoutMs) : prev.timeoutMs,
      fallbackModels: Array.isArray(config.fallbackModels)
        ? config.fallbackModels.join("\n")
        : String(config.fallbackModels || prev.fallbackModels || ""),
    }));
  }

  async function loadAdminRuntimeConfig() {
    if (accountState.role !== "admin" || !accountState.userId) return;
    try {
      const response = await fetch(`${apiBase}/api/admin/runtime-config`, {
        headers: await getAuthHeaders(),
      });
      const data = await readApiJson(response);
      if (!response.ok) return;
      if (data.config) applyRuntimeConfigToModelSettings(data.config);
      setGlobalConfigSource(data.source || "env");
      if (data.config?.updatedAt) {
        setGlobalPublishAt(new Date(data.config.updatedAt).toLocaleString("en-US"));
      }
    } catch {
      /* optional */
    }
  }

  async function publishGlobalModelSettings() {
    setGlobalPublishBusy(true);
    setProviderTestStatus("Publishing global model routing...");
    try {
      const response = await fetch(`${apiBase}/api/admin/runtime-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({
          provider: modelSettings.provider,
          baseUrl: modelSettings.baseUrl,
          primaryModel: modelSettings.primaryModel,
          ocrModel: modelSettings.ocrModel,
          fallbackModels: modelSettings.fallbackModels,
          timeoutMs: modelSettings.timeoutMs,
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Failed to publish global config.");
      if (data.config) applyRuntimeConfigToModelSettings(data.config);
      setGlobalConfigSource("published");
      setGlobalPublishAt(
        data.updatedAt
          ? new Date(data.updatedAt).toLocaleString("en-US")
          : new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date())
      );
      setProviderTestStatus(data.message || "Published globally for all users.");
      localStorage.setItem("promptlab-model-settings", JSON.stringify(modelSettings));
      await refreshHealth();
    } catch (error) {
      setProviderTestStatus(error.message || "Publish failed.");
    } finally {
      setGlobalPublishBusy(false);
    }
  }

  async function refreshHealth() {
    try {
      const response = await fetch(`${apiBase}/api/health`);
      const data = await readApiJson(response);
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
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify(modelSettings),
      });
      const data = await readApiJson(response);
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
    setSettingsSavedAt(new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
    setProviderTestStatus("Draft saved in this browser only.");
  }

  async function exportFile(format, content = prompt, titleSeed = narrative) {
    const formatLabel = format.toUpperCase();
    const feature = format === "pptx" ? "pptxExport" : "docxExport";
    if (!canExportFormat(accountState.plan, format)) {
      const message = upgradeMessageForFeature(feature);
      setBillingMessage(message);
      setExportStatus("");
      return;
    }
    try {
      setExportStatus(`Preparing ${formatLabel}...`);
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${apiBase}/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title: titleSeed.trim().split(/\s+/).slice(0, 10).join(" ") || "PromptLab Export",
          content,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Failed to export ${formatLabel}.`);
      }
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
    copyStatus,
    actionToast,
    copyText,
    savePrompt,
    generatePrompt,
    isGenerating,
    library,
    libraryLimit,
    templates: allTemplates,
    customTemplates,
    customTemplateLimit,
    entitlements,
    maxAttachments,
    saveCustomTemplate,
    deleteCustomTemplate,
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
    compareResult,
    compareSource,
    compareWarning,
    compareError,
    isComparing,
    comparePrompts,
    settingsStatus,
    refreshHealth,
    generationMode,
    setGenerationMode,
    qualityMode,
    setQualityMode,
    modelSettings,
    setModelSettings,
    saveModelSettings,
    publishGlobalModelSettings,
    loadAdminRuntimeConfig,
    globalPublishBusy,
    globalPublishAt,
    globalConfigSource,
    settingsSavedAt,
    providerTestStatus,
    isTestingProvider,
    testProvider,
    exportStatus,
    exportFile,
    apiBase,
    accountState,
    setAccountState,
    authStatus,
    authError,
    isAuthBusy,
    authSessionReady,
    hasAuthSession,
    isSupabaseConfigured,
    membershipPlans,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    setBuilderFromTemplate,
    optimizerResult,
    optimizerSource,
    isOptimizing,
    optimizerError,
    optimizerWarning,
    optimizePrompt,
    // v2 engine telemetry
    engineVersion,
    evalDelta,
    piiFindings,
    compareBiasMitigation,
    clearOptimizerResult,
    billingBusy,
    billingMessage,
    upgradeViaPlayBilling,
    playBillingReady,
    playBillingHint,
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
        <p>Swatch grid for R1 validation: OKLCH palette, font stack, radius, and control samples.</p>
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
  const {
    active,
    setActive,
    settingsStatus,
    generationStatus,
    generationSource,
    generationModel,
    isGenerating,
    accountState,
    library,
    setNarrative,
    authSessionReady,
    hasAuthSession,
  } = props;
  const [guestMode, setGuestMode] = useState(() => localStorage.getItem("promptlab-guest") === "1");
  const recentPrompts = useMemo(
    () =>
      [...(library || [])]
        .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
        .slice(0, 3),
    [library]
  );
  const quotaPercent = Math.min(100, Math.round(((accountState.quotaUsed || 0) / Math.max(1, accountState.quotaLimit || 1)) * 100));

  useEffect(() => {
    if (!hasAuthSession) return;
    localStorage.removeItem("promptlab-guest");
    setGuestMode(false);
  }, [hasAuthSession]);

  const continueGuest = () => {
    localStorage.setItem("promptlab-guest", "1");
    localStorage.removeItem("promptlab-auth-intent");
    localStorage.removeItem("promptlab-onboarded");
    setGuestMode(true);
    setActive("Builder");
  };

  if (!guestMode && (!authSessionReady || !hasAuthSession || !accountState.userId)) {
    return <V2AuthGate {...props} onGuest={continueGuest} />;
  }
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
          {recentPrompts.length > 0 ? (
            recentPrompts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setNarrative(item.content);
                  setActive("Builder");
                }}
                title={item.title}
              >
                {item.title}
              </button>
            ))
          ) : (
            <p className="v2-small">Save a prompt to see recents here.</p>
          )}
        </div>
        <button className="v2-quota-card" type="button" onClick={() => setActive("Settings")}>
          <div>
            <span>Quota</span>
            <em>{(accountState.quotaUsed / 1000).toFixed(1)}k / {(accountState.quotaLimit / 1000).toFixed(0)}k</em>
          </div>
          <i><b style={{ width: `${quotaPercent}%` }} /></i>
          <small>Resets {accountState.quotaReset} · <strong>{accountState.plan}</strong></small>
        </button>
        <div className="v2-side-card">
          <span>Session</span>
          <strong>{isGenerating ? "Generating" : "Ready"}</strong>
          <p>{statusLabel(generationStatus, generationSource)} · {generationModel}</p>
        </div>
      </aside>

      <main className="v2-main">
        <V2Header
          active={active}
          setActive={setActive}
          settingsStatus={settingsStatus}
          isGenerating={isGenerating}
          generationStatus={generationStatus}
          generationSource={generationSource}
          isGuestMode={guestMode}
          accountState={accountState}
        />
        {active === "Builder" && <V2Builder {...props} />}
        {active === "Optimizer" && <V2Optimizer {...props} />}
        {active === "Templates" && <V2Templates {...props} />}
        {active === "Library" && <V2Library {...props} />}
        {active === "Compare" && <V2Compare {...props} />}
        {active === "Settings" && <V2Settings {...props} />}
      </main>
      <BottomNav active={active} setActive={setActive} />
      <V2ActionToast message={props.actionToast} />
    </div>
  );
}

function V2AuthGate({
  accountState,
  authStatus,
  authError,
  isAuthBusy,
  isSupabaseConfigured,
  signInWithPassword,
  signUpWithPassword,
  onGuest,
}) {
  const [authMode, setAuthMode] = useState("sign-in");
  const [authEmail, setAuthEmail] = useState(accountState.email || "");
  const [authName, setAuthName] = useState(accountState.name || "");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isSignIn = authMode === "sign-in";
  const canSubmit = authEmail.trim() && authPassword.length >= 6 && (isSignIn || authName.trim());
  const submitAuth = () => {
    if (isSignIn) {
      signInWithPassword(authEmail.trim(), authPassword);
      return;
    }
    signUpWithPassword(authEmail.trim(), authPassword, authName.trim());
  };

  return (
    <main className="v2-onboarding v2-auth-gate" data-theme="v2">
      <section className="v2-onboarding-card v2-auth-gate-card">
        <span className="v2-eyebrow">PromptLab Account</span>
        <h1>{isSignIn ? "Sign in to continue." : "Create your PromptLab account."}</h1>
        <p>Login unlocks AI generation quota, membership state, and synced prompt history. Guest mode stays local only.</p>
        <div className="v2-auth-mode" role="tablist" aria-label="Authentication mode">
          <button className={isSignIn ? "active" : ""} onClick={() => setAuthMode("sign-in")}>Sign In</button>
          <button className={!isSignIn ? "active" : ""} onClick={() => setAuthMode("create")}>Create Account</button>
        </div>
        <div className="v2-account-grid">
          <label>
            <span>Email</span>
            <input className="v2-input" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="user@email.com" autoComplete="email" />
          </label>
          {!isSignIn && (
            <label>
              <span>Name</span>
              <input className="v2-input" value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Your name" autoComplete="name" />
            </label>
          )}
          <label className="v2-account-password">
            <span>Password</span>
            <div className="v2-password-field">
              <input className="v2-input" type={showPassword ? "text" : "password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Minimum 6 characters" autoComplete={isSignIn ? "current-password" : "new-password"} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
        </div>
        <div className="v2-auth-status">
          <span>{isSupabaseConfigured ? authStatus : "Supabase env is not configured"}</span>
          {authError && <strong>{authError}</strong>}
        </div>
        <div className="v2-actions wrap">
          <button className="v2-btn primary" onClick={submitAuth} disabled={isAuthBusy || !canSubmit}>
            {isAuthBusy ? "Checking..." : isSignIn ? "Sign In" : "Create Account"}
          </button>
          <button className="v2-btn" onClick={onGuest}>Continue as Guest</button>
        </div>
      </section>
    </main>
  );
}

function V2Onboarding({ onAuth, onGuest }) {
  return (
    <main className="v2-onboarding" data-theme="v2">
      <section className="v2-onboarding-card">
        <span className="v2-eyebrow">PromptLab</span>
        <h1>Build better prompts from ideas, files, and screenshots.</h1>
        <p>Generate, optimize, score, save, and reuse prompts for ChatGPT, Claude, Gemini, and creative AI tools.</p>
        <div className="v2-onboarding-points">
          <div><Sparkles size={18} /><strong>Generate</strong><span>Turn rough requests into structured prompts.</span></div>
          <div><Gauge size={18} /><strong>Improve</strong><span>Check clarity, context, format, constraints, and actionability.</span></div>
          <div><Library size={18} /><strong>Sync later</strong><span>Create an account to keep library and membership data across devices.</span></div>
        </div>
        <div className="v2-actions">
          <button className="v2-btn primary" onClick={onAuth}>Sign In / Create Account</button>
          <button className="v2-btn" onClick={onGuest}>Continue as Guest</button>
        </div>
      </section>
    </main>
  );
}

function V2Header({ active, setActive, settingsStatus, isGenerating, generationStatus, generationSource, isGuestMode, accountState }) {
  const subtitles = {
    Builder: "Parse intent, lock guardrails, and ship model-ready prompts.",
    Optimizer: "Diff an old prompt into a sharper, safer instruction.",
    Templates: "Start from production-ready prompt patterns.",
    Library: "Manage your best prompts as reusable work assets.",
    Compare: "Run an AI judge on two prompt versions before sending them.",
    Settings: "Manage account, membership, prompt defaults, privacy, and support.",
  };
  const syncLabel = isGenerating
    ? statusLabel(generationStatus, generationSource)
    : isGuestMode || !accountState?.userId
      ? "Local only"
      : "Synced";
  const syncClass = isGenerating ? "busy" : isGuestMode || !accountState?.userId ? "local" : "";
  return (
    <header className="v2-headerbar">
      <div>
        <span className="v2-eyebrow">PromptLab / {active}</span>
        <strong>{subtitles[active] || subtitles.Builder}</strong>
      </div>
      <div className="v2-header-actions">
        <span className={`v2-sync ${syncClass}`}><i /> {syncLabel}</span>
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

/**
 * v2 engine telemetry badges:
 * - Engine version chip
 * - PII redaction notice
 * Tampil hanya kalau ada data.
 */
function EngineMetaBadges({ engineVersion, piiFindings }) {
  const hasVersion = Boolean(engineVersion);
  const blockingPii = Array.isArray(piiFindings)
    ? piiFindings.filter((finding) => finding && finding.blocking)
    : [];
  const warnPii = Array.isArray(piiFindings)
    ? piiFindings.filter((finding) => finding && !finding.blocking)
    : [];
  if (!hasVersion && blockingPii.length === 0 && warnPii.length === 0) return null;
  return (
    <div className="v2-engine-meta" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {hasVersion && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.4,
              background: "rgba(99, 102, 241, 0.12)",
              color: "#4f46e5",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            }}
            title="Versi PromptLab Engine yang memproses request ini"
          >
            ENGINE {engineVersion}
          </span>
        </div>
      )}
      {blockingPii.length > 0 && (
        <p
          style={{
            margin: 0,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(234, 179, 8, 0.10)",
            border: "1px solid rgba(234, 179, 8, 0.35)",
            color: "#854d0e",
            fontSize: 13,
          }}
        >
          🛡️ Demi keamanan, kami men-redact{" "}
          {blockingPii.map((finding, index) => (
            <span key={finding.id}>
              <strong>
                {finding.count}× {finding.label}
              </strong>
              {index < blockingPii.length - 1 ? ", " : ""}
            </span>
          ))}{" "}
          dari prompt-mu sebelum dikirim ke AI provider.
        </p>
      )}
      {warnPii.length > 0 && (
        <p
          style={{
            margin: 0,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            color: "#1d4ed8",
            fontSize: 13,
          }}
        >
          ℹ️ Terdeteksi data pribadi (
          {warnPii.map((finding, index) => (
            <span key={finding.id}>
              {finding.count}× {finding.label}
              {index < warnPii.length - 1 ? ", " : ""}
            </span>
          ))}
          ). Tidak diblokir — pastikan kamu memang ingin mengirimnya ke AI.
        </p>
      )}
    </div>
  );
}

/**
 * Small caption for Compare Judge results when bias mitigation is active.
 */
function CompareBiasNote({ biasMitigation }) {
  if (!biasMitigation) return null;
  if (biasMitigation === "position-swap-averaged") {
    return (
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 12,
          color: "#6b7280",
          fontStyle: "italic",
        }}
      >
        Judge ran twice with A/B positions swapped; scores were averaged for neutrality.
      </p>
    );
  }
  return null;
}

function V2Builder(props) {
  const {
    category, setCategory, tone, setTone, model, setModel, outputType, setOutputType,
    narrative, setNarrative, attachments, addAttachments, removeAttachment, prompt,
    metrics, generationStatus, generationSource, generationModel, warningMessage, errorMessage, copied,
    copyText, savePrompt, generatePrompt, isGenerating, exportStatus, exportFile,
    engineVersion, piiFindings, entitlements, accountState,
  } = props;
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

      <section className="v2-studio-grid">
        <div className="v2-card v2-composer v2-glass-card">
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
            <button className="v2-btn primary v2-btn-cta" onClick={() => generatePrompt()} disabled={isGenerating}>
              <Sparkles size={17} /> {isGenerating ? "Generating..." : "Generate Prompt"}
            </button>
            <V2ActionBtn className="v2-btn" onAction={() => savePrompt(prompt, narrative)} successLabel={<><Check size={17} />Saved</>}>
              <Save size={17} />Save
            </V2ActionBtn>
            <V2ActionBtn className="v2-btn" onAction={() => copyText(prompt)} successLabel={<><Check size={17} />Copied</>}>
              <Clipboard size={17} />Copy
            </V2ActionBtn>
          </div>
          {isGenerating && <V2GenerateLoader attachments={attachments} model={model} outputType={outputType} />}
          <EngineMetaBadges engineVersion={engineVersion} piiFindings={piiFindings} />
          {warningMessage && <p className="v2-note warn">{warningMessage}</p>}
          {errorMessage && <p className="v2-note error">{errorMessage}</p>}
        </div>

        <V2ReadinessOutput
          prompt={prompt}
          metrics={metrics}
          generationStatus={generationStatus}
          generationSource={generationSource}
          copyText={copyText}
          savePrompt={savePrompt}
          exportFile={exportFile}
          narrative={narrative}
          exportStatus={exportStatus}
          isGenerating={isGenerating}
          accountState={props.accountState}
          entitlements={entitlements}
        />
      </section>
    </div>
  );
}

function V2IntentEnginePanel({ blueprint, eyebrow = "PromptLab Intent Engine" }) {
  const visibleFrames = blueprint.implementationFrames.slice(0, 4);
  return (
    <section className="v2-intent-panel">
      <div className="v2-intent-orbit"><BrainCircuit size={18} /></div>
      <div className="v2-intent-main">
        <span className="v2-eyebrow">{eyebrow}</span>
        <h3>{blueprint.domain}</h3>
        <p>{blueprint.archetype}</p>
        <div className="v2-intent-tags">
          <span>{blueprint.deliverable}</span>
          <span>{blueprint.attachmentSignal}</span>
          {blueprint.attachmentNames && <span>{blueprint.attachmentNames}</span>}
        </div>
      </div>
      <div className="v2-intent-stack">
        {visibleFrames.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function V2GenerateLoader({ attachments, model, outputType }) {
  return (
    <section className="v2-generate-loader" aria-live="polite">
      <div className="v2-loader-orb">
        <Sparkles size={20} />
        <span />
      </div>
      <div className="v2-loader-main">
        <span className="v2-eyebrow">Generating</span>
        <strong>Creating your prompt...</strong>
        <div className="v2-loader-bar"><i /></div>
        <p>{model} · {outputType}{attachments.length ? ` · ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}` : ""}</p>
      </div>
    </section>
  );
}

function V2MiniPipeline({ eyebrow = "Working", title, steps }) {
  return (
    <section className="v2-mini-pipeline" aria-live="polite">
      <div className="v2-mini-orb"><Sparkles size={16} /></div>
      <div className="v2-mini-copy">
        <span className="v2-eyebrow">{eyebrow}</span>
        <strong>{title}</strong>
        <div className="v2-loader-bar"><i /></div>
      </div>
      <div className="v2-mini-steps">
        {steps.map((step, index) => (
          <div className="v2-mini-step" key={step} style={{ "--delay": `${index * 0.16}s` }}>{step}</div>
        ))}
      </div>
    </section>
  );
}

function isAiGeneratedOutput(generationSource, generationStatus) {
  if (generationSource === "local" || generationSource === "fallback") return false;
  if (generationStatus === "local-fallback" || generationStatus === "local-error" || generationStatus === "local-quota-warning") {
    return false;
  }
  return (
    generationStatus === "primary-model" ||
    generationStatus === "fallback-model" ||
    generationSource === "openrouter" ||
    generationSource === "openai" ||
    generationSource === "server"
  );
}

function V2ReadinessOutput({ prompt, metrics, generationStatus, generationSource, copyText, savePrompt, exportFile, narrative, exportStatus, isGenerating, accountState, entitlements }) {
  const plan = accountState?.plan || "Free";
  const canDocx = entitlements?.docxExport ?? canExportFormat(plan, "docx");
  const canPptx = entitlements?.pptxExport ?? canExportFormat(plan, "pptx");
  const [actionFeedback, setActionFeedback] = useState("");
  const outputBadge = isGenerating
    ? "Generating..."
    : isAiGeneratedOutput(generationSource, generationStatus)
      ? "AI Generated"
      : "";
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
            <span className="v2-eyebrow">Prompt Check</span>
            <h2>Readiness Score</h2>
          </div>
          <Sparkles size={20} />
        </div>
        <div className="v2-score-row">
          <div className="v2-ring" style={{ "--score": `${metrics.score * 3.6}deg` }}><span>{metrics.score}</span></div>
          <div>
            <h3>{metrics.score >= 85 ? "Ready to use" : "Needs work"}</h3>
            <p>Local rule-based score from five prompt quality checks.</p>
          </div>
        </div>
        <V2Metric label="Clarity" value={metrics.clarity} />
        <V2Metric label="Context" value={metrics.context} />
        <V2Metric label="Output format" value={metrics.format} />
        <V2Metric label="Constraints" value={metrics.constraints} />
        <V2Metric label="Actionability" value={metrics.actionability} />
        <div className="v2-score-advice">
          <span>{metrics.tips.length ? "Next improvement" : "Quality note"}</span>
          {metrics.tips.slice(0, 3).map((tip) => <p key={tip}>{tip}</p>)}
        </div>
      </div>
      <div className="v2-card v2-output-card">
        <div className="v2-prompt-toolbar">
          <div className="v2-prompt-toolbar-title">
            <strong>Optimized Prompt</strong>
            {outputBadge && <span className="v2-output-badge">{outputBadge}</span>}
          </div>
          {actionFeedback && <em>{actionFeedback}</em>}
          <button type="button" onClick={() => confirmAction("Copied", () => copyText(prompt))} title="Copy prompt" aria-label="Copy prompt">
            <Clipboard size={16} />
          </button>
          <button type="button" onClick={() => confirmAction("Saved", () => savePrompt(prompt, narrative))} title="Save prompt" aria-label="Save prompt">
            <Archive size={16} />
          </button>
        </div>
        <div className="v2-output-tabs">
          <button className="active">Prompt</button>
        </div>
        <pre className={`v2-prompt-output ${isGenerating ? "is-streaming" : ""}`}>{prompt}</pre>
        {isGenerating && (
          <div className="v2-stream-preview">
            <span>Streaming preview</span>
            <i />
            <i />
            <i />
          </div>
        )}
        <div className="v2-actions wrap">
          <button className="v2-btn" disabled={!canDocx} title={!canDocx ? upgradeMessageForFeature("docxExport") : undefined} onClick={() => exportFile("docx", prompt, narrative)}><FileText size={16} />DOCX</button>
          <button className="v2-btn" disabled={!canPptx} title={!canPptx ? upgradeMessageForFeature("pptxExport") : undefined} onClick={() => exportFile("pptx", prompt, narrative)}><BookOpenText size={16} />PPTX</button>
          <span className="v2-small">{exportStatus || (canDocx ? "Export saves the final prompt as a working file." : "Export DOCX/PPTX — plan Pro+")}</span>
        </div>
        {exportStatus?.startsWith("Preparing") && (
          <V2MiniPipeline
            eyebrow="Export"
            title="Packaging your file..."
            steps={["Format", "Render", "Download"]}
          />
        )}
      </div>
    </aside>
  );
}

function V2Optimizer({ optimizerResult, isOptimizing, optimizerError, optimizerWarning, optimizePrompt, clearOptimizerResult, copyText, savePrompt, exportFile, entitlements }) {
  const canDocx = entitlements?.docxExport;
  const [rawPrompt, setRawPrompt] = useState("Make this prompt stronger for Instagram content about a milk coffee product.");
  const [mode, setMode] = useState("Clearer");
  const result = optimizerResult || buildLocalOptimizedPrompt(rawPrompt, mode, "Claude", "Professional");
  const beforeScore = scorePrompt(rawPrompt);
  const afterScore = scoreOptimizedPrompt(rawPrompt, result);
  const scoreDelta = afterScore.score - beforeScore.score;
  const qualityBreakdown = [
    ["Clarity", beforeScore.clarity, afterScore.clarity, "role and objective"],
    ["Context", beforeScore.context, afterScore.context, "audience and assumptions"],
    ["Format", beforeScore.format, afterScore.format, "output structure"],
    ["Guardrails", beforeScore.constraints, afterScore.constraints, "limits and safety"],
    ["Actionability", beforeScore.actionability, afterScore.actionability, "testable criteria"],
  ];
  return (
    <div className="v2-screen">
      <V2PageIntro eyebrow="Optimizer" title="Old prompts, refined into winning instructions." copy="Paste a weak prompt, pick a mode, and get a stronger version in one pass." />
      <section className="v2-diff-grid">
        <div className="v2-card v2-glass-card">
          <div className="v2-card-head"><h2>Input</h2><span className="v2-score-badge">{beforeScore.score}</span></div>
          <textarea className="v2-textarea" value={rawPrompt} onChange={(event) => setRawPrompt(event.target.value)} />
          <V2ChipGroup
            label="Optimization Mode"
            options={optimizerModes}
            value={mode}
            onChange={(nextMode) => {
              setMode(nextMode);
              if (optimizerResult) clearOptimizerResult?.();
            }}
          />
          <div className="v2-actions">
            <button className="v2-btn primary v2-btn-cta" onClick={() => optimizePrompt(rawPrompt, mode)} disabled={isOptimizing}>
              <Zap size={17} />{isOptimizing ? "Optimizing..." : "Optimize"}
            </button>
            <V2ActionBtn className="v2-btn" onAction={() => copyText(rawPrompt)} successLabel={<><Check size={17} />Copied</>}>
              <Clipboard size={17} />Copy original
            </V2ActionBtn>
          </div>
          {isOptimizing && (
            <V2MiniPipeline
              eyebrow="Optimizer pipeline"
              title="Rebuilding prompt structure..."
              steps={["Audit", "Rewrite", "Guard", "Score"]}
            />
          )}
          {optimizerWarning && <p className="v2-note warn">{optimizerWarning}</p>}
          {optimizerError && <p className="v2-note error">{optimizerError}</p>}
        </div>
        <div className="v2-card v2-output-card v2-glass-card">
          <div className="v2-card-head">
            <div>
              <h2>Optimized Result</h2>
              <p>{mode} · {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts</p>
            </div>
            <span className="v2-score-badge hot">{afterScore.score}</span>
          </div>
          <pre className={`v2-prompt-output ${isOptimizing ? "is-streaming" : ""}`}>{result}</pre>
          <div className="v2-score-advice">
            <span>Score notes</span>
            {afterScore.tips.slice(0, 2).map((tip) => <p key={tip}>{tip}</p>)}
          </div>
          {isOptimizing && (
            <div className="v2-stream-preview">
              <span>Optimizing preview</span>
              <i />
              <i />
              <i />
            </div>
          )}
          <div className="v2-actions wrap">
            <V2ActionBtn className="v2-btn" onAction={() => copyText(result)} successLabel={<><Check size={16} />Copied</>}>
              <Clipboard size={16} />Copy
            </V2ActionBtn>
            <V2ActionBtn className="v2-btn" onAction={() => savePrompt(result, rawPrompt)} successLabel={<><Check size={16} />Saved</>}>
              <Save size={16} />Save
            </V2ActionBtn>
            <button className="v2-btn" disabled={!canDocx} title={!canDocx ? upgradeMessageForFeature("docxExport") : undefined} onClick={() => exportFile("docx", result, rawPrompt)}><FileText size={16} />DOCX</button>
          </div>
        </div>
      </section>
      <section className="v2-card v2-compact-quality">
        <div className="v2-card-head">
          <div>
            <h2>What improved</h2>
            <p>Local score change by prompt quality area.</p>
          </div>
          <span className="v2-score-badge hot">{scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}</span>
        </div>
        <div className="v2-quality-list">
          {qualityBreakdown.map(([label, before, after, detail]) => (
            <div key={label}>
              <strong>{label}</strong>
              <span>{before} to {after}</span>
              <small>{after - before >= 0 ? "+" : ""}{after - before} · {detail}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function V2Templates({
  setBuilderFromTemplate,
  search,
  setSearch,
  templates: availableTemplates,
  customTemplates,
  customTemplateLimit,
  saveCustomTemplate,
  deleteCustomTemplate,
  narrative,
  category,
  model,
  outputType,
  tone,
}) {
  const [filter, setFilter] = useState("All");
  const [templateDraft, setTemplateDraft] = useState({
    title: "",
    prompt: "",
    category,
    model,
    outputType,
    tone,
  });
  const options = ["All", ...new Set(availableTemplates.map((item) => item.category))];
  const filtered = availableTemplates.filter((item) => {
    const q = `${item.title} ${item.category} ${item.outputType} ${item.model} ${item.prompt}`.toLowerCase();
    return (filter === "All" || item.category === filter) && q.includes(search.toLowerCase());
  });
  const featured = filtered[0];
  const gridTemplates = featured ? filtered.slice(1, 10) : filtered.slice(0, 9);
  const fillFromBuilder = () => {
    setTemplateDraft({
      title: `${outputType} Template`,
      prompt: narrative,
      category,
      model,
      outputType,
      tone,
    });
  };
  const createTemplate = () => {
    const saved = saveCustomTemplate(templateDraft);
    if (!saved) return;
    setTemplateDraft((draft) => ({ ...draft, title: "", prompt: "" }));
    setFilter("All");
  };
  return (
    <div className="v2-screen">
      <V2PageIntro eyebrow="Template Gallery" title="Featured prompts for serious output." copy="Fast filters for apps, reports, slides, content, coding, and visual prompts.">
        <div className="v2-hero-status"><span>Templates</span><strong>{filtered.length}</strong><small>{customTemplates.length}/{customTemplateLimit} custom</small></div>
      </V2PageIntro>
      <section className="v2-template-builder v2-card">
        <div>
          <span className="v2-eyebrow">Custom template</span>
          <strong>Add your own reusable pattern</strong>
          <p>Saved locally in this browser. Use membership/database later for cross-device sync.</p>
        </div>
        <input className="v2-input" value={templateDraft.title} onChange={(event) => setTemplateDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Template title" />
        <textarea className="v2-textarea mini" value={templateDraft.prompt} onChange={(event) => setTemplateDraft((draft) => ({ ...draft, prompt: event.target.value }))} placeholder="Paste the reusable prompt pattern..." />
        <div className="v2-template-builder-controls">
          <select value={templateDraft.category} onChange={(event) => setTemplateDraft((draft) => ({ ...draft, category: event.target.value }))}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={templateDraft.model} onChange={(event) => setTemplateDraft((draft) => ({ ...draft, model: event.target.value }))}>{models.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={templateDraft.outputType} onChange={(event) => setTemplateDraft((draft) => ({ ...draft, outputType: event.target.value }))}>{outputTypes.map((item) => <option key={item}>{item}</option>)}</select>
          <button className="v2-btn" type="button" onClick={fillFromBuilder}>Use Builder Draft</button>
          <button className="v2-btn primary" type="button" onClick={createTemplate} disabled={!templateDraft.prompt.trim()}><Plus size={16} />Add Template</button>
        </div>
      </section>
      <div className="v2-toolbar">
        <div className="v2-search wide"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates..." /></div>
        <div className="v2-chip-row">{options.map((item) => <button key={item} className={`v2-chip ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}</div>
      </div>
      {featured && (
        <section className="v2-featured-template v2-card v2-glass-card">
          <div>
            <span className="v2-eyebrow">Featured template</span>
            <strong>{featured.title}</strong>
            <p>{featured.prompt.length > 240 ? `${featured.prompt.slice(0, 240)}…` : featured.prompt}</p>
            <small>{featured.category} · {featured.model} · {featured.outputType}{featured.custom ? " · Custom" : ""}</small>
          </div>
          <button className="v2-btn primary v2-btn-cta" type="button" onClick={() => setBuilderFromTemplate(featured)}>
            <Sparkles size={16} />Use featured
          </button>
        </section>
      )}
      <section className="v2-template-grid">
        {gridTemplates.map((template) => (
          <article className="v2-template-card v2-glass-card" key={`${template.custom ? "custom" : "built-in"}-${template.title}`}>
            <span>{template.category}</span>
            <strong>{template.title}</strong>
            <p>{template.prompt}</p>
            <small>{template.model} · {template.outputType}{template.custom ? " · Custom" : ""}</small>
            <div className="v2-template-actions">
              <button type="button" onClick={() => setBuilderFromTemplate(template)}>Use</button>
              {template.custom && <button type="button" onClick={() => deleteCustomTemplate(template.id)}>Delete</button>}
            </div>
          </article>
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
    libraryLimit, copyStatus, entitlements,
  } = props;
  const canDocx = entitlements?.docxExport;
  const currentItem = filteredLibrary.find((item) => item.id === selectedLibraryId) || filteredLibrary[0] || selectedLibrary;
  const rows = filteredLibrary.slice(0, 8);
  const totalWords = filteredLibrary.reduce((sum, item) => sum + countWords(item.content), 0);
  const folderCount = new Set(filteredLibrary.map((item) => item.folder).filter(Boolean)).size;
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
        <div className="v2-hero-status"><span>Saved</span><strong>{filteredLibrary.length}</strong><small>of {libraryLimit} local slots</small></div>
      </V2PageIntro>
      <section className="v2-stats-strip">
        <div className="v2-stat"><span>Saved prompts</span><strong>{filteredLibrary.length}</strong><small>of {libraryLimit} slots</small></div>
        <div className="v2-stat"><span>Total words</span><strong>{totalWords.toLocaleString("id-ID")}</strong><small>across filtered items</small></div>
        <div className="v2-stat"><span>Folders</span><strong>{folderCount}</strong><small>unique output groups</small></div>
        <div className="v2-stat compact"><span>Last edit</span><strong>{currentItem ? formatDate(currentItem.updatedAt || currentItem.createdAt) : "—"}</strong><small>{currentItem?.tag || "No selection"}</small></div>
      </section>
      <section className="v2-library-grid">
        <div className="v2-card v2-glass-card">
          <div className="v2-library-summary">
            <strong>{filteredLibrary.length}/{libraryLimit}</strong>
            <span>saved prompts</span>
            {currentItem && <small>Last: {formatDate(currentItem.updatedAt || currentItem.createdAt)}</small>}
          </div>
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
        <div className="v2-card v2-editor v2-glass-card">
          {currentItem ? (
            <>
              <label className="v2-label">Judul</label>
              <input className="v2-input" value={currentItem.title} onChange={(event) => updateLibraryItem(currentItem.id, { title: event.target.value })} />
              <div className="v2-two">
                <div><label className="v2-label">Folder</label><input className="v2-input" value={currentItem.folder} onChange={(event) => updateLibraryItem(currentItem.id, { folder: event.target.value })} /></div>
                <div><label className="v2-label">Tag</label><input className="v2-input" value={currentItem.tag} onChange={(event) => updateLibraryItem(currentItem.id, { tag: event.target.value })} /></div>
              </div>
              <label className="v2-label">Prompt Content</label>
              <textarea className="v2-textarea" value={currentItem.content} onChange={(event) => updateLibraryItem(currentItem.id, { content: event.target.value })} />
              <div className="v2-actions wrap">
                <button className="v2-btn primary" onClick={() => useInBuilder(currentItem)}><PenLine size={16} />Use in Builder</button>
                <V2ActionBtn
                  className="v2-btn"
                  onAction={() => copyText(currentItem.content)}
                  successLabel={<><Check size={16} />Copied</>}
                >
                  <Clipboard size={16} />Copy
                </V2ActionBtn>
                <button className="v2-btn" onClick={() => { setCompareA(currentItem.content); setActive("Compare"); }}><ArrowRightLeft size={16} />Compare</button>
                <button className="v2-btn" disabled={!canDocx} title={!canDocx ? upgradeMessageForFeature("docxExport") : undefined} onClick={() => exportFile("docx", currentItem.content, currentItem.title)}><FileText size={16} />DOCX</button>
                <button className="v2-btn" onClick={() => duplicateLibraryItem(currentItem)}><Plus size={16} />Duplicate</button>
                <button className="v2-btn danger" onClick={() => deleteLibraryItem(currentItem.id)}><Trash2 size={16} />Delete</button>
              </div>
            </>
          ) : <p className="v2-small">No saved prompts yet.</p>}
        </div>
      </section>
    </div>
  );
}

function V2Compare({
  compareA,
  setCompareA,
  compareB,
  setCompareB,
  setNarrative,
  savePrompt,
  copyText,
  setActive,
  compareResult,
  compareSource,
  compareWarning,
  compareError,
  isComparing,
  comparePrompts,
  compareBiasMitigation,
}) {
  const prompts = [compareA, compareB].filter(Boolean);
  const basePrompt = prompts[0] || "Paste prompts into panels A/B to compare instruction quality.";
  const scoreA = scorePrompt(compareA || "");
  const scoreB = scorePrompt(compareB || "");
  const localWinner = scoreA.score >= scoreB.score ? "A" : "B";
  const winnerKey = compareResult?.winner && compareResult.winner !== "tie" ? compareResult.winner : localWinner;
  const winnerPrompt = winnerKey === "A" ? compareA : compareB;
  const mergedPrompt = compareResult?.merged_prompt || winnerPrompt;
  const aiScores = compareResult?.scores;
  const compareCards = [
    {
      key: "A",
      title: "Prompt A",
      score: aiScores?.A?.overall ?? scoreA.score,
      bestFor: compareResult?.best_for?.A || "Local score before AI judge.",
      risks: compareResult?.risks?.A || getLocalPromptRisks(compareA),
    },
    {
      key: "B",
      title: "Prompt B",
      score: aiScores?.B?.overall ?? scoreB.score,
      bestFor: compareResult?.best_for?.B || "Local score before AI judge.",
      risks: compareResult?.risks?.B || getLocalPromptRisks(compareB),
    },
    {
      key: "J",
      title: "AI Judge",
      score: compareResult ? Math.max(aiScores?.A?.overall || 0, aiScores?.B?.overall || 0) : Math.min(99, Math.max(42, scorePrompt(basePrompt).score + 6)),
      bestFor: compareResult?.summary || "Run AI Compare to let the active model judge both prompts.",
      risks: compareResult?.recommendations || ["Waiting for AI judge."],
    },
  ];
  return (
    <div className="v2-screen">
      <V2PageIntro eyebrow="Compare" title="Compare two prompts before sending." copy="Paste two versions, run the judge, then use the stronger prompt in Builder." />
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
      <section className="v2-compare-grid compact">
        {compareCards.map((card) => (
          <div className={`v2-card v2-model-card ${winnerKey === card.key ? "winner" : ""}`} key={card.key}>
            <div className="v2-card-head">
              <h2>{card.title}</h2>
              <span className={`v2-score-badge ${winnerKey === card.key ? "hot" : ""}`}>{card.score}</span>
            </div>
            <p>{card.bestFor}</p>
            <ul className="v2-risk-list">
              {(card.risks || []).slice(0, 2).map((risk) => <li key={risk}>{risk}</li>)}
            </ul>
          </div>
        ))}
      </section>
      <div className="v2-card v2-score-matrix">
        <div><strong>AI Judge Matrix</strong><span>A</span><span>B</span></div>
        {[
          ["Clarity", "clarity"],
          ["Context", "context"],
          ["Output format", "format"],
          ["Constraints", "constraints"],
          ["Risk", "risk"],
          ["Overall", "overall"],
        ].map(([row, key]) => {
          const scoreAValue = aiScores?.A?.[key] ?? (key === "overall" ? scoreA.score : scoreA[key] || Math.max(40, scoreA.score - 4));
          const scoreBValue = aiScores?.B?.[key] ?? (key === "overall" ? scoreB.score : scoreB[key] || Math.max(40, scoreB.score - 4));
          return (
            <div key={row}>
              <strong>{row}</strong>
              <span className={scoreAValue >= scoreBValue ? "winner" : ""}>{scoreAValue}%</span>
              <span className={scoreBValue > scoreAValue ? "winner" : ""}>{scoreBValue}%</span>
            </div>
          );
        })}
        {compareResult?.summary && <p className="v2-judge-summary">{compareResult.summary}</p>}
        <CompareBiasNote biasMitigation={compareBiasMitigation} />
        {compareWarning && <p className="v2-note warn">{compareWarning}</p>}
        {compareError && <p className="v2-note error">{compareError}</p>}
        {isComparing && (
          <V2MiniPipeline
            eyebrow="AI Compare"
            title="Judging both prompts..."
            steps={["Audit A", "Audit B", "Score", "Pick winner"]}
          />
        )}
        <div className="v2-actions wrap">
          <button className="v2-btn primary" disabled={!compareA.trim() || !compareB.trim() || isComparing} onClick={comparePrompts}><Sparkles size={16} />{isComparing ? "Comparing..." : "Run AI Compare"}</button>
          <button className="v2-btn primary" disabled={!winnerPrompt?.trim()} onClick={() => { setNarrative(winnerPrompt); setActive("Builder"); }}><PenLine size={16} />Use winner</button>
          <button className="v2-btn" disabled={!mergedPrompt?.trim()} onClick={() => { setNarrative(mergedPrompt); setActive("Builder"); }}><Wand2 size={16} />Use merged</button>
          <V2ActionBtn className="v2-btn" disabled={!winnerPrompt?.trim()} onAction={() => savePrompt(winnerPrompt, "Compare winner")} successLabel={<><Check size={16} />Saved</>}>
            <Save size={16} />Save
          </V2ActionBtn>
          <V2ActionBtn className="v2-btn" disabled={!winnerPrompt?.trim()} onAction={() => copyText(winnerPrompt)} successLabel={<><Check size={16} />Copied</>}>
            <Clipboard size={16} />Copy
          </V2ActionBtn>
        </div>
        {compareResult?.recommendations?.length > 0 && (
          <div className="v2-judge-recs">
            {compareResult.recommendations.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
          </div>
        )}
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
    qualityMode,
    setQualityMode,
    modelSettings,
    setModelSettings,
    saveModelSettings,
    settingsSavedAt,
    providerTestStatus,
    isTestingProvider,
    testProvider,
    accountState,
    setAccountState,
    authStatus,
    authError,
    isAuthBusy,
    isSupabaseConfigured,
    membershipPlans,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    billingBusy,
    billingMessage,
    upgradeViaPlayBilling,
    playBillingReady,
    playBillingHint,
  } = props;
  const fallbackModels = modelSettings.fallbackModels
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const providerReady = Boolean(settingsStatus?.ok && settingsStatus?.ai);
  const activeProfile = modeProfiles[generationMode] || modeProfiles.Balanced;
  const updateModelSetting = (key, value) => setModelSettings((settings) => ({ ...settings, [key]: value }));
  const quotaPercent = Math.min(100, Math.round(((accountState.quotaUsed || 0) / Math.max(1, accountState.quotaLimit || 1)) * 100));
  return (
    <V2PublicSettings
      {...props}
      activeProfile={activeProfile}
      fallbackModels={fallbackModels}
      providerReady={providerReady}
      quotaPercent={quotaPercent}
      updateModelSetting={updateModelSetting}
    />
  );

}

function V2PublicSettings(props) {
  const {
    accountState,
    setAccountState,
    membershipPlans,
    authStatus,
    authError,
    isAuthBusy,
    isSupabaseConfigured,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    library,
    customTemplates,
    category,
    setCategory,
    tone,
    setTone,
    model,
    setModel,
    outputType,
    setOutputType,
    qualityMode,
    setQualityMode,
    fallbackModels,
    providerReady,
    quotaPercent,
    billingBusy,
    billingMessage,
    upgradeViaPlayBilling,
    playBillingReady,
    playBillingHint,
    libraryLimit,
    customTemplateLimit,
    entitlements,
  } = props;
  const [section, setSection] = useState("Account");
  const [authMode, setAuthMode] = useState("sign-in");
  const [authEmail, setAuthEmail] = useState(accountState.email || "");
  const [authName, setAuthName] = useState(accountState.name || "");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isAdmin = accountState.role === "admin";
  const sections = [
    ["Account", User],
    ["Membership", CreditCard],
    ["Prompt Defaults", SlidersHorizontal],
    ["Data & Privacy", ShieldCheck],
    ["Support", LifeBuoy],
    ...(isAdmin ? [["Admin Console", KeyRound]] : []),
  ];
  const copyData = () => {
    const data = { account: accountState, library, customTemplates, exportedAt: new Date().toISOString() };
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2)).catch(() => {});
  };
  const clearProfile = () => {
    setAccountState(defaultAccountState);
    localStorage.removeItem("promptlab-account");
  };
  const submitSignIn = () => signInWithPassword(authEmail.trim(), authPassword);
  const submitSignUp = () => signUpWithPassword(authEmail.trim(), authPassword, authName.trim());

  return (
    <div className="v2-screen v2-settings-screen">
      <V2PageIntro
        eyebrow="User Settings"
        title="Account, membership, and prompt defaults."
        copy="Manage login, plan, quota, default prompt style, saved data, and support."
      >
        <div className="v2-hero-status">
          <span>{accountState.email ? "Signed in" : "Session"}</span>
          <strong>{accountState.plan}</strong>
          <small>{accountState.email || "Guest mode"}</small>
        </div>
      </V2PageIntro>

      <div className="v2-settings-tabs" role="tablist" aria-label="Settings sections">
        {sections.map(([name, Icon]) => (
          <button key={name} className={section === name ? "active" : ""} onClick={() => setSection(name)}>
            <Icon size={16} />
            <span>{name}</span>
          </button>
        ))}
      </div>

      {section === "Account" && (
        <section className="v2-settings-grid public">
          <div className="v2-card v2-settings-card v2-account-card">
            <div className="v2-card-head">
              <div>
                <h2>Profile</h2>
                <p>Sign in to keep account, plan, and saved work tied to your email.</p>
              </div>
              <span className={`v2-health ${accountState.email ? "ready" : ""}`}>{accountState.email ? "Signed in" : "Guest"}</span>
            </div>
            <div className="v2-account-grid">
              <label>
                <span>Email</span>
                <input className="v2-input" value={accountState.userId ? accountState.email : authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="user@email.com" disabled={Boolean(accountState.userId)} />
              </label>
              {accountState.userId && (
                <label>
                  <span>Name</span>
                  <input className="v2-input" value={accountState.name} placeholder="Member name" disabled />
                </label>
              )}
              {!accountState.userId && (
                <>
                  <div className="v2-auth-mode" role="tablist" aria-label="Authentication mode">
                    <button className={authMode === "sign-in" ? "active" : ""} onClick={() => setAuthMode("sign-in")}>Sign In</button>
                    <button className={authMode === "create" ? "active" : ""} onClick={() => setAuthMode("create")}>Create Account</button>
                  </div>
                  {authMode === "create" && (
                    <label>
                      <span>Name</span>
                      <input className="v2-input" value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Your name" />
                    </label>
                  )}
                  <label className="v2-account-password">
                    <span>Password</span>
                    <div className="v2-password-field">
                      <input className="v2-input" type={showPassword ? "text" : "password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Minimum 6 characters" />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </label>
                </>
              )}
            </div>
            <div className="v2-auth-status">
              <span>{isSupabaseConfigured ? authStatus : "Supabase env is not configured"}</span>
              {authError && <strong>{authError}</strong>}
            </div>
            <div className="v2-actions wrap">
              {accountState.userId ? (
                <button className="v2-btn" onClick={signOut} disabled={isAuthBusy}>Sign Out</button>
              ) : (
                <>
                  {authMode === "sign-in" ? (
                    <button className="v2-btn primary" onClick={submitSignIn} disabled={isAuthBusy || !authEmail || authPassword.length < 6}>Sign In</button>
                  ) : (
                    <button className="v2-btn primary" onClick={submitSignUp} disabled={isAuthBusy || !authEmail || !authName || authPassword.length < 6}>Create Account</button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="v2-card v2-settings-card">
            <div className="v2-card-head">
              <div>
                <h2>Session Summary</h2>
                <p>Current account limits and saved prompt counts.</p>
              </div>
              <User size={20} />
            </div>
            <div className="v2-info-grid">
              <V2Info label="Library" value={`${library.length}/${libraryLimit} saved`} />
              <V2Info label="Templates" value={`${customTemplates.length}/${customTemplateLimit} custom`} />
            </div>
            <p className="v2-note">Plan &amp; upgrade: open the <strong>Membership</strong> tab.</p>
          </div>
        </section>
      )}

      {section === "Membership" && (
        <section className="v2-settings-grid public">
          <div className="v2-card v2-settings-card v2-account-card">
            <div className="v2-card-head">
              <div>
                <h2>Membership</h2>
                <p>Plans, usage, and upgrade path. Model provider controls stay admin-only.</p>
              </div>
              <span className="v2-score-badge">{accountState.plan}</span>
            </div>
            {!playBillingReady && playBillingHint?.message && (
              <p className="v2-note warn">{playBillingHint.message}</p>
            )}
            {playBillingReady && (
              <p className="v2-note">{playBillingHint.message}</p>
            )}
            <div className="v2-plan-grid premium">
              {Object.entries(membershipPlans).map(([plan, info]) => {
                const isCurrent = accountState.plan === plan;
                const canUpgrade = plan !== "Free" && !isCurrent;
                return (
                  <button
                    key={plan}
                    className={`v2-plan-card ${isCurrent ? "active" : ""} ${plan === "Business" && !isCurrent ? "recommended" : ""} ${canUpgrade ? "upgrade" : ""}`}
                    type="button"
                    disabled={isCurrent || billingBusy || plan === "Free"}
                    onClick={() => {
                      if (canUpgrade) upgradeViaPlayBilling(plan);
                    }}
                  >
                    <span>{plan}</span>
                    <strong>{info.price}</strong>
                    <small>{info.detail}</small>
                    {info.highlights?.length > 0 && (
                      <ul className="v2-plan-highlights">
                        {info.highlights.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                    <em>
                      {isCurrent
                        ? "Current plan"
                        : plan === "Free"
                          ? "Default tier"
                          : playBillingReady
                            ? "Tap to buy on Play"
                            : "Tap for setup steps"}
                    </em>
                  </button>
                );
              })}
            </div>
            {billingMessage && <p className="v2-note warn">{billingMessage}</p>}
            {billingBusy && <p className="v2-note">Processing Play purchase…</p>}
            <div className="v2-quota-meter">
              <div><span>Quota</span><strong>{(accountState.quotaUsed / 1000).toFixed(1)}k / {(accountState.quotaLimit / 1000).toFixed(0)}k tokens</strong></div>
              <i><b style={{ width: `${quotaPercent}%` }} /></i>
              <small>Resets {accountState.quotaReset}. Usage updates after Builder, Compare, and Optimizer runs.</small>
              {import.meta.env.VITE_APP_BUILD && (
                <small className="v2-build-id">Build {import.meta.env.VITE_APP_BUILD}</small>
              )}
            </div>
          </div>
        </section>
      )}

      {section === "Prompt Defaults" && (
        <section className="v2-settings-grid public">
          <div className="v2-card v2-settings-card v2-account-card">
            <div className="v2-card-head">
              <div>
                <h2>Prompt Defaults</h2>
                <p>Personalize Builder defaults without exposing infrastructure settings.</p>
              </div>
              <SlidersHorizontal size={20} />
            </div>
            <V2ChipGroup label="Default category" options={categories} value={category} onChange={setCategory} />
            <V2ChipGroup label="Default tone" options={tones} value={tone} onChange={setTone} />
            <V2ChipGroup label="Preferred AI" options={models} value={model} onChange={setModel} />
            <V2ChipGroup label="Default output" options={outputTypes} value={outputType} onChange={setOutputType} />
          </div>

          <div className="v2-card v2-settings-card">
            <div className="v2-card-head">
              <div>
                <h2>Quality Preference</h2>
                <p>Simple quality setting users can understand.</p>
              </div>
              <Gauge size={20} />
            </div>
            <div className="v2-mode-grid two">
              <button className={qualityMode === "standard" ? "active" : ""} onClick={() => setQualityMode && setQualityMode("standard")}>
                <span>Quality</span>
                <strong>Standard</strong>
                <small>Fast single pass for daily work.</small>
              </button>
              <button className={qualityMode === "premium" ? "active" : ""} onClick={() => setQualityMode && setQualityMode("premium")}>
                <span>Quality</span>
                <strong>Premium</strong>
                <small>Critique and refine pass for sharper output.</small>
              </button>
            </div>
          </div>
        </section>
      )}

      {section === "Data & Privacy" && (
        <section className="v2-settings-grid public">
          <div className="v2-card v2-settings-card">
            <div className="v2-card-head">
              <div>
                <h2>Library & Data</h2>
                <p>Controls for local browser data and future account sync.</p>
              </div>
              <Database size={20} />
            </div>
            <div className="v2-info-grid">
              <V2Info label="Saved prompts" value={library.length} />
              <V2Info label="Custom templates" value={customTemplates.length} />
            </div>
            <div className="v2-actions wrap">
              <button className="v2-btn primary" onClick={copyData}><Clipboard size={16} />Copy My Data</button>
              {entitlements?.teamLibraryBundle && (
                <button
                  className="v2-btn"
                  type="button"
                  onClick={() => {
                    const bundle = {
                      type: "promptlab-team-library",
                      plan: accountState.plan,
                      exportedAt: new Date().toISOString(),
                      library,
                      customTemplates,
                    };
                    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `promptlab-team-backup-${Date.now()}.json`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Archive size={16} />
                  Team backup JSON
                </button>
              )}
              <button className="v2-btn" onClick={clearProfile}><Trash2 size={16} />Clear Local Profile</button>
            </div>
            <p className="v2-small">
              {entitlements?.teamLibraryBundle
                ? "Business: share the Team backup JSON file with teammates (manual import)."
                : "Full account deletion should be handled by the auth/database backend once login is live."}
            </p>
          </div>

          <div className="v2-card v2-settings-card">
            <div className="v2-card-head">
              <div>
                <h2>Privacy Controls</h2>
                <p>Plain-language policy points for files, AI processing, and saved prompts.</p>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="v2-runbook-row"><span>1</span><p>Uploaded files are used to generate prompts and are not shared with other users.</p></div>
            <div className="v2-runbook-row"><span>2</span><p>Account quota and membership sync when you are signed in.</p></div>
            <div className="v2-runbook-row"><span>3</span><p>Read the full privacy policy before using production builds.</p></div>
            <div className="v2-actions wrap">
              <a className="v2-btn primary" href="/privacy" target="_blank" rel="noreferrer"><ShieldCheck size={16} />Privacy Policy</a>
              <a className="v2-btn" href="mailto:support@promptlab.app"><LifeBuoy size={16} />Request data deletion</a>
            </div>
          </div>
        </section>
      )}

      {section === "Support" && (
        <section className="v2-settings-grid public">
          <div className="v2-card v2-settings-card">
            <div className="v2-card-head">
              <div>
                <h2>Support</h2>
                <p>Help users report issues without exposing operational controls.</p>
              </div>
              <LifeBuoy size={20} />
            </div>
            <div className="v2-runbook-row"><span>1</span><p>Report generation errors with a screenshot and prompt category.</p></div>
            <div className="v2-runbook-row"><span>2</span><p>For billing issues, include the Google Play order ID after Play Billing is connected.</p></div>
            <div className="v2-runbook-row"><span>3</span><p>For data requests, use the account email shown in Profile.</p></div>
          </div>

          <div className="v2-card v2-settings-card">
            <div className="v2-card-head">
              <div>
                <h2>About PromptLab</h2>
                <p>PromptLab helps turn rough ideas, files, and screenshots into structured prompts that are clearer, safer, and ready to run.</p>
              </div>
              <Rocket size={20} />
            </div>
            <div className="v2-info-grid">
              <V2Info label="Builder" value="Intent-aware prompt generator" />
              <V2Info label="Optimizer" value="Rewrite, score, and strengthen old prompts" />
              <V2Info label="Templates" value="Production-ready patterns for common work" />
              <V2Info label="Library" value="Save, compare, copy, and reuse your best prompts" />
            </div>
          </div>
        </section>
      )}

      {section === "Admin Console" && isAdmin && (
        <V2AdminSettings {...props} fallbackModels={fallbackModels} providerReady={providerReady} />
      )}
    </div>
  );
}

function V2AdminSettings(props) {
  const {
    settingsStatus,
    refreshHealth,
    apiBase,
    generationMode,
    setGenerationMode,
    modelSettings,
    setModelSettings,
    saveModelSettings,
    publishGlobalModelSettings,
    loadAdminRuntimeConfig,
    globalPublishBusy,
    globalPublishAt,
    globalConfigSource,
    settingsSavedAt,
    providerTestStatus,
    isTestingProvider,
    testProvider,
    fallbackModels,
    providerReady,
  } = props;
  const activeProfile = modeProfiles[generationMode] || modeProfiles.Balanced;
  const updateModelSetting = (key, value) => setModelSettings((settings) => ({ ...settings, [key]: value }));

  return (
    <section className="v2-settings-grid">
      <div className="v2-card v2-settings-card v2-account-card">
        <div className="v2-card-head">
          <div>
            <h2>Admin Console</h2>
            <p>Publish model routing for every user on production (Vercel). API keys stay in Vercel env vars.</p>
          </div>
          <span className={`v2-health ${providerReady ? "ready" : ""}`}>{providerReady ? "Ready" : "Offline"}</span>
        </div>
        <div className="v2-info-grid">
          <V2Info label="API Base" value={apiBase || "Same-origin Vercel API"} />
          <V2Info label="Live source" value={globalConfigSource === "published" ? "Published (Supabase)" : "Vercel env defaults"} />
          <V2Info label="Last Active Model" value={settingsStatus?.model || modelSettings.primaryModel || "-"} />
          <V2Info label="OCR Model" value={modelSettings.ocrModel || settingsStatus?.ocrModel || "-"} />
        </div>
        {globalPublishAt && <p className="v2-note">Last published: {globalPublishAt}</p>}
      </div>

      <div className="v2-card v2-settings-card">
        <div className="v2-card-head">
          <div>
            <h2>Generation Mode</h2>
            <p>Choose how aggressively PromptLab waits before using fallback models.</p>
          </div>
          <Gauge size={20} />
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
      </div>

      <div className="v2-card v2-settings-card">
        <div className="v2-card-head">
          <div>
            <h2>Provider & Endpoint</h2>
            <p>Changes apply to all users after you publish. Keys are not stored in the database.</p>
          </div>
          <button className="v2-btn" onClick={() => setModelSettings(defaultModelSettings)}>Reset form</button>
        </div>
        <V2ChipGroup label="Provider" options={providerOptions} value={modelSettings.provider} onChange={(item) => updateModelSetting("provider", item)} />
        <label className="v2-label">Base URL / Endpoint</label>
        <input className="v2-input" value={modelSettings.baseUrl} onChange={(event) => updateModelSetting("baseUrl", event.target.value)} placeholder="https://openrouter.ai/api/v1" />
        <label className="v2-label">API Key Override, Optional</label>
        <input className="v2-input" type="password" value={modelSettings.apiKey} onChange={(event) => updateModelSetting("apiKey", event.target.value)} placeholder="Leave empty to use Vercel Environment Variables" />
        <p className="v2-small">Production keys should live in Vercel Environment Variables. Browser overrides are for admin testing only.</p>
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
          <button className="v2-btn primary" onClick={publishGlobalModelSettings} disabled={globalPublishBusy}>
            <Rocket size={16} />
            {globalPublishBusy ? "Publishing…" : "Publish globally"}
          </button>
          <button className="v2-btn" onClick={saveModelSettings} disabled={globalPublishBusy}><Save size={16} />Save local draft</button>
          <button className="v2-btn primary" onClick={testProvider} disabled={isTestingProvider || globalPublishBusy}><Zap size={16} />{isTestingProvider ? "Testing..." : "Test Provider"}</button>
          <button className="v2-btn" onClick={refreshHealth} disabled={globalPublishBusy}><Gauge size={16} />Health</button>
          <button className="v2-btn" onClick={loadAdminRuntimeConfig} disabled={globalPublishBusy}><Database size={16} />Reload published</button>
        </div>
        <p className="v2-small">Run <code>supabase/phase-5-runtime-config.sql</code> once if publish returns a database error.</p>
        {isTestingProvider && (
          <V2MiniPipeline eyebrow="Provider test" title="Checking model route..." steps={["Endpoint", "Auth", "Model", "Response"]} />
        )}
        {settingsSavedAt && <p className="v2-note">Local draft saved at {settingsSavedAt}</p>}
        {providerTestStatus && <p className="v2-note warn">{providerTestStatus}</p>}
      </div>
    </section>
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
    <nav className="bottom-nav v2-bottom-nav">
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
    Builder: ["Best Prompts for AI", "Turn raw ideas, files, and screenshots into precise instructions for Claude, ChatGPT, Gemini, and creative models."],
    Optimizer: ["Polish Old Prompts into Sharper Instructions", "Strengthen scope, output, constraints, and tone without changing the original goal."],
    Templates: ["Template Gallery for Serious Work", "Start from proven patterns for apps, PPTs, Word reports, research, coding, visuals, and content."],
    Library: ["Prompt Archive", "Save, edit, compare, and reuse prompts that already work."],
    Compare: ["A/B Lab for Better Prompts", "Compare structure, context, output format, and failure risk before sending a prompt to AI."],
    Settings: ["AI Model Command Center", "Tune generation mode, check the provider, monitor fallback, and keep the engine ready."],
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
          <span>Attach images, screenshots, or files</span>
          <strong>Task photos, presentation screens, PDF, PPT, DOC, TXT. Images are read with OCR during generation.</strong>
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

function compactGenerationStatus(status, source, modelName) {
  const route = statusLabel(status, source);
  const model = String(modelName || "").trim();
  if (!model || model.toLowerCase() === route.toLowerCase()) return route;
  if (route === "Local draft" && model === "Local draft") return "Local draft";
  return `${route} · ${model}`;
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
          <p>Structure, context, format, and constraints are checked before the prompt is used.</p>
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
          <small>Role, goal, and output are readable.</small>
        </div>
        <div>
          <span>02</span>
          <strong>Guardrails active</strong>
          <small>Format and constraints are locked.</small>
        </div>
        <div>
          <span>03</span>
          <strong>Export ready</strong>
          <small>Copy, DOCX, and PPTX are ready.</small>
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
        <div><span>After</span><p>Role, goal, tone, format, constraints, and attachment context are separated clearly.</p></div>
      </div>
      <div className="delivery-pack">
        <div>
          <span>Delivery Pack</span>
          <strong>Take the prompt as a working file</strong>
          <p>DOCX/PPTX contains the final prompt for Claude, ChatGPT, Gemini, Grok, or another model.</p>
        </div>
        <div className="delivery-actions">
          <button className="secondary-button" onClick={() => copyText(prompt)}><Clipboard size={18} />Copy</button>
          <button className="secondary-button" onClick={() => savePrompt(prompt)}><Archive size={18} />Save</button>
          <button className="secondary-button" onClick={() => exportFile("docx", prompt, narrative)}><FileText size={18} />DOCX</button>
          <button className="secondary-button" onClick={() => exportFile("pptx", prompt, narrative)}><BookOpenText size={18} />PPTX</button>
        </div>
        <p className="delivery-note">
          {exportStatus || "Note: this export saves the prompt; it does not automatically create the final report."}
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
  const [rawPrompt, setRawPrompt] = useState("Create a stronger prompt for Instagram content selling milk coffee.");
  const [mode, setMode] = useState("Clearer");
  const beforeScore = scorePrompt(rawPrompt);
  const result = optimizerResult || buildLocalOptimizedPrompt(rawPrompt, mode, "Target AI", "Professional");
  const afterScore = scoreOptimizedPrompt(rawPrompt, result);

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
        {visibleLibrary.length === 0 && <p className="empty-state">No matching prompts yet.</p>}
      </div>
      <div className="result-panel">
        {currentItem ? (
          <>
            <label className="field-label">Title</label>
            <input className="text-input" value={currentItem.title} onChange={(event) => updateLibraryItem(currentItem.id, { title: event.target.value })} />
            <div className="library-meta-grid">
              <div>
                <label className="field-label">Folder / Output</label>
                <input className="text-input" value={currentItem.folder} onChange={(event) => updateLibraryItem(currentItem.id, { folder: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Tag / Category</label>
                <input className="text-input" value={currentItem.tag} onChange={(event) => updateLibraryItem(currentItem.id, { tag: event.target.value })} />
              </div>
            </div>
            <label className="field-label">Prompt Content</label>
            <textarea value={currentItem.content} onChange={(event) => updateLibraryItem(currentItem.id, { content: event.target.value })} />
            <div className="library-meta-note">
              <span>Created {formatDate(currentItem.createdAt)}</span>
              <span>Updated {formatDate(currentItem.updatedAt || currentItem.createdAt)}</span>
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
        ) : <p>No saved prompts.</p>}
      </div>
    </section>
  );
}

function compareAdvice(prompt, score) {
  const checks = [
    { label: "Clear role", ok: /role|bertindaklah|anda adalah|act as/i.test(prompt), fix: "Add a specific role at the start of the prompt." },
    { label: "Complete context", ok: /context|konteks|latar belakang|berdasarkan|lampiran/i.test(prompt), fix: "Explain the source context, audience, and usage situation." },
    { label: "Output format", ok: /format|output|struktur|tabel|json|markdown|slide|dokumen/i.test(prompt), fix: "Define the answer format and order." },
    { label: "Constraints", ok: /constraint|batasan|jangan|harus|maksimal|minimal|wajib/i.test(prompt), fix: "Add limits for length, tone, scope, or must-have requirements." },
    { label: "Completion criteria", ok: /acceptance|checklist|validasi|kriteria|berhasil|selesai/i.test(prompt), fix: "Add a quality checklist or acceptance criteria." },
  ];
  const missing = checks.filter((item) => !item.ok).map((item) => item.fix);
  const summary = score.score >= 85
    ? "Ready to use. The next iteration only needs small detail polish."
    : score.score >= 70
      ? "Solid, but it can still be made more explicit."
      : "Still likely to produce generic output. Add a stronger role, context, format, and constraints.";

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
          <p>Test two prompt versions before sending them to AI. Choose the clearest, most complete, least ambiguous version.</p>
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
  qualityMode,
  setQualityMode,
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
  const activeProfile = modeProfiles[generationMode] || modeProfiles.Balanced;
  const updateModelSetting = (key, value) => setModelSettings((settings) => ({ ...settings, [key]: value }));

  return (
    <section className="content-grid">
      <div className="builder-panel">
        <div className="panel-heading">
          <div>
            <h2>LLM Settings</h2>
            <p>Configure provider, endpoint, model, timeout, and fallback behavior for PromptLab generation.</p>
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
          <span>Active mode</span>
          <strong>{generationMode}</strong>
          <p>{activeProfile.bestFor}</p>
        </div>
        <div className="settings-mode" style={{ marginTop: 12 }}>
          <span>Premium Quality Mode</span>
          <strong>{qualityMode === "premium" ? "ON · critique+refine pass" : "OFF · single pass"}</strong>
          <p>
            {qualityMode === "premium"
              ? "Each prompt will be audited by a critic and refined again. Slower and more token-heavy, but sharper for small or free models."
              : "Generate in a single pass without the critique step. Fast and token-efficient."}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className={qualityMode === "standard" ? "selected" : ""}
              onClick={() => setQualityMode("standard")}
            >
              Standard
            </button>
            <button
              className={qualityMode === "premium" ? "selected" : ""}
              onClick={() => setQualityMode("premium")}
            >
              Premium
            </button>
          </div>
        </div>
        <div className="settings-grid">
          <InfoBox label="API Base" value={apiBase} />
          <InfoBox label="Provider" value={settingsStatus?.provider || modelSettings.provider || "-"} />
          <InfoBox label="Last active model" value={settingsStatus?.model || "-"} />
          <InfoBox label="Active OCR" value={modelSettings.ocrModel || settingsStatus?.ocrModel || "-"} />
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
          <label className="field-label">API key override, optional</label>
          <input
            className="text-input"
            type="password"
            value={modelSettings.apiKey}
            onChange={(event) => updateModelSetting("apiKey", event.target.value)}
            placeholder="Leave empty to use Vercel ENV"
          />
          <p className="settings-help">Leave empty to use the backend API key from Vercel Environment Variables. If filled, the key is stored in this browser.</p>
        </div>
        <div className="model-settings-panel">
          <div className="section-title">
            <h2>Model Routing</h2>
            <span className="status-pill">{modelSettings.timeoutMs || "auto"} ms</span>
          </div>
          <label className="field-label">Primary model</label>
          <input
            className="text-input"
            value={modelSettings.primaryModel}
            onChange={(event) => updateModelSetting("primaryModel", event.target.value)}
            placeholder="deepseek/deepseek-v4-flash"
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
          <label className="field-label">Fallback models, one model per line</label>
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
        {settingsSavedAt && <p className="provider-test-note">Settings last saved: {settingsSavedAt}</p>}
        {providerTestStatus && <p className="provider-test-note">{providerTestStatus}</p>}
      </div>
      <div className="result-panel">
        <div className="panel-heading">
          <div>
            <h2>Runbook</h2>
            <p>Short guide for slow generations or local fallback responses.</p>
          </div>
          <Settings size={22} />
        </div>
        <div className="runbook-list">
          <div><span>1</span><p>Use <strong>Patient Free</strong> for large files, OCR, or queued free models.</p></div>
          <div><span>2</span><p>If local fallback keeps appearing, press <strong>Test Provider</strong> and check the backend API.</p></div>
          <div><span>3</span><p>Change the key/model in <strong>.env</strong>, then restart the API.</p></div>
          <div><span>4</span><p>For phone access, open the Tailscale frontend and keep the local backend running.</p></div>
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

createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
