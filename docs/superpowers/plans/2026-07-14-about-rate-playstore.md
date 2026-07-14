# About and Play Store Rating Implementation Plan

> **For Codex:** Execute this plan task by task using test-driven development, then run the complete verification matrix before merging.

**Goal:** Add a polished About tab to Settings with product education, trust links, and one canonical Google Play rating action.

**Architecture:** Keep release metadata and workflow content in a small dependency-free module. Render the About experience from a focused React component and connect it to the existing Settings tab system. Extend the existing visual language in `src/styles.css`; do not add packages or native Android changes.

**Tech Stack:** React, Vite, Lucide React, native CSS, Node test runner.

---

## Task 1: Lock the Play Store contract in tests

**Files:**
- Create: `test/about-app.test.js`
- Create: `src/aboutApp.js`

1. Write a failing test that imports `PLAY_STORE_PACKAGE_ID`, `PLAY_STORE_LISTING_URL`, and `ABOUT_WORKFLOW` from `src/aboutApp.js`.
2. Assert the package ID is exactly `app.promptlab.twa`, the listing URL is the canonical HTTPS Google Play URL, and no `market://` or `intent://` scheme appears.
3. Assert the workflow exposes the ordered labels `Build`, `Improve`, `Compare`, and `Reuse` with non-empty descriptions.
4. Run `node --test test/about-app.test.js` and confirm failure because the module does not exist.
5. Implement the smallest dependency-free constants module needed to pass.
6. Run `node --test test/about-app.test.js` and confirm green.

## Task 2: Add the About UI contract

**Files:**
- Modify: `test/about-app.test.js`
- Create: `src/aboutPanel.jsx`
- Modify: `src/main.jsx`

1. Extend the test to read `src/main.jsx` and `src/aboutPanel.jsx` as text.
2. Assert Settings includes `About`, an `Info` icon, and an About tabpanel.
3. Assert the panel uses `/icons/icon-512.png`, `Rate Prompt Lab`, the canonical exported Play URL, `/privacy`, `/privacy/delete-account`, and `mailto:support@prompt-lab.xyz`.
4. Assert the Play anchor uses `_blank` and `noreferrer`, and the new source contains no native market or intent scheme.
5. Run the focused test and confirm failure before UI implementation.
6. Create `AboutPanel` with an identity area, connected four-step workflow, one rating CTA, and compact trust links. Use semantic headings, list markup, an informative icon alt, and Lucide icons.
7. Import and mount `AboutPanel` as the sixth Settings tab. Preserve the existing keyboard navigation logic and tab/tabpanel linkage.
8. Run the focused test and confirm green.

## Task 3: Build the premium responsive presentation

**Files:**
- Modify: `src/styles.css`
- Modify: `test/about-app.test.js`

1. Add source-contract assertions for the key About class names and reduced-motion handling.
2. Run the focused test and confirm failure.
3. Add an asymmetric desktop identity layout, a sparse connected workflow, a focused teal Play CTA, and understated trust links using existing design tokens.
4. Add explicit breakpoints for tablet/mobile and 320px safety. Keep action text on one line and prevent horizontal overflow.
5. Add restrained transform/opacity interactions and disable them under `prefers-reduced-motion`.
6. Run the focused test and confirm green.

## Task 4: Verify behavior and release safety

**Files:**
- Verify only; fix scoped regressions if discovered.

1. Run `npm test`.
2. Run `npm run build`.
3. Run `npm run playstore:check`.
4. Start the built app locally and inspect Settings > About at 320, 360, 390, 768, and desktop widths.
5. Verify keyboard tab navigation reaches About, links have visible focus, the Play link opens the canonical listing, and no horizontal overflow occurs.
6. Run the design pre-flight: icon system, one accent, responsive layout, real app icon, no duplicate CTA, no visible em dash, no invented metrics, no unapproved dependencies, and reduced motion.
7. Review the diff for scope: web-hosted files only, no Android manifest, TWA, billing, permissions, package name, or version-code changes.

## Task 5: Integrate and synchronize

1. Commit the implementation on `codex/about-rate-playstore`.
2. Merge it into local `main` without touching unrelated dirty files.
3. Re-run the focused test on merged `main`.
4. Push `main` to `origin` if the remote remains a safe fast-forward.
5. Confirm that no new AAB is needed because only hosted web assets changed.
