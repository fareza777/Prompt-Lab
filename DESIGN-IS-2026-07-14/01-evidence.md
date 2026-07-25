# Evidence

## Product and listing

- The live listing is `app.promptlab.twa`, version 1.0.6, updated 11 July 2026, with 50+ downloads and in-app purchases. The public listing still links the old `promptlab-six-phi.vercel.app` website/privacy URLs; the repository declares `https://prompt-lab.xyz` in `playstore/STORE_LISTING.md:9-15` and `android-app/twa-manifest.json:2-17`.
- Fresh checks of both Indonesian and English listing locales show the live full description now matches the supportable product scope in `playstore/STORE_LISTING.md:25-48`; it does **not** contain Microsoft 365, PDF generation, realtime, or broad offline claims. An earlier stale HTML response containing old copy was discarded from the audit.
- The remaining public metadata mismatch is the support website/privacy domain: the live HTML still references `promptlab-six-phi.vercel.app`, while the repository and TWA use `https://prompt-lab.xyz` in `playstore/STORE_LISTING.md:9-15` and `android-app/twa-manifest.json:2-17`.
- Live media is a landscape screenshot set and promo video. The local portrait set is not yet safe to upload: visual inspection found missing Search/avatar glyphs in the current Optimizer and Library frames. Sources: `playstore/assets/screenshot-phone-optimizer.png` and `playstore/assets/screenshot-phone-library.png`.
- Public Data Safety says photos/videos, files/documents, app activity, and personal information may be collected/shared, encryption in transit is enabled, and deletion is available. This broadly matches `public/privacy/index.html:40-90` and `public/privacy/delete-account/index.html:42-105`, but the Play Console processor-purpose answers were not available for inspection.

## Structure and usefulness

- All six primary destinations are directly routable from the shell: `src/main.jsx:3012-3018,5292-5307`.
- Runtime mobile interactive counts were Builder 41, Optimizer 20, Templates 33, Library 21, Compare 15, Settings 19. Builder has 39 keyboard-reachable controls in the guest state.
- The default Builder exposes 24 category/tone/model/output chips before its primary action: `src/main.jsx:3438-3524,5231-5240`.
- Five primary destinations are duplicated between desktop sidebar and mobile bottom navigation; five Settings destinations are duplicated between desktop and mobile tablists; Save/Copy repeat inside Builder: `src/main.jsx:2956-2963,3529-3534,3713-3718,4450-4465,5267-5308`.
- Maximum representative component nesting is nine levels from shell content to chip button. Most state and six product surfaces remain in `src/main.jsx`, currently more than 6,200 lines.

## Accessibility and interaction details

- Strong foundations: 44-48px mobile targets (`src/styles.css:2677-2687,2835-2840,1436-1442`), global focus-visible treatment (`src/styles.css:4975-4978`), reduced-motion support (`src/styles.css:5180-5193`), semantic Settings tabs (`src/main.jsx:4450-4468`), and modal focus trapping/restoration (`src/commandPalette.jsx:31-59,97-131`).
- File attachment is not keyboard reachable because the file input is `display:none` and its label is not focusable: `src/main.jsx:3498-3502`, `src/styles.css:1397-1399`.
- Optimizer, Templates, Library, and Compare rely on placeholders or visual text rather than persistent associated labels: `src/main.jsx:3781-3789,3982-3994,4073,4107-4114,4220-4226`.
- Mobile Search has no accessible name, bottom navigation has no `aria-label`/`aria-current`, and there is no skip link: `src/main.jsx:2999-3019,3256-3260,5292-5307`.
- `--fg-faint` measures roughly 2.8:1 against the dark fallback surfaces and fails WCAG AA; token source `src/styles.css:27-50`.
- There is no axe/Lighthouse accessibility test or physical TalkBack/font-scaling evidence.

## Reliability, performance, and Android

- `node --test test/*.test.js`: 154/154 passed. `npm audit --omit=dev --audit-level=high`: zero vulnerabilities. `npm run playstore:check`: all PWA and Digital Asset Links checks passed.
- Production build passed. Initial raw assets are 605.4 KiB JavaScript and 74.4 KiB CSS; emitted gzip totals are about 185 KiB JavaScript and 15.5 KiB CSS. The current raw CSS budget is already 93% consumed.
- `npm run test:smoke -- https://prompt-lab.xyz/app` could not start because the installed Playwright version has no matching Chromium binary. CI in `.github/workflows` does not install Chromium or run `test:smoke`.
- Android `lintRelease bundleRelease` succeeded, but lint reported 19 warnings: locked portrait orientation, an exported billing service without a manifest permission, full-bleed launcher icons, missing monochrome launcher icon, duplicate notification/launcher icons, and unused resources. Sources: `android-app/app/build/reports/lint-results-release.xml`; release lint is disabled in `android-app/app/build.gradle:181-182`.
- There are no Android unit or instrumentation test sources under `android-app/app/src/test` or `android-app/app/src/androidTest`.
- Baseline security headers are live, but no Content-Security-Policy header is configured in `vercel.json`. Upload filtering accepts either declared MIME or filename extension and does not verify file magic: `server/index.js:111-142`.

## Copy honesty and destructive actions

- In-app heuristic provenance is substantially honest: Builder uses “Heuristic score” and compare distinguishes provider from local scoring (`src/main.jsx:3446-3449`; `src/compareProvenance.js:1-6`).
- Landing claims “Perfect Prompt”, “production-ready”, “expert-level context automatically”, and unconditional “bias mitigation”: `src/LandingPage.jsx:34-43,58-79`. These are broader than the heuristic/provider behavior.
- “Copy My Data” exports only account/library/custom templates, “Clear Local Profile” does not clear all local workspace data, and a card still says “future account sync” although sync exists: `src/main.jsx:4425-4432,4714-4785`.
- Library deletion and Clear Local Profile have no undo/confirmation: `src/main.jsx:2098-2101,4429-4432,4127,4752`. Permanent account deletion does use confirmation and typed `DELETE`: `src/main.jsx:1770-1800`.

## Known gaps

- No signed-in Pro/Business generation, Play purchase/restore/refund, physical-device TWA, TalkBack, font scaling, detailed Play Console Data Safety form, or competitor benchmark was executed.
- Current uncommitted marketing-asset changes were inspected but not modified.
