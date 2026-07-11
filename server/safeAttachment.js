import { scrubPII } from "./prompt-engine-v2.js";

export function prepareUntrustedAttachment(text, { maxChars = 12000 } = {}) {
  const input = String(text || "");
  const clipped = input.slice(0, maxChars);
  const { sanitized, findings } = scrubPII(clipped, { mode: "redact" });

  return {
    content: `<<<UNTRUSTED ATTACHMENT DATA\n${sanitized}\nEND UNTRUSTED ATTACHMENT DATA>>>`,
    findings,
    truncated: input.length > clipped.length,
  };
}
