/**
 * Provider and generation-mode configuration shared by the app shell and the
 * admin console. It lives here so the lazily loaded admin bundle does not have
 * to import from main.jsx, which would create an import cycle.
 */

export const generationModes = ["Fast", "Balanced", "Patient Free"];

export const providerOptions = ["minimax", "openrouter", "openai", "custom"];

export const defaultModelSettings = {
  apiKey: "",
  baseUrl: "",
  fallbackModels: "MiniMax-M2.5-highspeed\nMiniMax-M2.7-highspeed",
  ocrModel: "baidu/qianfan-ocr-fast:free",
  primaryModel: "MiniMax-M3",
  provider: "minimax",
  timeoutMs: "55000",
};

export const modeProfiles = {
  Fast: {
    label: "Fast draft",
    detail: "Try the primary model, then use a short fallback if needed.",
    bestFor: "Short content, early ideas, lightweight prompt revisions.",
  },
  Balanced: {
    label: "Daily stable",
    detail: "Moderate timeout with a patient fallback path.",
    bestFor: "Documents, slides, app prompts, and normal daily work.",
  },
  "Patient Free": {
    label: "Chase the result",
    detail: "Gives free models more time before routing through the fallback chain.",
    bestFor: "Large files, OCR, complex prompts, or slow free models.",
  },
};
