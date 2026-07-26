# Play Store graphics

Generated assets for Google Play **Store listing**.

## Files

| File | Use in Play Console |
|------|---------------------|
| `app-icon-512.png` | **App icon** (512×512 PNG, full-bleed) |
| `feature-graphic-1024x500.png` | **Feature graphic** (1024×500) |
| `screenshot-phone-*.png` | **Phone screenshots** — 1080×1920 3D marketing frames |
| `raw/screenshot-phone-*.png` | Raw UI captures used as framing source |

## Current phone set (8)

Fresh captures from the current GUI, framed with side-angle 3D + Indonesian promo copy:

1. `screenshot-phone-language.png` — pilih bahasa
2. `screenshot-phone-auth.png` — masuk / tamu
3. `screenshot-phone-tour.png` — onboarding workflow
4. `screenshot-phone-workspace.png` — composer / buat hasil
5. `screenshot-phone-result.png` — hasil kartu buka-tutup + export
6. `screenshot-phone-history.png` — riwayat
7. `screenshot-phone-account.png` — akun & tampilan
8. `screenshot-phone-guide.png` — panduan

## Regenerate

```bash
npm run build
npm run playstore:assets
```

Or frame only (from `raw/`):

```bash
npm run playstore:frame
```

## Upload order

1. Store listing → **App icon** → `app-icon-512.png`
2. **Feature graphic** → `feature-graphic-1024x500.png`
3. **Phone screenshots** → upload the eight current surfaces above (skip stale `advanced-controls` if still present)
