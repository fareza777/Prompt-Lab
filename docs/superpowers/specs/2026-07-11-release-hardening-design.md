# PromptLab Release Hardening Design

## Goal

Make the repository safe to submit to the Play Store by fixing the audited release blockers in code, tests, Android source control, and release artifacts. Vercel, Supabase, Google Cloud, and Play Console values remain external operator responsibilities and are documented rather than invented.

## Boundaries

The work is split into four independently testable phases:

1. Repair the failing SEO release gate and make the Android wrapper source reproducible in Git without adding local secrets or build outputs.
2. Harden request identity/rate limiting, quota accounting, attachment privacy, provider timeouts, and billing persistence.
3. Make prompt-quality claims measurable, fix the mobile navigation/a11y defects, and reduce initial client work without changing the Builder task flow.
4. Pin vulnerable dependencies, create a CI release gate, regenerate Play Store assets from the current UI, and document required external configuration.

## Decisions

- A local heuristic score must never receive a score uplift merely because an Optimizer mode was selected. The UI labels local scoring as heuristic and identifies the source.
- Rate-limit identity comes from the verified server user id when available; otherwise from Express's resolved IP. Arbitrary client identity headers are not accepted. A pluggable durable HTTP KV adapter is used only when its explicit environment variables are configured, with a bounded in-memory fallback for local development.
- Quota reservation is a single Supabase RPC operation. Generation streams must not return a completed response if usage cannot be recorded.
- Attachment text is scrubbed and fenced as untrusted reference content before it reaches a provider. Limits cover both upload bytes and extracted text.
- Google Play and Lemon Squeezy membership mutations are idempotent and checked for persistence errors. Purchase token identifiers use SHA-256, never a custom non-cryptographic fingerprint.
- The mobile navigation uses only V2 styles and has exactly the number of rendered columns. Native controls retain visible keyboard focus and semantic selected states.
- Android wrapper source is tracked, but local properties, keystores, Gradle caches, and build outputs stay ignored.

## Non-goals

- Do not rotate credentials, configure Vercel/Supabase/Google Cloud, submit a Play Console release, or claim physical-device billing passed; those require the account owner.
- Do not redesign the Builder information architecture or change product pricing.
- Do not migrate the application to TypeScript in this hardening pass.

## Acceptance criteria

- `npm test`, `npm run build`, `npm run playstore:check`, and `npm audit --omit=dev --audit-level=high` complete without a failing release gate.
- Unit tests prove rate-limit identity, score integrity, PII/attachment fencing, quota persistence failure handling, and Play token hashing behavior.
- Current Play screenshots and feature graphic are generated after the UI fixes and show no stale navigation/copy or clipped text.
- The repository contains Android wrapper source needed for a build but not signing material or environment files.
- An operator runbook lists exact required external environment variables and Play Console checks.
