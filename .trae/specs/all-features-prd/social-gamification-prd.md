# Product Requirements Document (PRD): Social & Gamification Features

## 1. Overview
Modul Social & Gamification bertujuan untuk meningkatkan keterlibatan (engagement) pengguna melalui kompetisi persahabatan, fitur sosial, dan prediksi skor berbasis AI. Modul ini terdiri dari beberapa komponen utama:
- **Social Hub**: Pusat interaksi sosial yang memungkinkan pengguna melihat *Leaderboards*, menambahkan *Friends*, dan mengelola *Circles* (kelompok belajar).
- **Leaderboards Spesifik (Mason Leaderboard)**: Papan peringkat khusus untuk permainan/fitur "The Mason" di dalam *Writing Gym*.
- **Score Oracle**: Fitur prediksi skor tes (TOEFL PBT, IBT, ITP, IELTS) dan level CEFR yang menggunakan data historis latihan pengguna, disertai dengan rekomendasi AI.
- **Notification Center**: Pusat pemberitahuan untuk mengelola permintaan pertemanan dan undangan *Circle*.
- **Quiz Report View**: Tampilan laporan detail hasil kuis yang dapat dibagikan atau dilihat sebagai sertifikat mini.

## 2. User Flow
### 2.1. Social Hub Flow
1. **Navigasi**: Pengguna masuk ke `SocialHub` dari *Dashboard*.
2. **Leaderboards**: Pengguna dapat melihat peringkat keseluruhan, memfilter berdasarkan waktu (Minggu Ini, Bulan Ini, Semua Waktu), dan melihat detail perolehan XP (Quiz, Writing, Essay).
3. **Friends**: 
   - Pengguna menyalin *Friend Code* miliknya untuk dibagikan.
   - Pengguna memasukkan *Friend Code* pengguna lain untuk mengirim permintaan pertemanan.
   - Pengguna melihat daftar teman dan aktivitas terbaru mereka (*Friend Activity Feed*).
4. **Circles**:
   - Pengguna dapat membuat *Circle* baru atau bergabung dengan *Circle* yang sudah ada menggunakan kode 6 digit.
   - Pengguna melihat daftar *Circle* yang diikuti beserta progres *Weekly Goal* (XP).

### 2.2. Notification & Action Flow
1. Pengguna membuka `NotificationCenter` (ditandai dengan ikon lonceng/indikator belum dibaca).
2. Pengguna melihat daftar notifikasi (contoh: `friend_request` atau `circle_invite`).
3. Pengguna dapat menerima (*accept*) atau menolak (*reject*) permintaan. Jika diterima, sistem otomatis memperbarui status relasi (teman bertambah atau berhasil masuk *Circle*).
4. Pengguna dapat menandai semua notifikasi sebagai telah dibaca (*Mark all as read*).

### 2.3. Score Oracle Flow
1. Pengguna mengakses `ScoreOracleView`.
2. **Kondisi Terkunci**: Jika pengguna belum menyelesaikan syarat (misal: 50 percobaan kuis, 5 esai), sistem menampilkan kartu *Unlock Requirements* dengan *progress bar*.
3. **Kondisi Terbuka**: Sistem menampilkan:
   - *Confidence Badge* (Tingkat kepercayaan prediksi berdasarkan jumlah data).
   - Prediksi skor untuk TOEFL PBT, IBT, ITP, dan IELTS beserta tren (naik/turun/stabil).
   - Grafik tren (*Trend Chart*) dari riwayat prediksi.
   - Rekomendasi AI berdasarkan area kelemahan.
   - Level CEFR berdasarkan hasil tes simulasi CEFR.

### 2.4. Quiz Report Flow
1. Setelah menyelesaikan kuis, pengguna diarahkan ke `ReportView` (menggunakan `reportId`).
2. Pengguna melihat ringkasan skor (persentase) dalam bentuk sertifikat digital.
3. Pengguna menggulir ke bawah untuk melihat detail performa tiap pertanyaan (jawaban benar/salah, perbandingan jawaban pengguna vs jawaban benar, dan tipe *skill*).

## 3. UI Components
- **SocialHub**:
  - `Tabs`: Leaderboards, Friends, Circles.
  - `Rank Card`: Menampilkan posisi *ranking* pengguna dengan desain *floating card* dan ikon medali/mahkota.
  - `Friend Code Input`: *Field* untuk *input* kode teman lengkap dengan tombol "Add".
  - `Activity Feed`: Daftar aktivitas teman terbaru dengan format waktu relatif (*time ago*).
  - `Circle Modals`: Modal pop-up untuk *Create Circle* dan *Join Circle*.
- **MasonLeaderboard**:
  - `TimeFilter`: Tombol filter (All Time, Weekly, Monthly).
  - `LeaderboardList`: Daftar peringkat dengan animasi masuk (*framer-motion*), ikon avatar, perolehan bintang, dan XP.
- **ScoreOracleView**:
  - `ScoreCard`: Kartu yang menampilkan prediksi skor lengkap dengan *progress bar* dan rincian bagian tes (*breakdown*).
  - `TrendChart`: Grafik SVG *custom* untuk memvisualisasikan tren peningkatan/penurunan skor.
  - `RecommendationCard`: Kartu rekomendasi AI dengan penanda tingkat prioritas (High, Medium, Ready).
  - `UnlockCard`: Indikator progres syarat minimum untuk membuka prediksi (Kuis & Esai).
  - `CEFR Card`: Tampilan khusus skor CEFR dengan rincian *Reading, Listening, Writing, Speaking*.
- **NotificationCenter**:
  - `NotificationItem`: Komponen *list* yang membedakan tipe notifikasi (undangan, *request*) dan tombol *action* (*Accept/Reject*).
- **ReportView**:
  - `Certificate Card`: Elemen visual mirip sertifikat dengan skor persentase melingkar, nama *student*, dan topik kuis.
  - `Performance Detail List`: Daftar rincian pertanyaan yang ditandai warna (hijau untuk benar, merah untuk salah).

## 4. Tech Arch
- **Frontend Framework**: React (dengan TypeScript) dan Tailwind CSS untuk *styling* antarmuka.
- **State Management**: React `useState` dan `useEffect` dengan pendekatan *service-based architecture* (`circleService`, `socialService`, `oracleService`, `quizService`, dll).
- **Animasi & Visual**: `framer-motion` untuk transisi *leaderboard*, `lucide-react` untuk ikon.
- **Data Fetching**: *Fetch* asinkron melalui *service* internal yang berkomunikasi dengan *backend* (Supabase).
- **Notifikasi**: Sistem notifikasi menggunakan implementasi *custom hook* (`useNotifications`) untuk memisahkan logika pengambilan data dan status *read/unread*.
- **Score Prediction (Oracle)**: 
  - Mengambil data agregasi (*quizzes*, *essays*) melalui `oracleService.getAggregatedData`.
  - Menghitung prediksi secara dinamis `oracleService.recalculatePrediction`.

## 5. Edge Cases
1. **Data Kosong (Empty States)**:
   - *Leaderboard* kosong: Menampilkan pesan dorongan "Complete quizzes to appear here!".
   - Belum ada teman: Menampilkan instruksi untuk membagikan *Friend Code*.
   - Belum tergabung di *Circle*: Mendorong pengguna untuk "Join one or create your own".
   - *Notification Center* kosong: Menampilkan pesan "All caught up!".
2. **Validasi & Error Handling**:
   - Kode *Circle* yang salah atau kadaluarsa saat *Join*: Menampilkan pesan *error* langsung di modal (`modalError`).
   - Kode teman tidak valid: Menampilkan peringatan *error* spesifik.
   - Gagal mengambil laporan kuis (`reportId` tidak valid): Menampilkan *screen* peringatan "Report not found or access denied" dengan tombol "Go Home".
3. **Data Kurang untuk Prediksi Tren**:
   - *Trend Chart* pada *Score Oracle* membutuhkan minimal 2 titik data. Jika kurang, akan menampilkan pesan "Need at least 2 data points to show trend".
4. **Pencegahan Double-Action**:
   - Saat proses *Add Friend*, *Create/Join Circle* sedang berjalan, tombol dinonaktifkan (`disabled`) dan memunculkan animasi *loading* (*spinner*) untuk mencegah permintaan berulang.
5. **Guest Users / Unauthenticated**:
   - Tindakan sosial seperti membuat *Circle* diblokir dengan teks tombol yang berubah menjadi "Sign in to Create". Data disimpan sementara menggunakan ID *guest* jika memungkinkan (misal: pada `MasonLeaderboard`).