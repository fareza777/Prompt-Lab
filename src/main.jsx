import React, { Component, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import LandingPage from "./LandingPage.jsx";
import { Check, Clipboard, Settings, User, X } from "lucide-react";
import "./ui/tokens.css";
import "./ui/base.css";
import "./ui/shell.css";
import Shell from "./ui/Shell.jsx";
import { detectLanguage } from "./ui/i18n.js";
import { createContentRecord, normalizeContentRecord } from "./ui/contentRecord.js";
import { createFinishedResult as runResultFirst } from "./ui/resultFlow.js";
import {
  detectDeliverableProfile,
  validateFinishedOutput,
} from "./deliverableProfiles.js";
/* Admin-only; kept out of the initial bundle along with the legacy stylesheet. */
const AdminConsole = React.lazy(() => import("./admin/AdminConsole.jsx"));
import {
  CATEGORIES as categories,
  TONES as tones,
  MODELS as models,
  OUTPUT_TYPES as outputTypes,
} from "./ui/options.js";
import { defaultModelSettings, generationModes } from "./modelSettings.js";
import { mergeLibraryPayload, pullUserLibrary, pushUserLibrary } from "./librarySync.js";
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
  getPlayBillingHint,
  isPlayBillingAvailable,
  isLikelyAndroidTwa,
  listPlayPurchases,
  normalizePlayPurchaseList,
  purchasePlayPlan,
  restorePlayPurchasesOnServer,
  verifyPlayPurchaseOnServer,
} from "./playBilling.js";
import { getWebCheckoutUrlForPlan, isWebCheckoutConfigured } from "./webBilling.js";
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
import { isSuperAccount, SUPER_QUOTA_LIMIT } from "./superAccounts.js";
import { clearInstalledAppEntry, markInstalledAppEntered } from "./installedApp.js";
import { purgeLegacyServiceWorkers, repairStuckLocalProfile } from "./bootRecovery.js";
import { scorePrompt } from "./promptScore.js";
import { captureFocusReturn } from "./accessibilityInteractions.js";
import { dismissStartupSplash, installSplashSafetyNet, markStartupSplashStarted } from "./startupSplash";
import {
  buildGoogleOAuthOptions,
  getUserDisplayName,
  humanizeAuthError,
} from "./authGoogle.js";
import {
  clearAuthCallbackParams,
  getAuthRedirectUrl,
  isGoogleAuthEnabled,
  isSupabaseConfigured,
  readAuthCallbackError,
  supabase,
} from "./supabaseClient";

markStartupSplashStarted();
installSplashSafetyNet();
repairStuckLocalProfile();
purgeLegacyServiceWorkers();


/**
 * Free generations granted before an account is required. The old build
 * refused every AI call until the user signed up, so nobody could see what the
 * app did before being asked to commit.
 */
const TRIAL_LIMIT = 5;
const TRIAL_KEY = "promptlab-trial-used";

function currentTrialWeekStart(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function readTrialUsed() {
  try {
    const stored = localStorage.getItem(TRIAL_KEY);
    if (!stored) return 0;
    const parsed = JSON.parse(stored);
    if (typeof parsed === "number") return Math.min(Math.max(0, parsed), TRIAL_LIMIT);
    if (parsed?.weekStart !== currentTrialWeekStart()) return 0;
    return Math.min(Math.max(0, Number(parsed?.used) || 0), TRIAL_LIMIT);
  } catch {
    const legacy = Number(localStorage.getItem(TRIAL_KEY));
    return Number.isFinite(legacy) ? Math.min(Math.max(0, legacy), TRIAL_LIMIT) : 0;
  }
}

function writeTrialUsed(value) {
  try {
    localStorage.setItem(
      TRIAL_KEY,
      JSON.stringify({ weekStart: currentTrialWeekStart(), used: Math.min(TRIAL_LIMIT, value) }),
    );
  } catch {
    /* ignore */
  }
}

/**
 * Copy for the native account-deletion dialogs.
 *
 * Play requires that deleting an account is reachable in-app and that the user
 * is told what it does and does not remove — notably that it does not cancel a
 * Play subscription.
 */
function translateAccountDeletion() {
  const lang = detectLanguage();
  if (lang === "en") {
    return {
      warning:
        "Delete your AI Work Studio account permanently? This removes your profile, synced history, and membership record.\n\nImportant: this does NOT cancel a Google Play subscription. Manage that in Google Play → Payments & subscriptions.",
      typeToConfirm: "Type DELETE to confirm account deletion:",
    };
  }
  return {
    warning:
      "Hapus akun AI Work Studio secara permanen? Tindakan ini menghapus profil, riwayat tersinkron, dan catatan keanggotaan.\n\nPenting: ini TIDAK membatalkan langganan Google Play. Batalkan langganan lewat Google Play → Pembayaran & langganan.",
    typeToConfirm: 'Ketik DELETE untuk mengonfirmasi penghapusan akun:',
  };
}
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
      custom: true,
      createdAt: item.createdAt || Date.now(),
    }))
    .filter((item) => item.prompt.trim())
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

function profileToAccount(profile, user) {
  const plan = membershipPlans[profile?.plan] ? profile.plan : "Free";
  const unlimited = isSuperAccount(profile);
  return normalizeAccountState({
    userId: user?.id || profile?.id || "",
    email: profile?.email || user?.email || "",
    name: profile?.full_name || getUserDisplayName(user) || "",
    role: profile?.role === "admin" ? "admin" : "user",
    plan,
    quotaUsed: Number(profile?.quota_used || 0),
    quotaLimit: unlimited
      ? SUPER_QUOTA_LIMIT
      : Number(profile?.quota_limit || membershipPlans[plan].quota || defaultAccountState.quotaLimit),
    quotaUnlimited: unlimited,
    quotaReset: resolveQuotaResetLabel(profile?.quota_reset_at),
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const commandPaletteRestoreFocus = React.useRef(() => {});
  const openCommandPalette = () => {
    commandPaletteRestoreFocus.current = captureFocusReturn(document);
    setCommandPaletteOpen(true);
  };
  const [librarySyncStatus, setLibrarySyncStatus] = useState("");
  const libraryPulledForUser = React.useRef("");
  const libraryPushEnabled = React.useRef(false);
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
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [adminAnalyticsLoading, setAdminAnalyticsLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState(null);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersSearch, setAdminUsersSearch] = useState("");
  const [adminActionStatus, setAdminActionStatus] = useState("");
  const [globalPublishAt, setGlobalPublishAt] = useState("");
  const [globalConfigSource, setGlobalConfigSource] = useState("env");
  /** Output of running the prompt — the finished deliverable, not instructions. */
  const [runOutput, setRunOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [optimizerResult, setOptimizerResult] = useState("");
  const [optimizerSource, setOptimizerSource] = useState("local");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizerError, setOptimizerError] = useState("");
  const [optimizerWarning, setOptimizerWarning] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [showAuthUpsell, setShowAuthUpsell] = useState(false);
  const [playBillingReady, setPlayBillingReady] = useState(() => isPlayBillingAvailable());
  const playBillingHint = useMemo(() => getPlayBillingHint(), [playBillingReady]);
  const [exportStatus, setExportStatus] = useState("");
  const [diagramExportOffer, setDiagramExportOffer] = useState(null);
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
  const [authStatus, setAuthStatus] = useState(isSupabaseConfigured ? "Checking session..." : "Supabase not configured");
  const [authError, setAuthError] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authSessionReady, setAuthSessionReady] = useState(!isSupabaseConfigured);
  const [hasAuthSession, setHasAuthSession] = useState(false);
  /**
   * An anonymous Supabase session lets a new user try the app before creating
   * an account. It authenticates the API call, but the UI must keep treating
   * the person as signed out — otherwise we would show them account and
   * membership state they do not actually have.
   */
  const [isAnonymousSession, setIsAnonymousSession] = useState(false);
  const [trialUsed, setTrialUsed] = useState(readTrialUsed);
  const [weeklyResults, setWeeklyResults] = useState(null);
  /** Cleared once we learn the project cannot issue anonymous sessions. */
  const [trialAvailable, setTrialAvailable] = useState(true);
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

    const callbackError = humanizeAuthError(readAuthCallbackError());
    if (callbackError) {
      setAuthError(callbackError);
      setAuthStatus("Sign in failed");
      clearAuthCallbackParams();
    }

    async function bootstrapSession() {
      let data;
      let error;
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error("Session check timed out")), 8000);
          }),
        ]);
        ({ data, error } = result);
      } catch (sessionError) {
        if (!mounted) return;
        setAuthError(sessionError?.message || "Session check failed");
        setAuthStatus("Session check failed");
        setHasAuthSession(false);
        setAuthSessionReady(true);
        return;
      }
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
        setIsAnonymousSession(Boolean(user.is_anonymous));
        setAuthStatus("Signed in");
        setAuthSessionReady(true);
        void loadUserProfile(user, { autoRestorePlay: isLikelyAndroidTwa() });
      } else {
        setHasAuthSession(false);
        setIsAnonymousSession(false);
        setAccountState(createDefaultAccountState());
        setAuthStatus("Signed out");
        setAuthSessionReady(true);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (user) {
        setHasAuthSession(true);
        setIsAnonymousSession(Boolean(user.is_anonymous));
        setAuthSessionReady(true);
        setAuthStatus("Signed in");
        if (event === "SIGNED_IN") {
          markInstalledAppEntered();
          setAuthError("");
          loadUserProfile(user, { autoRestorePlay: isLikelyAndroidTwa() });
        } else {
          loadUserProfile(user);
        }
      } else {
        setHasAuthSession(false);
        setIsAnonymousSession(false);
        setAuthSessionReady(true);
        setAccountState(createDefaultAccountState());
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
    if (!accountState.userId || !supabase || libraryPulledForUser.current === accountState.userId) return;
    libraryPulledForUser.current = accountState.userId;
    libraryPushEnabled.current = false;
    let cancelled = false;
    (async () => {
      try {
        const remote = await pullUserLibrary(supabase, accountState.userId);
        if (cancelled) return;
        if (remote) {
          const merged = mergeLibraryPayload({ library, customTemplates }, remote);
          setLibrary(merged.library.slice(0, libraryLimit));
          setCustomTemplates(merged.customTemplates.slice(0, customTemplateLimit));
          setLibrarySyncStatus("Synced from cloud");
        } else {
          setLibrarySyncStatus("Cloud library ready");
        }
      } catch {
        setLibrarySyncStatus("Local library (cloud sync unavailable)");
      } finally {
        if (!cancelled) libraryPushEnabled.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountState.userId, libraryLimit, customTemplateLimit]);

  useEffect(() => {
    if (!accountState.userId || !supabase || !libraryPushEnabled.current) return undefined;
    const timer = window.setTimeout(() => {
      pushUserLibrary(supabase, accountState.userId, { library, customTemplates })
        .then(() => setLibrarySyncStatus("Synced"))
        .catch(() => setLibrarySyncStatus("Sync pending"));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [library, customTemplates, accountState.userId]);

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
  }, [narrative, category, tone, model, outputType, attachments.length]);

  useEffect(() => {
    refreshHealth();
  }, []);

  useEffect(() => {
    if (active === "Settings") refreshHealth();
  }, [active]);

  useEffect(() => {
    if (active === "Admin" && accountState.role === "admin") {
      loadAdminAnalytics();
      loadAdminUsers();
      loadAdminRuntimeConfig();
    }
  }, [active, accountState.role, accountState.userId]);

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

  async function loadUserProfile(user, { autoRestorePlay = false } = {}) {
    if (!supabase || !user?.id) return;
    setAuthError("");
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,plan,quota_used,quota_limit,quota_reset_at,play_billing")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setAuthError("Could not load your profile. Please try again.");
      setAccountState((account) => ({
        ...account,
        userId: user.id,
        email: user.email || account.email,
        name: getUserDisplayName(user) || account.name,
      }));
      return;
    }

    if (data) {
      setAccountState(profileToAccount(data, user));
      if (autoRestorePlay && isPlayBillingAvailable()) {
        void restorePlayPurchases({ silent: true, userId: user.id });
        void syncPlayMembership({ silent: true, userId: user.id });
      }
      return;
    }

    const draftProfile = {
      id: user.id,
      email: user.email || "",
      full_name: getUserDisplayName(user) || "",
    };
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert(draftProfile)
      .select("id,email,full_name,role,plan,quota_used,quota_limit,quota_reset_at,play_billing")
      .maybeSingle();

    if (insertError) {
      setAuthError("Could not create your profile. Please try again.");
      setAccountState(profileToAccount(draftProfile, user));
      return;
    }

    setAccountState(profileToAccount(inserted || draftProfile, user));
    if (autoRestorePlay && isPlayBillingAvailable()) {
      void restorePlayPurchases({ silent: true, userId: user.id });
      void syncPlayMembership({ silent: true, userId: user.id });
    }
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
    markInstalledAppEntered();
    await loadUserProfile(data.user);
  }

  async function resetPasswordForEmail(email) {
    if (!supabase) {
      setAuthError("Supabase is not configured.");
      return;
    }
    const target = String(email || "").trim();
    if (!target) {
      setAuthError("Enter your email to reset the password.");
      return;
    }
    setIsAuthBusy(true);
    setAuthError("");
    setAuthStatus("Sending reset email...");
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/app`,
    });
    setIsAuthBusy(false);
    if (error) {
      setAuthError(error.message);
      setAuthStatus("Reset failed");
      return;
    }
    setAuthStatus("Password reset email sent. Check your inbox.");
  }

  async function deleteAccountPermanently() {
    if (!supabase) {
      setBillingMessage("Supabase is not configured.");
      flashAction("Account deletion unavailable");
      return;
    }
    // These are native dialogs outside the React tree, so they read the UI
    // language directly rather than going through the translator hook.
    const inIndonesian = translateAccountDeletion();
    const confirmed = window.confirm(inIndonesian.warning);
    if (!confirmed) return;
    const typed = window.prompt(inIndonesian.typeToConfirm, "");
    if (String(typed || "").trim().toUpperCase() !== "DELETE") {
      setBillingMessage("Account deletion canceled.");
      flashAction("Deletion canceled");
      return;
    }
    setBillingBusy(true);
    setBillingMessage("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      const response = await fetch(`${apiBase}/api/account/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to delete account.");
      await supabase.auth.signOut();
      setHasAuthSession(false);
      setAccountState(normalizeAccountState({}));
      localStorage.removeItem("promptlab-installed-entry");
      setBillingMessage("Account deleted. Sign in again or continue as guest.");
      flashAction("Account deleted");
      window.location.assign("/app");
    } catch (error) {
      setBillingMessage(error.message || "Delete failed.");
    } finally {
      setBillingBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (!isGoogleAuthEnabled) {
      setAuthError("Google sign-in is disabled in this build.");
      return;
    }
    if (!supabase) {
      setAuthError("Supabase is not configured.");
      return;
    }
    setIsAuthBusy(true);
    setAuthError("");
    setAuthStatus("Redirecting to Google...");
    const { error } = await supabase.auth.signInWithOAuth(
      buildGoogleOAuthOptions(getAuthRedirectUrl()),
    );
    setIsAuthBusy(false);
    if (error) {
      setAuthError(humanizeAuthError(error.message));
      setAuthStatus("Google sign in failed");
    }
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
      markInstalledAppEntered();
      await loadUserProfile(data.user);
    } else {
      setAuthStatus("Check your email to confirm your account.");
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    clearInstalledAppEntry();
    localStorage.removeItem("promptlab-guest");
    localStorage.removeItem("promptlab-onboarded");
    localStorage.removeItem("promptlab-auth-intent");
    localStorage.removeItem("promptlab-auth-gate");
    libraryPulledForUser.current = "";
    libraryPushEnabled.current = false;
    setLibrarySyncStatus("");
    setHasAuthSession(false);
    setIsAnonymousSession(false);
    setAuthSessionReady(true);
    setAccountState(createDefaultAccountState());
    setAuthStatus("Signed out");
  }

  async function continueAsGuest() {
    writeGuestFlagSafe(true);
    const ready = await ensureTrialSession();
    return ready;
  }

  function clearComposer() {
    setNarrative("");
    setGeneratedPrompt("");
    setRunOutput("");
    setAttachments([]);
    setErrorMessage("");
    setWarningMessage("");
    setExportStatus("");
    import("./diagramSvgStore.js").then((m) => m.clearRenderedDiagramSvg()).catch(() => {});
  }

  function writeGuestFlagSafe(isGuest) {
    try {
      if (isGuest) localStorage.setItem("promptlab-guest", "1");
      else localStorage.removeItem("promptlab-guest");
    } catch {
      /* ignore */
    }
  }

  async function getAuthHeaders() {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const userId = data.session?.user?.id || accountState.userId || "";
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
      ...(userId ? { "x-user-id": userId } : {}),
    };
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
      if (isLikelyAndroidTwa()) {
        setBillingMessage(
          "Play Billing is not ready in this install. Reinstall AI Work Studio from Google Play, then try again. Web checkout is disabled inside the Android app."
        );
        return;
      }
      upgradeViaWebMembership(planName);
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

  async function restorePlayPurchases({ silent = false, userId = "" } = {}) {
    const effectiveUserId = userId || accountState.userId;
    if (!effectiveUserId) {
      if (!silent) {
        setBillingMessage("Sign in to restore purchases.");
        flashAction("Sign in required");
      }
      return;
    }
    if (!isPlayBillingAvailable()) {
      if (!silent) {
        setBillingMessage(
          isLikelyAndroidTwa()
            ? "Play Billing is not available in this session. Reinstall from Google Play."
            : "Restore purchases is only available in the Android app from Google Play."
        );
      }
      return;
    }
    if (!silent) {
      setBillingBusy(true);
      setBillingMessage("");
    }
    try {
      const items = await listPlayPurchases();
      const purchases = normalizePlayPurchaseList(items);
      if (!purchases.length) {
        if (!silent) throw new Error("No active Google Play purchases found on this device.");
        await syncPlayMembership({ silent: true, purchases: [], userId: effectiveUserId });
        return;
      }
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      const data = await restorePlayPurchasesOnServer(apiBase, token, purchases);
      if (data.quota) applyServerQuota(data.quota);
      else await loadUserProfile({ id: effectiveUserId, email: accountState.email });
      if (!silent) {
        setBillingMessage(data.message || "Purchases restored.");
        flashAction("Purchases restored");
      } else if (data.plan && data.plan !== "Free") {
        flashAction(`${data.plan} restored`);
      }
    } catch (error) {
      if (!silent) {
        setBillingMessage(error.message || "Restore failed.");
        flashAction("Restore failed");
      }
    } finally {
      if (!silent) setBillingBusy(false);
    }
  }

  async function syncPlayMembership({ silent = true, purchases, userId = "" } = {}) {
    const effectiveUserId = userId || accountState.userId;
    if (!effectiveUserId) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      let payloadPurchases = purchases;
      if (payloadPurchases == null && isPlayBillingAvailable()) {
        try {
          payloadPurchases = normalizePlayPurchaseList(await listPlayPurchases());
        } catch {
          payloadPurchases = [];
        }
      }
      const response = await fetch(`${apiBase}/api/billing/sync-play-membership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchases: payloadPurchases || [] }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return;
      if (data.quota) applyServerQuota(data.quota);
      if (data.changed && data.plan === "Free") {
        flashAction("Membership updated to Free");
        if (!silent) setBillingMessage(data.message || "Membership updated to Free.");
      }
    } catch {
      /* silent sync */
    }
  }

  function upgradeViaWebMembership(planName) {
    if (isLikelyAndroidTwa()) {
      setBillingMessage(
        "Android upgrades must use Google Play Billing. Open Membership and tap Pro or Business after installing from Play Store."
      );
      return;
    }
    if (!accountState.userId) {
      setBillingMessage("Sign in to request a web membership upgrade.");
      return;
    }

    const checkoutUrl = getWebCheckoutUrlForPlan(planName, {
      email: accountState.email,
      userId: accountState.userId,
      name: accountState.name,
    });
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      setBillingMessage(
        `Opening Lemon Squeezy checkout for ${planName}. Your plan updates automatically after payment — tap Refresh membership below if needed.`
      );
      flashAction(`${planName} checkout opened`);
      return;
    }

    const supportEmail = import.meta.env.VITE_WEB_MEMBERSHIP_EMAIL || "support@prompt-lab.xyz";
    const subject = `AI Work Studio ${planName} web membership request`;
    const body = [
      `Requested plan: ${planName}`,
      `Current plan: ${accountState.plan}`,
      `Email: ${accountState.email}`,
      `User ID: ${accountState.userId}`,
      "",
      "Please activate this membership after payment confirmation.",
    ].join("\n");
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setBillingMessage(`Web upgrade request prepared for ${planName}. After payment or admin confirmation, your account plan will update here.`);
    flashAction(`${planName} request prepared`);
  }

  function requestMembershipUpgrade(planName) {
    if (isLikelyAndroidTwa()) {
      upgradeViaPlayBilling(planName);
      return;
    }
    if (isPlayBillingAvailable()) {
      upgradeViaPlayBilling(planName);
      return;
    }
    upgradeViaWebMembership(planName);
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
      quotaReset: resolveQuotaResetLabel(quota.quotaResetAt || account.quotaReset),
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

  /**
   * Starts an anonymous session so a first-time user can generate without
   * signing up. Returns false when anonymous sign-in is unavailable (the
   * Supabase project has it disabled), in which case the caller falls back to
   * asking for an account rather than failing with a bare 401.
   */
  function countTrialUse() {
    setTrialUsed((used) => {
      const next = Math.min(TRIAL_LIMIT, used + 1);
      writeTrialUsed(next);
      return next;
    });
  }

  async function ensureTrialSession() {
    if (hasAuthSession) return true;
    if (!supabase) {
      setTrialAvailable(false);
      return false;
    }
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data?.session) {
        // Anonymous sign-ins are disabled for this project, so the trial can
        // never succeed. Stop advertising it rather than repeating a promise
        // the backend will not honour.
        setTrialAvailable(false);
        return false;
      }
      setIsAnonymousSession(true);
      return true;
    } catch {
      setTrialAvailable(false);
      return false;
    }
  }

  async function generatePrompt(customNarrative = narrative, customOutputType = outputType) {
    const onTrial = !hasAuthSession || isAnonymousSession;
    if (onTrial && trialUsed >= TRIAL_LIMIT) {
      setErrorMessage("");
      return null;
    }
    if (!hasAuthSession) {
      const ready = await ensureTrialSession();
      if (!ready) {
        // Phrased so the UI's error humanizer maps it to the localized
        // "create a free account" copy rather than the generic fallback.
        setErrorMessage("Sign in to use AI features.");
        return null;
      }
    }

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
        attachments.forEach((item) => formData.append("attachments", item.file));
      }

      const authHeaders = await getAuthHeaders();
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
        applyServerQuota(data.quota);
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
      applyServerQuota(data.quota);
      setWarningMessage([uploadPlan.warning, data.warning].filter(Boolean).join(" "));
      setEngineVersion(data.engineVersion || "");
      setEvalDelta(data.evalDelta || null);
      setPiiFindings(Array.isArray(data.piiFindings) ? data.piiFindings : []);
      setGenerationPhase("done");
      return data.prompt || localPrompt;
    } catch (error) {
      const message = error.message || API_MSG.backendUnavailableLocalPrompt;
      const needsSignIn = /sign in to use ai|invalid session|authentication required|401/i.test(message);
      const quotaOnly = /usage quota|quota exceeded|quota token|failed to record quota|too many ai requests|too many requests/i.test(message);
      if (needsSignIn) {
        setGeneratedPrompt("");
        setGenerationSource("blocked");
        setGenerationModel("");
        setGenerationStatus("needs-auth");
        setErrorMessage("");
        setWarningMessage(
          "AI generation requires a free account. Sign in to unlock quota, sync, and exports. Guest mode only keeps drafts on this device."
        );
        setShowAuthUpsell(true);
        setGenerationPhase("idle");
        flashAction("Sign in to generate");
        return "";
      }
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
    const resultId = globalThis.crypto?.randomUUID?.() || `result-${Date.now()}`;
    try {
      const effectiveOutputType = detectDiagramIntent({ narrative, outputType })
        ? "Diagram"
        : outputType;
      const response = await fetch(`${apiBase}/api/run-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({
          prompt: text,
          narrative,
          outputType: effectiveOutputType,
          category,
          generationMode,
          resultId,
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Failed to run the prompt.");
      const rawContent = data.content || data.prompt || "";
      const profile = detectDeliverableProfile({
        narrative,
        outputType: effectiveOutputType,
        content: rawContent,
      });
      const checked = validateFinishedOutput(rawContent, profile);
      const content = checked.content;
      setRunOutput(content);
      import("./diagramSvgStore.js").then((m) => m.clearRenderedDiagramSvg()).catch(() => {});
      applyServerQuota(data.quota);
      if (data.weeklyResults) setWeeklyResults(data.weeklyResults);
      if (isAnonymousSession) countTrialUse();
      return content;
    } catch (error) {
      setRunError(error.message || "Failed to run the prompt.");
      return null;
    } finally {
      setIsRunning(false);
    }
  }

  async function createFinishedResult() {
    setRunOutput("");
    return runResultFirst({
      generatePrompt: () => generatePrompt(),
      runPrompt,
    });
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

    if (!canUseFeature(accountState.plan, "aiCompare")) {
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
      setCompareResult(data.result ? { ...data.result, evaluationMethod: data.evaluationMethod } : null);
      setCompareSource(data.model || data.source || "AI judge");
      setCompareWarning(data.warning || "");
      applyServerQuota(data.quota);
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

  async function loadAdminAnalytics() {
    if (accountState.role !== "admin" || !accountState.userId) return;
    setAdminAnalyticsLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/analytics/overview`, {
        headers: await getAuthHeaders(),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Failed to load analytics.");
      setAdminAnalytics(data.overview || null);
    } catch (error) {
      setAdminActionStatus(error.message || "Analytics unavailable.");
    } finally {
      setAdminAnalyticsLoading(false);
    }
  }

  async function loadAdminUsers(search = adminUsersSearch) {
    if (accountState.role !== "admin" || !accountState.userId) return;
    setAdminUsersLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search?.trim()) params.set("search", search.trim());
      const response = await fetch(`${apiBase}/api/admin/users?${params}`, {
        headers: await getAuthHeaders(),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Failed to load users.");
      setAdminUsers(data);
    } catch (error) {
      setAdminActionStatus(error.message || "User list unavailable.");
    } finally {
      setAdminUsersLoading(false);
    }
  }

  async function updateAdminUser(userId, patch) {
    setAdminActionStatus("Saving user...");
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify(patch),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Failed to update user.");
      setAdminActionStatus("User updated.");
      await loadAdminUsers();
      await loadAdminAnalytics();
      if (userId === accountState.userId) await loadUserProfile();
    } catch (error) {
      setAdminActionStatus(error.message || "Update failed.");
    }
  }

  async function grantSuperUser(userId) {
    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() + 365);
    await updateAdminUser(userId, {
      role: "admin",
      plan: "Business",
      quotaLimit: SUPER_QUOTA_LIMIT,
      quotaUsed: 0,
      quotaResetAt: resetDate.toISOString().slice(0, 10),
    });
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

        let authHeaders = {};
        try {
          authHeaders = await getAuthHeaders();
        } catch {
          authHeaders = {};
        }

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

    const feature = format === "pptx" ? "pptxExport" : "docxExport";
    if (!canExportFormat(accountState.plan, format)) {
      const message = upgradeMessageForFeature(feature);
      setBillingMessage(message);
      setExportStatus("");
      flashAction("Upgrade to export");
      setWarningMessage(message);
      return;
    }
    try {
      setExportStatus(`Preparing ${formatLabel}...`);
      const authHeaders = await getAuthHeaders();
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
      const response = await fetch(`${apiBase}/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title,
          content,
          language: documentLanguage,
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
      await triggerBrowserDownload(blob, toDownloadFilename(title, format));
      setExportStatus(`${formatLabel} downloaded`);
      window.setTimeout(() => setExportStatus(""), 2800);
    } catch (error) {
      setErrorMessage(error.message || "Export failed.");
      setExportStatus(`${formatLabel} failed`);
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
        ? "PNG terbuka — tekan lama gambar untuk Simpan"
        : "PNG dibagikan / siap disimpan"
    );
    window.setTimeout(() => setExportStatus(""), 4500);
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
    librarySyncStatus,
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
    adminAnalytics,
    adminAnalyticsLoading,
    adminUsers,
    adminUsersLoading,
    adminUsersSearch,
    setAdminUsersSearch,
    loadAdminAnalytics,
    loadAdminUsers,
    updateAdminUser,
    grantSuperUser,
    adminActionStatus,
    exportStatus,
    diagramExportOffer,
    closeDiagramExportOffer,
    confirmDiagramExportShare,
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
    signInWithGoogle,
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
    restorePlayPurchases,
    syncPlayMembership,
    requestMembershipUpgrade,
    resetPasswordForEmail,
    deleteAccountPermanently,
    showAuthUpsell,
    setShowAuthUpsell,
    loadUserProfile,
    playBillingReady,
    playBillingHint,
    webCheckoutReady: isWebCheckoutConfigured(),

    // --- Shell contract -----------------------------------------------------
    // The shell shows only what the AI actually returned. `prompt` above falls
    // back to a locally templated draft, which would render as a result before
    // the user has generated anything.
    prompt: generatedPrompt,
    setPrompt: setGeneratedPrompt,
    runPrompt,
    runOutput,
    setRunOutput,
    isRunning,
    runError,
    getAuthHeaders,
    googleEnabled: isGoogleAuthEnabled,
    quotaSummary:
      accountState.plan === "Free" && weeklyResults
        ? `${weeklyResults.remaining} / ${weeklyResults.limit} results left this week`
        : formatQuotaSummary(accountState),
    weeklyAllowance: weeklyResults,
    // An anonymous trial session is not an account, and must not be presented
    // as one.
    hasAuthSession: hasAuthSession && !isAnonymousSession,
    // null hides the trial affordance entirely — used when the backend cannot
    // grant trials, so the UI never advertises a free try it cannot deliver.
    trialRemaining: trialAvailable ? Math.max(0, TRIAL_LIMIT - trialUsed) : null,
    isAdmin: accountState.role === "admin",
    authSessionReady,
    continueAsGuest,
    clearComposer,
  };

  // The admin console keeps the legacy layout: it is internal-only, and
  // rebuilding it would add risk without reaching a single end user.
  if (active === "Admin" && accountState.role === "admin") {
    return (
      <div data-theme="v2" style={{ padding: 16 }}>
        <button className="v2-btn" type="button" onClick={() => setActive("Builder")}>
          ← Back to app
        </button>
        <React.Suspense fallback={<p style={{ padding: 24 }}>Loading admin console…</p>}>
          <AdminConsole {...shared} />
        </React.Suspense>
      </div>
    );
  }

  return <Shell {...shared} onOpenAdmin={() => setActive("Admin")} />;
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
      createRoot(root).render(<LandingPage />);
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
