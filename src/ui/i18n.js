/**
 * UI language. Indonesian is the default; English is available and the locale
 * is auto-detected on first run.
 *
 * This is deliberately separate from the *output* language — a user can read
 * the interface in Indonesian and still ask for an English document. Output
 * language stays owned by promptLanguage.js.
 *
 * Copy rule: describe what the app does, never what it promises. No
 * "perfect", "production-ready", or "guaranteed" — those are both untrue and a
 * Play Store misrepresentation risk.
 */

const STORE_KEY = "promptlab-ui-lang";

/**
 * `label` is the short form used in the settings toggle; `nativeLabel` is how
 * the language names itself, which is what a picker should show.
 */
export const LANGUAGES = [
  { code: "id", label: "Indonesia", nativeLabel: "Bahasa Indonesia" },
  { code: "en", label: "English", nativeLabel: "English" },
];

const id = {
  "app.name": "AI Work Studio",
  "app.tagline": "Studio hasil kerja AI",

  "nav.history": "Riwayat",
  "nav.account": "Akun",
  "nav.skip": "Langsung ke isi",
  "nav.close": "Tutup",
  "nav.back": "Kembali",

  "canvas.title": "Apa yang ingin kamu hasilkan?",
  "canvas.eyebrow": "Studio kerja AI",
  "canvas.hero": "Dari ide mentah menjadi hasil yang siap dipakai.",
  "canvas.subtitle":
    "Mulai dari ide, catatan, foto, atau file. AI Work Studio mengubahnya langsung menjadi dokumen kerja yang siap dipakai.",
  "canvas.placeholder":
    "Contoh: buatkan laporan bulanan dari data penjualan di file ini, lengkap dengan ringkasan dan rekomendasi.",
  "canvas.generate": "Buat hasil",
  "canvas.generating": "Sedang membuat…",
  "canvas.stop": "Hentikan",
  "canvas.attach": "Lampirkan",
  "canvas.attachHint":
    "Foto, tangkapan layar, PDF, Word, Excel, PowerPoint, atau teks.",
  "canvas.removeFile": "Hapus lampiran {name}",
  "canvas.clear": "Mulai baru",

  "tpl.galleryKicker": "MULAI DARI SINI",
  "tpl.galleryTitle": "Pilih hasil yang ingin dibuat",
  "tpl.gallerySubtitle":
    "Pilih template, tambahkan bahan, dan dapatkan dokumen siap kirim.",
  "tpl.search": "Cari template",
  "tpl.searchEmpty": "Tidak ada template yang cocok.",
  "tpl.group.report": "Laporan",
  "tpl.group.meeting": "Rapat & tindak lanjut",
  "tpl.group.extract": "Data & tabel",
  "tpl.group.utility": "Alat bantu",
  "tpl.group.custom": "Template saya",
  "tpl.templateCount": "{n} template",
  "tpl.change": "Ganti template",
  "tpl.attachTitle": "Bahan",
  "tpl.attachPhotos": "Tambah foto",
  "tpl.attachFiles": "Tambah berkas",
  "tpl.needImages": "Lampirkan minimal {n} foto.",
  "tpl.needFiles": "Lampirkan minimal {n} berkas.",
  "tpl.needSource": "Lampirkan berkas atau isi catatannya dulu.",
  "tpl.needSlot": "Lampirkan {label} dulu.",
  "tpl.needField": "Isi dulu kolom {label}.",
  "tpl.detailsTitle": "Keterangan",
  "tpl.limitRemaining": "Masih bisa menambah {n} lampiran.",
  "tpl.limitReached": "Sudah mencapai batas {n} lampiran untuk paketmu.",
  "tpl.needNote": "Isi kolom di atas dulu.",
  "tpl.tooMany": "Maksimal {n} lampiran.",
  "tpl.generate": "Buat dokumen",
  "tpl.working": "Sedang membuat dokumen",
  "tpl.step.reading": "Membaca lampiran",
  "tpl.step.drafting": "Menyusun dokumen",
  "tpl.step.finishing": "Merapikan hasil",
  "tpl.workingHint": "Biasanya 20–60 detik. Layar boleh ditinggal.",
  "tpl.startOver": "Buat yang baru",
  "tpl.optional": "opsional",
  "tpl.exportXlsx": "Unduh Excel",

  "cal.title": "Kalender",
  "cal.prevMonth": "Bulan sebelumnya",
  "cal.nextMonth": "Bulan berikutnya",
  "cal.empty": "Belum ada dokumen di tanggal ini.",
  "cal.untitled": "Tanpa judul",
  "cal.changeDate": "Ubah tanggal",
  "cal.delete": "Hapus dokumen",
  "cal.dayWithCount": "{date}, {n} dokumen",
  "cal.openHint": "Ketuk dokumen untuk membukanya, lalu unduh atau bagikan.",
  "cal.saved": "Tersimpan di kalender",
  "theme.title": "Warna tampilan",
  "theme.intro":
    "Pilih satu tema siap pakai, atau atur sendiri warnanya di bawah. Semua pilihan gratis.",
  "theme.customTitle": "Atur sendiri",
  "theme.customHint":
    "Empat warna ini yang kamu tentukan. Garis, bayangan, dan warna tombol dihitung otomatis dari keempatnya.",
  "theme.colour.paper": "Latar halaman",
  "theme.colour.surface": "Kartu & dokumen",
  "theme.colour.ink": "Tulisan",
  "theme.colour.accent": "Aksen",
  "theme.contrastOk": "Keterbacaan bagus — kontras tulisan {ratio}:1.",
  "theme.warnTextPage":
    "Tulisan sulit dibaca di latar itu (kontras {ratio}:1). Gelapkan tulisannya atau terangkan latarnya.",
  "theme.warnTextCard":
    "Tulisan sulit dibaca di atas kartu (kontras {ratio}:1) — dan di situlah dokumenmu ditampilkan.",
  "theme.warnAccent":
    "Warna aksen terlalu mirip latarnya (kontras {ratio}:1), jadi tombol dan judul akan tenggelam.",
  "theme.warnLayers":
    "Latar halaman dan kartu terlalu jauh berbeda, jadi tampilannya terasa belang.",
  "theme.warnInvalid": "Ada warna yang belum valid.",
  "theme.reset": "Kembalikan ke bawaan",

  "cal.search": "Cari judul atau isi dokumen",
  "cal.searchCount": "{n} dokumen cocok",

  "editor.title": "Buat template sendiri",
  "editor.new": "Template baru",
  "editor.intro":
    "Template yang baik menentukan tiga hal: data apa yang ditanyakan ke kamu, bagian apa saja yang harus ada di dokumen, dan aturan penulisannya. Semakin spesifik, semakin hasilnya langsung bisa dipakai tanpa diedit.",
  "editor.duplicate": "Mulai dari template yang ada",
  "editor.duplicateHint":
    "Cara tercepat: pilih yang paling mirip, semua isinya akan terisi lalu tinggal kamu ubah.",
  "editor.duplicatePick": "Mulai dari kosong",
  "editor.copySuffix": "salinan",
  "editor.name": "Nama template",
  "editor.namePlaceholder": "Contoh: Laporan Piket Harian",
  "editor.blurb": "Keterangan singkat",
  "editor.blurbHint": "Satu kalimat yang muncul di bawah nama template pada daftar.",
  "editor.blurbPlaceholder": "Contoh: Foto buku jaga menjadi laporan piket.",

  "editor.fields": "Kolom yang harus diisi",
  "editor.fieldsHint":
    "Satu kolom per baris. Tambahkan * di belakang nama kalau wajib diisi. Tambahkan « | date », « | time », atau « | textarea » untuk mengubah jenis kolom — kolom tanggal dan jam terisi otomatis. Kolom pertama yang wajib akan dipakai sebagai judul dokumen dan nama berkas.",
  "editor.fieldsPlaceholder": "Nama Petugas*\nTanggal | date\nJam Mulai | time\nCatatan Kejadian | textarea",

  "editor.sections": "Bagian dokumen",
  "editor.sectionsHint":
    "Satu bagian per baris, urut dari atas ke bawah. Inilah kerangka dokumennya — AI wajib memakai persis judul-judul ini.",
  "editor.sectionsPlaceholder": "Waktu Piket\nPetugas Jaga\nKejadian\nSerah Terima",

  "editor.instruction": "Aturan penulisan",
  "editor.instructionHint":
    "Jelaskan sedetail mungkin: bentuk dokumennya (laporan resmi, notulen, surat), bagian mana yang harus berupa tabel dan apa saja kolomnya, bagian mana yang harus paragraf, panjangnya berapa, gaya bahasanya, dan hal apa yang TIDAK boleh dikarang.",
  "editor.instructionPlaceholder":
    "Contoh:\nSusun laporan piket harian bergaya laporan dinas.\n\"Kejadian\" berupa tabel Markdown: Jam | Kejadian | Tindakan.\n\"Serah Terima\" satu paragraf pendek.\nPanjang sekitar 1 halaman.\nJangan mengarang nama orang atau jam yang tidak tercatat — tulis \"Belum tersedia\".",

  "editor.needsAttachment": "Wajib melampirkan foto atau berkas",
  "editor.incomplete": "Nama, bagian dokumen, dan aturan penulisan wajib diisi.",
  "editor.save": "Simpan template",

  "advanced.toggle": "Pengaturan lanjutan",
  "advanced.category": "Bidang",
  "advanced.tone": "Gaya bahasa",
  "advanced.model": "Target AI",
  "advanced.outputType": "Bentuk hasil",
  "advanced.hint":
    "Biarkan apa adanya kalau ragu — AI Work Studio sudah memilih yang paling umum.",

  "starters.title": "Mulai dari contoh",
  "starters.all": "Lihat semua",
  "starters.search": "Cari contoh",
  "starters.empty": "Tidak ada contoh yang cocok.",

  "result.eyebrow": "Hasil kerja",
  "result.streaming": "Sedang ditulis…",
  "result.title": "Siap dilanjutkan",
  "result.failedTitle": "Dokumen belum jadi",
  "result.ready": "Selesai",
  "result.readiness": "Kesiapan",
  "result.readinessHelp":
    "Perkiraan kelengkapan berdasarkan konteks, format, batasan, dan kejelasan tindakan. Ini penilaian otomatis, bukan jaminan kualitas.",
  "result.copy": "Salin",
  "result.copied": "Tersalin",
  "result.save": "Simpan",
  "result.saved": "Tersimpan",
  "result.improve": "Perbaiki",
  "result.improving": "Memperbaiki…",
  "result.compare": "Bandingkan",
  "result.export": "Unduh",
  "result.exportPdf": "Bagikan / Ekspor PDF",
  "result.exportWord": "Unduh Word",
  "result.exportPpt": "Unduh PowerPoint",
  "result.exportPng": "Unduh PNG",
  "result.exportSvg": "Unduh SVG",
  "result.exportDiagramHint": "PNG/SVG menampilkan diagramnya, bukan hanya kode.",
  "result.exportPngFailed": "Gagal mengunduh PNG. Coba Unduh SVG, atau buat ulang hasilnya.",
  "result.saveDiagramTitle": "Simpan diagram",
  "result.saveDiagramHint": "Silakan bagikan atau unduh file siap pakai.",
  "result.savePdfTitle": "Bagikan & unduh PDF",
  "result.saveWordTitle": "Bagikan & unduh Word",
  "result.savePptTitle": "Simpan PowerPoint",
  "result.saveOfficeHint": "Silakan bagikan atau unduh laporan siap pakai.",
  "result.savePdfShare": "Bagikan PDF",
  "result.savePdfDownload": "Unduh PDF",
  "result.saveWordDownload": "Unduh Word",
  "result.saveDiagramShare": "Bagikan file",
  "result.saveDiagramDownload": "Unduh file",
  "result.saveDiagramClose": "Tutup",
  "result.sections": "Bagian hasil",
  "result.untitledSection": "Bagian",
  "result.emptySection": "Bagian ini belum berisi teks.",
  "result.report": "Laporkan hasil ini",
  "result.aiNotice":
    "Dibuat oleh AI. Periksa kembali sebelum dipakai atau dikirim.",
  "result.run": "Jalankan sekarang",
  "result.running": "Menjalankan…",
  "result.runHint":
    "Kerjakan permintaan ini di sini dan dapatkan hasil jadinya tanpa berpindah aplikasi.",
  "result.tabPrompt": "Instruksi internal",
  "result.tabOutput": "Hasil jadi",
  "result.backToPrompt": "Lihat instruksi internal",
  "result.runWorking": "Sedang mengerjakan permintaanmu",
  "result.runWorkingHint":
    "Menyiapkan hasil lengkap biasanya 30–60 detik. Biarkan halaman ini terbuka.",
  "result.runFailed": "Hasil belum berhasil dibuat. Coba lagi sebentar.",
  "result.working": "Sedang menyiapkan hasil kerjamu",
  "result.workingHint":
    "AI Work Studio sedang membaca konteks dan menyiapkan hasil final.",

  "improve.title": "Perbaiki hasil",
  "improve.pick": "Mau diperbaiki ke arah mana?",
  "improve.apply": "Gunakan versi ini",
  "improve.keep": "Tetap pakai yang lama",
  "improve.added": "{n} kata ditambah",
  "improve.removed": "{n} kata dihapus",
  "improve.wordDelta": "total {delta} kata",
  "improve.mode.Clearer": "Lebih jelas",
  "improve.mode.Shorter": "Lebih ringkas",
  "improve.mode.More Detailed": "Lebih rinci",
  "improve.mode.Academic": "Gaya akademik",
  "improve.mode.Marketing": "Gaya pemasaran",
  "improve.mode.Coding": "Gaya teknis",

  "compare.title": "Bandingkan versi",
  "compare.before": "Sebelumnya",
  "compare.after": "Sesudah",
  "compare.run": "Bandingkan",
  "compare.running": "Membandingkan…",
  "compare.empty": "Perbaiki hasil dulu supaya ada dua versi untuk dibandingkan.",
  "compare.criteria.clarity": "Kejelasan",
  "compare.criteria.context": "Konteks",
  "compare.criteria.format": "Format",
  "compare.criteria.constraints": "Batasan",
  "compare.heuristicNote":
    "Penilaian ini dihitung otomatis dari struktur teks, bukan oleh AI.",
  "compare.providerNote": "Penilaian ini dibuat oleh model AI.",

  "history.title": "Riwayat",
  "history.search": "Cari di riwayat",
  "history.empty": "Belum ada yang disimpan.",
  "history.emptyHint": "Hasil yang kamu simpan akan muncul di sini.",
  "history.open": "Buka",
  "history.delete": "Hapus",
  "history.duplicate": "Gandakan",
  "history.local": "Tersimpan di perangkat ini",
  "history.synced": "Tersinkron",
  "history.count": "{n} tersimpan",

  "account.title": "Akun",
  "account.signIn": "Masuk",
  "account.signUp": "Daftar",
  "account.signOut": "Keluar",
  "account.guest": "Mode tamu",
  "account.guestNote":
    "Kamu memakai mode tamu. Hasil hanya tersimpan di perangkat ini.",
  "account.email": "Email",
  "account.password": "Kata sandi",
  "account.name": "Nama",
  "account.passwordHint": "Minimal 6 karakter",
  "account.forgot": "Lupa kata sandi",
  "account.or": "atau",
  "account.google": "Lanjut dengan Google",
  "account.plan": "Paket",
  "account.quota": "Sisa kuota",
  "account.quotaReset": "Diperbarui {date}",
  "account.upgrade": "Tingkatkan paket",
  "account.upgradePro": "Pilih Pro",
  "account.upgradeBusiness": "Pilih Business",
  "account.restore": "Pulihkan pembelian",
  "account.delete": "Hapus akun permanen",
  "account.deleteHint":
    "Menghapus akun akan menghapus profil, riwayat tersinkron, dan langganan yang tercatat. Tindakan ini tidak bisa dibatalkan.",
  "account.language": "Bahasa",
  "account.theme": "Tampilan",
  "account.theme.system": "Sistem",
  "account.theme.light": "Terang",
  "account.theme.dark": "Gelap",
  "account.privacy": "Kebijakan privasi",
  "account.terms": "Ketentuan layanan",
  "account.help": "Bantuan",

  "auth.gate.title": "Masuk untuk mulai",
  "auth.gate.lede":
    "Pakai akun agar riwayat tersimpan, atau lanjut sebagai tamu tanpa email.",
  "auth.gate.guest": "Lanjut sebagai tamu",
  "auth.gate.guestBusy": "Menyiapkan mode tamu…",
  "auth.gate.guestHint": "Tanpa email. 5 hasil gratis per minggu. Bisa daftar nanti.",

  "nav.home": "Beranda",
  "brand.homeAria": "Kembali ke beranda AI Work Studio",

  "firstrun.skip": "Lewati",
  "firstrun.next": "Lanjut",
  "firstrun.start": "Mulai bekerja",
  "firstrun.startNow": "Lewati saja, langsung coba",
  "firstrun.stepOf": "Langkah {n} dari {total}",

  "firstrun.templates.title": "Pilih dulu mau membuat apa",
  "firstrun.templates.body":
    "Ada 15 template siap pakai: laporan kegiatan, notulen rapat, ringkasan, sebelum & sesudah, rekap Excel, dan lainnya. Setiap template punya format dan aturannya sendiri.",
  "firstrun.templates.point1": "Tidak perlu menulis instruksi panjang — cukup pilih pekerjaannya",
  "firstrun.templates.point2": "Format dokumen sudah ditentukan per template",
  "firstrun.templates.point3": "Bisa membuat template sendiri kalau ada format khusus",

  "firstrun.input.title": "Lampirkan bahannya",
  "firstrun.input.body":
    "Template akan meminta bahan yang memang dibutuhkannya saja. Tambahkan satu baris catatan kalau ada konteks yang tidak terlihat di lampiran.",
  "firstrun.input.point1": "Foto kegiatan, tangkapan layar, absensi, atau catatan tulisan tangan",
  "firstrun.input.point2": "PDF, Word, Excel, PowerPoint — teksnya dibaca otomatis",
  "firstrun.input.point3": "Cukup satu lampiran, kecuali Sebelum & Sesudah yang perlu dua foto",

  "firstrun.build.title": "Satu tombol, dokumen jadi",
  "firstrun.build.body":
    "Tekan Buat dokumen, lalu tunggu. Yang keluar adalah dokumen berformat lengkap yang siap dikirim, bukan draf mentah.",
  "firstrun.build.point1": "Biasanya 20–60 detik; layar boleh ditinggal",
  "firstrun.build.point2": "AI melengkapi narasi dengan asumsi umum agar dokumen terasa utuh",
  "firstrun.build.point3": "Nama, angka, keputusan, dan fakta yang bisa diperiksa tidak dikarang",

  "firstrun.calendar.title": "Semua tercatat per tanggal",
  "firstrun.calendar.body":
    "Setiap dokumen otomatis tersimpan ke kalender. Dua minggu kemudian tinggal pilih tanggalnya untuk menemukannya lagi.",
  "firstrun.calendar.point1": "Tidak perlu menekan tombol simpan",
  "firstrun.calendar.point2": "Tanggal bisa dimundurkan ke hari kegiatan sebenarnya",
  "firstrun.calendar.point3": "Buka lagi kapan saja untuk diunduh ulang",

  "firstrun.output.title": "Unduh, bagikan, selesai",
  "firstrun.output.body":
    "Dari hasil jadi, unduh ke HP atau bagikan lewat WhatsApp, email, dan Drive memakai menu berbagi bawaan.",
  "firstrun.output.point1": "Word dan Excel tersedia di paket gratis; PowerPoint di paket berbayar",
  "firstrun.output.point2": "Riwayat tersinkron antar perangkat setelah punya akun",
  "firstrun.output.point3": "5 dokumen gratis per minggu untuk tamu",

  "guide.title": "Panduan",
  "guide.intro":
    "Semua yang perlu diketahui untuk memakai AI Work Studio, bisa dibuka kapan saja.",
  "guide.replay": "Putar ulang perkenalan",
  "guide.section.workflow": "Alur kerja",
  "guide.section.tips": "Cara dapat hasil lebih baik",
  "guide.section.limits": "Batas dan hal yang perlu diketahui",
  "guide.tip1":
    "Pilih template yang paling dekat dengan pekerjaanmu. Template yang tepat lebih berpengaruh pada hasil daripada catatan yang panjang.",
  "guide.tip2":
    "Foto yang jelas dan tidak miring jauh lebih terbaca, terutama untuk daftar hadir dan tabel.",
  "guide.tip3":
    "Isi kolom catatan dengan hal yang tidak terlihat di foto — tanggal, nama kegiatan, atau lokasi. Itu yang paling sering dibutuhkan.",
  "guide.tip4":
    "Kalau formatnya selalu sama dan tidak ada di daftar, buat template sendiri sekali lalu pakai terus.",
  "guide.limit1":
    "Hasil dibuat oleh AI dan bisa salah. Selalu periksa angka, nama, dan tanggal sebelum dikirim.",
  "guide.limit2":
    "AI boleh memakai asumsi umum untuk menyambung narasi, tetapi tidak mengarang nama, angka, keputusan, atau fakta spesifik yang bisa diperiksa.",
  "guide.limit3":
    "Menyusun butuh sekitar 20–60 detik. Menutup aplikasi saat proses berjalan akan membatalkannya.",
  "guide.limit4":
    "Unduh Word dan Excel tersedia di paket gratis. PowerPoint mulai paket Pro.",

  "about.title": "Tentang",
  "about.blurb":
    "AI Work Studio mengubah catatan, foto, dan file jadi dokumen kerja: laporan, slide, ringkasan, dan analisis.",
  "about.rate": "Beri rating di Play Store",
  "about.deleteHelp": "Cara hapus akun",

  "trial.left": "Sisa {n} dari 5 hasil gratis minggu ini",
  "trial.lastOne": "Sisa 1 dari 5 hasil gratis minggu ini",
  "trial.over": "Batas 5 hasil gratis minggu ini sudah tercapai",
  "trial.overHint":
    "Kuota diperbarui setiap Senin. Tingkatkan paket jika perlu melanjutkan sekarang.",
  "trial.cta": "Lihat pilihan paket",

  "report.title": "Laporkan hasil ini",
  "report.intro":
    "Beri tahu kami kalau hasil AI ini tidak pantas, menyesatkan, atau melanggar hak orang lain. Laporan ditinjau manusia.",
  "report.reason": "Alasan",
  "report.reason.offensive": "Kasar atau menyinggung",
  "report.reason.harmful": "Berbahaya atau menyesatkan",
  "report.reason.sexual": "Konten seksual",
  "report.reason.violence": "Kekerasan atau ujaran kebencian",
  "report.reason.privacy": "Membocorkan data pribadi",
  "report.reason.ip": "Melanggar hak cipta",
  "report.reason.other": "Lainnya",
  "report.detail": "Penjelasan singkat",
  "report.detailPlaceholder": "Ceritakan singkat apa yang bermasalah.",
  "report.submit": "Kirim laporan",
  "report.sending": "Mengirim…",
  "report.thanks": "Terima kasih. Laporanmu sudah kami terima.",
  "report.failed": "Laporan gagal dikirim. Coba lagi sebentar.",

  "error.generic": "Ada yang tidak beres. Coba lagi.",
  "error.offline": "Tidak bisa terhubung. Periksa koneksi internetmu, lalu coba lagi.",
  "error.empty": "Tulis dulu permintaanmu.",
  "error.needAccount": "Buat akun gratis dulu untuk memakai AI.",
  "error.quota": "Kuotamu sudah habis bulan ini. Tingkatkan paket untuk melanjutkan.",
  "error.rateLimited": "Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.",
  "error.timeout": "AI terlalu lama merespons. Coba lagi sebentar.",
  "error.runTooLong":
    "Dokumennya terlalu berat untuk diselesaikan sekali jalan. Coba Buat hasil lagi — sistem sudah default ke versi ringkas — atau minta satu bagian saja.",
  "error.unreadableDocument":
    "Teks di berkas itu tidak bisa dibaca, jadi hasilnya pasti melenceng. Kalau PDF-nya hasil scan atau foto, lampirkan fotonya langsung — foto bisa dibaca. Bisa juga salin isinya ke kolom catatan.",
  "error.busy": "AI sedang sibuk. Coba lagi sebentar.",
  "error.notConfigured": "Layanan AI belum dikonfigurasi. Hubungi dukungan.",
  "error.fileTooLarge": "File terlalu besar. Maksimal 8 MB per file.",
  "error.unsupportedFile": "Jenis file ini belum didukung.",

  "common.cancel": "Batal",
  "common.done": "Selesai",
  "common.retry": "Coba lagi",
  "common.more": "Selengkapnya",

  // Option labels. The values themselves stay English (see ui/options.js).
  "opt.category.Marketing": "Pemasaran",
  "opt.category.Content Creator": "Konten kreator",
  "opt.category.Business": "Bisnis",
  "opt.category.Coding": "Pemrograman",
  "opt.category.Academic": "Akademik",
  "opt.category.Image AI": "AI gambar",
  "opt.category.Video AI": "AI video",

  "opt.tone.Professional": "Formal",
  "opt.tone.Casual": "Santai",
  "opt.tone.Persuasive": "Persuasif",
  "opt.tone.Creative": "Kreatif",

  "opt.output.Application Code": "Kode aplikasi",
  "opt.output.Word Document": "Dokumen Word",
  "opt.output.PPT": "Slide presentasi",
  "opt.output.Technical Design": "Desain teknis",
  "opt.output.Analysis": "Analisis",
  "opt.output.Content": "Konten",
  "opt.output.Diagram": "Diagram alur (infografis)",
  "opt.output.Image Prompt": "Arahan gambar AI",
  "opt.output.Video Prompt": "Arahan video AI",
  "result.diagramTitle": "Diagram",
  "result.diagramSource": "Kode Mermaid",
  "result.diagramDrawing": "Sedang menggambar diagram…",
  "result.diagramInfographicHint": "Infografis alur dari dokumen — unduh PNG untuk menyimpan.",
  "result.diagramError": "Diagram tidak bisa digambar. Kode sumber tetap ditampilkan di bawah.",
};

const en = {
  "app.name": "AI Work Studio",
  "app.tagline": "AI work studio",

  "nav.history": "History",
  "nav.account": "Account",
  "nav.skip": "Skip to content",
  "nav.close": "Close",
  "nav.back": "Back",

  "canvas.title": "What do you want to produce?",
  "canvas.eyebrow": "AI work studio",
  "canvas.hero": "Turn a rough idea into work that is ready to use.",
  "canvas.subtitle":
    "Start with an idea, note, photo, or file. AI Work Studio turns it directly into finished work.",
  "canvas.placeholder":
    "For example: write a monthly report from the sales data in this file, with a summary and recommendations.",
  "canvas.generate": "Create result",
  "canvas.generating": "Creating…",
  "canvas.stop": "Stop",
  "canvas.attach": "Attach",
  "canvas.attachHint":
    "Photos, screenshots, PDF, Word, Excel, PowerPoint, or text.",
  "canvas.removeFile": "Remove attachment {name}",
  "canvas.clear": "Start over",

  "tpl.galleryKicker": "START HERE",
  "tpl.galleryTitle": "Choose what you want to make",
  "tpl.gallerySubtitle":
    "Pick a template, add your material, and get a document ready to send.",
  "tpl.search": "Search templates",
  "tpl.searchEmpty": "No template matches that.",
  "tpl.group.report": "Reports",
  "tpl.group.meeting": "Meetings & follow-up",
  "tpl.group.extract": "Data & tables",
  "tpl.group.utility": "Tools",
  "tpl.group.custom": "My templates",
  "tpl.templateCount": "{n} templates",
  "tpl.change": "Change template",
  "tpl.attachTitle": "Material",
  "tpl.attachPhotos": "Add photos",
  "tpl.attachFiles": "Add files",
  "tpl.needImages": "Attach at least {n} photo(s).",
  "tpl.needFiles": "Attach at least {n} file(s).",
  "tpl.needSource": "Attach a file or write the notes first.",
  "tpl.needSlot": "Attach the {label} first.",
  "tpl.needField": "Fill in {label} first.",
  "tpl.detailsTitle": "Details",
  "tpl.limitRemaining": "You can add {n} more attachment(s).",
  "tpl.limitReached": "That is the {n}-attachment limit on your plan.",
  "tpl.needNote": "Fill in the field above first.",
  "tpl.tooMany": "At most {n} attachments.",
  "tpl.generate": "Create document",
  "tpl.working": "Creating your document",
  "tpl.step.reading": "Reading the attachments",
  "tpl.step.drafting": "Writing the document",
  "tpl.step.finishing": "Tidying the result",
  "tpl.workingHint": "Usually 20–60 seconds. You can leave this screen.",
  "tpl.startOver": "Make another",
  "tpl.optional": "optional",
  "tpl.exportXlsx": "Download Excel",

  "cal.title": "Calendar",
  "cal.prevMonth": "Previous month",
  "cal.nextMonth": "Next month",
  "cal.empty": "Nothing filed on this day yet.",
  "cal.untitled": "Untitled",
  "cal.changeDate": "Change date",
  "cal.delete": "Delete document",
  "cal.dayWithCount": "{date}, {n} document(s)",
  "cal.openHint": "Tap a document to open it, then download or share.",
  "cal.saved": "Filed in the calendar",
  "theme.title": "Colours",
  "theme.intro":
    "Pick a ready theme, or set the colours yourself below. Every option is free.",
  "theme.customTitle": "Set your own",
  "theme.customHint":
    "You choose these four. Rules, shadows and button colours are derived from them.",
  "theme.colour.paper": "Page background",
  "theme.colour.surface": "Cards & documents",
  "theme.colour.ink": "Text",
  "theme.colour.accent": "Accent",
  "theme.contrastOk": "Comfortable to read — text contrast {ratio}:1.",
  "theme.warnTextPage":
    "Text is hard to read on that background ({ratio}:1). Darken the text or lighten the page.",
  "theme.warnTextCard":
    "Text is hard to read on the cards ({ratio}:1) — and that is where your documents appear.",
  "theme.warnAccent":
    "The accent is too close to the background ({ratio}:1), so buttons and headings will sink into it.",
  "theme.warnLayers":
    "The page and the cards are too far apart, which makes the interface look patchy.",
  "theme.warnInvalid": "One of those colours is not valid yet.",
  "theme.reset": "Back to the default",

  "cal.search": "Search titles or document text",
  "cal.searchCount": "{n} document(s) match",

  "editor.title": "Create your own template",
  "editor.new": "New template",
  "editor.intro":
    "A good template pins down three things: what it asks you for, which sections the document must have, and the rules the writing follows. The more specific it is, the less you have to edit afterwards.",
  "editor.duplicate": "Start from an existing template",
  "editor.duplicateHint":
    "Quickest route: pick the closest one, everything fills in, then change what you need.",
  "editor.duplicatePick": "Start from blank",
  "editor.copySuffix": "copy",
  "editor.name": "Template name",
  "editor.namePlaceholder": "e.g. Daily Duty Report",
  "editor.blurb": "One-line description",
  "editor.blurbHint": "Shown under the template's name in the gallery.",
  "editor.blurbPlaceholder": "e.g. Logbook photos become a duty report.",

  "editor.fields": "Fields to ask for",
  "editor.fieldsHint":
    "One field per line. Add * after the name to make it required. Add « | date », « | time », or « | textarea » to change the type — date and time fields fill themselves in. The first required field names the document and the downloaded file.",
  "editor.fieldsPlaceholder": "Officer name*\nDate | date\nStart time | time\nIncident notes | textarea",

  "editor.sections": "Document sections",
  "editor.sectionsHint":
    "One section per line, in order. This is the document's skeleton — the AI must use exactly these headings.",
  "editor.sectionsPlaceholder": "Duty Hours\nOfficer on Duty\nIncidents\nHandover",

  "editor.instruction": "Writing rules",
  "editor.instructionHint":
    "Be as specific as you can: what kind of document it is, which sections must be tables and with which columns, which must be prose, how long, the tone, and what must never be invented.",
  "editor.instructionPlaceholder":
    "e.g.\nWrite a daily duty report in official register.\n\"Incidents\" is a Markdown table: Time | Incident | Action taken.\n\"Handover\" is one short paragraph.\nAbout one page.\nNever invent names or times that are not recorded — write \"Not provided\".",

  "editor.needsAttachment": "An attachment is required",
  "editor.incomplete": "Name, document sections, and writing rules are all required.",
  "editor.save": "Save template",

  "advanced.toggle": "Advanced options",
  "advanced.category": "Field",
  "advanced.tone": "Tone",
  "advanced.model": "Target AI",
  "advanced.outputType": "Output form",
  "advanced.hint":
    "Leave these alone if unsure — AI Work Studio has picked the most common defaults.",

  "starters.title": "Start from an example",
  "starters.all": "See all",
  "starters.search": "Search examples",
  "starters.empty": "No matching examples.",

  "result.eyebrow": "Finished work",
  "result.streaming": "Writing…",
  "result.title": "Ready to continue",
  "result.failedTitle": "Document not created",
  "result.ready": "Complete",
  "result.readiness": "Readiness",
  "result.readinessHelp":
    "An estimate of completeness across context, format, constraints, and actionability. This is an automated score, not a quality guarantee.",
  "result.copy": "Copy",
  "result.copied": "Copied",
  "result.save": "Save",
  "result.saved": "Saved",
  "result.improve": "Improve",
  "result.improving": "Improving…",
  "result.compare": "Compare",
  "result.export": "Download",
  "result.exportPdf": "Share / Export PDF",
  "result.exportWord": "Download Word",
  "result.exportPpt": "Download PowerPoint",
  "result.exportPng": "Download PNG",
  "result.exportSvg": "Download SVG",
  "result.exportDiagramHint": "PNG/SVG show the rendered diagram, not just the code.",
  "result.exportPngFailed": "PNG download failed. Try SVG, or regenerate the result.",
  "result.saveDiagramTitle": "Save diagram",
  "result.saveDiagramHint": "Share or download the ready-to-use file.",
  "result.savePdfTitle": "Share & download PDF",
  "result.saveWordTitle": "Share & download Word",
  "result.savePptTitle": "Save PowerPoint",
  "result.saveOfficeHint": "Share or download the ready-to-use report.",
  "result.savePdfShare": "Share PDF",
  "result.savePdfDownload": "Download PDF",
  "result.saveWordDownload": "Download Word",
  "result.saveDiagramShare": "Share file",
  "result.saveDiagramDownload": "Download file",
  "result.saveDiagramClose": "Close",
  "result.sections": "Result sections",
  "result.untitledSection": "Section",
  "result.emptySection": "This section has no text yet.",
  "result.report": "Report this result",
  "result.aiNotice": "Generated by AI. Check it before you use or send it.",
  "result.run": "Run it now",
  "result.running": "Running…",
  "result.runHint":
    "Complete this request here and get the finished result without switching apps.",
  "result.tabPrompt": "Internal instruction",
  "result.tabOutput": "Finished result",
  "result.backToPrompt": "View internal instruction",
  "result.runWorking": "Working on your request",
  "result.runWorkingHint":
    "Preparing the complete result usually takes 30–60 seconds. Keep this page open.",
  "result.runFailed": "The result could not be created. Please try again shortly.",
  "result.working": "Preparing your finished work",
  "result.workingHint":
    "AI Work Studio is reading the context and preparing the final result.",

  "improve.title": "Improve the result",
  "improve.pick": "Which direction?",
  "improve.apply": "Use this version",
  "improve.keep": "Keep the original",
  "improve.added": "{n} words added",
  "improve.removed": "{n} words removed",
  "improve.wordDelta": "{delta} words overall",
  "improve.mode.Clearer": "Clearer",
  "improve.mode.Shorter": "Shorter",
  "improve.mode.More Detailed": "More detailed",
  "improve.mode.Academic": "Academic",
  "improve.mode.Marketing": "Marketing",
  "improve.mode.Coding": "Technical",

  "compare.title": "Compare versions",
  "compare.before": "Before",
  "compare.after": "After",
  "compare.run": "Compare",
  "compare.running": "Comparing…",
  "compare.empty": "Improve the result first so there are two versions to compare.",
  "compare.criteria.clarity": "Clarity",
  "compare.criteria.context": "Context",
  "compare.criteria.format": "Format",
  "compare.criteria.constraints": "Constraints",
  "compare.heuristicNote":
    "This score is computed from text structure, not judged by AI.",
  "compare.providerNote": "This score was produced by an AI model.",

  "history.title": "History",
  "history.search": "Search history",
  "history.empty": "Nothing saved yet.",
  "history.emptyHint": "Results you save will appear here.",
  "history.open": "Open",
  "history.delete": "Delete",
  "history.duplicate": "Duplicate",
  "history.local": "Saved on this device",
  "history.synced": "Synced",
  "history.count": "{n} saved",

  "account.title": "Account",
  "account.signIn": "Sign in",
  "account.signUp": "Create account",
  "account.signOut": "Sign out",
  "account.guest": "Guest mode",
  "account.guestNote":
    "You are in guest mode. Results are saved on this device only.",
  "account.email": "Email",
  "account.password": "Password",
  "account.name": "Name",
  "account.passwordHint": "At least 6 characters",
  "account.forgot": "Forgot password",
  "account.or": "or",
  "account.google": "Continue with Google",
  "account.plan": "Plan",
  "account.quota": "Quota left",
  "account.quotaReset": "Resets {date}",
  "account.upgrade": "Upgrade",
  "account.upgradePro": "Choose Pro",
  "account.upgradeBusiness": "Choose Business",
  "account.restore": "Restore purchases",
  "account.delete": "Delete account permanently",
  "account.deleteHint":
    "Deleting your account removes your profile, synced history, and recorded subscription. This cannot be undone.",
  "account.language": "Language",
  "account.theme": "Appearance",
  "account.theme.system": "System",
  "account.theme.light": "Light",
  "account.theme.dark": "Dark",
  "account.privacy": "Privacy policy",
  "account.terms": "Terms of service",
  "account.help": "Help",

  "auth.gate.title": "Sign in to get started",
  "auth.gate.lede":
    "Use an account to keep history synced, or continue as a guest without email.",
  "auth.gate.guest": "Continue as guest",
  "auth.gate.guestBusy": "Preparing guest mode…",
  "auth.gate.guestHint": "No email needed. 5 free results per week. You can sign up later.",

  "nav.home": "Home",
  "brand.homeAria": "Back to AI Work Studio home",

  "firstrun.skip": "Skip",
  "firstrun.next": "Next",
  "firstrun.start": "Start working",
  "firstrun.startNow": "Skip and try it now",
  "firstrun.stepOf": "Step {n} of {total}",

  "firstrun.templates.title": "Start by picking the job",
  "firstrun.templates.body":
    "Fifteen ready templates: activity report, meeting minutes, summary, before & after, Excel recap, and more. Each one carries its own format and its own rules.",
  "firstrun.templates.point1": "No long instructions to write — just pick the job",
  "firstrun.templates.point2": "The document's structure is already decided per template",
  "firstrun.templates.point3": "Write your own template when you have a fixed format",

  "firstrun.input.title": "Attach the material",
  "firstrun.input.body":
    "Each template asks only for what it genuinely needs. Add a line of context for anything the attachment cannot show.",
  "firstrun.input.point1": "Activity photos, screenshots, sign-in sheets, or handwritten notes",
  "firstrun.input.point2": "PDF, Word, Excel, PowerPoint — the text is read for you",
  "firstrun.input.point3": "One attachment is enough, except Before & After which needs two",

  "firstrun.build.title": "One button, a finished document",
  "firstrun.build.body":
    "Tap Create document and wait. What comes back is a fully formatted document ready to send, not a raw draft.",
  "firstrun.build.point1": "Usually 20–60 seconds; you can leave the screen",
  "firstrun.build.point2": "AI uses general assumptions to make the document read as complete",
  "firstrun.build.point3": "Names, figures, decisions, and other checkable facts are never invented",

  "firstrun.calendar.title": "Everything filed by date",
  "firstrun.calendar.body":
    "Every document is saved to the calendar automatically. Two weeks later, pick the date to find it again.",
  "firstrun.calendar.point1": "Nothing to remember to save",
  "firstrun.calendar.point2": "Move a document back to the day the work actually happened",
  "firstrun.calendar.point3": "Reopen any time to download it again",

  "firstrun.output.title": "Download, share, done",
  "firstrun.output.body":
    "From the finished document, download to your phone or share via WhatsApp, email, and Drive through your device's own share sheet.",
  "firstrun.output.point1": "Word and Excel are on the free plan; PowerPoint is paid",
  "firstrun.output.point2": "History syncs across devices once you have an account",
  "firstrun.output.point3": "5 free documents per week for guests",

  "guide.title": "Guide",
  "guide.intro": "Everything you need to use AI Work Studio, open any time.",
  "guide.replay": "Replay the walkthrough",
  "guide.section.workflow": "Workflow",
  "guide.section.tips": "Getting better results",
  "guide.section.limits": "Limits and things to know",
  "guide.tip1":
    "Pick the template closest to your job. The right template shapes the result far more than a long note does.",
  "guide.tip2":
    "A sharp, square-on photo reads far better, especially for sign-in sheets and tables.",
  "guide.tip3":
    "Use the note field for what the photo cannot show — the date, the activity name, the location. That is what is missed most often.",
  "guide.tip4":
    "If your format is always the same and is not in the list, write your own template once and reuse it.",
  "guide.limit1":
    "Results are generated by AI and can be wrong. Always check figures, names, and dates before sending.",
  "guide.limit2":
    "AI may use general assumptions to connect the narrative, but it does not invent names, figures, decisions, or specific checkable facts.",
  "guide.limit3":
    "Building takes about 20–60 seconds. Closing the app mid-run cancels it.",
  "guide.limit4": "Word and Excel download on the free plan. PowerPoint starts on Pro.",

  "about.title": "About",
  "about.blurb":
    "AI Work Studio turns notes, photos, and files into working documents: reports, slides, summaries, and analysis.",
  "about.rate": "Rate AI Work Studio on Play Store",
  "about.deleteHelp": "How to delete your account",

  "trial.left": "{n} of 5 free results left this week",
  "trial.lastOne": "1 of 5 free results left this week",
  "trial.over": "Your 5 free results for this week are used",
  "trial.overHint":
    "The allowance resets every Monday. Upgrade if you need to continue now.",
  "trial.cta": "View plan options",

  "report.title": "Report this result",
  "report.intro":
    "Tell us if this AI result is inappropriate, misleading, or violates someone's rights. Reports are reviewed by a person.",
  "report.reason": "Reason",
  "report.reason.offensive": "Offensive or abusive",
  "report.reason.harmful": "Harmful or misleading",
  "report.reason.sexual": "Sexual content",
  "report.reason.violence": "Violence or hate speech",
  "report.reason.privacy": "Exposes personal data",
  "report.reason.ip": "Copyright violation",
  "report.reason.other": "Something else",
  "report.detail": "Brief explanation",
  "report.detailPlaceholder": "Tell us briefly what is wrong.",
  "report.submit": "Send report",
  "report.sending": "Sending…",
  "report.thanks": "Thank you. We have received your report.",
  "report.failed": "Could not send the report. Please try again shortly.",

  "error.generic": "Something went wrong. Please try again.",
  "error.offline": "Could not connect. Check your internet, then try again.",
  "error.empty": "Write your request first.",
  "error.needAccount": "Create a free account to use AI.",
  "error.quota": "Your quota for this month is used up. Upgrade to continue.",
  "error.rateLimited": "Too many requests. Wait a moment, then try again.",
  "error.timeout": "The AI took too long to respond. Try again shortly.",
  "error.runTooLong":
    "That document was too heavy to finish in one run. Try Create result again — the system now defaults to a concise version — or ask for one section only.",
  "error.unreadableDocument":
    "No text could be read out of that file, so any result would be guesswork. If the PDF is a scan or a photo, attach the photo itself — photos can be read. You can also paste the contents into the notes field.",
  "error.busy": "The AI is busy. Try again shortly.",
  "error.notConfigured": "The AI service is not configured. Please contact support.",
  "error.fileTooLarge": "That file is too large. Maximum 8 MB per file.",
  "error.unsupportedFile": "That file type is not supported yet.",

  "common.cancel": "Cancel",
  "common.done": "Done",
  "common.retry": "Try again",
  "common.more": "More",

  "opt.category.Marketing": "Marketing",
  "opt.category.Content Creator": "Content creator",
  "opt.category.Business": "Business",
  "opt.category.Coding": "Coding",
  "opt.category.Academic": "Academic",
  "opt.category.Image AI": "Image AI",
  "opt.category.Video AI": "Video AI",

  "opt.tone.Professional": "Professional",
  "opt.tone.Casual": "Casual",
  "opt.tone.Persuasive": "Persuasive",
  "opt.tone.Creative": "Creative",

  "opt.output.Application Code": "Application code",
  "opt.output.Word Document": "Word document",
  "opt.output.PPT": "Slide deck",
  "opt.output.Technical Design": "Technical design",
  "opt.output.Analysis": "Analysis",
  "opt.output.Content": "Content",
  "opt.output.Diagram": "Process diagram (infographic)",
  "opt.output.Image Prompt": "AI image direction",
  "opt.output.Video Prompt": "AI video direction",
  "result.diagramTitle": "Diagram",
  "result.diagramSource": "Mermaid source",
  "result.diagramDrawing": "Drawing diagram…",
  "result.diagramInfographicHint": "Process infographic from your document — download PNG to save.",
  "result.diagramError": "Could not render the diagram. Source code is shown below.",
};

const TABLES = { id, en };

/** True when the user has already made an explicit language choice. */
export function hasStoredLanguage() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    return Boolean(saved && TABLES[saved]);
  } catch {
    return false;
  }
}

export function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && TABLES[saved]) return saved;
  } catch {
    /* storage unavailable — fall through to detection */
  }
  try {
    const tags = navigator.languages?.length
      ? navigator.languages
      : [navigator.language || ""];
    // Indonesian is the default, so only an explicit non-ID locale opts out.
    for (const tag of tags) {
      const base = String(tag).toLowerCase().split("-")[0];
      if (base === "id" || base === "in") return "id";
      if (TABLES[base]) return base;
    }
  } catch {
    /* no navigator — fall through */
  }
  return "id";
}

export function persistLanguage(lang) {
  try {
    localStorage.setItem(STORE_KEY, TABLES[lang] ? lang : "id");
  } catch {
    /* ignore */
  }
}

/**
 * Look up a key, falling back to Indonesian then to the key itself so a
 * missing string is visible in development rather than rendering as blank.
 */
export function translate(lang, key, vars) {
  const table = TABLES[lang] || TABLES.id;
  const raw = table[key] ?? TABLES.id[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

export function makeTranslator(lang) {
  return (key, vars) => translate(lang, key, vars);
}
