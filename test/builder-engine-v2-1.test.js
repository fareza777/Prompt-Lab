import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  acceptBuilderCandidate,
  assessBuilderComplexity,
  buildDepthDirective,
  buildIntentSystemPromptXml,
  buildLeanIntentSystemPrompt,
  buildStructureRetryInstruction,
  detectDomains,
  getBuilderQualityPolicy,
  isPromptBelowQualityFloor,
  evalDelta,
  localPromptScore,
  PROMPT_ENGINE_VERSION,
  shouldRecoverStream,
  validatePromptStructure,
} from "../server/prompt-engine-v2.js";
import { buildOpenRouterContent, buildPromptSpecInstruction } from "../server/index.js";

test("adaptive policy keeps small communication tasks concise", () => {
  const payload = {
    narrative: "Write a short follow-up email thanking a client for today's call.",
    category: "Business",
    outputType: "Content",
    outputLanguage: "en",
  };

  assert.deepEqual(assessBuilderComplexity(payload), {
    level: "simple",
    highStakes: false,
    reasons: ["short-form deliverable"],
  });
  assert.deepEqual(getBuilderQualityPolicy(payload), {
    level: "simple",
    highStakes: false,
    reasons: ["short-form deliverable"],
    minimumSections: 4,
    minimumCharacters: 280,
    requirementCount: 3,
    constraintCount: 2,
    acceptanceCount: 1,
  });
});

test("adaptive policy scales standard marketing and complex application work", () => {
  const marketing = getBuilderQualityPolicy({
    narrative: "Create a landing page campaign for a milk coffee brand aimed at university students.",
    category: "Marketing",
    outputType: "Content",
  });
  const application = getBuilderQualityPolicy({
    narrative: "Build a mobile-first bakery POS with offline cart, inventory, reports, roles, and test coverage.",
    category: "Coding",
    outputType: "Application Code",
  });
  const attachmentAnalysis = getBuilderQualityPolicy({
    narrative: "Analyze the supplied operational documents and reconcile conflicting findings.",
    category: "Business",
    outputType: "Analysis",
    attachments: [{ filename: "a.pdf" }, { filename: "b.xlsx" }],
  });

  assert.equal(marketing.level, "standard");
  assert.equal(marketing.minimumCharacters, 450);
  assert.equal(application.level, "complex");
  assert.equal(application.minimumCharacters, 650);
  assert.equal(attachmentAnalysis.level, "complex");
});

test("adaptive policy marks regulated domains as high stakes without adding a verbosity tier", () => {
  for (const narrative of [
    "Review this vendor contract for legal and compliance risk.",
    "Analyze this cashflow forecast and financial downside risk.",
    "Prepare patient education for medication safety in a clinic.",
  ]) {
    const result = assessBuilderComplexity({ narrative, outputType: "Analysis" });
    assert.equal(result.highStakes, true);
    assert.ok(["standard", "complex"].includes(result.level));
  }

  for (const narrative of [
    "Assess investor valuation and budget downside.",
    "Review an NDA for GDPR privacy risk.",
    "Prepare diagnosis guidance for a doctor and pharmacy team.",
  ]) {
    assert.equal(assessBuilderComplexity({ narrative, outputType: "Analysis" }).highStakes, true, narrative);
  }
});

test("depth directive is concrete, localized, and adds high-stakes guardrails", () => {
  const english = buildDepthDirective({
    narrative: "Build a production-ready web application with API and tests.",
    outputType: "Application Code",
    outputLanguage: "en",
  });
  const indonesianHighStakes = buildDepthDirective({
    narrative: "Tinjau kontrak vendor dan risiko hukum.",
    outputType: "Analysis",
    outputLanguage: "id",
  });

  assert.match(english, /<depth_mandate profile="complex">/);
  assert.match(english, /at least 7 concrete requirements/i);
  assert.match(english, /at least 3 testable acceptance criteria/i);
  assert.match(indonesianHighStakes, /minimal 5 requirement konkret/i);
  assert.match(indonesianHighStakes, /verifikasi bukti/i);
  assert.match(indonesianHighStakes, /review profesional/i);
});

test("quality floor uses the selected profile instead of one global length", () => {
  const text = "x".repeat(449);
  const simple = getBuilderQualityPolicy({ narrative: "Write a short caption", outputType: "Content" });
  const standard = getBuilderQualityPolicy({ narrative: "Create a marketing campaign", outputType: "Content" });

  assert.equal(isPromptBelowQualityFloor(text, simple), false);
  assert.equal(isPromptBelowQualityFloor(text, standard), true);
});

test("weighted domain corpus routes explicit deliverables and specialist work", () => {
  const corpus = [
    ["Write a short client follow-up email", "Content", "generic prompt"],
    ["Create a conversion landing page campaign with CTA", "Content", "marketing conversion workflow"],
    ["Build inventory screens, API, and tests", "Application Code", "runnable application"],
    ["Create an investor pitch deck with valuation and cashflow", "PPT", "presentation planning"],
    ["Write an annual operations report with evidence", "Word Document", "structured document"],
    ["Review a vendor contract and write a legal risk report", "Analysis", "legal & compliance"],
    ["Analyze cashflow, tax, budget, and valuation downside", "Analysis", "finance & accounting"],
    ["Prepare patient medication safety guidance for a clinic", "Content", "healthcare & clinical"],
    ["Design a K-12 curriculum and lesson plan", "Content", "education k12 & higher"],
    ["Generate a studio product photograph with Flux tuning", "Image Prompt", "AI image generation prompt"],
    ["Generate a 15-second cinematic ad with scene timing", "Video Prompt", "AI video generation prompt"],
    ["Analyze KPI spreadsheet data for a Power BI dashboard", "Analysis", "data analytics & reporting"],
  ];

  for (const [narrative, outputType, expected] of corpus) {
    assert.equal(detectDomains({ narrative, outputType }).primary, expected, narrative);
  }
});

test("weighted routing keeps specialist context as secondary instead of winning ties by source order", () => {
  const legal = detectDomains({
    narrative: "Review a vendor contract and prepare a structured legal compliance report.",
    outputType: "Analysis",
  });
  const investorDeck = detectDomains({
    narrative: "Create an investor pitch deck covering valuation, budget, and cashflow.",
    outputType: "PPT",
  });

  assert.equal(legal.primary, "legal & compliance");
  assert.equal(legal.secondary, "structured document");
  assert.ok(legal.confidence > 50);
  assert.equal(investorDeck.primary, "presentation planning");
  assert.equal(investorDeck.secondary, "finance & accounting");
});

test("full and lean provider prompts share the adaptive depth mandate", () => {
  const payload = {
    narrative: "Build a production-ready inventory application with API and tests.",
    category: "Coding",
    outputType: "Application Code",
    outputLanguage: "en",
  };

  assert.match(buildIntentSystemPromptXml(payload), /<depth_mandate profile="complex">/);
  assert.match(buildLeanIntentSystemPrompt(payload), /<depth_mandate profile="complex">/);
  assert.match(buildOpenRouterContent(payload, [], { lean: true }), /Quality gates:/i);
  assert.match(buildOpenRouterContent(payload, [], { lean: true }), /Output controls:/i);

  const multiAttachmentPayload = {
    narrative: "Analyze the supplied files and summarize the findings.",
    outputType: "Analysis",
    outputLanguage: "en",
    attachmentCount: 2,
  };
  assert.match(buildIntentSystemPromptXml(multiAttachmentPayload), /<depth_mandate profile="complex">/);
});

test("lean prompt spec retains domain output controls and quality gates", () => {
  const spec = buildPromptSpecInstruction({
    narrative: "Build a bakery POS application.",
    category: "Coding",
    outputType: "Application Code",
    outputLanguage: "en",
  }, [], { lean: true });

  assert.match(spec, /Output controls:/i);
  assert.match(spec, /Quality gates:/i);
  assert.match(spec, /local run steps/i);

  const simpleSpec = buildPromptSpecInstruction({
    narrative: "Write a short follow-up email.",
    outputType: "Content",
    outputLanguage: "en",
  }, [], { lean: true });
  assert.doesNotMatch(simpleSpec, /ask only blocking questions/i);
});

test("structure validation is proportional to the selected policy", () => {
  const fourSections = [
    "Role: Senior communication writer.",
    "Context: Follow up after a client call.",
    "Task: Write a thank-you email.",
    "Output format: Subject and two short paragraphs.",
  ].join("\n");
  const simple = getBuilderQualityPolicy({ narrative: "Write a follow-up email", outputType: "Content" });
  const standard = getBuilderQualityPolicy({ narrative: "Create a marketing campaign", outputType: "Content" });

  assert.equal(validatePromptStructure(fourSections, simple).valid, true);
  assert.equal(validatePromptStructure(fourSections, standard).valid, false);
  assert.equal(validatePromptStructure(fourSections, standard).requiredSections, 5);
});

test("repair and refinement candidates cannot regress adaptive structure", () => {
  const policy = getBuilderQualityPolicy({ narrative: "Create a marketing campaign", outputType: "Content" });
  const current = [
    "Role: Senior marketer.",
    "Context: Launch a subscription app.",
    "Task: Create an activation campaign.",
    "Output format: Return a three-channel table.",
    "Constraints: Avoid unsupported claims.",
    "Acceptance criteria: Verify channel coverage.",
    "x".repeat(450),
  ].join("\n");
  const longButInvalid = `Role: Senior marketer. Task: Write copy. ${"filler ".repeat(100)}`;

  assert.equal(acceptBuilderCandidate(longButInvalid, current, policy), current);
  assert.equal(acceptBuilderCandidate(current, longButInvalid, policy), current);
});

test("repair instruction carries missing sections and adaptive depth targets", () => {
  const policy = getBuilderQualityPolicy({
    narrative: "Build a complete web application with API and tests.",
    outputType: "Application Code",
    outputLanguage: "en",
  });
  const retry = buildStructureRetryInstruction("Role: engineer", ["context", "acceptance"], policy);

  assert.match(retry, /Context \/ Konteks/);
  assert.match(retry, /Acceptance Criteria/);
  assert.match(retry, /7 concrete requirements/i);
  assert.match(retry, /3 testable acceptance criteria/i);
});

test("generation route publishes v2.1 adaptive quality metadata", () => {
  const serverSource = fs.readFileSync(new URL("../server/index.js", import.meta.url), "utf8");

  assert.equal(PROMPT_ENGINE_VERSION, "v2.1.0");
  assert.match(serverSource, /qualityProfile:\s*qualityPolicy\.level/);
  assert.match(serverSource, /structureScore:\s*finalStructure\.score/);
  assert.match(serverSource, /getBuilderQualityPolicy/);
  assert.match(serverSource, /attachmentCount:\s*attachments\.length/);
});

test("stream recovery requires a fallback model and at least twelve seconds", () => {
  assert.equal(shouldRecoverStream({ remainingBudgetMs: 12_000, fallbackModels: ["fallback/model"] }), true);
  assert.equal(shouldRecoverStream({ remainingBudgetMs: 11_999, fallbackModels: ["fallback/model"] }), false);
  assert.equal(shouldRecoverStream({ remainingBudgetMs: 20_000, fallbackModels: [] }), false);
  assert.equal(shouldRecoverStream({ remainingBudgetMs: Number.NaN, fallbackModels: ["fallback/model"] }), false);
});

test("streamed Builder route performs one bounded replacement recovery", () => {
  const serverSource = fs.readFileSync(new URL("../server/index.js", import.meta.url), "utf8");

  assert.match(serverSource, /shouldRecoverStream\s*\(/);
  assert.match(serverSource, /tryOpenRouterFallbackModels\s*\(/);
  assert.match(serverSource, /sendSse\(res,\s*"chunk",\s*\{\s*text:\s*fallbackPrompt,\s*replace:\s*true\s*\}\)/);
  assert.match(serverSource, /modelStatus:\s*streamModelStatus/);
  assert.match(serverSource, /warning:\s*streamWarning/);
  assert.match(serverSource, /remainingBudgetMs\s*-\s*STREAM_RECOVERY_FINALIZE_RESERVE_MS/);
});

test("heuristic evaluator rewards concrete controls without rewarding padding", () => {
  const headingOnly = `
Role: Expert.
Context: General context.
Task: Do the task well.
Output format: Provide an answer.
Constraints: Follow constraints.
Acceptance criteria: Make it high quality.`;
  const executable = `
Role: Senior lifecycle marketer for subscription mobile apps.
Context: Re-engage trial users who stopped before activation.
Task: Write a three-email sequence that increases completed onboarding.
Output format: Return a table with subject, preview text, body, CTA, and send delay for each email.
Constraints: Keep each body under 140 words; use exactly one CTA; avoid unsupported performance claims.
Acceptance criteria: Verify all three emails map to a distinct objection and include measurable CTA copy.`;
  const padded = `${executable}\n${"Additional background without new requirements. ".repeat(80)}`;

  assert.ok(localPromptScore(executable) >= localPromptScore(headingOnly) + 15);
  assert.equal(localPromptScore(padded), localPromptScore(executable));
  assert.equal(evalDelta("Write emails", executable).method, "heuristic-v2.1");
});
