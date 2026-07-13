import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const title = "Prompt generator: Prompt Lab";
const shortDescription = "Build, optimize, compare, and save AI prompts from ideas, images, and files.";

const listing = await readFile(new URL("../playstore/STORE_LISTING.md", import.meta.url), "utf8");
const checklist = await readFile(new URL("../playstore/play-console-checklist.md", import.meta.url), "utf8");

test("Play Store source files use the approved English metadata", () => {
  assert.equal(title.length, 28);
  assert.equal(shortDescription.length, 76);
  for (const source of [listing, checklist]) {
    assert.match(source, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(source, new RegExp(shortDescription.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("canonical listing avoids unsupported or overbroad product claims", () => {
  for (const claim of ["Microsoft 365 Integration", "PDF export", "real time synchronization", "Even offline"] ) {
    assert.ok(!listing.includes(claim), `listing must not claim: ${claim}`);
  }
});

test("listing documents benefit-led screenshots and the no-AAB metadata path", () => {
  assert.match(listing, /Turn rough ideas into structured AI prompts/);
  assert.match(listing, /No new AAB required/i);
});
