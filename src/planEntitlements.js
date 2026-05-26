/** Plan tiers and feature gates (shared by web app + server). */

export const PLAN_NAMES = ["Free", "Pro", "Business"];

const TIER = { Free: 0, Pro: 1, Business: 2 };

export const PLAN_ENTITLEMENTS = {
  Free: {
    quotaLimit: 50_000,
    libraryLimit: 25,
    customTemplateLimit: 5,
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
    docxExport: "Export DOCX",
    pptxExport: "Export PPTX",
    ocrPriority: "OCR prioritas",
    aiCompare: "AI Compare",
    aiOptimize: "AI Optimizer",
    priorityRouting: "Priority routing",
    teamLibraryBundle: "Team library bundle",
  };
  const name = labels[feature] || feature;
  return `${name} membutuhkan plan ${min} atau lebih tinggi. Upgrade di Membership.`;
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
    price: "Rp0",
    detail: "Builder, library lokal terbatas, tanpa export Office.",
    highlights: ["50k token/bulan", "25 prompt tersimpan", "5 template custom"],
  },
  Pro: {
    price: "Rp49k/mo",
    detail: "Kuota besar, OCR prioritas, export DOCX/PPTX, AI Compare & Optimizer.",
    highlights: [
      "500k token/bulan",
      "Export DOCX & PPTX",
      "OCR prioritas untuk lampiran gambar",
      "AI Compare & Optimizer",
    ],
  },
  Business: {
    price: "Rp199k/mo",
    detail: "Semua Pro + routing model prioritas, library tim, limit tertinggi.",
    highlights: [
      "2M token/bulan",
      "Priority AI routing",
      "500 prompt library + backup tim",
      "120 template custom",
    ],
  },
};
