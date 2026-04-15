# Audit Learning Path Quiz Flow Spec

## Why
Untuk memastikan fitur utama (core learning loop) aplikasi TOEFL berjalan tanpa cacat dan sesuai *best practice*. Perlu adanya verifikasi komprehensif mulai dari *quiz generation* oleh AI, pencocokan dengan *skill* spesifik (Structure, Written, Listening, Reading), perhitungan skor yang berkontribusi pada *estimated TOEFL score*, hingga kebenaran penyimpanan data *quiz* dan pertanyaan ke dalam basis data (seperti di fitur Bank Soal / Question Bank).

## What Changes
- Melakukan audit secara mendalam (E2E) pada fitur Learning Path dan Quiz menggunakan browser agent.
- Memverifikasi alur *quiz generation* menggunakan AI Groq untuk memastikan keakuratannya.
- Melakukan kueri langsung ke database (SQLite) untuk mencocokkan data yang ditampilkan di UI dengan data yang benar-benar tersimpan.
- Memvalidasi kategorisasi soal berdasarkan empat *sections* TOEFL (Structure, Written, Listening, Reading).
- Mengevaluasi perhitungan dan penambahan poin ke *Estimated TOEFL Score* pada profil pengguna.

## Impact
- Affected specs: Quiz System, AI Integration, Score Calculation, Database Integrity.
- Affected code: Verifikasi pada UI komponen Quiz, integrasi API Backend, dan integritas skema database.

## ADDED Requirements
### Requirement: End-to-End Quiz Flow Integrity
Sistem HARUS menghasilkan, menyajikan, menilai, dan menyimpan *quiz* secara konsisten dan akurat sesuai dengan *skill* dan *section* yang dipilih.

#### Scenario: Success case
- **WHEN** user (persona) memulai quiz pada *Learning Path* untuk *Skill* tertentu.
- **THEN** Groq AI menghasilkan soal sesuai konteks *skill*, UI menampilkannya dengan sempurna, skor dihitung dengan benar setelah *submit*, *estimated score* ter-update, dan soal-soal tersebut muncul secara akurat dengan kategori yang benar pada halaman *Question Bank*.