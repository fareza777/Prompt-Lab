import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildProviderChatCompletionBody } from "../server/minimaxProvider.js";

const server = await readFile(new URL("../server/index.js", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");

const runEndpoint = server.slice(
  server.indexOf('app.post("/api/run-prompt"'),
  server.indexOf('app.post("/api/optimize-prompt"')
);

test("the provider body forwards the stream flag", () => {
  // It used to drop `stream`, so every caller asking for a stream silently got
  // a buffered completion — not async-iterable, so streaming never worked.
  const body = buildProviderChatCompletionBody(
    { provider: "openrouter" },
    { model: "m", messages: [], max_tokens: 100, stream: true }
  );
  assert.equal(body.stream, true);
});

test("a non-streaming request stays non-streaming", () => {
  const body = buildProviderChatCompletionBody(
    { provider: "openrouter" },
    { model: "m", messages: [], max_tokens: 100 }
  );
  assert.equal(body.stream, undefined, "stream must not be set unless asked for");
});

test("MiniMax thinking stays disabled when streaming", () => {
  // Extended reasoning on M3 is what pushed runs past the function limit.
  const body = buildProviderChatCompletionBody(
    { provider: "minimax" },
    { model: "MiniMax-M3", messages: [], max_tokens: 100, stream: true }
  );
  assert.deepEqual(body.thinking, { type: "disabled" });
  assert.equal(body.stream, true);
});

test("run-prompt streams by default and only opts out explicitly", () => {
  assert.match(server, /stream: req\.body\?\.stream === false \|\| req\.body\?\.stream === "false" \? false : true/);
  assert.match(runEndpoint, /if \(body\.stream !== false\)/);
});

test("the stream keeps partial output when the budget runs out", () => {
  // Losing a long document at the deadline is what made timeouts so costly:
  // the user waited, spent quota, and got nothing.
  assert.match(server, /RUN_STREAM_FINALIZE_RESERVE_MS/);
  assert.match(server, /truncated = true/);
  assert.match(server, /if \(!raw\) throw error/);
  assert.match(runEndpoint, /truncated: streamed\.truncated/);
});

test("errors raised after the stream started are sent as stream events", () => {
  // A JSON reply after headers are on the wire throws ERR_HTTP_HEADERS_SENT
  // and kills the socket, which is how the first local run died.
  assert.match(runEndpoint, /if \(res\.headersSent\)/);
  assert.match(runEndpoint, /sendSse\(res, "error"/);
});

test("streamed runs still record quota and the weekly allowance", () => {
  assert.match(runEndpoint, /eventType: "run_prompt"/);
  assert.match(runEndpoint, /streamed: true/);
  assert.match(runEndpoint, /weeklyResults: weeklyReservation/);
});

test("the client consumes the stream and renders it progressively", () => {
  assert.match(main, /text\/event-stream/);
  assert.match(main, /consumeGenerateSse\(response, \{/);
  assert.match(main, /setRunOutput\(streamed\)/);
});

test("the client warns when a document was cut short", () => {
  assert.match(main, /if \(data\.truncated\)/);
  assert.match(main, /berhenti sebelum selesai/i);
});

test("streaming text is rendered as it arrives, not hidden behind a spinner", async () => {
  const result = await readFile(new URL("../src/ui/Result.jsx", import.meta.url), "utf8");
  // The first version returned <Working/> for the whole run, so the server
  // streamed correctly while the user still stared at a blank spinner.
  assert.match(result, /if \(isRunning && !output\)/);
  assert.match(result, /const streaming = isRunning && Boolean\(output\)/);
  assert.match(result, /pl-doc--streaming/);
  assert.match(result, /result\.streaming/);
  // Re-parsing markdown and re-rendering Mermaid on every delta would thrash;
  // the rich view is deferred until the run finishes.
  assert.match(result, /streaming \? \[\] : groupDocumentSections/);
});
