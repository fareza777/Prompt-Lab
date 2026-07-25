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

// The About surface moved out of the Settings tab strip and into the Account
// sheet when the app collapsed to a single canvas. The destinations it must
// expose are unchanged.
test("Account sheet exposes product, rating, and trust destinations", () => {
  const source = fs.readFileSync(new URL("../src/ui/Account.jsx", import.meta.url), "utf8");

  assert.match(source, /aria-labelledby="about-promptlab-title"/);
  assert.match(source, /id="about-promptlab-title"/);
  assert.match(source, /\/icons\/icon-512\.png/);
  assert.match(source, /alt="PromptLab app icon"/);
  assert.match(source, /href=\{PLAY_STORE_LISTING_URL\}/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noreferrer"/);
  assert.match(source, /href="\/privacy"/);
  assert.match(source, /href="\/privacy\/delete-account"/);
  assert.match(source, /href=\{`mailto:\$\{SUPPORT_EMAIL\}`\}/);
  assert.match(source, /aria-label=\{`Contact support by email at \$\{SUPPORT_EMAIL\}`\}/);
  // Play rejects apps that deep-link the store through raw intents.
  assert.doesNotMatch(source, /(?:market|intent):\/\//);
});

test("About rating link points at the published listing", async () => {
  const { PLAY_STORE_LISTING_URL, SUPPORT_EMAIL } = await import("../src/aboutApp.js");
  assert.match(PLAY_STORE_LISTING_URL, /^https:\/\/play\.google\.com\/store\/apps\/details\?id=/);
  assert.equal(SUPPORT_EMAIL, "support@prompt-lab.xyz");
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
