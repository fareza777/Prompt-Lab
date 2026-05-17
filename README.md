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
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
OPENROUTER_OCR_MODEL=baidu/qianfan-ocr-fast:free
APP_URL=https://domain-vercel-kamu.vercel.app
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
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
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
