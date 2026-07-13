# PromptLab Onboarding and Play Store ASO Design

Date: 2026-07-13  
Audience: global, English-speaking Android users  
Primary onboarding outcome: users understand PromptLab's complete product workflow

## Executive decision

Replace the current single-screen welcome card with a four-step, skippable Guided Product Map. Teach PromptLab as one connected workflow—create, improve, reuse, and compare—then let users choose account or guest access. Do not require an Android App Bundle for this web-only onboarding release because PromptLab is a Trusted Web Activity (TWA) that loads `https://prompt-lab.xyz/app`.

The public Play Store listing is live and technically valid, but its ASO is only partially optimized. The title is strong. The short description underuses its 80-character allowance. The full description is verbose, repeats keywords, and makes several claims that are broader than the product evidence. Store metadata and screenshots can be updated in Play Console without a new AAB.

## Current-state audit

### Product onboarding

The current `V2Onboarding` is a single card with three points—Generate, Improve, and Sync later—followed by sign-in and guest actions. It correctly distinguishes guest storage from account sync, but it does not explain Templates, Library, Compare, exports, or how the surfaces work together. It is a welcome/auth gate, not a product guide.

Onboarding completion is stored in `localStorage` under `promptlab-onboarded`. Guest mode uses `promptlab-guest`. Settings already provides a way to reset onboarding, so the new guide can preserve the existing persistence model.

### Public Play Store listing

Observed public English (US) listing on 2026-07-13:

- Title: `Prompt generator: Prompt Lab` (28/30 characters)
- Short description: `Prompt generator helps you build and refine AI prompts` (54/80 characters)
- Category: Productivity
- Updated: Jul 11, 2026
- Package: `app.promptlab.twa`

The repo's `playstore/STORE_LISTING.md` is stale and does not match production metadata. This should be corrected so Play Console copy has a version-controlled source of truth.

The existing six screenshots have valid 1080×1920 dimensions and pass the repository readiness checks. Their UI is legible, but they function as raw product captures. They lack benefit-led captions, and Settings is not a high-conversion screenshot. Several screenshots place important controls behind or close to the persistent bottom navigation, which weakens visual clarity.

### Android wrapper

Current native wrapper:

- `versionCode`: 7
- `versionName`: 1.0.6
- `applicationId`: `app.promptlab.twa`
- `startUrl`: `/app`
- `targetSdkVersion`: 35
- Play Billing enabled
- Digital Asset Links readiness check passes

## Onboarding design

### Pattern

Use four full-screen steps inside the existing V2 visual system. Each step contains one short headline, one sentence, a compact product illustration or UI crop, progress dots, `Skip`, and a primary `Next` action. Keep the full sequence under 45 seconds. Swiping is optional; buttons and keyboard controls are required.

### Step 1 — From rough idea to ready prompt

Eyebrow: `CREATE`  
Headline: `Turn any idea into a model-ready prompt.`  
Body: `Start with a rough request, screenshot, image, or document. Builder structures the role, context, constraints, and output.`  
Visual: a rough request transforming into a structured prompt.  
Primary action: `Show me how`

This step establishes the core value and explains Builder without naming every implementation detail.

### Step 2 — Improve and verify

Eyebrow: `IMPROVE`  
Headline: `Strengthen prompts before you send them.`  
Body: `Use Optimizer to improve clarity and detail, then check readiness scores and compare versions side by side.`  
Visual: a weak prompt, an improved prompt, and a score change.  
Primary action: `Next`

This combines Optimizer and Compare into one understandable job: quality control.

### Step 3 — Start faster and reuse what works

Eyebrow: `REUSE`  
Headline: `Build a prompt system, not a pile of drafts.`  
Body: `Start from Templates, save strong results to Library, and reuse them across future work.`  
Visual: Template → Builder → Library flow.  
Primary action: `Next`

This explains Templates and Library as parts of a repeatable workflow.

### Step 4 — Choose how to begin

Eyebrow: `READY`  
Headline: `Explore now. Sync when you're ready.`  
Body: `Guest drafts stay on this device. A free account enables AI generation and syncs your library, quota, and membership.`  
Primary action: `Create free account`  
Secondary action: `Continue as guest`

Do not place pricing or an upgrade pitch in onboarding. Membership remains discoverable in Settings after the user understands the product.

### Navigation and persistence

- `Skip` is visible on steps 1–3 and goes directly to step 4.
- Back navigation is available on steps 2–4.
- Progress is represented as `1 of 4` plus visual dots for accessibility.
- Finishing or choosing guest/account sets `promptlab-onboarded=1` using the current mechanism.
- Closing or refreshing mid-guide does not mark onboarding complete.
- Existing signed-in users bypass onboarding.
- Reset onboarding in Settings remains supported.
- Reduced-motion users receive instant transitions.

### Error and edge behavior

- The guide contains no network-dependent content; all illustrations ship with the web app.
- If `localStorage` is unavailable, onboarding may reappear, but account and guest actions must still work.
- Auth configuration failure leaves `Continue as guest` available and explains that account sign-in is temporarily unavailable.
- Long English strings must fit at 320 CSS pixels without horizontal scrolling.

### Measurement

Track privacy-safe product events if analytics exists:

- `onboarding_viewed` with step number
- `onboarding_skipped` with source step
- `onboarding_completed` with `guest` or `account`
- `first_surface_opened`
- `first_prompt_generated`

Primary metric: onboarding completion with all four steps viewed.  
Guardrails: guest/account CTA success rate, first prompt generation rate, and day-1 return rate.  
Initial success target: at least 65% completion and no more than a 10% relative decline in first prompt generation versus the current screen.

## ASO design

### Verdict

ASO status: **good foundation, not yet finished**.

Strengths:

- The public title begins with the high-intent phrase `Prompt generator` and remains within the 30-character limit.
- Category and core positioning match the product.
- Six phone screenshots, app icon, feature graphic, privacy URL, and Digital Asset Links are present.
- The description covers the core feature set and relevant AI-tool use cases.

Problems:

- Short description uses only 54 of 80 characters and omits differentiators such as files, optimization, and templates.
- Full description is much longer than necessary and repeats `prompt generator` concepts.
- Claims about PDF export, Microsoft 365 integration, real-time synchronization, configurable timeouts, and offline behavior are not all clearly supported as user-facing capabilities. These should be removed or narrowed before a policy or trust issue appears.
- Repo listing copy differs from the public listing, creating release drift.
- Screenshots show surfaces but do not tell a benefit-led story in the first three frames.
- `Settings` should not occupy a primary screenshot slot unless subscription/privacy controls are a major conversion concern.

### Recommended metadata

Title (keep):

`Prompt generator: Prompt Lab`

Short description (76 characters):

`Build, optimize, compare, and save AI prompts from ideas, images, and files.`

Full description:

```text
Turn rough ideas into clear, structured prompts for ChatGPT, Claude, Gemini, Grok, and creative AI tools.

Prompt Lab brings prompt creation, improvement, and reuse into one focused workspace.

BUILD PROMPTS FROM REAL CONTEXT
• Transform notes and rough requests into structured prompts
• Add images, screenshots, and supported documents for context
• Choose a target AI and define the output you need

IMPROVE PROMPT QUALITY
• Refine an existing prompt for clarity, detail, or impact
• Check readiness across context, format, constraints, and actionability
• Compare two versions before choosing which one to use

START FASTER AND REUSE YOUR BEST WORK
• Begin with practical prompt templates
• Save prompts to your personal library
• Organize, edit, duplicate, and reuse successful prompts

WORK YOUR WAY
Explore as a guest with drafts stored on your device. Create a free account when you want AI generation and cross-device library, quota, and membership sync.

Prompt Lab is designed for creators, students, marketers, developers, and anyone who wants more useful results from AI without rewriting every instruction from scratch.
```

This copy is concise, readable on mobile, and limited to claims visible in the audited product.

### Screenshot sequence

Use five primary screenshots; retain Settings as an optional sixth:

1. Builder — `Turn rough ideas into structured AI prompts`
2. Optimizer — `Improve clarity, detail, and impact in one pass`
3. Templates — `Start faster with reusable prompt patterns`
4. Compare — `Choose the stronger prompt before you send it`
5. Library — `Save, organize, and reuse what works`
6. Optional Settings — `Manage sync, privacy, and membership`

Add caption bands outside the app UI rather than covering controls. Keep each caption under eight words where possible, use the existing dark teal identity, and make the first three screenshots understandable at thumbnail size.

### ASO operations

- Update the version-controlled listing document to match Play Console.
- Add an Indonesian localization later only after the English listing has conversion data; global English remains default.
- Run a Play Store listing experiment on the short description or first screenshot, one variable at a time.
- Review Play Console acquisition reports after 14–28 days; do not infer success from rankings alone.
- Target semantic relevance and conversion, not repeated keyword density.

## AAB decision matrix

### No new AAB required

- Four-step onboarding implemented only in the hosted React app
- Copy, layout, CSS, or web assets under `src/` / `public/`
- Play Store title, short description, full description, screenshots, icon, or feature graphic
- Server/API fixes that do not alter native permissions or wrapper behavior

For these changes: deploy the web app, run production smoke tests, and update the store listing in Play Console.

### New AAB required

- Changing Android permissions, notification behavior, orientation, package ID, native splash, launcher resources, shortcuts, or TWA configuration
- Changing Play Billing native integration or Android dependencies
- Updating `targetSdkVersion`, `minSdkVersion`, `versionCode`, or `versionName`
- Releasing a native wrapper fix that installed users must receive through Play

Any new AAB must use a `versionCode` greater than 7. Recommended next release values are `versionCode 8` and `versionName 1.0.7`.

### Recommendation for this release

Do **not** build a new AAB solely for onboarding or ASO. Ship the onboarding as a web deployment and update Play Console metadata/assets separately. Build version 1.0.7 (code 8) only if the release also needs a native wrapper change or if Play Console indicates that the currently published artifact differs from the audited code 7 bundle.

## Verification requirements

Before deployment:

- Unit-test onboarding persistence, skip/back/finish behavior, and signed-in bypass.
- Test at 320×568, 360×640, 390×844, and desktop widths.
- Verify keyboard focus, screen-reader labels, reduced motion, and no horizontal overflow.
- Confirm guest and account CTAs still enter the correct existing flows.
- Run the repository test suite and `npm run playstore:check`.
- Manually install the production Play Store version and verify the TWA opens `/app` without a browser URL bar.
- Confirm public metadata matches the version-controlled listing after Play propagation.

## Scope boundary

This design does not add pricing experiments, push-notification onboarding, a mandatory tutorial task, new analytics infrastructure, or native Android changes. Those are separate releases and are not required to solve product comprehension or current ASO drift.
