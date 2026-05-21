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
        const optimizedRaw = completion.choices?.[0]?.message?.content || "";
        const optimizedPrompt = sanitizePromptOutput(optimizedRaw) || buildLocalOptimizedPrompt(payload);
        res.json({
          source: runtime.provider,
          model: completion.model,
          prompt: optimizedPrompt,
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
      const sanitizedOptimizerPrompt = sanitizePromptOutput(response.output_text);
      res.json({
        source: "openai",
        prompt: sanitizedOptimizerPrompt || buildLocalOptimizedPrompt(payload),
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

app.post("/api/compare-prompts", express.json({ limit: "256kb" }), async (req, res) => {
  try {
    const payload = normalizeComparePayload(req.body);
    const runtime = getRuntimeProvider(payload.modelSettings);

    if (!payload.promptA.trim() || !payload.promptB.trim()) {
      res.status(400).json({ error: "Prompt A dan Prompt B wajib diisi." });
      return;
    }

    if (runtime.provider !== "openai" && runtime.client) {
      try {
        const generation = await createOpenRouterCompareCompletion(payload, runtime);
        const raw = generation.completion.choices?.[0]?.message?.content || "";
        const result = parseCompareResult(raw) || buildLocalCompareResult(payload);
        res.json({
          source: runtime.provider,
          model: generation.completion.model,
          modelStatus: generation.usedFallbackModel ? "fallback-model" : "primary-model",
          warning: generation.usedFallbackModel
            ? `Primary model sedang limit/error (${generation.primaryError}). Fallback model dipakai.`
            : "",
          result,
        });
        return;
      } catch (error) {
        console.warn("openrouter compare fallback", error.status || error.code || error.message);
        res.json({
          source: "fallback",
          model: "Local fallback",
          modelStatus: "local-fallback",
          warning: "Provider AI sedang limit/overload, memakai compare lokal.",
          result: buildLocalCompareResult(payload),
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
                  "You are PromptLab Compare Judge. Evaluate two prompts as prompts, do not execute them. Return strict JSON only.",
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
      const result = parseCompareResult(response.output_text || "") || buildLocalCompareResult(payload);
      res.json({
        source: "openai",
        model: payload.modelSettings.primaryModel || runtime.defaultModel,
        modelStatus: "primary-model",
        result,
      });
      return;
    }

    res.json({
      source: "fallback",
      model: "Local fallback",
      modelStatus: "local-fallback",
      warning: "API key provider belum aktif, memakai compare lokal.",
      result: buildLocalCompareResult(payload),
    });
  } catch (error) {
    console.error("compare-prompts failed", error.message);
    res.status(500).json({ error: "Gagal membandingkan prompt." });
  }
});

const VERCEL_FUNCTION_BUDGET_MS = Number(process.env.VERCEL_FUNCTION_BUDGET_MS || 55000);
const RETRY_ON_EMPTY_RESERVE_MS = 18000;
const PREMIUM_PASS_RESERVE_MS = 32000;

app.post("/api/generate-prompt", upload.array("attachments", 8), async (req, res) => {
  const startedAt = Date.now();
  const remainingBudget = () => Math.max(0, VERCEL_FUNCTION_BUDGET_MS - (Date.now() - startedAt));
  try {
    const payload = normalizePayload(req.body);
    const manifestAttachments = normalizeAttachmentManifest(req.body.attachmentManifest);
    const uploadedAttachments = await Promise.all((req.files || []).map((file) => normalizeFile(file, payload.modelSettings)));
    const uploadedNames = new Set(uploadedAttachments.map((file) => file.filename));
    const attachments = [
      ...uploadedAttachments,
      ...manifestAttachments.filter((file) => !uploadedNames.has(file.filename)),
    ].slice(0, 8);
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
        let generation = await createOpenRouterCompletion(payload, attachments, runtime);
        let completion = generation.completion;
        let rawPrompt = completion.choices?.[0]?.message?.content || "";
        let prompt = sanitizePromptOutput(rawPrompt);
        let retried = false;

        if (isPromptTooShort(prompt) && remainingBudget() > RETRY_ON_EMPTY_RESERVE_MS) {
          retried = true;
          try {
            generation = await createOpenRouterCompletion(payload, attachments, runtime);
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

        let qualityNote = "";
        if (payload.qualityMode === "premium" && !isPromptTooShort(prompt) && remainingBudget() > PREMIUM_PASS_RESERVE_MS) {
          const primaryModel = payload.modelSettings?.primaryModel || runtime.defaultModel;
          const fallbackModels = getOpenRouterFallbackModels(primaryModel, payload.generationMode, payload.modelSettings?.fallbackModels);
          const timing = getOpenRouterTiming(payload.generationMode);
          if (payload.modelSettings?.timeoutMs) timing.primaryTimeoutMs = payload.modelSettings.timeoutMs;
          try {
            const refined = await runCritiqueRefinePass({ runtime, payload, attachments, basePrompt: prompt, timing, primaryModel, fallbackModels });
            if (refined && !isPromptTooShort(refined) && refined !== prompt) {
              prompt = refined;
              qualityNote = "Premium Quality Mode: critique+refine pass diterapkan.";
            }
          } catch (refineError) {
            console.warn("premium critique pass failed", refineError.message);
          }
        }

        const warnings = [];
        if (generation.usedFallbackModel) warnings.push(`Primary model sedang limit/error (${generation.primaryError}). Fallback model dipakai.`);
        if (retried) warnings.push("Output awal terlalu pendek, di-regenerate ulang.");
        if (qualityNote) warnings.push(qualityNote);

        res.json({
          source: runtime.provider,
          model: completion.model,
          modelStatus: generation.usedFallbackModel ? "fallback-model" : "primary-model",
          warning: warnings.join(" "),
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

    const systemPrompt =
      "You are PromptLab Intent Engine, a senior prompt architect. Do not merely restate the raw user request. Decompose intent, expand the domain, infer missing professional implementation details carefully, lock the deliverable type, then create one excellent ready-to-use prompt in Indonesian. Preserve the user's requested deliverable exactly. If the user asks for PPT, create a prompt for PPT. If the user asks for a Word report, create a prompt for a Word-style report. Return only the final prompt, no chatty preface.";

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
        openaiWarnings.push("Output awal terlalu pendek, di-regenerate ulang.");
      } catch (retryError) {
        console.warn("openai retry-on-empty failed", retryError.message);
      }
    }
    if (isPromptTooShort(openaiPrompt)) {
      openaiPrompt = buildFallbackPrompt(payload, attachments);
    }

    if (payload.qualityMode === "premium" && !isPromptTooShort(openaiPrompt) && remainingBudget() > PREMIUM_PASS_RESERVE_MS) {
      try {
        const critiqueRes = await runtime.client.responses.create({
          model: payload.modelSettings.primaryModel || runtime.defaultModel,
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: "You are PromptLab Quality Critic. Audit a prompt as a senior prompt engineer. Output strict bullet points in Indonesian listing 3-6 concrete defects. No preface, no praise, no rewrites." }],
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
                content: [{ type: "input_text", text: "You are PromptLab Refiner. Rewrite a prompt to fix all listed defects. Output only the final improved prompt in Indonesian, ready to copy. No preface, no critique, no brief, no commentary." }],
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
            openaiWarnings.push("Premium Quality Mode: critique+refine pass diterapkan.");
          }
        }
      } catch (refineError) {
        console.warn("openai premium critique pass failed", refineError.message);
      }
    }

    res.json({
      source: "openai",
      prompt: openaiPrompt,
      warning: openaiWarnings.join(" "),
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
export {
  buildPromptSpecInstruction,
  getDomainPromptPack,
  scorePromptText,
};

function normalizePayload(body) {
  return {
    category: String(body.category || "Marketing").slice(0, 80),
    generationMode: normalizeGenerationMode(body.generationMode),
    modelSettings: normalizeModelSettings(body),
    modelTarget: String(body.model || "ChatGPT").slice(0, 80),
    narrative: String(body.narrative || "").slice(0, 6000),
    outputType: String(body.outputType || "").slice(0, 80),
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

async function runCritiqueRefinePass({ runtime, payload, attachments, basePrompt, timing, primaryModel, fallbackModels }) {
  const critiqueMessages = [
    {
      role: "system",
      content:
        "You are PromptLab Quality Critic. Audit a prompt as a senior prompt engineer. Output strict bullet points in Indonesian listing concrete defects (max 6). No preface, no praise, no rewrites.",
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
      {
        model: primaryModel,
        messages: critiqueMessages,
        max_tokens: 600,
        temperature: 0.2,
      },
      { timeout: timing.primaryTimeoutMs }
    ), timing.primaryTimeoutMs, primaryModel);
    critique = critiqueRes.choices?.[0]?.message?.content || "";
  } catch (error) {
    if (shouldTryFallbackModel(error) && fallbackModels.length > 0) {
      try {
        const fb = await tryOpenRouterFallbackModels(runtime.client, fallbackModels, critiqueMessages, timing.fallbackTimeoutMs, 600, 0.2);
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
      content:
        "You are PromptLab Refiner. Rewrite a prompt to fix all listed defects. Output only the final improved prompt in Indonesian, ready to copy. No preface, no critique, no brief, no commentary.",
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
      {
        model: primaryModel,
        messages: refineMessages,
        max_tokens: 2400,
        temperature: 0.4,
      },
      { timeout: timing.primaryTimeoutMs }
    ), timing.primaryTimeoutMs, primaryModel);
    const refined = refineRes.choices?.[0]?.message?.content || "";
    const sanitized = sanitizePromptOutput(refined);
    return sanitized && !isPromptTooShort(sanitized) ? sanitized : basePrompt;
  } catch (error) {
    if (shouldTryFallbackModel(error) && fallbackModels.length > 0) {
      try {
        const fb = await tryOpenRouterFallbackModels(runtime.client, fallbackModels, refineMessages, timing.fallbackTimeoutMs, 2400, 0.4);
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

function normalizeComparePayload(body) {
  return {
    generationMode: normalizeGenerationMode(body.generationMode),
    modelSettings: normalizeModelSettings(body),
    promptA: String(body.promptA || "").slice(0, 12000),
    promptB: String(body.promptB || "").slice(0, 12000),
    targetModel: String(body.targetModel || "General").slice(0, 80),
    useCase: String(body.useCase || "").slice(0, 1200),
  };
}

function normalizeAttachmentManifest(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 8).map((item) => ({
      dataUrl: "",
      excerpt: String(item.excerpt || "").replace(/\s+/g, " ").trim().slice(0, 4000),
      filename: String(item.filename || item.name || "attachment").slice(0, 180),
      kind: String(item.kind || "file").slice(0, 60),
      mime: String(item.mime || item.type || "application/octet-stream").slice(0, 120),
      size: Number(item.size || 0),
    }));
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
        temperature: 0.4,
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
        temperature: 0.4,
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

async function createOpenRouterCompareCompletion(payload, runtime = getRuntimeProvider(payload.modelSettings)) {
  const messages = [
    {
      role: "system",
      content:
        "You are PromptLab Compare Judge. Evaluate two prompts as prompts, do not execute them. Return strict JSON only.",
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
      {
        model: primaryModel,
        messages,
        max_tokens: 1800,
        temperature: 0.2,
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
      1800,
      0.2
    );
    return {
      completion,
      primaryError: [primaryError, ...errors].filter(Boolean).join(" | "),
      usedFallbackModel: true,
    };
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

async function tryOpenRouterFallbackModels(client, models, messages, timeoutMs, maxTokens = 2200, temperature = 0.4) {
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
          temperature,
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
  return `Optimalkan prompt berikut.

Mode optimasi:
- ${payload.mode}

Target AI:
- ${payload.targetModel}

Tone:
- ${payload.tone}

${optimizerEngine}

${specInstruction}

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

function buildPromptSpecInstruction(payload, attachments = []) {
  const pack = getDomainPromptPack(payload);
  const attachmentManifest = buildAttachmentManifest(attachments);
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
- The final prompt must preserve the selected deliverable: ${payload.outputType || "not selected"}.`;
}

function getDomainPromptPack(payload = {}) {
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
  const targetGuidance = getTargetModelGuidance(payload.targetModel);
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
  const scoreA = scorePromptText(payload.promptA);
  const scoreB = scorePromptText(payload.promptB);
  const winner = scoreA.overall > scoreB.overall ? "A" : scoreB.overall > scoreA.overall ? "B" : "tie";
  const missingA = getPromptRiskList(payload.promptA);
  const missingB = getPromptRiskList(payload.promptB);
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
  const text = String(prompt || "");
  const countMatches = (patterns) => patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  const sectionCount = (text.match(/(?:^|\n)\s*(?:#{1,3}\s*)?(?:role|context|konteks|objective|tujuan|task|tugas|requirements|output|format|constraints|batasan|acceptance|criteria|quality|checklist)\b/gi) || []).length;
  const numericControls = (text.match(/\b\d+\b|maks(?:imal)?|min(?:imal)?|at least|no more than|jumlah|kata|slide|section|bagian/gi) || []).length;
  const genericPenalty = countMatches([
    /\b(leverage|synergy|world-class|cutting-edge|next-level|game-changing|seamless|robust solution)\b/i,
    /\b(kelas dunia|terdepan|revolusioner|solusi terbaik)\b/i,
    /\[(?:your|insert|topik|isi|brand|context)[^\]]*\]/i,
  ]);

  const clarity = rubricScore([
    /role|act as|bertindak/i,
    /objective|goal|tujuan|hasil akhir/i,
    /task|tugas|kerjakan|buat|susun|build|write/i,
    /senior|strategist|engineer|analyst|copywriter|researcher|spesialis/i,
    sectionCount >= 4,
  ], text);
  const context = rubricScore([
    /context|konteks|latar belakang|berdasarkan|source|sumber/i,
    /audience|target|persona|pengguna|pembaca|customer/i,
    /lampiran|dokumen|data|file|screenshot|referensi/i,
    /assumption|asumsi|jika tidak tersedia/i,
    text.length >= 700,
  ], text);
  const format = rubricScore([
    /format|output|struktur|section|bagian|table|tabel|json|markdown/i,
    /urut|ordered|sequence|slide-by-slide|file-by-file/i,
    numericControls >= 2,
    /acceptance|criteria|checklist|quality gate|kriteria/i,
    sectionCount >= 5,
  ], text);
  const constraints = rubricScore([
    /constraint|batasan|jangan|must|wajib|harus|avoid|larang/i,
    /maks(?:imal)?|min(?:imal)?|at most|at least|no more than/i,
    /do not invent|jangan mengarang|state assumptions|tandai asumsi/i,
    /clarifying questions|pertanyaan klarifikasi|only if blocked/i,
    numericControls >= 3,
  ], text);
  const hallucinationResistance = rubricScore([
    /jangan mengarang|do not invent|verify|source|citation|evidence|fakta/i,
    /asumsi|assumption|unknown|tidak tersedia/i,
    /clarifying questions|pertanyaan klarifikasi/i,
    /acceptance|quality gate|validasi/i,
    /lampiran|source|sumber|data/i,
  ], text);
  const actionability = rubricScore([
    /acceptance|criteria|kriteria|test|uji|run|export|deliver/i,
    /step|langkah|checklist|implementation|implementasi/i,
    /file|screen|api|table|slide|section|CTA|output/i,
    numericControls >= 2,
    text.length >= 900,
  ], text);

  const rawOverall = Math.round((clarity + context + format + constraints + hallucinationResistance + actionability) / 6);
  const penalty = genericPenalty * 6;
  const overall = Math.max(5, Math.min(99, rawOverall - penalty));
  const risk = Math.max(5, Math.min(95, 100 - overall + genericPenalty * 4));
  const details = [
    clarity < 70 ? "Role/objective masih kurang spesifik." : "Role dan tujuan cukup jelas.",
    context < 70 ? "Konteks, audiens, atau asumsi perlu diperkuat." : "Konteks cukup terkunci.",
    format < 70 ? "Format output belum cukup terkendali." : "Format output cukup terkendali.",
    constraints < 70 ? "Constraints masih lemah atau kurang terukur." : "Constraints cukup konkret.",
    hallucinationResistance < 70 ? "Perlu guardrail anti-hallucination yang lebih eksplisit." : "Guardrail fakta/asumsi cukup baik.",
    actionability < 70 ? "Acceptance criteria atau langkah eksekusi perlu ditambah." : "Prompt cukup actionable.",
  ];

  return {
    actionability,
    clarity,
    constraints,
    context,
    details,
    format,
    hallucinationResistance,
    overall,
    risk,
  };
}

function rubricScore(checks, text) {
  const passed = checks.filter((check) => (check instanceof RegExp ? check.test(text) : Boolean(check))).length;
  return Math.round((passed / checks.length) * 100);
}

function getPromptRiskList(prompt) {
  const text = String(prompt || "");
  const risks = [];
  if (!/role|act as|bertindak/i.test(text)) risks.push("Role is not explicit.");
  if (!/format|output|struktur|json|markdown/i.test(text)) risks.push("Output format is not locked.");
  if (!/constraint|batasan|jangan|must|wajib/i.test(text)) risks.push("Constraints are weak.");
  if (!/acceptance|criteria|checklist|kriteria/i.test(text)) risks.push("Success criteria are missing.");
  return risks.length ? risks : ["No major local risks detected."];
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
Output yang dikembalikan harus langsung berupa Final Executable Prompt yang siap dicopy user, berisi role, context, task, requirements, constraints, output format, implementation/delivery checklist, acceptance criteria, dan clarifying questions hanya jika benar-benar menghalangi pekerjaan.`;
}

function buildAttachmentManifest(attachments = []) {
  if (!attachments.length) return "";
  return attachments
    .slice(0, 8)
    .map((file, index) => {
      const source = file.excerpt
        ? `extracted context: ${file.excerpt.slice(0, 2000)}`
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
${targetGuidance}${conditionalInstructions}${antiGeneric}`,
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
  const promptSpec = buildPromptSpecInstruction(payload, attachments);
  const antiGeneric = getAntiGenericGuard();
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
${targetGuidance}${conditionalInstructions}${antiGeneric}`;

  const hasImage = attachments.some((file) => file.mime.startsWith("image/") && file.dataUrl);
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
  const pack = getDomainPromptPack(payload);
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
