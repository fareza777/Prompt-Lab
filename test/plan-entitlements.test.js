import test from "node:test";
import assert from "node:assert/strict";
import {
  canExportFormat,
  canUseFeature,
  getEntitlements,
  normalizePlanName,
  planMeetsMinimum,
  resolveGenerateMaxTokens,
  resolveOcrRuntime,
} from "../src/planEntitlements.js";

test("normalizePlanName falls back to Free", () => {
  assert.equal(normalizePlanName("Unknown"), "Free");
  assert.equal(normalizePlanName("Pro"), "Pro");
});

test("Pro unlocks exports and AI features", () => {
  assert.equal(canExportFormat("Pro", "docx"), true);
  assert.equal(canExportFormat("Free", "docx"), false);
  assert.equal(canUseFeature("Pro", "aiCompare"), true);
  assert.equal(canUseFeature("Free", "aiCompare"), false);
});

test("Business has higher limits than Pro", () => {
  assert.ok(getEntitlements("Business").libraryLimit > getEntitlements("Pro").libraryLimit);
  assert.equal(canUseFeature("Business", "priorityRouting"), true);
  assert.equal(canUseFeature("Pro", "priorityRouting"), false);
});

test("planMeetsMinimum compares tiers", () => {
  assert.equal(planMeetsMinimum("Business", "Pro"), true);
  assert.equal(planMeetsMinimum("Free", "Pro"), false);
});

test("resolveOcrRuntime uses priority settings for Pro", () => {
  const pro = resolveOcrRuntime("Pro");
  const free = resolveOcrRuntime("Free");
  assert.ok(pro.maxTokens > free.maxTokens);
  assert.notEqual(pro.model, free.model);
});

test("resolveGenerateMaxTokens scales by plan and phased game briefs", () => {
  const gameNarrative = "buat game action seperti mario bros, 100 level dan story";
  const freeGame = resolveGenerateMaxTokens("Free", {
    narrative: gameNarrative,
    category: "",
    outputType: "",
  });
  const freePlain = resolveGenerateMaxTokens("Free", { narrative: "buat caption kopi" });
  const businessGame = resolveGenerateMaxTokens("Business", {
    narrative: gameNarrative,
    category: "Coding",
    outputType: "Application Code",
    qualityMode: "premium",
  });
  assert.ok(freeGame >= 4800);
  assert.ok(freeGame > freePlain);
  assert.ok(businessGame >= 6000);
  assert.ok(getEntitlements("Business").generateMaxTokens > getEntitlements("Free").generateMaxTokens);
});

test("resolveGenerateMaxTokens caps video prompts for faster provider turnaround", () => {
  const video = resolveGenerateMaxTokens("Free", {
    narrative: "buat video 10 detik",
    category: "Video AI",
    outputType: "Video Prompt",
  });
  assert.equal(video, 3000);
});
