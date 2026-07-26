/**
 * Canonical option values.
 *
 * These strings are part of the contract with the prompt engine and the stored
 * library — they stay in English regardless of UI language. Only their labels
 * are translated (see the "opt.*" keys in i18n.js).
 */

export const CATEGORIES = [
  "Marketing",
  "Content Creator",
  "Business",
  "Coding",
  "Academic",
  "Image AI",
  "Video AI",
];

export const TONES = ["Professional", "Casual", "Persuasive", "Creative"];

export const MODELS = ["ChatGPT", "Claude", "Gemini", "Grok", "Others"];

export const OUTPUT_TYPES = [
  "Application Code",
  "Word Document",
  "PPT",
  "Technical Design",
  "Analysis",
  "Content",
  "Diagram",
  "Image Prompt",
  "Video Prompt",
];

export const OPTIMIZER_MODES = [
  "Clearer",
  "Shorter",
  "More Detailed",
  "Academic",
  "Marketing",
  "Coding",
];
