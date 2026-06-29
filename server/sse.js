/**
 * SSE streaming for /api/generate-prompt (OpenRouter-compatible providers).
 */

export function initSse(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") res.flushHeaders();
}

export function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * @param {import('express').Response} res
 * @param {string} event
 * @param {object} data
 */
export function sendSsePhase(res, step, label) {
  sendSse(res, "phase", { step, label });
}

export async function consumeOpenRouterStream(stream, onChunk) {
  let full = "";
  let model = "";
  for await (const part of stream) {
    if (part.model) model = part.model;
    const delta = part.choices?.[0]?.delta?.content || "";
    if (delta) {
      full += delta;
      onChunk?.(delta);
    }
  }
  return { content: full, model };
}
