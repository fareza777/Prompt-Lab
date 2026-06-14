/** Plan tiers and feature gates (shared by web app + server). */

import { shouldUsePhasedAppDelivery } from "./phasedAppDelivery.js";
import { shouldUseStructuredAudit } from "./structuredAuditDelivery.js";

export const PLAN_NAMES = ["Free", "Pro", "Business"];

const TIER = { Free: 0, Pro: 1, Business: 2 };

export const PLAN_ENTITLEMENTS = {
  Free: {
    quotaLimit: 50_000,
    libraryLimit: 25,
    customTemplateLimit: 5,
    /** OpenRouter max_tokens for /api/generate-prompt (completion length cap). */
    generateMaxTokens: 3200,
    maxAttachments: 3,
    docxExport: false,
    pptxExport: false,
    ocrPriority: false,
    aiCompare: false,
    aiOptimize: false,
    priorityRouting: false,
    teamLibraryBundle: false,
  },
  Pro: {
    quotaLimit: 500_000,
    libraryLimit: 100,
    customTemplateLimit: 40,
    generateMaxTokens: 4500,
    maxAttachments: 8,
    docxExport: true,
    pptxExport: true,
    ocrPriority: true,
    aiCompare: true,
    aiOptimize: true,
    priorityRouting: false,
    teamLibraryBundle: false,
  },
  Business: {
    quotaLimit: 2_000_000,
    libraryLimit: 500,
    customTemplateLimit: 120,
    generateMaxTokens: 6000,
    maxAttachments: 8,
    docxExport: true,
    pptxExport: true,
    ocrPriority: true,
    aiCompare: true,
    aiOptimize: true,
    priorityRouting: true,
    teamLibraryBundle: true,
  },
};

export function normalizePlanName(plan) {
  return PLAN_ENTITLEMENTS[plan] ? plan : "Free";
}

export function getEntitlements(plan) {
  return PLAN_ENTITLEMENTS[normalizePlanName(plan)];
}

export function planMeetsMinimum(plan, minimumPlan) {
  return TIER[normalizePlanName(plan)] >= TIER[normalizePlanName(minimumPlan)];
}

export function minPlanForFeature(feature) {
  if (PLAN_ENTITLEMENTS.Free[feature]) return "Free";
  if (PLAN_ENTITLEMENTS.Pro[feature]) return "Pro";
  return "Business";
}

export function canUseFeature(plan, feature) {
  return Boolean(getEntitlements(plan)[feature]);
}

export function canExportFormat(plan, format) {
  const ent = getEntitlements(plan);
  if (format === "docx") return ent.docxExport;
  if (format === "pptx") return ent.pptxExport;
  return false;
}

export function upgradeMessageForFeature(feature) {
  const min = minPlanForFeature(feature);
  const labels = {
    docxExport: "DOCX export",
    pptxExport: "PPTX export",
    ocrPriority: "Priority OCR",
    aiCompare: "AI Compare",
    aiOptimize: "AI Optimizer",
    priorityRouting: "Priority routing",
    teamLibraryBundle: "Team library bundle",
  };
  const name = labels[feature] || feature;
  return `${name} requires the ${min} plan or higher. Upgrade in Membership.`;
}

/**
 * max_tokens for prompt generation (OpenRouter). Phased app/game briefs need more room.
 * Override all plans: OPENROUTER_GENERATE_MAX_TOKENS env (server only).
 */
export function resolveGenerateMaxTokens(
  plan,
  { narrative = "", category = "", outputType = "", qualityMode = "standard" } = {}
) {
  const envOverride =
    typeof process !== "undefined" && process.env?.OPENROUTER_GENERATE_MAX_TOKENS
      ? Number(process.env.OPENROUTER_GENERATE_MAX_TOKENS)
      : 0;
  if (envOverride > 0) return Math.min(8000, Math.max(2200, envOverride));

  const ent = getEntitlements(plan);
  let max = Number(ent.generateMaxTokens) || 3200;
  if (qualityMode === "premium") max += 500;
  if (shouldUsePhasedAppDelivery(narrative, category, outputType)) {
    max = Math.max(max, normalizePlanName(plan) === "Business" ? 6000 : normalizePlanName(plan) === "Pro" ? 5200 : 4800);
  }
  if (shouldUseStructuredAudit(narrative, category, outputType)) {
    max = Math.max(max, normalizePlanName(plan) === "Business" ? 5000 : 4200);
  }
  if (/video\s*prompt/i.test(String(outputType)) || /video\s*ai/i.test(String(category))) {
    const planName = normalizePlanName(plan);
    max = Math.min(max, planName === "Business" ? 4000 : planName === "Pro" ? 3600 : 3000);
  }
  return Math.min(8000, Math.max(2200, max));
}

/** OCR model + limits applied server-side from membership. */
export function resolveOcrRuntime(plan, requestedModel = "") {
  const ent = getEntitlements(plan);
  const freeDefault = "baidu/qianfan-ocr-fast:free";
  if (!ent.ocrPriority) {
    return {
      model: requestedModel || freeDefault,
      maxTokens: 900,
      timeoutMs: 45_000,
    };
  }
  if (normalizePlanName(plan) === "Business") {
    return {
      model:
        requestedModel ||
        (typeof process !== "undefined" && process.env?.OPENROUTER_OCR_MODEL_BUSINESS) ||
        (typeof process !== "undefined" && process.env?.OPENROUTER_OCR_MODEL_PRO) ||
        "google/gemini-2.0-flash-001",
      maxTokens: 2400,
      timeoutMs: 35_000,
    };
  }
  return {
    model:
      requestedModel ||
      (typeof process !== "undefined" && process.env?.OPENROUTER_OCR_MODEL_PRO) ||
      "google/gemini-2.0-flash-001",
    maxTokens: 1600,
    timeoutMs: 40_000,
  };
}

/** Business tier may override primary model for faster routing. */
export function applyPriorityRouting(modelSettings = {}, plan) {
  if (!getEntitlements(plan).priorityRouting) return modelSettings;
  const priorityModel =
    (typeof process !== "undefined" && process.env?.OPENROUTER_BUSINESS_PRIMARY_MODEL) ||
    (typeof process !== "undefined" && process.env?.OPENROUTER_PRIORITY_MODEL) ||
    "";
  if (!priorityModel) return modelSettings;
  return {
    ...modelSettings,
    primaryModel: priorityModel,
  };
}

export const MEMBERSHIP_MARKETING = {
  Free: {
    price: "$0",
    detail: "Builder, limited local library, no Office export.",
    highlights: ["50k tokens/month", "25 saved prompts", "5 custom templates"],
  },
  Pro: {
    price: "Rp 49.000/bulan",
    detail: "Higher quota, priority OCR, DOCX/PPTX export, AI Compare & Optimizer.",
    highlights: [
      "500k tokens/month",
      "DOCX & PPTX export",
      "Priority OCR for image attachments",
      "AI Compare & Optimizer (uses quota)",
    ],
  },
  Business: {
    price: "Rp 199.000/bulan",
    detail: "Everything in Pro plus priority model routing, team library, highest limits.",
    highlights: [
      "2M tokens/month",
      "Priority AI routing",
      "500-prompt library + team backup",
      "120 custom templates",
    ],
  },
};
