/**
 * URL → clean document import, backed by POST /api/fetch-url (Defuddle on the
 * server). Works in the browser and inside the Capacitor build — same-origin
 * in both because the app loads https://prompt-lab.xyz.
 */

function fileNameFor(title) {
  const slug = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "imported-page"}.md`;
}

/** Fetches a page, strips it to readable text, and wraps it as a File attachment. */
export async function importUrlToFile(apiBase, url) {
  const response = await fetch(`${apiBase}/api/fetch-url`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  const markdown = String(data.markdown || "").trim();
  if (!markdown) throw new Error("No readable content found on that page.");
  return new File([markdown], fileNameFor(data.title), { type: "text/markdown" });
}
