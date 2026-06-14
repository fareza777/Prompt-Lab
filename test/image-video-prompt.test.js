import assert from "node:assert/strict";
import test from "node:test";
import {
  buildImageVideoPromptAddon,
  detectImageVideoIntent,
  isGrokTarget,
} from "../src/imageVideoPromptDelivery.js";

test("detectImageVideoIntent separates image vs video", () => {
  const image = detectImageVideoIntent({
    category: "Image AI",
    outputType: "Image Prompt",
    narrative: "midjourney product shot",
  });
  assert.equal(image.asksImage, true);
  assert.equal(image.asksVideo, false);

  const video = detectImageVideoIntent({
    category: "Video AI",
    outputType: "Video Prompt",
    narrative: "15 second runway ad",
  });
  assert.equal(video.asksVideo, true);
});

test("video addon includes duration and grok layer for Grok target", () => {
  const addon = buildImageVideoPromptAddon({
    category: "Video AI",
    outputType: "Video Prompt",
    modelTarget: "Grok",
    narrative: "tiktok ad",
  });
  assert.match(addon, /durasi/i);
  assert.match(addon, /grok_video_director_layer/i);
  assert.equal(isGrokTarget("Grok"), true);
});

test("image addon includes negative prompt guidance", () => {
  const addon = buildImageVideoPromptAddon({
    category: "Image AI",
    outputType: "Image Prompt",
    narrative: "flux portrait",
  });
  assert.match(addon, /image_generation_prompt/i);
  assert.match(addon, /Negative prompt/i);
});
