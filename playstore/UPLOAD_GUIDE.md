# Upload PromptLab ke Play Console

## File AAB (build lokal)

Setelah `npm run playstore:build`, file ada di:

```
android-app/app/build/outputs/bundle/release/app-release.aab
```

atau `PromptLab-release-signed.aab` — cek folder di atas.

## Langkah Play Console

1. https://play.google.com/console → **Create app**
2. App name: **PromptLab**
3. **Production** → **Create new release** → Upload AAB
4. Isi dari `playstore/STORE_LISTING.md`:
   - Privacy: https://prompt-lab.xyz/privacy
   - Short / full description
5. **Store settings** → App category: Productivity
6. **Policy** → Privacy policy URL (wajib)
7. **Data safety** — ikuti tabel di STORE_LISTING.md
8. **Content rating** — isi kuesioner
9. **Internal testing** → tambah email tester → publish

## Screenshot (manual)

Ambil dari HP atau emulator di tab: Builder, Optimizer, Templates, Library, Settings.

Ukuran: minimal 2 screenshot phone (16:9 atau 9:16).

## Feature graphic

Buat 1024×500 PNG (bisa dari screenshot Builder + logo).

## Setelah app dibuat di Play Console

Tambahkan **App signing certificate SHA-256** ke `public/.well-known/assetlinks.json` (baris kedua di array fingerprints), lalu deploy Vercel.

Panduan lengkap hilangkan bar URL di atas: `playstore/HILANGKAN_BAR_URL.md`

Cek verifikasi:

```bash
npm run playstore:check
```
