/**
 * User-facing API / Builder messages (English, global Play Store).
 */

export const UNSUPPORTED_FILE_TYPE = "Unsupported file type.";

export const API_MSG = {
  unsupportedFileType: UNSUPPORTED_FILE_TYPE,
  fileTooLarge: "File is too large. Maximum 8 MB per file.",
  invalidRequest: "Invalid request.",
  generateFailed: "Could not generate the prompt. Please try again.",
  optimizeFailed: "Could not optimize the prompt. Please try again.",
  compareFailed: "Could not compare prompts. Please try again.",
  docxFailed: "Could not create the DOCX file.",
  pptxFailed: "Could not create the PPTX file.",
  xlsxFailed: "Could not create the Excel file.",
  apiKeyInactive: "API key is not active. Set Vercel environment variables or an API key override.",
  apiKeyInactiveCompare: "AI compare is not configured. Using readiness scores instead.",
  apiKeyInactiveGenerate: "AI generation is not configured. Showing a quick preview.",
  apiKeyInactiveOpenAI: "OpenAI is not configured. Showing a quick preview.",
  providerOverloadOptimizer: "AI is busy. Showing a quick optimization preview — try again shortly.",
  providerOverloadCompare: "AI is busy. Using readiness scores instead.",
  providerOverloadGenerate: "AI is busy. Showing a quick preview — try again shortly.",
  primaryFallback: (detail) =>
    `Primary model is limited or returned an error (${detail}). Retrying with a fallback model.`,
  outputTruncated:
    "Output may be truncated (model length limit). Try Premium Quality Mode, upgrade to Pro/Business, or use a shorter narrative per section.",
  outputRetriedShort: "Initial output was too short; regenerated.",
  premiumQualityApplied: "Premium Quality Mode: critique and refine pass applied.",
  backendUnavailableLocalPrompt: "Could not reach the AI service. Showing a quick preview — try Generate again.",
  providerRateLimitedGenerate: "AI rate limit reached. Wait a moment, then try Generate again.",
  providerTimeoutGenerate:
    "AI took too long to respond (this is not your quota). Showing a quick preview — try Generate again.",
};
