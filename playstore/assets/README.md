# Play Store graphics

Generated assets for Google Play **Store listing**.

## Upload these

| File | Play Console field |
|------|--------------------|
| `app-icon-512.png` | App icon (512×512) |
| `feature-graphic-1024x500.png` | Feature graphic (1024×500) |
| `screenshot-01.png` … `screenshot-08.png` | Phone screenshots (1080×1920), upload in order |

## Screenshot story (1 → 8)

1. Pilih bahasa tampilan  
2. Masuk, atau coba sebagai tamu  
3. Pelajari alur kerjanya  
4. Tulis kebutuhanmu, lalu buat hasil  
5. Dokumen jadi langsung di layar  
6. Simpan, lalu buka lagi kapan saja  
7. Atur akun, tema, dan kuota  
8. Butuh bantuan? Buka Panduan  

## Regenerate

```bash
npm run build
npm run playstore:assets
```

Or separately:

```bash
node scripts/generate-playstore-assets.mjs   # icon + feature graphic
node scripts/capture-playstore-screenshots.mjs
node scripts/frame-playstore-screenshots.mjs # 2D frames → screenshot-01…08
```
