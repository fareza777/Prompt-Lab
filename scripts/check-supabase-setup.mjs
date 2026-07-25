/**
 * Verifies the two manual Supabase steps this release depends on.
 *
 *   npm run check:supabase
 *
 * Uses only the public anon key — no admin credentials required.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const at = trimmed.indexOf("=");
      if (at < 0) continue;
      const key = trimmed.slice(0, at).trim();
      const value = trimmed.slice(at + 1).trim();
      if (!env[key]) env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("✖ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set.");
  process.exit(1);
}

console.log(`Project: ${url}\n`);
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
let failures = 0;

// ---- 1. Anonymous sign-ins ------------------------------------------------
process.stdout.write("1. Anonymous sign-ins ......... ");
const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

if (authData?.session) {
  console.log("ENABLED ✓");
  console.log("   Percobaan gratis tanpa akun berfungsi.");
  await supabase.auth.signOut();
} else if (authError?.code === "anonymous_provider_disabled") {
  failures += 1;
  console.log("DISABLED ✖");
  console.log("   Percobaan gratis TIDAK berfungsi — pengguna baru langsung diminta membuat akun.");
  console.log("   Perbaiki: Dashboard → Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable");
} else {
  failures += 1;
  console.log("UNKNOWN ✖");
  console.log(`   ${authError?.message || "no session returned"}`);
}

// ---- 2. content_reports table --------------------------------------------
process.stdout.write("\n2. Tabel content_reports ...... ");
const { error: tableError } = await supabase.from("content_reports").select("id").limit(1);

// RLS is on with no client policy, so an existing table returns an empty set or
// a permission error. Only a missing-relation error means the migration is unrun.
const missing =
  tableError &&
  (tableError.code === "PGRST205" ||
    /could not find the table|does not exist|schema cache/i.test(tableError.message || ""));

if (missing) {
  failures += 1;
  console.log("MISSING ✖");
  console.log("   Laporan konten AI tidak tersimpan (hanya masuk log server).");
  console.log("   Perbaiki: jalankan supabase/phase-13-content-reports.sql di SQL Editor.");
} else {
  console.log("ADA ✓");
  console.log("   Pelaporan konten AI siap (butuh SUPABASE_SERVICE_ROLE_KEY di produksi).");
}

// ---- 3. Service role key in production ------------------------------------
// What matters is production, not this machine. The server reads its published
// runtime config through the service-role client, so `configSource` reports
// "published" only when that key is present — and "env" when it is missing.
process.stdout.write("\n3. SERVICE_ROLE_KEY (produksi) . ");
const appUrl = env.APP_URL || "https://prompt-lab.xyz";
try {
  const response = await fetch(`${appUrl}/api/health`, {
    signal: AbortSignal.timeout(15000),
  });
  const health = await response.json();
  if (health.configSource === "published") {
    console.log("TERPASANG ✓");
    console.log("   Hapus akun, konsol admin, dan penyimpanan laporan berfungsi.");
  } else {
    failures += 1;
    console.log("TIDAK TERPASANG ✖");
    console.log(`   /api/health melaporkan configSource="${health.configSource}".`);
    console.log("   Akibatnya: hapus akun permanen gagal (503) dan laporan konten tidak tersimpan.");
    console.log("   Perbaiki: Vercel → Settings → Environment Variables → SUPABASE_SERVICE_ROLE_KEY (Production).");
  }
} catch (error) {
  console.log("TIDAK BISA DICEK");
  console.log(`   ${appUrl}/api/health tidak terjangkau: ${error.message}`);
}

console.log(
  failures === 0
    ? "\nSemua siap.\n"
    : `\n${failures} langkah belum selesai — lihat instruksi di atas.\n`
);
process.exit(failures === 0 ? 0 : 1);
