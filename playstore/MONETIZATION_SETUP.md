# Monetization setup — PromptLab (poin 3–5)

## Status subscription (sudah)

| Subscription ID | Base plan | Harga ID |
|-----------------|-----------|----------|
| `promptlab_pro_monthly` | `pro-monthly` | Rp 49.000 |
| `promptlab_business_monthly` | `business-monthly` | Rp 199.000 |

---

## 3. License testing (uji beli tanpa charge)

### Langkah Play Console

1. **Setup** → **License testing** (atau cari "License" di search bar Play Console)
2. Di **License testers**, tambahkan **Gmail** yang dipakai di HP untuk uji:
   - Email kamu sendiri
   - Email 12 closed tester (kalau mau uji beli)
3. **Save**

### Cara uji nanti (setelah billing di app aktif)

1. Install app dari **closed testing** (bukan APK sideload)
2. Login PromptLab dengan Gmail yang ada di license testers
3. Settings → Membership → tap **Upgrade Pro** / **Business**
4. Play menampilkan dialog subscription **test** — tidak dicharge sungguhan
5. Setelah sukses, plan & quota di app harus naik

### Catatan

- License tester **≠** closed tester otomatis — tambahkan Gmail di kedua tempat kalau perlu
- Merchant **Active** tetap diperlukan

---

## Monetization setup (layar kamu)

| Bagian | Apa yang dilakukan |
|--------|-------------------|
| **Pause subscriptions** | Biarkan **Enabled** (default) — boleh nanti |
| **Real-time notifications** | **Kosongkan / jangan centang** untuk sekarang — butuh Google Cloud Pub/Sub, opsional untuk production scale |
| **Save changes** | Hanya kalau kamu mengubah pause/notifications |

Notif merah di header **bukan** dari halaman ini.

---

## 4. Play Billing di app (kode)

### Sudah disiapkan di repo

- `src/playBilling.js` — Digital Goods API (TWA Android)
- `POST /api/billing/verify-play-purchase` — verifikasi + update plan di Supabase

### Setup server (wajib untuk verify otomatis)

1. **Google Cloud Console** → buat **Service account**
2. **Play Console** → **Users and permissions** → undang service account email → centang **View financial data**, **Manage orders and subscriptions**
3. Download JSON key → simpan aman
4. Di **Vercel** (dan `.env` lokal), set:

```env
GOOGLE_PLAY_PACKAGE_NAME=app.promptlab.twa
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` = isi file JSON **satu baris** (atau minify).

5. Redeploy Vercel + restart server lokal

Tanpa env ini: tombol upgrade tetap muncul di Android, tapi verify gagal dengan pesan jelas.

### Build Android

Billing library sudah di `android-app` (`androidbrowserhelper:billing`). Upload **AAB baru** ke closed testing setelah uji billing.

### Uji di web desktop

Play Billing **hanya** di app Android (TWA). Di browser biasa tombol upgrade menampilkan: *Install dari Play Store*.

### Fitur per plan (setelah deploy web)

| Plan | Kuota | Export DOCX/PPTX | AI Compare/Optimizer | OCR prioritas | Library / template |
|------|-------|------------------|----------------------|---------------|-------------------|
| Free | 50k | Tidak | Lokal saja | Standar | 25 / 5 |
| Pro | 500k | Ya | Server AI | Prioritas | 100 / 40 |
| Business | 2M | Ya | Server AI | Prioritas+ | 500 / 120 + backup JSON tim |

Opsional di Vercel: `OPENROUTER_OCR_MODEL_PRO`, `OPENROUTER_OCR_MODEL_BUSINESS`, `OPENROUTER_BUSINESS_PRIMARY_MODEL`.

---

## 5. Play Console checklist (store & policy)

Centang manual di Dashboard:

| Item | Action |
|------|--------|
| **App category** | **Productivity** → Save |
| **Store listing** | Upload `playstore/assets/` (icon, feature graphic, 5 screenshots) + copy dari `STORE_LISTING.md` |
| **Privacy policy** | `https://promptlab-six-phi.vercel.app/privacy` |
| **Data safety** | Ikuti tabel di `STORE_LISTING.md` |
| **Content rating** | Kuesioner productivity / AI tool |
| **In-app products** | Yes — subscriptions `promptlab_pro_monthly`, `promptlab_business_monthly` |
| **Ads** | No |
| **Target audience** | Sesuai kuesioner (bukan app anak kecil) |
| **Closed testing** | ≥12 opted-in, 14 hari |
| **Apply for production** | Setelah syarat di atas |

---

## Urutan kerja disarankan

```
✅ Subscriptions created
→ 3. License testers (Gmail)
→ 4. Service account + Vercel env + AAB + uji beli
→ 5. Store listing & policy hijau
→ Closed test 14 hari → Production
```
