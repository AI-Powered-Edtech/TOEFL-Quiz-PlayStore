# Tasks
- [ ] Task 1: Audit kesiapan Capacitor saat ini
  - [ ] Pastikan konfigurasi appId/appName/webDir sesuai di [capacitor.config.ts](file:///workspace/frontend/capacitor.config.ts).
  - [ ] Pastikan `VITE_API_URL` untuk production sudah terdokumentasi (mengacu ke [DEPLOYMENT_GUIDE.md](file:///workspace/docs-dev/DEPLOYMENT_GUIDE.md#L445-L460)).

- [ ] Task 2: Generate project Android Capacitor (platform)
  - [ ] Inisialisasi Capacitor Android (`npx cap add android`) dan commit folder `frontend/android/`.
  - [ ] Jalankan `npm run build` lalu `npx cap sync android`.

- [ ] Task 3: Konfigurasi identitas aplikasi Android
  - [ ] Set `applicationId` sesuai `appId` (mis. `com.toeflquiz.app`) dan pastikan konsisten di Gradle.
  - [ ] Tetapkan `versionName` dan `versionCode` policy (naik setiap release).
  - [ ] Pastikan `minSdkVersion` dan `targetSdkVersion` sesuai requirement Play Store terbaru.

- [ ] Task 4: Asset pack (ikon, splash, feature graphic)
  - [ ] Generate ikon & splash via tool Capacitor assets (mis. `@capacitor/assets`) dari sumber PNG high-res.
  - [ ] Validasi icon adaptive + notification icon untuk Android.
  - [ ] Siapkan screenshot minimal: phone portrait (2–8), 1024×500 feature graphic, app icon 512×512.

- [ ] Task 5: Security & networking hardening untuk mobile
  - [ ] Pastikan semua request ke API menggunakan HTTPS dan origin whitelist backend mencakup domain app.
  - [ ] Pastikan tidak ada hardcode `localhost` untuk build release.
  - [ ] Review permission Android: hanya yang diperlukan (network, notifications bila dipakai).

- [ ] Task 6: Signing & build AAB release
  - [ ] Buat keystore release (disimpan aman, **tidak di-commit**).
  - [ ] Konfigurasi Gradle signingConfig untuk `release`.
  - [ ] Build `bundleRelease` menghasilkan `.aab`.

- [ ] Task 7: Play Console checklist (upload + metadata)
  - [ ] Buat aplikasi di Google Play Console + set package name sama dengan `applicationId`.
  - [ ] Isi Store Listing: nama, deskripsi, kategori, kontak, privacy policy URL.
  - [ ] Isi Data Safety sesuai data yang dikumpulkan aplikasi (auth, analytics, purchases, push notification bila aktif).
  - [ ] Isi Content Rating + Target Audience.
  - [ ] Upload AAB ke Internal Testing track dan verifikasi install via Play.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 6 depends on Task 3, Task 5
- Task 7 depends on Task 6
