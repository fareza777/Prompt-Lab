# Play Store graphics

Generated assets for Google Play **Store listing**.

## Files

| File | Use in Play Console |
|------|---------------------|
| `app-icon-512.png` | **App icon** (512×512 PNG, full-bleed per [Google Play icon spec](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)) |
| `feature-graphic-1024x500.png` | **Feature graphic** (1024×500) |
| `screenshot-phone-*.png` | **Phone screenshots** — 1080×1920 marketing frames (headline + phone mockup) |
| `raw/screenshot-phone-*.png` | Raw UI captures used as framing source |

## Premium sources (preferred)

If present, `npm run playstore:assets` uses these instead of the SVG fallback:

| Source | Output |
|--------|--------|
| `sources/app-icon-source.png` | `app-icon-512.png` (512×512, full-bleed, no rounded corners) |
| `sources/feature-graphic-source.png` | `feature-graphic-1024x500.png` (1024×500) |

## Regenerate

```bash
npm run build
npm run playstore:assets
```

Or frame only (from `raw/`):

```bash
npm run playstore:frame
```

This runs icon/feature generation, captures phone screenshots into `raw/`, then frames them with marketing headlines.

The production build enforces raw initial asset budgets of 700 KiB JavaScript and 80 KiB CSS. All emitted JavaScript is counted because the current application loads it on first entry; no lazy-loading claim is made.

## Upload order

1. Store listing → **App icon** → `app-icon-512.png`
2. **Feature graphic** → `feature-graphic-1024x500.png`
3. **Phone screenshots** → upload the six result-first surfaces: `workspace`, `result`, `advanced-controls`, `history`, `account`, and `guide`
