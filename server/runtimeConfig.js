/** Model routing settings, resolved from the Worker environment (no database). */

export function getEnvDefaultModelSettings() {
  const provider = String(process.env.AI_PROVIDER || "minimax").toLowerCase();
  const fallbackRaw =
    process.env.OPENROUTER_FALLBACK_MODELS || process.env.OPENROUTER_FALLBACK_MODEL || "";
  const fallbackModels = String(fallbackRaw)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

  const minimaxDefaults = {
    apiKey: "",
    baseUrl: process.env.MINIMAX_BASE_URL || "",
    fallbackModels: fallbackModels.length
      ? fallbackModels
      : ["MiniMax-M2.5-highspeed", "MiniMax-M2.7-highspeed"],
    ocrModel: process.env.OPENROUTER_OCR_MODEL || "baidu/qianfan-ocr-fast:free",
    primaryModel: process.env.MINIMAX_MODEL || "MiniMax-M3",
    provider: "minimax",
    timeoutMs: String(process.env.MINIMAX_PRIMARY_TIMEOUT_MS || "55000"),
  };

  // Custom OpenAI-compatible (e.g. local LiteLLM free-best); failover stays in the proxy.
  const customDefaults = {
    apiKey: "",
    baseUrl: process.env.CUSTOM_LLM_BASE_URL || "http://127.0.0.1:4000/v1",
    fallbackModels: [],
    ocrModel: process.env.OPENROUTER_OCR_MODEL || "baidu/qianfan-ocr-fast:free",
    primaryModel: process.env.CUSTOM_LLM_MODEL || "free-best",
    provider: "custom",
    timeoutMs: String(process.env.CUSTOM_LLM_PRIMARY_TIMEOUT_MS || process.env.OPENROUTER_PRIMARY_TIMEOUT_MS || "120000"),
  };

  const openRouterDefaults = {
    apiKey: "",
    baseUrl: process.env.OPENROUTER_BASE_URL || "",
    fallbackModels,
    ocrModel: process.env.OPENROUTER_OCR_MODEL || "baidu/qianfan-ocr-fast:free",
    primaryModel: process.env.OPENROUTER_MODEL || "qwen/qwen3.7-flash",
    provider: "openrouter",
    timeoutMs: String(process.env.OPENROUTER_PRIMARY_TIMEOUT_MS || ""),
  };

  if (provider === "minimax") return minimaxDefaults;
  if (provider === "custom") return customDefaults;
  if (provider === "openai") {
    return {
      ...openRouterDefaults,
      provider: "openai",
      primaryModel: process.env.OPENAI_MODEL || "gpt-5-mini",
      baseUrl: "",
    };
  }
  return openRouterDefaults;
}

function pickNonEmpty(target, source, keys) {
  keys.forEach((key) => {
    const value = source[key];
    if (value === undefined || value === null) return;
    if (typeof value === "string" && !value.trim()) return;
    if (Array.isArray(value) && value.length === 0) return;
    target[key] = value;
  });
}

function envPrefersMinimax() {
  return (
    String(process.env.AI_PROVIDER || "").toLowerCase() === "minimax" &&
    Boolean(String(process.env.MINIMAX_API_KEY || "").trim())
  );
}

function envPrefersCustomLiteLlm() {
  return (
    String(process.env.AI_PROVIDER || "").toLowerCase() === "custom" &&
    Boolean(String(process.env.CUSTOM_LLM_API_KEY || "").trim()) &&
    Boolean(String(process.env.CUSTOM_LLM_BASE_URL || "").trim())
  );
}

function envPrefersOpenRouter() {
  return (
    String(process.env.AI_PROVIDER || "").toLowerCase() === "openrouter" &&
    Boolean(String(process.env.OPENROUTER_API_KEY || "").trim()) &&
    Boolean(String(process.env.OPENROUTER_MODEL || "").trim())
  );
}

/** Published OpenRouter routing (e.g. mimo) must not override Vercel MiniMax when env is configured. */
function publishedConflictsWithEnvMinimax(published) {
  if (!published) return false;
  if (String(published.provider || "").toLowerCase() === "minimax") return false;
  return envPrefersMinimax();
}

function publishedConflictsWithEnvCustom(published) {
  if (!published) return false;
  if (String(published.provider || "").toLowerCase() === "custom") return false;
  return envPrefersCustomLiteLlm();
}

function publishedConflictsWithEnvOpenRouter(published) {
  if (!published) return false;
  // Keep env primary/fallback when Vercel explicitly pins OpenRouter + model.
  return envPrefersOpenRouter();
}

/** Merge env → published (DB) → optional admin request overrides. API keys never come from DB. */
export function mergeModelSettingsLayers({ published, request, allowRequestOverride = false }) {
  const merged = { ...getEnvDefaultModelSettings() };
  const keepEnvRouting =
    publishedConflictsWithEnvMinimax(published) ||
    publishedConflictsWithEnvCustom(published) ||
    publishedConflictsWithEnvOpenRouter(published);
  if (published && !keepEnvRouting) {
    pickNonEmpty(merged, published, [
      "provider",
      "baseUrl",
      "primaryModel",
      "ocrModel",
      "fallbackModels",
      "timeoutMs",
    ]);
  } else if (published) {
    pickNonEmpty(merged, published, ["ocrModel"]);
  }
  if (allowRequestOverride && request) {
    pickNonEmpty(merged, request, [
      "provider",
      "baseUrl",
      "primaryModel",
      "ocrModel",
      "fallbackModels",
      "timeoutMs",
      "apiKey",
    ]);
  }
  return merged;
}

export function toStoredModelSettings(normalized) {
  return {
    provider: normalized.provider,
    baseUrl: normalized.baseUrl,
    primaryModel: normalized.primaryModel,
    ocrModel: normalized.ocrModel,
    fallbackModels: normalized.fallbackModels,
    timeoutMs: normalized.timeoutMs,
  };
}

export function toPublicRuntimeConfig(normalized, meta = {}) {
  return {
    provider: normalized.provider,
    baseUrl: normalized.baseUrl,
    primaryModel: normalized.primaryModel,
    ocrModel: normalized.ocrModel,
    fallbackModels: normalized.fallbackModels,
    timeoutMs: normalized.timeoutMs,
    updatedAt: meta.updatedAt || null,
    updatedBy: meta.updatedBy || null,
  };
}
