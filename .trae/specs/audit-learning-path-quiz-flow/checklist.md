# Checklist: Audit Learning Path Quiz Flow

- [x] File `.env` terkonfigurasi dengan benar (`GROQ_API_KEY` aktif).
- [x] Backend dan Frontend telah berjalan stabil secara lokal.
- [x] Browser agent berhasil terkoneksi ke Frontend (misal: `http://localhost:5173`).
- [x] QA Loop - Navigasi: Learning Path dan *Skill Tools* berhasil diakses.
- [x] QA Loop - Generasi Quiz: Groq AI menghasilkan soal secara real-time tanpa *error 500* atau *Timeout*.
- [x] QA Loop - Execution: Navigasi kuis, opsi jawaban (A,B,C,D), dan penjelasan berjalan mulus hingga akhir sesi kuis.
- [x] QA Loop - Scoring: Skor (*Review* atau *Result*) ditampilkan secara benar berdasarkan jumlah jawaban tepat.
- [x] QA Loop - Estimation: *Estimated TOEFL Score* atau *Progress Bar* pada profil/Dashboard mengalami perubahan berdasarkan skor kuis terbaru.
- [x] QA Loop - Question Bank: Soal yang baru saja digenerasi dan dijawab tersedia di *Question Bank* atau *Error Jail* dengan kategori *skill* yang tepat.
- [x] DB Integrity: Tabel-tabel terkait kuis (`quizzes`, `questions`, `user_scores` atau padanannya) diverifikasi tersimpan dengan aman pada `data.db`.
- [x] Laporan akhir audit mendalam (*deep audit report*) selesai dibuat.