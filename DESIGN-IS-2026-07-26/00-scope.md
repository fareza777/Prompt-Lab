# Scope

## Audited surfaces

- Local repository `E:\apps\promptlab` at `e5ccfc1` on `main`.
- Remote parity: local `HEAD` and `origin/main` are identical (`0/0` ahead/behind after fetch).
- Live mobile web app at `https://prompt-lab.xyz/app`, inspected at a 390×844 viewport.
- Live Google Play listing for package `app.promptlab.twa`.
- Committed Play Store screenshots and screenshot-generation pipeline.
- Primary flow: first run → request/file input → prompt generation → prompt execution → save/improve/compare/export/history/report.

## Primary user and task

Primary user: Indonesian mobile users—students, creators, marketers, developers, and small-business operators—who start with a rough request or file.

Primary task: turn rough material into a usable work output with the fewest decisions and without requiring prompt-engineering knowledge.

## Constraints

- The Android package is already live; preserve the package, PromptLab name equity, billing, auth, quota, history, attachment processing, and generation engine.
- React/Vite PWA delivered through a Trusted Web Activity.
- Indonesian-first, English supported.
- Accessibility floor: WCAG AA, keyboard operability, reduced motion, and Android TalkBack/font-scale verification.
- This audit recommends product and interaction direction; it does not implement code.

## Inputs

- Current source, tests, Git history, local production build, live app, live Play listing, and committed store assets.
- No competitor design was supplied. The audit therefore evaluates internal coherence and shipped expectations rather than visual similarity to a reference product.
