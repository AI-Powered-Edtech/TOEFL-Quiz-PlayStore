# Tasks: Implement Backoffice Production Readiness

- [x] **Task 1: Implementasi AdminAuthGate Nyata (Frontend)**
  - Ubah `frontend/src/components/admin/AdminAuthGate.tsx`.
  - Panggil `apiClient.get('/api/auth/profile')` saat komponen dimuat (*mount*).
  - Tampilkan *loading state* saat memeriksa peran.
  - Jika profil tidak ditemukan atau *role* bukan `admin` / `super_admin`, tampilkan komponen peringatan "Akses Ditolak" (*Unauthorized*) dengan tombol kembali ke beranda.

- [x] **Task 2: Perbaiki Kontrak Role Assignment (Backend)**
  - Di `src/services/admin.rs` fungsi `assign_role`, ubah nilai `.value("admin".to_string())` menjadi mengambil dari parameter yang diminta oleh klien: `.value(req.role.clone())`.

- [x] **Task 3: Tingkatkan UX Error Handling di BackofficeHub (Frontend)**
  - Pada fungsi `handleChangeTier` di `BackofficeHub.tsx`, tangkap kesalahan HTTP 403.
  - Jika *error* adalah "Super admin access required" (seperti yang dikirim oleh `require_super_admin` di Rust), tampilkan *toast* atau peringatan spesifik: "Hanya Super Admin yang dapat mengubah tier pengguna".

- [x] **Task 4: Tambahkan Monitoring Tab (System Health & Errors) ke Backoffice (Frontend)**
  - Buat komponen `frontend/src/components/admin/SystemHealth.tsx`.
  - Panggil *endpoint* `/api/admin/monitoring/health` dan `/api/admin/monitoring/errors`.
  - Tampilkan angka total pengguna, jumlah pengguna aktif 24 jam terakhir, *errors*, dan *warnings* dalam bentuk *card* sederhana.
  - Modifikasi `BackofficeHub.tsx` untuk menyertakan navigasi *tab* sederhana antara "Users Management" dan "System Health".

- [x] **Task 5: Verifikasi Integrasi & Akses Kontrol**
  - Pastikan backend VIL Rust berjalan stabil.
  - Lakukan *login* sebagai pengguna biasa dan pastikan tidak bisa mengakses halaman admin.
  - *Login* sebagai `admin` (non-super) dan verifikasi bahwa akses mengubah *tier* ditolak secara *graceful* (tanpa mematahkan aplikasi).
  - *Login* sebagai `super_admin` dan verifikasi bahwa mereka dapat melihat *System Health* dan mengubah *tier* pengguna.