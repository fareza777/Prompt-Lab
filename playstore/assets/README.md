# Play Store graphics

Generated assets for Google Play **Store listing**.

## Files

| File | Use in Play Console |
|------|---------------------|
| `app-icon-512.png` | **App icon** (512×512) |
| `feature-graphic-1024x500.png` | **Feature graphic** (1024×500) |
| `screenshot-phone-*.png` | **Phone screenshots** (min. 2, recommend 4–5) |

## Regenerate

```bash
npm run build
npm run playstore:assets
```

This runs icon/feature generation and captures phone screenshots from the production build.

## Upload order

1. Store listing → **App icon** → `app-icon-512.png`
2. **Feature graphic** → `feature-graphic-1024x500.png`
3. **Phone screenshots** → upload `screenshot-phone-builder.png`, `optimizer`, `templates`, `library` (and others if needed)
