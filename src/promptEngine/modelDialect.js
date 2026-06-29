/**
 * Model dialect metadata for UI badges and preview labels.
 */

const DIALECTS = [
  {
    id: "claude",
    test: /claude/i,
    label: "Claude XML",
    short: "XML tags",
    hint: "Structured with role/task XML blocks for Anthropic models.",
  },
  {
    id: "gpt",
    test: /gpt|chatgpt|openai|o1|o3|o4/i,
    label: "GPT Markdown",
    short: "Markdown headers",
    hint: "Section headers and numbered steps for OpenAI models.",
  },
  {
    id: "gemini",
    test: /gemini/i,
    label: "Gemini Detailed",
    short: "Explicit format",
    hint: "Detailed section order with explicit format notes.",
  },
  {
    id: "deepseek",
    test: /deepseek|qwen/i,
    label: "Strict structure",
    short: "Meta prefix",
    hint: "Strict section adherence with meta instruction prefix.",
  },
  {
    id: "grok",
    test: /grok/i,
    label: "Grok direct",
    short: "Direct",
    hint: "Direct instruction style for Grok.",
  },
];

export function getModelDialectMeta(targetModel = "") {
  const target = String(targetModel || "");
  const match = DIALECTS.find((d) => d.test.test(target));
  if (match) return { ...match, targetModel: target };
  return {
    id: "general",
    label: "General",
    short: "Neutral",
    hint: "Balanced structure for any model.",
    targetModel: target,
  };
}

export function describeModelDialect(targetModel = "") {
  const meta = getModelDialectMeta(targetModel);
  return meta.hint || meta.label;
}
