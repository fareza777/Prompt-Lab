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
    docxExport: true,
    pdfExport: true,
    pptxExport: false,
    /**
     * Spreadsheets sit with DOCX rather than PPTX: the recap, table-extract,
     * attendance and action-item templates exist to produce one, so gating it
     * would leave four templates with no usable output on the free tier.
     */
    xlsxExport: true,
    ocrPriority: false,
    aiCompare: false,
    /**
     * Free users get the Improve action. It distinguishes the workspace
     * from pasting straight into a chat app, and locking it meant nobody could
     * experience the difference before being asked to pay. Cost stays bounded
     * by the token quota, which Improve draws from like any other call.
     */
    aiOptimize: true,
    priorityRouting: false,
    teamLibraryBundle: false,
    /**
     * Ads pay for the free tier, and paying anything at all removes them.
     * A one-time remove-ads purchase writes the same flag onto the profile,
     * so the profile is consulted first and this is only the fallback.
     */
    adFree: false,
  },
  Pro: {
    quotaLimit: 500_000,
    libraryLimit: 100,
    customTemplateLimit: 40,
    generateMaxTokens: 4500,
    maxAttachments: 8,
    docxExport: true,
    pdfExport: true,
    pptxExport: true,
    xlsxExport: true,
    ocrPriority: true,
    aiCompare: true,
    aiOptimize: true,
    priorityRouting: false,
    teamLibraryBundle: false,
    adFree: true,
  },
  Business: {
    quotaLimit: 2_000_000,
    libraryLimit: 500,
    customTemplateLimit: 120,
    generateMaxTokens: 6000,
    maxAttachments: 8,
    docxExport: true,
    pdfExport: true,
    pptxExport: true,
    xlsxExport: true,
    ocrPriority: true,
    aiCompare: true,
    aiOptimize: true,
    priorityRouting: true,
    teamLibraryBundle: true,
    adFree: true,
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
  if (format === "pdf") return ent.pdfExport;
  if (format === "pptx") return ent.pptxExport;
  if (format === "xlsx") return ent.xlsxExport;
  return false;
}

export function upgradeMessageForFeature(feature) {
  const min = minPlanForFeature(feature);
  const labels = {
    docxExport: "DOCX export",
    pdfExport: "PDF export",
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
    price: "Free",
    detail: "5 finished results per week with complete Word export.",
    // Quota is metered in tokens; the approximate result count is stated so the
    // number means something to someone who has never counted a token.
    highlights: [
      "5 results/week",
      "Word export included",
      "Improve included",
      "25 saved results",
    ],
  },
  Pro: {
    price: "Rp 49.000/mo",
    detail: "Higher quota, priority OCR, Word/PowerPoint export, and AI Compare.",
    highlights: [
      "~110 results/month (500k tokens)",
      "Word & PowerPoint export",
      "Priority OCR for images",
      "AI Compare (uses quota)",
    ],
  },
  Business: {
    price: "Rp 199.000/mo",
    detail: "Everything in Pro plus priority routing, team library, and the highest limits.",
    highlights: [
      "~330 results/month (2M tokens)",
      "Priority AI routing",
      "500 saved results + team backup",
      "120 custom templates",
    ],
  },
};

/**
 * Whether this user should be shown advertising.
 *
 * Three ways to be ad-free, and the order matters. A one-time purchase is
 * recorded on the profile, so it has to outrank the plan lookup — otherwise a
 * Free user who paid to remove ads would keep seeing them.
 *
 * @param {string} plan
 * @param {{ adFree?: boolean, removeAdsPurchased?: boolean }} [profile]
 */
export function shouldShowAds(plan, profile = {}) {
  if (profile.removeAdsPurchased || profile.adFree) return false;
  return !getEntitlements(plan).adFree;
}
