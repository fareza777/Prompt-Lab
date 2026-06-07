# Production Go-Live — PromptLab

Domain production: **https://prompt-lab.xyz/**

Gunakan checklist ini **sebelum** klik **Send for review** / **Start rollout to Production** di Play Console.

## 1. Vercel (web)

- [ ] Custom domain `prompt-lab.xyz` aktif dan SSL valid
- [ ] Environment Production:
  - `APP_URL=https://prompt-lab.xyz`
  - `CORS_ORIGIN=https://prompt-lab.xyz` (opsional, disarankan)
  - `VITE_WEB_MEMBERSHIP_EMAIL=support@prompt-lab.xyz`
  - `SUPER_ACCOUNT_EMAILS` + `SUPABASE_SERVICE_ROLE_KEY` (jika dipakai)
- [ ] Deploy terbaru dari branch `main`
- [ ] Cek live:
  - https://prompt-lab.xyz/
  - https://prompt-lab.xyz/app
  - https://prompt-lab.xyz/privacy
  - https://prompt-lab.xyz/.well-known/assetlinks.json

```bash
npm run playstore:check
```

## 2. Supabase Auth

Dashboard → **Authentication** → **URL Configuration**:

| Field | Value |
|-------|--------|
| Site URL | `https://prompt-lab.xyz` |
| Redirect URLs | `https://prompt-lab.xyz/**` |

Tambahkan juga `http://localhost:5173/**` untuk dev lokal.

## 3. Android TWA (wajib rebuild domain baru)

AAB closed testing lama masih menunjuk ke `promptlab-six-phi.vercel.app`. Untuk production **harus** rebuild:

```bash
# Dari root repo — update host di android-app lalu build
cd android-app
npx bubblewrap update --manifest twa-manifest.json
gradlew.bat bundleRelease
```

Atau dari root: `npm run playstore:build` (setelah `bubblewrap update`).

Upload AAB baru ke **Production** (bukan hanya closed test):

`android-app/app/build/outputs/bundle/release/PromptLab-release-signed.aab`

Naikkan `appVersionCode` di `twa-manifest.json` jika Play menolak versi duplikat.

## 4. Play Console — Store & policy

| Item | Value |
|------|--------|
| Website | https://prompt-lab.xyz/ |
| Privacy policy | https://prompt-lab.xyz/privacy |
| Delete account | https://prompt-lab.xyz/privacy/delete-account |
| Package | `app.promptlab.twa` |

- [ ] Store listing: copy dari `STORE_LISTING.md`
- [ ] Data safety: sesuai tabel di `STORE_LISTING.md`
- [ ] Content rating: selesai
- [ ] In-app products: `promptlab_pro_monthly`, `promptlab_business_monthly`

## 5. Digital Asset Links (hilangkan bar URL)

Pastikan `public/.well-known/assetlinks.json` berisi **dua** SHA-256:

1. Upload key (lokal)
2. **App signing key** dari Play Console → Setup → App integrity

Deploy web → uninstall app dari HP → install dari Play Store → tunggu propagasi (15 menit–24 jam).

Panduan: `playstore/HILANGKAN_BAR_URL.md`

## 6. Smoke test sebelum production

- [ ] Login / signup di https://prompt-lab.xyz/app
- [ ] Generate prompt (bukan hanya local fallback)
- [ ] Settings → membership tampil benar
- [ ] Install dari Play (production track atau open testing) — fullscreen tanpa bar URL
- [ ] Privacy & delete-account link dari app Settings

## 7. Promote ke Production

1. Play Console → **Production** → **Create new release**
2. Upload AAB baru (host `prompt-lab.xyz`)
3. Release notes: domain migration + bugfixes
4. **Review release** → **Start rollout**

Closed testing **tidak** reset setelah ganti domain — syarat 14 hari tetap valid selama tester count memenuhi.
