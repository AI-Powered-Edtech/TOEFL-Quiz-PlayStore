# Checklist

- [ ] Backend berjalan dengan `DATABASE_URL="sqlite:data.db" JWT_SECRET="qa-test-secret" PORT=8082` dan tidak crash saat menerima request.
- [ ] Frontend dev server berjalan dan dapat diakses di `http://localhost:5173` tanpa error fatal di console saat initial load.
- [ ] Laporan QA tersedia dan memuat 13 flow dengan status PASS/PARTIAL/FAIL untuk satu iterasi lengkap.
- [ ] Setiap issue yang ditemukan memiliki screenshot dan langkah reproduksi yang jelas (termasuk console/network errors bila relevan).
- [ ] Perbaikan dilakukan untuk semua issue yang ditemukan pada iterasi terakhir.
- [ ] Re-test penuh FLOW 1–13 dilakukan setelah perbaikan, dan status laporan diperbarui.
- [ ] Target kualitas tercapai untuk iterasi terkini: semua 13 flow berstatus PASS (atau ada pengecualian yang disepakati secara eksplisit).
