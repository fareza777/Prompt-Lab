# Play Store graphics

Generated assets for Google Play **Store listing**.

## Files

| File | Use in Play Console |
|------|---------------------|
| `app-icon-512.png` | **App icon** (512×512 PNG, full-bleed per [Google Play icon spec](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)) |
| `feature-graphic-1024x500.png` | **Feature graphic** (1024×500) |
| `screenshot-phone-*.png` | **Phone screenshots** — 1080×1920 (9:16), PNG, min. 2 upload |

## Regenerate

```bash
npm run build
npm run playstore:assets
```

This runs icon/feature generation and captures phone screenshots from the production build.

The production build enforces raw initial asset budgets of 700 KiB JavaScript and 80 KiB CSS. All emitted JavaScript is counted because the current application loads it on first entry; no lazy-loading claim is made.

## Upload order

1. Store listing → **App icon** → `app-icon-512.png`
2. **Feature graphic** → `feature-graphic-1024x500.png`
3. **Phone screenshots** → upload the six current surfaces: `builder`, `optimizer`, `templates`, `library`, `compare`, and `settings`
