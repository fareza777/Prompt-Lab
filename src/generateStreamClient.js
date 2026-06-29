/**
 * Client-side SSE consumer for /api/generate-prompt?stream=true
 */

export async function consumeGenerateSse(response, { onPhase, onChunk } = {}) {
  if (!response?.body) {
    throw new Error("Streaming not supported in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const packets = buffer.split("\n\n");
    buffer = packets.pop() || "";

    for (const packet of packets) {
      if (!packet.trim()) continue;
      const lines = packet.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      const parsed = JSON.parse(data);
      if (event === "phase") onPhase?.(parsed);
      if (event === "chunk") onChunk?.(parsed);
      if (event === "error") throw new Error(parsed.message || "Generation stream failed.");
      if (event === "done") result = parsed;
    }
  }

  if (!result) throw new Error("Generation stream ended without a result.");
  return result;
}
