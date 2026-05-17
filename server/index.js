import "dotenv/config";
import cors from "cors";
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
import pptxgen from "pptxgenjs";

const app = express();
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
    cb(new Error("Tipe file belum didukung."));
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
const provider = process.env.AI_PROVIDER || (openrouter ? "openrouter" : "openai");
const openRouterPrimaryTimeoutMs = Number(process.env.OPENROUTER_PRIMARY_TIMEOUT_MS || 55000);
const openRouterFallbackTimeoutMs = Number(process.env.OPENROUTER_FALLBACK_TIMEOUT_MS || 55000);
const openRouterOcrModel = process.env.OPENROUTER_OCR_MODEL || "baidu/qianfan-ocr-fast:free";
const openRouterOcrTimeoutMs = Number(process.env.OPENROUTER_OCR_TIMEOUT_MS || 45000);
const defaultOpenRouterFallbackModels = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "openai/gpt-oss-20b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  const modelSettings = normalizeModelSettings(req.query);
  const runtime = getRuntimeProvider(modelSettings);
  res.json({
    ok: true,
    ai: Boolean(runtime.client),
    endpoint: runtime.baseURL || "OpenAI default",
    provider: runtime.provider,
    model: modelSettings.primaryModel || runtime.defaultModel,
    fallbackModel: runtime.provider === "openai" ? null : getOpenRouterFallbackModels(modelSettings.primaryModel || runtime.defaultModel)[0] || null,
    fallbackModels: runtime.provider === "openai" ? [] : getOpenRouterFallbackModels(modelSettings.primaryModel || runtime.defaultModel, "balanced", modelSettings.fallbackModels),
    ocrModel: modelSettings.ocrModel || getDefaultOcrModel(),
  });
});

app.post("/api/test-provider", express.json({ limit: "64kb" }), async (req, res) => {
  try {
    const modelSettings = normalizeModelSettings(req.body);
    const runtime = getRuntimeProvider(modelSettings);
    const model = modelSettings.primaryModel || runtime.defaultModel;

    if (!runtime.client) {
      res.status(400).json({ ok: false, provider: runtime.provider, error: "API key belum aktif. Isi ENV Vercel atau API key override." });
      return;
    }

    if (runtime.provider !== "openai") {
      const completion = await withTimeout(
        runtime.client.chat.completions.create(
          {
            model,
            messages: [
              {
                role: "user",
                content:
                  "Buat prompt singkat berbahasa Indonesia untuk mengubah brief mentah menjadi prompt AI profesional. Maksimal 120 kata.",
              },
            ],
            max_tokens: 220,
          },
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

app.post("/api/export/docx", async (req, res) => {
  try {
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
    res.status(500).json({ error: "Gagal membuat file DOCX." });
  }
});

app.post("/api/export/pptx", async (req, res) => {
  try {
    const { title, content } = normalizeExportPayload(req.body);
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
    res.status(500).json({ error: "Gagal membuat file PPTX." });
  }
});

app.post("/api/optimize-prompt", async (req, res) => {
  try {
    const payload = normalizeOptimizePayload(req.body);
    const runtime = getRuntimeProvider(payload.modelSettings);

    if (runtime.provider !== "openai" && runtime.client) {
      try {
        const completion = await createOpenRouterOptimizeCompletion(payload, runtime);
        res.json({
          source: runtime.provider,
          model: completion.model,
          prompt: completion.choices?.[0]?.message?.content || buildLocalOptimizedPrompt(payload),
        });
        return;
      } catch (error) {
        console.warn("openrouter optimize fallback", error.status || error.code || error.message);
        res.json({
          source: "fallback",
          warning: "Provider AI sedang limit/overload, memakai optimizer lokal.",
          prompt: buildLocalOptimizedPrompt(payload),
        });
        return;
      }
    }

    if (runtime.provider === "openai" && runtime.client) {
      const response = await runtime.client.responses.create({
        model: payload.modelSettings.primaryModel || runtime.defaultModel,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You are PromptLab Optimizer Engine. Improve an existing prompt in Indonesian using the selected optimization mode as a meta-prompt layer. Preserve the original deliverable and return only the final optimized prompt ready to copy. Do not include a separate engine brief.",
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
      res.json({
        source: "openai",
        prompt: response.output_text || buildLocalOptimizedPrompt(payload),
      });
      return;
    }

    res.json({
      source: "fallback",
      prompt: buildLocalOptimizedPrompt(payload),
    });
  } catch (error) {
    console.error("optimize-prompt failed", error.message);
    res.status(500).json({ error: "Gagal mengoptimalkan prompt." });
  }
});

app.post("/api/generate-prompt", upload.array("attachments", 8), async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const attachments = await Promise.all((req.files || []).map((file) => normalizeFile(file, payload.modelSettings)));
    const runtime = getRuntimeProvider(payload.modelSettings);

    if (runtime.provider !== "openai") {
      if (!runtime.client) {
        res.json({
          source: "fallback",
          model: "Local fallback",
          modelStatus: "local-fallback",
          warning: "API key provider belum aktif, memakai generator lokal.",
          prompt: buildFallbackPrompt(payload, attachments),
        });
        return;
      }

      try {
        const generation = await createOpenRouterCompletion(payload, attachments, runtime);
        const completion = generation.completion;
        const prompt =
          completion.choices?.[0]?.message?.content ||
          buildFallbackPrompt(payload, attachments);

        res.json({
          source: runtime.provider,
          model: completion.model,
          modelStatus: generation.usedFallbackModel ? "fallback-model" : "primary-model",
          warning: generation.usedFallbackModel
            ? `Primary model sedang limit/error (${generation.primaryError}). Fallback model dipakai.`
            : "",
          prompt,
        });
      } catch (error) {
        console.warn("openrouter fallback", error.status || error.code || error.message);
        res.json({
          source: "fallback",
          model: "Local fallback",
          modelStatus: "local-fallback",
          warning: "Provider AI sedang limit/overload, memakai generator lokal.",
          prompt: buildFallbackPrompt(payload, attachments),
        });
      }
      return;
    }

    if (!runtime.client) {
      res.json({
        source: "fallback",
        model: "Local fallback",
        modelStatus: "local-fallback",
        warning: "OpenAI API key belum aktif, memakai generator lokal.",
        prompt: buildFallbackPrompt(payload, attachments),
      });
      return;
    }

    const response = await runtime.client.responses.create({
      model: payload.modelSettings.primaryModel || runtime.defaultModel,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are PromptLab Intent Engine, a senior prompt architect. Do not merely restate the raw user request. Decompose intent, expand the domain, infer missing professional implementation details carefully, lock the deliverable type, then create one excellent ready-to-use prompt in Indonesian. Preserve the user's requested deliverable exactly. If the user asks for PPT, create a prompt for PPT. If the user asks for a Word report, create a prompt for a Word-style report. Return only the final prompt, no chatty preface.",
            },
          ],
        },
        {
          role: "user",
          content: buildOpenAIContent(payload, attachments),
        },
      ],
    });

    res.json({
      source: "openai",
      prompt: response.output_text || buildFallbackPrompt(payload, attachments),
    });
  } catch (error) {
    console.error("generate-prompt failed", error.message);
    res.status(error.message === "Tipe file belum didukung." ? 400 : 500).json({
      error:
        error.message === "Tipe file belum didukung."
          ? error.message
          : "Gagal membuat prompt. Coba lagi sebentar.",
    });
  }
});

app.use((error, _req, res, _next) => {
  const message =
    error.code === "LIMIT_FILE_SIZE"
      ? "Ukuran file terlalu besar. Maksimal 8 MB per file."
      : error.message || "Request tidak valid.";
  res.status(400).json({ error: message });
});

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  app.listen(port, () => {
    console.log(`PromptLab API running at http://127.0.0.1:${port}`);
  });
}

export default app;

function normalizePayload(body) {
  return {
    category: String(body.category || "Marketing").slice(0, 80),
    generationMode: normalizeGenerationMode(body.generationMode),
    modelSettings: normalizeModelSettings(body),
    modelTarget: String(body.model || "ChatGPT").slice(0, 80),
    narrative: String(body.narrative || "").slice(0, 6000),
    outputType: String(body.outputType || "").slice(0, 80),
    tone: String(body.tone || "Profesional").slice(0, 80),
  };
}

function normalizeOptimizePayload(body) {
  return {
    generationMode: normalizeGenerationMode(body.generationMode),
    mode: String(body.mode || "Lebih Jelas").slice(0, 80),
    modelSettings: normalizeModelSettings(body),
    prompt: String(body.prompt || "").slice(0, 12000),
    targetModel: String(body.targetModel || "Claude").slice(0, 80),
    tone: String(body.tone || "Profesional").slice(0, 80),
  };
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

function normalizeProvider(value) {
  const normalized = String(value || provider || "openrouter").toLowerCase();
  if (normalized === "openai") return "openai";
  if (normalized === "custom") return "custom";
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
  return Math.min(Math.max(Math.round(parsed), 5000), 55000);
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
  return process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";
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
    fallbackTimeoutMs: Number(process.env.OPENROUTER_BALANCED_FALLBACK_TIMEOUT_MS || 55000),
    primaryTimeoutMs: Number(process.env.OPENROUTER_BALANCED_PRIMARY_TIMEOUT_MS || 40000),
  };
}

async function createOpenRouterCompletion(payload, attachments, runtime = getRuntimeProvider(payload.modelSettings)) {
  const messages = [
    {
      role: "system",
      content:
        "You are PromptLab Intent Engine, a senior prompt architect. Do not merely restate the raw user request. Decompose intent, expand the domain, infer missing professional implementation details carefully, lock the deliverable type, then create one excellent ready-to-use prompt in Indonesian. Preserve the user's requested deliverable exactly. If the user selects Application Code/Kode Aplikasi, create a prompt for building runnable application code. If the user asks for PPT, create a prompt for PPT. If the user asks for a Word report, create a prompt for a Word-style report. Return only the final prompt, no chatty preface.",
    },
    {
      role: "user",
      content: buildOpenRouterContent(payload, attachments),
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
      {
        model: primaryModel,
        messages,
        max_tokens: 2200,
      },
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
      2200
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
      content:
        "You are PromptLab Optimizer Engine, a senior prompt architect. Improve the user's prompt in Indonesian using the selected optimization mode as a meta-prompt layer. Preserve the original intent, do not change the requested deliverable, and return only the final optimized prompt ready to copy. Do not include a separate engine brief.",
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
    payload.modelSettings?.fallbackModels
  );
  const timing = getOpenRouterTiming(payload.generationMode);
  if (payload.modelSettings?.timeoutMs) timing.primaryTimeoutMs = payload.modelSettings.timeoutMs;

  try {
    return await withTimeout(runtime.client.chat.completions.create(
      {
        model: primaryModel,
        messages,
        max_tokens: 1600,
      },
      { timeout: timing.primaryTimeoutMs }
    ), timing.primaryTimeoutMs, primaryModel);
  } catch (error) {
    if (!shouldTryFallbackModel(error) || fallbackModels.length === 0) throw error;
    console.warn(
      `openrouter optimize primary failed, trying fallback chain`,
      error.status || error.code || error.message
    );
    return (await tryOpenRouterFallbackModels(runtime.client, fallbackModels, messages, timing.fallbackTimeoutMs, 1600)).completion;
  }
}

function getOpenRouterFallbackModels(primaryModel = getDefaultOpenRouterModel(), mode = "balanced", overrideModels = []) {
  const configured = (process.env.OPENROUTER_FALLBACK_MODELS || process.env.OPENROUTER_FALLBACK_MODEL || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const merged = [...(overrideModels || []), ...configured, ...defaultOpenRouterFallbackModels];
  const models = [...new Set(merged)].filter((model) => model && model !== primaryModel);
  if (mode === "fast") return models.slice(0, 2);
  if (mode === "patient") return models;
  return models.slice(0, 3);
}

async function tryOpenRouterFallbackModels(client, models, messages, timeoutMs, maxTokens = 2200) {
  const errors = [];
  let lastError = null;

  for (const model of models) {
    try {
      console.warn(`trying openrouter fallback model ${model}`);
      const completion = await withTimeout(client.chat.completions.create(
        {
          model,
          messages,
          max_tokens: maxTokens,
        },
        { timeout: timeoutMs }
      ), timeoutMs, model);
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
  const targetGuidance = getTargetModelGuidance(payload.targetModel);
  const optimizerEngine = getOptimizerEngineInstruction(payload);
  return `Optimalkan prompt berikut.

Mode optimasi:
- ${payload.mode}

Target AI:
- ${payload.targetModel}

Tone:
- ${payload.tone}

${optimizerEngine}

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
Return only the final optimized prompt, ready to copy. Do not include a separate engine brief.`;
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

function isClaudeTarget(modelTarget) {
  return /claude/i.test(String(modelTarget || ""));
}

function getTargetModelGuidance(modelTarget) {
  if (!isClaudeTarget(modelTarget)) return "";
  return `

Instruksi khusus untuk Claude:
- Letakkan dokumen/lampiran panjang di bagian atas prompt dalam tag <documents>, lalu letakkan tugas dan instruksi setelahnya.
- Tulis instruksi dengan action verbs: define, extract, map, rank, rewrite, build, verify.
- Sebutkan semua output yang harus dikirim, urutannya, batas jumlah, dan batas panjang.
- Gunakan instruksi positif: jelaskan gaya yang harus dipakai, bukan hanya larangan.
- Bila tugas kreatif atau aplikasi terbuka, tambahkan kalimat: "Go beyond the basics. Polish like a real client deliverable."
- Bila tugas kompleks, tambahkan kalimat: "Think before answering (maximum reasoning)."
- Bila membutuhkan web/tools, tulis eksplisit: "Use web search/tools aggressively and verify important claims."
- Pertahankan jenis deliverable dari user sebagai batas utama.`;
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

function getIntentEngineInstruction(payload, attachments) {
  const text = `${payload.narrative || ""} ${payload.category || ""} ${payload.outputType || ""}`.toLowerCase();
  const asksApp =
    /\b(aplikasi|app|web app|website|dashboard|sistem|platform|software|frontend|backend|full-stack|fullstack|tool|editor|builder|kasir|pos)\b/i.test(text) ||
    /kode aplikasi|application code/i.test(payload.outputType || "");
  const asksPresentation = /\b(ppt|powerpoint|presentasi|presentation|slide|slides)\b/i.test(text);
  const asksDocument = /\b(word|docx|dokumen|document|laporan|report|proposal)\b/i.test(text);

  const domain = getIntentDomain(text, asksApp, asksPresentation, asksDocument);
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
- Frame wajib: ${frames.join(", ")}.

Gunakan brief ini sebagai proses berpikir internal.
Jangan masukkan judul "PromptLab Intent Engine Brief" ke output final.
Output yang dikembalikan harus langsung berupa Final Executable Prompt yang siap dicopy user, berisi role, context, task, requirements, constraints, output format, implementation/delivery checklist, acceptance criteria, dan clarifying questions hanya jika benar-benar menghalangi pekerjaan.`;
}

function getIntentDomain(text, asksApp, asksPresentation, asksDocument) {
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

async function normalizeFile(file, modelSettings = {}) {
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
  let excerpt = "";

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    excerpt = result.value.replace(/\s+/g, " ").trim().slice(0, 6000);
  } else if (isPptx) {
    excerpt = await extractPptxText(file.buffer);
  } else if (isXlsx) {
    excerpt = await extractXlsxText(file.buffer);
  } else if (isReadable) {
    excerpt = file.buffer.toString("utf8").replace(/\s+/g, " ").trim().slice(0, 1200);
  } else if (isImage) {
    excerpt = await extractImageText(file, modelSettings).catch((error) => {
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

async function extractImageText(file, modelSettings = {}) {
  const runtime = getRuntimeProvider(modelSettings);
  if (!runtime.client || runtime.provider === "openai") return "";
  const mime = file.mimetype || "image/png";
  const dataUrl = `data:${mime};base64,${file.buffer.toString("base64")}`;
  const ocrModel = modelSettings.ocrModel || getDefaultOcrModel();
  const response = await withTimeout(
    runtime.client.chat.completions.create(
      {
        model: ocrModel,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Extract all readable text from this image or screenshot. Return Indonesian text when visible. Preserve headings, bullet points, tables, labels, and numbers. If no text is readable, return an empty string.",
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
        max_tokens: 1600,
      },
      { timeout: openRouterOcrTimeoutMs }
    ),
    openRouterOcrTimeoutMs,
    ocrModel
  );
  return (response.choices?.[0]?.message?.content || "").replace(/\s+/g, " ").trim().slice(0, 5000);
}

function buildOpenAIContent(payload, attachments) {
  const conditionalInstructions = getConditionalInstructions(payload, attachments);
  const deliverableGuard = getDeliverableGuard(payload, attachments);
  const targetGuidance = getTargetModelGuidance(payload.modelTarget);
  const intentEngine = getIntentEngineInstruction(payload, attachments);
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

Prompt final wajib punya:
- Role yang tepat
- Konteks dari narasi dan lampiran
- Tujuan yang jelas
- Format output
- Batasan/constraints
- Instruksi agar AI bertanya hanya bila informasi penting belum cukup

Aturan penting:
- Ikuti jenis deliverable yang diminta user secara eksplisit: Word, PPT, email, caption, kode, gambar, tabel, atau format lain.
- Jangan mengganti deliverable ke format lain kecuali user memintanya.
- Jangan mengarahkan AI untuk meminta file ulang jika isi lampiran sudah tersedia di bawah.
${deliverableGuard}
- Jika isi lampiran tersedia, gunakan isi tersebut sebagai konteks utama.
${targetGuidance}${conditionalInstructions}`,
    },
  ];

  for (const file of attachments) {
    if (file.mime.startsWith("image/")) {
      content.push({
        type: "input_image",
        image_url: file.dataUrl,
        detail: "auto",
      });
      continue;
    }

    if (file.mime === "application/pdf") {
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
        ? `Lampiran ${file.filename}: ${file.excerpt}`
        : `Lampiran ${file.filename} (${file.mime}, ${formatBytes(file.size)}). Gunakan metadata ini sebagai konteks bila isi file tidak tersedia.`,
    });
  }

  return content;
}

function buildOpenRouterContent(payload, attachments) {
  const conditionalInstructions = getConditionalInstructions(payload, attachments);
  const deliverableGuard = getDeliverableGuard(payload, attachments);
  const targetGuidance = getTargetModelGuidance(payload.modelTarget);
  const intentEngine = getIntentEngineInstruction(payload, attachments);
  const baseText = `Buat prompt terbaik untuk kebutuhan berikut.

Narasi user:
${payload.narrative}

Kategori: ${payload.category}
Tone: ${payload.tone}
Target AI: ${payload.modelTarget}
Jenis Output: ${payload.outputType || "Tidak dipilih"}

${intentEngine}

Prompt final wajib punya:
- Role yang tepat
- Konteks dari narasi dan lampiran
- Tujuan yang jelas
- Format output
- Batasan/constraints
- Instruksi agar AI bertanya hanya bila informasi penting belum cukup

Aturan penting:
- Ikuti jenis deliverable yang diminta user secara eksplisit: Word, PPT, email, caption, kode, gambar, tabel, atau format lain.
- Jangan mengganti deliverable ke format lain kecuali user memintanya.
- Jangan mengarahkan AI untuk meminta file ulang jika isi lampiran sudah tersedia di bawah.
${deliverableGuard}
- Jika isi lampiran tersedia, gunakan isi tersebut sebagai konteks utama.
${targetGuidance}${conditionalInstructions}`;

  const hasImage = attachments.some((file) => file.mime.startsWith("image/"));
  if (!hasImage) {
    const attachmentText = attachments
      .map((file) =>
        file.excerpt
          ? `\n\nLampiran ${file.filename}: ${file.excerpt}`
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
    if (file.mime.startsWith("image/")) {
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
        ? `Lampiran ${file.filename}: ${file.excerpt}`
        : `Lampiran ${file.filename} (${file.mime}, ${formatBytes(file.size)}). Isi file belum diekstrak lokal, gunakan metadata ini sebagai konteks dan minta user menyalin isi penting bila perlu.`,
    });
  }

  return content;
}

function buildFallbackPrompt(payload, attachments) {
  const conditionalInstructions = getConditionalInstructions(payload, attachments);
  const deliverableGuard = getDeliverableGuard(payload, attachments);
  const targetGuidance = getTargetModelGuidance(payload.modelTarget);
  const intentEngine = getIntentEngineInstruction(payload, attachments);
  const attachmentText = attachments.length
    ? `

Lampiran:
${attachments
  .map(
    (file, index) =>
      `- Lampiran ${index + 1}: ${file.filename} (${file.kind}, ${formatBytes(file.size)})${
        file.excerpt ? `\n  Cuplikan: ${file.excerpt}` : ""
      }`
  )
  .join("\n")}`
    : "";

  return `Bertindaklah sebagai prompt engineer profesional untuk kategori ${payload.category}.

${intentEngine}

Ubah kebutuhan berikut menjadi prompt siap pakai untuk ${payload.modelTarget}:
"${payload.narrative || "Jelaskan kebutuhan user berdasarkan konteks yang tersedia."}"${attachmentText}

Jenis Output:
- ${payload.outputType || "Tidak dipilih"}

Gaya bahasa:
- ${payload.tone}
- Jelas, praktis, dan cocok untuk audiens Indonesia

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

Pastikan prompt tidak generik dan bisa langsung dicopy ke AI.`;
}

function buildLocalOptimizedPrompt(payload) {
  const source = payload.prompt.trim() || "Tuliskan kebutuhan user di sini.";
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
- Gunakan bahasa Indonesia dengan tone ${payload.tone}.
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
- Use ${payload.tone} Indonesian.
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

  return slides.join(" ").replace(/\s+/g, " ").trim().slice(0, 6000);
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

  return rows.join(" ").replace(/\s+/g, " ").trim().slice(0, 6000);
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
