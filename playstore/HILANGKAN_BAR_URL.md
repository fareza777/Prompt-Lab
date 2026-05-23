# Hilangkan bar alamat Vercel di atas (TWA fullscreen)

Kalau di HP masih terlihat URL `promptlab-six-phi.vercel.app` di bagian atas, artinya Android **belum mengenali** app sebagai Trusted Web Activity. Bukan bug UI web — ini verifikasi **Digital Asset Links**.

## Penyebab paling umum

Play Store memakai **App signing key** (sertifikat Google), sedangkan `assetlinks.json` hanya berisi fingerprint **upload key** lokal. Keduanya **beda** → bar URL tetap muncul.

## Langkah perbaikan

1. Buka [Google Play Console](https://play.google.com/console) → app **PromptLab**
2. **Setup** → **App integrity** → **App signing**
3. Salin **SHA-256 certificate fingerprint** dari bagian **App signing key certificate** (bukan upload key saja)
4. Edit `public/.well-known/assetlinks.json` — tambahkan fingerprint itu ke array `sha256_cert_fingerprints` (biarkan fingerprint upload key tetap ada jika masih dipakai untuk testing lokal)
5. Deploy ulang ke Vercel (`git push` → tunggu deploy selesai)
6. Cek file live: `https://promptlab-six-phi.vercel.app/.well-known/assetlinks.json`
7. **Uninstall** app dari HP, lalu install lagi dari link **internal testing** Play Store (bukan bookmark Chrome)
8. Tunggu 15 menit–24 jam jika verifikasi Google belum propagate

## Cek otomatis

```bash
npm run playstore:check
```

Script ini juga memanggil API Google Digital Asset Links dan memberi tahu apakah domain sudah terhubung ke `app.promptlab.twa`.

## Setelah berhasil

- Bar URL hilang (mode fullscreen TWA)
- Splash native Android tetap sebentar, lalu splash animasi web PromptLab

## Rebuild AAB (opsional)

Setelah mengubah splash/icon native:

```bash
npm run playstore:build
```

Upload AAB baru ke internal testing.
