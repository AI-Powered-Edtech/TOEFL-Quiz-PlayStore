# Browser QA Spec — TOEFL Quiz Full UI/UX Test

**Untuk:** Cloud agent dengan browser tool  
**Target:** Semua flow UI, UX, logic, dan integrasi frontend  
**Setup:**
```bash
# Terminal 1 — Backend
DATABASE_URL="sqlite:data.db" JWT_SECRET="qa-test-secret" PORT=8082 cargo run

# Terminal 2 — Frontend
cd frontend && npm run dev
# → http://localhost:5173
```

**Test user credentials:**
- Register baru: `username=qa_tester`, `password=qatest123`, `full_name=QA Tester`
- Atau login jika sudah ada

---

## FLOW 1: Auth

### 1.1 Register
1. Buka `http://localhost:5173`
2. Klik tombol Register / Sign Up
3. Isi `username=qa_tester`, `password=qatest123`, `full_name=QA Tester`
4. Submit
5. **EXPECT:** Redirect ke Dashboard, nama user muncul, tidak ada console error merah

### 1.2 Logout
1. Navigasi ke Profile atau Settings
2. Klik Logout
3. **EXPECT:** Kembali ke halaman login/landing, token terhapus

### 1.3 Login
1. Login dengan `qa_tester` / `qatest123`
2. **EXPECT:** Dashboard muncul, `isAuthenticated=true`, progress loaded

### 1.4 Login salah password
1. Login dengan password salah
2. **EXPECT:** Error message muncul, tidak crash, tidak redirect

### 1.5 Akses tanpa auth
1. Logout, lalu coba akses fitur yang butuh auth (misal: Quiz)
2. **EXPECT:** Redirect ke login atau guest prompt muncul

---

## FLOW 2: Dashboard

1. Login, lihat Dashboard
2. **EXPECT:**
   - Progress bar / XP / level muncul
   - Section cards (Structure, Listening, Reading, Writing) terlihat
   - Tidak ada undefined/NaN di angka
   - Offline indicator tidak muncul (jika online)
3. Klik salah satu section card
4. **EXPECT:** Navigasi ke Practice Hub atau langsung ke quiz

---

## FLOW 3: Quiz — Core Learning Loop

### 3.1 Start Quiz (Structure)
1. Dari Dashboard, klik section "Structure"
2. **EXPECT:** Loading state muncul ("Building Your Quiz" atau spinner)
3. Tunggu quiz load
4. **EXPECT:** Soal muncul dengan pilihan A/B/C/D, tidak kosong, tidak `undefined`

### 3.2 Answer Questions
1. Klik salah satu pilihan jawaban
2. **EXPECT:** Pilihan ter-highlight, tombol Next aktif
3. Klik Next
4. **EXPECT:** Soal berikutnya muncul, index bertambah
5. Jawab 3–5 soal
6. **EXPECT:** Score counter akurat (tidak double-count)

### 3.3 Navigation (Prev/Next/Jump)
1. Klik Prev untuk kembali ke soal sebelumnya
2. **EXPECT:** Jawaban sebelumnya masih tersimpan
3. Klik nomor soal di navigator (jika ada)
4. **EXPECT:** Jump ke soal yang dipilih

### 3.4 Mark for Review
1. Klik tombol "Mark" atau flag icon pada soal
2. **EXPECT:** Soal ter-mark, indikator muncul di navigator

### 3.5 Finish Quiz
1. Jawab semua soal, klik Finish/Submit
2. **EXPECT:** Konfirmasi dialog muncul (jika ada)
3. Konfirmasi
4. **EXPECT:** Result screen muncul dengan score, correct count, XP earned

### 3.6 Share Result
1. Di result screen, klik Share
2. **EXPECT:** Link di-copy ke clipboard, toast "Copied!" muncul
3. Buka link di tab baru
4. **EXPECT:** Report page muncul dengan data yang sama (bukan blank/404)

### 3.7 Quiz History & Progress
1. Navigasi ke Analytics atau Progress
2. **EXPECT:** Quiz yang baru selesai muncul di history
3. XP dan level terupdate

### 3.8 Quiz untuk section lain
1. Ulangi 3.1–3.5 untuk section: **Listening**, **Reading**, **Written**
2. **EXPECT:** Semua section bisa dijalankan tanpa error

---

## FLOW 4: Simulation

1. Navigasi ke Simulation (dari Dashboard atau More)
2. **EXPECT:** Halaman simulation muncul dengan deskripsi
3. Klik Start Simulation
4. **EXPECT:** Timer muncul, soal dari berbagai section muncul
5. Jawab beberapa soal, klik Finish
6. **EXPECT:** Score breakdown per section muncul

---

## FLOW 5: Writing Gym

### 5.1 Writing Gym Hub
1. Navigasi ke Writing Gym
2. **EXPECT:** Level cards muncul (Mason, Logic Weaver, IELTS, dll)
3. Progress bar per level terlihat

### 5.2 Mason (Level 1)
1. Klik Mason / Level 1
2. **EXPECT:** Exercise muncul dengan prompt
3. Ketik essay minimal 50 kata
4. Submit
5. **EXPECT:** Feedback muncul (atau "saved without feedback" jika no AI key)

### 5.3 Essay Evaluate (terlalu pendek)
1. Submit essay dengan < 50 kata
2. **EXPECT:** Error "too short" muncul, bukan crash

### 5.4 Vocabulary
1. Navigasi ke Vocabulary section di Writing Gym
2. **EXPECT:** Vocab list muncul
3. Tambah vocab baru
4. **EXPECT:** Vocab tersimpan dan muncul di list

### 5.5 Devil's Advocate
1. Buka Devil's Advocate feature
2. Masukkan argumen
3. Submit
4. **EXPECT:** Counter-argument muncul atau loading state

### 5.6 Model Essay Library
1. Navigasi ke Model Essay Library / Band 9 Library
2. **EXPECT:** List essay muncul, bisa diklik untuk baca detail

### 5.7 Peer Review
1. Submit essay untuk peer review
2. **EXPECT:** Submission berhasil, masuk queue
3. Lihat review queue
4. **EXPECT:** Submission orang lain muncul (atau empty state jika kosong)

---

## FLOW 6: Social Hub

### 6.1 Circles
1. Navigasi ke Social Hub
2. Klik "Create Circle"
3. Isi nama circle, submit
4. **EXPECT:** Circle baru muncul di list "My Circles"
5. Klik circle, kirim pesan
6. **EXPECT:** Pesan muncul di chat

### 6.2 Friend Code
1. Di Social Hub atau Profile, lihat Friend Code
2. **EXPECT:** Code muncul (format TOEFL-XXXXXX)
3. Copy code
4. Coba add friend dengan code invalid
5. **EXPECT:** Error "not found", bukan crash

### 6.3 Leaderboard
1. Klik Leaderboard
2. **EXPECT:** List user dengan rank, nama, XP muncul
3. User sendiri ter-highlight

### 6.4 Notifications
1. Navigasi ke Notifications
2. **EXPECT:** List notifikasi muncul (atau empty state)
3. Klik notifikasi untuk mark as read
4. **EXPECT:** Badge count berkurang

---

## FLOW 7: Profile & Settings

### 7.1 View Profile
1. Navigasi ke Profile
2. **EXPECT:** Nama, avatar, XP, level, subscription tier muncul
3. Tidak ada `undefined` atau `null` yang terlihat

### 7.2 Edit Profile
1. Klik Edit Profile
2. Ubah `full_name`
3. Save
4. **EXPECT:** Nama terupdate di UI, toast sukses muncul

### 7.3 Avatar Upload
1. Klik upload avatar
2. Upload file PNG/JPG
3. **EXPECT:** Avatar preview muncul, tersimpan

### 7.4 Settings
1. Navigasi ke Settings
2. Toggle Dark Mode
3. **EXPECT:** Theme berubah, preference tersimpan
4. Cek notifikasi settings
5. **EXPECT:** Toggle berfungsi

---

## FLOW 8: Blog

1. Navigasi ke Blog
2. **EXPECT:** List post muncul
3. Klik salah satu post
4. **EXPECT:** Konten post muncul lengkap, tidak blank
5. Klik Back
6. **EXPECT:** Kembali ke list

---

## FLOW 9: Oracle / Analytics

1. Navigasi ke Oracle atau Analytics
2. **EXPECT:** Score prediction, progress chart muncul
3. Data tidak semua 0 atau undefined (setelah ada quiz history)

---

## FLOW 10: Offline Behavior

1. Di DevTools, set Network ke "Offline"
2. Coba navigasi ke beberapa halaman
3. **EXPECT:** Offline indicator muncul, app tidak crash total
4. Coba submit quiz result
5. **EXPECT:** Masuk offline queue, toast "will sync when online"
6. Set Network kembali ke Online
7. **EXPECT:** Sync terjadi, data tersimpan

---

## FLOW 11: Error Jail

1. Jawab soal yang sama salah beberapa kali (jika ada error jail feature)
2. **EXPECT:** Error jail screen muncul dengan soal yang salah
3. Review soal di error jail
4. **EXPECT:** Bisa retry atau dismiss

---

## FLOW 12: Subscription / Paywall

1. Sebagai free user, coba akses fitur premium (AI generate, advanced writing)
2. **EXPECT:** Paywall modal muncul dengan info upgrade
3. Klik "Maybe Later" atau close
4. **EXPECT:** Modal tutup, tidak crash

---

## FLOW 13: Native Navigation (Back Button)

1. Masuk ke quiz
2. Tekan browser back button
3. **EXPECT:** Konfirmasi "leave quiz?" muncul, atau kembali ke previous view dengan benar
4. Navigasi beberapa level dalam (Dashboard → Practice → Quiz → Result)
5. Tekan back beberapa kali
6. **EXPECT:** Stack navigasi benar, tidak loop atau stuck

---

## Checklist Umum (Cek di Setiap Flow)

- [ ] Tidak ada console error merah (kecuali Groq API key warning — acceptable)
- [ ] Tidak ada `undefined`, `null`, `NaN` yang terlihat di UI
- [ ] Loading state muncul saat fetch data
- [ ] Empty state muncul saat data kosong (bukan blank/crash)
- [ ] Toast/snackbar muncul untuk aksi sukses dan error
- [ ] Responsive layout tidak broken di mobile viewport (375px)
- [ ] Dark mode tidak ada teks yang hilang (contrast issue)
- [ ] Semua tombol clickable dan tidak overlap

---

## Report Format

Untuk setiap flow, catat:
```
FLOW X.Y — [Nama Flow]
Status: PASS / PARTIAL / FAIL
Screenshot: [jika ada issue]
Console errors: [list jika ada]
Notes: [observasi penting]
```
