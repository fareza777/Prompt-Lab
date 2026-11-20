# AI Work Studio (prompt-lab.xyz) – Vercel → Cloudflare Workers (Free)

| Part | Vercel | Cloudflare |
|---|---|---|
| Vite build (`dist/`: landing, `/app`, `/blog/*`, `/privacy`, `.well-known/`) | Static | Workers Static Assets (free, no request quota) |
| `/api/*` (Express app in `server/index.js`) | Serverless function `api/index.js` | Same Express app in `worker/index.js` via `nodejs_compat` + `cloudflare:node` `httpServerHandler` |
| `/app/:slug*` → `/app.html` | `vercel.json` rewrite | Worker rewrites `/app/*` → `/app` |
| Security / API headers | `vercel.json` | `public/_headers` + Worker (`/api/*` → `no-store`) |

The Android app (`app.promptlab.twa`, Capacitor `server.url = https://prompt-lab.xyz/app`)
keeps working unchanged once `prompt-lab.xyz` points at the Worker.

## Changes needed for Cloudflare

- **Files > 25 MiB are not allowed in Static Assets.**
  - DuckDB's `duckdb-mvp.wasm` (~40 MB) now loads from jsDelivr, pinned to the installed
    `@duckdb/duckdb-wasm` version (`src/dataAnalyze.js`).
  - onnxruntime-web's `ort-wasm-simd-threaded.asyncify.wasm` (~23 MB) is never requested in
    the browser (Transformers.js points ONNX Runtime at jsDelivr), so
    `scripts/cf-prune-large-assets.mjs` deletes it after the build. Any other oversized file fails the build.
- `server/officeExport.js`: no `import.meta.url` in a bundled Worker, so pptxgenjs falls back to a dynamic import.
- `wrangler.jsonc` aliases `pdfkit` to its standalone build (the Node build reads font metrics from disk).
- Worker size: ~2.4 MiB gzip (limit 3 MiB on Free).

## Commands

```bash
npm run build:cf     # vite build + prune >25 MiB assets
npm run cf:preview   # build + wrangler dev (http://localhost:8787)
npm run cf:deploy    # build + wrangler deploy
```

Workers Builds (dashboard → `prompt-lab` → Settings → Build):

- Build command: `npm run build:cf`
- Deploy command: `npx wrangler deploy` (non-production branches: `npx wrangler versions upload`)
- Production branch: `main`

## Environment

**Runtime vars** (non-secret) live in `wrangler.jsonc`.

**Build vars** (Workers Builds → Build variables; Vite bakes them into the client):
`VITE_ADMOB_BANNER_ID` only.

**Secrets** (`npx wrangler secret put NAME` or dashboard → Variables and Secrets):

| Name | Needed for |
|---|---|
| `OPENROUTER_API_KEY` | All AI generation |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Durable per-IP AI rate limit (Upstash). The limiter fails closed, so AI routes return 503 without them. |
| `MINIMAX_API_KEY`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `SIDECAR_URL` | Optional |

There is no database, login, quota or billing any more (Supabase, Lemon Squeezy and
Play Billing verification were removed). Every visitor gets the same features; AI spend
is bounded by the per-IP rate limit. Content reports (`/api/report-content`) are written
to Workers Logs (`npx wrangler tail`).

Local: put them in `.dev.vars` (git-ignored).

## Free-plan caveats

- Workers Free allows 10 ms CPU per request (waiting on OpenRouter does not count).
  AI routes are I/O-bound and fine; heavy exports (large PDF/DOCX/XLSX, diagram PNG) can hit
  the CPU limit on big documents. If that happens, Workers Paid ($5/mo) raises it to 30 s.
- 100k Worker requests/day (static asset requests are free and unlimited).

## DNS

Cloudflare zone `prompt-lab.xyz` holds the old Vercel records (ImprovMX MX, SPF, Google site
verification, CAA). Custom domains `prompt-lab.xyz` and `www.prompt-lab.xyz` are attached to the
Worker. Switch the domain's nameservers (registered at Vercel) to the two Cloudflare nameservers
to go live.
