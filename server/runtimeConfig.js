/** Global model settings stored in Supabase (effective on Vercel for all users). */

const CONFIG_ID = "global";
const CACHE_TTL_MS = 12_000;

let cache = { settings: null, meta: null, expiresAt: 0 };

export function clearRuntimeConfigCache() {
  cache = { settings: null, meta: null, expiresAt: 0 };
}

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
    baseUrl: process.env.MINIMAX_BASE_URL || "https://api.minimaxi.chat/v1",
    fallbackModels: fallbackModels.length
      ? fallbackModels
      : ["MiniMax-M2.5-highspeed", "MiniMax-M2.7-highspeed"],
    ocrModel: process.env.OPENROUTER_OCR_MODEL || "baidu/qianfan-ocr-fast:free",
    primaryModel: process.env.MINIMAX_MODEL || "MiniMax-M3",
    provider: "minimax",
    timeoutMs: String(process.env.MINIMAX_PRIMARY_TIMEOUT_MS || "55000"),
  };

  const openRouterDefaults = {
    apiKey: "",
    baseUrl: process.env.OPENROUTER_BASE_URL || process.env.CUSTOM_LLM_BASE_URL || "",
    fallbackModels,
    ocrModel: process.env.OPENROUTER_OCR_MODEL || "baidu/qianfan-ocr-fast:free",
    primaryModel: process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash",
    provider: "openrouter",
    timeoutMs: String(process.env.OPENROUTER_PRIMARY_TIMEOUT_MS || ""),
  };

  if (provider === "minimax") return minimaxDefaults;
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

/** Published OpenRouter routing (e.g. mimo) must not override Vercel MiniMax when env is configured. */
function publishedConflictsWithEnvMinimax(published) {
  if (!published) return false;
  if (String(published.provider || "").toLowerCase() === "minimax") return false;
  return envPrefersMinimax();
}

/** Merge env → published (DB) → optional admin request overrides. API keys never come from DB. */
export function mergeModelSettingsLayers({ published, request, allowRequestOverride = false }) {
  const merged = { ...getEnvDefaultModelSettings() };
  if (published && !publishedConflictsWithEnvMinimax(published)) {
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

export async function fetchPublishedModelSettings(adminClient) {
  if (!adminClient) return { settings: null, meta: null };
  const { data, error } = await adminClient
    .from("app_runtime_config")
    .select("model_settings, updated_at, updated_by")
    .eq("id", CONFIG_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { settings: null, meta: null };
  const settings = data.model_settings || {};
  return {
    settings: {
      provider: settings.provider || "",
      baseUrl: settings.baseUrl || "",
      primaryModel: settings.primaryModel || "",
      ocrModel: settings.ocrModel || "",
      fallbackModels: Array.isArray(settings.fallbackModels) ? settings.fallbackModels : [],
      timeoutMs: settings.timeoutMs || "",
      apiKey: "",
    },
    meta: {
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    },
  };
}

export async function getCachedPublishedModelSettings(adminClient) {
  const now = Date.now();
  if (cache.expiresAt > now) {
    return { settings: cache.settings, meta: cache.meta };
  }
  const loaded = await fetchPublishedModelSettings(adminClient);
  cache = {
    settings: loaded.settings,
    meta: loaded.meta,
    expiresAt: now + CACHE_TTL_MS,
  };
  return loaded;
}

export async function savePublishedModelSettings(adminClient, normalized, userId) {
  if (!adminClient) throw new Error("Supabase service role is not configured.");
  const payload = {
    id: CONFIG_ID,
    model_settings: toStoredModelSettings(normalized),
    updated_at: new Date().toISOString(),
    updated_by: userId || null,
  };
  const { data, error } = await adminClient
    .from("app_runtime_config")
    .upsert(payload, { onConflict: "id" })
    .select("model_settings, updated_at, updated_by")
    .single();
  if (error) throw error;
  clearRuntimeConfigCache();
  return {
    settings: payload.model_settings,
    meta: { updatedAt: data.updated_at, updatedBy: data.updated_by },
  };
}
