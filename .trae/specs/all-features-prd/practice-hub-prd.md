# Practice Hub & Related Features - Product Requirements Document (PRD)

## 1. Overview
Practice Hub adalah pusat kendali bagi pengguna untuk melatih dan meningkatkan kemampuan bahasa Inggris mereka. Modul ini mencakup berbagai jenis latihan mulai dari simulasi penuh TOEFL, tes komprehensif CEFR, manajemen bank soal, ulasan kesalahan (Error Jail), hingga pembuatan kuis otomatis dari dokumen PDF. Tujuannya adalah memberikan pengalaman belajar yang terpersonalisasi, adaptif, dan berbasis data.

## 2. User Flow
- **Practice Hub Dashboard**: Pengguna masuk ke Practice Hub dari Dashboard utama. Di sini, mereka dapat memilih menu `Core Training` (Learning Path, Full Simulation, CEFR Full Test) atau `Skill Gym` (Writing Gym, Essay Dojo).
- **Full Simulation (TOEFL)**: Pengguna mengonfigurasi jumlah pertanyaan per bagian (Reading, Listening, Structure, Written Expression). Jika bukan pengguna berbayar, Paywall akan muncul. Saat dimulai, pengguna akan melalui fase *loading*, *section_active* (mengerjakan soal dengan timer), *section_break* (istirahat 2 menit), dan melihat *results* (skor dan akurasi).
- **CEFR Full Test**: Pengguna memilih mode tes (Gratis: Reading & Writing, Berbayar: 4 Kemampuan). Alur berjalan secara berurutan: Reading -> Listening -> Writing -> Speaking. Tes diakhiri dengan proses *grading* otomatis berbasis AI (Groq) untuk menghasilkan skor CEFR.
- **Question Bank**: Pengguna melihat semua soal, mencari berdasarkan Skill ID, memfilter berdasarkan *section*. Pengguna dapat menambah, mengedit, menghapus, atau memilih beberapa soal untuk langsung dijadikan kuis (*Start Quiz*).
- **Error Jail**: Pengguna melihat daftar soal yang pernah dijawab salah (Detained Items). Pengguna dapat memfilter berdasarkan kategori, menghapus daftar (Clear all), atau menekan "Start Review" untuk mengulang soal-soal tersebut.
- **PDF Upload (Quiz Generator)**: Pengguna mengunggah PDF (maks. 20MB) -> Mengatur rentang halaman (*setup*) -> Teks diekstraksi (*processing*) -> Pengguna memilih mode pembuatan soal (Digitize, Auto, Manual) -> Kuis siap disimpan ke Bank Soal atau langsung dimainkan.

## 3. UI Components
- **PracticeHub**: Fixed Header, Hero Section dengan gradien, `PracticeCard` untuk setiap item (dengan indikator tema warna dan *badge*), Consistency Tip Card.
- **SimulationView**: 
  - *Config State*: Slider untuk mengatur jumlah soal, indikator ketersediaan di *database* vs AI (*hybrid*).
  - *Active State*: Header timer, Progress Bar, Tampilan Stimulus (Passage), Daftar Pilihan Ganda, Navigasi Prev/Next.
  - *Break State*: Ringkasan skor bagian sebelumnya, Timer istirahat, tombol *Skip Break*.
  - *Result State*: Trophy Icon, persentase akurasi keseluruhan, rincian per bagian.
- **CefrSimulationView**: Modal pemilihan mode tes, *Section Header* dengan timer, *Audio Player* untuk listening/speaking, *Textarea* untuk writing, Tombol rekam suara (*Speech Recognition*) untuk speaking, *CefrResultsView*.
- **BankView**: Tabs (View All vs Search), Search Input, Filter Buttons, Daftar Soal dengan Tags (Skill, Section, Interaction), Checkbox untuk Multi-select, Floating Action Panel untuk "Start Quiz", *QuestionEditor* Modal.
- **ErrorJailView**: Hero Card dengan jumlah soal ditahan, Filter Chips, Tombol "Start Review" dan "Clear", Empty State (Clean Record) dengan indikator *Streak*.
- **PdfUploadView**: Stepper Indicator (Upload, Select, Generate), Dropzone Input, Page Range Selector (From/To) dengan Preview Teks, Fake Terminal Console untuk *Processing Logs*, Konfigurasi Mode (Digitize, Auto, Manual), Success Screen dengan opsi Save/Play.

## 4. Tech Arch
- **State Management**: React `useState` & `useEffect` digunakan secara intensif untuk melacak fase tes. Penggunaan custom hooks seperti `useFullSimulation`, `useSimulationTimer`, `useCefrTest`, `useSpeechRecognition`.
- **Database & Services**: 
  - `questionBankService`: Untuk mengambil (`getAllQuestions`, `getUnifiedQuestionsBySkill`), membuat, mengupdate, dan menghapus soal.
  - `errorJailService`: Menyimpan dan mengambil soal salah (`getIncorrectQuestions`, `getJailStats`, `clearJail`).
  - `pdfService`: Memproses ekstraksi teks PDF (`loadPdfDocument`, `extractTextFromRange`).
- **AI Integration**: 
  - Penggunaan `callGroq` untuk *grading* otomatis pada CEFR (menilai Writing dan Speaking).
  - Ekstraktor PDF dan generator kuis (`smartExtractTOEFL`, `generateMultiSectionFromContext`, dll.) untuk menghasilkan soal berdasarkan konteks teks PDF menggunakan AI Agent.
- **Access Control**: Pemeriksaan `isPaid` melalui `useSubscription` dan `isGuest` melalui `useGuestPolicy`. Integrasi komponen `PaywallSheet` untuk fitur premium (Full Simulation, CEFR 4-Skill).
- **Rate Limiting & Retries**: Fitur PDF Upload memiliki mekanisme *Rate Limiter* sederhana untuk menghindari limit TPM dari API AI, serta *Exponential Backoff* untuk mengulang *request* yang gagal (HTTP 429).

## 5. Edge Cases
- **Timer Habis (Timeout)**: Jika timer pada Simulation atau CEFR habis, sistem akan secara otomatis mensubmit jawaban yang sudah ada (`handleSubmitSection` atau `handleTimeUp`) dan melanjutkan ke tahap berikutnya.
- **Koneksi Terputus / Gagal Parsing AI**: Pada CEFR Grading atau PDF Generation, jika AI gagal memberikan respons valid setelah beberapa kali *retry*, sistem akan memberikan *fallback* (misal: pesan error yang jelas, atau menggunakan soal *fallback* untuk kuis otomatis) dan tetap menyimpan hasil sebagian agar kerja keras pengguna tidak hilang.
- **Browser Tidak Mendukung Speech Recognition**: Pada CEFR Speaking, jika API *Speech Recognition* tidak didukung (misalnya di luar Chrome), sistem akan menampilkan pesan peringatan (`AlertTriangle`) dan menyediakan *fallback* berupa *textarea* agar pengguna dapat mengetik responsnya.
- **Ukuran File PDF Berlebih / Error Parsing**: Jika pengguna mengunggah PDF > 20MB atau PDF korup/terenkripsi, sistem akan menangkap error tersebut dan menampilkan toast error alih-alih merusak aplikasi.
- **Kurangnya Soal di Bank**: Pada Full Simulation, sistem akan membandingkan permintaan soal dengan stok *database*. Jika kurang, sistem akan menandai soal yang harus di-generate oleh AI secara *real-time* (Hybrid mode). Pada mode kuis manual (PDF), jika gagal mengekstrak 4 pilihan valid, soal akan di-drop/dibersihkan (`cleanQuestions`).
- **State Tidak Valid (Stale Phase)**: CEFR view memiliki mekanisme "Stale Phase Guard" di mana jika pengguna memuat ulang pada fase *loading* atau kehilangan data *state* esensial, sistem akan mereset tes ke awal (fase *intro*) untuk mencegah crash.
