# Product Requirements Document (PRD): Essay Dojo

## 1. Overview
**Essay Dojo** adalah pusat pelatihan menulis komprehensif (Writing Gym) yang dirancang untuk membantu pengguna menguasai berbagai format tes kecakapan bahasa Inggris (seperti IELTS dan TOEFL) serta mengasah keterampilan argumentasi tingkat lanjut. Fitur ini menyediakan lingkungan simulasi ujian dengan batasan waktu yang ketat, evaluasi instan berbasis kecerdasan buatan (AI), pustaka esai model berkualitas tinggi (Band 9), serta interaksi langsung dengan AI Tutor untuk memberikan umpan balik mendalam dan terpersonalisasi.

## 2. User Flow

### 2.1 Essay Dojo Hub (Menu Utama)
1. Pengguna membuka halaman utama (Essay Dojo Hub).
2. Pengguna melihat ringkasan target skor, level CEFR, dan fitur AI Tutor.
3. Pengguna memilih salah satu mode latihan yang tersedia: *IELTS Writing Sim*, *Band 9 Library*, *Peer Review*, *Integrated Writing*, *Academic Discussion*, atau *The Inquisitor* (Devil's Advocate).
4. Jika pengguna bukan pengguna Premium (berbayar), akses ke beberapa simulasi dibatasi dan memicu tampilan *Paywall*.

### 2.2 IELTS Writing Sim
1. Pengguna memilih tipe tugas (Task 1 atau Task 2).
2. Jika ada sesi yang belum selesai (draf tersimpan), sistem memunculkan modal pemulihan (*Recovery Modal*) untuk melanjutkan atau memulai ulang.
3. Pengguna membaca soal dan menulis esai dengan batasan waktu (timer berjalan). Sistem memantau jika pengguna berpindah tab (mencatat *infractions*).
4. Pengguna mengirim (submit) esai. Jika jumlah kata kurang dari batas minimum, peringatan konfirmasi muncul.
5. AI mengevaluasi esai dan memberikan *Band Score* beserta analisis detail (Task Development, Organization, Language Use).
6. Pengguna dapat berinteraksi (chat) dengan AI Examiner untuk membahas kesalahan dan cara perbaikan.
7. Pengguna memiliki opsi untuk membagikan esainya ke fitur *Peer Review*.

### 2.3 TOEFL Integrated Writing
1. Pengguna memulai tugas terintegrasi dan melewati tiga fase utama:
   - **Membaca (Reading)**: Membaca teks akademik selama 3 menit.
   - **Mendengarkan (Listening)**: Mendengarkan audio kuliah selama ~2 menit (audio di-generate secara *real-time*). Pengguna dapat mencatat (*notes*).
   - **Menulis (Writing)**: Menulis ringkasan dan sintesis selama 20 menit (150-225 kata).
2. Setelah *submit*, pengguna menerima evaluasi AI yang mencakup skor (1-5), kelebihan, dan saran perbaikan kalimat.
3. Mendapatkan pencapaian (*achievements*) jika skor tinggi atau waktu efisien.

### 2.4 TOEFL Academic Discussion
1. Pengguna disajikan dengan sebuah pertanyaan diskusi dari profesor beserta opini dari dua mahasiswa virtual.
2. Pengguna menulis kontribusi opini mereka sendiri pada kolom yang tersedia.
3. AI memberikan evaluasi instan terhadap argumen yang diberikan.

### 2.5 Band 9 Library (Model Essay Library)
1. Pengguna menelusuri daftar topik esai atau memilih "Surprise Me" untuk topik acak.
2. AI menghasilkan model esai (Band 9) berdasarkan topik yang dipilih.
3. Pengguna membaca esai di mana bagian-bagian penting (kosakata tingkat lanjut, struktur kalimat) disorot (*highlighted*).
4. Saat pengguna mengklik bagian yang disorot, panel samping menampilkan anotasi dan penjelasan mendetail mengapa frasa tersebut mendapat nilai tinggi.

### 2.6 The Inquisitor (Devil's Advocate Level)
1. **Input**: Pengguna memasukkan argumen opini kuat mereka (min. 20 karakter).
2. **Challenge**: AI (The Inquisitor) menganalisis argumen, mendeteksi klaim, menemukan celah logika (*logical fallacies*), dan memberikan sanggahan balasan (*counter-point*).
3. **Defense**: Pengguna menulis pembelaan (*rebuttal*) dengan bantuan frasa konsesi (*starters*) yang disarankan.
4. **Result**: AI menilai pembelaan pengguna (skor 0-100), memberikan umpan balik kelogisan, dan menyajikan versi perbaikan level C2 dari argumen pengguna.

---

## 3. UI Components

* **EssayDojoHub**: Header tetap dengan navigasi kembali, kartu hero yang menarik, grid kartu untuk mode latihan (IELTS Sim, Band 9 Library, dll.), carousel *Key Features*, dan integrasi *PaywallSheet*.
* **IELTSWritingSim**: Editor teks utama, timer hitung mundur (berubah warna jika waktu hampir habis), peringatan *toast/alert* untuk pelanggaran fokus, tab antarmuka (Soal & Editor), modal konfirmasi (*Recovery* dan *Word Count*), serta antarmuka hasil evaluasi yang menyertakan grafik batang skor dan *chat interface*.
* **IntegratedWritingTask**: Indikator fase di header (1, 2, 3), komponen pemutar audio dengan animasi gelombang (*waveform*) progres, area *textarea* catatan pengguna, antarmuka evaluasi (kartu skor besar, daftar poin kekuatan, dan perbaikan visual "sebelum vs sesudah").
* **AcademicDiscussionTask**: Kartu prompt profesor (ikon toga), kartu dialog untuk mahasiswa virtual, textarea respons pengguna, dan *FeedbackCard*.
* **ModelEssayLibrary**: Sidebar pencarian topik, area teks esai utama dengan elemen `span` interaktif untuk *highlight*, panel anotasi di sebelah kanan yang beranimasi (*Framer Motion*) saat diklik.
* **DevilsAdvocateLevel**: Indikator langkah progres (1-3), form input teks dengan penghitung karakter, tab navigasi (AI Counter-Argument vs User Defense), tombol *starters* untuk menyisipkan frasa, serta kartu hasil evaluasi (ikon centang hijau/peringatan merah dan skor).

---

## 4. Tech Arch

* **Frontend Framework**: React.js dengan TypeScript.
* **Styling & Animasi**: Menggunakan Tailwind CSS untuk tata letak responsif dan dukungan mode gelap (*dark mode*), serta Framer Motion untuk transisi antarmuka yang mulus. Ikon menggunakan perpustakaan *Lucide React*.
* **State Management & Persistence**: 
  - Menggunakan React Hooks (`useState`, `useEffect`, `useRef`).
  - Penyimpanan draf dan timer lokal menggunakan `LocalStorage` dan *custom hooks* (`useLocalStorage`, `sessionPersistenceService`) dengan mekanisme *debounce* (mis. 500ms atau 3 detik) untuk *auto-save*.
* **Services Integration**:
  - `writingGymService`: Menangani permintaan AI untuk *generate* soal IELTS, evaluasi esai, *chat examiner*, dan model esai.
  - `integratedWritingService`: Mengatur alur tugas TOEFL, *generate* bacaan/kuliah, serta penilaian pencapaian (*achievements*).
  - `devilsAdvocateService`: AI khusus untuk analisis argumen, deteksi kesesatan berpikir (*fallacy*), dan penilaian logika.
  - `ttsService` & `sherpaNativeService`: Sistem *Text-to-Speech* (*Kitten TTS* / Piper) untuk men-generate dan *streaming* audio kuliah secara langsung di perangkat klien (Web/Native).
  - `peerReviewService`: Integrasi untuk mengirim esai pengguna ke sistem ulasan komunitas.
  - `essayMetricsService` & `oracleService`: Melacak metrik performa (waktu, skor, pelanggaran) dan memperbarui prediksi skor secara *background*.
* **Keamanan & Validasi**:
  - `DOMPurify` digunakan untuk membersihkan (*sanitize*) konten HTML dari editor teks sebelum dikirim ke AI guna mencegah serangan XSS.
  - `useOfflineDetection` untuk mendeteksi status jaringan internet.

---

## 5. Edge Cases

1. **Koneksi Internet Terputus (Offline)**: 
   - Deteksi *offline* memunculkan `OfflineBanner`. Draf esai dan status timer akan terus disimpan di penyimpanan lokal (*LocalStorage*/DB lokal) dan dapat dilanjutkan saat *online* kembali.
2. **Aplikasi Tertutup Secara Tak Terduga / Refresh**: 
   - Data sesi (waktu tersisa, draf tulisan, fase saat ini) dimuat ulang saat komponen di-*mount*. Pengguna akan disambut dengan *Recovery Modal/Prompt* untuk melanjutkan atau membuang (*discard*) sesi sebelumnya.
3. **Kecurangan (Tab Switching / Distraksi)**: 
   - Memanfaatkan event `visibilitychange` di browser. Jika pengguna berpindah tab selama ujian (IELTS Sim), sistem mencatat pelanggaran (*infractions*) dan menampilkan peringatan langsung (*alert*).
4. **Validasi Jumlah Kata Tidak Terpenuhi**: 
   - Jika pengguna mencoba *submit* dengan kata kurang dari batas (mis. < 150 kata untuk Task 1), sistem tidak langsung menolak, tetapi memunculkan modal peringatan konfirmasi (*Word Count Confirm*), memberikan pilihan untuk membatalkan atau tetap melanjutkan evaluasi dengan risiko penalti skor.
5. **Kegagalan Generasi Audio (TTS Error)**: 
   - Pada simulasi *Listening*, jika mesin TTS gagal memuat atau memproses teks menjadi audio, sistem beralih (*fallback*) secara elegan dengan menampilkan pesan *error* audio dan mengizinkan pengguna untuk tetap melanjutkan tugas berdasarkan transkrip atau catatan.
6. **Limitasi API / Timeout Evaluasi AI**: 
   - Jika layanan evaluasi (*backend* AI) mengalami *timeout* atau terkena *rate limit*, komponen akan menangkap *error* (`catch`) dan menampilkan pemberitahuan ramah (*toast.error*) agar pengguna mencoba kembali tanpa kehilangan draf yang sudah diketik.
7. **Argumen "The Inquisitor" Terlalu Pendek atau Gibberish**: 
   - Jika pengguna memasukkan teks asal-asalan (< 3 kata atau < 20 karakter) di Devil's Advocate, validasi antarmuka akan memblokir proses analisis dan meminta masukan argumen yang lebih masuk akal.