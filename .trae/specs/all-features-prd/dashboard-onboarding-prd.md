# Product Requirements Document (PRD)
## Fitur Dashboard, Learning Path, Profil, Pengaturan & Onboarding (Autentikasi)

---

## 1. Overview
Dokumen ini mendeskripsikan kebutuhan produk untuk modul utama pada aplikasi pembelajaran bahasa berbasis AI, yang mencakup halaman utama (Dashboard), jalur belajar (Learning Path), profil pengguna, pengaturan (Settings), serta alur onboarding (Autentikasi). 

Tujuan utama dari fitur-fitur ini adalah untuk memberikan pengalaman belajar yang terpersonalisasi, terstruktur, serta memotivasi pengguna melalui gamifikasi (XP, Badge, Streak) dan prediksi kemampuan aktual (Oracle Score).

---

## 2. User Flow

### 2.1 Alur Autentikasi (Onboarding)
1. **Pendaftaran / Masuk**: Pengguna mendaftar/masuk dengan *Username & Password* atau menggunakan *Google OAuth*.
2. **Guest Mode**: Pengguna juga dapat masuk sebagai "Guest" (pelacakan kemajuan lokal).
3. **Validasi**: Input pengguna divalidasi (minimal panjang karakter, format).
4. **Token Management**: Sistem menyimpan `access_token` dan `refresh_token` di penyimpanan aman (Secure Storage). Saat sesi hampir habis, token di-*refresh* secara otomatis.
5. **Redirect**: Setelah berhasil autentikasi, pengguna diarahkan ke Dashboard.

### 2.2 Alur Dashboard
1. **Akses Dashboard**: Pengguna melihat sapaan dinamis berdasarkan waktu dan nama.
2. **Rekomendasi (Today's Focus)**: Sistem menampilkan materi (Skill) yang direkomendasikan secara spesifik oleh *AI TodaysFocusService*.
3. **Resume Session**: Jika pengguna memiliki sesi kuis yang tertunda, tombol "Resume Quiz" akan muncul.
4. **Quick Actions**: Pengguna dapat mengakses fitur cepat seperti *PDF to Quiz* atau *Error Jail* (memperbaiki kesalahan sebelumnya).
5. **Skill Tools**: Pengguna dapat mengakses alat spesifik seperti *Writing Gym* (Grammar) dan *Essay Dojo* (Grading AI berwaktu).

### 2.3 Alur Learning Path
1. **Progress Summary**: Pengguna melihat progres XP saat ini menuju level berikutnya.
2. **Rekomendasi Belajar**: Menampilkan satu topik prioritas yang dihitung berdasarkan area lemah pengguna.
3. **Pemilihan Skill**: Pengguna menelusuri modul (Structure, Listening, dsb.) dan memilih skill untuk dipelajari.

### 2.4 Alur Profil & Pengaturan
1. **Profil Pengguna**: Pengguna melihat avatar, kode teman (Friend Code), dan bio yang dapat diedit (Inline Editing).
2. **Gamifikasi & Statistik**: Pengguna melihat level, XP yang dibutuhkan ke level selanjutnya, streak hari berturut-turut, total kuis yang diselesaikan, serta lencana (Achievements).
3. **Score Oracle Prediction**: Pengguna melihat estimasi skor tes (TOEFL PBT, TOEFL iBT, IELTS) yang dihitung dari agregasi data histori.
4. **Pengaturan Preferensi**: Pengguna mengakses menu *Settings* untuk mengatur *Sound Effects*, *Notifications*, dan *Dark Mode* (Coming Soon).
5. **Sistem Langganan (Subscription)**: Pengguna memantau batas penggunaan Token AI harian. Jika pengguna pada *Tier Free*, mereka dapat mengetuk tombol untuk meng-upgrade plan (Paywall).

---

## 3. UI Components

### 3.1 Dashboard Components
- **Pill Header**: Berisi logo aplikasi, akses *Notifications*, *Leaderboard* (jika streak > 0), dan navigasi *Profile*.
- **Hero Card (Today's Focus)**: Komponen dinamis dengan gradient warna sesuai jenis *Section* (Structure: Biru, Listening: Hijau, Reading: Ungu, Speaking: Merah). Menampilkan persentase akurasi masa lalu, deskripsi, dan tombol *Start Session*.
- **Quick Actions Cards**: Kartu grid dengan ikon ilustratif (PDF Upload, Lock untuk Error Jail yang berkedip jika ada kesalahan belum diperbaiki).
- **Skill Tools Cards**: Tombol akses cepat ke modul gym penulisan.

### 3.2 Learning Path Components
- **Progress Summary Card**: Kartu profil kecil yang menampilkan inisial/avatar, Badge Level, dan *Progress Bar* (indikator XP ke Level selanjutnya).
- **Recommended Skill Banner**: Banner prioritas tinggi (berdesain gradasi biru) untuk menyarankan *skill* yang memerlukan atensi langsung.
- **Skill Selector**: Daftar kurikulum keterampilan per *Section* yang dapat di-scroll.

### 3.3 Profile Components
- **Avatar Uploader**: Komponen pengunggah gambar yang langsung disinkronkan ke Supabase.
- **Inline Bio Editor**: Area teks yang bisa diklik untuk mengubah bio tanpa berpindah halaman.
- **Score Oracle Card**: Komponen *Dashboard Widget* yang menampilkan tiga estimasi skor (PBT, iBT, IELTS). Terhubung dengan halaman *Score Oracle* terperinci.
- **Metrics Grid**: Grid 4 kolom menampilkan Total XP, Day Streak, Quizzes, dan Correct Answers.
- **Achievement List**: Daftar lencana (badge) yang terkunci dan terbuka, berbasis pada histori interaksi pengguna.

### 3.4 Settings Components
- **Preferences Toggles**: *Switch/Toggle* untuk Suara, Notifikasi, dan Mode Gelap.
- **My Plan Status**: Menampilkan tingkatan akun pengguna (contoh: FREE, PRO).
- **AI Token Usage Bar**: Indikator persentase pemakaian token AI (Hijau: Aman, Kuning: 50%+, Merah: 80%+).
- **AI Voice Engine**: Komponen status yang menunjukkan bahwa modul *TTS (Text-to-Speech)* berjalan *offline/on-device*.

---

## 4. Tech Architecture

### 4.1 Modul Autentikasi
- **Layanan API (`authService`)**: Menangani `login`, `register`, `getProfile`, `updateProfile`, `refreshToken`, dan `handleOAuthCallback`.
- **Penyimpanan (Storage)**: Menggunakan `secureStorage` untuk `access_token` dan `refresh_token`.
- **Interseptor API**: Request API dibungkus oleh `withRetry` (mekanisme coba ulang) dan penanganan interupsi (*timeout*).
- **State Management**: Terpusat pada `useAuthStore` (Zustand) untuk melacak status pengguna dan *unreadCount* (Notifikasi).

### 4.2 Sistem Data & Manajemen State
- **Zustand Stores**:
  - `useNavigationStore`: Mengatur state *Current View* untuk meniru perilaku *Single Page App* layaknya aplikasi seluler natif, serta navigasi balik (Capacitor back-button).
  - `useQuizStore`: Menjaga antrean soal (*Queue*), jawaban pengguna, skor, dan status kuis (*generating, idle, finished*).
- **Layanan Rekomendasi**:
  - `TodaysFocusService`: Menganalisis riwayat untuk menentukan *Today's Focus* di Dashboard.
  - `learningPathService`: Menyarankan jalur pembelajaran per modul kelemahannya.
  - `oracleService`: Mengagregasi data kuis untuk menghitung proyeksi skor CEFR/TOEFL/IELTS secara berkala.

---

## 5. Edge Cases (Kasus Ekstrem)

1. **Jaringan Terputus (Offline Mode)**
   - Jika pengguna kehilangan koneksi, `OfflineIndicator` akan muncul ("You are offline. Progress will be saved locally...").
   - Riwayat penyelesaian kuis disimpan di penyimpanan lokal, menunggu untuk disinkronkan kembali dengan server setelah koneksi membaik.
2. **Limit Token AI Habis**
   - Apabila aplikasi mengembalikan `TokenLimitError` saat mencoba menghasilkan kuis, notifikasi *toast* akan muncul memperingatkan batas harian telah tercapai, atau menampilkan `PaywallSheet`.
3. **Session Expiry (Kedaluwarsa)**
   - Jika *access_token* kedaluwarsa saat pengguna beraktivitas, sistem mencoba melakukan `refreshToken`. Jika gagal, pengguna secara otomatis di-logout (*redirect* ke halaman *Sign In*).
4. **Data Profil Tidak Lengkap / Kosong**
   - Avatar kosong akan jatuh (*fallback*) ke inisial huruf pertama nama, atau *icon* User.
   - Bio yang kosong menampilkan tulisan "No bio yet. Tap to add one." yang dapat langsung di-tap untuk mengetik bio baru.
5. **Kegagalan Generasi AI pada Kuis**
   - Jika *Generate Quiz Unified* mengembalikan susunan soal yang kosong (0), status direset ke 'idle', pengguna dikembalikan ke *Dashboard*, dan pesan error ("Failed to generate questions") ditampilkan agar UI tidak macet.
6. **Kesalahan Pembaruan Profil**
   - Saat unggah *Avatar* di Profil gagal atau koneksi Supabase terganggu, status unggah direset agar spinner tidak berputar selamanya, dan file sebelumnya dipertahankan.
