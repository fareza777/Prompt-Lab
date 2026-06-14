/** MiniMax OpenAI-compatible helpers (M3 thinking control, base URL). */

export function isMinimaxThinkingModel(modelName = "") {
  return /^MiniMax-M3$/i.test(String(modelName || "").trim());
}

export function resolveMinimaxBaseUrl(rawBaseUrl, apiKey = "") {
  const explicit = String(rawBaseUrl || "").trim();
  if (explicit) {
    try {
      const url = new URL(explicit);
      if (["https:", "http:"].includes(url.protocol)) {
        return url.toString().replace(/\/$/, "");
      }
    } catch {
      /* fall through */
    }
  }
  const key = String(apiKey || "").trim();
  if (key.startsWith("sk-cp-")) return "https://api.minimaxi.chat/v1";
  return "https://api.minimax.io/v1";
}

/**
 * MiniMax-M3 runs extended thinking by default, which routinely exceeds serverless timeouts
 * for prompt-generation tasks. Disable thinking so the model answers directly.
 */
export function buildProviderChatCompletionBody(runtime, { model, messages, max_tokens, temperature = 0.4 }) {
  const body = { model, messages, max_tokens, temperature };
  if (runtime?.provider === "minimax" && isMinimaxThinkingModel(model)) {
    body.extra_body = { thinking: { type: "disabled" } };
  }
  return body;
}
