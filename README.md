# PromptLab

PromptLab adalah aplikasi mobile-first untuk mengubah narasi biasa, gambar, screenshot, dan file menjadi prompt AI profesional.

## Jalankan Lokal

Install dependency:

```bash
npm install
```

Jalankan API lokal:

```bash
npm run server
```

Jalankan frontend:

```bash
npm run dev
```

Frontend default: `http://127.0.0.1:5173`  
API default: `http://127.0.0.1:8787`

## Deploy ke Vercel

Project ini sudah disiapkan untuk Vercel:

- Frontend Vite dibuild ke folder `dist`.
- Endpoint backend Express diekspor melalui `api/index.js`.
- Route `/api/*` diarahkan ke serverless function Vercel lewat `vercel.json`.

Build settings di Vercel:

```txt
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Environment variables yang perlu diisi di Vercel:

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=isi_key_di_sini
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_OCR_MODEL=baidu/qianfan-ocr-fast:free
APP_URL=https://domain-vercel-kamu.vercel.app
VITE_SUPABASE_URL=https://project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```

Saat production, frontend otomatis memakai same-origin API (`/api/...`). Saat development, frontend memakai API lokal `http://127.0.0.1:8787`.

Timeout OpenRouter default:

```bash
OPENROUTER_FAST_PRIMARY_TIMEOUT_MS=20000
OPENROUTER_BALANCED_PRIMARY_TIMEOUT_MS=40000
OPENROUTER_PATIENT_PRIMARY_TIMEOUT_MS=55000
OPENROUTER_FALLBACK_TIMEOUT_MS=55000
```

Jika primary model sering sebenarnya sehat tapi telat merespons, naikkan `OPENROUTER_BALANCED_PRIMARY_TIMEOUT_MS`. Untuk Vercel serverless, jaga nilainya tetap di bawah `maxDuration` function.

LLM settings juga bisa diubah dari halaman **Settings** di aplikasi:

- Provider: `openrouter`, `openai`, atau `custom`
- Base URL / endpoint untuk provider OpenAI-compatible
- API key override opsional
- Model utama, OCR model, fallback models, dan timeout

Jika API key override dikosongkan, backend memakai Environment Variables Vercel. Jika diisi dari dashboard, key tersimpan di browser pengguna tersebut.

## Login dan Membership

PromptLab memakai Supabase Auth untuk login email/password. Setup tahap 1:

1. Buka Supabase SQL Editor.
2. Jalankan isi file `supabase/phase-1-auth.sql`.
3. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di `.env` lokal dan Vercel Production.
4. Redeploy Vercel setelah env ditambahkan.

Admin Console di aplikasi hanya muncul untuk user dengan `profiles.role = 'admin'`. Setelah akun admin dibuat lewat app, jalankan SQL opsional di bagian bawah `supabase/phase-1-auth.sql` untuk menaikkan role akun tersebut.

### Quota Token

Quota dihitung di backend saat `/api/generate-prompt` berhasil:

- Frontend mengirim Supabase access token lewat header `Authorization`.
- Backend membaca entitlement user dari Supabase.
- Jika quota tidak cukup, request ditolak sebelum memanggil model AI.
- Jika berhasil, backend mencatat `usage_events` dan menaikkan `profiles.quota_used`.
- Tombol plan di UI hanya membaca status database; upgrade Pro/Business harus lewat validasi Play Billing/backend, bukan klik lokal.

Jika SQL tahap 1 sudah pernah dijalankan sebelum fitur quota ini, cukup jalankan `supabase/phase-2-quota-upgrade.sql` agar fungsi `get_my_entitlement` dan `record_usage_event` tersedia.

Jika generate gagal dengan **"Gagal mencatat usage quota"**, jalankan `supabase/phase-3-production-fix.sql` di Supabase SQL Editor (memperbaiki RLS policy yang memblokir update `quota_used`).

Di Vercel Production, pastikan env backend juga terisi (bukan hanya `VITE_*`):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
```

`SUPABASE_SERVICE_ROLE_KEY` ada di Supabase Dashboard → Project Settings → API → `service_role` (secret). Wajib untuk pencatatan quota yang stabil di server Vercel.

Untuk provider custom OpenAI-compatible di Vercel, env opsional:

```bash
CUSTOM_LLM_BASE_URL=https://provider.example.com/v1
CUSTOM_LLM_API_KEY=isi_key_di_sini
CUSTOM_LLM_MODEL=nama-model-default
```

## OpenAI API

Buat `.env` dari `.env.example`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
PORT=8787
```

Jika `OPENAI_API_KEY` kosong, server memakai fallback generator lokal agar app tetap bisa dicoba.

## OpenRouter API

Untuk memakai OpenRouter, isi `.env` seperti ini:

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=isi_key_di_sini
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_FALLBACK_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
PORT=8787
```

Jangan commit `.env`. File tersebut sudah masuk `.gitignore`.

Jika model utama OpenRouter overload/rate-limit, server akan mencoba `OPENROUTER_FALLBACK_MODEL` terlebih dahulu sebelum memakai generator lokal.

## Attachment

Sudah didukung:

- Gambar/screenshot: preview di frontend, dikirim ke API sebagai image input saat OpenAI aktif.
- PDF: dikirim sebagai file input saat OpenAI aktif.
- TXT, MD, JSON, CSV: cuplikan isi dibaca dan masuk ke prompt.
- DOCX: isi teks sudah diekstrak lokal dan dipakai sebagai konteks prompt.
- PPTX: teks slide sudah diekstrak lokal dan dipakai sebagai konteks prompt.
- XLSX: nilai sel worksheet sudah diekstrak lokal dan dipakai sebagai konteks prompt.

## PWA

App sudah punya manifest, service worker dasar, dan icon SVG. Tahap berikutnya untuk Google Play adalah membungkus PWA dengan Android wrapper seperti Capacitor atau Trusted Web Activity.
