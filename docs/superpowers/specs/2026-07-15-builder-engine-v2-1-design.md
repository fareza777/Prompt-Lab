# Builder Engine v2.1 Adaptive Quality Design

Date: 2026-07-15

## Decision

Upgrade PromptLab Builder from a mostly uniform generation policy to an adaptive-quality engine. The engine will scale structure, depth, and recovery behavior with request complexity while preserving fast, concise output for simple requests.

This is a hosted server and web application change. It does not require a new Android App Bundle.

## Goals

- Improve the completeness and executability of Builder output, especially on the MiniMax production path.
- Avoid equating quality with verbosity.
- Make post-generation validation stricter for complex work and proportionate for simple work.
- Add deterministic regression coverage across PromptLab's principal domains.
- Recover from a failed OpenRouter stream through the configured fallback chain when time remains.
- Keep quota, timeout, language, attachment-security, and deliverable-lock behavior intact.

## Approaches considered

### Uniform depth mandate

Require every output to be longer, use five of six sections, and contain fixed minimum item counts. This is easy to implement but produces bloated captions, emails, and other small deliverables.

### Adaptive quality policy (selected)

Classify each request as `simple`, `standard`, or `complex`, with a separate `highStakes` signal. Derive minimum structure, depth instructions, and short-output thresholds from that policy. This improves demanding tasks without penalizing simple ones.

### Multi-candidate generation for every request

Generate two or more candidates and judge them. This can improve quality but multiplies quota consumption and latency. It remains out of scope until token reservation and product pricing explicitly account for it.

## Architecture

### Adaptive policy

Add pure, dependency-free helpers to `server/prompt-engine-v2.js`:

- `assessBuilderComplexity(payload)` returns `{ level, highStakes, reasons }`.
- `getBuilderQualityPolicy(payload)` returns the thresholds and depth targets used by prompts and validation.
- `buildDepthDirective(payload)` renders an English or Indonesian instruction block from the policy.

The policy is deterministic. It uses the selected output type, detected domain, attachment presence, narrative length, and signals for applications, audits, legal, finance, healthcare, academic work, presentations, image/video generation, and structured documents.

Policy values:

| Level | Minimum sections | Short-output threshold | Requirements | Constraints | Acceptance criteria |
| --- | ---: | ---: | ---: | ---: | ---: |
| `simple` | 4 of 6 | 280 characters | 3 | 2 | 1 |
| `standard` | 5 of 6 | 450 characters | 5 | 3 | 2 |
| `complex` | 5 of 6 | 650 characters | 7 | 4 | 3 |

`highStakes` does not create a fourth verbosity tier. It adds explicit evidence, uncertainty, verification, and professional-review guardrails.

### Prompt construction parity

Both full and lean MiniMax system prompts receive the adaptive depth directive. The lean prompt-spec path must include domain `outputControls` and `qualityGates`, not only role, requirements, and constraints.

The generated prompt remains one copy-ready prompt. Internal policy metadata, JSON planning objects, and engine labels must not leak into the output.

### Validation

`validatePromptStructure(prompt, policy)` continues checking role, context, task, output format, constraints, and acceptance criteria. It uses `policy.minimumSections` rather than a fixed four-section threshold.

Short-output detection uses `policy.minimumCharacters`. A short or structurally incomplete provider response may receive one repair attempt when serverless time permits. Repair instructions include the missing sections and the adaptive depth targets.

Validation must not reject a concise simple request merely because it is shorter than a complex application specification.

### Domain routing

Replace first-match tie behavior with deterministic weighted scoring. Explicit output types and strong domain phrases outrank incidental words. The detector still returns primary and optional secondary domains, but a legal contract review must prioritize `legal & compliance` over generic `structured document`, and an investor pitch deck must prioritize `presentation planning` while retaining finance as secondary context.

### Streaming recovery

If an OpenRouter streaming primary model fails and at least 12 seconds remain, try the configured fallback models once through the existing non-stream completion helper. If recovery succeeds:

- send one replacement chunk containing the complete fallback prompt;
- continue validation, dialect rendering, quota recording, and the final `done` event;
- return `modelStatus: "fallback-model"` and a user-safe warning.

If no fallback succeeds, preserve the current terminal stream error. MiniMax remains non-streaming and continues using its existing provider path.

### Evaluation

Add a deterministic Builder regression corpus covering at least these domains:

- simple email or caption;
- marketing conversion;
- runnable application;
- presentation;
- structured document;
- legal/compliance;
- finance;
- healthcare;
- academic work;
- image generation;
- video generation;
- attachment-backed analysis.

Tests verify policy classification, primary/secondary domain choice, language, deliverable lock, lean/full depth parity, structure thresholds, and non-generic quality requirements.

The local evaluator must reward coverage and concrete controls but must not reward length after the policy's useful range. It remains explicitly labeled heuristic and is not presented as proof of factual correctness.

## Data and telemetry

Generation responses and usage metadata add:

- `qualityProfile`: `simple`, `standard`, or `complex`;
- `structureScore`: the final six-section coverage score.

No user content, critique text, hidden system prompt, or new personal data is logged.

## Error handling

- Provider failure still falls back to the deterministic local prompt when the non-stream route cannot recover.
- A failed repair or critique pass preserves the best valid prompt already available.
- Streaming recovery never performs more than one fallback-chain attempt.
- Quota persistence remains fail-closed.
- Existing public error messages remain generic and credential-safe.

## Security and privacy

- Preserve secret and PII scrubbing before provider calls.
- Preserve untrusted attachment fencing.
- Do not expose provider credentials, internal prompts, or raw provider errors.
- High-stakes policy adds verification and professional-review language; it does not claim legal, medical, or financial authority.

## Testing and release gates

- Follow red-green TDD for every new helper and behavior change.
- Run focused Builder tests after each task.
- Run `npm test` and `npm run playstore:check` before merge.
- Verify standard and premium Builder requests locally without requiring live provider credentials.
- Confirm source scope contains no Android manifest, TWA, billing, permission, package-name, or version-code changes.
- Push only after merged `main` passes the complete suite.

## Non-goals

- No Builder UI redesign.
- No new model provider or dependency.
- No global multi-candidate generation.
- No change to plan prices or quota limits.
- No online LLM-as-judge dependency in CI.
- No prompt-history analytics or user-content logging.
- No Android App Bundle update.
