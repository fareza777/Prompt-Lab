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
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), `VITE_WEB_CHECKOUT_PRO_URL`,
`VITE_WEB_CHECKOUT_BUSINESS_URL`, `VITE_WEB_MEMBERSHIP_EMAIL`, `VITE_SUPER_ACCOUNT_EMAILS`,
`VITE_ADMOB_BANNER_ID`.

**Secrets** (`npx wrangler secret put NAME` or dashboard → Variables and Secrets):

| Name | Needed for |
|---|---|
| `SUPABASE_ANON_KEY` | Server-side auth checks (same publishable key as above) |
| `SUPABASE_SERVICE_ROLE_KEY` | Quota, billing, admin, account delete |
| `OPENROUTER_API_KEY` | All AI generation |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Lemon Squeezy webhook |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Play Billing verification |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Optional durable rate limit (Upstash) |
| `MINIMAX_API_KEY`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `SIDECAR_URL` | Optional |

Local: put them in `.dev.vars` (git-ignored).

## Free-plan caveats

- Workers Free allows 10 ms CPU per request (waiting on OpenRouter/Supabase does not count).
  AI routes are I/O-bound and fine; heavy exports (large PDF/DOCX/XLSX, diagram PNG) can hit
  the CPU limit on big documents. If that happens, Workers Paid ($5/mo) raises it to 30 s.
- 100k Worker requests/day (static asset requests are free and unlimited).

## DNS

Cloudflare zone `prompt-lab.xyz` holds the old Vercel records (ImprovMX MX, SPF, Google site
verification, CAA). Custom domains `prompt-lab.xyz` and `www.prompt-lab.xyz` are attached to the
Worker. Switch the domain's nameservers (registered at Vercel) to the two Cloudflare nameservers
to go live.
