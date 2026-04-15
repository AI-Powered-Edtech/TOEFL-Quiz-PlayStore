# Tasks: Audit Learning Path Quiz Flow

- [x] **Task 1: Setup Lingkungan & Database Audit**
  - Pastikan backend (`toefl-quiz-backend`) dan frontend (`npm run dev`) berjalan stabil dengan konfigurasi rahasia `GROQ_API_KEY`.
  - Cek ketersediaan database `data.db` dan pastikan skema untuk kuis dan skor telah termigrasi dengan benar.

- [x] **Task 2: QA Loop - Navigasi Learning Path**
  - Buka `http://localhost:5173/` menggunakan browser agent.
  - Masuk ke menu "Practice" atau *Learning Path* (juga dikenal sebagai "Skill Tools" atau "Blog" yang menampung *skills*).
  - Pilih satu *skill* yang mewakili kategori *Structure* atau *Written*.

- [x] **Task 3: Simulasi Quiz Generation & Eksekusi**
  - Jalankan proses `Start Session` pada *skill* terpilih.
  - Periksa *console logs* untuk memastikan AI (Groq) merespons dengan struktur soal yang tepat tanpa *error*.
  - Selesaikan *quiz* dengan menjawab semua soal (pilihan ganda) secara bervariasi (benar & salah) untuk memvalidasi *feedback* dan *logic* penilaian.
  - Selesaikan kuis sampai akhir hingga halaman skor/hasil (*Review*/*Summary*) ditampilkan.

- [x] **Task 4: Audit Kalkulasi Skor & Estimated TOEFL Score**
  - Buka menu *Profile* atau *Score Oracle* dan verifikasi apakah *Estimated TOEFL Score* atau riwayat kuis telah ter-update (secara visual di UI).
  - Pastikan kalkulasi skor sesuai (jumlah soal benar / total soal).

- [x] **Task 5: Audit Question Bank / Error Jail**
  - Navigasi ke menu "Question Bank" atau "Error Jail".
  - Cari dan pastikan soal yang baru saja digenerasi oleh AI muncul di daftar tersebut.
  - Pastikan soal terkategori dengan benar (contoh: *Structure*, *Written*, *Listening*, atau *Reading*).

- [x] **Task 6: Audit Integritas Database**
  - Jalankan kueri SQL menggunakan `sqlite3` pada file `data.db` di backend untuk melihat baris *user score*, riwayat *quiz*, dan *generated questions*.
  - Validasi bahwa *logic* penyimpanan data di sisi *backend* berfungsi sempurna dan data tidak hilang.

- [x] **Task 7: Laporan Audit Keseluruhan**
  - Susun *Summary Audit Report* berdasarkan temuan *browser agent* dan integritas database untuk mengonfirmasi bahwa alur ini berjalan dengan *best practice*.