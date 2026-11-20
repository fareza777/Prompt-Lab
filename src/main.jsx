import React, { Component, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Clipboard, Settings, User, X } from "lucide-react";
import "./ui/tokens.css";
import "./ui/base.css";
import "./ui/shell.css";
import Shell from "./ui/Shell.jsx";
import { detectLanguage } from "./ui/i18n.js";
import { createContentRecord, normalizeContentRecord } from "./ui/contentRecord.js";
import { toDateKey } from "./ui/resultCalendar.js";
import {
  localized as localizedTemplateName,
  templateSubjectField,
} from "./workTemplates.js";
import { createFinishedResult as runResultFirst } from "./ui/resultFlow.js";
import {
  detectDeliverableProfile,
  validateFinishedOutput,
} from "./deliverableProfiles.js";
/* The marketing page only renders for the `/` route; keeping it out of the
   app shell's initial graph buys back real first-paint budget. */
const LandingPage = React.lazy(() => import("./LandingPage.jsx"));
import {
  CATEGORIES as categories,
  TONES as tones,
  MODELS as models,
  OUTPUT_TYPES as outputTypes,
} from "./ui/options.js";
import { defaultModelSettings, generationModes } from "./modelSettings.js";
import {
  scorePromptForCompare,
  getLocalPromptRisks,
  createLibraryItem,
  appendPromptVersion,
  getPromptVersions,
} from "./promptEngine/index.js";
import { consumeGenerateSse } from "./generateStreamClient.js";
import {
  getLanguageLockInstruction,
  getLanguageMeta,
  resolveOutputLanguage,
} from "./promptLanguage.js";
import {
  canExportFormat,
  canUseFeature,
  getEntitlements,
  MEMBERSHIP_MARKETING,
  upgradeMessageForFeature,
} from "./planEntitlements.js";
import { buildPhasedAppDeliveryInstruction } from "./phasedAppDelivery.js";
import { buildStructuredAuditInstruction } from "./structuredAuditDelivery.js";
import { buildImageVideoPromptAddon } from "./imageVideoPromptDelivery.js";
import {
  buildMermaidDeliveryAddon,
  defaultDiagramNarrative,
  detectDiagramIntent,
} from "./mermaidDelivery.js";
import { API_MSG } from "./apiUserMessages.js";
import { installNativeAppLinkHandler } from "./installedApp.js";
import { purgeLegacyServiceWorkers, repairStuckLocalProfile } from "./bootRecovery.js";
import { isLikelyAndroidTwa, isNativeAndroidApp } from "./platform.js";
import { scorePrompt } from "./promptScore.js";
import { captureFocusReturn } from "./accessibilityInteractions.js";
import { dismissStartupSplash, installSplashSafetyNet, markStartupSplashStarted } from "./startupSplash";

/** Entitlement tier everyone gets now that there are no accounts or billing. */
const OPEN_PLAN = "Pro";

markStartupSplashStarted();
installSplashSafetyNet();
repairStuckLocalProfile();
purgeLegacyServiceWorkers();
installNativeAppLinkHandler();


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
const quotaDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function toDateOnly(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

function nextQuotaResetDate(from = new Date()) {
  const resetDate = new Date(from);
  resetDate.setDate(resetDate.getDate() + 30);
  return resetDate;
}

function parseQuotaResetDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const hasYear = /\b\d{4}\b/.test(raw) || /^\d{4}-\d{2}-\d{2}/.test(raw);
  const parsed = new Date(hasYear ? raw : `${raw}, ${new Date().getFullYear()}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isQuotaResetExpired(value) {
  const parsed = parseQuotaResetDate(value);
  return parsed ? toDateOnly(parsed) < toDateOnly() : false;
}

function resolveQuotaResetLabel(value) {
  const parsed = parseQuotaResetDate(value);
  if (parsed && toDateOnly(parsed) >= toDateOnly()) return quotaDateFormatter.format(parsed);
  return quotaDateFormatter.format(nextQuotaResetDate());
}

function formatQuotaSummary(account) {
  const used = Number(account?.quotaUsed || 0);
  if (account?.quotaUnlimited) return `${(used / 1000).toFixed(1)}k / Unlimited`;
  const limit = Math.max(1, Number(account?.quotaLimit || 1));
  return `${(used / 1000).toFixed(1)}k / ${(limit / 1000).toFixed(0)}k`;
}

function createDefaultAccountState() {
  return {
    userId: "",
    email: "",
    name: "",
    role: "user",
    plan: "Free",
    quotaUsed: 0,
    quotaLimit: 50000,
    quotaUnlimited: false,
    quotaReset: resolveQuotaResetLabel(),
    playBilling: "Not connected",
  };
}

const defaultAccountState = createDefaultAccountState();

const templates = [
  {
    title: "Document to Mermaid Diagram",
    category: "Business",
    model: "Claude",
    outputType: "Diagram",
    tone: "Professional",
    prompt:
      "Turn the attached document into a clear Mermaid diagram of the main process or structure, plus a short wiki-style summary.",
  },
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
    model: "Others",
    outputType: "Image Prompt",
    tone: "Creative",
    prompt:
      "Create a product hero image prompt: subject, material, composition, studio lighting, background, lens, color palette, negative prompt, aspect ratio 4:5, and Midjourney + Flux tuning notes.",
  },
  {
    title: "Cinematic Video Prompt",
    category: "Video AI",
    model: "Grok",
    outputType: "Video Prompt",
    tone: "Creative",
    prompt:
      "Create a 15-second vertical ad video prompt for a cold brew coffee brand: hook 0-2s, 4 scenes with timestamps, camera moves, lighting, motion speed, negative prompt, and Runway/Kling export notes.",
  },
  {
    title: "TikTok AI Video Shot List",
    category: "Video AI",
    model: "Grok",
    outputType: "Video Prompt",
    tone: "Casual",
    prompt:
      "Write a 12-second TikTok text-to-video prompt with shot list table (time | visual | camera | motion | audio), 9:16 ratio, viral hook, product demo beat, and brand-safe variant.",
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
    model: "Others",
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
    "Image AI": "AI image generation prompt director",
    "Video AI": "AI video generation prompt director",
  };
  return roles[category] || "professional prompt engineer";
}

function inferIntentBlueprint(narrative, category, outputType, attachments = []) {
  const text = `${narrative || ""} ${category || ""} ${outputType || ""}`.toLowerCase();
  const asksGame = /\b(game|permainan|platformer|mario|phaser|side[\s-]?scroll|level\s*\d+|aksi\s*2d)\b/i.test(text);
  const asksApp =
    !/video\s*prompt|image\s*prompt/i.test(outputType || "") &&
    (/\b(app|aplikasi|dashboard|website|web app|sistem|software|frontend|backend|full-stack|fullstack|tool|tools|editor|builder|kasir|pos)\b/i.test(text) ||
      asksGame ||
      /application code/i.test(outputType));
  const asksPresentation = /\b(ppt|powerpoint|presentation|presentasi|slides?)\b/i.test(text);
  const asksDocument = /\b(word|docx|document|dokumen|report|laporan|proposal)\b/i.test(text);
  const asksImage = /\b(image|gambar|foto|photo|visual|midjourney|dall-?e|flux|image prompt)\b/i.test(text);
  const asksVideo = /\b(video|runway|kling|sora|pika|t2v|text to video|video prompt|reels|tiktok)\b/i.test(text);

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
      match: /\b(video prompt|text[\s-]?to[\s-]?video|t2v|runway|kling|sora|pika|generate video|ai video|minimax video|hailuo)\b/i,
      domain: "AI video generation",
      archetype: "text-to-video prompt with duration, shot list, camera moves, and negative prompt",
      expansions: [
        "duration & aspect ratio",
        "scene timestamps",
        "camera move per scene",
        "lighting & mood",
        "motion speed",
        "negative prompt",
        "platform export",
        "continuity notes",
      ],
    },
    {
      match: /\b(image prompt|text[\s-]?to[\s-]?image|t2i|midjourney|dall-?e|flux|stable diffusion)\b/i,
      domain: "AI image generation",
      archetype: "text-to-image prompt with 6-part formula and model tuning",
      expansions: ["subject", "environment", "lighting", "style", "composition", "negative prompt", "aspect ratio"],
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

  const deliverable = /video\s*prompt/i.test(outputType || "")
    ? "Text-to-video generation prompt"
    : /image\s*prompt/i.test(outputType || "")
      ? "Text-to-image generation prompt"
      : asksApp
    ? "Runnable application specification"
    : asksPresentation
      ? "Slide-by-slide presentation prompt"
      : asksDocument
        ? "Structured document prompt"
        : asksVideo
          ? "Text-to-video generation prompt"
          : asksImage
            ? "Text-to-image generation prompt"
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
  model = "Claude",
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
${file.excerpt ? file.excerpt : "File preview is not available here. Using file metadata as context."}
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

${buildImageVideoPromptAddon({ narrative: cleanNarrative, category, outputType, modelTarget: model, outputLanguage: langMeta.code })}

${buildMermaidDeliveryAddon({ narrative: cleanNarrative, category, outputType, outputLanguage: langMeta.code })}

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
      throw new Error("The upload is too large for the server. AI Work Studio will send file metadata only.");
    }
    throw new Error(shortText || "Server returned a non-JSON response.");
  }
}

/** Matches RUN_MAX_ATTACHMENTS on the server; more are rejected by multer. */
const TEMPLATE_UPLOAD_LIMIT = 8;

/**
 * The attached photographs as data URLs, for embedding in the Word export.
 *
 * The slot label travels with each one so a Before & After report can lay the
 * pair out in two columns rather than as an undifferentiated stack.
 */
async function readAttachmentImages(attachments = []) {
  const photos = attachments.filter(
    (item) => item?.file && String(item.type || "").startsWith("image/")
  );
  if (!photos.length) return [];

  let sending = photos;
  try {
    const { compressAttachmentImages } = await import("./compressImage.js");
    sending = await compressAttachmentImages(photos);
  } catch {
    sending = photos;
  }

  const read = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });

  const out = [];
  for (const item of sending.slice(0, TEMPLATE_UPLOAD_LIMIT)) {
    const dataUrl = await read(item.file);
    if (dataUrl) out.push({ dataUrl, slot: item.slot || "", name: item.name || "" });
  }
  return out;
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
  return raw.map((item, index) => {
    const source =
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
            ...item,
            id: item.id || `item-${index}-${Date.now()}`,
            title: item.title || "Untitled prompt",
            content: item.content || item.title || "",
            folder: item.folder || "General",
            tag: item.tag || "Prompt",
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || item.createdAt || Date.now(),
          };
    return normalizeContentRecord(source, index);
  });
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
      // Work-template fields. A record carrying `instruction` is one the user
      // wrote in the template editor; without these it would survive a reload
      // as an empty shell, because this normaliser drops unknown keys.
      instruction: item.instruction || "",
      sections: item.sections || "",
      fields: item.fields || "",
      blurb: item.blurb || "",
      needsAttachment: item.needsAttachment !== false,
      custom: true,
      createdAt: item.createdAt || Date.now(),
    }))
    .filter((item) => item.prompt.trim() || item.instruction.trim())
    .slice(0, getEntitlements("Business").customTemplateLimit);
}

function normalizeAccountState(raw) {
  if (!raw || typeof raw !== "object") return createDefaultAccountState();
  const plan = membershipPlans[raw.plan] ? raw.plan : "Free";
  const resetSource = raw.quotaResetAt || raw.quota_reset_at || raw.quotaReset;
  const quotaExpired = isQuotaResetExpired(resetSource);
  return {
    ...defaultAccountState,
    ...raw,
    plan,
    role: raw.role === "admin" ? "admin" : "user",
    quotaUnlimited: Boolean(raw.quotaUnlimited),
    quotaLimit: Number(raw.quotaLimit || membershipPlans[plan].quota || defaultAccountState.quotaLimit),
    quotaReset: resolveQuotaResetLabel(resetSource),
    quotaUsed: quotaExpired ? 0 : Number(raw.quotaUsed || 0),
  };
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

function buildPrompt(narrative, category, tone, model, outputType, attachments) {
  if (isClaudeTarget(model)) {
    return buildClaudePrompt({ narrative, category, tone, outputType, attachments, model });
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

${buildPhasedAppDeliveryInstruction(cleanNarrative, category, outputType, langMeta.code)}

${buildImageVideoPromptAddon({ narrative: cleanNarrative, category, outputType, modelTarget: model, outputLanguage: langMeta.code })}

${buildMermaidDeliveryAddon({ narrative: cleanNarrative, category, outputType, outputLanguage: langMeta.code })}`;
}

function buildLocalCompareResult(promptA, promptB) {
  const scoreA = scorePromptForCompare(promptA || "");
  const scoreB = scorePromptForCompare(promptB || "");
  const winner = scoreA.score > scoreB.score ? "A" : scoreB.score > scoreA.score ? "B" : "tie";
  return {
    evaluationMethod: "heuristic",
    winner,
    winner_label: winner === "A" ? "Prompt A" : winner === "B" ? "Prompt B" : "Tie",
    summary: winner === "tie" ? "Both prompts score similarly on structure and clarity." : `Prompt ${winner} reads stronger on structure and clarity.`,
    scores: {
      A: {
        clarity: scoreA.clarity,
        context: scoreA.context,
        format: scoreA.format,
        constraints: scoreA.constraints,
        risk: scoreA.risk,
        overall: scoreA.score,
      },
      B: {
        clarity: scoreB.clarity,
        context: scoreB.context,
        format: scoreB.format,
        constraints: scoreB.constraints,
        risk: scoreB.risk,
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

**Internal Optimizer Engine:** Apply ${optimizerBlueprint.domain}. Use this only as internal rewrite logic: ${optimizerBlueprint.archetype}.

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
    console.error("AI Work Studio render error", error);
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
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>AI Work Studio failed to load</h1>
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
  // A document is the most common thing people come here to produce. The old
  // default of "Application Code" shaped every unadjusted request — including a
  // marketing or academic one — into code.
  const [outputType, setOutputType] = useState("Word Document");
  // The canvas starts empty. Seeding it with a sample meant every user opened
  // the app to someone else's text they had to clear first; the placeholder
  // carries the example instead.
  const [narrative, setNarrative] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generationSource, setGenerationSource] = useState("local");
  const [generationModel, setGenerationModel] = useState("");
  const [generationStatus, setGenerationStatus] = useState("local");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  // v2 engine telemetry
  const [engineVersion, setEngineVersion] = useState("");
  const [evalDelta, setEvalDelta] = useState(null);
  const [piiFindings, setPiiFindings] = useState([]);
  const [compareBiasMitigation, setCompareBiasMitigation] = useState("");
  const [generationPhase, setGenerationPhase] = useState("idle");
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [actionToast, setActionToast] = useState("");
  const [search, setSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  // Orama hit ordering for the current query; null falls back to substring.
  const [searchHits, setSearchHits] = useState(null);
  const [semanticSearch, setSemanticSearch] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const commandPaletteRestoreFocus = React.useRef(() => {});
  const openCommandPalette = () => {
    commandPaletteRestoreFocus.current = captureFocusReturn(document);
    setCommandPaletteOpen(true);
  };
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
  const [settingsSavedAt, setSettingsSavedAt] = useState("");
  /** Output of running the prompt — the finished deliverable, not instructions. */
  const [runOutput, setRunOutput] = useState("");
  // Photos extracted from PDF/DOCX sources on the server remain available to
  // the later Word/PDF export even when the original picker had no standalone
  // image file to read in the browser.
  const [exportImages, setExportImages] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState("");
  // Template mode keeps the stream but stops painting it; this is what the
  // waiting screen shows instead, and it moves on real events only.
  const [templatePhase, setTemplatePhase] = useState("reading");
  const [optimizerResult, setOptimizerResult] = useState("");
  const [optimizerSource, setOptimizerSource] = useState("local");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizerError, setOptimizerError] = useState("");
  const [optimizerWarning, setOptimizerWarning] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [diagramExportOffer, setDiagramExportOffer] = useState(null);
  // Yjs-backed draft autosave: gated until hydration finishes so an empty
  // mount can't overwrite the stored draft.
  const [draftReady, setDraftReady] = useState(false);
  const [outputVersions, setOutputVersions] = useState([]);
  const lastVersionedOutput = React.useRef("");
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
      return createDefaultAccountState();
    }
  });

  // Native AdMob banner. There are no paid plans any more, so every user of the
  // Android app sees the single bottom banner.
  // The plugin stays a lazy chunk — it must never inflate the initial bundle.
  useEffect(() => {
    if (isNativeAndroidApp())
      import("./admob.js")
        .then((m) => m.syncNativeBanner("Free"))
        .catch(() => {});
  }, []);

  // Restore the Yjs-persisted workbench draft once, then keep autosaving it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const store = await import("./draftStore.js");
        await store.initDraftStore();
        const draft = store.readDraft();
        if (!cancelled && draft && !narrative && !runOutput && attachments.length === 0) {
          if (draft.narrative) setNarrative(draft.narrative);
          if (draft.category) setCategory(draft.category);
          if (draft.tone) setTone(draft.tone);
          if (draft.model) setModel(draft.model);
          if (draft.outputType) setOutputType(draft.outputType);
          if (draft.runOutput) {
            setRunOutput(draft.runOutput);
            lastVersionedOutput.current = draft.runOutput;
          }
          if (draft.attachments?.length) {
            setAttachments(await store.materializeAttachments(draft.attachments));
          }
        }
        if (!cancelled) setOutputVersions(store.listVersions());
      } catch {
        /* draft persistence is optional — keep the session usable without it */
      }
      if (!cancelled) setDraftReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave of the whole workbench draft into the Yjs doc, plus a
  // rolling version snapshot whenever the finished output changes.
  useEffect(() => {
    if (!draftReady) return undefined;
    const timer = window.setTimeout(() => {
      import("./draftStore.js")
        .then(async (store) => {
          store.writeDraft({
            narrative,
            category,
            tone,
            model,
            outputType,
            runOutput,
            attachments: attachments.map((item) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              kind: item.kind,
              sizeLabel: item.sizeLabel,
              excerpt: item.excerpt,
              slot: item.slot,
            })),
          });
          if (attachments.length) await store.saveAttachmentFiles(attachments);
          else await store.clearAttachmentFiles();
          if (!isRunning && runOutput && runOutput !== lastVersionedOutput.current) {
            if (store.recordVersion(runOutput)) {
              lastVersionedOutput.current = runOutput;
              setOutputVersions(store.listVersions());
            }
          }
        })
        .catch(() => {});
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draftReady, narrative, category, tone, model, outputType, runOutput, attachments, isRunning]);

  // Workspace search: Orama full-text index (lazy), then a Transformers.js
  // embedding re-rank fused in — silently stays lexical when the model can't
  // load (offline, old WebView, download blocked).
  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setSearchHits(null);
      setSemanticSearch(false);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const { searchWorkspace, mergeRankedLists } = await import("./workspaceSearch.js");
        const lexical = await searchWorkspace(library, query, { limit: 60 });
        // Lexical hits render immediately — the first semantic run downloads a
        // ~23 MB model, so holding the list until then looked like "0 saved".
        if (!cancelled) {
          setSearchHits(lexical.map((hit) => hit.id));
          setSemanticSearch(false);
        }
        try {
          const { rankSemantically } = await import("./semanticSearch.js");
          const semantic = await rankSemantically(query, lexical, library);
          if (!cancelled && semantic) {
            const ordered = mergeRankedLists(lexical, semantic);
            setSearchHits(ordered.map((hit) => hit.id));
            setSemanticSearch(true);
          }
        } catch {
          /* embeddings unavailable — lexical results stand */
        }
      } catch {
        if (!cancelled) setSearchHits(null);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, library]);

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
  // No accounts or billing: every feature is available to everyone. Cost is
  // bounded by the server-side rate limit instead of per-user quotas.
  const entitlements = getEntitlements(OPEN_PLAN);
  const libraryLimit = entitlements.libraryLimit;
  const customTemplateLimit = entitlements.customTemplateLimit;
  const maxAttachments = entitlements.maxAttachments;


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
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);



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
    setGenerationModel("");
    setGenerationStatus("local");
    setWarningMessage("");
    setExportImages([]);
  }, [narrative, category, tone, model, outputType, attachments.length]);

  useEffect(() => {
    refreshHealth();
  }, []);

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

  function savePrompt(contentOrPayload = prompt, titleSeed = narrative, meta = {}) {
    const payload =
      contentOrPayload && typeof contentOrPayload === "object"
        ? contentOrPayload
        : { contentType: "prompt", content: contentOrPayload };
    const contentType = payload.contentType === "output" ? "output" : "prompt";
    const content = String(payload.content || "").trim();
    if (!content) return false;
    const title = titleSeed.trim().split(/\s+/).slice(0, 8).join(" ") || "New prompt";

    if (contentType === "output") {
      const now = Date.now();
      const item = createContentRecord({
        id: globalThis.crypto?.randomUUID?.() || `${now}`,
        title,
        contentType: "output",
        request: narrative,
        prompt: generatedPrompt,
        output: content,
        folder: outputType,
        tag: category,
        score: scorePrompt(generatedPrompt).score,
        createdAt: now,
        updatedAt: now,
        meta: {
          source: generationSource || "server",
          model: generationModel || "",
        },
      });
      setLibrary((items) => [item, ...items].slice(0, libraryLimit));
      setSelectedLibraryId(item.id);
      flashAction("Saved to library");
      return true;
    }

    const existing = library.find((item) => item.id === selectedLibraryId);
    if (existing && String(existing.content || "").trim() !== String(content || "").trim()) {
      const updated = appendPromptVersion(existing, content, {
        source: meta.source || generationSource || "manual",
        score: scorePrompt(content).score,
        mode: meta.mode || null,
        note: meta.note || title,
      });
      updated.title = title;
      setLibrary((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedLibraryId(updated.id);
      flashAction(`Saved v${getPromptVersions(updated).length}`);
      return true;
    }

    const item = createLibraryItem({
      title,
      content,
      folder: outputType,
      tag: category,
      meta: {
        source: meta.source || generationSource || "manual",
        score: scorePrompt(content).score,
        mode: meta.mode || null,
      },
    });
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

  function clearComposer() {
    setNarrative("");
    setGeneratedPrompt("");
    setRunOutput("");
    setExportImages([]);
    setAttachments([]);
    setErrorMessage("");
    setWarningMessage("");
    setExportStatus("");
    import("./diagramSvgStore.js").then((m) => m.clearRenderedDiagramSvg()).catch(() => {});
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

    let effectiveOutputType = customOutputType;
    let effectiveNarrative = String(customNarrative || "").trim();
    if (detectDiagramIntent({ narrative: effectiveNarrative, outputType: effectiveOutputType })) {
      effectiveOutputType = "Diagram";
      if (effectiveOutputType !== outputType) setOutputType("Diagram");
    }
    if (effectiveOutputType === "Diagram" && !effectiveNarrative && attachments.length > 0) {
      effectiveNarrative = defaultDiagramNarrative(detectLanguage() === "en" ? "en" : "id");
      setNarrative(effectiveNarrative);
    }

    setIsGenerating(true);
    setErrorMessage("");
    setWarningMessage("");
    setGenerationPhase("drafting");
    setGeneratedPrompt("");

    try {
      const formData = new FormData();
      formData.append("narrative", effectiveNarrative);
      formData.append("category", category);
      formData.append("tone", tone);
      formData.append("model", model);
      formData.append("outputType", effectiveOutputType);
      formData.append("generationMode", generationMode);
      formData.append("qualityMode", qualityMode);
      formData.append("stream", "true");
      const uploadPlan = getAttachmentUploadPlan(attachments, apiBase);
      formData.append("attachmentManifest", JSON.stringify(buildAttachmentManifestForApi(attachments)));
      if (uploadPlan.sendRawFiles) {
        let filesToSend = attachments;
        try {
          const { compressAttachmentImages } = await import("./compressImage.js");
          filesToSend = await compressAttachmentImages(attachments);
        } catch {
          filesToSend = attachments;
        }
        filesToSend.forEach((item) => formData.append("attachments", item.file));
      }

      const authHeaders = {};
      let response = null;
      let lastNetworkError = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          response = await fetch(`${apiBase}/api/generate-prompt`, {
            method: "POST",
            headers: authHeaders,
            body: formData,
          });
          if (response.status === 502 || response.status === 503 || response.status === 504) {
            lastNetworkError = new Error("AI service is temporarily unavailable.");
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
              continue;
            }
          }
          break;
        } catch (networkError) {
          lastNetworkError = networkError;
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
            continue;
          }
        }
      }
      if (!response) throw lastNetworkError || new Error(API_MSG.backendUnavailableLocalPrompt);

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && response.ok) {
        const data = await consumeGenerateSse(response, {
          onPhase: (phase) => setGenerationPhase(phase.step || "drafting"),
          onChunk: (chunk) => {
            if (chunk.replace) setGeneratedPrompt(chunk.text || "");
            else setGeneratedPrompt((prev) => prev + (chunk.text || ""));
          },
        });
        setGeneratedPrompt(data.prompt || localPrompt);
        setGenerationSource(data.source || "server");
        setGenerationModel(data.model || "");
        setGenerationStatus(data.modelStatus || data.source || "server");
        setWarningMessage([uploadPlan.warning, data.warning].filter(Boolean).join(" "));
        setEngineVersion(data.engineVersion || "");
        setEvalDelta(data.evalDelta || null);
        setPiiFindings(Array.isArray(data.piiFindings) ? data.piiFindings : []);
        setGenerationPhase("done");
        return data.prompt || localPrompt;
      }

      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Failed to generate prompt.");

      setGeneratedPrompt(data.prompt || localPrompt);
      setGenerationSource(data.source || "server");
      setGenerationModel(data.model || "");
      setGenerationStatus(data.modelStatus || data.source || "server");
      setWarningMessage([uploadPlan.warning, data.warning].filter(Boolean).join(" "));
      setEngineVersion(data.engineVersion || "");
      setEvalDelta(data.evalDelta || null);
      setPiiFindings(Array.isArray(data.piiFindings) ? data.piiFindings : []);
      setGenerationPhase("done");
      return data.prompt || localPrompt;
    } catch (error) {
      const message = error.message || API_MSG.backendUnavailableLocalPrompt;
      const quotaOnly = /usage quota|quota exceeded|quota token|failed to record quota|too many ai requests|too many requests/i.test(message);
      setGeneratedPrompt(localPrompt);
      setGenerationSource("local");
      setGenerationModel("");
      setGenerationStatus(quotaOnly ? "local-quota-warning" : "local-error");
      if (quotaOnly) {
        setErrorMessage("");
        setWarningMessage(message);
        flashAction("Quota or rate limit");
      } else {
        setErrorMessage(message);
        flashAction("Showing preview");
      }
      setGenerationPhase("idle");
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

  /**
   * Executes the generated prompt and returns the finished content. This is
   * what turns the app's output from instructions-for-an-AI into the thing the
   * user actually wanted.
   */
  async function runPrompt(rawPrompt = prompt) {
    const text = String(rawPrompt || "").trim();
    if (!text) return null;

    setIsRunning(true);
    setRunError("");
    setExportImages([]);
    const resultId = globalThis.crypto?.randomUUID?.() || `result-${Date.now()}`;
    try {
      const effectiveOutputType = detectDiagramIntent({ narrative, outputType })
        ? "Diagram"
        : outputType;
      const authHeaders = {};
      // A direct run can summarize or diagram any supported upload. Keep
      // documents in the request so the server can extract their text and
      // render PDF/DOCX pages for the same vision path as photos.
      const outgoingAttachments = attachments.filter((item) => item?.file);
      const imageAttachments = outgoingAttachments.filter(
        (item) => String(item.type || "").startsWith("image/")
      );
      let visionFiles = imageAttachments;
      if (imageAttachments.length) {
        try {
          const { compressAttachmentImages } = await import("./compressImage.js");
          visionFiles = await compressAttachmentImages(imageAttachments);
        } catch {
          visionFiles = imageAttachments;
        }
      }
      const outgoing = [
        ...visionFiles,
        ...outgoingAttachments.filter((item) => !String(item.type || "").startsWith("image/")),
      ];
      const uploadPlan = getAttachmentUploadPlan(outgoing, apiBase);

      let response;
      if (outgoing.length && !uploadPlan.sendRawFiles) {
        throw new Error(
          uploadPlan.warning ||
            "Lampiran terlalu besar untuk dikirim. Kurangi ukuran atau jumlah file lalu coba lagi."
        );
      }
      if (outgoing.length) {
        const formData = new FormData();
        formData.append("prompt", text);
        formData.append("narrative", narrative || text);
        formData.append("outputType", effectiveOutputType);
        formData.append("category", category);
        formData.append("generationMode", generationMode);
        formData.append("resultId", resultId);
        // Prefer smaller files first so the whole source set reaches the API.
        [...outgoing]
          .sort((a, b) => (a.file?.size || 0) - (b.file?.size || 0))
          .slice(0, TEMPLATE_UPLOAD_LIMIT)
          .forEach((item) => formData.append("attachments", item.file));
        response = await fetch(`${apiBase}/api/run-prompt`, {
          method: "POST",
          headers: authHeaders,
          body: formData,
        });
      } else {
        response = await fetch(`${apiBase}/api/run-prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            prompt: text,
            narrative,
            outputType: effectiveOutputType,
            category,
            generationMode,
            resultId,
          }),
        });
      }
      // Streaming is the normal path now. Text is shown as it arrives, so a
      // long document no longer looks like a stalled 40-second wait, and a run
      // that is cut short still leaves the user with what was written.
      const isStream = (response.headers.get("content-type") || "").includes("text/event-stream");
      let data;
      if (isStream && response.ok) {
        let streamed = "";
        data = await consumeGenerateSse(response, {
          onChunk: (chunk) => {
            streamed = chunk.replace ? chunk.text || "" : streamed + (chunk.text || "");
            setRunOutput(streamed);
          },
        });
      } else {
        data = await readApiJson(response);
      }
      if (!response.ok) throw new Error(data.error || "Failed to run the prompt.");
      const rawContent = data.content || data.prompt || "";
      setExportImages(Array.isArray(data.images) ? data.images : []);
      if (data.truncated) {
        setWarningMessage(
          "Dokumen berhenti sebelum selesai karena batas waktu. Bagian yang sudah jadi tetap tersimpan — persingkat permintaan untuk hasil penuh."
        );
      }
      const profile = detectDeliverableProfile({
        narrative,
        outputType: effectiveOutputType,
        content: rawContent,
      });
      const checked = validateFinishedOutput(rawContent, profile);
      const content = checked.content;
      setRunOutput(content);
      setErrorMessage("");
      import("./diagramSvgStore.js").then((m) => m.clearRenderedDiagramSvg()).catch(() => {});
      return content;
    } catch (error) {
      setRunError(error.message || "Failed to run the prompt.");
      // Whatever streamed in before the failure is real work the user paid
      // quota for; keep it on screen instead of clearing back to nothing.
      return null;
    } finally {
      setIsRunning(false);
    }
  }

  /**
   * Files a finished template document so the calendar can find it later.
   *
   * Saved automatically rather than on a button: the value of the calendar is
   * that nothing has to be remembered, and a document the user forgot to save
   * is exactly the one they will go looking for in two weeks.
   */
  function fileTemplateResult(template, content, values, language) {
    /**
     * The calendar entry is named after the subject the user typed.
     *
     * That answer — "Sosialisasi SPBE", "12 unit laptop" — is the thing a
     * person actually recognises weeks later. Falling back to the document's
     * first heading filed every set of minutes under "Identitas Rapat",
     * because models open straight into the first required section.
     */
    const subject = String(values?.[templateSubjectField(template)] || "").trim();
    const sectionNames = new Set(
      [...(template.sections?.id || []), ...(template.sections?.en || [])].map((name) =>
        name.toLowerCase()
      )
    );
    const heading = /^#{1,3}\s+(.+)$/m.exec(content)?.[1]?.trim();
    const title =
      subject ||
      (heading && !sectionNames.has(heading.toLowerCase()) ? heading : "") ||
      localizedTemplateName(template.name, language);
    const now = Date.now();
    const item = createContentRecord({
      id: globalThis.crypto?.randomUUID?.() || `${now}`,
      title,
      contentType: "output",
      request: subject,
      prompt: "",
      output: content,
      templateId: template.id,
      templateName: localizedTemplateName(template.name, language),
      // The day the work happened, which the user can move in the calendar.
      activityDate: toDateKey(new Date()),
      folder: localizedTemplateName(template.name, language),
      tag: template.group,
      createdAt: now,
      updatedAt: now,
      meta: { source: "template", model: generationModel || "" },
    });
    setLibrary((items) => [item, ...items].slice(0, libraryLimit));
    setSelectedLibraryId(item.id);
    return item;
  }

  /**
   * Runs one template: material in, finished document out.
   *
   * Deliberately not the two-step of the older flow. There is no prompt to
   * write first because the template already carries the contract, which
   * halves the latency and removes the step where the app's own wording could
   * drift away from what the user picked.
   */
  async function runTemplate(template, values = {}, language = "id", editedFields = []) {
    if (!template) return null;


    setIsRunning(true);
    setRunError("");
    setWarningMessage("");
    setRunOutput("");
    setExportImages([]);
    setTemplatePhase("reading");
    const resultId = globalThis.crypto?.randomUUID?.() || `result-${Date.now()}`;

    try {
      const authHeaders = {};
      const images = attachments.filter((item) => item?.file && String(item.type || "").startsWith("image/"));
      const documents = attachments.filter((item) => item?.file && !String(item.type || "").startsWith("image/"));

      let visionFiles = images;
      if (images.length) {
        try {
          const { compressAttachmentImages } = await import("./compressImage.js");
          visionFiles = await compressAttachmentImages(images);
        } catch {
          visionFiles = images;
        }
      }

      const outgoing = [...visionFiles, ...documents];
      const uploadPlan = getAttachmentUploadPlan(outgoing, apiBase);
      if (outgoing.length && !uploadPlan.sendRawFiles) {
        throw new Error(
          uploadPlan.warning ||
            "Lampiran terlalu besar untuk dikirim. Kurangi jumlah atau ukuran filenya."
        );
      }

      const formData = new FormData();
      formData.append("templateId", template.id);
      formData.append("values", JSON.stringify(values || {}));
      formData.append("editedFields", JSON.stringify(editedFields || []));
      formData.append("language", language === "en" ? "en" : "id");
      formData.append("resultId", resultId);
      // Smallest first, so if the payload has to be cut it is the largest
      // photo that is dropped rather than an arbitrary one.
      const sending = [...outgoing]
        .sort((a, b) => (a.file?.size || 0) - (b.file?.size || 0))
        .slice(0, TEMPLATE_UPLOAD_LIMIT);
      sending.forEach((item) => formData.append("attachments", item.file));
      // Multer preserves file order, so a parallel list of slot labels is
      // enough to tell the server which photo is the "before".
      formData.append("slots", JSON.stringify(sending.map((item) => item.slot || "")));

      const response = await fetch(`${apiBase}/api/run-prompt`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      const isStream = (response.headers.get("content-type") || "").includes("text/event-stream");
      let data;
      if (isStream && response.ok) {
        data = await consumeGenerateSse(response, {
          // The text itself is discarded: the first chunk only tells us the
          // model has started writing, which is what the stage display needs.
          onChunk: () => setTemplatePhase("drafting"),
        });
        setTemplatePhase("finishing");
      } else {
        data = await readApiJson(response);
      }
      if (!response.ok) throw new Error(data.error || "Gagal membuat dokumen.");

      const checked = validateFinishedOutput(data.content || data.prompt || "", template.profile);
      const content = checked.content;
      if (!content) throw new Error("Dokumen kembali kosong. Coba lagi.");
      setExportImages(Array.isArray(data.images) ? data.images : []);

      if (data.truncated) {
        setWarningMessage(
          "Dokumen berhenti sebelum selesai karena batas waktu. Bagian yang sudah jadi tetap tersimpan — kurangi lampiran untuk hasil penuh."
        );
      }

      setRunOutput(content);
      setErrorMessage("");
      fileTemplateResult(template, content, values, language);
      return content;
    } catch (error) {
      setRunError(error.message || "Gagal membuat dokumen.");
      return null;
    } finally {
      setIsRunning(false);
    }
  }

  /** Stores a template the user wrote in the editor. */
  function saveCustomTemplate(draft) {
    const name = String(draft?.name || "").trim();
    const instruction = String(draft?.instruction || "").trim();
    if (!name || !instruction) return false;
    const now = Date.now();
    const record = {
      id: draft.id || globalThis.crypto?.randomUUID?.() || `custom-template-${now}`,
      title: name,
      name,
      blurb: String(draft.blurb || "").trim(),
      instruction,
      sections: String(draft.sections || ""),
      fields: String(draft.fields || ""),
      needsAttachment: draft.needsAttachment !== false,
      // Kept so the record still satisfies the legacy starter shape that the
      // cloud sync and the older library normaliser expect.
      prompt: instruction,
      category: "Business",
      custom: true,
      createdAt: draft.createdAt || now,
    };
    setCustomTemplates((items) => {
      const rest = items.filter((item) => item.id !== record.id);
      return [record, ...rest].slice(0, customTemplateLimit);
    });
    flashAction("Template saved");
    return true;
  }

  /** Moves a filed document to the day the work actually happened. */
  function setResultDate(id, activityDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(activityDate || ""))) return;
    setLibrary((items) =>
      items.map((item) =>
        item.id === id ? { ...item, activityDate, updatedAt: Date.now() } : item
      )
    );
  }

  async function createFinishedResult() {
    setRunOutput("");
    setErrorMessage("");
    setExportStatus("");
    return runResultFirst({
      generatePrompt: () => generatePrompt(),
      runPrompt,
    });
  }

  async function optimizePrompt(rawPrompt, mode) {
    setIsOptimizing(true);
    setOptimizerError("");
    setOptimizerWarning("");

    if (!canUseFeature(OPEN_PLAN, "aiOptimize")) {
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
        headers: { "Content-Type": "application/json" },
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
      setEngineVersion(data.engineVersion || engineVersion);
      setPiiFindings(Array.isArray(data.piiFindings) ? data.piiFindings : []);
      return data.prompt;
    } catch (error) {
      const message = error.message || "Could not reach the AI service. Showing a quick optimization preview.";
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

    if (!canUseFeature(OPEN_PLAN, "aiCompare")) {
      const fallback = buildLocalCompareResult(compareA, compareB);
      setCompareResult(fallback);
      setCompareSource("score-based");
      setCompareWarning(upgradeMessageForFeature("aiCompare"));
      setIsComparing(false);
      return fallback;
    }

    try {
      const response = await fetch(`${apiBase}/api/compare-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setCompareResult(data.result ? { ...data.result, evaluationMethod: data.evaluationMethod } : null);
      setCompareSource(data.model || data.source || "AI judge");
      setCompareWarning(data.warning || "");
      setCompareBiasMitigation(data.result?.bias_mitigation || "");
      return data.result;
    } catch (error) {
      const message = error.message || "AI compare is unavailable. Using readiness scores instead.";
      const quotaOnly = /quota token|quota exceeded|usage quota/i.test(message);
      if (quotaOnly) {
        setCompareError(message);
        setCompareWarning("");
        return null;
      }
      const fallback = buildLocalCompareResult(compareA, compareB);
      setCompareResult(fallback);
      setCompareSource("score-based");
      setCompareError(message);
      return fallback;
    } finally {
      setIsComparing(false);
    }
  }

  /**
   * @param {FileList|File[]} fileList
   * @param {string} [slot] labelled bucket, e.g. "before" / "after"
   */
  async function addAttachments(fileList, slot) {
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
          // Which labelled picker this arrived through. Before & After depends
          // on it, and guessing from upload order gets it wrong.
          ...(slot ? { slot } : {}),
        };
      })
    );
    setAttachments((items) => {
      const merged = [...nextFiles, ...items].slice(0, maxAttachments);
      if (merged.length >= maxAttachments && nextFiles.length > 0) {
        setWarningMessage(`Maximum ${maxAttachments} attachments.`);
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

  async function refreshHealth() {
    try {
      const response = await fetch(`${apiBase}/api/health`);
      const data = await readApiJson(response);
      setSettingsStatus(data);
    } catch {
      setSettingsStatus({ ok: false, provider: "unreachable", model: "-", fallbackModel: "-" });
    }
  }

  function saveModelSettings() {
    localStorage.setItem("promptlab-model-settings", JSON.stringify(modelSettings));
    setSettingsSavedAt(new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
  }

  async function exportFile(format, content = prompt, titleSeed = "") {
    const formatLabel = format.toUpperCase();
    if (format === "png" || format === "svg") {
      try {
        setExportStatus(`Preparing ${formatLabel}...`);
        setErrorMessage("");
        const { buildDiagramExportBlob } = await import("./exportDiagram.js");
        const { deriveExportTitle, toDownloadFilename, triggerBrowserDownload } = await import(
          "./exportNaming.js"
        );
        const title =
          deriveExportTitle({
            content,
            narrative: titleSeed || narrative,
            attachmentNames: attachments.map((file) => file.name),
          }) || "Diagram";

        const authHeaders = {};

        const { blob, extension, note } = await buildDiagramExportBlob(content, format, {
          apiBase,
          authHeaders,
          title,
        });
        const filename = toDownloadFilename(title, extension);
        const label = extension.toUpperCase();

        if (note) setWarningMessage(note);

        // Android TWA: silent download is a no-op. Show preview + require a fresh Share tap.
        const needsSaveSheet =
          isLikelyAndroidTwa() ||
          (typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent || ""));

        if (needsSaveSheet) {
          if (diagramExportOffer?.url) URL.revokeObjectURL(diagramExportOffer.url);
          const url = URL.createObjectURL(blob);
          setDiagramExportOffer({ blob, filename, extension, url });
          setExportStatus(`${label} siap — ketuk Bagikan / Simpan`);
          return;
        }

        const result = await triggerBrowserDownload(blob, filename);
        setExportStatus(
          result?.method === "share" || result?.method === "share-abort"
            ? `${label} ready — pilih Save / Download di share sheet`
            : `${label} downloaded`
        );
        window.setTimeout(() => setExportStatus(""), 4500);
      } catch (error) {
        console.error("[diagram-export]", error);
        const detail = error?.message || "Diagram export failed.";
        setErrorMessage(detail);
        setExportStatus(`${formatLabel} failed`);
        window.setTimeout(() => setExportStatus(""), 6000);
        try {
          await fetch(`${apiBase}/api/client-log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "diagram-export",
              format,
              error: detail,
              ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
            }),
          });
        } catch {
          /* ignore */
        }
      }
      return;
    }

    const feature =
      format === "pptx"
        ? "pptxExport"
        : format === "xlsx"
          ? "xlsxExport"
          : format === "pdf"
            ? "pdfExport"
            : "docxExport";
    if (!canExportFormat(OPEN_PLAN, format)) {
      const message =
        format === "pptx"
          ? detectLanguage() === "en"
            ? "PowerPoint export needs Pro or Business. Word export works on Free."
            : "Export PowerPoint perlu paket Pro/Business. Word tetap bisa di Free."
          : upgradeMessageForFeature(feature);
      setExportStatus("");
      flashAction("Upgrade to export");
      setWarningMessage(message);
      setErrorMessage(message);
      return;
    }
    try {
      setExportStatus(`Preparing ${formatLabel}...`);
      setErrorMessage("");
      const authHeaders = {};
      // Document language follows UI locale (owned by Shell via detectLanguage).
      // Do not reference a free `lang` binding here — App no longer owns that state.
      const documentLanguage = detectLanguage() === "en" ? "en" : "id";
      const { deriveExportTitle, toDownloadFilename, triggerBrowserDownload } = await import(
        "./exportNaming.js"
      );
      const title = deriveExportTitle({
        content,
        narrative: titleSeed || narrative,
        attachmentNames: attachments.map((file) => file.name),
      });
      if (!String(content || "").trim()) {
        throw new Error(
          detectLanguage() === "en"
            ? "No finished result to export. Tap Create result first."
            : "Belum ada hasil untuk diekspor. Ketuk Buat hasil dulu."
        );
      }
      // Finished reports carry their photographs in both portable formats.
      const localImages = ["docx", "pdf"].includes(format)
        ? await readAttachmentImages(attachments)
        : [];
      const images = localImages.length
        ? localImages
        : Array.isArray(exportImages)
          ? exportImages.slice(0, TEMPLATE_UPLOAD_LIMIT)
          : [];

      const response = await fetch(`${apiBase}/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title,
          content,
          language: documentLanguage,
          ...(images.length ? { images } : {}),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Failed to export ${formatLabel} (${response.status}).`);
      }
      const blob = await response.blob();
      if (!blob || blob.size < 64) {
        throw new Error(`Failed to export ${formatLabel}: empty file.`);
      }

      const filename = toDownloadFilename(title, format);
      const needsSaveSheet =
        isLikelyAndroidTwa() ||
        (typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent || ""));

      if (needsSaveSheet) {
        if (diagramExportOffer?.url) URL.revokeObjectURL(diagramExportOffer.url);
        const url = URL.createObjectURL(blob);
        setDiagramExportOffer({ blob, filename, extension: format, url });
        setExportStatus(`${formatLabel} siap — ketuk Bagikan / Simpan`);
        return;
      }

      const result = await triggerBrowserDownload(blob, filename);
      setExportStatus(
        result?.method === "share" || result?.method === "share-abort"
          ? `${formatLabel} ready — pilih Save / Download di share sheet`
          : `${formatLabel} downloaded`
      );
      window.setTimeout(() => setExportStatus(""), 4500);
    } catch (error) {
      console.error(`[${format}-export]`, error);
      setErrorMessage(error.message || "Export failed.");
      setExportStatus(`${formatLabel} failed`);
      window.setTimeout(() => setExportStatus(""), 6000);
    }
  }

  function closeDiagramExportOffer() {
    setDiagramExportOffer((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    setExportStatus("");
  }

  function confirmDiagramExportShare(method = "share") {
    setExportStatus(
      method === "open" || method === "preview"
        ? "File terbuka — simpan dari menu / tekan lama bila gambar"
        : "File dibagikan / siap disimpan"
    );
    window.setTimeout(() => setExportStatus(""), 4500);
  }

  const filteredLibrary = searchHits
    ? searchHits
        .map((id) => library.find((item) => String(item.id) === String(id)))
        .filter(Boolean)
    : library.filter((item) =>
        `${item.title} ${item.content} ${item.folder} ${item.tag}`
          .toLowerCase()
          .includes(search.toLowerCase())
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
    generationPhase,
    warningMessage,
    errorMessage,
    setWarningMessage,
    setErrorMessage,
    copied,
    copyStatus,
    actionToast,
    copyText,
    savePrompt,
    generatePrompt,
    createFinishedResult,
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
    outputVersions,
    semanticSearch,
    updateLibraryItem,
    deleteLibraryItem,
    duplicateLibraryItem,
    search,
    setSearch,
    templateSearch,
    setTemplateSearch,
    commandPaletteOpen,
    setCommandPaletteOpen,
    openCommandPalette,
    commandPaletteRestoreFocus,
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
    settingsSavedAt,
    exportStatus,
    diagramExportOffer,
    closeDiagramExportOffer,
    confirmDiagramExportShare,
    exportFile,
    apiBase,
    accountState,
    setAccountState,
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

    // --- Shell contract -----------------------------------------------------
    // The shell shows only what the AI actually returned. `prompt` above falls
    // back to a locally templated draft, which would render as a result before
    // the user has generated anything.
    prompt: generatedPrompt,
    setPrompt: setGeneratedPrompt,
    runPrompt,
    runTemplate,
    templatePhase,
    setResultDate,
    saveCustomTemplate,
    runOutput,
    setRunOutput,
    isRunning,
    runError,
    clearComposer,
  };

  return <Shell {...shared} />;
}

function mountPromptLab() {
  const root = document.getElementById("root");
  if (!root) {
    dismissStartupSplash();
    return;
  }
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);
  const showApp =
    path === "/app" ||
    path.startsWith("/app/") ||
    /^\/promptlab$/i.test(path) ||
    standalone;

  if (!showApp) dismissStartupSplash();

  try {
    root.innerHTML = "";
    if (showApp) {
      // Opts the app surface into the new base layer; the marketing page keeps
      // the legacy styles.
      document.body.classList.add("pl");
      createRoot(root).render(
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      );
    } else {
      createRoot(root).render(
        <React.Suspense fallback={null}>
          <LandingPage />
        </React.Suspense>
      );
    }
    dismissStartupSplash();
  } catch (error) {
    console.error("AI Work Studio mount failed", error);
    root.innerHTML = `<main class="v2-boot-error" data-theme="v2" style="min-height:100vh;padding:24px;color:#242a27;background:#f7f3eb;font-family:system-ui,sans-serif"><h1>AI Work Studio failed to load</h1><p>${error?.message || "Unknown error"}</p><button type="button" onclick="location.reload()" style="margin-top:16px;padding:10px 16px;cursor:pointer">Reload</button></main>`;
    dismissStartupSplash();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountPromptLab);
} else {
  mountPromptLab();
}
