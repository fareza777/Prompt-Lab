import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVisionUserContent,
  imageVisionExtractPrompt,
  runVisionDirective,
  toDataUrl,
} from "../server/visionAttachments.js";

test("buildVisionUserContent stays text-only without images", () => {
  assert.equal(buildVisionUserContent("hello", []), "hello");
  assert.equal(buildVisionUserContent("hello", [{ mime: "image/png" }]), "hello");
});

test("buildVisionUserContent attaches image_url parts for photos", () => {
  const content = buildVisionUserContent("lihat foto", [
    { mime: "image/jpeg", dataUrl: "data:image/jpeg;base64,abc" },
    { mime: "text/plain", dataUrl: "nope" },
  ]);
  assert.equal(Array.isArray(content), true);
  assert.equal(content[0].type, "text");
  assert.match(content[0].text, /lihat foto/);
  assert.equal(content[1].type, "image_url");
  assert.equal(content[1].image_url.url, "data:image/jpeg;base64,abc");
  assert.equal(content.length, 2);
});

test("vision prompts require looking at the image", () => {
  assert.match(imageVisionExtractPrompt("id"), /Jelaskan singkat|Ekstrak SEMUA teks/i);
  assert.match(runVisionDirective("id"), /LIHAT|vision/i);
  assert.match(toDataUrl(Buffer.from("hi"), "image/png"), /^data:image\/png;base64,/);
});
