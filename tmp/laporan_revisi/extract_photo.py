from pathlib import Path
from pypdf import PdfReader
pdf_path=Path(r"C:\Users\FAJAR\Downloads\Laporan-Pelaksanaan-Senam-Tingkat-Kecamatan-Pancoran.pdf")
out=Path(r"E:\apps\promptlab\tmp\laporan_revisi\photo1.jpg")
page=PdfReader(str(pdf_path)).pages[1]
imgs=page.images
print("images", len(imgs))
for i,img in enumerate(imgs):
    print(i, img.name, img.image.size, img.image.mode)
    if i==0:
        out.write_bytes(img.image.tobytes('jpeg','RGB'))
        print("saved", out, out.stat().st_size)
