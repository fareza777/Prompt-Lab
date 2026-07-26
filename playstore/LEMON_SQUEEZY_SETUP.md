# Lemon Squeezy — Web billing AI Work Studio

Pembayaran **web** (browser desktop / mobile web) via Lemon Squeezy.  
Pembayaran **Android Play Store app** tetap pakai Google Play Billing — jangan link checkout eksternal di dalam TWA.

---

## Arsitektur

```
User (web) → Settings → Membership → Pro/Business
    → Lemon Squeezy checkout (email + user_id terisi otomatis)
    → Webhook POST /api/billing/lemon-squeezy-webhook
    → Supabase profiles.plan + membership_events
    → User tap "Refresh membership" atau reload app
```

File kode:

| File | Peran |
|------|--------|
| `src/webBilling.js` | Bangun checkout URL + custom `user_id` |
| `server/lemonSqueezyBilling.js` | Verifikasi signature + update plan |
| `server/index.js` | Route webhook |
| `src/main.jsx` | Tombol upgrade web + refresh membership |

---

## 1. Selesaikan Setup di Lemon Squeezy

Dari screenshot kamu, menu **Setup** masih pending (ikon jam). Kerjakan dulu:

1. **Settings → Store** — lengkapi nama toko, domain, support email  
2. **Settings → Payments** — aktifkan payout (Stripe/PayPal sesuai negara)  
3. **Settings → Taxes** — atur jika perlu (MoR Lemon Squeezy handle banyak pajak)  
4. **Design** — logo & warna (opsional)  
5. Centang **Setup** sampai hijau

---

## 2. Buat produk subscription

**Products → New product → Subscription**

| Produk | Harga disarankan | Interval |
|--------|------------------|----------|
| AI Work Studio Pro | Rp 49.000 | Monthly |
| AI Work Studio Business | Rp 199.000 | Monthly |

Samakan dengan Play Console (`playstore/MONETIZATION_SETUP.md`).

Setelah publish:

1. Buka masing-masing produk → **Share** / **Checkout link**  
2. Salin URL bentuk:  
   `https://promptlab.lemonsqueezy.com/checkout/buy/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## 3. Ambil Variant ID

Webhook butuh map variant → plan:

1. Lemon Squeezy → **Products** → buka variant Pro  
2. Di URL browser atau API, catat **Variant ID** (angka, mis. `123456`)  
3. Ulangi untuk Business  

---

## 4. Environment variables

### Lokal (`.env`)

```env
# Frontend — share link checkout
VITE_WEB_CHECKOUT_PRO_URL=https://promptlab.lemonsqueezy.com/checkout/buy/VARIANT_UUID_PRO
VITE_WEB_CHECKOUT_BUSINESS_URL=https://promptlab.lemonsqueezy.com/checkout/buy/VARIANT_UUID_BUSINESS

# Server — webhook
LEMON_SQUEEZY_WEBHOOK_SECRET=your-random-secret-6-40-chars
LEMON_SQUEEZY_VARIANT_ID_PRO=123456
LEMON_SQUEEZY_VARIANT_ID_BUSINESS=789012
```

### Vercel (Production)

Tambahkan env yang sama di **Project → Settings → Environment Variables**:

- `VITE_WEB_CHECKOUT_*` → Production + Preview  
- `LEMON_SQUEEZY_*` → **Production only** (server, jangan prefix `VITE_`)  
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` sudah ada (webhook menulis ke `profiles`)

Redeploy setelah simpan env.

---

## 5. Webhook di Lemon Squeezy

1. **Settings → Webhooks → +**  
2. **URL:** `https://prompt-lab.xyz/api/billing/lemon-squeezy-webhook`  
3. **Signing secret:** sama dengan `LEMON_SQUEEZY_WEBHOOK_SECRET` di Vercel  
4. **Events** (centang minimal):

   - `subscription_created`  
   - `subscription_updated`  
   - `subscription_cancelled`  
   - `subscription_expired`  

5. **Save**

Test lokal (opsional) dengan ngrok:

```bash
ngrok http 8787
# URL webhook: https://xxxx.ngrok.io/api/billing/lemon-squeezy-webhook
```

---

## 6. Uji end-to-end

### Test mode Lemon Squeezy

1. Aktifkan **Test mode** (toggle kiri bawah dashboard)  
2. Buat produk test atau gunakan test card Lemon Squeezy  
3. Di AI Work Studio web: login → **Settings → Membership** → **Pro**
4. Checkout terbuka dengan email & `user_id` terisi  
5. Selesaikan pembayaran test  
6. Tap **Refresh membership** — plan harus `Pro`, quota 500k  

### Cek Supabase

```sql
select id, email, plan, quota_limit, play_billing from profiles where email = 'your@email.com';
select * from membership_events order by created_at desc limit 5;
```

`play_billing` harus `Lemon Squeezy`.

---

## 7. Kebijakan Play Store vs Web

| Channel | Pembayaran |
|---------|------------|
| App Android (TWA dari Play) | **Google Play Billing** saja |
| Browser `prompt-lab.xyz` | **Lemon Squeezy** |
| Guest / belum login | Tidak bisa checkout — harus sign in dulu |

Kode sudah memilih otomatis: jika `getDigitalGoodsService` aktif (Play), pakai Play; else web checkout.

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| Tombol buka tab kosong | `VITE_WEB_CHECKOUT_*` kosong | Isi URL di Vercel + rebuild |
| Plan tidak naik setelah bayar | Webhook gagal / variant ID salah | Cek Vercel logs, Lemon Squeezy webhook log |
| `Could not match webhook to user` | `user_id` tidak ikut checkout | Pastikan login sebelum upgrade (kode sudah kirim `checkout[custom][user_id]`) |
| `Unknown variant` | Env variant ID tidak cocok | Update `LEMON_SQUEEZY_VARIANT_ID_*` |
| 401 Invalid signature | Secret webhook beda | Samakan secret di LS dan Vercel |

---

## Checklist cepat

```
[ ] Setup Lemon Squeezy hijau
[ ] Pro + Business subscription dibuat (IDR)
[ ] Checkout URLs → VITE_WEB_CHECKOUT_*
[ ] Variant IDs → LEMON_SQUEEZY_VARIANT_ID_*
[ ] Webhook → https://prompt-lab.xyz/api/billing/lemon-squeezy-webhook
[ ] LEMON_SQUEEZY_WEBHOOK_SECRET di Vercel
[ ] SUPABASE_SERVICE_ROLE_KEY di Vercel
[ ] Test mode: bayar → Refresh membership → plan Pro
[ ] Production: matikan test mode
```
