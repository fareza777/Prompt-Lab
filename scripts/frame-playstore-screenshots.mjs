/**
 * Turn the eight real Android captures in playstore/assets/RAW 2 into a
 * coherent 1080x1920 Play Store story.
 *
 * The UI itself is never regenerated or altered: each card frames a real
 * capture with concise, evidence-based marketing copy.
 */
import {access, mkdir, readdir} from "node:fs/promises";
import {join} from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetsDir = join(root, "playstore", "assets");
const rawDir = join(assetsDir, "RAW 2");
const width = 1080;
const height = 1920;
const phoneWidth = 690;
const phoneHeight = 1533;
const phoneLeft = Math.round((width - phoneWidth) / 2);
const phoneTop = 386;

const story = [
  {
    title: "Semua pekerjaan,\nsatu tempat",
    subtitle: "Laporan, ringkasan, perbandingan, dan tugas harian—tinggal pilih.",
    badge: "15+ TEMPLATE SIAP PAKAI",
    accent: "#B9F7D0",
    glow: "#2D9B6E",
  },
  {
    title: "Foto masuk.\nLaporan jadi.",
    subtitle: "Tambahkan dokumentasi dan sedikit keterangan. AI menyusun laporan lengkap.",
    badge: "LAPORAN KEGIATAN",
    accent: "#FFD8A8",
    glow: "#D97735",
  },
  {
    title: "Dokumen panjang,\nlangsung ringkas",
    subtitle: "Lampirkan berkas, tentukan fokus, lalu dapatkan inti yang mudah dibaca.",
    badge: "RINGKASAN CERDAS",
    accent: "#C7D9FF",
    glow: "#4D73D8",
  },
  {
    title: "Template yang pas\nuntuk setiap tugas",
    subtitle: "Dari caption, balasan surat, terjemahan, sampai prompt foto.",
    badge: "KERJA LEBIH CEPAT",
    accent: "#F0C8FF",
    glow: "#A15BC2",
  },
  {
    title: "Semua hasil\ntertata otomatis",
    subtitle: "Cari kembali pekerjaan berdasarkan tanggal, tanpa membongkar folder.",
    badge: "KALENDER & RIWAYAT",
    accent: "#B9F7D0",
    glow: "#2D9B6E",
  },
  {
    title: "Rapi. Lengkap.\nSiap dibagikan.",
    subtitle: "Salin, simpan, bagikan PDF, atau unduh Word langsung dari hasil kerja.",
    badge: "HASIL SIAP KIRIM",
    accent: "#FFD8A8",
    glow: "#D97735",
  },
  {
    title: "Bukan cuma dokumen.\nData pun beres.",
    subtitle: "Rekap Excel, daftar hadir, dan ekstraksi tabel tersedia dalam alur yang sama.",
    badge: "DATA & TABEL",
    accent: "#C7D9FF",
    glow: "#4D73D8",
  },
  {
    title: "Mudah sejak\npertama dibuka",
    subtitle: "Panduan singkat menjelaskan alur dari bahan sampai file siap dipakai.",
    badge: "TERIMA BERES DENGAN AI",
    accent: "#F0C8FF",
    glow: "#A15BC2",
  },
];

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const titleLines = (title) =>
  title
    .split("\n")
    .map(
      (line, index) =>
        `<text x="72" y="${184 + index * 72}" font-family="Arial, 'Segoe UI', sans-serif" font-size="66" font-weight="800" letter-spacing="-2.4" fill="#FFFDF7">${escapeXml(line)}</text>`,
    )
    .join("");

const svgFor = (screen, index) => {
  const number = String(index + 1).padStart(2, "0");
  const subtitleY = screen.title.includes("\n") ? 348 : 276;
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#101A17"/>
          <stop offset="58%" stop-color="#172A23"/>
          <stop offset="100%" stop-color="#0E1714"/>
        </linearGradient>
        <radialGradient id="halo">
          <stop offset="0%" stop-color="${screen.glow}" stop-opacity=".56"/>
          <stop offset="100%" stop-color="${screen.glow}" stop-opacity="0"/>
        </radialGradient>
        <filter id="shadow" x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow dx="0" dy="34" stdDeviation="36" flood-color="#000000" flood-opacity=".48"/>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <circle cx="900" cy="180" r="520" fill="url(#halo)"/>
      <circle cx="92" cy="1730" r="380" fill="url(#halo)" opacity=".45"/>
      <path d="M-40 490 C250 350 450 540 720 414 C900 332 1020 366 1130 286" fill="none" stroke="${screen.accent}" stroke-opacity=".16" stroke-width="2"/>
      <rect x="72" y="64" width="288" height="48" rx="24" fill="${screen.accent}" fill-opacity=".14" stroke="${screen.accent}" stroke-opacity=".36"/>
      <text x="98" y="96" font-family="Arial, 'Segoe UI', sans-serif" font-size="20" font-weight="700" letter-spacing="1.5" fill="${screen.accent}">${escapeXml(screen.badge)}</text>
      <text x="1008" y="101" text-anchor="end" font-family="Arial, 'Segoe UI', sans-serif" font-size="48" font-weight="800" fill="#FFFDF7" fill-opacity=".26">${number}</text>
      ${titleLines(screen.title)}
      <text x="72" y="${subtitleY}" font-family="Arial, 'Segoe UI', sans-serif" font-size="25" font-weight="500" fill="#D4DED8">${escapeXml(screen.subtitle)}</text>
      <rect x="${phoneLeft - 15}" y="${phoneTop - 15}" width="${phoneWidth + 30}" height="${phoneHeight + 40}" rx="58" fill="#080D0B" filter="url(#shadow)"/>
      <rect x="${phoneLeft - 5}" y="${phoneTop - 5}" width="${phoneWidth + 10}" height="${phoneHeight + 10}" rx="48" fill="#EEE8DD"/>
      <rect x="${phoneLeft + 238}" y="${phoneTop + 12}" width="214" height="20" rx="10" fill="#121916" fill-opacity=".78"/>
      <text x="72" y="1870" font-family="Arial, 'Segoe UI', sans-serif" font-size="18" font-weight="700" letter-spacing="3" fill="#FFFDF7" fill-opacity=".54">AI WORK STUDIO</text>
      <line x1="830" y1="1862" x2="1008" y2="1862" stroke="${screen.accent}" stroke-width="5" stroke-linecap="round"/>
    </svg>
  `);
};

async function roundedScreenshot(path) {
  const mask = Buffer.from(`
    <svg width="${phoneWidth}" height="${phoneHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${phoneWidth}" height="${phoneHeight}" rx="42" fill="#fff"/>
    </svg>
  `);
  return sharp(path)
    .resize(phoneWidth, phoneHeight, {fit: "fill", kernel: sharp.kernel.lanczos3})
    .composite([{input: mask, blend: "dest-in"}])
    .png()
    .toBuffer();
}

async function main() {
  await access(rawDir);
  await mkdir(assetsDir, {recursive: true});
  const files = (await readdir(rawDir))
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (files.length !== story.length) {
    throw new Error(`Expected exactly ${story.length} files in ${rawDir}, found ${files.length}.`);
  }

  for (let index = 0; index < story.length; index += 1) {
    const input = join(rawDir, files[index]);
    const outputName = `screenshot-${String(index + 1).padStart(2, "0")}.png`;
    const output = join(assetsDir, outputName);
    const screen = await roundedScreenshot(input);
    await sharp(svgFor(story[index], index))
      .composite([{input: screen, left: phoneLeft, top: phoneTop}])
      .png({compressionLevel: 9, adaptiveFiltering: true})
      .toFile(output);
    console.log(`wrote ${outputName} <- ${files[index]}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
