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
  "result.title": "Siap dilanjutkan",
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
  "result.exportWord": "Export Word",
  "result.exportPpt": "Unduh PowerPoint",
  "result.exportPng": "Unduh PNG",
  "result.exportSvg": "Unduh SVG",
  "result.exportDiagramHint": "PNG/SVG menampilkan diagramnya, bukan hanya kode.",
  "result.exportPngFailed": "Gagal mengunduh PNG. Coba Unduh SVG, atau buat ulang hasilnya.",
  "result.saveDiagramTitle": "Simpan diagram",
  "result.saveDiagramHint": "Di Android, ketuk Bagikan lalu pilih Save/Files. Atau tekan lama gambar di bawah.",
  "result.saveWordTitle": "Simpan Word",
  "result.savePptTitle": "Simpan PowerPoint",
  "result.saveOfficeHint": "Di Android, unduhan diam tidak jalan. Ketuk Bagikan lalu pilih Save ke Files/Drive.",
  "result.saveDiagramShare": "Bagikan / Simpan",
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

  "firstrun.input.title": "Mulai dari bahan yang sudah ada",
  "firstrun.input.body":
    "Tidak perlu menulis rapi. Ketik permintaanmu apa adanya, atau lampirkan berkas dan biarkan isinya jadi konteks.",
  "firstrun.input.point1": "Foto papan tulis, tangkapan layar, atau hasil scan",
  "firstrun.input.point2": "PDF, Word, Excel, PowerPoint — teksnya dibaca otomatis",
  "firstrun.input.point3": "Boleh bahasa campur; hasil mengikuti bahasa yang kamu pakai",

  "firstrun.build.title": "Satu tombol, hasil jadi",
  "firstrun.build.body":
    "Tekan Buat hasil. Di belakang layar AI menyusun lalu mengerjakan permintaanmu — yang muncul adalah dokumen siap pakai, bukan draf mentah.",
  "firstrun.build.point1": "Hasil langsung muncul tanpa perlu pindah aplikasi",
  "firstrun.build.point2": "Permintaan dan lampiran dipakai sebagai konteks",
  "firstrun.build.point3": "Proses biasanya butuh 30–60 detik; hasilnya muncul sekaligus",

  "firstrun.improve.title": "Perbaiki, lalu bandingkan",
  "firstrun.improve.body":
    "Kalau hasilnya belum pas, minta versi yang lebih jelas, lebih ringkas, atau lebih rinci — tanpa mengulang dari nol.",
  "firstrun.improve.point1": "Lihat berapa kata yang ditambah dan dihapus",
  "firstrun.improve.point2": "Bandingkan versi lama dan baru berdampingan",
  "firstrun.improve.point3": "Versi lama tidak hilang sampai kamu memilih",

  "firstrun.menus.title": "Menu yang sering dipakai",
  "firstrun.menus.body":
    "Semua alat sekunder ada di atas — tidak mengganggu kanvas utama.",
  "firstrun.menus.point1": "Bantuan: panduan singkat kapan saja",
  "firstrun.menus.point2": "Riwayat: buka ulang hasil yang sudah disimpan",
  "firstrun.menus.point3": "Akun: bahasa, tema, kuota, dan langganan",

  "firstrun.output.title": "Simpan dan bawa keluar",
  "firstrun.output.body":
    "Hasil yang bagus disimpan ke riwayat, diunduh Word, atau diklik judul AI Work Studio di atas untuk kembali ke beranda.",
  "firstrun.output.point1": "Riwayat tersinkron antar perangkat setelah punya akun",
  "firstrun.output.point2": "Export Word tersedia di paket Free; PowerPoint di paket berbayar",
  "firstrun.output.point3": "5 hasil gratis per minggu untuk tamu",

  "guide.title": "Panduan",
  "guide.intro":
    "Semua yang perlu diketahui untuk memakai AI Work Studio, bisa dibuka kapan saja.",
  "guide.replay": "Putar ulang perkenalan",
  "guide.section.workflow": "Alur kerja",
  "guide.section.tips": "Cara dapat hasil lebih baik",
  "guide.section.limits": "Batas dan hal yang perlu diketahui",
  "guide.tip1":
    "Sebutkan untuk siapa dokumennya. \"Untuk atasan\" dan \"untuk klien baru\" menghasilkan nada yang berbeda.",
  "guide.tip2":
    "Sebutkan panjang yang kamu mau — jumlah halaman, jumlah slide, atau jumlah paragraf.",
  "guide.tip3":
    "Kalau melampirkan berkas, katakan apa yang harus diambil darinya. \"Pakai angka penjualannya saja\" lebih baik daripada membiarkannya menebak.",
  "guide.tip4":
    "Kalau hasil pertama belum pas, pakai Perbaiki daripada menulis ulang permintaan dari awal.",
  "guide.limit1":
    "Hasil dibuat oleh AI dan bisa salah. Selalu periksa angka, nama, dan tanggal sebelum dikirim.",
  "guide.limit2":
    "Menyusun butuh sekitar 20–40 detik. Menutup aplikasi saat proses berjalan akan membatalkannya.",
  "guide.limit3":
    "Kuota dihitung per bulan. Paket gratis cukup untuk sekitar 15 hasil.",
  "guide.limit4":
    "Unduh Word dan PowerPoint tersedia mulai paket Pro.",

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
  "result.title": "Ready to continue",
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
  "result.exportWord": "Export Word",
  "result.exportPpt": "Download PowerPoint",
  "result.exportPng": "Download PNG",
  "result.exportSvg": "Download SVG",
  "result.exportDiagramHint": "PNG/SVG show the rendered diagram, not just the code.",
  "result.exportPngFailed": "PNG download failed. Try SVG, or regenerate the result.",
  "result.saveDiagramTitle": "Save diagram",
  "result.saveDiagramHint": "On Android, tap Share then Save/Files. Or long-press the image below.",
  "result.saveWordTitle": "Save Word",
  "result.savePptTitle": "Save PowerPoint",
  "result.saveOfficeHint": "On Android, silent downloads do not work. Tap Share, then Save to Files/Drive.",
  "result.saveDiagramShare": "Share / Save",
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

  "firstrun.input.title": "Start from what you already have",
  "firstrun.input.body":
    "No need to write it neatly. Type your request as it comes, or attach a file and let its contents be the context.",
  "firstrun.input.point1": "Photos of a whiteboard, screenshots, or scans",
  "firstrun.input.point2": "PDF, Word, Excel, PowerPoint — the text is read for you",
  "firstrun.input.point3": "Mixed languages are fine; the result follows the one you used",

  "firstrun.build.title": "One button, finished work",
  "firstrun.build.body":
    "Tap Create result. Behind the scenes AI drafts then completes your request — what you see is a finished document, not a raw draft.",
  "firstrun.build.point1": "The result appears directly—no app switching",
  "firstrun.build.point2": "Your request and attachments provide the context",
  "firstrun.build.point3": "It usually takes 30–60 seconds; the result arrives at once",

  "firstrun.improve.title": "Improve it, then compare",
  "firstrun.improve.body":
    "If the result is not right, ask for a clearer, shorter, or more detailed version — without starting over.",
  "firstrun.improve.point1": "See how many words were added and removed",
  "firstrun.improve.point2": "Put the old and new versions side by side",
  "firstrun.improve.point3": "The original stays until you choose",

  "firstrun.menus.title": "Menus you will use often",
  "firstrun.menus.body":
    "Secondary tools live up top — they stay out of the way of the main canvas.",
  "firstrun.menus.point1": "Help: a short guide whenever you need it",
  "firstrun.menus.point2": "History: reopen results you already saved",
  "firstrun.menus.point3": "Account: language, theme, quota, and membership",

  "firstrun.output.title": "Save it and take it with you",
  "firstrun.output.body":
    "Good results go to history, download as Word, or tap the AI Work Studio title above to return home.",
  "firstrun.output.point1": "History syncs across devices once you have an account",
  "firstrun.output.point2": "Word export is included on Free; PowerPoint is paid",
  "firstrun.output.point3": "5 free results per week for guests",

  "guide.title": "Guide",
  "guide.intro": "Everything you need to use AI Work Studio, open any time.",
  "guide.replay": "Replay the walkthrough",
  "guide.section.workflow": "Workflow",
  "guide.section.tips": "Getting better results",
  "guide.section.limits": "Limits and things to know",
  "guide.tip1":
    'Say who the document is for. "For my manager" and "for a new client" produce different tones.',
  "guide.tip2": "Say how long you want it — pages, slides, or paragraphs.",
  "guide.tip3":
    'If you attach a file, say what to take from it. "Use only the sales figures" beats letting it guess.',
  "guide.tip4":
    "If the first result is off, use Improve rather than rewriting your request from scratch.",
  "guide.limit1":
    "Results are generated by AI and can be wrong. Always check figures, names, and dates before sending.",
  "guide.limit2":
    "Building takes about 20–40 seconds. Closing the app mid-run cancels it.",
  "guide.limit3": "Quota is monthly. The free plan covers roughly 15 results.",
  "guide.limit4": "Word and PowerPoint download start on the Pro plan.",

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
