# TOEFL Quiz - Product Requirements Document (PRD) Lengkap

## Mengapa
Dokumen ini diperlukan untuk mendokumentasikan semua fitur yang ada di proyek TOEFL Quiz secara menyeluruh, sehingga tim pengembang dan stakeholder dapat memahami kemampuan lengkap produk ini.

## Apa Perubahan
Dokumen ini adalah ringkasan komprehensif dari semua fitur yang telah diimplementasikan dalam proyek TOEFL Quiz.

## Dampak
- Specs yang terpengaruh: Semua kemampuan produk
- Kode yang terpengaruh: Seluruh codebase (Frontend & Backend)

---

# Daftar Fitur Lengkap

## 1. Peng Quentin - Fitur Autentikasi dan User Management

### 1.1 Sistem Autentikasi
- **Deskripsi**: Sistem autentikasi pengguna menggunakan Supabase Auth
- **Komponen**:
  - Login dengan Google
  - Login Guest (tanpa registrasi)
  - Logout
  - Update profil pengguna
- **File**: [auth.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/auth.ts)

### 1.2 Guest User Policy
- **Deskripsi**: Kebijakan untuk pengguna guest yang membatasi akses fitur tertentu
- **Fitur**:
  - Daily quiz limit untuk guest
  - Hearts system (dibatasi untuk guest)
  - Paywall untuk fitur premium
- **File**: [useGuestPolicy.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/hooks/useGuestPolicy.tsx)

---

## 2. Quiz System - Sistem Quiz Inti

### 2.1 Quiz Engines
- **Deskripsi**: Mesin quiz untuk berbagai section TOEFL
- **Tipe**:
  - Reading Quiz Engine
  - Listening Quiz Engine
  - Structure Quiz Engine
  - Written Expression Quiz Engine
- **File**:
  - [readingQuizEngine.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/groq/readingQuizEngine.ts)
  - [listeningQuizEngine.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/groq/listeningQuizEngine.ts)
  - [structureQuizEngine.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/groq/structureQuizEngine.ts)
  - [writtenQuizEngine.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/groq/writtenQuizEngine.ts)

### 2.2 Quiz Generator (AI)
- **Deskripsi**: Generator soal otomatis menggunakan AI (Groq)
- **Fitur**:
  - Generate soal Reading
  - Generate soal Listening
  - Generate soal Structure
  - Generate soal Written Expression
  - Hybrid mode (bank + AI generation)
- **File**: [quizGenerator.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/groq/quizGenerator.ts)

### 2.3 Question Bank
- **Deskripsi**: Bank soal offline yang tersimpan di IndexedDB
- **Fitur**:
  - Penyimpanan lokal soal
  - Sinkronisasi dengan server
  - Filter berdasarkan difficulty dan CEFR level
- **File**: [questionBankService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/questionBankService.ts)

### 2.4 Quiz Views
- **Komponen Frontend**:
  - [QuizViewReading.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/QuizViewReading.tsx)
  - [QuizViewListening.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/QuizViewListening.tsx)
  - [QuizViewStructure.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/QuizViewStructure.tsx)
  - [QuizViewWritten.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/QuizViewWritten.tsx)

---

## 3. Simulation - Fitur Simulasi TOEFL

### 3.1 Full Simulation (IBT-Style)
- **Deskripsi**: Simulasi TOEFL lengkap dengan urutan section sebenarnya
- **Urutan Section**:
  1. Reading (55 menit)
  2. Listening (40 menit)
  3. Structure + Written Expression (25 menit)
- **Fitur**:
  - Timer per section
  - Adaptive difficulty
  - Section review
  - Break antar section
- **File**: [SimulationView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/SimulationView.tsx)

### 3.2 Custom Simulation
- **Deskripsi**: Konfigurasi kuis kustom oleh pengguna
- **Paramater**:
  - Jumlah soal per section (10-50)
  - Timer kustom
  - Mix dari bank dan AI
- **File**: [types.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/types.ts) - CustomSimulationConfig

### 3.3 CEFR Simulation
- **Deskripsi**: Simulasi berdasarkan level CEFR (A2-C1)
- **File**: [CefrSimulationView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/CefrSimulationView.tsx)

---

## 4. Writing Gym - Fitur Menulis

### 4.1 Mason Level (Level 1)
- **Deskripsi**: Latihan menyusun kalimat dari kata-kata
- **Tipe Latihan**:
  - Drag & drop kata
  - Puzzle fit (puzzle kata)
  - Syntax highlighting
- **File**: [MasonLevel.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/MasonLevel.tsx)

### 4.2 Logic Weaver Level (Level 2)
- **Deskripsi**: Latihan menghubungkan kalimat dengan connector
- **Fitur**:
  - Subordinate clauses
  - Connectors options
  - Multiple choice
- **File**: [LogicWeaverLevel.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/LogicWeaverLevel.tsx)

### 4.3 IELTS Paragraph Builder (Level 3)
- **Deskripsi**: Membangun paragraf IELTS step-by-step
- **Fitur**:
  - Step-by-step guidance
  - Band level feedback
  - Multiple steps per task
- **File**: [IELTSParagraphLevel.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/IELTSParagraphLevel.tsx)

### 4.4 IELTS Writing Simulation
- **Deskripsi**: Simulasi IELTS Writing lengkap
- **Task Types**:
  - Task 1 (Data Description)
  - Task 2 (Essay)
- **Fitur**:
  - Timer
  - Word count
  - AI evaluation
- **File**: [IELTSWritingSim.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/IELTSWritingSim.tsx)

### 4.5 Integrated Writing Task
- **Deskripsi**: Integrated Writing Task (TOEFL iBT)
- ** Fitur)**:
  - Reading passage
  - Listening lecture
  - Note-taking
  - Writing response
- **File**: [IntegratedWritingTask.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/IntegratedWritingTask.tsx)

### 4.6 Academic Discussion Task
- **Deskripsi**: Academic Discussion Task (IELTS)
- ** Fitur)**:
  - Professor prompt
  - Student responses
  - Write own response
- **File**: [AcademicDiscussionTask.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/AcademicDiscussionTask.tsx)

### 4.7 Complexity Ladder
- **Deskripsi**: Latihan meningkatkan kompleksitas kalimat
- **Fitur**:
  - Sederhana → Kompleks
  - History tracking
  - AI feedback
- **File**: [ComplexityLadder.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/ComplexityLadder.tsx)

### 4.8 Devil's Advocate
- **Deskripsi**: Latihan berargumen dan mempertahankan pendapat
- **Fitur**:
  - Counter-point detection
  - Logical fallacy check
  - Defense writing
- **File**: [DevilsAdvocateLevel.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/DevilsAdvocateLevel.tsx)

### 4.9 Writing Gym Hub
- **Deskripsi**: Landing page Writing Gym
- **File**: [WritingGymHub.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/WritingGymHub.tsx)

### 4.10 Mason Analytics & Progress
- **Deskripsi**: Tracking progress Mason exercises
- **File**: [masonProgressService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/masonProgressService.ts)

---

## 5. Peer Review - Fitur Review Sejawat

### 5.1 Essay Submission
- **Deskripsi**: Upload essay untuk di-review
- **Fitur**:
  - Anonymous submission
  - Word count validation
  - Expiry (24 jam)
- **File**: [EssaySubmissionForm.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/peerReview/EssaySubmissionForm.tsx)

### 5.2 Queue System
- **Deskripsi**: Sistem antrian review
- **Fitur**:
  - Filter by band score
  - Filter by task type
  - Claim essay
- **File**: [QueueFilters.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/peerReview/QueueFilters.tsx)

### 5.3 Review Interface
- **Deskripsi**: Interface untuk memberikan review
- **Fitur**:
  - Inline corrections
  - Scoring sliders (4 criteria)
  - Overall band
  - Strengths/Weaknesses
- **File**: [ReviewInterface.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/peerReview/ReviewInterface.tsx)

### 5.4 Reviewer Tier System
- **Deskripsi**: Sistem tier untuk reviewer
- **Tier**:
  - Novice (0-9 reviews)
  - Helper (10-49)
  - Mentor (50-199)
  - Expert (200-499)
  - Master (500+)
- **File**: [ReviewerTierBadge.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/peerReview/ReviewerTierBadge.tsx)

### 5.5 Peer Review Hub
- **Deskripsi**: Landing page Peer Review
- **File**: [PeerReviewHub.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/peerReview/PeerReviewHub.tsx)

---

## 6. Band 9 Library - Perpustakaan Band 9

### 6.1 Model Essay Library
- **Deskripsi**: Koleksi essay model Band 9
- **Fitur**:
  - Browse by category
  - Filter by band score
  - Search
  - Annotations
- **File**: [ModelEssayLibrary.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/ModelEssayLibrary.tsx)

### 6.2 Band 9 Library Hub
- **Deskripsi**: Perpustakaan lengkap
- **File**: [Band9LibraryHub.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/band9Library/Band9LibraryHub.tsx)

### 6.3 Essay Reader
- **Deskripsi**: Pembaca essay dengan annotations
- **Fitur**:
  - Vocabulary highlighting
  - Click for definition
  - Save to collection
- **File**: [EssayReader.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/band9Library/EssayReader.tsx)

### 6.4 Essay Browser
- **Deskripsi**: Browser untuk menemukan essay
- **File**: [EssayBrowser.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/writingGym/band9Library/EssayBrowser.tsx)

---

## 7. Blog & Skills - Konten Edukasi

### 7.1 Blog System
- **Deskripsi**: Blog untuk konten edukasi
- **Fitur**:
  - Blog listing
  - Blog post view
  - Categories (Structure, Listening, Reading)
- **File**:
  - [BlogListingView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/blog/BlogListingView.tsx)
  - [BlogPostView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/blog/BlogPostView.tsx)

### 7.2 Skill Module System
- **Deskripsi**: Modul skill untuk belajar
- **Fitur**:
  - Skill list
  - Skill reader
  - AI chat overlay
- **File**:
  - [SkillModuleList.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/modules/SkillModuleList.tsx)
  - [SkillModuleReader.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/modules/SkillModuleReader.tsx)

---

## 8. Oracle - Prediksi Skor

### 8.1 Score Oracle
- **Deskripsi**: Prediksi skor TOEFL/IELTS berdasarkan aktivitas
- ** supported tests**:
  - TOEFL PBT
  - TOEFL iBT
  - TOEFL ITP
  - IELTS
- **Fitur**:
  - Breakdown per section
  - Confidence level
  - Recommendation
- **File**: [ScoreOracleView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/ScoreOracleView.tsx)

### 8.2 Oracle Data Service
- **Deskripsi**: Pengumpulan dan analisis data
- **File**: [oracleDataService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/oracleDataService.ts)

---

## 9. Social - Fitur Sosial

### 9.1 Social Hub
- **Deskripsi**: Hub untuk fitur sosial
- **Fitur**:
  - Friends list
  - Leaderboard
  - Circles (group)
- **File**: [SocialHub.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/SocialHub.tsx)

### 9.2 Friend System
- **Deskripsi**: Sistem teman
- **Fitur**:
  - Add friend
  - Friend requests
  - Remove friend
- **File**: [friendService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/friendService.ts)

### 9.3 Circle System
- **Deskripsi**: Sistem grup belajar
- **Fitur**:
  - Create circle
  - Join with code
  - Circle chat
- **File**: [circleService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/circleService.ts)

### 9.4 Leaderboard
- **Deskripsi**: Papan peringkat
- **Tipe**:
  - Global leaderboard
  - Mason leaderboard
- **File**: [LeaderboardView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/LeaderboardView.tsx)

---

## 10. Practice Hub - Hub Latihan

### 10.1 Practice Hub
- **Deskripsi**: Central hub untuk semua latihan
- **Akses ke**:
  - Quiz sections
  - Writing Gym
  - Simulation
  - Vocabulary
- **File**: [PracticeHub.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/PracticeHub.tsx)

### 10.2 Bank View
- **Deskripsi**: Bank soal untuk latihan
- **Fitur**:
  - Browse questions
  - Select questions
  - Start custom quiz
- **File**: [BankView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/BankView.tsx)

---

## 11. Learning Path - Jalur Pembelajaran

### 11.1 Learning Path
- **Deskripsi**: AI-guided learning path
- **Fitur**:
  - Skill recommendation
  - Progress tracking
  - Weak area identification
- **File**: [LearningPath.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/LearningPath.tsx)

### 11.2 Today's Focus
- **Deskripsi**: Rekomendasi harian berdasarkan weakest skill
- **File**: [todaysFocusService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/todaysFocusService.ts)

---

## 12. Profile & Settings - Pengaturan Pengguna

### 12.1 Profile
- **Deskripsi**: Halaman profil pengguna
- **Fitur**:
  - View/edit profile
  - Progress stats
  - Badges
- **File**: [Profile.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/Profile.tsx)

### 12.2 Settings
- **Deskripsi**: Pengaturan aplikasi
- **Fitur**:
  - Sound settings
  - Notification settings
  - Theme (dark/light)
- **File**: [Settings.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/Settings.tsx)

### 12.3 Subscription
- **Deskripsi**: Manajemen langganan
- **Fitur**:
  - Check subscription status
  - Payment history
  - Paywall sheet
- **File**: [subscriptionService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/subscriptionService.ts)

---

## 13. Notifications - Sistem Notifikasi

### 13.1 Notification Center
- **Deskripsi**: Pusat notifikasi
- **Fitur**:
  - List notifications
  - Mark as read
  - Filter by type
- **File**: [NotificationCenter.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/NotificationCenter.tsx)

### 13.2 Push Notifications
- **Deskripsi**: Notifikasi push
- **File**: [pushNotificationService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/pushNotificationService.ts)

---

## 14. Dashboard - Halaman Utama

### 14.1 Dashboard
- **Deskripsi**: Halaman utama aplikasi
- **Fitur**:
  - Today's focus
  - Quick actions
  - Progress overview
  - Streak counter
  - Unread notifications badge
- **File**: [Dashboard.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/Dashboard.tsx)

---

## 15. Error & PDF Features

### 15.1 Error Jail
- **Deskripsi**: Error review system
- **Fitur**:
  - Auto-capture errors
  - Review incorrect answers
  - Add to review queue
- **File**: [ErrorJailView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/ErrorJailView.tsx)

### 15.2 PDF Upload
- **Deskripsi**: Upload PDF untuk生成 quiz
- **Fitur**:
  - PDF text extraction
  - Generate questions from PDF
  - AI-powered
- **File**: [PdfUploadView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/PdfUploadView.tsx)

### 15.3 Report View
- **Deskripsi**: Lihat hasil kuis sebelumnya
- **Fitur**:
  - Share report
  - Review answers
  - Detailed breakdown
- **File**: [ReportView.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/ReportView.tsx)

---

## 16. AI Features - Fitur AI

### 16.1 AI Essay Evaluation
- **Deskripsi**: Evaluasi essay dengan AI
- **Metrik**:
  - Overall score
  - Task response
  - Coherence & cohesion
  - Lexical resource
  - Grammatical range
- **File**: [essayEvaluationService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/essayEvaluationService.ts)

### 16.2 AI Chat (Socratic)
- **Deskripsi**: AI tutor untuk bertanya
- **File**: [AiBottomSheet.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/modules/AiBottomSheet.tsx)

### 16.3 Groq Client
- **Deskripsi**: Client untuk Groq API
- **Fitur**:
  - Circuit breaker
  - Rate limiting
  - Compound prompts
- **File**: [client.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/groq/client.ts)

### 16.4 TTS (Text-to-Speech)
- **Deskripsi**: Text-to-speech untuk listening
- **Provider**:
  - Kitten TTS
  - Browser TTS
- **File**: [ttsService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/ttsService.ts)

---

## 17. Infrastructure - Infrastruktur

### 17.1 Offline Support
- **Deskripsi**: Dukungan offline
- **Fitur**:
  - IndexedDB storage
  - Offline queue
  - Sync when online
- **File**: [offlineQueue.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/offlineQueue.ts)

### 17.2 Rate Limiter
- **Deskripsi**: Rate limiting untuk API
- **File**: [RateLimiter.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/utils/RateLimiter.ts)

### 17.3 Monitoring & Analytics
- **Deskripsi**: Monitoring performa
- **File**:
  - [analytics.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/utils/analytics.ts)
  - [monitoring.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/utils/monitoring.ts)

### 17.4 Audio Cache Service
- **Deskripsi**: Cache audio untuk listening
- **File**: [audioCacheService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/audioCacheService.ts)

---

## 18. Admin Features - Fitur Admin

### 18.1 Backoffice Hub
- **Deskripsi**: Panel admin
- **Fitur**:
  - User management
  - Question management
  - Analytics
- **File**: [BackofficeHub.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/admin/BackofficeHub.tsx)

### 18.2 Admin Service
- **Deskripsi**: Service untuk admin
- **File**: [adminService.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/services/adminService.ts)

---

## 19. Backend (Rust/Axum)

### 19.1 Auth Service
- **Deskripsi**: Service autentikasi backend
- **File**: [auth.rs](file:///home/rog/Documents/TOEFL-Quiz/src/services/auth.rs)

### 19.2 Quiz Service
- **Deskripsi**: Service untuk quiz
- **File**: [quiz.rs](file:///home/rog/Documents/TOEFL-Quiz/src/services/quiz.rs)

### 19.3 Writing Service
- **Deskripsi**: Service untuk writing
- **File**: [writing.rs](file:///home/rog/Documents/TOEFL-Quiz/src/services/writing.rs)

### 19.4 AI Service
- **Deskripsi**: Service untuk AI integration
- **File**: [ai.rs](file:///home/rog/Documents/TOEFL-Quiz/src/services/ai.rs)

### 19.5 Social Service
- **Deskripsi**: Service untuk sosial
- **File**: [social.rs](file:///home/rog/Documents/TOEFL-Quiz/src/services/social.rs)

### 19.6 Blog Service
- **Deskripsi**: Service untuk blog
- **File**: [blog.rs](file:///home/rog/Documents/TOEFL-Quiz/src/services/blog.rs)

### 19.7 Storage Service
- **Deskripsi**: Service untuk file storage
- **File**: [storage.rs](file:///home/rog/Documents/TOEFL-Quiz/src/services/storage.rs)

---

## 20. Mobile Features

### 20.1 Mobile Tab Bar
- **Deskripsi**: Bottom navigation untuk mobile
- **File**: [MobileTabBar.tsx](file:///home/rog/Documents/TOEFL-Quiz/frontend/src/components/MobileTabBar.tsx)

### 20.2 Capacitor Integration
- **Deskripsi**: Mobile native features
- **File**: [capacitor.config.ts](file:///home/rog/Documents/TOEFL-Quiz/frontend/capacitor.config.ts)

---

## Ringkasan Fitur

| No | Kategori | Fitur Utama | Jumlah File |
|----|----------|-----------|------------|
| 1 | Auth & User | Login, Guest, Profile | 5 |
| 2 | Quiz System | 4 Quiz Engines, Generator, Bank | 15 |
| 3 | Simulation | Full, Custom, CEFR | 3 |
| 4 | Writing Gym | 8 Levels, Gym, Analytics | 25 |
| 5 | Peer Review | Submission, Queue, Review | 10 |
| 6 | Band 9 Library | Essay, Reader, Browser | 7 |
| 7 | Blog & Skills | Blog, Skill Modules | 6 |
| 8 | Oracle | Score Prediction, Data | 3 |
| 9 | Social | Friends, Circles, Leaderboard | 5 |
| 10 | Practice Hub | Hub, Bank | 2 |
| 11 | Learning Path | Path, Today's Focus | 2 |
| 12 | Profile/Settings | Profile, Settings, Subscription | 4 |
| 13 | Notifications | Center, Push | 2 |
| 14 | Dashboard | Main Dashboard | 1 |
| 15 | Error/PDF | Error Jail, PDF, Report | 3 |
| 16 | AI Features | Evaluation, Chat, TTS | 10 |
| 17 | Infrastructure | Offline, Cache, Monitor | 8 |
| 18 | Admin | Backoffice | 2 |
| 19 | Backend | 7 Services (Rust) | 7 |
| 20 | Mobile | Mobile Tab, Capacitor | 2 |
| | | **TOTAL** | **~130+ fitur** | **~150 file** |

---

## Requirements Tambahan

### Requirement: Dokumentasi Fitur
Sistem HARUS menyediakan dokumentasi lengkap untuk semua fitur yang ada dalam bentuk PRD ini.

#### Scenario: Update Fitur
- **GIVEN** pengembang menambahkan fitur baru
- **WHEN** mereka memperbarui codebase
- **THEN** dokumen ini也应 diupdate untuk mencerminkan perubahan

### Requirement: Fitur yang Tidak Tergunakan
Sistem HARUS menandai fitur yang sudah tidak digunakan atau deprecated.

#### Scenario: Fitur Deprecated
- **GIVEN** fitur ditandai deprecated
- **WHEN** pengguna mencoba akses
- **THEN** muncul pesan yang menjelaskan bahwa fitur tidak tersedia

---

## Impact Analysis

### Frontend Impact
- **Total Components**: ~130+ React components
- **Total Services**: ~80+ services
- **State Management**: Zustand stores

### Backend Impact
- **Total Services**: ~7 Rust services
- **Database**: SQLite (migration-based)

### Infrastructure
- **Runtime**: Vite (Frontend), Axum (Backend)
- **Storage**: IndexedDB, Supabase
- **AI**: Groq API
- **TTS**: Kitten TTS, Browser TTS