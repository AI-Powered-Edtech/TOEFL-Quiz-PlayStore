# Checklist: End-to-End Testing Semua Flow

- [ ] Lingkungan tes (Backend + Frontend) berhasil dijalankan bersamaan tanpa crash.
- [ ] Flow Authentication (Register, Login, Update Profile) berhasil diproses dari UI ke Database.
- [ ] Flow Quiz (Memulai Simulasi, Submit Jawaban, Result History, Bank Soal) berhasil tanpa error.
- [ ] Flow Writing & AI (Generate konten, Evaluasi Essay, TTS, Peer Review) terhubung dengan Groq API secara sukses.
- [ ] Flow Social (Membuat Circles, Mengirim Pesan, Friends, Leaderboard, Predictions) dapat digunakan penuh di Frontend.
- [ ] Flow Creator (Dashboard statistik Daily Bites, Earnings, Register Creator) menampilkan data metrik dengan benar.
- [ ] Flow Blog (List Posts, Detail Post, CRUD dari Admin/Creator) berhasil me-render dan mengubah data dari backend.
- [ ] Flow Admin (Dashboard Monitoring System Health, Audit, Feature Flags, Moderation Reports) berfungsi penuh.
- [ ] Seluruh endpoint utama yang diakses frontend tidak mengembalikan 4xx/5xx yang tidak terduga, dan *wiring* (kontrak data request/response) frontend-backend terbukti matang.