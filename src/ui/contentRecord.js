const CONTENT_TYPES = new Set(["prompt", "output"]);

export function normalizeContentRecord(item, index = 0) {
  const source = item && typeof item === "object" ? item : {};
  const contentType = CONTENT_TYPES.has(source.contentType) ? source.contentType : "prompt";
  const legacyContent = String(source.content || "");
  const prompt = String(source.prompt || (contentType === "prompt" ? legacyContent : ""));
  const output = String(source.output || (contentType === "output" ? legacyContent : ""));

  return {
    ...source,
    id: source.id || `legacy-${index}`,
    contentType,
    request: String(source.request || ""),
    prompt,
    output,
    content: contentType === "output" ? output : prompt,
  };
}

export function createContentRecord(fields) {
  return normalizeContentRecord(fields, 0);
}

export function getRecordVisibleContent(item) {
  const record = normalizeContentRecord(item, 0);
  return record.contentType === "output" ? record.output : record.prompt;
}

export function createContentActionPayload(contentType, content) {
  return {
    contentType: contentType === "output" ? "output" : "prompt",
    content: String(content || "").trim(),
  };
}

export function getRecordRestoreState(item) {
  const record = normalizeContentRecord(item, 0);
  return {
    prompt: record.prompt,
    output: record.contentType === "output" ? record.output : "",
  };
}
