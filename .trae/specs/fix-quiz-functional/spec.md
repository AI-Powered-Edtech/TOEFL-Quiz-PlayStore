# Fix Quiz Generator & App Functionality Spec

## Why
Pengguna melaporkan bahwa *generator* kuis untuk bagian Reading menghasilkan teks yang tidak jelas alih-alih konten bacaan yang valid. Terdapat masalah *routing* kategori *skill*, di mana memilih "Written Expression" malah menampilkan kuis berformat "Structure". Selain itu, fitur masih sangat bergantung pada *mock data* (termasuk Question Bank yang tidak terisi setelah *generate*), padahal Groq API Key sudah disediakan. Banyak fitur aplikasi lainnya (seperti Error Jail dan Blog) masih berupa *placeholder* kosong yang belum fungsional. Transisi ke "dev mode" dibutuhkan agar fitur berjalan fungsional secara utuh tanpa terhambat validasi *production*.

## What Changes
- **BREAKING**: Mengubah implementasi `ai.rs` dan *service layer* AI dari sekadar merespons dengan *mock data* (jika ada *flag* tertentu) menjadi pemanggilan *live* ke Groq API secara penuh, asalkan Groq API Key tersedia.
- **BREAKING**: Mengoptimalkan dan menyelaraskan *prompt* spesifik untuk **Reading Comprehension** agar Groq menghasilkan "Passage" yang valid, terpisah secara logis dari "Questions", dan berformat JSON yang tepat.
- Memperbaiki logika *routing* atau filter *skill* sehingga ketika pengguna memilih *Skill 1 Written Expression*, aplikasi memuat antarmuka dan instruksi yang sesuai, bukan UI *Structure*.
- Menghubungkan *output* dari proses *generate* kuis (via StreamQuiz AI / AIProvider) agar secara langsung disimpan ke *database* lokal (seperti SQLite/IndexedDB) sehingga halaman **Question Bank** terpopulasi secara nyata.
- Menghubungkan komponen **Error Jail** agar dapat menarik data kesalahan historis dari *storage* (db/local) alih-alih sekadar UI kosong.
- Menginisialisasi fungsionalitas dasar **Blog** agar setidaknya dapat menampilkan data artikel yang di-*fetch* (bisa dari file Markdown lokal atau SQLite).
- Mengaktifkan **Dev Mode** (seperti menonaktifkan *Guest Limit Reached* secara sementara) agar pengguna dapat melakukan *debugging* tanpa batas interaksi.

## Impact
- Affected specs: `quiz-system-spec`, `practice-hub-prd`, `infrastructure-spec`
- Affected code: `src/services/ai.rs`, `src/services/groq/client.ts` (atau layanan frontend yang memanggil AI), `src/components/quiz/*`, `src/components/questionBank/*`, `src/components/errorJail/*`, `src/components/blog/*`, `src/store/*` atau implementasi DB.

## ADDED Requirements
### Requirement: Fungsionalitas Penuh (No Mocks)
Sistem SHALL menggunakan pemanggilan jaringan yang nyata ke Groq API untuk setiap permintaan *generate* kuis, menerjemahkan *prompt* menjadi JSON, dan menyimpannya secara persisten.
#### Scenario: Success case
- **WHEN** user menekan tombol "Generate" pada modul apapun
- **THEN** sistem memanggil Groq API, menerima respons JSON yang valid, menampilkannya ke UI tanpa *placeholder*, dan menyimpan data tersebut ke *Question Bank*.

## MODIFIED Requirements
### Requirement: Reading Quiz Generation
Sistem SHALL menghasilkan konten *Reading* yang terdiri dari teks bacaan (*Passage*) minimal 3 paragraf dan soal *Multiple Choice* terkait bacaan tersebut, diformat dengan pemisah JSON yang bersih.

### Requirement: Skill Routing
Sistem SHALL merender komponen kuis yang sesuai dengan kategori yang dipilih (mis. memilih *Written Expression* akan menampilkan UI yang meng- *highlight* teks yang salah, bukan antarmuka *Structure* yang melengkapi kalimat rumpang).

## REMOVED Requirements
### Requirement: Strict Production Limits (Temporary)
**Reason**: Menghambat *debugging* dan pengujian QA secara E2E.
**Migration**: Fitur "Guest Limit Reached" (seperti terlihat pada *screenshot*) akan di- *bypass* atau diberikan kuota tak terbatas selama mode pengembangan (*Dev Mode*).
