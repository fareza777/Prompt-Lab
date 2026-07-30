import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { TEMPLATE_GROUPS, groupTemplates, listTemplates } from "../src/workTemplates.js";

const gallery = readFileSync(new URL("../src/ui/TemplateGallery.jsx", import.meta.url), "utf8");
const i18n = readFileSync(new URL("../src/ui/i18n.js", import.meta.url), "utf8");

test("home uses four clickable group cards from the catalogue", () => {
  assert.match(gallery, /pl-group-stack/);
  assert.match(gallery, /pl-group-card/);
  assert.match(gallery, /TEMPLATE_GROUPS\.map/);
  assert.deepEqual(TEMPLATE_GROUPS, ["report", "meeting", "extract", "utility"]);
  assert.match(i18n, /"tpl\.templateCount"/);
  assert.doesNotMatch(gallery, /\bWrench\b/);
});

test("group drill-down keeps exact Indonesian template names", () => {
  const reports = groupTemplates(listTemplates()).find((entry) => entry.group === "report");
  assert.equal(reports.templates[0].name.id, "Laporan Kegiatan");
  assert.equal(reports.templates[0].blurb.id, "Foto kegiatan menjadi laporan siap kirim.");
  assert.match(gallery, /localized\(template\.name/);
  assert.match(gallery, /localized\(template\.blurb/);
});
