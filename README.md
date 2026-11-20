# AI Work Studio

AI Work Studio adalah aplikasi mobile-first untuk mengubah catatan, foto, screenshot, dan file menjadi hasil kerja siap pakai seperti laporan Word, notulen, dan slide PowerPoint.

## Tanpa akun / tanpa database

Sejak November 2026 aplikasi berjalan tanpa Supabase: tidak ada login, kuota,
membership, maupun admin console. `/app` langsung terbuka untuk semua orang,
semua fitur aktif, dan biaya AI dibatasi oleh rate limit per-IP di server
(Cloudflare Worker + Upstash KV). Lihat `MIGRATION-CLOUDFLARE.md`.

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

- **AdMob** (`@capacitor-community/admob`) — banner adaptive di bawah layar hanya untuk paket Free; `src/admob.js` di-load lazy dari `main.jsx`. ID produksi AI Work Studio tersimpan di `VITE_ADMOB_BANNER_ID` dan meta-data `com.google.android.gms.ads.APPLICATION_ID` di `android/app/src/main/AndroidManifest.xml`; `public/app-ads.txt` tersedia di domain publik.
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
