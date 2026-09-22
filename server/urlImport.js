/**
 * URL → clean-document import for POST /api/fetch-url.
 *
 * Fetches a public web page and hands the HTML to Defuddle, which strips the
 * boilerplate (nav, ads, footers) and returns the readable article as markdown.
 */

import { Defuddle } from "defuddle/node";
import dns from "node:dns/promises";

const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = "AIWorkStudio/1.0 (+https://prompt-lab.xyz)";

const PRIVATE_IPV4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
];

function isPrivateIp(ip) {
  const lower = String(ip || "").toLowerCase();
  // IPv4-mapped IPv6 ("::ffff:10.0.0.1" or hex "::ffff:a00:1") must not
  // bypass the IPv4 private ranges.
  if (lower.startsWith("::ffff:")) {
    const tail = lower.slice(7);
    if (tail.includes(".")) return isPrivateIp(tail);
    const value = parseInt(tail, 16);
    if (Number.isFinite(value)) {
      const octets = [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
      return isPrivateIp(octets);
    }
    return true;
  }
  if (PRIVATE_IPV4.some((re) => re.test(lower))) return true;
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fe8") || // fe80–febf link-local
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb") ||
    /^fe[c-f]/.test(lower) || // fec0–feff site-local
    lower.startsWith("fc") ||
    lower.startsWith("fd")
  );
}

/** SSRF guard: resolve the host and reject private/loopback/link-local addresses. */
async function assertPublicHost(hostname, lookup = dns.lookup) {
  const host = String(hostname || "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("That address is not allowed.");
  }
  if (isPrivateIp(host)) throw new Error("That address is not allowed.");
  let records;
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new Error("That address could not be resolved.");
  }
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error("That address is not allowed.");
  }
}

function assertHttpUrl(url) {
  let parsed;
  try {
    parsed = new URL(String(url || ""));
  } catch {
    throw new Error("Enter a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https links can be imported.");
  }
  return parsed;
}

/** Fetches a URL following redirects hop-by-hop so every target is re-validated. */
async function fetchHtml(
  startUrl,
  { fetchImpl = globalThis.fetch, lookup = dns.lookup } = {}
) {
  let current = startUrl.toString();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const parsed = assertHttpUrl(current);
    await assertPublicHost(parsed.hostname, lookup);
    const response = await fetchImpl(parsed.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`Request failed (${response.status})`);
      current = new URL(location, parsed).toString();
      continue;
    }
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("html") && !contentType.includes("text/")) {
      throw new Error("That link is not a readable web page.");
    }
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    return { html, finalUrl: parsed.toString() };
  }
  throw new Error("Too many redirects.");
}

/** Fetches a public URL and returns { title, markdown } for its readable content. */
export async function fetchCleanArticle(rawUrl, options = {}) {
  const parsed = assertHttpUrl(rawUrl);
  const { html, finalUrl } = await fetchHtml(parsed, options);
  const defuddle = options.defuddleImpl || Defuddle;
  const result = await defuddle(html, finalUrl, { markdown: true });
  const markdown = String(result?.contentMarkdown || result?.content || "").trim();
  if (!markdown) throw new Error("No readable content found on that page.");
  return {
    title: String(result?.title || parsed.hostname).trim() || parsed.hostname,
    markdown: markdown.slice(0, 200_000),
    url: finalUrl,
  };
}
