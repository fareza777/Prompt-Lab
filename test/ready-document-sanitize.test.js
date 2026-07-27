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
