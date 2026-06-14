import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { mergeModelSettingsLayers } from "../server/runtimeConfig.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("mergeModelSettingsLayers", () => {
  it("keeps MiniMax env routing when published config is stale OpenRouter", () => {
    process.env.AI_PROVIDER = "minimax";
    process.env.MINIMAX_API_KEY = "sk-test";
    process.env.MINIMAX_MODEL = "MiniMax-M3";

    const merged = mergeModelSettingsLayers({
      published: {
        provider: "openrouter",
        primaryModel: "xiaomi/mimo-v2-flash",
        baseUrl: "https://openrouter.ai/api/v1",
        timeoutMs: "40000",
        ocrModel: "baidu/qianfan-ocr-fast:free",
        fallbackModels: ["deepseek/deepseek-v4-flash"],
      },
    });

    assert.equal(merged.provider, "minimax");
    assert.equal(merged.primaryModel, "MiniMax-M3");
    assert.equal(merged.ocrModel, "baidu/qianfan-ocr-fast:free");
  });

  it("applies published MiniMax routing when env is also MiniMax", () => {
    process.env.AI_PROVIDER = "minimax";
    process.env.MINIMAX_API_KEY = "sk-test";
    process.env.MINIMAX_MODEL = "MiniMax-M3";

    const merged = mergeModelSettingsLayers({
      published: {
        provider: "minimax",
        primaryModel: "MiniMax-M2.7-highspeed",
        baseUrl: "https://api.minimaxi.chat/v1",
        timeoutMs: "42000",
      },
    });

    assert.equal(merged.provider, "minimax");
    assert.equal(merged.primaryModel, "MiniMax-M2.7-highspeed");
    assert.equal(merged.timeoutMs, "42000");
  });
});
