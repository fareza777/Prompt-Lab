# Evidence

## Repository and release parity

- Local `HEAD` is clean and identical to `origin/main` at `e5ccfc1`.
- The current overhaul spans `f4ab5a0..e5ccfc1`: single-canvas rebuild, onboarding, in-app prompt execution, reasoning-output cleanup, and time-budget patches.
- The full suite passes: 228/228 tests. However, the Play asset tests still define the old five-tab UI as current (`test/playstore-assets.test.js:31-76`).
- The screenshot generator still hardcodes Builder, Optimizer, Templates, Library, and Compare and waits for `.v2-*` selectors (`scripts/capture-playstore-screenshots.mjs:14-16,48-64,138-143,187-220`).
- The active UI explicitly replaces those destinations with a single canvas and sheets (`src/ui/Shell.jsx:17-21,263-388`).
- The live Play listing was updated 23 July 2026 and still describes prompt creation/improvement/reuse; the web-delivered overhaul landed 25–26 July. The listing shows 50+ downloads.
- The committed Builder screenshot shows the old dark five-tab dashboard; its bottom navigation overlaps the captured content around x=190–890, y=1669–1785.

## Structure and primary flow

- Returning-user empty canvas has 15 visible interactive elements: skip link, three header buttons, textarea, file input, Create, Advanced, See all, and six starter rows (`src/ui/Shell.jsx:263-386`, `src/ui/Composer.jsx:68-139`, `src/ui/Starters.jsx:65-81`).
- The six starter buttons repeat one affordance five times beyond the first (`src/ui/Starters.jsx:20-32,74-81`).
- Fresh install replaces the canvas with a mandatory two-button language gate, followed by a four-screen tour (`src/ui/FirstRun.jsx:22-43,92-137`; `src/ui/Shell.jsx:249-260`).
- Tour “Skip” and “Start now” duplicate the same exit action (`src/ui/FirstRun.jsx:150-152,208-211`).
- Component depth is controlled: `App → Shell → Composer → Field` / `Starters → StarterRow`; rendered DOM depth measured 9.
- No dead props or unused imports were found in the primary UI files.

## Product-model and copy mismatch

- The first CTA says “Mau dibuatkan apa?”, “Buatkan”, and “Sedang menyusun dokumenmu”, then labels the response “Hasil” (`src/ui/i18n.js:35-41,62,90-92`).
- That CTA only calls `/api/generate-prompt` and stores `data.prompt` (`src/ui/Shell.jsx:167-172,327-349`; `src/main.jsx:2155-2198`).
- The finished deliverable is a second operation, “Jalankan sekarang”, through `/api/run-prompt` (`src/ui/Result.jsx:146-159`; `src/main.jsx:2260-2287`).
- This creates two content identities inside one result card—Prompt and Finished Result—while action meanings depend on the selected tab (`src/ui/Result.jsx:99-139,167-229`).
- Improve and Compare only act on the prompt, although their labels do not consistently say so (`src/ui/Result.jsx:183-205`; `src/ui/Shell.jsx:181-200,432-455`).
- The execution feature required three follow-up corrective commits (`da1f88b`, `76265f2`, `e5ccfc1`). Its final directive tells the model to invent missing facts and mark them in brackets (`server/index.js:1102-1127`), evidence that a prompt designed as a brief is being executed without the real inputs it expects.

## Functional honesty and content identity

- Save stores whichever tab is visible, but every saved item is treated as a prompt; reopening a saved finished result puts it back into prompt state (`src/ui/Result.jsx:99-100,168-180`; `src/main.jsx:1572-1603`; `src/ui/Shell.jsx:208-215`).
- “Laporkan hasil ini” always reports the prompt even when the user is viewing the finished result (`src/ui/Result.jsx:238-242`; `src/ui/Shell.jsx:465-470`; `src/ui/Report.jsx:28-40`).
- “Sisa kuota” renders `used / limit`, which is usage, not remaining quota (`src/ui/i18n.js:148`; `src/main.jsx:170-175`; `src/ui/Account.jsx:217-220`).
- “Tingkatkan paket” calls an upgrade handler without selecting the required plan (`src/ui/Account.jsx:229-237`; `src/main.jsx:1859-1890,1985-2036`).
- The AI notice is unconditional even when the server returns a local fallback (`src/ui/Result.jsx:141-144`; `server/index.js:1611-1633`).
- “PromptLab sudah memilih yang paling umum” is unsupported; defaults are simply hardcoded to Marketing, Professional, ChatGPT, and Word Document (`src/ui/i18n.js:54-55`; `src/main.jsx:1189-1200`).
- No classic dark pattern was confirmed. Trial state is visible and signup is not intentionally forced before the guest allowance (`src/ui/Shell.jsx:228-235,315-359`).

## Visual system

- Current live app at 390×844 has a quiet dark single canvas with one teal accent, clear top bar, request card, Advanced disclosure, and starter list.
- Its hierarchy is coherent but visually over-muted: faint tagline and placeholder are difficult to read, the Advanced grid clips “Word document” at mobile width, and the large empty request card plus long starter list makes the first screen feel generic rather than outcome-led.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px (`src/ui/tokens.css:79-89`).
- Type scale: 12, 13, 15, 17, 20, 24, 30px (`src/ui/tokens.css:64-70`).
- The shared light/dark token file references 40 unique six-digit hex values (`src/ui/tokens.css:15-52,115-184`).
- Muted body text passes AA: 4.86:1 light and 6.16:1 dark. Faint text fails normal-text AA: 2.59:1 light and 3.54:1 dark; faint is used for the app tagline and placeholder (`src/ui/shell.css:48-52`; `src/ui/base.css:246-249`).
- The shipped store screenshots use a materially different neon/grid/glass visual language from the active paper canvas. The expectation gap is therefore part of the user experience, not merely stale documentation.

## States and accessibility

- Empty, loading, error, success, focus, and disabled states are all represented in source (`src/ui/History.jsx:71-76`; `src/ui/Result.jsx:89-93,157-164,232-235`; `src/ui/Composer.jsx:65-66,185-198`).
- Normal app includes a skip link, header, and main landmark (`src/ui/Shell.jsx:263-306`). The skip link is absent while first run replaces the shell.
- Sheets move focus inside, trap Tab/Shift+Tab, close on Escape, and restore the opener (`src/ui/Sheet.jsx:25-73`).
- Primary controls are native buttons, inputs, and selects. Source-level accessibility/first-run tests pass 12/12, but several are regex assertions rather than end-to-end keyboard checks (`test/ui-first-run.test.js:20-27,103-115`).
- The first language screen is not actually skippable even though the broader first-run source contains Skip/Start-now controls (`src/ui/FirstRun.jsx:92-137`).
- Idle canvas has no looping animation. Loading uses a spinner plus progress track; reduced motion is globally honored (`src/ui/shell.css:432-446,1025-1048`; `src/ui/base.css:323-333`).

## Weight and friction

- Initial entry graph: 596,252 raw JS bytes / 177,813 encoded bytes measured locally; build budget reports 581.8 KiB. Admin’s dynamic chunk is excluded (`vite.config.js:15-45`).
- Initial preview load made 12 requests: document, SEO script, CSS, six JS chunks, health fetch, and two icons.
- Local desktop TTI estimate was about 370ms; this is not Android field performance.
- Build output includes a 954.08kB `index.html`, 581.8KiB initial JS budget, and 21.7KiB initial CSS.
- Current idle surface has zero looping animations, but initial bundle size places it in the audit rubric’s 500KiB–2MiB band.

## Known gaps

- No paid-plan, authenticated, attachment, or production AI generation was executed to avoid consuming quota or transmitting files.
- TTI was measured on local desktop, not a throttled physical Android TWA.
- TalkBack, font scaling, real sequential Tab order, and screen-reader announcements were not tested on a physical device.
