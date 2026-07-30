import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { TEMPLATE_GROUPS, groupTemplates, listTemplates } from "../src/workTemplates.js";

const gallery = readFileSync(new URL("../src/ui/TemplateGallery.jsx", import.meta.url), "utf8");
const i18n = readFileSync(new URL("../src/ui/i18n.js", import.meta.url), "utf8");

test("gallery opens the four existing groups top-down", () => {
  assert.match(gallery, /pl-group-stack/);
  assert.match(gallery, /pl-brand-hero/);
  assert.match(gallery, /TEMPLATE_GROUPS\.map/);
  assert.deepEqual(TEMPLATE_GROUPS, ["report", "meeting", "extract", "utility"]);
  assert.match(i18n, /"tpl\.group\.report": "Laporan"/);
  assert.match(i18n, /"tpl\.group\.meeting": "Rapat & tindak lanjut"/);
  assert.match(i18n, /"tpl\.group\.extract": "Data & tabel"/);
  assert.match(i18n, /"tpl\.group\.utility": "Alat bantu"/);
});

test("group drill-down keeps catalogue template names", () => {
  const reports = groupTemplates(listTemplates()).find((entry) => entry.group === "report");
  assert.ok(reports);
  assert.equal(reports.templates[0].name.id, "Laporan Kegiatan");
  assert.match(gallery, /localized\(template\.name/);
  assert.match(gallery, /localized\(template\.blurb/);
  assert.doesNotMatch(gallery, /Monthly performance report/);
});
