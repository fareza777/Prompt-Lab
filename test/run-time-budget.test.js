import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { humanizeApiError } from "../src/ui/errors.js";
import { makeTranslator, translate } from "../src/ui/i18n.js";

const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

const num = (name) => {
  const m = server.match(new RegExp(`const ${name} = ([0-9_]+);`));
  assert.ok(m, `${name} not found`);
  return Number(m[1].replace(/_/g, ""));
};

const BUDGET = num("RUN_FUNCTION_BUDGET_MS");
const PRIMARY = num("RUN_PRIMARY_TIMEOUT_MS");
const RESERVE = num("RUN_RESERVE_MS");
const MIN_FALLBACK = num("RUN_MIN_FALLBACK_MS");

test("the run budget fits inside the platform function limit", () => {
  // The first live run timed out because the shared profile (28s primary +
  // 35s fallback = 63s) overran maxDuration before writing anything.
  const maxDurationMs = vercel.functions["api/index.js"].maxDuration * 1000;
  assert.ok(
    BUDGET < maxDurationMs,
    `run budget ${BUDGET}ms must be under maxDuration ${maxDurationMs}ms`
  );
  assert.ok(
    maxDurationMs - BUDGET >= 3000,
    "leave at least 3s of headroom for sending the response"
  );
});

test("a single primary attempt fits the budget", () => {
  assert.ok(PRIMARY + RESERVE <= BUDGET, "primary attempt alone overruns the budget");
});

test("the fallback is bounded by elapsed time, not by a fixed sum", () => {
  // PRIMARY + MIN_FALLBACK + RESERVE deliberately exceeds BUDGET: the primary
  // model is the good one, so it gets the most time, and a fallback after a
  // full primary timeout would have too little left to be worth anything.
  // The fallback is therefore reachable only when the primary fails *early*
  // (a fast 429 or 5xx), and is additionally hard-capped by a deadline.
  assert.ok(
    PRIMARY + MIN_FALLBACK + RESERVE > BUDGET,
    "if this now fits, the fallback gating below is redundant and should be simplified"
  );
  const endpoint = server.slice(
    server.indexOf('app.post("/api/run-prompt"'),
    server.indexOf('app.post("/api/optimize-prompt"')
  );
  // Remaining time is measured at the moment of failure...
  assert.match(endpoint, /const budgetLeft = remaining\(\) - RUN_RESERVE_MS/);
  // ...and the fallback is both gated on it and capped by an absolute deadline.
  assert.match(endpoint, /budgetLeft < RUN_MIN_FALLBACK_MS/);
  assert.match(endpoint, /deadlineMs: startedRunAt \+ RUN_FUNCTION_BUDGET_MS - RUN_RESERVE_MS/);
});

test("the fallback is skipped when too little time remains", () => {
  const endpoint = server.slice(
    server.indexOf('app.post("/api/run-prompt"'),
    server.indexOf('app.post("/api/optimize-prompt"')
  );
  assert.match(endpoint, /budgetLeft < RUN_MIN_FALLBACK_MS/);
  assert.match(endpoint, /deadlineMs: startedRunAt \+ RUN_FUNCTION_BUDGET_MS - RUN_RESERVE_MS/);
});

test("run output is capped below the plan's prompt allowance", () => {
  const cap = num("RUN_MAX_TOKENS");
  assert.ok(cap > 1200, "cap is too low to produce a usable document");
  assert.ok(cap <= 3000, "cap is high enough to time out again");
  assert.match(server, /Math\.min\(RUN_MAX_TOKENS, resolveGenerateMaxTokens/);
});

test("a timeout tells the user what to change", () => {
  const t = makeTranslator("id");
  assert.match(server, /res\.status\(504\)\.json\(\{ error: "RUN_TOO_LONG" \}\)/);
  assert.equal(humanizeApiError("RUN_TOO_LONG", t), translate("id", "error.runTooLong"));
  for (const lang of ["id", "en"]) {
    const message = translate(lang, "error.runTooLong");
    assert.notEqual(message, "error.runTooLong", `missing for ${lang}`);
    // It must suggest an action, not just report failure.
    assert.match(message, /persingkat|satu bagian|shorten|one section/i);
  }
});

test("the raw sentinel never reaches the user", () => {
  const t = makeTranslator("en");
  assert.doesNotMatch(humanizeApiError("RUN_TOO_LONG", t), /RUN_TOO_LONG/);
});
