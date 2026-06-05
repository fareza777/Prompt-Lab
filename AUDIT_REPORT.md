# PromptLab Full Audit Report

Repo: `fareza777/Prompt-Lab`  
Audit Date: 2026-05-20  
Scope: Security, Code Quality, Architecture, Performance, Deployment

---

## Executive Summary

PromptLab adalah aplikasi React + Express yang berfungsi dengan baik untuk mengubah narasi menjadi prompt AI profesional. Secara fungsional, fitur sudah lengkap: builder, optimizer, compare, library, template, export DOCX/PPTX, OCR, dan model fallback.

Namun, dari sisi engineering, repo ini memiliki **tech debt tinggi** akibat monolithic giant files, duplikasi logika frontend-backend yang masif, dan beberapa celah keamanan yang perlu ditangani sebelum production scale.

---

## 1. Security Audit

### 🔴 Critical

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| 1 | **API Key Exposed in `.env`** | `.env:2` | `OPENROUTER_API_KEY` berisi key aktif dalam plaintext di local file. Meski masuk `.gitignore`, risiko masih ada saat backup, copy, atau share workspace. |
| 2 | **CORS Wide Open** | `server/index.js:73` | `cors({ origin: true })` merefleksi semua origin. Di production, ini memungkinkan website lain memanggil API kamu menggunakan key browser pengguna (jika key override aktif). |
| 3 | **No Rate Limiting** | `server/index.js` | Tidak ada `express-rate-limit` atau protection terhadap brute-force / abuse pada endpoint AI yang mahal (generate, optimize, compare, export). |
| 4 | **No Helmet / Security Headers** | `server/index.js` | Tidak ada `helmet()`, XSS protection, CSP, atau HSTS headers. |
| 5 | **API Key Override Sent Over Wire** | `src/main.jsx:910` | `apiKey` override dikirim dari browser ke backend via FormData/JSON. Tanpa HTTPS enforcement, ini vulnerable MITM. |

### 🟡 Medium

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| 6 | **Error Message Leak** | `server/index.js:864-869` | `formatProviderError` mengirim raw error ke client. Meski di-slice 120 char, bisa bocor internal path/info. |
| 7 | **File Upload No Virus Scan** | `server/index.js:20-47` | Multer hanya cek mime/extension. DOCX/PPTX/XLSX diekstrak langsung dengan regex — berpot vulnerable terhadap Zip Slip atau XML Entity expansion jika payload dibuat jahat. |
| 8 | **Health Endpoint Info Disclosure** | `server/index.js:76-89` | `/api/health` mengembalikan daftar fallback model dan endpoint. Reconnaissance data untuk attacker. |

### Rekomendasi Security (Prioritas Kritis)

1. **Rotate API key segera** — key yang terekspos di `.env` harus dianggap compromised. Buat key baru di OpenRouter dashboard.
2. **Restriksi CORS** — ubah `cors({ origin: true })` menjadi `cors({ origin: process.env.CORS_ORIGIN || process.env.APP_URL || true })`, lalu set `CORS_ORIGIN` di Vercel env.
3. **Tambah rate limiting** — install `express-rate-limit` minimal 20 req/menit per IP untuk endpoint `/api/generate-prompt`, `/api/optimize-prompt`, `/api/compare-prompts`.
4. **Tambah `helmet()`** — install `helmet` dan apply sebagai middleware pertama.
5. **Hapus `apiKey` dari FormData** — sebaiknya frontend tidak mengirim key override ke backend. Key harus disimpan di backend env saja. Jika memang butuh override per-user, gunakan session/token mechanism, bukan plaintext in request body.

---

## 2. Code Quality Audit

### 🔴 Critical

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| 1 | **Monolithic Giant Files** | `src/main.jsx` (2,968 lines, 126 KB) | Seluruh aplikasi frontend ada dalam 1 file: state management, business logic, prompt templates, API calls, dan ~20 UI components. Maintenance sangat sulit. |
| 2 | **Backend Monolith** | `server/index.js` (1,887 lines, 69 KB) | Express app, route handlers, AI client setup, file processing (DOCX/PPTX/XLSX/OCR), prompt builders, export logic, semua dalam 1 file. |
| 3 | **Massive Logic Duplication** | `src/main.jsx` ↔ `server/index.js` | Fungsi-fungsi ini hampir identik di frontend dan backend: `buildPrompt`/`buildFallbackPrompt`, `buildLocalOptimizedPrompt`, `buildLocalCompareResult`/`buildLocalCompareResult`, `scorePrompt`/`scorePromptText`, `inferIntentBlueprint`/`getIntentDomain`, `getOptimizerEngineInstruction`. Seharusnya 1 source of truth. Perubahan kecil harus diedit di 2 tempat. |
| 4 | **Dead Code (V1 UI)** | `src/main.jsx:2170-2930` | Komponen v1 (`BuilderView`, `OptimizerView`, `TemplatesView`, `LibraryView`, `CompareView`, `SettingsView`, dll) masih ada padahal `App` sekarang render `V2App`. File size bisa dipotong ~40% hanya dengan menghapus v1. |

### 🟡 Medium

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| 5 | **No TypeScript** | Seluruh repo | Repo ini cukup kompleks untuk pure JS. Tanpa type safety, refactor berisiko tinggi. |
| 6 | **No Lint / Format Config** | Root | Tidak ada `.eslintrc`, `prettier.config`, atau `jsconfig.json`. Konsistensi kode sulit dijaga saat tim bertambah. |
| 7 | **"latest" Dependencies** | `package.json:13,19,24,26` | `@vitejs/plugin-react`, `lucide-react`, `react`, `react-dom`, `vite` pakai tag `latest`. Build non-deterministik dan berisiko breaking change. |
| 8 | **No Tests** | Root | `playwright` ada di `devDependencies` tapi tidak ada test file atau test script di `package.json`. |
| 9 | **Inconsistent JSON Limits** | `server/index.js:74,91,277` | `express.json` limit bervariasi: `1mb`, `64kb`, `256kb`. Seharusnya diseragamkan atau dibuat eksplisit per-route. |
| 10 | **Unbounded Recursion / Loop Risk** | `server/index.js:821-842` | `tryOpenRouterFallbackModels` loop sync tanpa exponential backoff. Jika semua model down, response ke client delayed tanpa graceful degradation. |

### Rekomendasi Code Quality

1. **Split `src/main.jsx` menjadi modul terpisah**:
   - `components/` — UI components (V2App, V2Builder, V2Settings, dll)
   - `hooks/` — `usePrompt`, `useLibrary`, `useModelSettings`
   - `lib/` — `buildPrompt`, `scorePrompt`, `inferIntentBlueprint` (shared logic)
   - `api.js` — semua fetch ke backend
2. **Split `server/index.js`**:
   - `routes/generate.js`, `routes/optimize.js`, `routes/compare.js`, `routes/export.js`
   - `services/ai.js` — OpenAI/OpenRouter client & fallback chain
   - `services/fileProcessor.js` — mammoth, jszip, OCR extraction
   - `services/promptEngine.js` — semua prompt template builders
3. **Hapus V1 UI components** — cleanup ~1,000+ baris dead code.
4. **Adopsi TypeScript secara bertahap** — mulai dari `server/` atau file baru.
5. **Ganti `"latest"` dengan pinned semver** — contoh: `"react": "^19.1.0"`.
6. **Tambahkan ESLint + Prettier** — minimal `@eslint/js` + `eslint-plugin-react`.

---

## 3. Architecture Audit

### 🟡 Medium

| # | Issue | Detail |
|---|-------|--------|
| 1 | **No Code Splitting** | `src/main.jsx` di-bundle jadi 1 chunk besar. Vite bisa lazy-load per tab (`Builder`, `Optimizer`, dll) dengan `React.lazy()`. |
| 2 | **No Shared Package** | Prompt builders, scoring, dan blueprint ada di frontend dan backend. Solusi ideal: buat `packages/shared/` (monorepo) atau minimal `shared/` folder yang di-`import` oleh keduanya. |
| 3 | **State Management Primitive** | Semua state di top-level `App` dengan `useState` + prop drilling via `shared` object. Untuk skala ini, sebaiknya gunakan React Context atau Zustand. |
| 4 | **PWA Service Worker Dasar** | `sw.js` ada tapi cache strategy tidak terlihat (perlu dicek). `manifest.webmanifest` ada — bagus. |
| 5 | **Library Hanya di localStorage** | Data library tersimpan di `localStorage` saja. Tidak bisa sync antar device atau backup. Consider IndexedDB atau backend storage. |

### Rekomendasi Arsitektur

- **Code split per route**: `const V2Builder = React.lazy(() => import('./components/V2Builder'));`
- **Zustand untuk state global** — menghilangkan prop drilling `shared` object.
- **Shared prompt engine** — ekstrak `inferIntentBlueprint`, `buildPrompt`, `scorePrompt` ke modul pure JS yang bisa di-import frontend & backend.

---

## 4. Performance Audit

### 🟡 Medium

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| 1 | **CSS Bundle Size** | `src/styles.css` (67 KB) | Single CSS file besar. Kemungkinan besar mengandung style v1 yang tidak dipakai lagi. |
| 2 | **Screenshot Bloat in Repo** | Root folder (~30+ PNG files, >15 MB) | File screenshot/preview seharusnya tidak di-commit ke repo utama. Gunakan GitHub Releases, external CDN, atau branch terpisah. |
| 3 | **Base64 Attachment Encoding** | `src/main.jsx:1327`, `server/index.js:1314` | Semua file di-encode base64 in-memory. Untuk file 8MB, memory footprint bisa 2-3x. Saat Vercel serverless memory limit 1024MB, ini masih aman tapi tidak efisien. |
| 4 | **No Image Optimization** | `public/promptlab-icon.svg` | SVG icon bagus, tapi tidak ada responsive image pipeline untuk screenshots/attachments. |

### Rekomendasi Performa

- Audit `styles.css` dengan PurgeCSS atau hapus class v1 secara manual.
- Pindahkan screenshot ke `.github/assets/` atau hapus dari repo (sudah ada di `.gitignore` untuk `promptlab-*.png` tapi file-file itu masih tracked!).
- Untuk attachment besar, streaming lebih baik daripada base64 in-memory, tapi ini memerlukan refactor signifikan.

---

## 5. Deployment & DevOps Audit

### 🟡 Medium

| # | Issue | Detail |
|---|-------|--------|
| 1 | **Vercel Timeout Margin Tipis** | `vercel.json:maxDuration=60` dengan fallback timeout 55s — margin 5 detik sangat sempit untuk cold start + network latency. |
| 2 | **No CI/CD** | Tidak ada `.github/workflows`. Proses testing, linting, dan deploy tidak terotomatisasi. |
| 3 | **No LICENSE** | Repo publik tanpa LICENSE file. |
| 4 | **Branch Divergence** | `main` lokal (`9dccf35`) berbeda dari `origin/main` (`c2e9ad9`). Perlu `git pull` atau `git push` untuk sinkronisasi. |
| 5 | **Staging / Preview Environment** | Hanya ada 1 deployment target (Vercel). Tidak ada staging untuk test sebelum production. |

### Rekomendasi DevOps

- Naikkan `maxDuration` ke 300 (jika Vercel plan mendukung) atau turunkan `OPENROUTER_FALLBACK_TIMEOUT_MS` agar selalu < `maxDuration` - 5s.
- Buat GitHub Action untuk lint + build check pada setiap PR.
- Tambahkan `LICENSE` (MIT recommended untuk open source).
- Sinkronkan branch `main` dengan `origin/main`.

---

## 6. GitHub Repo Health

| Metric | Status |
|--------|--------|
| Commit history | Baik — pesan commit jelas dan terstruktur (`feat(...)`, `fix(...)`) |
| Branching | Ada branch `redesign/v2` dan `claude/youthful-chatterjee-84452b` — terlihat terorganisir |
| Issues / PRs | Tidak dapat diaudit dari local clone — perlu cek langsung di github.com/fareza777/Prompt-Lab |
| README | Lengkap dan informatif |
| `.gitignore` | Cukup baik, mencakup `.env`, `node_modules`, `dist` |

---

## Action Items (Prioritas)

### 🔴 Do Now (Security & Stability)

- [ ] **Rotate OpenRouter API key** — key di `.env` sudah terekspos.
- [ ] **Restrict CORS** — minimal baca dari `APP_URL` env.
- [ ] **Tambah `express-rate-limit`** — protect endpoint mahal.
- [ ] **Tambah `helmet()`** — security headers.
- [ ] **Hapus kiriman `apiKey` dari frontend** — backend hanya boleh baca dari env.
- [ ] **Sinkronkan `main` branch** — `git pull origin main` lalu merge/rebase.

### 🟡 Do Next Week (Refactor & Quality)

- [ ] **Hapus V1 dead code** dari `src/main.jsx`.
- [ ] **Pin dependency versions** — hapus `"latest"`.
- [ ] **Setup ESLint + Prettier**.
- [ ] **Split `server/index.js` ke routes & services**.
- [ ] **Pindahkan / hapus screenshot PNG** dari repo tracked files.
- [ ] **Tambahkan test minimal** — minimal 1 smoke test generate endpoint.

### 🟢 Do Later (Scale & DX)

- [ ] **Adopsi TypeScript** secara bertahap.
- [ ] **Code splitting per route** di frontend.
- [ ] **Zustand / Context** untuk state management.
- [ ] **Shared prompt engine** antara frontend & backend.
- [ ] **GitHub Actions CI/CD**.
- [ ] **Staging environment** di Vercel.

---

*Audit generated by Cascade AI Assistant.*
