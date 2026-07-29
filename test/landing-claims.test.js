import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * The visible page at "/" is the static markup inlined in index.html, not the
 * React LandingPage component (which sits inside the hidden #app-root). That
 * makes index.html the surface a Play reviewer actually reads, and the one an
 * automated article pipeline can silently rewrite — so the honesty checks live
 * here.
 */

const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const landingComponent = await readFile(new URL("../src/LandingPage.jsx", import.meta.url), "utf8");

/** Marketing copy only — blog prose is allowed to discuss these as topics. */
const PRODUCT_CLAIM_BLOCKS = [
  {
    term: "Perfect Prompt",
    why: "promises an outcome the product cannot guarantee",
  },
  {
    term: "bias mitigation",
    why: "claims a safeguard the compare feature does not unconditionally apply",
  },
  {
    term: "expert-level context",
    why: "overstates what domain detection adds",
  },
  {
    term: "Six powerful tools",
    why: "the app is a single canvas, not six tools",
  },
];

test("landing markup makes no unsupportable product claims", () => {
  for (const { term, why } of PRODUCT_CLAIM_BLOCKS) {
    assert.ok(
      !new RegExp(term, "i").test(indexHtml),
      `index.html still claims "${term}" — ${why}`
    );
    assert.ok(
      !new RegExp(term, "i").test(landingComponent),
      `LandingPage.jsx still claims "${term}" — ${why}`
    );
  }
});

test('"production-ready" survives only as blog prose, never as a product claim', () => {
  const hits = indexHtml.match(/.{0,90}production-ready.{0,60}/gi) || [];
  for (const hit of hits) {
    assert.ok(
      /System Prompt/i.test(hit),
      `unexpected product-facing "production-ready" claim: ${hit.replace(/\s+/g, " ").trim()}`
    );
  }
});

test("landing markup does not promise AI generation only after signup", () => {
  // The trial grants AI generation before an account exists; saying otherwise
  // understates the product and contradicts the store listing.
  assert.ok(
    !/account when you want AI generation/i.test(indexHtml),
    "landing still says AI generation requires an account"
  );
});

test("homepage product narrative is result-first rather than prompt-first", () => {
  const productStart = indexHtml.indexOf("<!-- Hero -->");
  const productEnd = indexHtml.indexOf("<!-- Blog -->");
  const productCopy = indexHtml
    .slice(productStart, productEnd)
    .replaceAll(/Prompt[-\s]*Lab/gi, "");

  assert.doesNotMatch(productCopy, /\b(prompt|prompts|prompting)\b/i);
  assert.match(productCopy, /finished work/i);
  assert.match(productCopy, /Create Result/);

  const componentCopy = landingComponent
    .slice(landingComponent.indexOf("const WHAT_IT_DOES"))
    .replaceAll(/Prompt[-\s]*Lab/gi, "");
  assert.doesNotMatch(componentCopy, /\bprompt(s|ing)?\b/i);
  assert.match(componentCopy, /finished document/i);
});

test("the homepage describes the template flow the app actually ships", () => {
  // The old copy sold a freeform request box and named the chat assistants the
  // output was meant to be pasted into. Neither exists now.
  const productCopy = indexHtml.slice(
    indexHtml.indexOf("<!-- Hero -->"),
    indexHtml.indexOf("<!-- Blog -->")
  );
  assert.match(productCopy, /template/i);
  assert.match(productCopy, /Activity report/i);
  assert.doesNotMatch(productCopy, /ChatGPT|Gemini|Grok/);
  // Readiness scoring was removed from the result view; do not advertise it.
  assert.doesNotMatch(productCopy, /Readiness scoring/i);

  const componentCopy = landingComponent.slice(landingComponent.indexOf("const WHAT_IT_DOES"));
  assert.match(componentCopy, /Pick a template/);
  assert.match(componentCopy, /calendar/i);
  assert.match(componentCopy, /\.xlsx/);
  // Improve/Compare are gone from the product.
  assert.doesNotMatch(componentCopy, /Improve it in place|readiness estimate/i);
});
