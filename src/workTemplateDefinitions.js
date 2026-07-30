/**
 * The template catalogue.
 *
 * Each entry is a complete package rather than a label: the fields it asks the
 * user to fill, which attachments it accepts, the instruction the model
 * receives, the section skeleton it must fill, how long the result should be,
 * and which files it can be exported as.
 *
 * `fields` is what makes a document usable without editing. A photo of a
 * meeting cannot tell anyone what the meeting was called or who ran it, so the
 * template asks for exactly those few facts and treats the answers as truth.
 * Fields marked `autofill: "today" | "now"` are pre-filled and still editable.
 *
 * `profile` maps onto the existing deliverable profiles so output sanitising
 * and Office export keep working unchanged.
 *
 * Attachment rules: one file is enough everywhere except Before & After, which
 * uses two labelled slots so the pair is unambiguous in the finished document.
 */

/**
 * The line every document-producing template shares.
 *
 * Deliberately not "describe only what is visible". A report that merely
 * narrates a photograph is not what anyone wants to send: people want the
 * finished thing. So ordinary professional connective writing and reasonable
 * operational context are allowed — what stays forbidden is inventing the
 * checkable specifics that make a document wrong: names, dates, counts,
 * figures, decisions, and quotations.
 */
const COMPLETION_STANCES = {
  bounded: {
    id: `Tulis dokumen yang benar-benar SIAP KIRIM, bukan deskripsi foto. Rangkai fakta pengguna dan bukti lampiran menjadi narasi profesional yang wajar. Kamu BOLEH menambahkan konteks dan asumsi operasional umum agar dokumen terasa utuh; asumsi itu harus netral, tidak dapat diperiksa sebagai fakta baru, dan langsung menyatu dalam narasi tanpa label asumsi.
YANG TETAP DILARANG dikarang: nama orang, jabatan, instansi, alamat, jumlah peserta, angka, nominal, persentase, durasi, tenggat, kutipan, keputusan, penanggung jawab, status penyelesaian, hasil pemeriksaan, kondisi teknis, atau klaim bahwa semua orang hadir, setuju, antusias, maupun mengikuti sampai selesai.
JANGAN menulis "Belum tersedia", "Tidak tersedia", titik-titik isian, kurung siku, atau penanda yang masih perlu diedit. Jika rincian non-esensial tidak didukung sumber, hilangkan rincian itu, gabungkan ke kalimat yang lebih umum, atau gunakan penyebutan peran yang netral.
Jangan pernah menulis "pada foto terlihat" atau "berdasarkan gambar" — tulis langsung sebagai dokumen jadi. Gunakan Bahasa Indonesia saja kecuali nama diri atau istilah sumber yang memang harus dipertahankan.`,
    en: `Write a document that is genuinely READY TO SEND, not a description of a photo. Weave the user's facts and attachment evidence into natural professional prose. You MAY add general operational assumptions so the document reads as complete; they must be neutral, not checkable as new facts, and blend directly into the prose without an assumptions label.
DO NOT invent personal names, job titles, organisations, addresses, headcounts, figures, amounts, percentages, durations, deadlines, quotations, decisions, owners, completion status, inspection results, technical conditions, or claims that everyone attended, agreed, was enthusiastic, or stayed through the end.
DO NOT write "Not provided", "Unavailable", dotted fill-in lines, square brackets, or any marker that still needs editing. If a non-essential detail lacks support, omit it, merge it into a more general sentence, or use a role-neutral construction.
Never write "the photo shows" or "based on the image" — write the finished document directly. Use English only, except for proper nouns or source terms that must be preserved.`,
  },
  "source-faithful": {
    id: `TRANSFORMASI TERKUNCI PADA SUMBER. Gunakan hanya isi yang diberikan pengguna atau terbaca jelas di lampiran. Kamu boleh merapikan struktur dan bahasa, tetapi TIDAK boleh menambahkan konteks, asumsi, kejadian, kesimpulan, saran, angka, atau fakta baru.
Pertahankan jenis dokumen dan makna sumber. Jangan mengubah terjemahan menjadi ringkasan, notulen, balasan, atau dokumen lain. Jangan menulis "Belum tersedia", titik-titik isian, maupun komentar proses. Gunakan Bahasa Indonesia saja kecuali target bahasa atau isi sumber mengharuskan bahasa lain.`,
    en: `SOURCE-LOCKED TRANSFORMATION. Use only content supplied by the user or clearly legible in the attachment. You may improve structure and wording, but MUST NOT add context, assumptions, events, conclusions, advice, figures, or new facts.
Preserve the source document type and meaning. Never turn a translation into a summary, minutes, reply, or another document. Do not write "Not provided", dotted fill-in lines, or process commentary. Use English only unless the target language or source content requires another language.`,
  },
};

/** Shared clause for templates whose real output is a spreadsheet. */
const TABLE_ONLY = {
  id: "Keluarkan hasil sebagai tabel Markdown dengan baris header yang jelas. Boleh lebih dari satu tabel, masing-masing didahului heading pendek sebagai nama sheet. Jangan menulis paragraf panjang di luar tabel — maksimal satu kalimat pengantar per tabel. Satu baris tabel mewakili satu catatan.",
  en: "Return the result as Markdown tables with a clear header row. More than one table is allowed; precede each with a short heading that becomes the sheet name. Do not write long prose around the tables — at most one introductory sentence each. One table row represents one record.",
};

export const TEMPLATE_GROUPS = ["report", "meeting", "extract", "utility"];

/** Field shorthand, so the definitions below stay readable. */
const text = (id, labelId, labelEn, extra = {}) => ({
  id,
  type: "text",
  label: { id: labelId, en: labelEn },
  ...extra,
});
const area = (id, labelId, labelEn, extra = {}) => ({
  id,
  type: "textarea",
  label: { id: labelId, en: labelEn },
  ...extra,
});
const today = (id = "date", labelId = "Tanggal", labelEn = "Date") => ({
  id,
  type: "date",
  label: { id: labelId, en: labelEn },
  autofill: "today",
  required: true,
});
const now = (id = "time", labelId = "Jam", labelEn = "Time") => ({
  id,
  type: "time",
  label: { id: labelId, en: labelEn },
  autofill: "now",
});

export const WORK_TEMPLATES = [
  {
    id: "activity-report",
    group: "report",
    icon: "FileText",
    profile: "report",
    name: { id: "Laporan Kegiatan", en: "Activity Report" },
    blurb: {
      id: "Foto kegiatan menjadi laporan siap kirim.",
      en: "Turn activity photos into a report you can send.",
    },
    input: {
      attachments: { kinds: ["image"], min: 1, max: 8 },
      fields: [
        text("activity", "Kegiatan apa", "What activity", {
          required: true,
          placeholder: {
            id: "Contoh: Sosialisasi Pelayanan Publik",
            en: "e.g. Public Service Briefing",
          },
        }),
        today(),
        text("place", "Tempat", "Place", {
          placeholder: { id: "Contoh: Aula Kelurahan", en: "e.g. the main hall" },
        }),
        text("organizer", "Penyelenggara / Unit", "Organiser / Unit"),
        area("notes", "Catatan tambahan", "Extra notes", {
          placeholder: {
            id: "Hal yang tidak terlihat di foto: hasil, kendala, tindak lanjut…",
            en: "Anything the photo cannot show: outcomes, obstacles, follow-up…",
          },
        }),
      ],
    },
    length: { words: [450, 750], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Waktu dan Tempat", "Ringkasan Kegiatan", "Uraian Pelaksanaan", "Hasil dan Tindak Lanjut", "Dokumentasi"],
      en: ["Time and Place", "Summary", "How It Ran", "Outcome and Follow-up", "Documentation"],
    },
    prompt: {
      id: `Susun LAPORAN KEGIATAN resmi. Judul dokumen (# ) diambil dari isian "Kegiatan apa".
"Waktu dan Tempat" memakai tanggal dan tempat dari isian pengguna, apa adanya.
"Uraian Pelaksanaan" adalah inti laporan: 3–4 paragraf mengalir yang menceritakan jalannya kegiatan dari pembukaan sampai penutup. Gunakan nama kegiatan sebagai penuntun isi — kalau kegiatannya sosialisasi, tulis sebagaimana sosialisasi berjalan. Jangan berupa bullet.
"Hasil dan Tindak Lanjut" 3–5 bullet. Kalau pengguna mengisi catatan tambahan, itu bahan utamanya.
"Dokumentasi" satu baris keterangan per foto ("Foto 1 — ..."), singkat.
Bahasa Indonesia resmi ragam laporan dinas.`,
      en: `Write a formal ACTIVITY REPORT. The document title (# ) comes from the "What activity" field.
"Time and Place" uses the date and place the user gave, verbatim.
"How It Ran" is the heart of it: three to four flowing paragraphs telling the activity through from opening to close. Let the activity's name guide the content — if it is a briefing, write how a briefing runs. Not bullets.
"Outcome and Follow-up" is three to five bullets, built from the user's extra notes where given.
"Documentation" is one short caption per photo ("Photo 1 — ...").
Plain formal report English.`,
    },
  },

  {
    id: "meeting-minutes",
    group: "meeting",
    icon: "ClipboardList",
    profile: "minutes",
    name: { id: "Notulen Rapat", en: "Meeting Minutes" },
    blurb: {
      id: "Transkrip atau foto catatan menjadi notulen rapi.",
      en: "A transcript or a photo of your notes becomes clean minutes.",
    },
    input: {
      attachments: { kinds: ["image", "document"], min: 0, max: 6 },
      fields: [
        text("subject", "Nama / agenda rapat", "Meeting name or agenda", {
          required: true,
          placeholder: { id: "Contoh: Rapat Koordinasi Anggaran", en: "e.g. Budget Coordination Meeting" },
        }),
        today(),
        now(),
        text("place", "Tempat", "Place"),
        text("chair", "Pimpinan rapat", "Chaired by"),
        area("transcript", "Transkrip atau poin bahasan", "Transcript or discussion points", {
          mode: "fallback",
          placeholder: {
            id: "Tempel transkrip, atau ketik poin yang dibahas dan diputuskan…",
            en: "Paste the transcript, or type what was discussed and decided…",
          },
        }),
      ],
    },
    length: { words: [400, 700], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Identitas Rapat", "Peserta", "Agenda", "Pembahasan", "Keputusan", "Tindak Lanjut"],
      en: ["Meeting Details", "Attendees", "Agenda", "Discussion", "Decisions", "Action Items"],
    },
    prompt: {
      id: `Susun NOTULEN RAPAT. Judul dokumen (# ) diambil dari isian nama/agenda rapat.
"Identitas Rapat" berupa tabel dua kolom. Tanggal dan waktu selalu diisi dari sumber atau fallback aplikasi; baris Tempat dan Pimpinan Rapat hanya ditampilkan bila didukung sumber.
"Pembahasan" ditulis per agenda, satu paragraf pendek per agenda.
"Keputusan" bullet, hanya bila ada hal yang benar-benar diputuskan; bila tidak ada, hilangkan bagian ini.
"Tindak Lanjut" berupa tabel Markdown hanya bila sumber memuat tindakan. Pakai kolom Tindakan dan tambahkan kolom Penanggung Jawab, Tenggat, atau Status hanya bila sumber mendukungnya.
Nama peserta HANYA dari transkrip atau foto catatan; jangan dikarang.`,
      en: `Write MEETING MINUTES. The document title (# ) comes from the meeting name field.
"Meeting Details" is a two-column table. Date and time always come from the source or application fallback; show Place and Chaired by only when supported.
"Discussion" runs agenda item by agenda item, one short paragraph each.
"Decisions" is a bullet list only when the source contains actual decisions; otherwise omit the section.
"Action Items" is a Markdown table only when the source contains actions. Always use Action and add Owner, Due, or Status columns only when the source supports them.
Attendee names come only from the transcript or the photographed notes; never invent them.`,
    },
  },

  {
    id: "summary",
    completionPolicy: "source-faithful",
    group: "report",
    icon: "FileSearch",
    profile: "general",
    name: { id: "Ringkasan", en: "Summary" },
    blurb: {
      id: "Dokumen panjang menjadi ringkasan satu halaman.",
      en: "A long document becomes a one-page summary.",
    },
    input: {
      attachments: { kinds: ["document", "image"], min: 1, max: 5 },
      fields: [
        text("subject", "Judul ringkasan", "Summary title", {
          placeholder: { id: "Kosongkan untuk memakai judul dokumen", en: "Leave blank to use the document's own title" },
        }),
        text("focus", "Fokus ringkasan", "Focus", {
          placeholder: { id: "Contoh: fokus ke anggaran dan risiko", en: "e.g. focus on budget and risk" },
        }),
      ],
    },
    length: { words: [700, 1100], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: [
        "Ringkasan Inti",
        "Pembahasan per Bagian",
        "Angka dan Data Penting",
        "Pihak yang Disebut",
        "Kesimpulan Dokumen",
        "Hal yang Perlu Perhatian",
      ],
      en: [
        "Core Summary",
        "Section by Section",
        "Key Figures and Data",
        "Parties Named",
        "What the Document Concludes",
        "Needs Attention",
      ],
    },
    prompt: {
      id: `Ringkas dokumen yang dilampirkan secara PADAT DAN SPESIFIK. Ini bukan ringkasan sekilas — pembaca harus paham isi dokumen tanpa membuka aslinya.

"Ringkasan Inti" 1 paragraf (5–7 kalimat) yang bisa dibaca sendirian dan sudah menjawab: dokumen ini tentang apa, siapa yang terlibat, dan apa kesimpulannya.

"Pembahasan per Bagian" adalah bagian terpenting dan terpanjang. Telusuri dokumen dari awal sampai akhir. Untuk SETIAP bab/bagian utama, tulis satu sub-bagian dengan heading "### " memakai judul asli bagian itu, lalu 2–4 kalimat yang memuat isi konkretnya. Jangan melompati bagian. Jangan menulis kalimat kosong seperti "bagian ini membahas berbagai hal" — sebutkan hal-halnya.

"Angka dan Data Penting" berupa tabel Markdown: Uraian | Nilai | Konteks. Muat SEMUA angka penting yang ada di dokumen (anggaran, persentase, jumlah, target, tanggal tenggat). Salin persis apa adanya — jangan dibulatkan, dijumlahkan, atau dihitung ulang. Lewati bagian ini hanya bila dokumen benar-benar tidak memuat angka.

"Pihak yang Disebut" daftar nama orang, jabatan, unit kerja, atau instansi yang disebut dokumen beserta perannya. Lewati bila tidak ada.

"Kesimpulan Dokumen" apa yang disimpulkan atau diputuskan DOKUMEN ITU, bukan pendapatmu.

"Hal yang Perlu Perhatian" risiko, tenggat, syarat, atau keputusan yang masih menggantung.

Pertahankan istilah, singkatan, dan penamaan asli dokumen. Jangan menambah opini, saran, atau konteks yang tidak ada di sumber — ini satu-satunya template yang TIDAK boleh menambahkan asumsi.`,
      en: `Summarise the attached document DENSELY AND SPECIFICALLY. This is not a skim — the reader must understand the document without opening the original.

"Core Summary" is one paragraph of five to seven sentences that stands alone and already answers: what this document is about, who is involved, and what it concludes.

"Section by Section" is the longest and most important part. Walk the document from beginning to end. For EVERY major chapter or section, write a sub-section headed with "### " using that section's own title, then two to four sentences of its concrete content. Skip nothing. Never write empty sentences like "this section discusses various matters" — name the matters.

"Key Figures and Data" is a Markdown table: Item | Value | Context. Include EVERY significant number in the document (budgets, percentages, quantities, targets, deadlines). Copy them exactly — never round, total, or recompute. Skip this section only if the document truly contains no numbers.

"Parties Named" lists the people, roles, units, or organisations the document names, with their part in it. Skip if there are none.

"What the Document Concludes" is what THE DOCUMENT concludes or decides, not your view.

"Needs Attention" covers risks, deadlines, conditions, or decisions still outstanding.

Keep the source's own terminology, abbreviations, and naming. Add no opinion, advice, or context that is not in the source — this is the one template that must NOT add assumptions.`,
    },
  },

  {
    id: "before-after",
    group: "report",
    icon: "Images",
    profile: "report",
    name: { id: "Laporan Sebelum & Sesudah", en: "Before & After Report" },
    blurb: {
      id: "Dua foto menjadi laporan perbandingan kondisi.",
      en: "Two photos become a before-and-after report.",
    },
    input: {
      // Two labelled slots rather than one pile: which photo is which decides
      // the entire document, and asking is more reliable than assuming order.
      attachments: {
        kinds: ["image"],
        min: 2,
        max: 8,
        slots: [
          { id: "before", label: { id: "Foto Sebelum", en: "Before photo" } },
          { id: "after", label: { id: "Foto Sesudah", en: "After photo" } },
        ],
      },
      fields: [
        text("object", "Objek / lokasi", "Object or location", {
          required: true,
          placeholder: { id: "Contoh: Ruang Arsip Lantai 2", en: "e.g. second-floor archive room" },
        }),
        text("work", "Pekerjaan yang dilakukan", "Work carried out", {
          required: true,
          placeholder: { id: "Contoh: pengecatan ulang dan perbaikan plafon", en: "e.g. repainting and ceiling repair" },
        }),
        today(),
        text("executor", "Pelaksana", "Carried out by"),
      ],
    },
    length: { words: [250, 450], pages: 1 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Objek dan Lokasi", "Kondisi Sebelum", "Pekerjaan yang Dilakukan", "Kondisi Sesudah", "Perubahan yang Terlihat", "Dokumentasi"],
      en: ["Object and Location", "Condition Before", "Work Carried Out", "Condition After", "Visible Change", "Documentation"],
    },
    prompt: {
      id: `Susun LAPORAN SEBELUM & SESUDAH. Judul dokumen (# ) dari isian objek/lokasi.
Foto diberi label SEBELUM dan SESUDAH oleh pengguna — ikuti label itu, jangan menebak dari urutan.
"Kondisi Sebelum" dan "Kondisi Sesudah" harus membahas aspek yang SAMA dan sebanding agar perbandingannya jujur.
"Pekerjaan yang Dilakukan" dikembangkan dari isian pengguna menjadi 1–2 paragraf.
"Perubahan yang Terlihat" WAJIB tabel Markdown: Aspek | Sebelum | Sesudah.
"Dokumentasi" cukup satu baris: "Foto sebelum dan sesudah terlampir."
Jangan menilai mutu pekerjaan, biaya, atau ketepatan waktu.`,
      en: `Write a BEFORE & AFTER report. The document title (# ) comes from the object/location field.
The user labelled which photos are BEFORE and which are AFTER — follow those labels, never guess from order.
"Condition Before" and "Condition After" must address the SAME comparable aspects so the comparison is honest.
"Work Carried Out" expands the user's field into one or two paragraphs.
"Visible Change" MUST be a Markdown table: Aspect | Before | After.
"Documentation" is a single line: "Before and after photographs attached."
Do not judge workmanship quality, cost, or timeliness.`,
    },
  },

  {
    id: "recap-sheet",
    completionPolicy: "source-faithful",
    group: "extract",
    icon: "Table",
    profile: "general",
    name: { id: "Rekapitulasi (Excel)", en: "Recap (Excel)" },
    blurb: {
      id: "Berkas atau catatan menjadi rekap tabel siap Excel.",
      en: "A file or your notes become a spreadsheet-ready recap.",
    },
    input: {
      attachments: { kinds: ["document", "image"], min: 0, max: 10 },
      fields: [
        text("subject", "Rekap tentang apa", "Recap of what", {
          required: true,
          placeholder: { id: "Contoh: Rekap Pengeluaran Mei", en: "e.g. May expense recap" },
        }),
        text("columns", "Kolom yang diinginkan", "Columns you want", {
          placeholder: { id: "Contoh: Tanggal, Uraian, Jumlah. Kosongkan agar ditentukan otomatis.", en: "e.g. Date, Description, Amount. Leave blank to decide automatically." },
        }),
        area("source", "Catatan yang mau direkap", "Notes to recap", {
          mode: "fallback",
          placeholder: { id: "Tempel daftar atau data yang ingin direkap…", en: "Paste the list or data you want recapped…" },
        }),
      ],
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["xlsx", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Buat REKAPITULASI dalam bentuk tabel. Heading tabel diambil dari isian "Rekap tentang apa".
Kalau pengguna menyebutkan kolom, pakai persis kolom itu. Kalau tidak, tentukan kolom yang paling masuk akal dan konsisten.
Salin nilai apa adanya. JANGAN menghitung total, rata-rata, atau persentase kecuali angkanya memang sudah tertulis di sumber.
Untuk tulisan yang meragukan, gunakan pembacaan terbaik diikuti "(?)". Jika satu sel benar-benar tidak dapat dibaca, tulis "Tidak terbaca" tanpa menebak.
${TABLE_ONLY.id}`,
      en: `Build a RECAP as tables. The table heading comes from the "Recap of what" field.
Where the user names columns, use exactly those. Otherwise choose the columns that genuinely fit and keep them consistent.
Copy values exactly. DO NOT compute totals, averages, or percentages unless that figure is already written in the source.
For uncertain writing, give the best reading followed by "(?)". If a cell is genuinely illegible, write "Illegible" rather than guessing.
${TABLE_ONLY.en}`,
    },
  },

  {
    id: "attendance-list",
    completionPolicy: "source-faithful",
    group: "extract",
    icon: "Users",
    profile: "general",
    name: { id: "Rekap Daftar Hadir", en: "Attendance Recap" },
    blurb: {
      id: "Foto lembar absensi menjadi daftar peserta yang bisa disalin.",
      en: "A photo of the sign-in sheet becomes a list you can copy.",
    },
    input: {
      attachments: { kinds: ["image", "document"], min: 1, max: 10 },
      fields: [
        text("activity", "Nama kegiatan", "Activity name", {
          required: true,
          placeholder: { id: "Contoh: Sosialisasi SPBE", en: "e.g. SPBE briefing" },
        }),
        today(),
      ],
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["xlsx", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Ketik ulang DAFTAR HADIR dari foto lembar absensi menjadi tabel. Heading tabel dari isian nama kegiatan.
Kolom mengikuti lembar aslinya (umumnya: No, Nama, Jabatan/Unit Kerja, Tanda Tangan). Jangan menambah kolom yang tidak ada.
Urutan baris persis seperti lembar aslinya.
Tulisan tangan yang tidak yakin terbaca: tulis dugaan terbaik lalu tambahkan "(?)", jangan dikosongkan dan jangan dikarang.
Baris kosong pada lembar tidak perlu dimasukkan.
Setelah tabel tulis satu baris: "Jumlah baris terbaca: N".
${TABLE_ONLY.id}`,
      en: `Retype the ATTENDANCE SHEET into a table. The table heading comes from the activity name field.
Mirror the sheet's own columns (typically No, Name, Role/Unit, Signature). Do not add columns that are not there.
Keep the sheet's original row order.
Where handwriting is uncertain, give your best reading followed by "(?)" — never blank it and never invent a name.
Blank rows need not be included.
After the table write one line: "Rows read: N".
${TABLE_ONLY.en}`,
    },
  },

  {
    id: "table-extract",
    completionPolicy: "source-faithful",
    group: "extract",
    icon: "Grid3x3",
    profile: "general",
    name: { id: "Ekstrak Tabel", en: "Extract Table" },
    blurb: {
      id: "Tabel di foto atau PDF menjadi tabel yang bisa diolah.",
      en: "A table in a photo or PDF becomes one you can work with.",
    },
    input: {
      attachments: { kinds: ["image", "document"], min: 1, max: 10 },
      fields: [
        text("subject", "Nama tabel", "Table name", {
          placeholder: { id: "Kosongkan untuk memakai judul aslinya", en: "Leave blank to use its own caption" },
        }),
        text("which", "Tabel yang mana", "Which table", {
          placeholder: { id: "Contoh: hanya tabel realisasi anggaran", en: "e.g. only the budget table" },
        }),
      ],
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["xlsx", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Salin ulang TABEL di lampiran persis seperti aslinya.
Pertahankan judul kolom, urutan kolom, dan urutan baris.
Angka disalin apa adanya termasuk pemisah ribuan dan satuan. Jangan mengubah format, membulatkan, atau menghitung ulang.
Sel gabungan dipecah dengan mengulang nilainya agar tabel tetap persegi.
Bila ada beberapa tabel, keluarkan semuanya dengan heading masing-masing.
Baris total yang memang tertulis di sumber disalin sebagai baris biasa.
${TABLE_ONLY.id}`,
      en: `Reproduce the TABLE in the attachment exactly as it stands.
Keep the column headers, column order, and row order.
Copy numbers verbatim including separators and units. Do not reformat, round, or recalculate.
Split merged cells by repeating the value so the table stays rectangular.
If several tables are present, output them all with their own headings.
A total row that genuinely appears in the source is copied through as an ordinary row.
${TABLE_ONLY.en}`,
    },
  },

  {
    id: "action-items",
    completionPolicy: "source-faithful",
    group: "meeting",
    icon: "ListChecks",
    profile: "general",
    name: { id: "Daftar Tindak Lanjut", en: "Action Items" },
    blurb: {
      id: "Catatan atau foto papan tulis menjadi daftar tugas.",
      en: "Notes or a whiteboard photo become a task list.",
    },
    input: {
      attachments: { kinds: ["image", "document"], min: 0, max: 6 },
      fields: [
        text("subject", "Tindak lanjut dari apa", "Follow-up from what", {
          required: true,
          placeholder: { id: "Contoh: Rapat Evaluasi Triwulan I", en: "e.g. Q1 review meeting" },
        }),
        today("date", "Tanggal dibuat", "Created on"),
        area("source", "Catatan hasil diskusi", "Discussion notes", {
          mode: "fallback",
          placeholder: { id: "Ketik hal-hal yang harus ditindaklanjuti…", en: "Type what needs following up…" },
        }),
      ],
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["xlsx", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Ubah bahan yang diberikan menjadi DAFTAR TINDAK LANJUT. Heading tabel dari isian "Tindak lanjut dari apa".
Satu tabel Markdown dengan kolom wajib No | Tindakan. Tambahkan Penanggung Jawab, Tenggat, Prioritas, dan Status hanya untuk kolom yang memang didukung sumber.
"Tindakan" dimulai dengan kata kerja dan cukup jelas untuk dikerjakan tanpa membaca catatan aslinya.
"Penanggung Jawab", "Tenggat", "Prioritas", dan "Status" tidak boleh disimpulkan dari kebiasaan umum. Jika kolom opsional sama sekali tidak punya data, hilangkan kolomnya.
Hal yang hanya wacana tanpa tindakan JANGAN dimasukkan.
${TABLE_ONLY.id}`,
      en: `Turn the supplied material into an ACTION ITEM list. The table heading comes from the "Follow-up from what" field.
One Markdown table with required columns No | Action. Add Owner, Due, Priority, and Status only for columns the source actually supports.
"Action" starts with a verb and is clear enough to act on without the original notes.
"Owner", "Due", "Priority", and "Status" must not be inferred from routine practice. If an optional column has no source data at all, omit that column.
Points that are discussion without an action DO NOT belong in the list.
${TABLE_ONLY.en}`,
    },
  },

  {
    id: "official-record",
    group: "report",
    icon: "ScrollText",
    profile: "report",
    name: { id: "Berita Acara Serah Terima", en: "Handover Record" },
    blurb: {
      id: "Dokumen formal serah terima, lengkap dengan kedua pihak.",
      en: "A formal handover record naming both parties.",
    },
    input: {
      attachments: { kinds: ["image", "document"], min: 0, max: 8 },
      fields: [
        text("subject", "Hal yang diserahterimakan", "What is being handed over", {
          required: true,
          placeholder: { id: "Contoh: 12 unit laptop inventaris", en: "e.g. 12 inventory laptops" },
        }),
        area("items", "Rincian barang / dokumen", "Itemised detail", {
          required: true,
          placeholder: {
            id: "Satu baris per barang: nama, jumlah, satuan, keterangan…",
            en: "One line per item: name, quantity, unit, notes…",
          },
        }),
        today("date", "Tanggal serah terima", "Handover date"),
        now(),
        text("place", "Tempat", "Place"),
        text("party1Name", "Pihak Pertama — Nama", "First party — Name", { required: true }),
        text("party1Role", "Pihak Pertama — Jabatan / Unit", "First party — Role / Unit"),
        text("party2Name", "Pihak Kedua — Nama", "Second party — Name", { required: true }),
        text("party2Role", "Pihak Kedua — Jabatan / Unit", "Second party — Role / Unit"),
      ],
    },
    length: { words: [300, 550], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Hari dan Tanggal", "Pihak yang Terlibat", "Uraian", "Rincian Barang", "Penutup", "Tanda Tangan"],
      en: ["Date", "Parties", "Description", "Itemised Detail", "Closing", "Signatures"],
    },
    prompt: {
      id: `Susun BERITA ACARA SERAH TERIMA dengan bahasa dokumen resmi. Judul dokumen (# ) memuat hal yang diserahterimakan.
"Hari dan Tanggal" memakai tanggal dan jam dari isian pengguna, ditulis lengkap (contoh: "Rabu, 29 Juli 2026, pukul 10.30 WIB").
"Pihak yang Terlibat" berupa dua blok: PIHAK PERTAMA dan PIHAK KEDUA. Tampilkan Nama serta Jabatan/Unit hanya jika diberikan; jangan menambahkan baris identitas lain.
"Uraian" dibuka dengan kalimat baku: "Pada hari ini, ... , kami yang bertanda tangan di bawah ini:" lalu menyatakan bahwa PIHAK PERTAMA menyerahkan dan PIHAK KEDUA menerima.
"Rincian Barang" WAJIB tabel Markdown: No | Uraian | Jumlah | Satuan | Keterangan, disusun dari isian rincian.
"Penutup" satu paragraf baku bahwa berita acara dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
"Tanda Tangan" berupa tabel dua kolom: PIHAK PERTAMA dan PIHAK KEDUA. Tiap kolom berisi ruang kosong untuk tanda tangan, lalu nama dari isian pengguna di dalam tanda kurung, lalu jabatannya di bawahnya.
Jangan menambah pasal, sanksi, atau klausul hukum yang tidak diminta.`,
      en: `Write a HANDOVER RECORD in formal document register. The document title (# ) names what is being handed over.
"Date" uses the user's date and time written out in full (e.g. "Wednesday, 29 July 2026, at 10.30").
"Parties" is two blocks, FIRST PARTY and SECOND PARTY. Show Name and Role/Unit only when supplied; do not add other identity rows.
"Description" opens with the standard clause "On this day, ... , we the undersigned:" and states that the FIRST PARTY hands over and the SECOND PARTY receives.
"Itemised Detail" MUST be a Markdown table: No | Description | Quantity | Unit | Notes, built from the itemised field.
"Closing" is one standard paragraph stating the record was made truthfully for its proper use.
"Signatures" is a two-column table, FIRST PARTY and SECOND PARTY, each with blank space then the name in parentheses and the role beneath.
Do not add clauses, penalties, or legal terms that were not requested.`,
    },
  },

  {
    id: "site-visit",
    group: "report",
    icon: "MapPin",
    profile: "report",
    name: { id: "Laporan Kunjungan Lapangan", en: "Site Visit Report" },
    blurb: {
      id: "Foto lokasi menjadi laporan temuan dan tindak lanjut.",
      en: "Site photos become findings and follow-up.",
    },
    input: {
      attachments: { kinds: ["image"], min: 1, max: 10 },
      fields: [
        text("location", "Lokasi yang dikunjungi", "Location visited", {
          required: true,
          placeholder: { id: "Contoh: RTH Kelurahan Cempaka", en: "e.g. Cempaka public park" },
        }),
        text("purpose", "Tujuan kunjungan", "Purpose of the visit", {
          required: true,
          placeholder: { id: "Contoh: monitoring progres pembangunan", en: "e.g. monitoring construction progress" },
        }),
        today(),
        text("officer", "Petugas", "Officer"),
        area("notes", "Catatan lapangan", "Field notes"),
      ],
    },
    length: { words: [400, 700], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Identitas Kunjungan", "Tujuan", "Kondisi yang Ditemui", "Temuan", "Rekomendasi", "Dokumentasi"],
      en: ["Visit Details", "Purpose", "Conditions Observed", "Findings", "Recommendations", "Documentation"],
    },
    prompt: {
      id: `Susun LAPORAN KUNJUNGAN LAPANGAN. Judul dokumen (# ) memuat lokasi yang dikunjungi.
"Identitas Kunjungan" tabel dua kolom: Lokasi, Hari/Tanggal, Petugas — dari isian pengguna.
"Kondisi yang Ditemui" deskriptif dan netral, 2–3 paragraf.
"Temuan" WAJIB tabel Markdown: No | Temuan | Kategori | Tingkat Perhatian. Kategori misalnya Sarana, Kebersihan, Keselamatan, Administrasi. Bila tidak ada masalah terlihat, tulis satu baris bahwa kondisi terpantau wajar.
"Rekomendasi" maksimal 5 bullet yang menjawab temuan satu per satu.
Jangan menyebut nama petugas lain, kontraktor, atau nilai anggaran yang tidak diberikan.`,
      en: `Write a SITE VISIT REPORT. The document title (# ) names the location visited.
"Visit Details" is a two-column table: Location, Day/Date, Officer — from the user's fields.
"Conditions Observed" is descriptive and neutral, two to three paragraphs.
"Findings" MUST be a Markdown table: No | Finding | Category | Attention. Categories such as Facilities, Cleanliness, Safety, Administration. If nothing appears wrong, record one line stating conditions looked normal.
"Recommendations" is at most five bullets, each answering one finding.
Never name other staff, contractors, or budget figures that were not supplied.`,
    },
  },

  {
    id: "travel-report",
    group: "report",
    icon: "Plane",
    profile: "report",
    name: { id: "Laporan Perjalanan Dinas", en: "Business Trip Report" },
    blurb: {
      id: "Foto dan catatan perjalanan menjadi laporan baku.",
      en: "Trip photos and notes become a standard report.",
    },
    input: {
      attachments: { kinds: ["image", "document"], min: 0, max: 10 },
      fields: [
        text("purpose", "Maksud perjalanan", "Purpose of the trip", {
          required: true,
          placeholder: { id: "Contoh: mengikuti Bimtek Pengelolaan Keuangan", en: "e.g. attending finance management training" },
        }),
        text("destination", "Tujuan / kota", "Destination", { required: true }),
        today("dateStart", "Tanggal berangkat", "Departure date"),
        today("dateEnd", "Tanggal kembali", "Return date"),
        text("letter", "Nomor surat tugas", "Assignment letter number", {
          placeholder: { id: "Opsional — isi jika tersedia", en: "Optional — enter when available" },
        }),
        area("notes", "Hasil yang diperoleh", "What you got out of it"),
      ],
    },
    length: { words: [400, 700], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Dasar Penugasan", "Waktu dan Tempat", "Maksud dan Tujuan", "Pelaksanaan", "Hasil yang Diperoleh", "Kesimpulan dan Saran", "Dokumentasi"],
      en: ["Basis", "Time and Place", "Purpose", "What Took Place", "Outcomes", "Conclusion and Suggestions", "Documentation"],
    },
    prompt: {
      id: `Susun LAPORAN PERJALANAN DINAS dengan struktur baku. Judul dokumen (# ) memuat maksud dan kota tujuan.
"Dasar Penugasan" hanya ditampilkan bila nomor surat tugas tersedia.
"Pelaksanaan" merangkum kronologi yang didukung catatan dan lampiran. Jangan membuat agenda harian, pertemuan, narasumber, atau sesi yang tidak disebut.
"Hasil yang Diperoleh" berisi substansi dari isian dan lampiran. Boleh dilengkapi konteks umum yang netral, tetapi jangan membuat komitmen, kesepakatan, capaian, atau bukti dokumentasi.
"Kesimpulan dan Saran" singkat dan proporsional terhadap bahan; saran bersifat umum dan tidak menetapkan pemilik maupun tenggat baru.
Jangan mencantumkan biaya, tarif, atau nominal apa pun kecuali diberikan pengguna.`,
      en: `Write a BUSINESS TRIP REPORT in the standard structure. The document title (# ) carries the purpose and destination.
"Basis" appears only when an assignment letter number is available.
"What Took Place" summarises chronology supported by the notes and attachments. Do not invent a daily agenda, meetings, speakers, or sessions.
"Outcomes" contains substance from the field and attachments. Neutral general context is allowed, but do not invent commitments, agreements, achievements, or documentary evidence.
"Conclusion and Suggestions" stays brief and proportional to the source; suggestions are general and do not assign a new owner or deadline.
Never include costs, rates, or amounts unless the user supplied them.`,
    },
  },

  {
    id: "presentation",
    group: "report",
    icon: "Presentation",
    profile: "presentation",
    name: { id: "Paparan / Presentasi", en: "Presentation" },
    blurb: {
      id: "Bahan atau catatan menjadi deck siap tayang.",
      en: "Material or notes become a deck you can present.",
    },
    input: {
      attachments: { kinds: ["document", "image"], min: 0, max: 8 },
      fields: [
        text("subject", "Judul paparan", "Presentation title", {
          required: true,
          placeholder: { id: "Contoh: Paparan Capaian Triwulan I", en: "e.g. Q1 Results Briefing" },
        }),
        text("audience", "Untuk siapa", "Audience", {
          placeholder: { id: "Contoh: rapat pimpinan, forum warga", en: "e.g. leadership meeting, public forum" },
        }),
        today(),
        text("presenter", "Pembicara", "Presenter"),
        area("points", "Poin yang wajib masuk", "Points that must be covered", {
          mode: "fallback",
          placeholder: {
            id: "Satu poin per baris. Tempel juga data atau angka yang mau ditampilkan…",
            en: "One point per line. Paste any data or figures to show…",
          },
        }),
      ],
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["pptx", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Susun PAPARAN sebagai alur cerita, bukan daftar tempelan. Target 6–10 slide sesuai banyaknya bahan; jangan menambah slide untuk mengejar jumlah.
Setiap slide adalah satu heading "## " berisi pesan yang benar-benar didukung bahan, bukan angka atau kesimpulan rekaan.
Di bawah tiap heading: maksimal 6 bullet dan sekitar 45 kata terlihat.
Buka dengan konteks yang didukung sumber dan tutup dengan langkah berikutnya yang umum. Jangan mengarang keputusan, pemilik, sumber daya, jadwal, target, indikator, atau status pelaksanaan.
Angka disajikan sebagai bullet yang DIMULAI dengan angkanya ("62 persen dari pagu terserap") — itu yang membuatnya tampil sebagai callout besar di slide.
Data pembanding disajikan sebagai tabel Markdown; tabel akan menjadi tabel sungguhan di slide.
Sesuaikan bahasa dengan audiens yang diisi pengguna.
Jika sumber tidak memuat angka, jangan membuat metrik, persentase nol, durasi, maupun tabel angka.`,
      en: `Write a PRESENTATION as a narrative, not a list of labels. Target six to ten slides according to the amount of source material; never pad to hit a count.
Each slide is one "## " heading carrying a message genuinely supported by the material, never a fabricated figure or conclusion.
Under each heading: at most six bullets and roughly 45 visible words.
Open with source-supported context and close with general next steps. Do not invent decisions, owners, resources, schedules, targets, indicators, or implementation status.
Figures are bullets that START with the number ("62 per cent of the budget drawn"), which is what renders them as a large callout.
Comparative data goes in a Markdown table; tables become real tables on the slide.
Pitch the language at the audience the user named.
If the source contains no figures, do not create metrics, zero percentages, durations, or numeric tables.`,
    },
  },

  {
    id: "diagram",
    completionPolicy: "source-faithful",
    group: "utility",
    icon: "Workflow",
    profile: "diagram",
    name: { id: "Diagram Alur", en: "Process Diagram" },
    blurb: {
      id: "Prosedur atau dokumen menjadi bagan alur yang bisa diunduh.",
      en: "A procedure or document becomes a downloadable flow chart.",
    },
    input: {
      attachments: { kinds: ["document", "image"], min: 0, max: 5 },
      fields: [
        text("subject", "Alur apa", "Which process", {
          required: true,
          placeholder: { id: "Contoh: Alur Perizinan Reklame", en: "e.g. Signage permit process" },
        }),
        area("steps", "Langkah-langkahnya", "The steps", {
          mode: "fallback",
          placeholder: {
            id: "Satu langkah per baris, urut. Atau lampirkan SOP-nya dan biarkan dibaca…",
            en: "One step per line, in order. Or attach the procedure and let it be read…",
          },
        }),
      ],
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["png", "svg", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Ubah prosedur yang diberikan menjadi DIAGRAM ALUR yang siap ditampilkan.
Ambil alur utamanya saja: 5–8 langkah, label pendek (maksimal 6 kata per langkah).
WAJIB keluarkan satu blok \`\`\`process berisi JSON {title, steps[{id,label}], edges[{from,to}]}.
Judul diagram diambil dari isian "Alur apa".
Di luar fence, tulis 2–4 bullet ringkasan alurnya.
Jangan mengarang langkah yang tidak ada di sumber. Jangan mengandalkan kode Mermaid mentah.
"Bagus" di sini berarti jelas dan mudah dibaca, bukan rumit.`,
      en: `Turn the supplied procedure into a READY process diagram.
Take the main flow only: five to eight steps, short labels of at most six words each.
MUST emit one \`\`\`process fence containing JSON {title, steps[{id,label}], edges[{from,to}]}.
The diagram title comes from the "Which process" field.
Outside the fence, write two to four summary bullets.
Do not invent steps that are not in the source. Do not rely on raw Mermaid.
"Good" here means clear and readable, not elaborate.`,
    },
  },

  {
    id: "press-caption",
    group: "utility",
    icon: "Megaphone",
    profile: "general",
    name: { id: "Caption & Rilis Singkat", en: "Caption & Short Release" },
    blurb: {
      id: "Foto kegiatan menjadi caption dan rilis untuk publikasi.",
      en: "An activity photo becomes a caption and a short release.",
    },
    input: {
      attachments: { kinds: ["image"], min: 1, max: 5 },
      fields: [
        text("activity", "Kegiatan apa", "What activity", {
          required: true,
          placeholder: { id: "Contoh: peluncuran layanan antar jemput lansia", en: "e.g. launch of the senior pickup service" },
        }),
        text("organizer", "Penyelenggara", "Organiser"),
        today(),
      ],
    },
    length: { words: [200, 400], pages: 1 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Caption Media Sosial", "Tagar", "Rilis Singkat", "Usulan Judul"],
      en: ["Social Caption", "Hashtags", "Short Release", "Headline Options"],
    },
    prompt: {
      id: `Buat bahan publikasi dari kegiatan yang disebutkan pengguna.
"Caption Media Sosial" 3 pilihan berbeda gaya: (1) formal instansi, (2) hangat dan mudah dibagikan, (3) sangat singkat untuk story. Maksimal 45 kata masing-masing.
"Tagar" maksimal 8 tagar relevan.
"Rilis Singkat" satu paragraf 4–6 kalimat bergaya berita: apa, siapa, di mana, kapan, mengapa penting. Bagian yang tidak diketahui ditulis dalam kurung siku untuk diisi, contoh: [nama pejabat].
"Usulan Judul" 3 pilihan, maksimal 12 kata.
Jangan mengarang kutipan pejabat, jumlah peserta, atau capaian angka.`,
      en: `Produce publication material for the activity the user named.
"Social Caption" gives three registers: (1) formal institutional, (2) warm and shareable, (3) very short for stories. At most 45 words each.
"Hashtags" is at most eight relevant tags.
"Short Release" is one news-style paragraph of four to six sentences: what, who, where, when, why it matters. Unknown details go in square brackets, e.g. [official's name].
"Headline Options" gives three of at most twelve words.
Never invent quotations, attendance numbers, or achievement figures.`,
    },
  },

  {
    id: "translate",
    completionPolicy: "source-faithful",
    group: "utility",
    icon: "Languages",
    profile: "general",
    name: { id: "Terjemahan Dokumen", en: "Document Translation" },
    blurb: {
      id: "Dokumen diterjemahkan dengan format tetap terjaga.",
      en: "A document translated with its structure intact.",
    },
    input: {
      attachments: { kinds: ["document", "image"], min: 1, max: 5 },
      fields: [
        text("target", "Bahasa tujuan", "Target language", {
          placeholder: { id: "Contoh: Inggris. Kosongkan untuk otomatis.", en: "e.g. Indonesian. Leave blank for automatic." },
        }),
      ],
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["docx", "pdf"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Terjemahkan dokumen yang dilampirkan ke bahasa tujuan pada isian. Bila kosong, terjemahkan Indonesia ke Inggris atau bahasa lain ke Indonesia.
Pertahankan struktur asli: heading, penomoran, urutan bagian, tabel, dan daftar.
Angka, tanggal, nama orang, nama instansi, dan nomor dokumen TIDAK diterjemahkan.
Istilah teknis atau hukum tanpa padanan pasti: terjemahkan lalu cantumkan istilah aslinya dalam kurung pada kemunculan pertama.
Keluarkan HANYA hasil terjemahan. Tanpa catatan penerjemah, ringkasan, atau teks aslinya.`,
      en: `Translate the attached document into the target language given in the field. When blank, translate Indonesian into English, or any other language into Indonesian.
Preserve the original structure: headings, numbering, section order, tables, and lists.
Numbers, dates, personal names, organisation names, and document numbers are NOT translated.
For technical or legal terms without a settled equivalent, translate and give the original in parentheses at first mention.
Output ONLY the translation. No translator's notes, no summary, not the source text.`,
    },
  },

  {
    id: "letter-reply",
    group: "utility",
    icon: "Mail",
    profile: "general",
    name: { id: "Draf Balasan Surat", en: "Draft Letter Reply" },
    blurb: {
      id: "Foto surat masuk menjadi draf surat balasan.",
      en: "A photo of an incoming letter becomes a draft reply.",
    },
    input: {
      attachments: { kinds: ["image", "document"], min: 1, max: 5 },
      fields: [
        area("position", "Sikap balasan", "Position to take", {
          required: true,
          placeholder: {
            id: "Contoh: menyetujui, tapi minta jadwal diundur ke minggu depan",
            en: "e.g. agree, but ask to move the date to next week",
          },
        }),
        text("sender", "Instansi pengirim balasan", "Replying organisation"),
        today("date", "Tanggal surat", "Letter date"),
      ],
    },
    length: { words: [250, 450], pages: 1 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Ringkasan Surat Masuk", "Draf Surat Balasan"],
      en: ["Incoming Letter Summary", "Draft Reply"],
    },
    prompt: {
      id: `Baca surat masuk yang dilampirkan lalu susun draf balasannya.
"Ringkasan Surat Masuk" maksimal 4 bullet: pengirim, nomor dan tanggal surat, pokok permintaan, tenggat bila ada.
"Draf Surat Balasan" lengkap dalam format surat dinas: tempat dan tanggal (pakai tanggal dari isian), nomor/lampiran/hal, alamat tujuan, salam pembuka, isi 2–3 paragraf, salam penutup, blok tanda tangan.
Isi balasan mengikuti sikap yang diisi pengguna.
Jangan membuat nomor surat, nama penanda tangan, atau jabatan. Hilangkan baris yang tidak didukung. Untuk penutup, gunakan instansi pengirim dari isian; bila kosong, gunakan penyebutan netral "atas nama instansi pengirim" tanpa penanda edit.
Bahasa surat dinas yang sopan dan ringkas — hindari kalimat berbunga-bunga.`,
      en: `Read the attached incoming letter and draft a reply.
"Incoming Letter Summary" is at most four bullets: sender, letter number and date, what is asked, any deadline.
"Draft Reply" is a complete formal letter: place and date (use the date field), reference/enclosure/subject lines, recipient address, salutation, two to three body paragraphs, closing, signature block.
The reply takes the position the user typed.
Do not invent a letter number, signatory, or job title. Omit unsupported lines. In the closing, use the replying organisation when supplied; otherwise use the role-neutral phrase "on behalf of the replying organisation" without an editing marker.
Courteous, economical official-letter English — no flowery sentences.`,
    },
  },

  {
    id: "image-prompt",
    completionPolicy: "source-faithful",
    group: "utility",
    icon: "Sparkles",
    profile: "prompt",
    name: { id: "Prompt Foto", en: "Image Prompt" },
    blurb: {
      id: "Foto dibedah menjadi prompt untuk menghasilkan gambar serupa.",
      en: "A photo reverse-engineered into a prompt that recreates it.",
    },
    input: {
      attachments: { kinds: ["image"], min: 1, max: 3 },
      fields: [
        text("changes", "Yang ingin diubah", "What to change", {
          placeholder: { id: "Contoh: sama tapi suasana malam hari", en: "e.g. same but at night" },
        }),
      ],
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["copy"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Bedah foto yang dilampirkan lalu tulis PROMPT untuk menghasilkan gambar serupa.
Keluarkan tiga blok, masing-masing di bawah heading:

## Prompt
Satu paragraf padat dalam BAHASA INGGRIS (model gambar bekerja paling baik dengan bahasa Inggris) mencakup: subjek, aksi, latar, waktu dan cuaca, pencahayaan, sudut dan jarak kamera, lensa, komposisi, palet warna, tekstur, suasana, dan gaya visual.

## Negative Prompt
Satu baris hal yang harus dihindari, dipisah koma.

## Pengaturan
Bullet singkat: rasio aspek, gaya, dan tingkat detail yang disarankan.

Bila pengguna mengisi "Yang ingin diubah", terapkan pada Prompt dan pertahankan sisanya.
Jangan mendeskripsikan wajah orang tertentu, dan jangan menyebut merek atau nama fotografer.
Jangan menambahkan penjelasan di luar tiga blok itu.`,
      en: `Take the attached photo apart and write a PROMPT that would recreate it.
Emit three blocks, each under a heading:

## Prompt
One dense paragraph in English covering: subject, action, setting, time and weather, lighting, camera angle and distance, lens, composition, colour palette, texture, mood, and visual style.

## Negative Prompt
One comma-separated line of what to avoid.

## Settings
Short bullets: suggested aspect ratio, style, and detail level.

Where the user filled in "What to change", apply it to the Prompt and keep everything else.
Do not describe an identifiable person's face, and do not name brands or photographers.
Add no commentary outside those three blocks.`,
    },
  },
];

export const COMPLETION_STANCE_CLAUSES = COMPLETION_STANCES;
