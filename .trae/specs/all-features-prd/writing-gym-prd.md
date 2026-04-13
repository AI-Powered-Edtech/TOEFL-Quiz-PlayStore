# Product Requirements Document (PRD) - Writing Gym

## 1. Overview
Writing Gym adalah fitur pelatihan interaktif yang berfokus pada pengembangan kemampuan menulis bahasa Inggris (khususnya untuk persiapan IELTS dan tulisan akademik). Terdiri dari sebuah hub utama (Writing Gym Hub) dan 4 program latihan berjenjang:
1. **The Mason:** Membangun fondasi kalimat dasar menggunakan antarmuka _drag-and-drop_.
2. **Logic Weaver:** Menghubungkan ide dan klausa menggunakan konektor logika yang tepat dalam format pilihan ganda dengan pengatur waktu (_timer_).
3. **IELTS Paragraph Builder:** Berlatih menyusun paragraf esai akademik (Task 2) langkah demi langkah berdasarkan petunjuk spesifik.
4. **Complexity Ladder:** Menulis kalimat berdasarkan topik dengan tingkat kompleksitas yang semakin meningkat. AI digunakan untuk memvalidasi struktur kalimat yang diinput pengguna.

Selain program latihan, fitur ini juga terhubung dengan latihan esai penuh (Task 1 dan Task 2) yang ditujukan bagi pengguna berbayar (Premium/Paid).

## 2. User Flow
1. **Masuk ke Writing Gym Hub:**
   - Pengguna membuka halaman utama Writing Gym Hub.
   - Hub menampilkan kartu *Current Focus* (berisi latihan terakhir yang sedang dikerjakan atau rekomendasi selanjutnya).
   - Hub menampilkan daftar *Training Programs* beserta _progress_ pengguna (berupa akumulasi bintang) dan status *lock/unlock*.
   - Fitur The Mason terbuka sejak awal. Logic Weaver terbuka jika pengguna mendapatkan 3+ bintang di Mason atau berstatus _Paid_. Complexity Ladder dan Task 1/2 terbuka eksklusif untuk _Paid users_. IELTS Paragraph Builder saat ini dikelola oleh *feature flag* dan mengikuti _logic_ dari tingkat akses Logic Weaver.
2. **Memilih Latihan:**
   - Pengguna memilih salah satu dari 4 program.
   - Jika pengguna memilih level yang terkunci dan berstatus gratis, akan muncul modal `PaywallSheet` untuk menawarkan _upgrade_, atau peringatan bahwa level sebelumnya belum diselesaikan.
3. **The Mason (Level 1):**
   - Pengguna menyusun kalimat dengan menarik dan meletakkan (_drag-and-drop_) kata-kata dari bank kata ke area target.
   - Menggunakan sistem *lives* (_hearts_) untuk pengguna gratis.
   - Jika salah susun, layar akan bergetar dan pengguna kehilangan 1 *heart*.
   - Jika benar, muncul *Success Screen* dengan animasi _confetti_, perolehan skor, bonus sisa waktu, bonus kombo, serta jumlah bintang (1-3).
4. **Logic Weaver (Level 2):**
   - Diberikan *Premise* (klausa utama) dan *Conclusion* (klausa bawahan), pengguna harus memilih *Connector* yang tepat dari pilihan ganda.
   - Waktu menjawab dibatasi oleh _timer_. Tersedia *Power-Ups* (50/50, Freeze Time, Hint).
   - Berhasil menjawab dengan benar akan menambah skor, *streak bonus*, dan kombo; jika salah, nyawa (_hearts_) berkurang.
5. **IELTS Paragraph Builder (Level 3):**
   - Pengguna membuat paragraf IELTS secara bertahap (memilih *Topic Sentence*, *Evidence*, *Conclusion*).
   - Pengguna disajikan daftar pilihan kalimat untuk setiap tahap, dan setiap pilihan memiliki bobot skor akademik (Band Level).
   - *Live Band Score* diperbarui setiap kali pengguna mengonfirmasi pilihan, menyesuaikan _average band_ dari keseluruhan paragraf.
   - Pada akhir level, pengguna menerima skor band akhir berbentuk sirkular dan *Detailed Feedback* yang menjelaskan kelebihan/kekurangan tiap pilihan kalimat.
6. **Complexity Ladder (Level 4):**
   - Pengguna memasukkan topik awal (misalnya "Technology").
   - AI menghasilkan sekumpulan instruksi penulisan dengan kompleksitas yang terus meningkat (contoh: kalimat sederhana -> kalimat majemuk -> kalimat kompleks).
   - Pengguna mengetik kalimat sesuai instruksi ke dalam _text area_. AI akan memverifikasi kebenarannya secara _real-time_.
   - Terdapat tombol _hint_ (bola lampu) jika pengguna kesulitan menemukan konjungsi atau struktur yang pas.

## 3. UI Components
- **`WritingGymHub.tsx`**: Dasbor utama. Menampilkan progress (berupa bintang), tombol *Current Focus*, dan daftar kartu `TrainingProgramItem` serta `Full Writing Tasks`. Terdapat *modals* kustom untuk memilih skill/topik (`MasonSkillPicker`, `LogicWeaverSkillPicker`, `ComplexityLadderHistory`).
- **`MasonLevel.tsx`**: Interface game The Mason. Menggunakan `@dnd-kit/core` untuk interaksi _drag-and-drop_. Terdapat komponen `MasonTargetArea` (area _drop_), `MasonWordBank` (pilihan kata acak), `MasonFooterControls` (tombol aksi _shuffle_, _hint_, dsb.), serta modal error/sukses.
- **`LogicWeaverLevel.tsx`**: Interface game Logic Weaver. Memiliki layout vertikal (Premise -> Connector -> Conclusion). Menyediakan _grid_ pilihan ganda di bagian bawah. Menggunakan pustaka `framer-motion` untuk animasi dan `canvas-confetti` saat sukses. Terdapat panel *Power-Ups* berbentuk melingkar di bawah (50/50, Freeze, Hint).
- **`IELTSParagraphLevel.tsx`**: Interface game Paragraph Builder. Menampilkan *Task Prompt* (bisa di-*collapse*), *Paragraph Draft* yang isinya bertambah seiring progres, dan *Options List* (opsi jawaban radio). Memiliki header tetap dengan *Live Band Score*. Menampilkan *Summary Screen* berbentuk _SVG circular chart_ untuk skor akhir.
- **`ComplexityLadder.tsx`**: Interface game Complexity Ladder. Memiliki *Welcome Screen* (input topik), *Generating Screen* (status _loading_ dengan animasi _spin_), dan *Playing Screen* (_textarea_ input). Memiliki _progress bar_ horizontal tipis di _header_ dan komponen _feedback_ balasan dari AI (hijau untuk sukses, merah untuk error).
- **`PaywallSheet`**: Komponen global yang dimunculkan untuk menawarkan langganan (_upgrade_) bagi pengguna gratis yang mencoba mengakses fitur berbayar atau kehabisan *hearts*.
- **Komponen Pendukung**: Tombol standar (`Button`), `FeatureFlagGuard` untuk peluncuran fitur parsial, serta `useToast` untuk notifikasi ringan.

## 4. Tech Arch
- **Frontend Framework**: React 18+ dengan TypeScript. Menggunakan Tailwind CSS untuk utilitas _styling_ dan dukungan _Dark Mode_, serta `framer-motion` untuk transisi antarmuka.
- **State Management**: React Hooks standar (`useState`, `useEffect`, `useMemo`, `useRef`). Ditambah *custom hooks* seperti `useAuth`, `useSubscription`, `useFreePlanHearts`, `useMasonGame`, dan `useSound`.
- **Drag & Drop**: Memanfaatkan pustaka `@dnd-kit/core` dan `@dnd-kit/sortable` untuk performa interaksi gestur (The Mason).
- **Session Persistence**: Dikelola oleh `sessionPersistenceService.ts`. Fitur ini menyimpan status *game* yang sedang berjalan (seperti level saat ini, teks yang sudah diketik) ke `localStorage` (atau IndexedDB/API backend) agar pengguna dapat melanjutkan sesi jika aplikasi tidak sengaja tertutup. Memunculkan dialog `recovery_prompt` saat komponen dimuat ulang.
- **Services Utama**:
  - `writingGymService`: Layanan klien untuk berkomunikasi dengan backend/AI yang bertugas menghasilkan soal latihan (*generate exercises*), mengecek tingkat kesulitan, hingga memvalidasi jawaban dengan AI (*verifyComplexityLevel*).
  - `writingGymProgressService` & `masonProgressService`: Mengatur pembaruan status penyelesaian (seperti bintang, total skor, jumlah level yang selesai, kombo) dan melakukan _sync_ ke _database_ akun pengguna.
  - `oracleService`: Melakukan rekalkulasi prediksi skor atau pembaruan metrik pengguna di latar belakang (_background task_) setiap kali sebuah sesi latihan berhasil diselesaikan.
- **Error Handling**: Jika panggilan API AI gagal (*Rate Limit*), sistem dapat mengaktifkan *Offline Training Mode* menggunakan soal bawaan aplikasi (_fallback exercise_), yang ditandai dari properti `explanation` bernilai _default_. Notifikasi error juga difasilitasi oleh `useToast`.

## 5. Edge Cases
- **Rate Limit / API Error**: Jika *generateExercise* gagal (karena kuota AI habis atau *error* server API), sistem akan mengaktifkan *Offline Training Mode* menggunakan soal-soal statis (*fallback*) atau menampilkan _toast_ error.
- **Session Recovery**: Pengguna yang menutup tab secara tidak sengaja di tengah latihan IELTS Paragraph Builder atau Complexity Ladder akan mendapatkan modal (dialog) yang bertanya apakah ingin melanjutkan (*Resume*) atau mengulang dari awal (*Start Fresh*) ketika membuka kembali menu tersebut.
- **Kehabisan Hearts (Free Users)**: Pengguna gratis yang menjawab salah berulang kali hingga nyawa (*hearts*) habis, tidak dapat lagi mencoba menjawab. *Game* akan memunculkan `PaywallSheet`. Permainan terkunci sampai *hearts* terisi ulang atau pengguna _upgrade_ akun.
- **Drag-and-Drop pada Perangkat Layar Sentuh**: Sensor sentuhan `@dnd-kit` menggunakan `PointerSensor` dengan nilai `activationConstraint: { distance: 5 }`. Ini memastikan membedakan antara aksi menggeser layar (*scroll* halaman) dan aksi menarik blok elemen (_drag_) pada layar sentuh.
- **Pilihan Jawaban Ganda AI (Logic Weaver)**: Karena terkadang respons AI menghasilkan pilihan jawaban dengan huruf kapital/kecil yang acak, pilihan konektor di-*deduplicate* terlebih dahulu menggunakan nilai *lowercase* di _frontend_ agar opsi yang sama tidak muncul dobel di layar.
