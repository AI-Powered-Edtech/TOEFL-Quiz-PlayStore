# Persona-Based Browser Testing Spec

## Why
Pada pengujian sebelumnya ditemukan error `[AIProvider] Generation failed: Groq Batch Generation Failed` karena ketiadaan kunci API. Dengan adanya kunci API Groq yang baru, kita perlu melakukan pengujian mendalam kembali. Pengujian ini tidak sekadar memastikan "tidak ada error", melainkan mengevaluasi UX aplikasi dengan membayangkan persona *User* sebenarnya (seorang murid yang sedang belajar untuk tes TOEFL) untuk memastikan apakah fitur-fitur tersebut sudah *best practice* secara *end-to-end*.

## What Changes
- Memasukkan konfigurasi rahasia (`GROQ_API_KEY`) ke file `.env` dan `.env.example` untuk digunakan pada pengujian ini dan masa depan.
- Pengujian interaktif kembali pada semua modul utama (Onboarding, Quiz, Writing Gym, Essay Dojo, Blog, Social).
- Validasi generasi konten AI secara *real-time* (soal TOEFL, evaluasi essay) langsung melalui interaksi browser agent.

## Impact
- Affected specs: Quality Assurance, AI Integration, UX/UI Best Practices.
- Affected code: Penambahan environment variables dan potensi perbaikan minor pada UI/UX berdasarkan temuan *browser agent*.

## ADDED Requirements
### Requirement: Persona-Driven AI Testing
Sistem HARUS bisa menghasilkan soal dan respons AI tanpa *error* dan menyajikannya dalam format yang sesuai dengan ekspektasi seorang pelajar TOEFL.

#### Scenario: Success case
- **WHEN** user (persona) memulai *session* pada skill tertentu (misal: "Skill 21").
- **THEN** soal berhasil digenerasi oleh AI Groq, tidak ada error pada *console*, soal dapat dijawab, dan UI merender respons *grading* atau *explanation* dengan sangat *smooth*.