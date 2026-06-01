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
  apiKeyInactive: "API key is not active. Set Vercel environment variables or an API key override.",
  apiKeyInactiveCompare: "API key is not active. Using local compare.",
  apiKeyInactiveGenerate: "API key is not active. Using local generator.",
  apiKeyInactiveOpenAI: "OpenAI API key is not active. Using local generator.",
  providerOverloadOptimizer: "AI provider is rate-limited or overloaded. Using local optimizer.",
  providerOverloadCompare: "AI provider is rate-limited or overloaded. Using local compare.",
  providerOverloadGenerate: "AI provider is rate-limited or overloaded. Using local generator.",
  primaryFallback: (detail) =>
    `Primary model is limited or returned an error (${detail}). Using fallback model.`,
  outputTruncated:
    "Output may be truncated (model length limit). Try Premium Quality Mode, upgrade to Pro/Business, or use a shorter narrative per section.",
  outputRetriedShort: "Initial output was too short; regenerated.",
  premiumQualityApplied: "Premium Quality Mode: critique and refine pass applied.",
  backendUnavailableLocalPrompt: "Backend unavailable. Using local prompt draft.",
};
