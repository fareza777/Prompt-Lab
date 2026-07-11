import "dotenv/config";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import express from "express";
import JSZip from "jszip";
import mammoth from "mammoth";
import multer from "multer";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { buildPhasedAppDeliveryInstruction } from "../src/phasedAppDelivery.js";
import { buildStructuredAuditInstruction } from "../src/structuredAuditDelivery.js";
import {
  buildGrokVideoFrameworkInstruction,
  buildImageVideoPromptAddon,
  detectImageVideoIntent,
  isGrokTarget,
} from "../src/imageVideoPromptDelivery.js";
import {
  buildIntentSystemPromptXml,
  buildLeanIntentSystemPrompt,
  buildOptimizerSystemPromptXml,
  buildCompareSystemPromptXml,
  validatePromptStructure,
  buildStructureRetryInstruction,
  getExpandedDomainPack,
  getFewShotForMode,
  buildSwappedComparePayload,
  mergeComparePositionSwap,
  renderForModelDialect,
  evalDelta,
  shouldRunSelfConsistency,
  pickBestCandidate,
  scrubPII,
  PROMPT_ENGINE_VERSION,
} from "./prompt-engine-v2.js";
import {
  getLanguageLockInstruction,
  getLanguageMeta,
  resolveOutputLanguage,
} from "../src/promptLanguage.js";
import {
  applyPriorityRouting,
  canExportFormat,
  canUseFeature,
  getEntitlements,
  normalizePlanName,
  resolveGenerateMaxTokens,
  resolveOcrRuntime,
  upgradeMessageForFeature,
} from "../src/planEntitlements.js";
import { API_MSG, UNSUPPORTED_FILE_TYPE } from "../src/apiUserMessages.js";
import { isSuperAccount, SUPER_QUOTA_LIMIT } from "../src/superAccounts.js";
import {
  getPlanForProductId,
  verifyPlaySubscriptionPurchase,
  acknowledgePlaySubscriptionPurchase,
  classifyPlaySyncVerification,
  hashPurchaseToken,
  claimPlayMembership,
  loadPlayMembershipEvents,
  persistPlayMembership,
  FREE_PLAN_DEFAULTS,
} from "./playBillingGoogle.js";
import { persistReservedUsage, quotaFailureStatus } from "./quotaReservation.js";
import {
  handleLemonSqueezyWebhook,
  parseLemonSqueezyWebhook,
  verifyLemonSqueezySignature,
} from "./lemonSqueezyBilling.js";
import {
  clearRuntimeConfigCache,
  getCachedPublishedModelSettings,
  mergeModelSettingsLayers,
  savePublishedModelSettings,
  toPublicRuntimeConfig,
} from "./runtimeConfig.js";
import { fetchAdminOverview, fetchAdminUsers, patchAdminUser } from "./adminApi.js";
import {
  buildProviderChatCompletionBody,
  resolveMinimaxBaseUrl,
} from "./minimaxProvider.js";
import { scorePromptForCompare, getLocalPromptRisks } from "../src/promptEngine/scoreCompare.js";
import { createAiRateLimiter, markPriorityRequest } from "./rateLimit.js";
import { prepareUntrustedAttachment } from "./safeAttachment.js";
import { initSse, sendSse, sendSsePhase, consumeOpenRouterStream } from "./sse.js";

const app = express();

async function attachAiRateLimitIdentity(req, _res, next) {
  try {
    const membership = await getMembershipFromRequest(req);
    req.authUserId = membership?.user?.id || "";
    req.aiRateLimitPlan = membership?.plan || "Free";
  } catch {
    req.authUserId = "";
    req.aiRateLimitPlan = "Free";
  }
  next();
}

const aiRateLimit = createAiRateLimiter({
  getPlan: (req) => req.aiRateLimitPlan || "Free",
});

function enrichPayloadWithLanguage(payload, attachments = []) {
  const outputLanguage = resolveOutputLanguage(
    payload.narrative,
    payload.prompt,
    ...(attachments || []).map((file) => file.excerpt).filter(Boolean)
  );
  return { ...payload, outputLanguage };
}
const port = Number(process.env.PORT || 8787);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 8,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMime = [
      "application/json",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/csv",
      "text/markdown",
      "text/plain",
    ];
    const allowedExt = /\.(csv|docx|json|md|pdf|png|jpe?g|pptx|txt|webp|xlsx)$/i;
    if (allowedMime.includes(file.mimetype) || allowedExt.test(file.originalname)) {
      cb(null, true);
      return;
    }
    cb(new Error(UNSUPPORTED_FILE_TYPE));
  },
});

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const openrouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://127.0.0.1:5173",
        "X-Title": "PromptLab",
      },
    })
  : null;
const provider =
  process.env.AI_PROVIDER || (process.env.MINIMAX_API_KEY ? "minimax" : openrouter ? "openrouter" : "openai");
const openRouterPrimaryTimeoutMs = Number(process.env.OPENROUTER_PRIMARY_TIMEOUT_MS || 55000);
const openRouterFallbackTimeoutMs = Number(process.env.OPENROUTER_FALLBACK_TIMEOUT_MS || 55000);
const openRouterOcrModel = process.env.OPENROUTER_OCR_MODEL || "baidu/qianfan-ocr-fast:free";
const openRouterOcrTimeoutMs = Number(process.env.OPENROUTER_OCR_TIMEOUT_MS || 45000);
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const quotaAuthEnabled = Boolean(supabaseUrl && supabaseAnonKey) && process.env.QUOTA_AUTH_ENABLED !== "false";
const quotaServiceRoleEnabled = Boolean(supabaseUrl && supabaseServiceRoleKey);
const defaultOpenRouterFallbackModels = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "openai/gpt-oss-20b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];

const allowedCorsOrigins = [
  process.env.APP_URL || "https://prompt-lab.xyz",
  process.env.CORS_ORIGIN || "",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]
  .flatMap((value) => String(value).split(","))
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedCorsOrigins.includes(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.post(
  "/api/billing/lemon-squeezy-webhook",
  express.raw({ type: "application/json", limit: "256kb" }),
  async (req, res) => {
    try {
      const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";
      const signature = req.get("X-Signature") || "";
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");

      const verified = verifyLemonSqueezySignature(rawBody, signature, secret);
      if (!verified.ok) {
        res.status(401).json({ error: verified.error });
        return;
      }

      const parsed = parseLemonSqueezyWebhook(rawBody);
      if (!parsed.ok) {
        res.status(400).json({ error: parsed.error });
        return;
      }

      const admin = createServiceRoleSupabaseClient();
      if (!admin) {
        res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for billing webhooks." });
        return;
      }

      const result = await handleLemonSqueezyWebhook(admin, parsed.payload, parsed.eventName);
      if (!result.ok) {
        console.error("lemon squeezy webhook", parsed.eventName, result.error);
        res.status(result.userId ? 422 : 400).json({ error: result.error || "Webhook handling failed." });
        return;
      }

      res.json({
        ok: true,
        event: parsed.eventName,
        ignored: Boolean(result.ignored),
        plan: result.plan || null,
        userId: result.userId || null,
      });
    } catch (error) {
      console.error("lemon squeezy webhook error", error);
      res.status(500).json({ error: error.message || "Webhook error." });
    }
  }
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (req, res) => {
  try {
    const modelSettings = await resolveModelSettings(req, req.query);
    const runtime = getRuntimeProvider(modelSettings);
    const { meta } = await getCachedPublishedModelSettings(createServiceRoleSupabaseClient());
    const aiReady = Boolean(runtime.client);
    const status = aiReady ? "online" : "degraded";
    res.json({
      ok: aiReady,
      status,
      ai: aiReady,
      endpoint: runtime.baseURL || "OpenAI default",
      provider: runtime.provider,
      model: modelSettings.primaryModel || runtime.defaultModel,
      fallbackModel:
        runtime.provider === "openai"
          ? null
          : getOpenRouterFallbackModels(
              modelSettings.primaryModel || runtime.defaultModel,
              "balanced",
              modelSettings.fallbackModels,
              runtime.provider
            )[0] || null,
      fallbackModels:
        runtime.provider === "openai"
          ? []
          : getOpenRouterFallbackModels(
              modelSettings.primaryModel || runtime.defaultModel,
              "balanced",
              modelSettings.fallbackModels,
              runtime.provider
            ),
      ocrModel: modelSettings.ocrModel || getDefaultOcrModel(),
      configSource: meta?.updatedAt ? "published" : "env",
      configUpdatedAt: meta?.updatedAt || null,
      warning: aiReady ? "" : "AI provider is not configured. Generations may use a local preview.",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      status: "offline",
      ai: false,
      error: error.message || "Health check failed.",
    });
  }
});

app.get("/api/runtime-config", async (_req, res) => {
  try {
    const admin = createServiceRoleSupabaseClient();
    const { settings: published, meta } = await getCachedPublishedModelSettings(admin);
    const merged = mergeModelSettingsLayers({ published, allowRequestOverride: false });
    res.json({
      ok: true,
      source: published ? "published" : "env",
      config: toPublicRuntimeConfig(merged, meta),
    });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message || "Runtime config unavailable." });
  }
});

app.get("/api/admin/runtime-config", async (req, res) => {
  try {
    await requireAdminMembership(req);
    const admin = createServiceRoleSupabaseClient();
    if (!admin) {
      res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to load global config." });
      return;
    }
    const { settings: published, meta } = await getCachedPublishedModelSettings(admin);
    const merged = mergeModelSettingsLayers({ published, allowRequestOverride: false });
    res.json({
      ok: true,
      source: published ? "published" : "env",
      config: toPublicRuntimeConfig(merged, meta),
      draft: published || null,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Failed to load config." });
  }
});

app.put("/api/admin/runtime-config", express.json({ limit: "64kb" }), async (req, res) => {
  try {
    const membership = await requireAdminMembership(req);
    const admin = createServiceRoleSupabaseClient();
    if (!admin) {
      res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to publish global config." });
      return;
    }
    const normalized = normalizeModelSettings(req.body);
    const saved = await savePublishedModelSettings(admin, normalized, membership.user?.id);
    clearRuntimeConfigCache();
    res.json({
      ok: true,
      message: "Global model routing published. All users on production will use this within a few seconds.",
      config: toPublicRuntimeConfig(normalized, saved.meta),
      updatedAt: saved.meta?.updatedAt || null,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Failed to publish config." });
  }
});

app.get("/api/admin/analytics/overview", async (req, res) => {
  try {
    await requireAdminMembership(req);
    const admin = createServiceRoleSupabaseClient();
    if (!admin) {
      res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for admin analytics." });
      return;
    }
    const overview = await fetchAdminOverview(admin);
    res.json({ ok: true, overview });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Failed to load analytics." });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    await requireAdminMembership(req);
    const admin = createServiceRoleSupabaseClient();
    if (!admin) {
      res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for user management." });
      return;
    }
    const result = await fetchAdminUsers(admin, {
      limit: req.query.limit,
      offset: req.query.offset,
      search: req.query.search,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Failed to load users." });
  }
});

app.patch("/api/admin/users/:userId", express.json({ limit: "16kb" }), async (req, res) => {
  try {
    await requireAdminMembership(req);
    const admin = createServiceRoleSupabaseClient();
    if (!admin) {
      res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for user management." });
      return;
    }
    const body = req.body || {};
    const updated = await patchAdminUser(admin, req.params.userId, {
      plan: body.plan,
      role: body.role,
      quotaLimit: body.quotaLimit,
      quotaUsed: body.quotaUsed,
      quotaResetAt: body.quotaResetAt,
    });
    res.json({ ok: true, user: updated });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Failed to update user." });
  }
});

app.post("/api/test-provider", express.json({ limit: "64kb" }), async (req, res) => {
  try {
    await requireAdminMembership(req);
    const modelSettings = await resolveModelSettings(req, req.body);
    const runtime = getRuntimeProvider(modelSettings);
    const model = modelSettings.primaryModel || runtime.defaultModel;

    if (!runtime.client) {
      res.status(400).json({ ok: false, provider: runtime.provider, error: API_MSG.apiKeyInactive });
      return;
    }

    if (runtime.provider !== "openai") {
      const completion = await withTimeout(
        runtime.client.chat.completions.create(
          buildProviderChatCompletionBody(runtime, {
            model,
            messages: [
              {
                role: "user",
                content:
                  "Buat prompt singkat berbahasa Indonesia untuk mengubah brief mentah menjadi prompt AI profesional. Maksimal 120 kata.",
              },
            ],
            max_tokens: 220,
          }),
          { timeout: 20000 }
        ),
        20000,
        model
      );

      res.json({
        ok: true,
        provider: runtime.provider,
        endpoint: runtime.baseURL,
        model: completion.model || model,
        message: completion.choices?.[0]?.message?.content || "OK",
      });
      return;
    }

    const response = await runtime.client.responses.create(
      {
        model,
        input: "Buat prompt singkat berbahasa Indonesia untuk mengubah brief mentah menjadi prompt AI profesional. Maksimal 120 kata.",
      },
      { timeout: 20000 }
    );

    res.json({
      ok: true,
      provider: runtime.provider,
      endpoint: runtime.baseURL || "OpenAI default",
      model,
      message: response.output_text || "OK",
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      provider: normalizeModelSettings(req.body).provider || provider,
      error: formatProviderError(error),
    });
  }
});

app.post("/api/export/docx", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const membership = await getMembershipFromRequest(req);
    if (!canExportFormat(membership.plan, "docx")) {
      res.status(402).json({ error: upgradeMessageForFeature("docxExport"), code: "UPGRADE_REQUIRED", minPlan: "Pro" });
      return;
    }
    const { title, content } = normalizeExportPayload(req.body);
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: title,
              heading: HeadingLevel.TITLE,
            }),
            ...markdownToDocxParagraphs(content),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename(title)}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error("docx export failed", error.message);
    res.status(500).json({ error: API_MSG.docxFailed });
  }
});

app.post("/api/export/pptx", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const membership = await getMembershipFromRequest(req);
    if (!canExportFormat(membership.plan, "pptx")) {
      res.status(402).json({ error: upgradeMessageForFeature("pptxExport"), code: "UPGRADE_REQUIRED", minPlan: "Pro" });
      return;
    }
    const { title, content } = normalizeExportPayload(req.body);
    const { default: pptxgen } = await import("pptxgenjs");
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "PromptLab";
    pptx.subject = title;
    pptx.title = title;
    pptx.company = "PromptLab";
    pptx.lang = "id-ID";
    buildSlidesFromContent(pptx, title, content);
    const buffer = await pptx.write({ outputType: "nodebuffer" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename(title)}.pptx"`);
    res.send(buffer);
  } catch (error) {
    console.error("pptx export failed", error.message);
    res.status(500).json({ error: API_MSG.pptxFailed });
  }
});

app.post("/api/billing/verify-play-purchase", express.json({ limit: "32kb" }), async (req, res) => {
  try {
    const productId = String(req.body?.productId || "").trim();
    const purchaseToken = String(req.body?.purchaseToken || "").trim();
    if (!productId || !purchaseToken) {
      res.status(400).json({ error: "productId and purchaseToken are required." });
      return;
    }

    const planConfig = getPlanForProductId(productId);
    if (!planConfig) {
      res.status(400).json({ error: "Unknown product ID." });
      return;
    }

    const quotaSession = await getQuotaSession(req, 0);
    const verification = await verifyPlaySubscriptionPurchase({
      subscriptionId: productId,
      purchaseToken,
    });

    if (!verification.ok) {
      if (verification.expired) {
        await downgradePlayMembershipIfNeeded(quotaSession.user.id, {
          reason: "expired_on_verify",
          productId,
        });
      }
      res.status(400).json({ error: verification.error || "Google Play verification failed." });
      return;
    }

    const admin = createServiceRoleSupabaseClient();
    if (!admin || !quotaSession?.user?.id) {
      res.status(503).json({ error: "Membership server is not ready." });
      return;
    }

    const userId = quotaSession.user.id;
    const tokenHash = hashPurchaseToken(purchaseToken);

    let acknowledged = Number(verification.acknowledgementState) === 1;
    if (!acknowledged) {
      const ack = await acknowledgePlaySubscriptionPurchase({
        subscriptionId: productId,
        purchaseToken,
        packageName: verification.packageName,
      });
      if (!ack.ok) {
        console.warn("play acknowledge failed", ack.error);
        res.status(502).json({
          error: ack.error || "Purchase verified but could not be acknowledged. Please try again.",
        });
        return;
      }
      acknowledged = true;
    }

    const previousPlan = normalizePlanName(quotaSession.profile?.plan);
    const upgrading = previousPlan !== planConfig.plan;
    const profileUpdate = {
      plan: planConfig.plan,
      quota_limit: planConfig.quotaLimit,
      play_billing: "Google Play",
      updated_at: new Date().toISOString(),
    };
    // Fresh paid period: reset usage so upgrade feels immediate.
    if (upgrading && previousPlan === "Free") {
      profileUpdate.quota_used = 0;
      const resetDate = new Date();
      resetDate.setDate(resetDate.getDate() + 30);
      profileUpdate.quota_reset_at = resetDate.toISOString().slice(0, 10);
    }

    const persisted = await claimPlayMembership(admin, {
      userId,
      tokenHash,
      profileUpdate,
      event: {
        event_type: "subscription_verified",
        plan: planConfig.plan,
        metadata: {
          productId,
          orderId: verification.orderId || "",
          expiryTimeMillis: verification.expiryTimeMillis || null,
          acknowledged,
        },
      },
    });
    if (persisted.conflict) {
      res.status(409).json({ error: "This purchase is already linked to another account." });
      return;
    }
    if (!persisted.ok) {
      res.status(503).json({ error: "Could not update your membership. Please try again." });
      return;
    }

    const { data: profile, error: readError } = await admin
      .from("profiles")
      .select("id,email,full_name,role,plan,quota_used,quota_limit,quota_reset_at,play_billing")
      .eq("id", userId)
      .maybeSingle();

    if (readError || !profile) {
      res.json({ ok: true, plan: planConfig.plan, message: "Plan updated." });
      return;
    }

    res.json({
      ok: true,
      plan: planConfig.plan,
      message: `Successfully upgraded to ${planConfig.plan}.`,
      quota: publicQuota(profile),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Billing error." });
  }
});

app.post("/api/billing/restore-play-purchases", express.json({ limit: "64kb" }), async (req, res) => {
  try {
    const purchases = Array.isArray(req.body?.purchases) ? req.body.purchases : [];
    if (!purchases.length) {
      res.status(400).json({ error: "No Google Play purchases were provided." });
      return;
    }

    const quotaSession = await getQuotaSession(req, 0);
    const admin = createServiceRoleSupabaseClient();
    if (!admin || !quotaSession?.user?.id) {
      res.status(503).json({ error: "Membership server is not ready." });
      return;
    }

    const userId = quotaSession.user.id;
    let lastPlan = null;
    let lastQuota = null;
    let sawExpired = false;
    let sawClaimConflict = false;
    const errors = [];

    for (const item of purchases.slice(0, 6)) {
      const productId = String(item.productId || item.itemId || "").trim();
      const purchaseToken = String(item.purchaseToken || item.token || "").trim();
      if (!productId || !purchaseToken) continue;
      try {
        const planConfig = getPlanForProductId(productId);
        if (!planConfig) {
          errors.push(`${productId}: unknown product`);
          continue;
        }
        const verification = await verifyPlaySubscriptionPurchase({ subscriptionId: productId, purchaseToken });
        if (!verification.ok) {
          if (verification.expired) sawExpired = true;
          errors.push(`${productId}: ${verification.error}`);
          continue;
        }

        const tokenHash = hashPurchaseToken(purchaseToken);
        if (Number(verification.acknowledgementState) !== 1) {
          const ack = await acknowledgePlaySubscriptionPurchase({ subscriptionId: productId, purchaseToken });
          if (!ack.ok) {
            errors.push(`${productId}: ${ack.error || "acknowledge failed"}`);
            continue;
          }
        }

        const previousPlan = normalizePlanName(quotaSession.profile?.plan);
        const profileUpdate = {
          plan: planConfig.plan,
          quota_limit: planConfig.quotaLimit,
          play_billing: "Google Play",
          updated_at: new Date().toISOString(),
        };
        if (previousPlan === "Free" && planConfig.plan !== "Free") {
          profileUpdate.quota_used = 0;
          const resetDate = new Date();
          resetDate.setDate(resetDate.getDate() + 30);
          profileUpdate.quota_reset_at = resetDate.toISOString().slice(0, 10);
        }

        const persisted = await claimPlayMembership(admin, {
          userId,
          tokenHash,
          profileUpdate,
          event: {
            event_type: "subscription_restored",
            plan: planConfig.plan,
            metadata: {
              productId,
              orderId: verification.orderId || "",
              expiryTimeMillis: verification.expiryTimeMillis || null,
            },
          },
        });
        if (persisted.conflict) {
          sawClaimConflict = true;
          errors.push(`${productId}: already linked to another account`);
          continue;
        }
        if (!persisted.ok) {
          errors.push(`${productId}: membership persistence unavailable`);
          continue;
        }
        lastPlan = planConfig.plan;
        const { data: profile } = await admin
          .from("profiles")
          .select("id,email,full_name,role,plan,quota_used,quota_limit,quota_reset_at,play_billing")
          .eq("id", userId)
          .maybeSingle();
        if (profile) lastQuota = publicQuota(profile);
      } catch (error) {
        errors.push(error.publicMessage || error.message || "restore failed");
      }
    }

    if (!lastPlan) {
      if (sawExpired && !sawClaimConflict) {
        await downgradePlayMembershipIfNeeded(userId, { reason: "expired_on_restore" });
      }
      res.status(sawClaimConflict ? 409 : 400).json({
        error: errors[0] || "No active Play purchases found.",
        errors,
      });
      return;
    }

    res.json({
      ok: true,
      plan: lastPlan,
      message: `Restored ${lastPlan} membership from Google Play.`,
      quota: lastQuota,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Restore failed." });
  }
});

app.post("/api/billing/sync-play-membership", express.json({ limit: "32kb" }), async (req, res) => {
  try {
    const quotaSession = await getQuotaSession(req, 0);
    const admin = createServiceRoleSupabaseClient();
    if (!admin || !quotaSession?.user?.id) {
      res.status(503).json({ error: "Membership server is not ready." });
      return;
    }

    const userId = quotaSession.user.id;
    const currentPlan = normalizePlanName(quotaSession.profile?.plan);
    if (currentPlan === "Free") {
      res.json({ ok: true, plan: "Free", changed: false, quota: publicQuota(quotaSession.profile) });
      return;
    }

    const storedEvents = await loadPlayMembershipEvents(admin, userId);
    if (!storedEvents.ok) {
      res.status(503).json({ error: "Could not verify membership status. Please try again." });
      return;
    }
    const events = storedEvents.events;

    const purchases = Array.isArray(req.body?.purchases) ? req.body.purchases : [];
    let stillActive = false;
    let activePlan = null;
    let activeQuota = null;
    let sawAuthoritativeInactive = false;
    let sawIndeterminate = false;

    for (const item of purchases.slice(0, 6)) {
      const productId = String(item.productId || item.itemId || "").trim();
      const purchaseToken = String(item.purchaseToken || item.token || "").trim();
      if (!productId || !purchaseToken) {
        sawIndeterminate = true;
        continue;
      }
      const planConfig = getPlanForProductId(productId);
      if (!planConfig) {
        sawIndeterminate = true;
        continue;
      }
      let verification;
      try {
        verification = await verifyPlaySubscriptionPurchase({ subscriptionId: productId, purchaseToken });
      } catch {
        sawIndeterminate = true;
        continue;
      }
      const verificationState = classifyPlaySyncVerification(verification);
      if (verificationState === "inactive") {
        sawAuthoritativeInactive = true;
        continue;
      }
      if (verificationState === "indeterminate") {
        sawIndeterminate = true;
        continue;
      }
      stillActive = true;
      activePlan = planConfig.plan;
      const tokenHash = hashPurchaseToken(purchaseToken);
      const persisted = await claimPlayMembership(admin, {
        userId,
        tokenHash,
        profileUpdate: {
          plan: planConfig.plan,
          quota_limit: planConfig.quotaLimit,
          play_billing: "Google Play",
          updated_at: new Date().toISOString(),
        },
        event: {
          event_type: "subscription_synced",
          plan: planConfig.plan,
          metadata: {
            productId,
            orderId: verification.orderId || "",
            expiryTimeMillis: verification.expiryTimeMillis || null,
          },
        },
      });
      if (persisted.conflict) {
        throw publicApiError("This purchase is already linked to another account.", 409);
      }
      if (!persisted.ok) {
        throw publicApiError("Could not update your membership. Please try again.", 503);
      }
      const { data: profile } = await admin
        .from("profiles")
        .select("id,email,full_name,role,plan,quota_used,quota_limit,quota_reset_at,play_billing")
        .eq("id", userId)
        .maybeSingle();
      if (profile) activeQuota = publicQuota(profile);
      break;
    }

    // If client sent no purchases but profile is paid via Play, check stored expiry metadata.
    if (!stillActive && !purchases.length) {
      const latest = (events || []).find((row) => row.metadata?.expiryTimeMillis);
      const expiry = Number(latest?.metadata?.expiryTimeMillis || 0);
      if (expiry && expiry > Date.now()) {
        stillActive = true;
        activePlan = currentPlan;
        activeQuota = publicQuota(quotaSession.profile);
      } else if (expiry) {
        sawAuthoritativeInactive = true;
      } else {
        sawIndeterminate = true;
      }
    }

    if (!stillActive) {
      if (sawIndeterminate || !sawAuthoritativeInactive) {
        throw publicApiError("Could not verify membership status. Please try again.", 503);
      }
      const downgraded = await downgradePlayMembershipIfNeeded(userId, { reason: "sync_inactive" });
      res.json({
        ok: true,
        plan: "Free",
        changed: Boolean(downgraded),
        message: downgraded ? "Membership updated to Free because no active Play subscription was found." : "Already on Free.",
        quota: downgraded || publicQuota({ ...quotaSession.profile, plan: "Free", quota_limit: FREE_PLAN_DEFAULTS.quotaLimit }),
      });
      return;
    }

    res.json({
      ok: true,
      plan: activePlan || currentPlan,
      changed: false,
      quota: activeQuota || publicQuota(quotaSession.profile),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Sync failed." });
  }
});

async function downgradePlayMembershipIfNeeded(
  userId,
  { reason = "expired", productId = "" } = {},
  adminOverride = null
) {
  const admin = adminOverride || createServiceRoleSupabaseClient();
  if (!admin || !userId) return null;
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,email,full_name,role,plan,quota_used,quota_limit,quota_reset_at,play_billing")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    throw publicApiError("Could not verify your membership. Please try again.", 503);
  }
  if (!profile) return null;
  if (normalizePlanName(profile.plan) === "Free") return publicQuota(profile);
  if (!/google play/i.test(String(profile.play_billing || ""))) return publicQuota(profile);

  const profileUpdate = {
      plan: FREE_PLAN_DEFAULTS.plan,
      quota_limit: FREE_PLAN_DEFAULTS.quotaLimit,
      play_billing: "Expired",
      updated_at: new Date().toISOString(),
  };
  const persisted = await persistPlayMembership(admin, {
    userId,
    profileUpdate,
    event: {
      event_type: "subscription_expired",
      plan: "Free",
      metadata: { reason, productId },
    },
  });
  if (!persisted.ok) {
    throw publicApiError("Could not update your membership. Please try again.", 503);
  }
  const { data: updated } = await admin
    .from("profiles")
    .select("id,email,full_name,role,plan,quota_used,quota_limit,quota_reset_at,play_billing")
    .eq("id", userId)
    .maybeSingle();
  return publicQuota(updated || { ...profile, plan: "Free", quota_limit: FREE_PLAN_DEFAULTS.quotaLimit, play_billing: "Expired" });
}
app.post("/api/account/delete", express.json({ limit: "8kb" }), async (req, res) => {
  try {
    const confirm = String(req.body?.confirm || "").trim().toUpperCase();
    if (confirm !== "DELETE") {
      res.status(400).json({ error: 'Type confirm: "DELETE" to permanently delete your account.' });
      return;
    }
    const quotaSession = await getQuotaSession(req, 0);
    const admin = createServiceRoleSupabaseClient();
    if (!admin || !quotaSession?.user?.id) {
      res.status(503).json({ error: "Account deletion is not available right now." });
      return;
    }
    const userId = quotaSession.user.id;
    await admin.from("membership_events").insert({
      user_id: userId,
      event_type: "account_delete_requested",
      plan: quotaSession.profile?.plan || "Free",
      provider: "app",
      metadata: { at: new Date().toISOString() },
    });
    // Best-effort cleanup of user library before auth user delete.
    await admin.from("user_library").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      res.status(503).json({ error: `Failed to delete auth user: ${deleteError.message}` });
      return;
    }
    res.json({ ok: true, message: "Account deleted." });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Delete failed." });
  }
});

app.post("/api/optimize-prompt", attachAiRateLimitIdentity, aiRateLimit, express.json({ limit: "256kb" }), async (req, res) => {
  try {
    const membership = await getMembershipFromRequest(req);
    if (!canUseFeature(membership.plan, "aiOptimize")) {
      res.status(402).json({ error: upgradeMessageForFeature("aiOptimize"), code: "UPGRADE_REQUIRED", minPlan: "Pro" });
      return;
    }
    const modelSettings = applyPriorityRouting(
      await resolveModelSettings(req, req.body),
      membership.plan
    );
    const payload = enrichPayloadWithLanguage(normalizeOptimizePayload(req.body, modelSettings));
    const quotaEstimate = estimateOptimizeTokens(payload);
    const quotaSession = await getQuotaSession(req, quotaEstimate);
    const runtime = getRuntimeProvider(payload.modelSettings);
    let body;

    if (runtime.provider !== "openai" && runtime.client) {
      try {
        const completion = await createOpenRouterOptimizeCompletion(payload, runtime);
        const optimizedRaw = completion.choices?.[0]?.message?.content || "";
        let optimizedPrompt = sanitizePromptOutput(optimizedRaw) || buildLocalOptimizedPrompt(payload);
        const optCheck = validatePromptStructure(optimizedPrompt);
        if (!optCheck.valid && runtime.client) {
          try {
            const retryCompletion = await createOpenRouterOptimizeCompletion(
              {
                ...payload,
                prompt: `${payload.prompt}\n\nPrevious rewrite missed sections: ${optCheck.missing.join(", ")}. Rewrite again with all required sections.`,
              },
              runtime
            );
            const retryRaw = retryCompletion.choices?.[0]?.message?.content || "";
            const retryPrompt = sanitizePromptOutput(retryRaw);
            if (retryPrompt && !isPromptTooShort(retryPrompt)) {
              optimizedPrompt = retryPrompt;
            }
          } catch (retryError) {
            console.warn("optimize structure retry failed", retryError.message);
          }
        }
        body = {
          engineVersion: PROMPT_ENGINE_VERSION,
          piiFindings: payload.piiFindings || [],
          source: runtime.provider,
          model: completion.model,
          prompt: optimizedPrompt,
        };
      } catch (error) {
        console.warn("openrouter optimize fallback", error.status || error.code || error.message);
        body = {
          engineVersion: PROMPT_ENGINE_VERSION,
          piiFindings: payload.piiFindings || [],
          source: "fallback",
          warning: API_MSG.providerOverloadOptimizer,
          prompt: buildLocalOptimizedPrompt(payload),
        };
      }
    } else if (runtime.provider === "openai" && runtime.client) {
      const response = await runtime.client.responses.create({
        model: payload.modelSettings.primaryModel || runtime.defaultModel,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: buildOptimizerSystemPromptXml(payload),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildOptimizerInstruction(payload),
              },
            ],
          },
        ],
      });
      const sanitizedOptimizerPrompt = sanitizePromptOutput(response.output_text);
      body = {
        engineVersion: PROMPT_ENGINE_VERSION,
        piiFindings: payload.piiFindings || [],
        source: "openai",
        prompt: sanitizedOptimizerPrompt || buildLocalOptimizedPrompt(payload),
      };
    } else {
      body = {
        engineVersion: PROMPT_ENGINE_VERSION,
        piiFindings: payload.piiFindings || [],
        source: "fallback",
        prompt: buildLocalOptimizedPrompt(payload),
      };
    }

    await finishGenerateResponse(
      res,
      quotaSession,
      {
        eventType: "optimize_prompt",
        metadata: { mode: payload.mode, source: body.source, modelTarget: payload.targetModel },
        tokenEstimate: quotaEstimate,
        outputText: body.prompt,
      },
      body
    );
  } catch (error) {
    console.error("optimize-prompt failed", error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Failed to optimize prompt." });
  }
});

app.post("/api/compare-prompts", attachAiRateLimitIdentity, aiRateLimit, express.json({ limit: "256kb" }), async (req, res) => {
  try {
    const membership = await getMembershipFromRequest(req);
    if (!canUseFeature(membership.plan, "aiCompare")) {
      res.status(402).json({ error: upgradeMessageForFeature("aiCompare"), code: "UPGRADE_REQUIRED", minPlan: "Pro" });
      return;
    }
    const modelSettings = applyPriorityRouting(
      await resolveModelSettings(req, req.body),
      membership.plan
    );
    const payload = normalizeComparePayload(req.body, modelSettings);

    if (!payload.promptA.trim() || !payload.promptB.trim()) {
      res.status(400).json({ error: "Prompt A and Prompt B are required." });
      return;
    }

    const runtime = getRuntimeProvider(payload.modelSettings);
    const usesAiJudge = Boolean(runtime.client);
    const quotaEstimate = estimateCompareTokens(payload, { positionSwap: usesAiJudge });
    const quotaSession = await getQuotaSession(req, quotaEstimate);
    let body;

    if (runtime.provider !== "openai" && runtime.client) {
      try {
        const generation = await createOpenRouterCompareCompletion(payload, runtime);
        const raw = generation.completion.choices?.[0]?.message?.content || "";
        const evaluation = resolveCompareEvaluation(raw, payload);
        let result = evaluation.result;
        try {
          const swappedPayload = buildSwappedComparePayload(payload);
          const swappedGen = await createOpenRouterCompareCompletion(swappedPayload, runtime);
          const swappedRaw = swappedGen.completion.choices?.[0]?.message?.content || "";
          const swappedResult = parseCompareResult(swappedRaw);
          if (swappedResult) result = mergeComparePositionSwap(result, swappedResult);
        } catch (swapErr) {
          console.warn("compare position-swap failed", swapErr.message);
        }
        body = {
          source: runtime.provider,
          model: generation.completion.model,
          modelStatus: generation.usedFallbackModel ? "fallback-model" : "primary-model",
          warning: generation.usedFallbackModel
            ? API_MSG.primaryFallback(generation.primaryError)
            : "",
          evaluationMethod: evaluation.evaluationMethod,
          result,
        };
      } catch (error) {
        console.warn("openrouter compare fallback", error.status || error.code || error.message);
        body = {
          source: "fallback",
          model: "Local fallback",
          modelStatus: "local-fallback",
          warning: API_MSG.providerOverloadCompare,
          result: buildLocalCompareResult(payload),
        };
      }
    } else if (runtime.provider === "openai" && runtime.client) {
      const response = await runtime.client.responses.create({
        model: payload.modelSettings.primaryModel || runtime.defaultModel,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: buildCompareSystemPromptXml(payload),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildCompareInstruction(payload),
              },
            ],
          },
        ],
      });
      const evaluation = resolveCompareEvaluation(response.output_text || "", payload);
      let result = evaluation.result;
      try {
        const swappedPayload = buildSwappedComparePayload(payload);
        const swappedResp = await runtime.client.responses.create({
          model: payload.modelSettings.primaryModel || runtime.defaultModel,
          input: [
            { role: "system", content: [{ type: "input_text", text: buildCompareSystemPromptXml(swappedPayload) }] },
            { role: "user", content: [{ type: "input_text", text: buildCompareInstruction(swappedPayload) }] },
          ],
        });
        const swappedResult = parseCompareResult(swappedResp.output_text || "");
        if (swappedResult) result = mergeComparePositionSwap(result, swappedResult);
      } catch (swapErr) {
        console.warn("openai compare position-swap failed", swapErr.message);
      }
      body = {
        source: "openai",
        model: payload.modelSettings.primaryModel || runtime.defaultModel,
        modelStatus: "primary-model",
        evaluationMethod: evaluation.evaluationMethod,
        result,
      };
    } else {
      body = {
        source: "fallback",
        model: "Local fallback",
        modelStatus: "local-fallback",
        warning: API_MSG.apiKeyInactiveCompare,
        result: buildLocalCompareResult(payload),
      };
    }

    body = withCompareEvaluationMethod(body, body.evaluationMethod);
    const resultText = JSON.stringify(body.result || {});
    await finishGenerateResponse(
      res,
      quotaSession,
      {
        eventType: "compare_prompts",
        metadata: { source: body.source, modelTarget: payload.targetModel, positionSwap: usesAiJudge },
        tokenEstimate: quotaEstimate,
        outputText: resultText,
      },
      body
    );
  } catch (error) {
    console.error("compare-prompts failed", error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.publicMessage || error.message || "Failed to compare prompts." });
  }
});

const VERCEL_FUNCTION_BUDGET_MS = Number(process.env.VERCEL_FUNCTION_BUDGET_MS || 58000);
const RETRY_ON_EMPTY_RESERVE_MS = 22000;
const PREMIUM_PASS_RESERVE_MS = 28000;

function capProviderTimeouts(timing, { primaryReserveMs = 14000, fallbackReserveMs = 22000 } = {}) {
  const capped = { ...timing };
  capped.primaryTimeoutMs = Math.min(
    Number(capped.primaryTimeoutMs) || 28000,
    Math.max(12000, VERCEL_FUNCTION_BUDGET_MS - primaryReserveMs)
  );
  capped.fallbackTimeoutMs = Math.min(
    Number(capped.fallbackTimeoutMs) || 20000,
    Math.max(8000, VERCEL_FUNCTION_BUDGET_MS - fallbackReserveMs)
  );
  return capped;
}

app.post("/api/generate-prompt", attachAiRateLimitIdentity, aiRateLimit, upload.array("attachments", 8), async (req, res) => {
  const startedAt = Date.now();
  const remainingBudget = () => Math.max(0, VERCEL_FUNCTION_BUDGET_MS - (Date.now() - startedAt));
  let quotaSession = null;
  let quotaEstimate = 0;
  try {
    const membership = await getMembershipFromRequest(req);
    markPriorityRequest(req, membership.plan);
    const entitlements = getEntitlements(membership.plan);
    const resolvedModelSettings = applyPriorityRouting(
      await resolveModelSettings(req, req.body),
      membership.plan
    );
    const basePayload = normalizePayload(req.body, resolvedModelSettings);
    const routedSettings = basePayload.modelSettings;
    const manifestAttachments = normalizeAttachmentManifest(req.body.attachmentManifest);
    const uploadedAttachments = await Promise.all(
      (req.files || []).map((file) => normalizeFile(file, routedSettings, membership.plan))
    );
    const uploadedNames = new Set(uploadedAttachments.map((file) => file.filename));
    const attachments = [
      ...uploadedAttachments,
      ...manifestAttachments.filter((file) => !uploadedNames.has(file.filename)),
    ].slice(0, entitlements.maxAttachments);
    const payload = enrichPayloadWithLanguage(
      { ...basePayload, modelSettings: routedSettings },
      attachments
    );
    const runtime = getRuntimeProvider(payload.modelSettings);
    // Quality parity: MiniMax no longer skips structure retry / critique-refine.
    // Streaming stays off for MiniMax to avoid serverless timeout risk.
    const streamDisabled = runtime.provider === "minimax";
    const wantsStream = String(req.body?.stream || "").toLowerCase() === "true";
    quotaEstimate = estimateGenerationTokens(payload, attachments, membership.plan);
    quotaSession = await getQuotaSession(req, quotaEstimate);

    if (runtime.provider !== "openai") {
      if (!runtime.client) {
        const fallbackPrompt = buildFallbackPrompt(payload, attachments);
        await finishGenerateResponse(res, quotaSession, {
          eventType: "generate_prompt",
          metadata: {
            modelTarget: payload.modelTarget,
            outputType: payload.outputType,
            provider: runtime.provider,
            source: "fallback",
          },
          outputText: fallbackPrompt,
          tokenEstimate: quotaEstimate,
        }, {
          source: "fallback",
          model: "Local fallback",
          modelStatus: "local-fallback",
          warning: API_MSG.apiKeyInactiveGenerate,
          prompt: fallbackPrompt,
        });
        return;
      }

      try {
        if (wantsStream && !streamDisabled) {
          await runStreamedOpenRouterGenerate({
            res,
            quotaSession,
            quotaEstimate,
            payload,
            attachments,
            runtime,
            membership,
            startedAt,
            remainingBudget,
          });
          return;
        }

        let generation = await createOpenRouterCompletion(payload, attachments, runtime, membership.plan, startedAt);
        let completion = generation.completion;
        let rawPrompt = completion.choices?.[0]?.message?.content || "";
        let prompt = sanitizePromptOutput(rawPrompt);
        let retried = false;
        let truncatedOutput = isCompletionTruncated(completion);

        if (isPromptTooShort(prompt) && remainingBudget() > RETRY_ON_EMPTY_RESERVE_MS) {
          retried = true;
          try {
            generation = await createOpenRouterCompletion(payload, attachments, runtime, membership.plan, startedAt);
            completion = generation.completion;
            rawPrompt = completion.choices?.[0]?.message?.content || "";
            prompt = sanitizePromptOutput(rawPrompt);
          } catch (retryError) {
            console.warn("retry-on-empty failed", retryError.status || retryError.code || retryError.message);
          }
        }

        if (isPromptTooShort(prompt)) {
          prompt = buildFallbackPrompt(payload, attachments);
        }

        // v2: structure validator + retry (all non-OpenAI providers).
        const orStructCheck = validatePromptStructure(prompt);
        const structRetryBudget = remainingBudget();
        if (!orStructCheck.valid && structRetryBudget > RETRY_ON_EMPTY_RESERVE_MS) {
          try {
            const retryMessages = [
              { role: "system", content: buildIntentSystemPromptXml(payload) },
              { role: "user", content: buildStructureRetryInstruction(prompt, orStructCheck.missing) },
            ];
            const primaryModelLocal = payload.modelSettings?.primaryModel || runtime.defaultModel;
            const timingLocal = capProviderTimeouts(getOpenRouterTiming(payload.generationMode));
            const retryTimeoutMs = Math.min(timingLocal.primaryTimeoutMs, structRetryBudget - 2500);
            if (retryTimeoutMs >= 8000) {
              const retryMaxTokens = resolveGenerateMaxTokens(membership.plan, payload);
              const retryRes = await withTimeout(runtime.client.chat.completions.create(
                buildProviderChatCompletionBody(runtime, {
                  model: primaryModelLocal,
                  messages: retryMessages,
                  max_tokens: retryMaxTokens,
                  temperature: 0.4,
                }),
                { timeout: retryTimeoutMs }
              ), retryTimeoutMs, primaryModelLocal);
              const retriedRaw = retryRes.choices?.[0]?.message?.content || "";
              const retried = sanitizePromptOutput(retriedRaw);
              if (retried && !isPromptTooShort(retried)) {
                prompt = retried;
              }
            }
          } catch (retryError) {
            console.warn("openrouter structure retry failed", retryError.message);
          }
        }

        let qualityNote = "";
        if (payload.qualityMode === "premium" && !isPromptTooShort(prompt) && remainingBudget() > PREMIUM_PASS_RESERVE_MS) {
          const primaryModel = payload.modelSettings?.primaryModel || runtime.defaultModel;
          const fallbackModels = getOpenRouterFallbackModels(
            primaryModel,
            payload.generationMode,
            payload.modelSettings?.fallbackModels,
            runtime.provider
          );
          const timing = getOpenRouterTiming(payload.generationMode);
          if (payload.modelSettings?.timeoutMs) timing.primaryTimeoutMs = payload.modelSettings.timeoutMs;
          try {
            const refined = await runCritiqueRefinePass({
              runtime,
              payload,
              attachments,
              basePrompt: prompt,
              timing,
              primaryModel,
              fallbackModels,
              plan: membership.plan,
            });
            if (refined && !isPromptTooShort(refined) && refined !== prompt) {
              prompt = refined;
              qualityNote = API_MSG.premiumQualityApplied;
            }
          } catch (refineError) {
            console.warn("premium critique pass failed", refineError.message);
          }
        }

        // v2: dialect render + eval delta.
        prompt = renderForModelDialect(prompt, payload.modelTarget, payload.outputLanguage);
        const orEval = evalDelta(payload.narrative, prompt);

        const warnings = [];
        if (generation.usedFallbackModel) warnings.push(API_MSG.primaryFallback(generation.primaryError));
        if (truncatedOutput || isCompletionTruncated(completion)) {
          warnings.push(API_MSG.outputTruncated);
        }
        if (retried) warnings.push(API_MSG.outputRetriedShort);
        if (qualityNote) warnings.push(qualityNote);
        await finishGenerateResponse(res, quotaSession, {
          eventType: "generate_prompt",
          metadata: {
            engineVersion: PROMPT_ENGINE_VERSION,
            evalBaseline: orEval.baseline,
            evalDelta: orEval.delta,
            evalOptimized: orEval.optimized,
            modelTarget: payload.modelTarget,
            outputType: payload.outputType,
            provider: runtime.provider,
            source: runtime.provider,
          },
          outputText: prompt,
          tokenEstimate: quotaEstimate,
        }, {
          engineVersion: PROMPT_ENGINE_VERSION,
          evalDelta: orEval,
          piiFindings: payload.piiFindings || [],
          source: runtime.provider,
          model: completion.model,
          modelStatus: generation.usedFallbackModel ? "fallback-model" : "primary-model",
          warning: warnings.join(" "),
          prompt,
        });
      } catch (error) {
        console.warn("generate provider failed", formatProviderError(error));
        const fallbackPrompt = buildFallbackPrompt(payload, attachments);
        await finishGenerateResponse(res, quotaSession, {
          eventType: "generate_prompt",
          metadata: {
            modelTarget: payload.modelTarget,
            outputType: payload.outputType,
            provider: runtime.provider,
            source: "fallback",
          },
          outputText: fallbackPrompt,
          tokenEstimate: quotaEstimate,
        }, {
          source: "fallback",
          model: "Local fallback",
          modelStatus: "local-fallback",
          warning: resolveGenerateFallbackWarning(error),
          prompt: fallbackPrompt,
        });
      }
      return;
    }

    if (!runtime.client) {
      const fallbackPrompt = buildFallbackPrompt(payload, attachments);
      await finishGenerateResponse(res, quotaSession, {
        eventType: "generate_prompt",
        metadata: {
          modelTarget: payload.modelTarget,
          outputType: payload.outputType,
          provider: runtime.provider,
          source: "fallback",
        },
        outputText: fallbackPrompt,
        tokenEstimate: quotaEstimate,
      }, {
        source: "fallback",
        model: "Local fallback",
        modelStatus: "local-fallback",
        warning: API_MSG.apiKeyInactiveOpenAI,
        prompt: fallbackPrompt,
      });
      return;
    }

    const systemPrompt = buildIntentSystemPromptXml(payload);

    const callOpenAI = () => runtime.client.responses.create({
      model: payload.modelSettings.primaryModel || runtime.defaultModel,
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
        { role: "user", content: buildOpenAIContent(payload, attachments) },
      ],
    });

    let response = await callOpenAI();
    let openaiPrompt = sanitizePromptOutput(response.output_text);
    const openaiWarnings = [];
    if (isPromptTooShort(openaiPrompt) && remainingBudget() > RETRY_ON_EMPTY_RESERVE_MS) {
      try {
        response = await callOpenAI();
        openaiPrompt = sanitizePromptOutput(response.output_text);
        openaiWarnings.push(API_MSG.outputRetriedShort);
      } catch (retryError) {
        console.warn("openai retry-on-empty failed", retryError.message);
      }
    }
    if (isPromptTooShort(openaiPrompt)) {
      openaiPrompt = buildFallbackPrompt(payload, attachments);
    }

    // v2: structure validator + 1 retry kalau section kritis hilang.
    const structCheck = validatePromptStructure(openaiPrompt);
    if (!structCheck.valid && remainingBudget() > RETRY_ON_EMPTY_RESERVE_MS) {
      try {
        const retryRes = await runtime.client.responses.create({
          model: payload.modelSettings.primaryModel || runtime.defaultModel,
          input: [
            { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
            { role: "user", content: [{ type: "input_text", text: buildStructureRetryInstruction(openaiPrompt, structCheck.missing) }] },
          ],
        });
        const retried = sanitizePromptOutput(retryRes.output_text);
        if (retried && !isPromptTooShort(retried)) {
          openaiPrompt = retried;
          openaiWarnings.push(`Auto-retry untuk melengkapi section: ${structCheck.missing.join(", ")}.`);
        }
      } catch (retryError) {
        console.warn("openai structure retry failed", retryError.message);
      }
    }

    // v2: self-consistency n=2 untuk high-stakes request.
    if (shouldRunSelfConsistency(payload, remainingBudget()) && !isPromptTooShort(openaiPrompt)) {
      try {
        const altRes = await runtime.client.responses.create({
          model: payload.modelSettings.primaryModel || runtime.defaultModel,
          input: [
            { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
            { role: "user", content: buildOpenAIContent(payload, attachments) },
          ],
        });
        const altPrompt = sanitizePromptOutput(altRes.output_text);
        if (altPrompt && !isPromptTooShort(altPrompt)) {
          const picked = pickBestCandidate([openaiPrompt, altPrompt]);
          if (picked.best && picked.best !== openaiPrompt) {
            openaiPrompt = picked.best;
            openaiWarnings.push(`Self-consistency: 2 kandidat dibandingkan, terbaik dipilih (skor ${picked.scores.join(" vs ")}).`);
          }
        }
      } catch (selfErr) {
        console.warn("openai self-consistency failed", selfErr.message);
      }
    }

    // v2: critique-refine sekarang jalan untuk semua user (bukan premium-only).
    // Premium tetap pakai pass lebih panjang via flag di runCritiqueRefinePass.
    if (payload.qualityMode === "premium" && !isPromptTooShort(openaiPrompt) && remainingBudget() > PREMIUM_PASS_RESERVE_MS) {
      try {
        const premiumLang = getLanguageMeta(
          payload.outputLanguage || resolveOutputLanguage(payload.narrative, openaiPrompt)
        );
        const critiqueRes = await runtime.client.responses.create({
          model: payload.modelSettings.primaryModel || runtime.defaultModel,
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: premiumLang.criticSystem }],
            },
            {
              role: "user",
              content: [{ type: "input_text", text: `Audit prompt berikut. Fokus pada role specificity, output format quantification, constraints konkret, konsistensi deliverable (${payload.outputType || "tidak dipilih"}), frasa kosong/placeholder, acceptance criteria.\n\n---\n${openaiPrompt}\n---\n\nOutput hanya bullet points cacat.` }],
            },
          ],
        });
        const critique = critiqueRes.output_text || "";
        if (critique.trim()) {
          const refineRes = await runtime.client.responses.create({
            model: payload.modelSettings.primaryModel || runtime.defaultModel,
            input: [
              {
                role: "system",
                content: [{ type: "input_text", text: premiumLang.refinerSystem }],
              },
              {
                role: "user",
                content: [{ type: "input_text", text: `Perbaiki prompt di bawah berdasarkan critique. Pertahankan deliverable (${payload.outputType || "tidak dipilih"}) dan target AI (${payload.modelTarget}).\n\nCritique:\n${critique}\n\nPrompt asli:\n---\n${openaiPrompt}\n---\n\nOutput: prompt final saja.` }],
              },
            ],
          });
          const refined = sanitizePromptOutput(refineRes.output_text);
          if (refined && !isPromptTooShort(refined)) {
            openaiPrompt = refined;
            openaiWarnings.push(API_MSG.premiumQualityApplied);
          }
        }
      } catch (refineError) {
        console.warn("openai premium critique pass failed", refineError.message);
      }
    }
    // v2: dialect render layer untuk target model spesifik.
    openaiPrompt = renderForModelDialect(openaiPrompt, payload.modelTarget, payload.outputLanguage);
    // v2: eval delta untuk telemetri win-rate.
    const openaiEval = evalDelta(payload.narrative, openaiPrompt);
    await finishGenerateResponse(res, quotaSession, {
      eventType: "generate_prompt",
      metadata: {
        engineVersion: PROMPT_ENGINE_VERSION,
        evalBaseline: openaiEval.baseline,
        evalDelta: openaiEval.delta,
        evalOptimized: openaiEval.optimized,
        modelTarget: payload.modelTarget,
        outputType: payload.outputType,
        provider: runtime.provider,
        source: "openai",
      },
      outputText: openaiPrompt,
      tokenEstimate: quotaEstimate,
    }, {
      engineVersion: PROMPT_ENGINE_VERSION,
      evalDelta: openaiEval,
      piiFindings: payload.piiFindings || [],
      source: "openai",
      prompt: openaiPrompt,
      warning: openaiWarnings.join(" "),
    });
  } catch (error) {
    console.error("generate-prompt failed", error.message);
    const status = error.statusCode || (error.message === UNSUPPORTED_FILE_TYPE ? 400 : 500);
    res.status(status).json({
      error:
        error.message === UNSUPPORTED_FILE_TYPE
          ? error.message
          : error.publicMessage || API_MSG.generateFailed,
    });
  }
});

app.use((error, _req, res, _next) => {
  const message =
    error.code === "LIMIT_FILE_SIZE"
      ? API_MSG.fileTooLarge
      : error.message === UNSUPPORTED_FILE_TYPE
        ? UNSUPPORTED_FILE_TYPE
        : error.message || API_MSG.invalidRequest;
  res.status(400).json({ error: message });
});

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  app.listen(port, () => {
    console.log(`PromptLab API running at http://127.0.0.1:${port}`);
  });
}

export default app;
export {
  buildAttachmentManifest,
  buildFallbackPrompt,
  buildOpenAIContent,
  buildOpenRouterContent,
  buildPromptSpecInstruction,
  downgradePlayMembershipIfNeeded,
  getDomainPromptPack,
  resolveCompareEvaluation,
  scorePromptText,
  withCompareEvaluationMethod,
};

function normalizePayload(body, resolvedModelSettings) {
  const rawNarrative = String(body.narrative || "").slice(0, 6000);
  // v2: PII/secret guardrail — redact secret keys & token, biarkan email/phone warn-only.
  const { sanitized: cleanNarrative, findings: piiFindings } = scrubPII(rawNarrative, { mode: "redact" });
  return {
    category: String(body.category || "Marketing").slice(0, 80),
    generationMode: normalizeGenerationMode(body.generationMode),
    modelSettings: resolvedModelSettings || normalizeModelSettings(body),
    modelTarget: String(body.model || "ChatGPT").slice(0, 80),
    narrative: cleanNarrative,
    outputType: String(body.outputType || "").slice(0, 80),
    piiFindings,
    qualityMode: normalizeQualityMode(body.qualityMode),
    tone: String(body.tone || "Profesional").slice(0, 80),
  };
}

function normalizeQualityMode(value) {
  const mode = String(value || "standard").toLowerCase();
  if (mode === "premium" || mode === "true" || mode === "1") return "premium";
  return "standard";
}

const MIN_PROMPT_LENGTH = 280;

function isPromptTooShort(text) {
  if (!text || typeof text !== "string") return true;
  return text.trim().length < MIN_PROMPT_LENGTH;
}

async function runCritiqueRefinePass({ runtime, payload, attachments, basePrompt, timing, primaryModel, fallbackModels, plan = "Free" }) {
  const refineMaxTokens = Math.min(8000, resolveGenerateMaxTokens(plan, payload) + 400);
  const langCode = payload.outputLanguage || resolveOutputLanguage(payload.narrative, payload.prompt, basePrompt);
  const langMeta = getLanguageMeta(langCode);
  const critiqueMessages = [
    {
      role: "system",
      content: langMeta.criticSystem,
    },
    {
      role: "user",
      content: `Audit prompt berikut. Sebutkan 3-6 cacat paling kritis. Fokus pada:
- Role specificity (jabatan + domain + level)
- Output format quantification (jumlah, panjang, struktur eksplisit)
- Constraints konkret (≥3)
- Konsistensi deliverable: ${payload.outputType || "tidak dipilih"}
- Frasa kosong / placeholder yang tidak di-instantiate
- Acceptance criteria atau quality gates yang hilang

Prompt yang diaudit:
---
${basePrompt}
---

Output hanya bullet points cacat, tanpa pengantar.`,
    },
  ];

  let critique = "";
  try {
    const critiqueRes = await withTimeout(runtime.client.chat.completions.create(
      buildProviderChatCompletionBody(runtime, {
        model: primaryModel,
        messages: critiqueMessages,
        max_tokens: 600,
        temperature: 0.2,
      }),
      { timeout: timing.primaryTimeoutMs }
    ), timing.primaryTimeoutMs, primaryModel);
    critique = critiqueRes.choices?.[0]?.message?.content || "";
  } catch (error) {
    if (shouldTryFallbackModel(error) && fallbackModels.length > 0) {
      try {
        const fb = await tryOpenRouterFallbackModels(
          runtime.client,
          fallbackModels,
          critiqueMessages,
          timing.fallbackTimeoutMs,
          600,
          0.2,
          runtime
        );
        critique = fb.completion.choices?.[0]?.message?.content || "";
      } catch {
        critique = "";
      }
    }
  }

  if (!critique.trim()) return basePrompt;

  const refineMessages = [
    {
      role: "system",
      content: langMeta.refinerSystem,
    },
    {
      role: "user",
      content: `Perbaiki prompt di bawah berdasarkan critique. Pertahankan deliverable (${payload.outputType || "tidak dipilih"}) dan target AI (${payload.modelTarget}). Hasilkan prompt final yang langsung siap dicopy.

Critique:
${critique}

Prompt asli:
---
${basePrompt}
---

Output: prompt final saja.`,
    },
  ];

  try {
    const refineRes = await withTimeout(runtime.client.chat.completions.create(
      buildProviderChatCompletionBody(runtime, {
        model: primaryModel,
        messages: refineMessages,
        max_tokens: refineMaxTokens,
        temperature: 0.4,
      }),
      { timeout: timing.primaryTimeoutMs }
    ), timing.primaryTimeoutMs, primaryModel);
    const refined = refineRes.choices?.[0]?.message?.content || "";
    const sanitized = sanitizePromptOutput(refined);
    return sanitized && !isPromptTooShort(sanitized) ? sanitized : basePrompt;
  } catch (error) {
    if (shouldTryFallbackModel(error) && fallbackModels.length > 0) {
      try {
        const fb = await tryOpenRouterFallbackModels(
          runtime.client,
          fallbackModels,
          refineMessages,
          timing.fallbackTimeoutMs,
          refineMaxTokens,
          0.4,
          runtime
        );
        const refined = fb.completion.choices?.[0]?.message?.content || "";
        const sanitized = sanitizePromptOutput(refined);
        return sanitized && !isPromptTooShort(sanitized) ? sanitized : basePrompt;
      } catch {
        return basePrompt;
      }
    }
    return basePrompt;
  }
}

function normalizeOptimizePayload(body, resolvedModelSettings) {
  const rawPrompt = String(body.prompt || "").slice(0, 12000);
  const { sanitized: cleanPrompt, findings: piiFindings } = scrubPII(rawPrompt, { mode: "redact" });
  return {
    generationMode: normalizeGenerationMode(body.generationMode),
    mode: String(body.mode || "Lebih Jelas").slice(0, 80),
    modelSettings: resolvedModelSettings || normalizeModelSettings(body),
    prompt: cleanPrompt,
    piiFindings,
    targetModel: String(body.targetModel || "Claude").slice(0, 80),
    tone: String(body.tone || "Profesional").slice(0, 80),
  };
}

function normalizeComparePayload(body, resolvedModelSettings) {
  const scrubbedA = scrubPII(String(body.promptA || "").slice(0, 12000), { mode: "redact" });
  const scrubbedB = scrubPII(String(body.promptB || "").slice(0, 12000), { mode: "redact" });
  const scrubbedUseCase = scrubPII(String(body.useCase || "").slice(0, 1200), { mode: "redact" });
  return {
    generationMode: normalizeGenerationMode(body.generationMode),
    modelSettings: resolvedModelSettings || normalizeModelSettings(body),
    promptA: scrubbedA.sanitized,
    promptB: scrubbedB.sanitized,
    targetModel: String(body.targetModel || "General").slice(0, 80),
    useCase: scrubbedUseCase.sanitized,
    piiFindings: [...(scrubbedA.findings || []), ...(scrubbedB.findings || []), ...(scrubbedUseCase.findings || [])],
  };
}

function normalizeAttachmentManifest(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    let remainingChars = 8000;
    return parsed.slice(0, 8).map((item) => {
      const rawExcerpt = String(item.excerpt || "").replace(/\s+/g, " ").trim();
      const capped = rawExcerpt.slice(0, Math.min(2000, Math.max(0, remainingChars)));
      remainingChars -= capped.length;
      const scrubbed = scrubPII(capped, { mode: "redact" });
      return {
        dataUrl: "",
        excerpt: scrubbed.sanitized,
        filename: String(item.filename || item.name || "attachment").slice(0, 180),
        kind: String(item.kind || "file").slice(0, 60),
        mime: String(item.mime || item.type || "application/octet-stream").slice(0, 120),
        size: Number(item.size || 0),
      };
    });
  } catch {
    return [];
  }
}

function normalizeModelSettings(body = {}) {
  const rawFallbacks = Array.isArray(body.fallbackModels)
    ? body.fallbackModels.join(",")
    : String(body.fallbackModels || body.fallbackModelList || "");
  return {
    apiKey: String(body.apiKey || "").trim().slice(0, 260),
    baseUrl: sanitizeBaseUrl(body.baseUrl || body.endpoint || ""),
    fallbackModels: parseModelList(rawFallbacks).slice(0, 6),
    ocrModel: sanitizeModelName(body.ocrModel || ""),
    primaryModel: sanitizeModelName(body.primaryModel || body.openRouterModel || ""),
    provider: normalizeProvider(body.provider),
    timeoutMs: normalizeTimeout(body.timeoutMs),
  };
}

async function requireAdminMembership(req) {
  const membership = await getMembershipFromRequest(req);
  if (!membership.user) {
    throw publicApiError("Sign in with an admin account.", 401);
  }
  if (membership.profile?.role !== "admin") {
    throw publicApiError("Admin access required.", 403);
  }
  return membership;
}

async function resolveModelSettings(req, body = {}) {
  const admin = createServiceRoleSupabaseClient();
  const { settings: published } = await getCachedPublishedModelSettings(admin);
  const fromRequest = normalizeModelSettings(body);
  const membership = await getMembershipFromRequest(req);
  const isAdmin = membership.profile?.role === "admin";
  return mergeModelSettingsLayers({
    published,
    request: fromRequest,
    allowRequestOverride: isAdmin,
  });
}

function extractBearerToken(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
  return match?.[1]?.trim() || "";
}

function createUserSupabaseClient(token) {
  if (!quotaAuthEnabled || !token) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function createServiceRoleSupabaseClient() {
  if (!quotaServiceRoleEnabled) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function nextQuotaResetDateString() {
  const resetDate = new Date();
  resetDate.setDate(resetDate.getDate() + 30);
  return resetDate.toISOString().slice(0, 10);
}

function normalizePublicQuotaProfile(profile) {
  if (!profile) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (!profile.quota_reset_at || String(profile.quota_reset_at) < today) {
    return {
      ...profile,
      quota_reset_at: nextQuotaResetDateString(),
      quota_used: 0,
    };
  }
  return profile;
}

function publicQuota(profile) {
  if (!profile) return null;
  const normalized = normalizePublicQuotaProfile(profile);
  const unlimited = isSuperAccount(profile);
  return {
    email: normalized.email,
    fullName: normalized.full_name || "",
    plan: normalized.plan || "Free",
    playBilling: normalized.play_billing || "Not linked",
    quotaLimit: unlimited ? SUPER_QUOTA_LIMIT : Number(normalized.quota_limit || 0),
    quotaResetAt: normalized.quota_reset_at,
    quotaUsed: Number(normalized.quota_used || 0),
    role: normalized.role === "admin" ? "admin" : "user",
    unlimited,
  };
}

function publicApiError(message, statusCode = 400) {
  const error = new Error(message);
  error.publicMessage = message;
  error.statusCode = statusCode;
  return error;
}

async function getMembershipFromRequest(req) {
  // Fail closed: never grant paid entitlements when auth is misconfigured.
  if (!quotaAuthEnabled) {
    return { plan: "Free", profile: null, user: null, client: null, authMisconfigured: true };
  }
  const token = extractBearerToken(req);
  if (!token) {
    return { plan: "Free", profile: null, user: null, client: null };
  }
  const client = createUserSupabaseClient(token);
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData?.user) {
    return { plan: "Free", profile: null, user: null, client: null };
  }
  const { data, error } = await client.rpc("get_my_entitlement");
  if (error || !data) {
    return { plan: "Free", profile: null, user: userData.user, client };
  }
  const profile = Array.isArray(data) ? data[0] : data;
  return {
    plan: normalizePlanName(profile?.plan),
    profile,
    user: userData.user,
    client,
  };
}

async function getQuotaSession(req, estimatedTokens = 0) {
  if (!quotaAuthEnabled) {
    throw publicApiError("Auth is not configured. AI features are unavailable.", 503);
  }
  const token = extractBearerToken(req);
  if (!token) throw publicApiError("Sign in to use AI features and your token quota.", 401);

  const client = createUserSupabaseClient(token);
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData?.user) throw publicApiError("Invalid session. Please sign in again.", 401);

  const { data, error } = await client.rpc("get_my_entitlement");
  if (error) throw publicApiError("Membership is not ready. Sign out and sign in again.", 503);
  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile) throw publicApiError("Membership profile not found. Sign out and sign in again.", 403);

  if (
    !isSuperAccount(profile) &&
    Number(profile.quota_used || 0) + estimatedTokens > Number(profile.quota_limit || 0)
  ) {
    throw publicApiError("Token quota exceeded. Upgrade your plan or wait for quota reset.", 402);
  }

  return {
    client,
    profile,
    user: userData.user,
    usageIdempotencyKey: randomUUID(),
  };
}

async function recordUsage(quotaSession, { eventType, metadata, outputText, tokenEstimate }) {
  if (!quotaSession?.client) return null;
  const tokens = Math.max(1, Math.round(tokenEstimate || estimateTextTokens(outputText)));
  const result = await persistReservedUsage(quotaSession.client, {
    userId: quotaSession.user?.id,
    estimate: tokens,
    eventType,
    metadata: metadata || {},
    idempotencyKey: quotaSession.usageIdempotencyKey,
  });
  if (!result.ok) {
    const exhausted = result.reason === "quota_exhausted";
    const message = exhausted
      ? "Token quota exceeded. Upgrade your plan or wait for quota reset."
      : "Failed to record quota usage.";
    throw publicApiError(message, quotaFailureStatus(result));
  }

  const quotaLimit = Number(quotaSession.profile?.quota_limit || 0);
  return publicQuota({
    ...quotaSession.profile,
    quota_used: Math.max(0, quotaLimit - result.remaining),
  });
}

async function finishGenerateResponse(res, quotaSession, usagePayload, body) {
  // Production default: hard-fail quota writes. Set QUOTA_RECORD_SOFT_FAIL=true only for emergency.
  const softFail = process.env.QUOTA_RECORD_SOFT_FAIL === "true";
  let quota = null;
  let warning = body.warning || "";
  const isFallback =
    body?.source === "fallback" ||
    body?.modelStatus === "local-fallback" ||
    usagePayload?.metadata?.source === "fallback";

  if (quotaSession) {
    if (isFallback) {
      // Do not charge full estimated tokens for local/template previews.
      quota = publicQuota(quotaSession.profile);
      warning = [warning, "Preview only — quota was not charged."].filter(Boolean).join(" ");
    } else {
      try {
        quota = await recordUsage(quotaSession, usagePayload);
      } catch (usageError) {
        const note = usageError.publicMessage || usageError.message || "Failed to record quota usage.";
        if (softFail) {
          warning = [warning, note].filter(Boolean).join(" ");
          console.warn("recordUsage soft-failed", note);
        } else {
          throw usageError;
        }
      }
    }
  }

  res.json({ ...body, warning, quota });
}

function estimateTextTokens(value = "") {
  return Math.max(1, Math.ceil(String(value || "").length / 4));
}

function estimateGenerationTokens(payload, attachments = [], plan = "Free") {
  const attachmentText = attachments.map((file) => `${file.filename || ""} ${file.excerpt || ""}`).join("\n");
  const baseText = [payload.narrative, payload.category, payload.tone, payload.modelTarget, payload.outputType, payload.qualityMode, attachmentText].join("\n");
  const outputReserve = resolveGenerateMaxTokens(plan, payload);
  return Math.min(12000, Math.max(600, estimateTextTokens(baseText) + outputReserve));
}

function isCompletionTruncated(completion) {
  return completion?.choices?.[0]?.finish_reason === "length";
}

function estimateOptimizeTokens(payload) {
  const baseText = [payload.prompt, payload.mode, payload.targetModel, payload.tone].join("\n");
  return Math.min(8000, Math.max(500, estimateTextTokens(baseText) + 1400));
}

function estimateCompareTokens(payload, { positionSwap = false } = {}) {
  const baseText = [payload.promptA, payload.promptB, payload.targetModel, payload.useCase].join("\n");
  const single = Math.max(700, estimateTextTokens(baseText) + 900);
  return Math.min(16000, single * (positionSwap ? 2 : 1));
}

function normalizeProvider(value) {
  const normalized = String(value || provider || process.env.AI_PROVIDER || "openrouter").toLowerCase();
  if (normalized === "openai") return "openai";
  if (normalized === "custom") return "custom";
  if (normalized === "minimax") return "minimax";
  return "openrouter";
}

function sanitizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function normalizeTimeout(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(Math.max(Math.round(parsed), 5000), VERCEL_FUNCTION_BUDGET_MS - 2000);
}

function getRuntimeProvider(modelSettings = {}) {
  const runtimeProvider = normalizeProvider(modelSettings.provider);
  if (runtimeProvider === "openai") {
    const apiKey = modelSettings.apiKey || process.env.OPENAI_API_KEY || "";
    return {
      baseURL: "",
      client: apiKey ? new OpenAI({ apiKey }) : null,
      defaultModel: process.env.OPENAI_MODEL || "gpt-5-mini",
      provider: "openai",
    };
  }

  if (runtimeProvider === "minimax") {
    const apiKey = modelSettings.apiKey || process.env.MINIMAX_API_KEY || "";
    const baseURL = resolveMinimaxBaseUrl(
      modelSettings.baseUrl || process.env.MINIMAX_BASE_URL || "",
      apiKey
    );
    return {
      baseURL,
      client: apiKey ? new OpenAI({ apiKey, baseURL }) : null,
      defaultModel: process.env.MINIMAX_MODEL || "MiniMax-M3",
      provider: "minimax",
    };
  }

  const isCustom = runtimeProvider === "custom";
  const baseURL =
    modelSettings.baseUrl ||
    (isCustom ? process.env.CUSTOM_LLM_BASE_URL : "") ||
    process.env.OPENROUTER_BASE_URL ||
    "https://openrouter.ai/api/v1";
  const apiKey =
    modelSettings.apiKey ||
    (isCustom ? process.env.CUSTOM_LLM_API_KEY : "") ||
    process.env.OPENROUTER_API_KEY ||
    "";

  return {
    baseURL,
    client: apiKey
      ? new OpenAI({
          apiKey,
          baseURL,
          defaultHeaders: {
            "HTTP-Referer": process.env.APP_URL || "http://127.0.0.1:5173",
            "X-Title": "PromptLab",
          },
        })
      : null,
    defaultModel: isCustom ? process.env.CUSTOM_LLM_MODEL || getDefaultOpenRouterModel() : getDefaultOpenRouterModel(),
    provider: runtimeProvider,
  };
}

function parseModelList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map(sanitizeModelName)
    .filter(Boolean);
}

function sanitizeModelName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 160);
}

function getDefaultOpenRouterModel() {
  if (normalizeProvider(process.env.AI_PROVIDER) === "minimax") {
    return process.env.MINIMAX_MODEL || "MiniMax-M3";
  }
  return process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash";
}

function getDefaultOcrModel() {
  return process.env.OPENROUTER_OCR_MODEL || openRouterOcrModel;
}

function normalizeGenerationMode(value) {
  const mode = String(value || "Seimbang").toLowerCase();
  if (mode.includes("cepat")) return "fast";
  if (mode.includes("sabar")) return "patient";
  return "balanced";
}

function getOpenRouterTiming(mode) {
  if (mode === "fast") {
    return {
      fallbackTimeoutMs: Number(process.env.OPENROUTER_FAST_FALLBACK_TIMEOUT_MS || 30000),
      primaryTimeoutMs: Number(process.env.OPENROUTER_FAST_PRIMARY_TIMEOUT_MS || 20000),
    };
  }
  if (mode === "patient") {
    return {
      fallbackTimeoutMs: Number(process.env.OPENROUTER_PATIENT_FALLBACK_TIMEOUT_MS || openRouterFallbackTimeoutMs),
      primaryTimeoutMs: Number(process.env.OPENROUTER_PATIENT_PRIMARY_TIMEOUT_MS || openRouterPrimaryTimeoutMs),
    };
  }
  return {
    fallbackTimeoutMs: Number(process.env.OPENROUTER_BALANCED_FALLBACK_TIMEOUT_MS || 35000),
    primaryTimeoutMs: Number(process.env.OPENROUTER_BALANCED_PRIMARY_TIMEOUT_MS || 28000),
  };
}

function resolveProviderTiming(payload, runtime, generationMode) {
  if (runtime.provider === "minimax") {
    const primaryBudgetCap = VERCEL_FUNCTION_BUDGET_MS - 2000;
    const configured = normalizeTimeout(payload.modelSettings?.timeoutMs);
    const envPrimary = normalizeTimeout(process.env.MINIMAX_PRIMARY_TIMEOUT_MS);
    let primaryTimeoutMs = configured || envPrimary || 55000;
    if (generationMode === "patient") {
      primaryTimeoutMs = primaryBudgetCap;
    } else {
      primaryTimeoutMs = Math.min(Math.max(primaryTimeoutMs, 50000), primaryBudgetCap);
    }
    return {
      primaryTimeoutMs,
      fallbackTimeoutMs: Math.min(12000, Math.max(6000, VERCEL_FUNCTION_BUDGET_MS - primaryTimeoutMs - 1500)),
    };
  }

  const capped = capProviderTimeouts(getOpenRouterTiming(generationMode));
  const primaryBudgetCap = Math.max(15000, VERCEL_FUNCTION_BUDGET_MS - 8000);
  const configured = normalizeTimeout(payload.modelSettings?.timeoutMs);
  const envPrimary = 0;

  let primaryTimeoutMs = capped.primaryTimeoutMs;
  if (configured) {
    primaryTimeoutMs = Math.min(configured, primaryBudgetCap);
  } else if (envPrimary) {
    primaryTimeoutMs = Math.min(envPrimary, primaryBudgetCap);
  }

  let fallbackTimeoutMs = capped.fallbackTimeoutMs;
  return { primaryTimeoutMs, fallbackTimeoutMs };
}

async function runStreamedOpenRouterGenerate({
  res,
  quotaSession,
  quotaEstimate,
  payload,
  attachments,
  runtime,
  membership,
  startedAt,
  remainingBudget,
}) {
  initSse(res);
  sendSsePhase(res, "drafting", "Drafting prompt...");

  const maxTokens = resolveGenerateMaxTokens(membership.plan, payload);
  const messages = [
    { role: "system", content: buildIntentSystemPromptXml(payload) },
    { role: "user", content: buildOpenRouterContent(payload, attachments) },
  ];
  const primaryModel = payload.modelSettings?.primaryModel || runtime.defaultModel;
  const timing = resolveProviderTiming(payload, runtime, payload.generationMode);
  const primaryTimeoutMs = Math.min(
    timing.primaryTimeoutMs,
    Math.max(12000, VERCEL_FUNCTION_BUDGET_MS - (Date.now() - startedAt) - 2000)
  );

  let completionModel = primaryModel;
  let rawPrompt = "";
  try {
    const stream = await withTimeout(
      runtime.client.chat.completions.create(
        buildProviderChatCompletionBody(runtime, {
          model: primaryModel,
          messages,
          max_tokens: maxTokens,
          temperature: 0.4,
          stream: true,
        }),
        { timeout: primaryTimeoutMs }
      ),
      primaryTimeoutMs,
      primaryModel
    );
    const streamed = await consumeOpenRouterStream(stream, (delta) => {
      sendSse(res, "chunk", { text: delta });
    });
    rawPrompt = streamed.content;
    completionModel = streamed.model || primaryModel;
  } catch (error) {
    sendSse(res, "error", { message: formatProviderError(error) });
    res.end();
    return;
  }

  let prompt = sanitizePromptOutput(rawPrompt);
  if (isPromptTooShort(prompt)) {
    prompt = buildFallbackPrompt(payload, attachments);
  }

  sendSsePhase(res, "validating", "Validating structure...");
  const structCheck = validatePromptStructure(prompt);
  if (!structCheck.valid && remainingBudget() > RETRY_ON_EMPTY_RESERVE_MS) {
    try {
      const retryMessages = [
        { role: "system", content: buildIntentSystemPromptXml(payload) },
        { role: "user", content: buildStructureRetryInstruction(prompt, structCheck.missing) },
      ];
      const retryTimeoutMs = Math.min(timing.primaryTimeoutMs, remainingBudget() - 2500);
      if (retryTimeoutMs >= 8000) {
        const retryRes = await withTimeout(
          runtime.client.chat.completions.create(
            buildProviderChatCompletionBody(runtime, {
              model: primaryModel,
              messages: retryMessages,
              max_tokens: maxTokens,
              temperature: 0.4,
            }),
            { timeout: retryTimeoutMs }
          ),
          retryTimeoutMs,
          primaryModel
        );
        const retried = sanitizePromptOutput(retryRes.choices?.[0]?.message?.content || "");
        if (retried && !isPromptTooShort(retried)) prompt = retried;
      }
    } catch (retryError) {
      console.warn("stream structure retry failed", retryError.message);
    }
  }

  let qualityNote = "";
  if (payload.qualityMode === "premium" && !isPromptTooShort(prompt) && remainingBudget() > PREMIUM_PASS_RESERVE_MS) {
    sendSsePhase(res, "critique", "Running critique pass...");
    try {
      const refined = await runCritiqueRefinePass({
        runtime,
        payload,
        attachments,
        basePrompt: prompt,
        timing,
        primaryModel,
        fallbackModels: getOpenRouterFallbackModels(
          primaryModel,
          payload.generationMode,
          payload.modelSettings?.fallbackModels,
          runtime.provider
        ),
        plan: membership.plan,
      });
      if (refined && !isPromptTooShort(refined) && refined !== prompt) {
        sendSsePhase(res, "refining", "Applying refinements...");
        prompt = refined;
        sendSse(res, "chunk", { text: refined, replace: true });
        qualityNote = API_MSG.premiumQualityApplied;
      }
    } catch (refineError) {
      console.warn("stream critique pass failed", refineError.message);
    }
  }

  sendSsePhase(res, "dialect", "Applying model dialect...");
  prompt = renderForModelDialect(prompt, payload.modelTarget, payload.outputLanguage);
  const orEval = evalDelta(payload.narrative, prompt);

  let quota = null;
  if (quotaSession) {
    try {
      quota = await recordUsage(quotaSession, {
        eventType: "generate_prompt",
        metadata: {
          engineVersion: PROMPT_ENGINE_VERSION,
          stream: true,
          modelTarget: payload.modelTarget,
          provider: runtime.provider,
        },
        outputText: prompt,
        tokenEstimate: quotaEstimate,
      });
    } catch (usageError) {
      console.warn("stream quota persistence failed", usageError.publicMessage || usageError.message);
      sendSse(res, "error", { message: "Could not record quota usage. Please try again." });
      res.end();
      return;
    }
  }

  sendSsePhase(res, "done", "Complete");
  sendSse(res, "done", {
    prompt,
    source: runtime.provider,
    model: completionModel,
    modelStatus: "primary-model",
    engineVersion: PROMPT_ENGINE_VERSION,
    evalDelta: orEval,
    piiFindings: payload.piiFindings || [],
    warning: qualityNote,
    quota,
  });
  res.end();
}

async function createOpenRouterCompletion(
  payload,
  attachments,
  runtime = getRuntimeProvider(payload.modelSettings),
  plan = "Free",
  requestStartedAt = Date.now()
) {
  const leanGeneration = runtime.provider === "minimax";
  const maxTokens = resolveGenerateMaxTokens(plan, payload);
  const messages = [
    {
      role: "system",
      content: leanGeneration ? buildLeanIntentSystemPrompt(payload) : buildIntentSystemPromptXml(payload),
    },
    {
      role: "user",
      content: buildOpenRouterContent(payload, attachments, { lean: leanGeneration }),
    },
  ];
  const primaryModel = payload.modelSettings?.primaryModel || runtime.defaultModel;
  let fallbackModels = leanGeneration
    ? []
    : getOpenRouterFallbackModels(
        primaryModel,
        payload.generationMode,
        payload.modelSettings?.fallbackModels,
        runtime.provider
      );
  if (runtime.provider === "minimax") {
    fallbackModels = [];
  }
  const timing = resolveProviderTiming(payload, runtime, payload.generationMode);
  const elapsedBeforeCall = Date.now() - requestStartedAt;
  const primaryTimeoutMs = Math.min(
    timing.primaryTimeoutMs,
    Math.max(12000, VERCEL_FUNCTION_BUDGET_MS - elapsedBeforeCall - 2000)
  );

  try {
    const completion = await withTimeout(runtime.client.chat.completions.create(
      buildProviderChatCompletionBody(runtime, {
        model: primaryModel,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
      { timeout: primaryTimeoutMs }
    ), primaryTimeoutMs, primaryModel);
    return {
      completion,
      maxTokens,
      primaryError: "",
      usedFallbackModel: false,
    };
  } catch (error) {
    if (runtime.provider === "minimax") throw error;
    if (!shouldTryFallbackModel(error) || fallbackModels.length === 0) throw error;
    const elapsed = Date.now() - requestStartedAt;
    const remaining = VERCEL_FUNCTION_BUDGET_MS - elapsed - 2000;
    if (remaining < 12000) throw error;
    const fallbackTimeout = Math.min(timing.fallbackTimeoutMs, remaining, 22000);
    const primaryError = formatProviderError(error);
    const { completion, errors } = await tryOpenRouterFallbackModels(
      runtime.client,
      fallbackModels,
      messages,
      fallbackTimeout,
      maxTokens,
      0.4,
      runtime
    );
    return {
      completion,
      primaryError: [primaryError, ...errors].filter(Boolean).join(" | "),
      usedFallbackModel: true,
    };
  }
}

async function createOpenRouterOptimizeCompletion(payload, runtime = getRuntimeProvider(payload.modelSettings)) {
  const messages = [
    {
      role: "system",
      content: buildOptimizerSystemPromptXml(payload),
    },
    {
      role: "user",
      content: buildOptimizerInstruction(payload),
    },
  ];
  const primaryModel = payload.modelSettings?.primaryModel || runtime.defaultModel;
  const fallbackModels = getOpenRouterFallbackModels(
    primaryModel,
    payload.generationMode,
    payload.modelSettings?.fallbackModels,
    runtime.provider
  );
  const timing = getOpenRouterTiming(payload.generationMode);
  if (payload.modelSettings?.timeoutMs) timing.primaryTimeoutMs = payload.modelSettings.timeoutMs;

  try {
    return await withTimeout(runtime.client.chat.completions.create(
      buildProviderChatCompletionBody(runtime, {
        model: primaryModel,
        messages,
        max_tokens: 1600,
        temperature: 0.4,
      }),
      { timeout: timing.primaryTimeoutMs }
    ), timing.primaryTimeoutMs, primaryModel);
  } catch (error) {
    if (!shouldTryFallbackModel(error) || fallbackModels.length === 0) throw error;
    console.warn(
      `openrouter optimize primary failed, trying fallback chain`,
      error.status || error.code || error.message
    );
    return (await tryOpenRouterFallbackModels(
      runtime.client,
      fallbackModels,
      messages,
      timing.fallbackTimeoutMs,
      1600,
      0.4,
      runtime
    )).completion;
  }
}

async function createOpenRouterCompareCompletion(payload, runtime = getRuntimeProvider(payload.modelSettings)) {
  const messages = [
    {
      role: "system",
      content: buildCompareSystemPromptXml(payload),
    },
    {
      role: "user",
      content: buildCompareInstruction(payload),
    },
  ];
  const primaryModel = payload.modelSettings?.primaryModel || runtime.defaultModel;
  const fallbackModels = getOpenRouterFallbackModels(
    primaryModel,
    payload.generationMode,
    payload.modelSettings?.fallbackModels
  );
  const timing = getOpenRouterTiming(payload.generationMode);
  if (payload.modelSettings?.timeoutMs) timing.primaryTimeoutMs = payload.modelSettings.timeoutMs;

  try {
    const completion = await withTimeout(runtime.client.chat.completions.create(
      buildProviderChatCompletionBody(runtime, {
        model: primaryModel,
        messages,
        max_tokens: 1800,
        temperature: 0.2,
      }),
      { timeout: timing.primaryTimeoutMs }
    ), timing.primaryTimeoutMs, primaryModel);
    return {
      completion,
      primaryError: "",
      usedFallbackModel: false,
    };
  } catch (error) {
    if (!shouldTryFallbackModel(error) || fallbackModels.length === 0) throw error;
    const primaryError = formatProviderError(error);
    const { completion, errors } = await tryOpenRouterFallbackModels(
      runtime.client,
      fallbackModels,
      messages,
      timing.fallbackTimeoutMs,
      1800,
      0.2,
      runtime
    );
    return {
      completion,
      primaryError: [primaryError, ...errors].filter(Boolean).join(" | "),
      usedFallbackModel: true,
    };
  }
}

function isOpenRouterStyleModelId(model = "") {
  return /[/:]/.test(String(model));
}

function resolveGenerateFallbackWarning(error) {
  const status = Number(error?.status);
  const message = String(error?.message || "").toLowerCase();
  if (status === 429 || /rate limit|too many requests/i.test(message)) {
    return API_MSG.providerRateLimitedGenerate;
  }
  if (/timeout|timed out/i.test(message)) {
    return API_MSG.providerTimeoutGenerate;
  }
  if ([401, 403].includes(status)) {
    return API_MSG.apiKeyInactiveGenerate;
  }
  return API_MSG.providerOverloadGenerate;
}

function getOpenRouterFallbackModels(
  primaryModel = getDefaultOpenRouterModel(),
  mode = "balanced",
  overrideModels = [],
  provider = "openrouter"
) {
  let merged;
  if (provider === "minimax") {
    merged = [
      ...(Array.isArray(overrideModels) ? overrideModels : []),
      "MiniMax-M2.5-highspeed",
      "MiniMax-M2.7-highspeed",
    ];
  } else {
    const configured = (process.env.OPENROUTER_FALLBACK_MODELS || process.env.OPENROUTER_FALLBACK_MODEL || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    merged = [...(overrideModels || []), ...configured, ...defaultOpenRouterFallbackModels];
  }
  const models = [...new Set(merged)].filter((model) => {
    if (!model || model === primaryModel) return false;
    if (provider === "minimax" && isOpenRouterStyleModelId(model)) return false;
    return true;
  });
  if (mode === "fast") return models.slice(0, 2);
  if (mode === "patient") return models;
  return models.slice(0, provider === "minimax" ? 2 : 3);
}

async function tryOpenRouterFallbackModels(
  client,
  models,
  messages,
  timeoutMs,
  maxTokens = 2200,
  temperature = 0.4,
  runtime = null
) {
  const errors = [];
  let lastError = null;

  for (const model of models) {
    try {
      console.warn(`trying openrouter fallback model ${model}`);
      const perModelTimeout = Math.min(timeoutMs, 22000);
      const completion = await withTimeout(client.chat.completions.create(
        buildProviderChatCompletionBody(runtime || { provider: "openrouter" }, {
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        { timeout: perModelTimeout }
      ), perModelTimeout, model);
      return { completion, errors };
    } catch (error) {
      lastError = error;
      const formatted = `${model}: ${formatProviderError(error)}`;
      errors.push(formatted);
      console.warn(`openrouter fallback failed`, formatted);
      if (!shouldTryFallbackModel(error)) break;
    }
  }

  throw lastError || new Error("All OpenRouter fallback models failed.");
}

function shouldTryFallbackModel(error) {
  return (
    [408, 409, 429, 500, 502, 503, 504].includes(Number(error.status)) ||
    /timeout|timed out|connection/i.test(String(error.message || error.code || ""))
  );
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Provider timeout after ${timeoutMs}ms: ${label}`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function formatProviderError(error) {
  const status = error.status || error.code || "";
  const message = String(error.message || "unknown error")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  return `${status} ${message}`.trim();
}

function buildOptimizerInstruction(payload) {
  const targetGuidance = getTargetModelGuidance(payload.targetModel, payload);
  const optimizerEngine = getOptimizerEngineInstruction(payload);
  const specInstruction = buildPromptSpecInstruction(
    {
      narrative: payload.prompt,
      category: payload.mode,
      modelTarget: payload.targetModel,
      outputType: "Optimized Prompt",
      tone: payload.tone,
    },
    []
  );
  const fewShot = getFewShotForMode(payload.mode);
  return `Optimalkan prompt berikut.

Mode optimasi:
- ${payload.mode}

Target AI:
- ${payload.targetModel}

Tone:
- ${payload.tone}

${optimizerEngine}

${specInstruction}

Few-shot example (mode-specific, gunakan sebagai inspirasi struktur — JANGAN salin literal):
${fewShot}

Prompt lama:
${payload.prompt}

Tugas:
- Pertahankan maksud utama dan jenis output yang diminta prompt lama.
- Jangan mengubah permintaan aplikasi menjadi dokumen teknis, jangan mengubah permintaan PPT menjadi Word, dan jangan mengubah permintaan Word menjadi PPT.
- Tambahkan role, konteks, tujuan, format output, batasan, dan instruksi klarifikasi bila belum ada.
- Buat prompt final yang bisa langsung dicopy ke AI.
- Terapkan mode optimasi secara spesifik, bukan rewrite generik.
- Jangan masukkan judul "PromptLab Optimizer Engine" ke output final.
${targetGuidance}

Format jawaban:
Return only the final optimized prompt, ready to copy. Do not include a separate engine brief.

${getLanguageLockInstruction(payload.outputLanguage || resolveOutputLanguage(payload.prompt))}`;
}

function getOptimizerEngineInstruction(payload) {
  const mode = String(payload.mode || "").toLowerCase();
  const profiles = [
    {
      test: /clear|jelas/,
      name: "Clarity optimizer",
      goal: "perjelas ambiguitas, role, konteks, tugas, output order, dan success criteria",
      frames: ["ambiguity audit", "role/context lock", "output order", "success criteria"],
    },
    {
      test: /short|singkat/,
      name: "Compression optimizer",
      goal: "ringkas repetisi tanpa membuang maksud, deliverable, constraints, dan quality gates",
      frames: ["deduplicate", "preserve intent", "tighten wording", "keep constraints"],
    },
    {
      test: /detail/,
      name: "Deep brief optimizer",
      goal: "tambahkan requirement, edge cases, validasi, dan acceptance criteria",
      frames: ["requirement expansion", "edge cases", "validation", "acceptance criteria"],
    },
    {
      test: /academic|akademik/,
      name: "Academic optimizer",
      goal: "ubah instruksi longgar menjadi struktur formal, objektif, dan evidence-aware",
      frames: ["formal scope", "evidence handling", "section order", "citation guardrails"],
    },
    {
      test: /marketing/,
      name: "Marketing optimizer",
      goal: "kuatkan audiens, offer, proof, CTA, tone, dan conversion objective",
      frames: ["audience", "offer", "proof", "CTA"],
    },
    {
      test: /coding|kode/,
      name: "Implementation optimizer",
      goal: "ubah prompt coding menjadi spesifikasi runnable dengan file, UI, API, state, tests, dan local run steps",
      frames: ["file structure", "UI/API/data", "states", "tests"],
    },
  ];
  const profile = profiles.find((item) => item.test.test(mode)) || profiles[0];
  return `PromptLab Optimizer Engine:
- Mode engine: ${profile.name}.
- Tujuan mode: ${profile.goal}.
- Frame rewrite wajib: ${profile.frames.join(", ")}.
- Preserve: maksud asli, jenis deliverable, target AI, dan fakta yang sudah ada.
- Improve: role, context, task, requirements, constraints, output format, quality checks.
- Output final harus langsung berupa prompt hasil optimize yang siap dicopy.`;
}

function buildPromptSpecInstruction(payload, attachments = [], { lean = false } = {}) {
  const pack = getDomainPromptPack(payload);
  const attachmentManifest = buildAttachmentManifest(attachments);
  if (lean) {
    return `Domain pack:
- Domain: ${pack.domain}
- Role: ${pack.role}
- Requirements: ${pack.requirements.slice(0, 5).join("; ")}
- Constraints: ${pack.constraints.slice(0, 4).join("; ")}
${attachmentManifest ? `- Attachments:\n${attachmentManifest}` : ""}`;
  }
  return `Prompt Spec JSON planning step:
- Before writing the final prompt, internally create this JSON object:
{
  "detected_domain": "${pack.domain}",
  "deliverable": "${payload.outputType || "not selected"}",
  "target_ai": "${payload.modelTarget || payload.targetModel || "General"}",
  "role": "specific senior role for this domain",
  "audience": "target user or reader",
  "objective": "single measurable objective",
  "source_context": ["facts from narrative", "facts from attachments"],
  "requirements": ["domain-specific requirement 1", "domain-specific requirement 2"],
  "constraints": ["concrete constraint 1", "concrete constraint 2", "concrete constraint 3"],
  "output_format": ["section 1", "section 2", "section 3"],
  "assumptions": ["explicit assumption when user omits a needed detail"],
  "acceptance_criteria": ["testable quality gate 1", "testable quality gate 2"],
  "clarifying_questions": ["only if a missing fact blocks execution"]
}

Domain pack to apply:
- Domain: ${pack.domain}
- Role hint: ${pack.role}
- Requirements: ${pack.requirements.join("; ")}
- Constraints: ${pack.constraints.join("; ")}
- Output controls: ${pack.outputControls.join("; ")}
- Quality gates: ${pack.qualityGates.join("; ")}
${attachmentManifest ? `- Attachment context:\n${attachmentManifest}` : "- Attachment context: none."}

Render rule:
- Do not output the JSON.
- Use the JSON only to render one final executable prompt.
- The final prompt must preserve the selected deliverable: ${payload.outputType || "not selected"}.

${getLanguageLockInstruction(payload.outputLanguage || resolveOutputLanguage(payload.narrative, payload.prompt))}`;
}

function getDomainPromptPack(payload = {}) {
  // v2: pakai expanded pack (17 domain, multi-domain detection).
  // Fallback ke legacy detector kalau primary domain "generic prompt".
  try {
    const expanded = getExpandedDomainPack(payload);
    if (expanded.primary && expanded.domains.primary !== "generic prompt") {
      const merged = { ...expanded.primary };
      if (expanded.secondary) {
        merged.requirements = [...merged.requirements, `(secondary: ${expanded.secondary.domain}) ${expanded.secondary.requirements[0] || ""}`];
        merged.constraints = [...merged.constraints, `(secondary: ${expanded.secondary.domain}) ${expanded.secondary.constraints[0] || ""}`];
      }
      return merged;
    }
  } catch (error) {
    console.warn("expanded domain pack failed, falling back", error.message);
  }

  const text = `${payload.narrative || ""} ${payload.category || ""} ${payload.outputType || ""}`.toLowerCase();
  const asksApp =
    /\b(aplikasi|app|web app|website|dashboard|sistem|platform|software|frontend|backend|full-stack|fullstack|tool|editor|builder|kasir|pos)\b/i.test(text) ||
    /kode aplikasi|application code/i.test(payload.outputType || "");
  const asksPresentation = /\b(ppt|powerpoint|presentasi|presentation|slide|slides)\b/i.test(text);
  const asksDocument = /\b(word|docx|dokumen|document|laporan|report|proposal)\b/i.test(text);
  const domain = getIntentDomain(text, asksApp, asksPresentation, asksDocument);

  const packs = {
    "marketing conversion workflow": {
      role: "senior conversion strategist for Indonesian SMEs",
      requirements: ["define audience segment", "state offer and proof", "map objections", "write CTA path", "include channel-specific variants"],
      constraints: ["avoid unverifiable claims", "make CTA explicit", "state assumptions for missing brand facts"],
      outputControls: ["ordered landing page sections", "copy limits per section", "variant count when useful"],
      qualityGates: ["message matches audience", "offer is concrete", "CTA is measurable", "no generic buzzwords"],
    },
    "runnable application": {
      role: "senior full-stack product engineer",
      requirements: ["define stack", "list screens", "specify data model", "map API or mock API", "include states and validation", "include local run steps"],
      constraints: ["avoid vague architecture", "include empty/loading/error states", "keep implementation runnable"],
      outputControls: ["folder structure", "file-by-file plan", "acceptance tests", "manual QA steps"],
      qualityGates: ["app can run locally", "core flow is testable", "UI states are covered", "data contracts are explicit"],
    },
    "presentation planning": {
      role: "senior presentation strategist",
      requirements: ["define audience", "build story arc", "create slide sequence", "specify visual per slide", "include speaker notes"],
      constraints: ["lock slide count", "avoid generic visuals", "tie visuals to source facts"],
      outputControls: ["slide-by-slide table", "visual guidance", "speaker notes", "export criteria"],
      qualityGates: ["narrative flows logically", "each slide has one job", "visuals support claims"],
    },
    "structured document": {
      role: "senior technical and editorial document writer",
      requirements: ["define document purpose", "map sections", "state evidence handling", "include tables or examples", "add review checklist"],
      constraints: ["do not invent facts", "mark assumptions", "preserve citation or source needs"],
      outputControls: ["document outline", "section goals", "word-count guidance", "quality checklist"],
      qualityGates: ["sections are complete", "claims are traceable", "recommendations are actionable"],
    },
    "creative photo editing tool": {
      role: "senior AI visual prompt director",
      requirements: ["define subject", "composition", "lighting", "style", "negative prompt", "export ratio"],
      constraints: ["avoid impossible edits", "preserve identity when required", "state missing visual assumptions"],
      outputControls: ["main prompt", "negative prompt", "style variants", "quality settings"],
      qualityGates: ["visual intent is inspectable", "constraints reduce artifacts", "output settings are explicit"],
    },
    "survey or form analysis": {
      role: "senior research analyst",
      requirements: ["map questions", "segment responses", "rank findings", "identify limitations", "recommend next actions"],
      constraints: ["do not overclaim", "separate data from interpretation", "flag missing sample details"],
      outputControls: ["findings table", "priority ranking", "risk notes", "recommendations"],
      qualityGates: ["insights cite available data", "limitations are visible", "actions are prioritized"],
    },
  };

  const fallback = {
    role: "senior prompt architect",
    requirements: ["lock intent", "define audience", "specify output format", "state constraints", "add quality gates"],
    constraints: ["avoid generic wording", "preserve deliverable", "ask only blocking questions"],
    outputControls: ["role", "context", "task", "requirements", "constraints", "acceptance criteria"],
    qualityGates: ["specific", "actionable", "testable", "ready to copy"],
  };

  return { domain, ...(packs[domain] || fallback) };
}

function buildCompareInstruction(payload) {
  const targetGuidance = getTargetModelGuidance(payload.targetModel, payload);
  return `Act as PromptLab Compare Judge.

Important:
- Do not execute Prompt A or Prompt B.
- Evaluate which prompt is more likely to produce a better AI output.
- Use the active provider model only as the judge.
- Evaluate for target AI/style: ${payload.targetModel || "General"}.
- Use case/context: ${payload.useCase || "Not provided"}.
${targetGuidance}

Prompt A:
${payload.promptA}

Prompt B:
${payload.promptB}

Compare across:
- intent clarity
- context completeness
- output format control
- constraint strength
- hallucination risk
- suitability for target AI
- implementation readiness when the prompt asks for app/code

Return strict JSON only, no markdown:
{
  "winner": "A" | "B" | "tie",
  "winner_label": "Prompt A" | "Prompt B" | "Tie",
  "summary": "one concise sentence",
  "scores": {
    "A": { "clarity": 0, "context": 0, "format": 0, "constraints": 0, "risk": 0, "overall": 0 },
    "B": { "clarity": 0, "context": 0, "format": 0, "constraints": 0, "risk": 0, "overall": 0 }
  },
  "risks": { "A": ["risk"], "B": ["risk"] },
  "recommendations": ["actionable improvement"],
  "best_for": { "A": "best use", "B": "best use" },
  "merged_prompt": "optional best combined prompt"
}`;
}

function parseCompareResult(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return normalizeCompareResult(JSON.parse(cleaned.slice(start, end + 1)));
  } catch {
    return null;
  }
}

function normalizeCompareResult(result) {
  const scores = result?.scores || {};
  const normalized = {
    winner: ["A", "B", "tie"].includes(result?.winner) ? result.winner : "tie",
    winner_label: result?.winner_label || (result?.winner === "A" ? "Prompt A" : result?.winner === "B" ? "Prompt B" : "Tie"),
    summary: String(result?.summary || "Prompt comparison completed.").slice(0, 500),
    scores: {
      A: normalizeCompareScores(scores.A),
      B: normalizeCompareScores(scores.B),
    },
    risks: {
      A: normalizeStringList(result?.risks?.A),
      B: normalizeStringList(result?.risks?.B),
    },
    recommendations: normalizeStringList(result?.recommendations),
    best_for: {
      A: String(result?.best_for?.A || "General use").slice(0, 180),
      B: String(result?.best_for?.B || "General use").slice(0, 180),
    },
    merged_prompt: String(result?.merged_prompt || "").slice(0, 12000),
  };
  return normalized;
}

function resolveCompareEvaluation(raw, payload) {
  const providerResult = parseCompareResult(raw);
  return providerResult
    ? { evaluationMethod: "provider", result: providerResult }
    : { evaluationMethod: "heuristic", result: buildLocalCompareResult(payload) };
}

function withCompareEvaluationMethod(body, evaluationMethod) {
  return {
    ...body,
    evaluationMethod: evaluationMethod === "provider" ? "provider" : "heuristic",
  };
}

function normalizeCompareScores(raw = {}) {
  const clamp = (value, fallback = 0) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(100, Math.max(0, Math.round(number)));
  };
  return {
    clarity: clamp(raw.clarity),
    context: clamp(raw.context),
    format: clamp(raw.format),
    constraints: clamp(raw.constraints),
    risk: clamp(raw.risk),
    overall: clamp(raw.overall),
  };
}

function normalizeStringList(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map((item) => String(item).trim()).filter(Boolean).slice(0, 6);
}

function buildLocalCompareResult(payload) {
  const scoreA = scorePromptForCompare(payload.promptA);
  const scoreB = scorePromptForCompare(payload.promptB);
  const winner = scoreA.overall > scoreB.overall ? "A" : scoreB.overall > scoreA.overall ? "B" : "tie";
  const missingA = getLocalPromptRisks(payload.promptA);
  const missingB = getLocalPromptRisks(payload.promptB);
  return {
    winner,
    winner_label: winner === "A" ? "Prompt A" : winner === "B" ? "Prompt B" : "Tie",
    summary:
      winner === "tie"
        ? "Both prompts are close; use the merged prompt or strengthen constraints."
        : `Prompt ${winner} is stronger by local readiness scoring.`,
    scores: {
      A: scoreA,
      B: scoreB,
    },
    risks: {
      A: missingA,
      B: missingB,
    },
    recommendations: [
      "Lock the output format with numbered sections.",
      "Add explicit constraints and acceptance criteria.",
      "State when the AI should ask clarifying questions.",
    ],
    best_for: {
      A: scoreA.context >= scoreB.context ? "Richer context" : "Fast draft or shorter request",
      B: scoreB.context >= scoreA.context ? "Richer context" : "Fast draft or shorter request",
    },
    merged_prompt: buildMergedPrompt(payload, scoreA.overall >= scoreB.overall ? payload.promptA : payload.promptB),
  };
}

function scorePromptText(prompt) {
  const scored = scorePromptForCompare(prompt);
  return {
    ...scored,
    details: [
      scored.clarity < 70 ? "Role/objective masih kurang spesifik." : "Role dan tujuan cukup jelas.",
      scored.context < 70 ? "Konteks, audiens, atau asumsi perlu diperkuat." : "Konteks cukup terkunci.",
      scored.format < 70 ? "Format output belum cukup terkendali." : "Format output cukup terkendali.",
      scored.constraints < 70 ? "Constraints masih lemah atau kurang terukur." : "Constraints cukup konkret.",
      scored.hallucinationResistance < 70
        ? "Perlu guardrail anti-hallucination yang lebih eksplisit."
        : "Guardrail fakta/asumsi cukup baik.",
      scored.actionability < 70 ? "Acceptance criteria atau langkah eksekusi perlu ditambah." : "Prompt cukup actionable.",
    ],
  };
}

function buildMergedPrompt(payload, basePrompt) {
  return `Use this improved prompt as the final version:

${basePrompt}

Add these quality gates before answering:
- Preserve the requested deliverable exactly.
- Follow the output format explicitly.
- State assumptions when details are missing.
- Ask at most 3 clarifying questions only if blocked.
- Include acceptance criteria or a quality checklist when useful.`;
}

function isClaudeTarget(modelTarget) {
  return /claude/i.test(String(modelTarget || ""));
}

function getTargetModelGuidance(modelTarget, payload = {}) {
  const target = String(modelTarget || "");
  const blocks = [];

  if (isClaudeTarget(target)) {
    blocks.push(`

Instruksi khusus untuk Claude:
- Letakkan dokumen/lampiran panjang di bagian atas prompt dalam tag <documents>, lalu letakkan tugas dan instruksi setelahnya.
- Tulis instruksi dengan action verbs: define, extract, map, rank, rewrite, build, verify.
- Sebutkan semua output yang harus dikirim, urutannya, batas jumlah, dan batas panjang.
- Gunakan instruksi positif: jelaskan gaya yang harus dipakai, bukan hanya larangan.
- Bila tugas kreatif atau aplikasi terbuka, tambahkan kalimat: "Go beyond the basics. Polish like a real client deliverable."
- Bila tugas kompleks, tambahkan kalimat: "Think before answering (maximum reasoning)."
- Bila membutuhkan web/tools, tulis eksplisit: "Use web search/tools aggressively and verify important claims."
- Pertahankan jenis deliverable dari user sebagai batas utama.`);
  }

  if (isGrokTarget(target)) {
    blocks.push(`

Instruksi khusus untuk Grok:
- Tulis prompt dengan nada tajam, konkret, dan tempo cepat — hindari corporate fluff.
- Untuk konten sosial/video: prioritaskan hook di 0–2 detik dan satu ide visual per beat.
- Gunakan action verbs dan batas panjang eksplisit per bagian.`);
    if (detectImageVideoIntent(payload).asksVideo) {
      blocks.push(`\n${buildGrokVideoFrameworkInstruction(payload.outputLanguage || "id").replace(/<\/?grok_video_director_layer>/g, "")}`);
    }
  }

  return blocks.join("");
}

function getConditionalInstructions(payload, attachments) {
  const asksPresentation = /\b(ppt|powerpoint|presentasi|slide|slides)\b/i.test(
    `${payload.narrative} ${payload.outputType}`
  );
  if (!asksPresentation || attachments.length === 0) return "";

  return `

Instruksi khusus visual untuk presentasi:
- Identifikasi gambar, bagan, diagram, tabel, peta, grafik, screenshot, atau elemen visual yang disebutkan/terlihat/tercantum dalam lampiran.
- Untuk setiap visual asli dari dokumen, tentukan slide nomor berapa yang paling relevan untuk menampilkannya.
- Untuk setiap slide, jelaskan jenis visual yang digunakan:
  1. visual asli dari dokumen,
  2. tabel yang disederhanakan dari dokumen,
  3. diagram baru yang dibuat ulang dari isi dokumen,
  4. ikon/gambar pendukung tambahan.
- Jangan memberi saran visual generik. Kaitkan visual dengan data, tabel, temuan, proses, atau istilah spesifik dari dokumen.
- Jika visual asli tidak tersedia atau tidak terbaca dari lampiran, berikan rekomendasi visual pengganti berdasarkan isi dokumen dan tandai sebagai "visual pengganti".`;
}

function getDeliverableGuard(payload, attachments) {
  const hasAttachment = attachments.length > 0;
  const explicitOutput = payload.outputType || "Tidak dipilih";
  const asksApp =
    /\b(aplikasi|app|web app|website|dashboard|sistem|platform|software|frontend|backend|full-stack|fullstack|ui\/ux|ui ux)\b/i.test(
      `${payload.narrative} ${payload.outputType}`
    ) || /kode aplikasi|application code/i.test(payload.outputType);
  const asksWord =
    (/\b(word|docx|laporan word|dokumen word|file word)\b/i.test(payload.narrative) &&
      /\b(buat|hasilkan|output|export|susun|tulis)\b/i.test(payload.narrative)) ||
    /dokumen word/i.test(payload.outputType);
  const asksPresentation = /\b(ppt|powerpoint|presentasi|slide|slides)\b/i.test(
    `${payload.narrative} ${payload.outputType}`
  );

  const lines = [
    `Jenis output terpilih dari UI PromptLab: ${explicitOutput}. Prioritaskan ini sebagai sumber kebenaran utama jika narasi ambigu.`,
    "Jangan menyimpulkan jenis output dari ekstensi file lampiran. File Word/PPT/PDF/XLSX bisa menjadi bahan referensi untuk output apa pun.",
    "Jenis output harus ditentukan dari narasi user, bukan dari tipe lampiran.",
  ];

  if (hasAttachment) {
    lines.push("Gunakan isi lampiran hanya sebagai konteks, data, referensi, dan bahan analisis.");
  }

  if (asksApp) {
    lines.push(
      "User meminta aplikasi/sistem/platform. Prompt final harus mengarah ke implementasi aplikasi yang bisa dijalankan: struktur proyek, frontend, backend/API atau mock API, data model, UI/UX, interaksi, cara menjalankan lokal, dan acceptance criteria. Jangan mengubahnya menjadi dokumen desain/Word/PPT kecuali user secara eksplisit memilih output tersebut."
    );
  }

  if (asksPresentation) {
    lines.push("User meminta PPT/presentasi. Prompt final harus menghasilkan struktur/konten PPT.");
  }

  if (asksWord && !asksApp && !asksPresentation) {
    lines.push("User meminta dokumen/laporan Word. Prompt final harus menghasilkan struktur laporan Word.");
  }

  return lines.map((line) => `- ${line}`).join("\n");
}

function getAntiGenericGuard() {
  return `

Anti-generic guardrails (WAJIB diterapkan ke prompt final):
- LARANG frasa kosong: "leverage", "synergy", "best practices", "world-class", "cutting-edge", "next-level", "game-changing", "seamless", "robust solution", "kelas dunia", "terdepan", "revolusioner".
- LARANG role generik seperti "an expert", "a professional", "AI assistant", "asisten AI"; role wajib spesifik (jabatan + domain + level senior + industri).
- LARANG placeholder yang harus diisi user: "[your brand]", "[insert here]", "[topik]", "[isi konteks]"; semua placeholder wajib di-instantiate dari narasi atau ditandai sebagai asumsi eksplisit.
- LARANG menutup prompt dengan rangkaian pertanyaan ke user; pertanyaan klarifikasi hanya boleh muncul jika benar-benar memblokir pekerjaan (maks 3 dan ditandai sebagai opsional).
- LARANG output yang tidak bisa langsung dieksekusi; setiap output_format WAJIB punya minimal satu batasan kuantitatif (jumlah kata, jumlah bullet, jumlah slide, durasi, ukuran section).
- Konstanta numerik (harga, durasi, jumlah, deadline) wajib di-pull dari narasi/lampiran; jika tidak ada, tandai sebagai "asumsi: <nilai>" dan jangan dikarang sebagai fakta.`;
}

function sanitizePromptOutput(text) {
  if (!text || typeof text !== "string") return text;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:markdown|md|xml|text|plaintext)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  const leakPatterns = [
    /^PromptLab Intent Engine Brief[\s\S]*?(?=\n(?:<role>|\*\*Role:?\*\*|Role:|# Role|## Role))/i,
    /^Intent Engine Brief[\s\S]*?(?=\n(?:<role>|\*\*Role:?\*\*|Role:|# Role|## Role))/i,
    /^(?:Berikut|Berikut ini|Here is|Here's)[^\n]*?(?:prompt|hasil)[^\n]*?:\s*\n+/i,
    /^Sebelum (?:menulis|membuat)[^\n]*?:\s*\n+/i,
    /^(?:Catatan|Note):[^\n]*\n+(?=<role>|\*\*Role|Role:|# Role|## Role)/i,
  ];
  for (const pattern of leakPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  cleaned = cleaned.replace(/^\s*(?:PromptLab\s+)?Intent Engine[^\n]*\n+/i, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

function getIntentEngineInstruction(payload, attachments) {
  const text = `${payload.narrative || ""} ${payload.category || ""} ${payload.outputType || ""}`.toLowerCase();
  const asksApp =
    /\b(aplikasi|app|web app|website|dashboard|sistem|platform|software|frontend|backend|full-stack|fullstack|tool|editor|builder|kasir|pos)\b/i.test(text) ||
    /kode aplikasi|application code/i.test(payload.outputType || "");
  const asksPresentation = /\b(ppt|powerpoint|presentasi|presentation|slide|slides)\b/i.test(text);
  const asksDocument = /\b(word|docx|dokumen|document|laporan|report|proposal)\b/i.test(text);

  const domain = getIntentDomain(text, asksApp, asksPresentation, asksDocument);
  const attachmentManifest = buildAttachmentManifest(attachments);
  const frames = asksApp
    ? [
        "struktur proyek",
        "frontend/screen utama",
        "backend/API atau mock API",
        "data model",
        "state dan validasi",
        "loading/empty/error states",
        "cara menjalankan lokal",
        "acceptance criteria yang bisa dites",
      ]
    : asksPresentation
      ? ["audiens", "alur cerita", "outline slide", "visual per slide", "speaker notes", "kriteria export"]
      : asksDocument
        ? ["outline dokumen", "tujuan per bagian", "sumber data", "tabel/contoh", "review checklist"]
        : ["role", "context", "task", "output format", "constraints", "quality checklist"];

  return `PromptLab Intent Engine wajib dipakai sebelum menulis prompt final:
- Tangkap maksud asli user, bukan hanya kalimat literal.
- Domain terdeteksi: ${domain}.
- Pecah kebutuhan menjadi intent, target pengguna, output, fitur/komponen utama, interaksi, validasi, edge cases, dan kriteria sukses.
- Tambahkan detail profesional yang wajar bila user belum menyebutkannya, tetapi tandai sebagai asumsi.
- Kunci jenis output: ${payload.outputType || "tidak dipilih"}. Jangan ubah karena lampiran.
- Context signal: ${attachments.length ? `${attachments.length} lampiran tersedia sebagai konteks` : "tidak ada lampiran"}.
${attachmentManifest ? `- Attachment manifest:\n${attachmentManifest}` : "- Attachment manifest: none."}
- Jika isi/OCR lampiran tersedia, gunakan sebagai konteks utama untuk intent, domain expansion, fitur, data, tabel, visual, dan constraints.
- Jika lampiran berupa foto/screenshot, baca teks/OCR dan tafsirkan UI, tabel, instruksi, atau konteks visual yang tampak.
- Jika lampiran berupa dokumen, jadikan isi dokumen sebagai sumber fakta utama, tetapi jangan menjadikan tipe file sebagai jenis output.
- Frame wajib: ${frames.join(", ")}.

Gunakan brief ini sebagai proses berpikir internal.
Jangan masukkan judul "PromptLab Intent Engine Brief" ke output final.
Output yang dikembalikan harus langsung berupa Final Executable Prompt yang siap dicopy user, berisi role, context, task, requirements, constraints, output format, implementation/delivery checklist, acceptance criteria, dan clarifying questions hanya jika benar-benar menghalangi pekerjaan.

${buildStructuredAuditInstruction(
  payload.narrative || "",
  payload.category || "",
  payload.outputType || "",
  payload.outputLanguage || resolveOutputLanguage(payload.narrative, ...(attachments || []).map((file) => file.excerpt))
)}

${buildPhasedAppDeliveryInstruction(
  payload.narrative || "",
  payload.category || "",
  payload.outputType || "",
  payload.outputLanguage || resolveOutputLanguage(payload.narrative, ...(attachments || []).map((file) => file.excerpt))
)}

${getLanguageLockInstruction(
  payload.outputLanguage || resolveOutputLanguage(payload.narrative, ...(attachments || []).map((file) => file.excerpt))
)}`;
}

function buildAttachmentManifest(attachments = []) {
  if (!attachments.length) return "";
  return attachments
    .slice(0, 8)
    .map((file, index) => {
      const source = file.excerpt
        ? `extracted context: ${prepareUntrustedAttachment(file.excerpt, { maxChars: 2000 }).content}`
        : "extracted context: not available yet; use file metadata and ask only if blocked";
      return `  ${index + 1}. ${file.filename} (${file.kind}, ${file.mime}, ${formatBytes(file.size)}) - ${source}`;
    })
    .join("\n");
}

function getIntentDomain(text, asksApp, asksPresentation, asksDocument) {
  if (/\b(informasi|survey|survei|kuesioner|questionnaire|form|formulir)\b/i.test(text)) return "survey or form analysis";
  if (/\b(edit foto|photo editor|image editor|gambar|foto)\b/i.test(text)) return "creative photo editing tool";
  if (/\b(kasir|pos|point of sale|checkout|struk|stok|inventory)\b/i.test(text)) return "retail POS system";
  if (/\b(dashboard|analytics|reporting|monitoring|admin)\b/i.test(text)) return "operational dashboard";
  if (/\b(landing page|jualan|marketing|campaign|instagram|umkm|brand)\b/i.test(text)) return "marketing conversion workflow";
  if (/\b(survey|form|formulir|questionnaire|registration|pendaftaran)\b/i.test(text)) return "form and workflow system";
  if (asksApp) return "runnable application";
  if (asksPresentation) return "presentation planning";
  if (asksDocument) return "structured document";
  return "general prompt workflow";
}

async function normalizeFile(file, modelSettings = {}, plan = "Free") {
  const mime = file.mimetype || "application/octet-stream";
  const isImage = mime.startsWith("image/");
  const isReadable = /^(application\/json|text\/)/.test(mime) || /\.(csv|json|md|txt)$/i.test(file.originalname);
  const isDocx =
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(file.originalname);
  const isPptx =
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    /\.pptx$/i.test(file.originalname);
  const isXlsx =
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    /\.xlsx$/i.test(file.originalname);
  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(file.originalname);
  let excerpt = "";

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    excerpt = result.value.replace(/\s+/g, " ").trim().slice(0, 15000);
  } else if (isPdf) {
    excerpt = await extractPdfText(file.buffer).catch((error) => {
      console.warn("pdf extraction skipped", file.originalname, error.message);
      return "";
    });
  } else if (isPptx) {
    excerpt = await extractPptxText(file.buffer);
  } else if (isXlsx) {
    excerpt = await extractXlsxText(file.buffer);
  } else if (isReadable) {
    excerpt = file.buffer.toString("utf8").replace(/\s+/g, " ").trim().slice(0, 4000);
  } else if (isImage) {
    excerpt = await extractImageText(file, modelSettings, plan).catch((error) => {
      console.warn("image OCR skipped", file.originalname, error.status || error.code || error.message);
      return "";
    });
  }

  return {
    dataUrl: `data:${mime};base64,${file.buffer.toString("base64")}`,
    excerpt,
    filename: file.originalname,
    kind: isImage ? "gambar/screenshot" : "file",
    mime,
    size: file.size,
  };
}

async function extractPdfText(buffer) {
  const raw = buffer.toString("latin1");
  const chunks = [];
  const literalStringPattern = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|'|"|\])/g;
  const hexStringPattern = /<([0-9A-Fa-f\s]{4,})>\s*Tj/g;
  let match;

  while ((match = literalStringPattern.exec(raw)) && chunks.length < 1200) {
    chunks.push(decodePdfLiteralString(match[1]));
  }

  while ((match = hexStringPattern.exec(raw)) && chunks.length < 1400) {
    chunks.push(decodePdfHexString(match[1]));
  }

  return chunks
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

function decodePdfLiteralString(value) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_match, char) => {
      const map = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
      return map[char] || char;
    })
    .replace(/\\(\d{1,3})/g, (_match, octal) => String.fromCharCode(Number.parseInt(octal, 8)))
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
}

function decodePdfHexString(value) {
  const clean = value.replace(/\s+/g, "");
  const bytes = clean.match(/.{1,2}/g)?.map((hex) => Number.parseInt(hex, 16)) || [];
  if (!bytes.length) return "";
  const hasUtf16Bom = bytes[0] === 0xfe && bytes[1] === 0xff;
  if (hasUtf16Bom) {
    let output = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      output += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    }
    return output.trim();
  }
  return Buffer.from(bytes).toString("utf8").replace(/\u0000/g, "").trim();
}

async function extractImageText(file, modelSettings = {}, plan = "Free") {
  const runtime = getRuntimeProvider(modelSettings);
  if (!runtime.client || runtime.provider === "openai") return "";
  const mime = file.mimetype || "image/png";
  const dataUrl = `data:${mime};base64,${file.buffer.toString("base64")}`;
  const ocrRuntime = resolveOcrRuntime(plan, modelSettings.ocrModel || getDefaultOcrModel());
  const response = await withTimeout(
    runtime.client.chat.completions.create(
      {
        model: ocrRuntime.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Extract all readable text from this image or screenshot. Preserve the original language shown in the image. Preserve headings, bullet points, tables, labels, and numbers. If no text is readable, return an empty string.",
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: ocrRuntime.maxTokens,
      },
      { timeout: ocrRuntime.timeoutMs }
    ),
    ocrRuntime.timeoutMs,
    ocrRuntime.model
  );
  return (response.choices?.[0]?.message?.content || "").replace(/\s+/g, " ").trim().slice(0, 5000);
}

function buildOpenAIContent(payload, attachments) {
  const conditionalInstructions = getConditionalInstructions(payload, attachments);
  const deliverableGuard = getDeliverableGuard(payload, attachments);
  const targetGuidance = getTargetModelGuidance(payload.modelTarget, payload);
  const intentEngine = getIntentEngineInstruction(payload, attachments);
  const promptSpec = buildPromptSpecInstruction(payload, attachments);
  const antiGeneric = getAntiGenericGuard();
  const content = [
    {
      type: "input_text",
      text: `Buat prompt terbaik untuk kebutuhan berikut.

Narasi user:
${payload.narrative}

Kategori: ${payload.category}
Tone: ${payload.tone}
Target AI: ${payload.modelTarget}
Jenis Output: ${payload.outputType || "Tidak dipilih"}

${intentEngine}

${promptSpec}

Prompt final wajib punya:
- Role yang tepat (spesifik: jabatan + domain + level senior, bukan "expert/AI assistant")
- Konteks dari narasi dan lampiran
- Tujuan yang jelas
- Format output dengan minimal satu batasan kuantitatif (jumlah, panjang, durasi, struktur)
- Batasan/constraints konkret (≥3 item)
- Acceptance criteria atau quality gates
- Instruksi agar AI bertanya hanya bila informasi penting benar-benar memblokir

Aturan penting:
- Ikuti jenis deliverable yang diminta user secara eksplisit: Word, PPT, email, caption, kode, gambar, tabel, atau format lain.
- Jangan mengganti deliverable ke format lain kecuali user memintanya.
- Jangan mengarahkan AI untuk meminta file ulang jika isi lampiran sudah tersedia di bawah.
- Output WAJIB langsung berupa prompt final yang siap dicopy. Jangan menyertakan preface seperti "Berikut prompt-nya:", brief internal, atau judul "Intent Engine".
${deliverableGuard}
- Jika isi lampiran tersedia, gunakan isi tersebut sebagai konteks utama.
${targetGuidance}${conditionalInstructions}${antiGeneric}

${getLanguageLockInstruction(payload.outputLanguage || resolveOutputLanguage(payload.narrative))}`,
    },
  ];

  for (const file of attachments) {
    if (file.mime.startsWith("image/") && file.dataUrl) {
      content.push({
        type: "input_image",
        image_url: file.dataUrl,
        detail: "auto",
      });
      continue;
    }

    if (file.mime === "application/pdf" && file.dataUrl) {
      content.push({
        type: "input_file",
        filename: file.filename,
        file_data: file.dataUrl,
      });
      continue;
    }

    content.push({
      type: "input_text",
      text: file.excerpt
        ? `Lampiran ${file.filename}:\n${prepareUntrustedAttachment(file.excerpt).content}`
        : `Lampiran ${file.filename} (${file.mime}, ${formatBytes(file.size)}). Gunakan metadata ini sebagai konteks bila isi file tidak tersedia.`,
    });
  }

  return content;
}

function buildOpenRouterContent(payload, attachments, { lean = false } = {}) {
  const conditionalInstructions = getConditionalInstructions(payload, attachments);
  const deliverableGuard = getDeliverableGuard(payload, attachments);
  const targetGuidance = getTargetModelGuidance(payload.modelTarget, payload);
  const promptSpec = buildPromptSpecInstruction(payload, attachments, { lean });
  const antiGeneric = lean ? "" : getAntiGenericGuard();
  if (lean) {
    const baseText = `Buat prompt final untuk kebutuhan berikut.

Narasi user:
${payload.narrative}

Kategori: ${payload.category}
Tone: ${payload.tone}
Target AI: ${payload.modelTarget}
Jenis Output: ${payload.outputType || "Tidak dipilih"}

${promptSpec}
${deliverableGuard}
${targetGuidance}${conditionalInstructions}
Output WAJIB langsung berupa prompt final siap copy-paste. Tanpa preface atau meta brief.

${getLanguageLockInstruction(payload.outputLanguage || resolveOutputLanguage(payload.narrative))}`;
    const attachmentText = attachments
      .map((file) =>
        file.excerpt
          ? `\n\nLampiran ${file.filename}:\n${prepareUntrustedAttachment(file.excerpt).content}`
          : `\n\nLampiran ${file.filename} (${file.mime}, ${formatBytes(file.size)}).`
      )
      .join("");
    return `${baseText}${attachmentText}`;
  }
  const intentEngine = getIntentEngineInstruction(payload, attachments);
  const baseText = `Buat prompt terbaik untuk kebutuhan berikut.

Narasi user:
${payload.narrative}

Kategori: ${payload.category}
Tone: ${payload.tone}
Target AI: ${payload.modelTarget}
Jenis Output: ${payload.outputType || "Tidak dipilih"}

${intentEngine}

${promptSpec}

Prompt final wajib punya:
- Role yang tepat (spesifik: jabatan + domain + level senior, bukan "expert/AI assistant")
- Konteks dari narasi dan lampiran
- Tujuan yang jelas
- Format output dengan minimal satu batasan kuantitatif (jumlah, panjang, durasi, struktur)
- Batasan/constraints konkret (≥3 item)
- Acceptance criteria atau quality gates
- Instruksi agar AI bertanya hanya bila informasi penting benar-benar memblokir

Aturan penting:
- Ikuti jenis deliverable yang diminta user secara eksplisit: Word, PPT, email, caption, kode, gambar, tabel, atau format lain.
- Jangan mengganti deliverable ke format lain kecuali user memintanya.
- Jangan mengarahkan AI untuk meminta file ulang jika isi lampiran sudah tersedia di bawah.
- Output WAJIB langsung berupa prompt final yang siap dicopy. Jangan menyertakan preface seperti "Berikut prompt-nya:", brief internal, atau judul "Intent Engine".
${deliverableGuard}
- Jika isi lampiran tersedia, gunakan isi tersebut sebagai konteks utama.
${targetGuidance}${conditionalInstructions}${antiGeneric}

${getLanguageLockInstruction(payload.outputLanguage || resolveOutputLanguage(payload.narrative))}`;

  const hasImage = attachments.some((file) => file.mime.startsWith("image/") && file.dataUrl);
  if (!hasImage) {
    const attachmentText = attachments
      .map((file) =>
        file.excerpt
          ? `\n\nLampiran ${file.filename}:\n${prepareUntrustedAttachment(file.excerpt).content}`
          : `\n\nLampiran ${file.filename} (${file.mime}, ${formatBytes(file.size)}). Isi file belum diekstrak lokal, gunakan metadata ini sebagai konteks dan minta user menyalin isi penting bila perlu.`
      )
      .join("");
    return `${baseText}${attachmentText}`;
  }

  const content = [
    {
      type: "text",
      text: baseText,
    },
  ];

  for (const file of attachments) {
    if (file.mime.startsWith("image/") && file.dataUrl) {
      content.push({
        type: "image_url",
        image_url: {
          url: file.dataUrl,
        },
      });
      continue;
    }

    content.push({
      type: "text",
      text: file.excerpt
        ? `Lampiran ${file.filename}:\n${prepareUntrustedAttachment(file.excerpt).content}`
        : `Lampiran ${file.filename} (${file.mime}, ${formatBytes(file.size)}). Isi file belum diekstrak lokal, gunakan metadata ini sebagai konteks dan minta user menyalin isi penting bila perlu.`,
    });
  }

  return content;
}

function buildFallbackPrompt(payload, attachments) {
  const conditionalInstructions = getConditionalInstructions(payload, attachments);
  const deliverableGuard = getDeliverableGuard(payload, attachments);
  const targetGuidance = getTargetModelGuidance(payload.modelTarget, payload);
  const intentEngine = getIntentEngineInstruction(payload, attachments);
  const pack = getDomainPromptPack(payload);
  const langMeta = getLanguageMeta(payload.outputLanguage || resolveOutputLanguage(payload.narrative));
  const attachmentText = attachments.length
    ? `

Lampiran:
${attachments
  .map(
    (file, index) =>
      `- Lampiran ${index + 1}: ${file.filename} (${file.kind}, ${formatBytes(file.size)})${
        file.excerpt ? `\n  Cuplikan:\n${prepareUntrustedAttachment(file.excerpt).content}` : ""
      }`
  )
  .join("\n")}`
    : "";

  return `Bertindaklah sebagai prompt engineer profesional untuk kategori ${payload.category}.

${intentEngine}

Domain pack:
- Domain: ${pack.domain}
- Role hint: ${pack.role}
- Requirements: ${pack.requirements.join("; ")}
- Constraints: ${pack.constraints.join("; ")}
- Output controls: ${pack.outputControls.join("; ")}
- Quality gates: ${pack.qualityGates.join("; ")}

Ubah kebutuhan berikut menjadi prompt siap pakai untuk ${payload.modelTarget}:
"${payload.narrative || "Jelaskan kebutuhan user berdasarkan konteks yang tersedia."}"${attachmentText}

Jenis Output:
- ${payload.outputType || "Tidak dipilih"}

Gaya bahasa:
- ${payload.tone}
- ${langMeta.audienceLine}

Susun prompt final dengan struktur:
1. Role AI yang harus diambil
2. Konteks lengkap dari narasi dan lampiran
3. Tugas utama yang harus dikerjakan
4. Format output yang diharapkan
5. Batasan, asumsi, dan hal yang harus dihindari
6. Instruksi untuk bertanya maksimal 3 pertanyaan jika konteks belum cukup

Ikuti jenis deliverable yang diminta user secara eksplisit. Jika user meminta PPT, prompt harus menghasilkan PPT. Jika user meminta laporan Word, prompt harus menghasilkan laporan Word. Jangan mengganti ke format lain kecuali user memintanya.
${deliverableGuard}
${targetGuidance}
${conditionalInstructions}

${getLanguageLockInstruction(payload.outputLanguage || resolveOutputLanguage(payload.narrative))}

${buildStructuredAuditInstruction(
  payload.narrative || "",
  payload.category || "",
  payload.outputType || "",
  payload.outputLanguage || resolveOutputLanguage(payload.narrative)
)}

${buildPhasedAppDeliveryInstruction(
  payload.narrative || "",
  payload.category || "",
  payload.outputType || "",
  payload.outputLanguage || resolveOutputLanguage(payload.narrative)
)}

Pastikan prompt tidak generik dan bisa langsung dicopy ke AI.`;
}

function buildLocalOptimizedPrompt(payload) {
  const source = payload.prompt.trim() || "Tuliskan kebutuhan user di sini.";
  const langCode = payload.outputLanguage || resolveOutputLanguage(payload.prompt);
  const langMeta = getLanguageMeta(langCode);
  if (isClaudeTarget(payload.targetModel)) {
    return buildClaudeOptimizedPrompt(payload, source);
  }
  const modeInstruction = {
    Clearer: "perjelas konteks, tujuan, format output, dan batasan agar AI tidak menebak.",
    Shorter: "padatkan instruksi tanpa menghilangkan role, tujuan, format, dan constraints.",
    "More Detailed": "tambahkan konteks, cakupan kerja, acceptance criteria, dan instruksi kualitas.",
    Academic: "gunakan bahasa formal, objektif, berbasis data, dan struktur akademik.",
    "Lebih Jelas": "perjelas konteks, tujuan, format output, dan batasan agar AI tidak menebak.",
    "Lebih Singkat": "padatkan instruksi tanpa menghilangkan role, tujuan, format, dan constraints.",
    "Lebih Detail": "tambahkan konteks, cakupan kerja, acceptance criteria, dan instruksi kualitas.",
    Akademik: "gunakan bahasa formal, objektif, berbasis data, dan struktur akademik.",
    Marketing: "kuatkan audiens, value proposition, pesan utama, CTA, dan batasan brand voice.",
    Coding: "kuatkan spesifikasi fitur, stack, struktur file, acceptance criteria, dan instruksi testing.",
  }[payload.mode] || "rapikan struktur prompt agar lebih siap dipakai.";
  const optimizerEngine = getOptimizerEngineInstruction(payload);

  return `**Prompt Final**

**Role:** Anda adalah AI specialist yang berperan sebagai ahli sesuai kebutuhan tugas berikut.

**Context:** User memiliki kebutuhan berikut dan ingin hasil yang langsung bisa digunakan:
${source}

${optimizerEngine}

**Objective:** Kerjakan kebutuhan tersebut dengan kualitas tinggi. Pertahankan jenis output yang diminta dalam prompt lama, lalu ${modeInstruction}

**Output Format:**
1. Ringkasan pemahaman kebutuhan
2. Hasil utama sesuai deliverable yang diminta
3. Detail pendukung yang relevan
4. Checklist kualitas
5. Pertanyaan klarifikasi bila ada informasi krusial yang belum tersedia

**Constraints:**
- ${langMeta.constraintLine(payload.tone)}.
- Jangan mengubah jenis deliverable kecuali user meminta secara eksplisit.
- Jangan mengarang data yang tidak diberikan.
- Jika konteks sudah cukup, langsung kerjakan tanpa meminta file/informasi ulang.
- Jika perlu bertanya, batasi maksimal 3 pertanyaan yang benar-benar krusial.
- Jangan tampilkan bagian PromptLab Optimizer Engine di output final provider; gunakan hanya sebagai logika internal.

**Target AI:** Optimalkan untuk ${payload.targetModel}.

**Checklist Perbaikan**
- Role, context, objective, format, dan constraints dibuat eksplisit.
- Deliverable guard ditambahkan agar output tidak bergeser format.
- Instruksi klarifikasi dibuat terbatas dan spesifik.`;
}

function buildClaudeOptimizedPrompt(payload, source) {
  const langCode = payload.outputLanguage || resolveOutputLanguage(payload.prompt, source);
  const langMeta = getLanguageMeta(langCode);
  const modeInstruction = {
    Clearer: "Name the exact scope, output order, boundaries, and success criteria.",
    Shorter: "Keep the prompt compact while preserving scope, output order, and boundaries.",
    "More Detailed": "Add explicit steps, acceptance criteria, and concrete output caps.",
    Academic: "Use formal academic structure, evidence mapping, and concise claims.",
    "Lebih Jelas": "Name the exact scope, output order, boundaries, and success criteria.",
    "Lebih Singkat": "Keep the prompt compact while preserving scope, output order, and boundaries.",
    "Lebih Detail": "Add explicit steps, acceptance criteria, and concrete output caps.",
    Akademik: "Use formal academic structure, evidence mapping, and concise claims.",
    Marketing: "Define audience, offer, proof, CTA, voice, and conversion goal.",
    Coding: "Define stack, file structure, implementation steps, tests, and acceptance criteria.",
  }[payload.mode] || "Make the task clear, direct, and detailed.";
  const optimizerEngine = getOptimizerEngineInstruction(payload);

  return `<task>
Optimize this prompt for Claude while preserving its original deliverable.
</task>

<promptlab_optimizer_engine>
${optimizerEngine}
</promptlab_optimizer_engine>

<original_prompt>
${source}
</original_prompt>

Act as a senior prompt engineer for Claude.

Goal:
- Rewrite the prompt so Claude knows the exact scope, order, boundaries, and output caps.
- Preserve the original requested deliverable.
- ${modeInstruction}

Execution steps:
1. Identify the intended deliverable from <original_prompt>.
2. Rewrite vague requests into named actions.
3. Define the output sections in order.
4. Add length caps, table requirements, visual requirements, or acceptance criteria where useful.
5. Add tool/search instructions only when the task needs current or external facts.

Output:
Return only the final optimized prompt. Do not include a separate engine brief.

Style:
- ${langMeta.constraintLine(payload.tone)}.
- Use positive instructions.
- Use action verbs: define, extract, map, rank, rewrite, build, verify.
- Use concrete boundaries, counts, and order.

Reasoning:
- Think before answering (maximum reasoning).

Creative/product work:
- Go beyond the basics. Polish like a real client deliverable.`;
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function extractPptxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0));

  const slides = [];
  for (const name of slideFiles.slice(0, 40)) {
    const xml = await zip.files[name].async("string");
    const texts = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
      .map((match) => decodeXml(match[1]).trim())
      .filter(Boolean);
    if (texts.length) {
      const slideNo = name.match(/slide(\d+)/)?.[1] || slides.length + 1;
      slides.push(`Slide ${slideNo}: ${texts.join(" | ")}`);
    }
  }

  return slides.join(" ").replace(/\s+/g, " ").trim().slice(0, 15000);
}

async function extractXlsxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sharedXml = zip.files["xl/sharedStrings.xml"]
    ? await zip.files["xl/sharedStrings.xml"].async("string")
    : "";
  const sharedStrings = sharedXml
    ? [...sharedXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1]))
    : [];
  const sheetFiles = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/sheet(\d+)/)?.[1] || 0) - Number(b.match(/sheet(\d+)/)?.[1] || 0));

  const rows = [];
  for (const name of sheetFiles.slice(0, 12)) {
    const xml = await zip.files[name].async("string");
    const values = [...xml.matchAll(/<c[^>]*?(?:t="([^"]+)")?[^>]*>[\s\S]*?<v>([\s\S]*?)<\/v>[\s\S]*?<\/c>/g)]
      .map((match) => {
        const type = match[1];
        const value = decodeXml(match[2]).trim();
        if (type === "s") return sharedStrings[Number(value)] || "";
        return value;
      })
      .filter(Boolean);
    if (values.length) {
      const sheetNo = name.match(/sheet(\d+)/)?.[1] || rows.length + 1;
      rows.push(`Sheet ${sheetNo}: ${values.slice(0, 120).join(" | ")}`);
    }
  }

  return rows.join(" ").replace(/\s+/g, " ").trim().slice(0, 15000);
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeExportPayload(body) {
  return {
    title: String(body.title || "PromptLab Export").slice(0, 120),
    content: String(body.content || "").slice(0, 50000),
  };
}

function safeFilename(title) {
  const cleaned = title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned || "promptlab-export";
}

function cleanMarkdown(line) {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*[-*]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function markdownToDocxParagraphs(content) {
  const lines = content.split(/\r?\n/);
  const paragraphs = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    if (/^#{1,2}\s+/.test(line) || /^\*\*[^*]+:\*\*/.test(line)) {
      paragraphs.push(
        new Paragraph({
          text: cleanMarkdown(line).replace(/:$/, ""),
          heading: HeadingLevel.HEADING_1,
        })
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(rawLine)) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun(cleanMarkdown(line))],
        })
      );
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: [new TextRun(cleanMarkdown(line))],
      })
    );
  }

  return paragraphs;
}

function buildSlidesFromContent(pptx, title, content) {
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "172033" };
  titleSlide.addText(title, {
    x: 0.7,
    y: 1.8,
    w: 11.8,
    h: 1.0,
    fontFace: "Aptos Display",
    fontSize: 34,
    bold: true,
    color: "FFFFFF",
    fit: "shrink",
  });
  titleSlide.addText("Generated by PromptLab", {
    x: 0.75,
    y: 2.9,
    w: 8,
    h: 0.4,
    fontFace: "Aptos",
    fontSize: 14,
    color: "9DB4D3",
  });

  const sections = splitContentIntoSlideSections(content);
  for (const section of sections.slice(0, 30)) {
    const slide = pptx.addSlide();
    slide.background = { color: "172033" };
    slide.addText(section.title, {
      x: 0.55,
      y: 0.4,
      w: 12.2,
      h: 0.55,
      fontFace: "Aptos Display",
      fontSize: 24,
      bold: true,
      color: "FFFFFF",
      fit: "shrink",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.55,
      y: 1.08,
      w: 12.2,
      h: 0,
      line: { color: "20D6A1", width: 1.2 },
    });
    slide.addText(section.body.join("\n"), {
      x: 0.75,
      y: 1.35,
      w: 11.8,
      h: 5.2,
      fontFace: "Aptos",
      fontSize: 15,
      color: "EAF2FF",
      breakLine: false,
      fit: "shrink",
      valign: "top",
      margin: 0.08,
    });
  }
}

function splitContentIntoSlideSections(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => cleanMarkdown(line))
    .filter(Boolean);
  const sections = [];
  let current = { title: "Ringkasan", body: [] };

  for (const line of lines) {
    const isHeading =
      /^slide\s+\d+/i.test(line) ||
      /^(role|context|objective|tujuan|format output|constraints|instruksi|fitur|arsitektur|roadmap|acceptance criteria)\b/i.test(line);
    if (isHeading && current.body.length) {
      sections.push(current);
      current = { title: line.slice(0, 90), body: [] };
      continue;
    }
    if (isHeading && current.body.length === 0 && current.title === "Ringkasan") {
      current.title = line.slice(0, 90);
      continue;
    }
    current.body.push(line.length > 170 ? `${line.slice(0, 167)}...` : line);
  }

  if (current.body.length || current.title !== "Ringkasan") sections.push(current);
  if (sections.length === 0) sections.push({ title: "PromptLab Export", body: ["Tidak ada konten untuk diekspor."] });

  return sections;
}
