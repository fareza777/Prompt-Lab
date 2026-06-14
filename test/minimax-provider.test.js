import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProviderChatCompletionBody,
  isMinimaxThinkingModel,
  resolveMinimaxBaseUrl,
} from "../server/minimaxProvider.js";

test("isMinimaxThinkingModel matches M3 only", () => {
  assert.equal(isMinimaxThinkingModel("MiniMax-M3"), true);
  assert.equal(isMinimaxThinkingModel("MiniMax-M2.7-highspeed"), false);
});

test("resolveMinimaxBaseUrl picks regional host from key prefix", () => {
  assert.equal(resolveMinimaxBaseUrl("", "sk-cp-test"), "https://api.minimaxi.chat/v1");
  assert.equal(resolveMinimaxBaseUrl("", "sk-api-test"), "https://api.minimax.io/v1");
  assert.equal(resolveMinimaxBaseUrl("https://api.minimax.io/v1", "sk-cp-test"), "https://api.minimax.io/v1");
});

test("buildProviderChatCompletionBody disables M3 thinking for prompt tasks", () => {
  const body = buildProviderChatCompletionBody(
    { provider: "minimax" },
    {
      model: "MiniMax-M3",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 500,
    }
  );
  assert.deepEqual(body.extra_body, { thinking: { type: "disabled" } });
});

test("buildProviderChatCompletionBody leaves OpenRouter requests unchanged", () => {
  const body = buildProviderChatCompletionBody(
    { provider: "openrouter" },
    {
      model: "deepseek/deepseek-v4-flash",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 500,
    }
  );
  assert.equal(body.extra_body, undefined);
});
