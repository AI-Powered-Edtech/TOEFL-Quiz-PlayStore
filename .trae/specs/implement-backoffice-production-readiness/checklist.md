# Checklist: Implement Backoffice Production Readiness

- [ ] `AdminAuthGate.tsx` berhasil mengalihkan (*redirect*) pengguna yang tidak berhak dari halaman *backoffice*.
- [ ] Profil pengguna di *frontend* ditarik untuk memverifikasi peran `admin` atau `super_admin` sebelum me-render *BackofficeHub*.
- [ ] *Role Assignment* di backend `admin.rs` berhasil menggunakan *payload* peran dari permintaan klien, bukan `admin` *hardcode*.
- [ ] Tombol "Ubah Tier" di `BackofficeHub.tsx` menampilkan pesan *error* yang jelas (misalnya: "Hanya Super Admin...") ketika pengguna hanya berstatus `admin`.
- [ ] *Tab* "System Health" ditambahkan ke antarmuka `BackofficeHub.tsx`.
- [ ] *Endpoint* `/api/admin/monitoring/health` dan `/api/admin/monitoring/errors` berhasil dipanggil dan datanya ditampilkan dalam UI *Backoffice*.
- [ ] Aplikasi lulus pengujian akses (*Access Control List*) untuk skenario *User Biasa*, *Admin*, dan *Super Admin*.