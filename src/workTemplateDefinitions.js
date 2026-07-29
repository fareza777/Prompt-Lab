/**
 * The template catalogue.
 *
 * Each entry is a complete package rather than a label: what may be attached,
 * the instruction the model receives, the section skeleton it must fill, how
 * long the result should be, and which files it can be exported as. Two
 * templates given the same photo must produce visibly different documents —
 * that is the whole point, so the prompts are deliberately specific rather
 * than variations on "write a report".
 *
 * `profile` maps onto the existing deliverable profiles so output sanitising
 * and Office export keep working unchanged.
 *
 * Attachment rules: one file is enough everywhere except Before & After, which
 * is meaningless without two.
 *
 * `note.mode`
 *   optional  - extra context, never demanded
 *   required  - the template cannot work without typed input
 *   fallback  - required only when nothing was attached
 */

/** Shared clause: the model may only describe what is genuinely visible. */
const VISUAL_HONESTY = {
  id: "Tulis hanya yang benar-benar terlihat atau tertulis pada lampiran. Jangan menebak nama orang, jabatan, instansi, jumlah peserta, tanggal, atau lokasi dari wajah, seragam, atau latar belakang. Untuk informasi penting yang tidak terbaca, tulis \"Belum tersedia\" dan lanjutkan.",
  en: "Describe only what is genuinely visible or written in the attachment. Never guess names, job titles, organisations, headcounts, dates, or locations from faces, uniforms, or backgrounds. Where an essential detail cannot be read, write \"Not provided\" and move on.",
};

/** Shared clause for templates whose real output is a spreadsheet. */
const TABLE_ONLY = {
  id: "Keluarkan hasil sebagai tabel Markdown dengan baris header yang jelas. Boleh lebih dari satu tabel, masing-masing didahului heading pendek sebagai nama sheet. Jangan menulis paragraf panjang di luar tabel — maksimal satu kalimat pengantar per tabel. Satu baris tabel mewakili satu catatan.",
  en: "Return the result as Markdown tables with a clear header row. More than one table is allowed; precede each with a short heading that becomes the sheet name. Do not write long prose around the tables — at most one introductory sentence each. One table row represents one record.",
};

export const TEMPLATE_GROUPS = ["report", "meeting", "extract", "utility"];

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
      note: {
        mode: "optional",
        label: { id: "Catatan singkat", en: "Short note" },
        placeholder: {
          id: "Contoh: rapat koordinasi tim humas, Selasa pagi di aula.",
          en: "e.g. team coordination meeting, Tuesday morning in the hall.",
        },
      },
    },
    length: { words: [450, 750], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Judul Kegiatan", "Waktu dan Tempat", "Ringkasan Kegiatan", "Uraian Pelaksanaan", "Hasil dan Tindak Lanjut", "Dokumentasi"],
      en: ["Activity Title", "Time and Place", "Summary", "How It Ran", "Outcome and Follow-up", "Documentation"],
    },
    prompt: {
      id: `Susun LAPORAN KEGIATAN resmi berdasarkan foto yang dilampirkan. Panjang sekitar 2 halaman.
Baca foto dengan cermat: jenis kegiatan, suasana ruangan, jumlah orang yang terlihat, perlengkapan, spanduk/layar, dan tulisan apa pun yang terbaca.
Bagian "Uraian Pelaksanaan" adalah inti laporan — tulis 2–4 paragraf mengalir, bukan bullet.
Bagian "Dokumentasi" berisi daftar keterangan foto singkat, satu baris per foto ("Foto 1 — ...").
Gunakan bahasa Indonesia resmi ragam laporan dinas, kalimat pasif seperlunya, tanpa kata berlebihan.`,
      en: `Write a formal ACTIVITY REPORT from the attached photos. Around two pages.
Read the photos closely: what kind of activity, the setting, how many people are visible, equipment, banners or screens, and any legible text.
"How It Ran" is the heart of the report — write two to four flowing paragraphs, not bullets.
"Documentation" is a short caption list, one line per photo ("Photo 1 — ...").
Use plain formal report English without padding.`,
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
      note: {
        mode: "fallback",
        label: { id: "Transkrip atau catatan rapat", en: "Transcript or meeting notes" },
        placeholder: {
          id: "Tempel transkrip, atau ketik poin-poin yang dibahas…",
          en: "Paste the transcript, or type the points discussed…",
        },
      },
    },
    length: { words: [400, 700], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Identitas Rapat", "Peserta", "Agenda", "Pembahasan", "Keputusan", "Tindak Lanjut"],
      en: ["Meeting Details", "Attendees", "Agenda", "Discussion", "Decisions", "Action Items"],
    },
    prompt: {
      id: `Susun NOTULEN RAPAT dari bahan yang diberikan (transkrip yang diketik dan/atau foto catatan tulisan tangan).
Jika ada foto catatan tangan, baca tulisannya dan pakai isinya sebagai sumber utama.
"Pembahasan" ditulis per agenda, ringkas, satu paragraf pendek per agenda.
"Keputusan" berupa bullet dan hanya memuat hal yang benar-benar diputuskan — bukan usulan atau wacana.
"Tindak Lanjut" WAJIB berbentuk tabel Markdown: Tindakan | Penanggung Jawab | Tenggat | Status. Isi "Belum tersedia" pada sel yang tidak didukung sumber.
Jangan pernah mengarang nama peserta, tanggal, atau kutipan.`,
      en: `Write MEETING MINUTES from the material provided (typed transcript and/or photographed handwritten notes).
Where a photo of handwritten notes is attached, read it and treat it as the primary source.
Write "Discussion" agenda item by agenda item, one short paragraph each.
"Decisions" is a bullet list containing only what was actually decided — not proposals or open discussion.
"Action Items" MUST be a Markdown table: Action | Owner | Due | Status. Put "Not provided" in any cell the source does not support.
Never invent attendee names, dates, or quotations.`,
    },
  },

  {
    id: "summary",
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
      note: {
        mode: "optional",
        label: { id: "Fokus ringkasan", en: "Focus" },
        placeholder: {
          id: "Contoh: fokus ke anggaran dan risiko.",
          en: "e.g. focus on budget and risk.",
        },
      },
    },
    length: { words: [300, 550], pages: 1 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Ringkasan Inti", "Poin Kunci", "Angka Penting", "Hal yang Perlu Perhatian"],
      en: ["Core Summary", "Key Points", "Key Figures", "Needs Attention"],
    },
    prompt: {
      id: `Ringkas dokumen yang dilampirkan menjadi SATU HALAMAN.
"Ringkasan Inti" adalah 1 paragraf (4–6 kalimat) yang bisa dibaca sendirian dan sudah menjawab "dokumen ini tentang apa dan apa kesimpulannya".
"Poin Kunci" maksimal 7 bullet, masing-masing satu kalimat penuh, bukan potongan frasa.
"Angka Penting" hanya diisi bila dokumen memuat angka — salin persis apa adanya, jangan dibulatkan atau dihitung ulang.
"Hal yang Perlu Perhatian" memuat risiko, tenggat, atau keputusan yang menunggu. Lewati bagian ini jika tidak ada.
Pertahankan istilah asli dokumen. Jangan menambahkan opini atau saran yang tidak ada di sumber.`,
      en: `Reduce the attached document to ONE PAGE.
"Core Summary" is a single paragraph of four to six sentences that stands alone and already answers what the document is about and what it concludes.
"Key Points" is at most seven bullets, each a full sentence rather than a fragment.
"Key Figures" is filled only when the document contains numbers — copy them exactly, never round or recompute.
"Needs Attention" covers risks, deadlines, or pending decisions. Skip the section if there are none.
Keep the source's own terminology. Add no opinion or advice that is not in the source.`,
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
      attachments: { kinds: ["image"], min: 2, max: 6 },
      note: {
        mode: "optional",
        label: { id: "Pekerjaan yang dilakukan", en: "Work carried out" },
        placeholder: {
          id: "Contoh: pengecatan ulang dan perbaikan plafon ruang arsip.",
          en: "e.g. repainting and ceiling repair in the archive room.",
        },
      },
    },
    length: { words: [250, 450], pages: 1 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Objek dan Lokasi", "Kondisi Sebelum", "Pekerjaan yang Dilakukan", "Kondisi Sesudah", "Perubahan yang Terlihat"],
      en: ["Object and Location", "Condition Before", "Work Carried Out", "Condition After", "Visible Change"],
    },
    prompt: {
      id: `Susun LAPORAN PERBANDINGAN SEBELUM & SESUDAH dari foto yang dilampirkan. Cukup 1 halaman.
Foto pertama adalah kondisi SEBELUM, foto berikutnya kondisi SESUDAH, kecuali catatan pengguna menyatakan lain.
"Kondisi Sebelum" dan "Kondisi Sesudah" harus membahas hal-hal yang SAMA dan sebanding (misal: permukaan dinding, kerapian kabel, penataan barang) agar perbandingannya jujur.
"Perubahan yang Terlihat" WAJIB berbentuk tabel Markdown: Aspek | Sebelum | Sesudah. Isi hanya aspek yang benar-benar terlihat berubah pada kedua foto.
Jangan menilai kualitas pekerjaan, biaya, atau ketepatan waktu — itu tidak terlihat di foto.`,
      en: `Write a BEFORE & AFTER comparison report from the attached photos. One page is enough.
The first photo is the BEFORE condition and the later ones the AFTER condition, unless the user's note says otherwise.
"Condition Before" and "Condition After" must address the SAME comparable things (surface, cabling, arrangement) so the comparison is honest.
"Visible Change" MUST be a Markdown table: Aspect | Before | After, listing only aspects genuinely visible in both photos.
Do not judge workmanship quality, cost, or timeliness — none of that is visible in a photo.`,
    },
  },

  {
    id: "recap-sheet",
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
      note: {
        mode: "fallback",
        label: { id: "Catatan yang mau direkap", en: "Notes to recap" },
        placeholder: {
          id: "Tempel daftar, catatan, atau data yang ingin direkap…",
          en: "Paste the list, notes, or data you want recapped…",
        },
      },
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["xlsx", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Buat REKAPITULASI dalam bentuk tabel dari berkas atau catatan yang diberikan.
Tentukan sendiri kolom yang paling masuk akal untuk bahan ini (misal: No, Tanggal, Uraian, Jumlah, Keterangan) — kolom harus konsisten di seluruh tabel.
Salin nilai apa adanya. JANGAN menghitung total, rata-rata, atau persentase kecuali angka itu memang sudah tertulis di sumber.
Jika bahan memuat beberapa kelompok berbeda, buat satu tabel per kelompok dengan heading pendek di atasnya.
Baris yang datanya tidak terbaca tetap dimasukkan dengan sel kosong diisi "Belum tersedia" — jangan dibuang diam-diam.
${TABLE_ONLY.id}`,
      en: `Build a RECAP as tables from the supplied file or notes.
Choose the columns that genuinely fit the material (e.g. No, Date, Description, Amount, Notes) and keep them consistent throughout.
Copy values exactly. DO NOT compute totals, averages, or percentages unless that figure is already written in the source.
When the material contains distinct groups, emit one table per group under a short heading.
Rows whose data cannot be read are still included, with unreadable cells set to "Not provided" — never drop a row silently.
${TABLE_ONLY.en}`,
    },
  },

  {
    id: "attendance-list",
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
      note: {
        mode: "optional",
        label: { id: "Nama kegiatan", en: "Activity name" },
        placeholder: { id: "Contoh: Sosialisasi SPBE, 12 Mei.", en: "e.g. SPBE briefing, 12 May." },
      },
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["xlsx", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Ketik ulang DAFTAR HADIR dari foto lembar absensi menjadi tabel.
Kolom mengikuti lembar aslinya (umumnya: No, Nama, Jabatan/Unit Kerja, Tanda Tangan/Hadir). Jangan menambah kolom yang tidak ada.
Urutan baris harus sama persis dengan lembar aslinya.
Tulisan tangan yang tidak yakin terbaca: tulis dugaan terbaik lalu tambahkan tanda "(?)" di belakangnya, jangan dikosongkan dan jangan dikarang.
Baris kosong pada lembar tidak perlu dimasukkan.
Setelah tabel, tulis satu baris: "Jumlah baris terbaca: N" — hitung baris, bukan kesimpulan jumlah peserta hadir.
${TABLE_ONLY.id}`,
      en: `Retype the ATTENDANCE SHEET from the photo into a table.
Mirror the sheet's own columns (typically No, Name, Role/Unit, Signature/Present). Do not add columns that are not there.
Keep the rows in the sheet's original order.
Where handwriting is uncertain, give your best reading followed by "(?)" — never blank it out and never invent a name.
Blank rows on the sheet do not need to be included.
After the table write one line: "Rows read: N" — a count of rows, not a conclusion about how many people attended.
${TABLE_ONLY.en}`,
    },
  },

  {
    id: "table-extract",
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
      note: {
        mode: "optional",
        label: { id: "Tabel yang mana", en: "Which table" },
        placeholder: { id: "Contoh: hanya tabel realisasi anggaran.", en: "e.g. only the budget table." },
      },
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["xlsx", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Salin ulang TABEL yang ada di lampiran, persis seperti aslinya.
Pertahankan judul kolom asli, urutan kolom, dan urutan baris.
Angka disalin apa adanya termasuk pemisah ribuan dan satuan yang tertulis. Jangan mengubah format, membulatkan, atau menghitung ulang.
Sel gabungan (merge) dipecah dengan mengulang nilainya di tiap baris agar tabel tetap persegi.
Jika ada beberapa tabel, keluarkan semuanya, masing-masing dengan heading pendek sesuai judul tabel aslinya.
Baris total yang memang tertulis di sumber tetap disalin sebagai baris biasa.
${TABLE_ONLY.id}`,
      en: `Reproduce the TABLE in the attachment exactly as it stands.
Keep the original column headers, column order, and row order.
Copy numbers verbatim including thousands separators and any written units. Do not reformat, round, or recalculate.
Split merged cells by repeating the value on each row so the table stays rectangular.
If several tables are present, output them all, each under a short heading taken from its original caption.
A total row that genuinely appears in the source is copied through as an ordinary row.
${TABLE_ONLY.en}`,
    },
  },

  {
    id: "action-items",
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
      note: {
        mode: "fallback",
        label: { id: "Catatan hasil diskusi", en: "Discussion notes" },
        placeholder: {
          id: "Tempel catatan, atau ketik hal-hal yang harus ditindaklanjuti…",
          en: "Paste notes, or type what needs following up…",
        },
      },
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["xlsx", "docx"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Ubah catatan atau foto yang diberikan menjadi DAFTAR TINDAK LANJUT.
Satu tabel Markdown dengan kolom: No | Tindakan | Penanggung Jawab | Tenggat | Prioritas | Status.
"Tindakan" harus dimulai dengan kata kerja dan cukup jelas untuk dikerjakan tanpa membaca catatan aslinya.
"Penanggung Jawab" dan "Tenggat" hanya diisi bila disebut di sumber; selain itu "Belum tersedia".
"Prioritas" diisi Tinggi/Sedang/Rendah berdasarkan urgensi yang tersurat di sumber; jika tidak ada petunjuk, isi "Sedang".
"Status" selalu "Belum mulai" kecuali sumber menyatakan lain.
Hal yang hanya wacana atau informasi tanpa tindakan JANGAN dimasukkan.
${TABLE_ONLY.id}`,
      en: `Turn the supplied notes or photo into an ACTION ITEM list.
One Markdown table with the columns: No | Action | Owner | Due | Priority | Status.
"Action" must start with a verb and be clear enough to act on without reading the original notes.
"Owner" and "Due" are filled only when the source states them; otherwise "Not provided".
"Priority" is High/Medium/Low based on urgency actually expressed in the source; with no signal, use "Medium".
"Status" is always "Not started" unless the source says otherwise.
Points that are discussion or information without an action DO NOT belong in the list.
${TABLE_ONLY.en}`,
    },
  },

  {
    id: "official-record",
    group: "report",
    icon: "ScrollText",
    profile: "report",
    name: { id: "Berita Acara", en: "Official Record" },
    blurb: {
      id: "Dokumen formal serah terima atau pemeriksaan.",
      en: "A formal handover or inspection record.",
    },
    input: {
      attachments: { kinds: ["image", "document"], min: 0, max: 8 },
      note: {
        mode: "fallback",
        label: { id: "Hal yang diberitakan", en: "What is being recorded" },
        placeholder: {
          id: "Contoh: serah terima 12 unit laptop dari Bagian Umum ke Bidang IT.",
          en: "e.g. handover of 12 laptops from General Affairs to IT.",
        },
      },
    },
    length: { words: [300, 550], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Judul Berita Acara", "Hari dan Tanggal", "Pihak yang Terlibat", "Dasar", "Uraian", "Rincian", "Penutup", "Tanda Tangan"],
      en: ["Title", "Date", "Parties", "Basis", "Description", "Details", "Closing", "Signatures"],
    },
    prompt: {
      id: `Susun BERITA ACARA dengan gaya bahasa dokumen resmi.
Buka bagian "Uraian" dengan kalimat baku: "Pada hari ini, ... , kami yang bertanda tangan di bawah ini:" lalu lanjutkan.
"Rincian" berbentuk tabel Markdown bila menyangkut barang atau nilai: No | Uraian | Jumlah | Satuan | Keterangan.
"Tanda Tangan" berisi dua kolom pihak dengan baris nama dan jabatan yang dikosongkan sebagai "( ................................ )" untuk diisi tangan.
Setiap data yang tidak diberikan pengguna ditulis sebagai titik-titik isian, BUKAN dikarang. Contoh: "Nomor: ......................".
Jangan menambahkan pasal, sanksi, atau klausul hukum yang tidak diminta.`,
      en: `Write an OFFICIAL RECORD in formal document register.
Open "Description" with the standard clause "On this day, ... , we the undersigned:" and continue from there.
"Details" is a Markdown table when goods or values are involved: No | Description | Quantity | Unit | Notes.
"Signatures" holds two party columns with name and title lines left as "( ................................ )" to be completed by hand.
Any detail the user did not supply is written as a dotted fill-in line, NEVER invented. For example "Number: ......................".
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
      note: {
        mode: "optional",
        label: { id: "Lokasi dan tujuan kunjungan", en: "Location and purpose" },
        placeholder: {
          id: "Contoh: monitoring pembangunan RTH Kelurahan Cempaka.",
          en: "e.g. monitoring the Cempaka park construction.",
        },
      },
    },
    length: { words: [400, 700], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Identitas Kunjungan", "Tujuan", "Kondisi yang Ditemui", "Temuan", "Rekomendasi", "Dokumentasi"],
      en: ["Visit Details", "Purpose", "Conditions Observed", "Findings", "Recommendations", "Documentation"],
    },
    prompt: {
      id: `Susun LAPORAN KUNJUNGAN LAPANGAN dari foto lokasi.
"Kondisi yang Ditemui" bersifat deskriptif dan netral — apa yang ada di lokasi, tanpa penilaian.
"Temuan" WAJIB tabel Markdown: No | Temuan | Kategori | Tingkat Perhatian. Kategori misalnya Sarana, Kebersihan, Keselamatan, Administrasi. Tingkat Perhatian diisi Tinggi/Sedang/Rendah.
Setiap temuan harus bisa ditunjuk ke sesuatu yang terlihat di foto. Jika tidak ada masalah yang terlihat, tulis satu baris temuan bahwa kondisi terpantau wajar.
"Rekomendasi" maksimal 5 bullet dan harus menjawab temuan di atasnya, satu per satu.
Jangan menyebut nama petugas, kontraktor, atau nilai anggaran yang tidak tertulis pada foto.`,
      en: `Write a SITE VISIT REPORT from the location photos.
"Conditions Observed" is descriptive and neutral — what is present, without judgement.
"Findings" MUST be a Markdown table: No | Finding | Category | Attention. Categories are things like Facilities, Cleanliness, Safety, Administration. Attention is High/Medium/Low.
Every finding must point at something visible in a photo. If nothing appears wrong, record a single finding stating conditions looked normal.
"Recommendations" is at most five bullets, each answering one of the findings above.
Never name staff, contractors, or budget figures that are not written in the photos.`,
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
      attachments: { kinds: ["image", "document"], min: 1, max: 10 },
      note: {
        mode: "optional",
        label: { id: "Tujuan dan tanggal perjalanan", en: "Destination and dates" },
        placeholder: {
          id: "Contoh: Bandung, 3–5 Juni, menghadiri bimtek keuangan.",
          en: "e.g. Bandung, 3–5 June, finance training.",
        },
      },
    },
    length: { words: [400, 700], pages: 2 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Dasar Penugasan", "Waktu dan Tempat", "Maksud dan Tujuan", "Pelaksanaan", "Hasil yang Diperoleh", "Kesimpulan dan Saran", "Dokumentasi"],
      en: ["Basis", "Time and Place", "Purpose", "What Took Place", "Outcomes", "Conclusion and Suggestions", "Documentation"],
    },
    prompt: {
      id: `Susun LAPORAN PERJALANAN DINAS dengan struktur baku.
"Dasar Penugasan" ditulis sebagai baris isian titik-titik ("Surat Tugas Nomor: ......................") kecuali pengguna menyebutkannya.
"Pelaksanaan" ditulis kronologis per hari bila tanggalnya lebih dari satu.
"Hasil yang Diperoleh" adalah bagian yang paling bernilai — 4–8 bullet berisi substansi yang didapat, bukan aktivitas yang dilakukan.
"Kesimpulan dan Saran" maksimal 3 kalimat kesimpulan dan 3 bullet saran yang bisa ditindaklanjuti unit kerja.
Jangan mencantumkan rincian biaya, tarif, atau nominal apa pun kecuali tertulis jelas di lampiran.`,
      en: `Write a BUSINESS TRIP REPORT in the standard structure.
"Basis" is a dotted fill-in line ("Assignment letter number: ......................") unless the user states it.
"What Took Place" runs chronologically by day when the trip spans several dates.
"Outcomes" is the most valuable section — four to eight bullets of substance gained, not activities performed.
"Conclusion and Suggestions" is at most three sentences of conclusion and three actionable suggestions.
Never include costs, rates, or any monetary figure unless it is plainly written in the attachment.`,
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
      note: {
        mode: "optional",
        label: { id: "Konteks kegiatan", en: "Context" },
        placeholder: {
          id: "Contoh: peluncuran layanan antar jemput lansia.",
          en: "e.g. launch of the senior pickup service.",
        },
      },
    },
    length: { words: [200, 400], pages: 1 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Caption Media Sosial", "Tagar", "Rilis Singkat", "Usulan Judul"],
      en: ["Social Caption", "Hashtags", "Short Release", "Headline Options"],
    },
    prompt: {
      id: `Buat bahan publikasi dari foto kegiatan.
"Caption Media Sosial" berisi 3 pilihan caption berbeda gaya: (1) formal instansi, (2) hangat dan mudah dibagikan, (3) sangat singkat untuk story. Masing-masing maksimal 45 kata.
"Tagar" maksimal 8 tagar relevan, tanpa tagar umum yang tidak ada hubungannya.
"Rilis Singkat" satu paragraf 4–6 kalimat bergaya berita: apa, siapa, di mana, kapan, mengapa penting. Bagian yang tidak diketahui ditulis dengan tanda kurung siku untuk diisi, contoh: [nama pejabat].
"Usulan Judul" 3 pilihan judul berita, maksimal 12 kata.
Jangan mengarang kutipan pejabat, jumlah peserta, atau capaian angka.`,
      en: `Produce publication material from the activity photo.
"Social Caption" gives three captions in different registers: (1) formal institutional, (2) warm and shareable, (3) very short for stories. Each at most 45 words.
"Hashtags" is at most eight relevant tags, with no unrelated generic ones.
"Short Release" is one news-style paragraph of four to six sentences: what, who, where, when, why it matters. Unknown details go in square brackets to be filled in, e.g. [official's name].
"Headline Options" gives three headlines of at most twelve words.
Never invent quotations, attendance numbers, or achievement figures.`,
    },
  },

  {
    id: "translate",
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
      note: {
        mode: "optional",
        label: { id: "Bahasa tujuan", en: "Target language" },
        placeholder: {
          id: "Contoh: ke bahasa Inggris. Kosongkan untuk terjemahan otomatis.",
          en: "e.g. into Indonesian. Leave blank to translate automatically.",
        },
      },
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["docx", "pdf"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Terjemahkan dokumen yang dilampirkan.
Bahasa tujuan mengikuti catatan pengguna. Jika tidak disebut, terjemahkan Indonesia ke Inggris, atau bahasa lain ke Indonesia.
Pertahankan struktur asli: heading, penomoran, urutan bagian, tabel, dan daftar tetap sama persis.
Angka, tanggal, nama orang, nama instansi, dan nomor dokumen TIDAK diterjemahkan.
Istilah teknis atau hukum yang tidak punya padanan pasti: terjemahkan lalu cantumkan istilah aslinya dalam kurung pada kemunculan pertama.
Keluarkan HANYA hasil terjemahan. Jangan menambahkan catatan penerjemah, ringkasan, atau teks aslinya.`,
      en: `Translate the attached document.
The target language follows the user's note. Where none is given, translate Indonesian into English, or any other language into Indonesian.
Preserve the original structure exactly: headings, numbering, section order, tables, and lists.
Numbers, dates, personal names, organisation names, and document numbers are NOT translated.
For technical or legal terms without a settled equivalent, translate and give the original in parentheses at first mention.
Output ONLY the translation. Add no translator's notes, no summary, and not the source text.`,
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
      note: {
        mode: "optional",
        label: { id: "Sikap balasan", en: "Position to take" },
        placeholder: {
          id: "Contoh: menyetujui tapi minta jadwal diundur.",
          en: "e.g. agree but ask to move the date.",
        },
      },
    },
    length: { words: [250, 450], pages: 1 },
    outputs: ["docx", "pdf"],
    sections: {
      id: ["Ringkasan Surat Masuk", "Draf Surat Balasan"],
      en: ["Incoming Letter Summary", "Draft Reply"],
    },
    prompt: {
      id: `Baca surat masuk yang dilampirkan lalu susun draf balasannya.
"Ringkasan Surat Masuk" maksimal 4 bullet: pengirim, nomor dan tanggal surat, pokok permintaan, dan tenggat bila ada.
"Draf Surat Balasan" ditulis lengkap dalam format surat dinas: tempat dan tanggal, nomor/lampiran/hal, alamat tujuan, salam pembuka, isi 2–3 paragraf, salam penutup, dan blok tanda tangan.
Nomor surat, nama penanda tangan, dan jabatan ditulis sebagai titik-titik isian, jangan dikarang.
Isi balasan mengikuti sikap yang diminta pengguna. Jika pengguna tidak menyatakan sikap, susun balasan netral yang mengonfirmasi penerimaan surat dan menyatakan akan menindaklanjuti.
Gunakan bahasa surat dinas yang sopan dan ringkas — hindari kalimat berbunga-bunga.`,
      en: `Read the attached incoming letter and draft a reply.
"Incoming Letter Summary" is at most four bullets: sender, letter number and date, what is being asked, and any deadline.
"Draft Reply" is a complete formal letter: place and date, reference/enclosure/subject lines, recipient address, salutation, two to three body paragraphs, closing, and a signature block.
Letter number, signatory name, and job title are dotted fill-in lines, never invented.
The reply takes the position the user asked for. With no stated position, write a neutral reply acknowledging receipt and undertaking to follow up.
Use courteous, economical official-letter English — no flowery sentences.`,
    },
  },

  {
    id: "image-prompt",
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
      note: {
        mode: "optional",
        label: { id: "Yang ingin diubah", en: "What to change" },
        placeholder: {
          id: "Contoh: sama tapi suasana malam hari.",
          en: "e.g. same but at night.",
        },
      },
    },
    length: { words: [0, 0], pages: 0 },
    outputs: ["copy"],
    sections: { id: [], en: [] },
    prompt: {
      id: `Bedah foto yang dilampirkan lalu tulis PROMPT untuk menghasilkan gambar serupa.
Keluarkan tiga blok, masing-masing di bawah heading:

## Prompt
Satu paragraf padat dalam BAHASA INGGRIS (karena model gambar bekerja paling baik dengan bahasa Inggris) yang mencakup: subjek, aksi, latar, waktu dan cuaca, pencahayaan, sudut dan jarak kamera, lensa, komposisi, palet warna, tekstur, suasana, dan gaya visual.

## Negative Prompt
Satu baris berisi hal-hal yang harus dihindari, dipisah koma.

## Pengaturan
Bullet singkat: rasio aspek, gaya, dan tingkat detail yang disarankan.

Jika pengguna menyebut hal yang ingin diubah, terapkan pada Prompt tapi pertahankan sisanya.
Jangan mendeskripsikan wajah orang tertentu, dan jangan menyebut nama merek atau nama fotografer.
Jangan menambahkan penjelasan apa pun di luar tiga blok itu.`,
      en: `Take the attached photo apart and write a PROMPT that would recreate it.
Emit three blocks, each under a heading:

## Prompt
One dense paragraph in English covering: subject, action, setting, time and weather, lighting, camera angle and distance, lens, composition, colour palette, texture, mood, and visual style.

## Negative Prompt
One comma-separated line of what to avoid.

## Settings
Short bullets: suggested aspect ratio, style, and detail level.

Where the user names something to change, apply it to the Prompt and keep everything else.
Do not describe an identifiable person's face, and do not name brands or photographers.
Add no commentary outside those three blocks.`,
    },
  },
];

export const VISUAL_HONESTY_CLAUSE = VISUAL_HONESTY;
