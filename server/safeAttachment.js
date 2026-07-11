import { scrubPII } from "./prompt-engine-v2.js";

const ATTACHMENT_PII_PATTERNS = [
  { id: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { id: "phone_id", re: /\b(?:\+?62|0)8\d{8,11}\b/g },
];

export function prepareUntrustedAttachment(text, { maxChars = 12000 } = {}) {
  const input = String(text || "");
  const { sanitized: scrubbed, findings } = scrubPII(input, { mode: "redact" });
  const redacted = ATTACHMENT_PII_PATTERNS.reduce(
    (value, pattern) => value.replace(pattern.re, `[REDACTED:${pattern.id}]`),
    scrubbed
  );
  const clipped = redacted.slice(0, maxChars);
  const sanitized = clipped.replaceAll(
    "END UNTRUSTED ATTACHMENT DATA>>>",
    "END UNTRUSTED ATTACHMENT DATA\\u003e\\u003e\\u003e"
  );

  return {
    content: `<<<UNTRUSTED ATTACHMENT DATA\n${sanitized}\nEND UNTRUSTED ATTACHMENT DATA>>>`,
    findings,
    truncated: input.length > input.slice(0, maxChars).length,
  };
}
