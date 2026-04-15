# Laporan Evaluasi UX dan Best Practice Berbasis Persona

## Konteks Persona
**User Persona:** Seorang siswa yang sedang intensif mempersiapkan diri untuk tes TOEFL. Ia membutuhkan aplikasi yang cepat, stabil, tanpa *error*, serta memberikan latihan (*practice*) dan *feedback* yang berkualitas tinggi. Fokusnya adalah pada simulasi soal, pemahaman jawaban (*explanation*), serta meningkatkan kemampuan *writing* untuk mencapai *Band Score* yang tinggi.

## Hasil Observasi dan Penilaian

### 1. Dashboard & Onboarding (Auth)
- **Kesan Persona:** Tampilan pertama sangat menyambut dengan baik (*welcoming*). Menu profil, mode gelap (*Dark Mode*), prediksi skor Oracle, dan fitur pencapaian (*Achievements*) mudah diakses.
- **Evaluasi UX:** Proses autentikasi sangat transparan (guest login atau Google Sign-in). Indikator *loading* saat pertama kali membuka halaman sudah cukup mulus. Navigasi utama berada di posisi yang intuitif di bagian bawah (*bottom navigation bar* pada *mobile view* atau sidebar pada *desktop*), sesuai dengan pola *best practice* aplikasi modern.

### 2. Modul Practice & Quiz (AI Generation)
- **Kesan Persona:** Siswa dapat langsung memulai sesi dengan satu tombol (*Start Session*). Soal-soal yang muncul terasa seperti soal TOEFL asli berkat *prompting* dari model AI.
- **Evaluasi UX:** 
  - **Generasi AI:** Dengan telah disediakannya `GROQ_API_KEY`, API backend berhasil menghubungi Groq. Isu "Generation Failed" yang sebelumnya terjadi telah terselesaikan sepenuhnya. AI mampu membuat soal pilihan ganda dengan cepat (meskipun ada beberapa metrik *Largest Contentful Paint* (LCP) dari vite dev server yang agak lambat di awal, di *production* hal ini dapat diminimalisasi).
  - **Menjawab Soal:** Fitur menjawab sangat responsif. Saat jawaban dipilih, tombol *View Explanation* akan muncul. Hal ini sangat diapresiasi oleh persona siswa karena *feedback* (jawaban benar/salah beserta penjelasan detail) dapat langsung dibaca, tanpa harus menunggu seluruh kuis selesai. Ini memfasilitasi proses belajar *micro-learning*.

### 3. Writing Gym & Essay Dojo
- **Kesan Persona:** Siswa ingin membangun kebiasaan menulis. Saat masuk ke *The Mason*, interaksinya sangat menarik—Siswa dapat menarik, menggeser (*shuffle*), dan mengunci (*freeze*) blok kata untuk menyusun kalimat (*Construct The Sentence*).
- **Evaluasi UX:** 
  - Penggunaan *drag-and-drop* dan opsi *hint* (bantuan AI) sangat mengedepankan elemen *gamification*, yang meningkatkan retensi belajar. 
  - Akses ke Essay Dojo (IELTS Writing Sim) memberikan gambaran *paywall* (*Upgrade ke Premium*) yang diletakkan secara tidak mengganggu (*non-intrusive*), sehingga ekspektasi siswa mengenai fitur gratis dan berbayar (*freemium model*) dapat terkelola dengan baik.

## Kesimpulan Best Practice
Aplikasi **TOEFL Quiz** ini sudah memenuhi standar *best practice* UX untuk aplikasi *edtech* (Pendidikan). 
- **Stabilitas & Kecepatan:** Penanganan *error* dari *backend* AI yang terputus-putus (*Retry logic*) berhasil menyelamatkan UI dari *crash*. 
- **Kejelasan (*Clarity*):** Komponen disajikan dengan peran *Accessibility* (A11y) yang baik, seperti terlihat pada struktur DOM dengan *heading* yang jelas (H1 hingga H4) serta peran tombol (`button`) yang sesuai.
- **Feedback Loop:** Siswa mendapatkan umpan balik langsung dari *AI Tutor* setiap kali selesai mengerjakan *task*, yang merupakan prinsip inti dari *active learning*.