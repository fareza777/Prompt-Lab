# AI Work Studio

AI Work Studio adalah aplikasi mobile-first untuk mengubah catatan, foto, screenshot, dan file menjadi hasil kerja siap pakai seperti laporan Word, notulen, dan slide PowerPoint.

## Wajib dilakukan setelah rilis ini

Dua langkah manual berikut belum aktif dan **fitur terkait tidak jalan tanpanya**:

**1. Aktifkan Anonymous Sign-Ins di Supabase** — tanpa ini, percobaan gratis
tanpa akun tidak berfungsi dan pengguna baru langsung diminta membuat akun
(persis masalah yang ingin dihilangkan rilis ini).

Supabase Dashboard → Authentication → Sign In / Providers → **Anonymous Sign-Ins → Enable**.

Verifikasi: buka `/app` dalam mode incognito, ketik permintaan, tekan
**Buatkan**. Kalau muncul "Buat akun gratis dulu untuk memakai AI", toggle
tersebut masih mati.

**2. Jalankan `supabase/phase-13-content-reports.sql`** — membuat tabel
`content_reports` untuk pelaporan konten AI yang diwajibkan kebijakan
Generative AI Google Play. Tanpa tabel ini laporan hanya masuk log server,
tidak tersimpan.

Butuh `SUPABASE_SERVICE_ROLE_KEY` terisi di environment produksi.

## Bahasa

Antarmuka memakai bahasa Indonesia sebagai default dan mendeteksi locale
perangkat; English tersedia dan bisa dipilih manual di **Akun → Bahasa**.

Bahasa antarmuka terpisah dari bahasa keluaran — pengguna bisa memakai UI
Indonesia dan tetap meminta dokumen berbahasa Inggris (lihat
`src/promptLanguage.js`).

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
OPENROUTER_MODEL=qwen/qwen3.7-flash
OPENROUTER_OCR_MODEL=baidu/qianfan-ocr-fast:free
APP_URL=https://prompt-lab.xyz
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

AI Work Studio memakai Supabase Auth untuk login email/password. Setup tahap 1:

1. Buka Supabase SQL Editor.
2. Jalankan isi file `supabase/phase-1-auth.sql`.
3. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di `.env` lokal dan Vercel Production.
4. Redeploy Vercel setelah env ditambahkan.

**Google Sign-In:** tombol Google aktif secara default. Setup server (sekali):

1. Google Cloud Console → OAuth client (Web) → redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
2. Isi env lalu jalankan:
   ```bash
   npm run setup:google-auth
   ```
   Butuh `SUPABASE_ACCESS_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. Jalankan `supabase/phase-10-google-auth-profile.sql` di SQL Editor (nama profil dari Google).
4. Redeploy Vercel. URL Configuration di Supabase: Site URL `https://prompt-lab.xyz`, redirect `https://prompt-lab.xyz/**`.

Untuk menyembunyikan tombol Google: `VITE_ENABLE_GOOGLE_AUTH=false`.

Admin Console di aplikasi hanya muncul untuk user dengan `profiles.role = 'admin'`. Setelah akun admin dibuat lewat app, jalankan SQL opsional di bagian bawah `supabase/phase-1-auth.sql` untuk menaikkan role akun tersebut.

### Quota Token

Quota dihitung di backend saat `/api/generate-prompt` berhasil:

- Frontend mengirim Supabase access token lewat header `Authorization`.
- Backend membaca entitlement user dari Supabase.
- Jika quota tidak cukup, request ditolak sebelum memanggil model AI.
- Jika berhasil, backend mencatat `usage_events` dan menaikkan `profiles.quota_used`.
- Plan buttons never activate paid access locally. Android purchases use Play Billing verification, while web purchases use Lemon Squeezy checkout (`VITE_WEB_CHECKOUT_*`) + webhook — see `playstore/LEMON_SQUEEZY_SETUP.md`.

Jika SQL tahap 1 sudah pernah dijalankan sebelum fitur quota ini, cukup jalankan `supabase/phase-2-quota-upgrade.sql` agar fungsi `get_my_entitlement` dan `record_usage_event` tersedia.

Jika generate gagal dengan **"Gagal mencatat usage quota"**, jalankan `supabase/phase-3-production-fix.sql` di Supabase SQL Editor (memperbaiki RLS policy yang memblokir update `quota_used`).

Di Vercel Production, pastikan env backend juga terisi (bukan hanya `VITE_*`):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
```

`SUPABASE_SERVICE_ROLE_KEY` ada di Supabase Dashboard → Project Settings → API → `service_role` (secret). Wajib untuk pencatatan quota yang stabil di server Vercel.

Untuk provider custom OpenAI-compatible (contoh: LiteLLM free router lokal):

```bash
AI_PROVIDER=custom
CUSTOM_LLM_BASE_URL=http://127.0.0.1:4000/v1
CUSTOM_LLM_API_KEY=sk-litellm-local
CUSTOM_LLM_MODEL=free-best
```

Failover FREE-ONLY ditangani proxy LiteLLM (`free-best`); app tidak menambah fallback berbayar.
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
OPENROUTER_MODEL=qwen/qwen3.7-flash
OPENROUTER_FALLBACK_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
OPENROUTER_FALLBACK_MODELS=nvidia/nemotron-3-ultra-550b-a55b:free,nvidia/nemotron-3.5-lightning:free,nvidia/nemotron-3-super-120b-a12b:free
PORT=8787
```

Jangan commit `.env`. File tersebut sudah masuk `.gitignore`.

Jika model utama OpenRouter overload/rate-limit, server akan mencoba daftar `OPENROUTER_FALLBACK_MODELS` (semua `:free`) sebelum memakai generator lokal.

## Attachment

Sudah didukung:

- Gambar/screenshot: preview di frontend, dikirim ke API sebagai image input saat OpenAI aktif.
- PDF: dikirim sebagai file input saat OpenAI aktif.
- TXT, MD, JSON, CSV: cuplikan isi dibaca dan masuk ke prompt.
- DOCX: isi teks sudah diekstrak lokal dan dipakai sebagai konteks prompt.
- PPTX: teks slide sudah diekstrak lokal dan dipakai sebagai konteks prompt.
- XLSX: nilai sel worksheet sudah diekstrak lokal dan dipakai sebagai konteks prompt.

## PWA

App sudah punya manifest, service worker dasar, dan icon SVG.

## Android App (Capacitor)

App Android adalah wrapper **Capacitor** (menggantikan TWA/Bubblewrap) yang memuat `https://prompt-lab.xyz` di WebView native — frontend Vite/React tetap dipakai apa adanya. Konfigurasi di `capacitor.config.json` (`server.url`), project native di `android/`.

```bash
npm run build          # build web ke dist/
npx cap sync android   # salin web assets + config ke android/
npm run icons:android  # generate launcher/splash icons ke android/
npm run playstore:build # test policy + icons + build + sync + gradlew bundleRelease
```

- Package id tetap `app.promptlab.twa` → update listing Play Store yang sama.
- Play Billing memakai plugin native `PlayBillingPlugin` (Play Billing Library 8.3.0) di `android/app/src/main/java/app/promptlab/twa/` — pengganti Digital Goods API TWA. Frontend tetap memanggil API yang sama di `src/playBilling.js`.
- Signing: isi `android/keystore.properties` (gitignored) menunjuk ke `playstore/signing/promptlab-release.jks`, sama seperti era TWA.
- Deep link `https://prompt-lab.xyz` diverifikasi via Android App Links (`autoVerify`) — `public/.well-known/assetlinks.json` tetap wajib terpasang.

### Native features

- **AdMob** (`@capacitor-community/admob`) — banner adaptive di bawah layar hanya untuk paket Free; `src/admob.js` di-load lazy dari `main.jsx`. Ganti ID lewat `VITE_ADMOB_BANNER_ID` + meta-data `com.google.android.gms.ads.APPLICATION_ID` di `android/app/src/main/AndroidManifest.xml` (masih ID test Google).
- **ML Kit** (`@capacitor-mlkit/document-scanner` + `text-recognition`) — tombol "Pindai dokumen" di workbench men-scan kertas lalu OCR menjadi lampiran markdown (`src/documentScan.js`, native-only).
- **Defuddle** — endpoint `POST /api/fetch-url` (`server/urlImport.js`) mengambil halaman web sebagai markdown bersih (SSRF-guard: hanya http(s) publik, redirect divalidasi ulang); dipakai tombol "Dari URL" di workbench.
- **pdf-lib** — `server/pdfToolkit.js`: semua PDF yang diekspor `/api/export/pdf` distempel footer + metadata, dan `POST /api/pdf/merge` menggabung lampiran PDF (tombol "Gabung PDF" muncul saat ≥2 PDF terlampir).
- **Tiptap** (`@tiptap/react` + `tiptap-markdown`) — tombol "Edit" di halaman hasil membuka `src/ui/DocumentEditor.jsx`, editor rich-text lazy chunk yang menulis balik markdown ke output.

### Local-first engines (lazy chunks, tidak masuk initial bundle)

- **DuckDB-Wasm** (`@duckdb/duckdb-wasm`, `src/dataAnalyze.js`) — tombol "Analisis N data" muncul saat lampiran CSV/XLSX ada; memprofil kolom (non-null, unik, rentang, nilai teratas) jadi lampiran `<nama>-profil.md`, semuanya di browser. XLSX dibaca lokal (`src/xlsxToCsv.js`, jszip — SheetJS tidak dipakai karena advisories-nya belum ter-patch di npm).
- **Orama** (`@orama/orama`, `src/workspaceSearch.js`) — pencarian riwayat/library memakai indeks full-text (typo tolerance, boost judul) menggantikan substring filter; indeks dibangun lazy dan di-cache per array library.
- **Transformers.js** (`@huggingface/transformers`, `src/semanticSearch.js`) — embedding `Xenova/all-MiniLM-L6-v2` (q8, ~23 MB sekali unduh, di-cache browser) me-rerank hasil Orama secara semantik lalu digabung RRF; indikator "pencarian pintar" muncul di Riwayat saat aktif. Gagal load (offline/webview lama) → diam-diam tetap leksikal.
- **Yjs** (`yjs` + `y-indexeddb`, `src/draftStore.js`) — autosave draft workbench (narasi, kategori, tone, model, tipe output, runOutput, lampiran) ke IndexedDB setiap ~800 ms; dipulihkan saat reload/process-death. Snapshot hasil disimpan sebagai maks 10 versi — dropdown "Versi" di halaman hasil mengembalikannya. File lampiran disimpan di store IDB terpisah (bukan di dalam Y.Doc).

### Document understanding (web + sidecar opsional)

- **Tesseract.js** (`src/ocr.js`) — tombol "OCR N gambar" pada lampiran gambar: teks dibaca di browser jadi lampiran `-ocr.md`. Kalau sidecar PaddleOCR dikonfigurasi, dipakai duluan.
- **jscanify + OpenCV** (`src/webScan.js`) — tombol "Pindai dokumen" kini juga jalan di web: ambil foto (capture kamera/galeri) → jscanify mencari kontur kertas + perspective-correct jadi `-scan.jpg` (fallback ke foto asli kalau kontur tidak ketemu). Di Android tetap ML Kit.
- **Docling + MarkItDown + PaddleOCR** (`server/sidecar/`, FastAPI) — layanan Python opsional: `POST /parse` (Docling→MarkItDown fallback → markdown) dan `POST /ocr`. Node mem-proxy lewat `/api/documents/parse` + `/api/ocr` hanya saat `SIDECAR_URL` di-set — tombol "Dokumen → Markdown" muncul untuk lampiran pdf/docx/pptx/xlsx; tanpa sidecar, endpoint menjawab 503 dan UI menampilkan petunjuk. Lihat `server/sidecar/README.md` untuk setup (model weights diunduh saat request pertama).

Dokumen Play Store: `playstore/README.md`.
