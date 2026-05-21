import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPromptSpecInstruction,
  getDomainPromptPack,
  scorePromptText,
} from "../server/index.js";

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
