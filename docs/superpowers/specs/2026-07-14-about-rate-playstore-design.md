# PromptLab About and Play Store Rating Design

Date: 2026-07-14

## Decision

Add an `About` tab to the existing Settings surface. It will explain what PromptLab is, show the product workflow, provide support and privacy links, and offer one primary `Rate Prompt Lab` action linking to the official Google Play listing for `app.promptlab.twa`.

This is a hosted React change inside the existing TWA. It does not require a new Android App Bundle.

## Design direction

Reading this as an in-product About surface for global English Play Store users, with a dark-tech editorial language that preserves PromptLab's existing visual system.

- `DESIGN_VARIANCE: 7`
- `MOTION_INTENSITY: 4`
- `VISUAL_DENSITY: 4`
- Theme: existing PromptLab dark theme
- Accent: existing teal only
- Shape rule: current card radius for surfaces, current button radius for actions
- Icons: existing Lucide family already used throughout the app
- No new UI library, font, animation package, or image asset

## Information architecture

The Settings tabs become:

1. Account
2. Membership
3. Prompt Defaults
4. Data & Privacy
5. Support
6. About

About remains inside the authenticated or guest app shell. No public `/about` route is added.

## About surface

### Identity panel

Use the real PromptLab app icon from `/icons/icon-512.png` beside concise copy:

- Label: `About PromptLab`
- Headline: `Better prompts start with better structure.`
- Body: `PromptLab turns rough ideas, screenshots, images, and supported files into prompts you can improve, compare, save, and reuse.`

The icon is content, not decoration, so it receives the alt text `PromptLab app icon`. The panel uses an asymmetric two-column composition on desktop and collapses to a single column below 768px.

### Product workflow

Show four connected jobs using existing icons and sparse dividers rather than four generic cards:

- `Build` - Turn an idea or file into a structured prompt.
- `Improve` - Refine clarity, detail, constraints, and output format.
- `Compare` - Check two prompt versions before choosing one.
- `Reuse` - Save templates and successful prompts in Library.

The workflow is informational. It does not simulate product UI or display invented metrics.

### Rating call to action

Use one visually dominant CTA block:

- Heading: `Enjoying PromptLab?`
- Body: `A quick Google Play review helps more people discover better prompt workflows.`
- Primary action: `Rate Prompt Lab`

The action uses the canonical HTTPS listing URL:

`https://play.google.com/store/apps/details?id=app.promptlab.twa`

Use a normal anchor with `target="_blank"` and `rel="noreferrer"`. Android App Links may hand the URL to Google Play; browser users receive the web listing. Do not use `market://`, custom intent URLs, review gating, or sentiment screening.

The CTA must not claim that the review is five stars, offer a reward, or request only positive reviews.

### Trust links

Provide three compact actions:

- `Privacy Policy` to `/privacy`
- `Delete Account` to `/privacy/delete-account`
- `Contact Support` to `mailto:support@prompt-lab.xyz`

External behavior and destinations are visible in accessible labels. Existing legal copy remains unchanged.

## Interaction and accessibility

- About participates in the existing Settings tab keyboard navigation.
- The panel has a matching `role="tabpanel"` and `aria-controls` relationship.
- Google Play and legal links are anchors, not buttons.
- Focus-visible treatment uses the existing global focus style.
- The app icon has fixed dimensions to prevent layout shift.
- Hover motion uses only transform and opacity, and is disabled under `prefers-reduced-motion`.
- All CTA labels remain on one line at desktop widths.
- The layout must not overflow at 320 CSS pixels.

## Error and offline behavior

No network request is made while rendering About. If the Play Store cannot open, browser-native link behavior remains the fallback. Privacy pages and support email remain ordinary links, so there is no custom loading or error state.

## Testing

- Test the canonical package ID and listing URL through a pure exported constant or helper.
- Source-contract test the new Settings tab, tabpanel, real icon path, rating CTA, and trust links.
- Verify no `market://` or custom Android intent URL is introduced.
- Test keyboard navigation continues to include all Settings tabs.
- Build and run the full test suite.
- Verify the About layout at 320, 360, 390, 768, and desktop widths.
- Run `npm run playstore:check` after implementation.

## Release decision

Deploy this change through the hosted web app. No AAB update is required because the package, native resources, permissions, billing integration, TWA configuration, and version code remain unchanged.

## Scope boundary

This release does not add a public About route, in-app review API, analytics events, rewarded reviews, app version display, changelog, social links, or a native Play Core dependency.
