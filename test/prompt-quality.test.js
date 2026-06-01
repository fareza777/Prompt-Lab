import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPromptSpecInstruction,
  getDomainPromptPack,
  scorePromptText,
} from "../server/index.js";
import {
  buildDepthDirective,
  buildIntentSystemPromptXml,
  localPromptScore,
  validatePromptStructure,
} from "../server/prompt-engine-v2.js";

test("depth directive demands comprehensive coverage in both languages", () => {
  const id = buildDepthDirective({ language: "id" });
  assert.match(id, /depth_mandate/);
  assert.match(id, /komprehensif/i);
  assert.match(id, /acceptance criteria/i);
  assert.match(id, /minimal 5 item/i);

  const en = buildDepthDirective({ language: "en" });
  assert.match(en, /comprehensive/i);
  assert.match(en, /at least 5 concrete items/i);
  assert.match(en, /at least 3 testable acceptance criteria/i);
});

test("intent system prompt embeds the depth mandate", () => {
  const sys = buildIntentSystemPromptXml({ outputLanguage: "id", outputType: "Application Code" });
  assert.match(sys, /<depth_mandate/);
});

test("structure validator now requires 5 of 6 sections", () => {
  // 4 sections present (role, context, task, output format) → no longer valid.
  const fourSections = "Role: senior engineer. Konteks: aplikasi kasir. Tugas: bangun fitur. Output format: tabel.";
  assert.equal(validatePromptStructure(fourSections).valid, false);

  // 5 sections (adds constraints) → valid.
  const fiveSections = `${fourSections} Constraints: jangan invent angka, sertakan 3 batasan.`;
  assert.equal(validatePromptStructure(fiveSections).valid, true);
});

test("local score rewards comprehensive prompts over thin ones", () => {
  const thin = "Role: ahli. Tugas: buat sesuatu.";
  const comprehensive = `Role: Senior full-stack engineer untuk aplikasi POS Indonesia.
Context: Toko retail butuh sistem kasir offline-first.
Objective: bangun aplikasi kasir yang bisa dijalankan lokal.
Requirements:
- 5 screen utama (List, Detail, Cart, Settings, Auth)
- data model 6 tabel
- API CRUD lengkap
- validasi input 12 aturan
- empty/loading/error states tiap screen
Constraints:
- harus runnable lokal
- offline-first dengan sync
- tidak invent angka harga
- tandai semua asumsi
Output format:
- struktur folder
- file-by-file plan
- 8 acceptance tests
Acceptance criteria:
- app jalan via npm run dev
- core flow testable
- semua UI states tercover`;
  assert.ok(localPromptScore(comprehensive) > localPromptScore(thin) + 25);
});

test("domain prompt packs add concrete requirements for marketing landing pages", () => {
  const pack = getDomainPromptPack({
    narrative: "buat landing page UMKM kopi susu dengan menu, harga, testimoni, dan CTA whatsapp",
    category: "Marketing",
    outputType: "Content",
  });

  assert.equal(pack.domain, "marketing conversion workflow");
  assert.match(pack.requirements.join(" "), /audience/i);
  assert.match(pack.requirements.join(" "), /offer/i);
  assert.match(pack.constraints.join(" "), /CTA/i);
});

test("prompt spec instruction locks deliverable and asks for structured prompt spec", () => {
  const instruction = buildPromptSpecInstruction({
    narrative: "buat aplikasi kasir sederhana",
    category: "Coding",
    modelTarget: "ChatGPT",
    outputType: "Application Code",
    tone: "Professional",
  }, []);

  assert.match(instruction, /Prompt Spec JSON/i);
  assert.match(instruction, /Application Code/i);
  assert.match(instruction, /acceptance_criteria/i);
  assert.match(instruction, /Do not output the JSON/i);
});

test("scorePromptText penalizes generic prompts and rewards executable prompts", () => {
  const weak = scorePromptText("buat landing page kopi susu yang bagus");
  const strong = scorePromptText(`
Role: Senior conversion copywriter for Indonesian food and beverage SMEs.
Context: Brand sells kopi susu to students and office workers.
Objective: Create a landing page prompt.
Output format: 6 sections with hero, menu, proof, testimonials, FAQ, and WhatsApp CTA.
Constraints: include 5 menu items, 3 objections, no unverifiable claims, state assumptions.
Acceptance criteria: output follows all sections, includes prices, and uses clear CTA copy.
`);

  assert.ok(strong.overall > weak.overall + 25);
  assert.ok(strong.risk < weak.risk);
  assert.ok(strong.details.length > 0);
});
