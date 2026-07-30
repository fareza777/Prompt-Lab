# Play Store graphics

Generated assets for the Google Play Store listing.

## Upload these

| File | Play Console field |
|------|--------------------|
| `app-icon-512.png` | App icon (512×512) |
| `feature-graphic-1024x500.png` | Feature graphic (1024×500) |
| `screenshot-01.png` … `screenshot-08.png` | Phone screenshots (1080×1920), upload in order |

## Screenshot story (1 → 8)

1. **Semua pekerjaan, satu tempat** — memperkenalkan koleksi template utama.
2. **Foto masuk. Laporan jadi.** — menunjukkan alur Laporan Kegiatan.
3. **Dokumen panjang, langsung ringkas** — menunjukkan ringkasan berbasis berkas.
4. **Template yang pas untuk setiap tugas** — memperluas cakupan pekerjaan.
5. **Semua hasil tertata otomatis** — menunjukkan kalender dan riwayat.
6. **Rapi. Lengkap. Siap dibagikan.** — menampilkan hasil serta ekspor PDF/Word.
7. **Bukan cuma dokumen. Data pun beres.** — memperkenalkan alat data dan tabel.
8. **Mudah sejak pertama dibuka** — menutup dengan panduan dan janji produk.

Sumber UI: delapan tangkapan Android asli di `RAW 2/`. Generator hanya membingkai
layar dan menambahkan narasi; isi aplikasi tidak direkayasa.

## Regenerate screenshots

```bash
npm run playstore:frame
```

## Remotion promotional video

```bash
npm run playstore:promo
```

Output: `promo/AI-Work-Studio-remotion-1080p.mp4` (1920×1080, 30 detik,
H.264, musik latar orisinal yang dibuat lokal).
