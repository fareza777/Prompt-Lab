import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  ABOUT_WORKFLOW,
  PLAY_STORE_LISTING_URL,
  PLAY_STORE_PACKAGE_ID,
  SETTINGS_SECTION_NAMES,
} from "../src/aboutApp.js";
import { getTabTargetIndex } from "../src/accessibilityInteractions.js";

test("About uses the canonical PromptLab Google Play listing", () => {
  assert.equal(PLAY_STORE_PACKAGE_ID, "app.promptlab.twa");
  assert.equal(
    PLAY_STORE_LISTING_URL,
    "https://play.google.com/store/apps/details?id=app.promptlab.twa",
  );
  assert.doesNotMatch(PLAY_STORE_LISTING_URL, /^(?:market|intent):\/\//);
});

test("About teaches the product workflow in order", () => {
  assert.deepEqual(
    ABOUT_WORKFLOW.map(({ label }) => label),
    ["Build", "Improve", "Compare", "Reuse"],
  );
  assert.ok(ABOUT_WORKFLOW.every(({ description }) => description.trim().length > 0));
});

test("Settings keyboard traversal includes About as the sixth destination", () => {
  assert.deepEqual(SETTINGS_SECTION_NAMES, [
    "Account",
    "Membership",
    "Prompt Defaults",
    "Data & Privacy",
    "Support",
    "About",
  ]);
  assert.equal(getTabTargetIndex("End", 0, SETTINGS_SECTION_NAMES.length), 5);
  assert.equal(getTabTargetIndex("ArrowRight", 4, SETTINGS_SECTION_NAMES.length), 5);
  assert.equal(getTabTargetIndex("ArrowRight", 5, SETTINGS_SECTION_NAMES.length), 0);
});

test("Settings exposes the accessible About tab and panel", () => {
  const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

  assert.match(mainSource, /About: Info/);
  assert.match(mainSource, /SETTINGS_SECTION_NAMES\.map/);
  assert.match(mainSource, /section === "About"/);
  assert.match(mainSource, /<AboutPanel\s*\/>/);
});

test("About panel exposes product, rating, and trust destinations", () => {
  const panelSource = fs.readFileSync(new URL("../src/aboutPanel.jsx", import.meta.url), "utf8");

  assert.match(panelSource, /role="tabpanel"/);
  assert.match(panelSource, /id="settings-panel-about"/);
  assert.match(panelSource, /\/icons\/icon-512\.png/);
  assert.match(panelSource, /alt="PromptLab app icon"/);
  assert.match(panelSource, /Rate Prompt Lab/);
  assert.match(panelSource, /href=\{PLAY_STORE_LISTING_URL\}/);
  assert.match(panelSource, /target="_blank"/);
  assert.match(panelSource, /rel="noreferrer"/);
  assert.match(panelSource, /href="\/privacy"/);
  assert.match(panelSource, /href="\/privacy\/delete-account"/);
  assert.match(panelSource, /href="mailto:support@prompt-lab\.xyz"/);
  assert.match(panelSource, /aria-label="Contact support by email at support@prompt-lab\.xyz"/);
  assert.doesNotMatch(panelSource, /(?:market|intent):\/\//);
});

test("About presentation covers responsive and reduced-motion states", () => {
  const cssSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(cssSource, /\.v2-about-identity\s*\{/);
  assert.match(cssSource, /\.v2-about-workflow\s+ol\s*\{/);
  assert.match(cssSource, /\.v2-about-rate-action\s*\{/);
  assert.match(cssSource, /@media \(max-width: 768px\)[\s\S]*?\.v2-about-identity/);
  assert.match(cssSource, /@media \(max-width: 360px\)[\s\S]*?\.v2-about/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.v2-about/);
  assert.doesNotMatch(cssSource, /\.v2-about-rate-action\s*\{[^}]*transition:[^;}]*box-shadow/s);
});
