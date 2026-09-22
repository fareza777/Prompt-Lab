/**
 * Heavyweight document understanding lives in the optional Python sidecar
 * (server/sidecar — Docling + MarkItDown + PaddleOCR). These endpoints just
 * forward the uploaded file; without SIDECAR_URL they answer 503 so the
 * client can fall back to its lighter in-app tools.
 */

const SIDECAR_URL = (process.env.SIDECAR_URL || "").replace(/\/+$/, "");
const SIDECAR_TIMEOUT_MS = Number(process.env.SIDECAR_TIMEOUT_MS || 120_000);

export function sidecarConfigured() {
  return Boolean(SIDECAR_URL);
}

async function forwardFile(path, file) {
  const form = new FormData();
  form.append("file", new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" }), file.originalname || "file");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SIDECAR_TIMEOUT_MS);
  try {
    const response = await fetch(`${SIDECAR_URL}${path}`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof body?.detail === "string" ? body.detail : "sidecar request failed";
      throw new Error(detail);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /parse or /ocr on the sidecar. Throws an Error tagged with `.status`
 * so the route can map it: 503 unconfigured/unreachable, 422 parse failure.
 */
export async function callSidecar(path, file) {
  if (!SIDECAR_URL) {
    const error = new Error("Document service is not configured on this server.");
    error.status = 503;
    throw error;
  }
  try {
    return await forwardFile(path, file);
  } catch (error) {
    if (error.name === "AbortError" || /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error.message)) {
      const wrapped = new Error("Document service is unreachable.");
      wrapped.status = 503;
      throw wrapped;
    }
    if (!error.status) error.status = 422;
    throw error;
  }
}
