# Tasks

- [x] Task 1: Hapus *Hardcode* Subscription.
  - [x] SubTask 1.1: Hapus *hardcode* `isPaid: true` dan `isC2: true` di `frontend/src/hooks/useSubscription.ts`.
  - [x] SubTask 1.2: Hapus *bypass* `tier = "c2"` di `src/services/ai.rs` dan kembalikan logika pembacaan *tier* asli dari token/database.
- [x] Task 2: Buat Skrip/Endpoint Seeding Akun Dev.
  - [x] SubTask 2.1: Buat *script* (misalnya `seed_dev_accounts.ts` atau *endpoint* Rust) untuk meng-*inject* akun Dev Free (`dev_free@test.com`) dan Dev Premium (`dev_pro@test.com`) ke database lengkap dengan *tier* berlangganannya.
- [x] Task 3: Implementasi Minimal UI Backoffice.
  - [x] SubTask 3.1: Modifikasi `frontend/src/components/admin/BackofficeHub.tsx` untuk melakukan *fetch* ke *endpoint* admin Rust (`/api/admin/users`).
  - [x] SubTask 3.2: Tambahkan tabel sederhana untuk menampilkan pengguna dan tombol untuk mengubah *role*/*tier*.
- [x] Task 4: Eksekusi QA Dev Loop dengan Browser Agent (E2E).
  - [x] SubTask 4.1: Login sebagai akun Dev Free, gunakan fitur AI hingga token habis, dan verifikasi munculnya *paywall*.
  - [x] SubTask 4.2: Login sebagai akun Dev Premium, verifikasi akses fitur berbayar (seperti Essay Dojo) dan penggunaan token AI berhasil.
  - [x] SubTask 4.3: Login sebagai Admin, akses Backoffice, dan verifikasi alur manajemen pengguna.

# Task Dependencies
- [Task 4] depends on [Task 1, Task 2, Task 3]