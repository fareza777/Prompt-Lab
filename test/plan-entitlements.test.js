import test from "node:test";
import assert from "node:assert/strict";
import {
  canExportFormat,
  canUseFeature,
  getEntitlements,
  normalizePlanName,
  planMeetsMinimum,
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
