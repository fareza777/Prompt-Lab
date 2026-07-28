import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeReadyDocument } from "../src/readyDocumentSanitize.js";
import { validateFinishedOutput } from "../src/deliverableProfiles.js";

const sample = `# Laporan Kasus DBD

2. Latar Belakang dan Periode Pelaporan
3. Metodologi dan Sumber Data
4. Temuan Utama
5. Analisis dan Interpretasi
6. Implikasi dan Rekomendasi
7. Lampiran

## 1. Ringkasan Eksekutif
*Tujuan: menyajikan sorotan utama temuan secara padat untuk pembaca tingkat keputusan.*
- Total kumulatif 51 kasus

## 2. Latar Belakang dan Periode Pelaporan
*Tujuan: menetapkan konteks waktu, cakupan wilayah, dan definisi indikator yang digunakan.*
Laporan mencakup periode 1 Januari–24 Juli 2026.

## 7. Lampiran
***Tujuan: menyediakan salinan data asli untuk keperluan verifikasi.***

| Kelurahan | Penambahan |
| --- | --- |
| Kalibata | 4 |

Asumsi: Kolom Kasus Minggu Sebelumnya tidak tersedia pada sumber, sehingga diisi placeholder.

## Daftar Periksa Kualitas (Quality Checklist)
1. Kelengkapan Bagian — tujuh bagian terisi.
2. Keterlacakan Klaim — angka merujuk sumber.
`;

test("strips Tujuan lines, trailing Asumsi, and quality checklist", () => {
  const cleaned = sanitizeReadyDocument(sample, "report");
  assert.doesNotMatch(cleaned, /Tujuan:/i);
  assert.doesNotMatch(cleaned, /Section goal/i);
  assert.doesNotMatch(cleaned, /Daftar Periksa Kualitas/i);
  assert.doesNotMatch(cleaned, /Quality Checklist/i);
  assert.doesNotMatch(cleaned, /Asumsi:\s*Kolom/i);
  assert.match(cleaned, /Ringkasan Eksekutif/);
  assert.match(cleaned, /51 kasus/);
  assert.match(cleaned, /Kalibata/);
});

test("validateFinishedOutput applies ready sanitize for reports", () => {
  const checked = validateFinishedOutput(sample, "report");
  assert.doesNotMatch(checked.content, /Tujuan:/i);
  assert.doesNotMatch(checked.content, /Daftar Periksa Kualitas/i);
});

test("diagram profile is left alone", () => {
  const mermaid = "```mermaid\nflowchart TD\n  A --> B\n```";
  assert.equal(sanitizeReadyDocument(mermaid, "diagram"), mermaid);
});

test("an outline section is scaffolding, not content", () => {
  // Observed in production: a finished 10,341-character report shipped with a
  // section titled "OUTLINE LAPORAN" listing the sections that followed it.
  const doc = [
    "# LAPORAN EVALUASI PROGRAM PELATIHAN",
    "",
    "## OUTLINE LAPORAN",
    "1. Halaman Judul",
    "2. Ringkasan Eksekutif",
    "3. Latar Belakang",
    "",
    "## 1. HALAMAN JUDUL",
    "Nama Program: Peningkatan Kapabilitas Digital",
    "",
    "## 2. RINGKASAN EKSEKUTIF",
    "Program berjalan selama enam bulan.",
  ].join("\n");

  const cleaned = sanitizeReadyDocument(doc);
  assert.doesNotMatch(cleaned, /OUTLINE LAPORAN/i, "outline heading survived");
  // The real sections and their content must remain untouched.
  assert.match(cleaned, /# LAPORAN EVALUASI PROGRAM PELATIHAN/);
  assert.match(cleaned, /## 1\. HALAMAN JUDUL/);
  assert.match(cleaned, /Nama Program: Peningkatan Kapabilitas Digital/);
  assert.match(cleaned, /## 2\. RINGKASAN EKSEKUTIF/);
  assert.match(cleaned, /Program berjalan selama enam bulan\./);
});

test("the other outline and contents headings are stripped too", () => {
  for (const heading of ["Outline", "Outline Dokumen", "Daftar Isi", "Table of Contents", "Kerangka Laporan"]) {
    const doc = `# Judul\n\n## ${heading}\n- A\n- B\n\n## Isi\nTeks nyata.`;
    const cleaned = sanitizeReadyDocument(doc);
    assert.doesNotMatch(cleaned, new RegExp(heading, "i"), `${heading} survived`);
    assert.match(cleaned, /Teks nyata\./, `${heading} removal ate real content`);
  }
});

test("headings that merely mention an outline word are kept", () => {
  // "Outline" as part of a real section title is content, not scaffolding.
  const doc = "# Judul\n\n## Outline Strategi Pemasaran 2026\nRencana kampanye kuartal pertama.";
  const cleaned = sanitizeReadyDocument(doc);
  assert.match(cleaned, /Outline Strategi Pemasaran 2026/);
  assert.match(cleaned, /Rencana kampanye kuartal pertama\./);
});
