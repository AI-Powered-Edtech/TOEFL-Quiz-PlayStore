# TOEFL E-Learning Center (Blog & Skills Documentation) Spec

## 1. Overview
The "Blog" feature is evolving from a simple article feed into a **Comprehensive TOEFL E-Learning Center**. It serves as the central documentation and learning hub for *all* TOEFL skills (Structure, Written Expression, Reading, Listening, and Speaking). 

Instead of just random articles, this feature will systematically store, organize, and present all theoretical knowledge, tips, strategies, and formulas needed to master every specific TOEFL skill tested in the app.

## 2. Goals & Objectives
- **Centralized Knowledge Base:** Provide a structured library of all 60+ TOEFL Structure skills, Reading strategies, and Listening patterns.
- **Self-Paced E-Learning:** Allow users to study the theory before or after they practice in the Quiz Engine or Writing Gym.
- **Seamless Integration:** Connect theoretical reading directly to practical exercises (e.g., "Read about Subject-Verb Agreement" -> "Take a Quiz on this specific skill").
- **AI Tutor Support:** Integrate an AI Assistant on every documentation page so users can ask for further clarification or more examples if they don't understand the written material.

## 3. Architecture & Structure

### 3.1 Content Organization
The E-Learning Center is categorized by TOEFL Section, then by Skill Topic:

1. **Structure & Written Expression (Grammar)**
   - Sentences with One Clause (Skills 1-5)
   - Sentences with Multiple Clauses (Skills 6-12)
   - Reduced Sentences (Skills 13-14)
   - Inverted Subjects and Verbs (Skills 15-19)
   - Problems with Subject/Verb Agreement (Skills 20-23)
   - Problems with Parallel Structure (Skills 24-26)
   - *...and so on up to Skill 60.*
2. **Reading Comprehension**
   - Questions about the Ideas of the Passage
   - Directly Answered Questions
   - Indirectly Answered Questions
   - Vocabulary Questions
   - Review Questions
3. **Listening Comprehension**
   - Part A: Short Dialogues (Focus on the second line, synonyms, avoid similar sounds, etc.)
   - Part B: Long Conversations
   - Part C: Long Talks
4. **Writing Gym (Essay Dojo & Mason)**
   - Structuring an IELTS/TOEFL Essay
   - Connectors and Logic Weaving
   - Band 9 Vocabulary

### 3.2 Data Schema (Backend Alignment)
The backend `blog` service (`/api/blog/posts`) should serve structured E-Learning modules.

```json
{
  "id": "uuid",
  "skill_id": "string (e.g., 'S1', 'R3', 'L1')",
  "title": "string (e.g., 'Skill 1: Be Sure the Sentence Has a Subject and a Verb')",
  "section": "string (e.g., 'STRUCTURE', 'READING', 'LISTENING')",
  "category": "string (e.g., 'Sentences with One Clause')",
  "content": "string (Markdown format with rich text, tables, and highlighted formulas)",
  "examples": [
    {
      "text": "The boy _____ going to the movies.",
      "options": ["he is", "he always was", "is", "will be"],
      "correct_answer": "is",
      "explanation": "The sentence has a subject 'boy' but is missing a verb. 'is' provides the missing verb."
    }
  ],
  "estimated_read_time": "integer (minutes)",
  "author": "string",
  "published_at": "timestamp",
  "views_count": "integer"
}
```

## 4. UI/UX Design (Mobile-First)

### 4.1 E-Learning Hub (Main Page)
- **Hero Section:** "Your TOEFL Library" with a search bar to quickly find a skill (e.g., "Appositives", "Inversion").
- **Progress Tracking:** Visual indicators showing how many skill documents the user has read.
- **Section Tabs:** Scrollable horizontal tabs (`Structure`, `Reading`, `Listening`, `Writing`).
- **Accordion/Collapsible Lists:** Group skills logically. E.g., clicking "Sentences with One Clause" expands to show Skills 1 to 5.

### 4.2 Document Reader View (Skill Detail Page)
- **Clean Typography:** Optimized for mobile reading (large font size, adequate line height, dark/light mode support).
- **Formula Highlighting:** Key grammar formulas (e.g., `SUBJECT + VERB`) highlighted in colored, rounded boxes.
- **Interactive Examples:** Users can tap to reveal the correct answer and explanation for in-text examples.
- **Floating Action Button (FAB) - Practice Now:** A sticky button at the bottom: "Practice this Skill". Clicking this redirects to the Quiz Engine specifically filtered for this `skill_id`.
- **Floating Action Button (FAB) - AI Tutor:** A button to open a bottom sheet chat interface where the user can chat with the AI about the current article.

## 5. User Flows

### Flow 1: Study then Practice
1. User navigates to the `Blog / E-Learning` tab via the bottom navigation bar.
2. User selects `Structure` -> `Skill 15: Invert the Subject and Verb with Question Words`.
3. User reads the theory, reviews the formulas, and taps on interactive examples to test their understanding.
4. User feels confident and clicks the sticky **"Practice this Skill"** button.
5. System routes user to `QuizView` with a payload enforcing `skillIdOverride: 'S15'`.

### Flow 2: Confused during Reading
1. User is reading `Skill 4: Present Participles`.
2. User is confused about the difference between a verb and an adjective.
3. User taps the **"Ask AI Tutor"** button.
4. A chat drawer opens. The system prompt injects the context: *"The user is currently reading about TOEFL Skill 4: Present Participles."*
5. User asks: "Can you give me 3 more examples?"
6. AI generates custom examples instantly.

### Flow 3: Reviewing Mistakes from Quiz
1. User finishes a Quiz and reviews their mistakes in the **Assessment Report** or **Error Jail**.
2. User sees they failed a question related to `Skill 13: Reduced Relative Clauses`.
3. User clicks the "Learn Theory" button next to the error.
4. System routes the user directly to the E-Learning document for `Skill 13`.

## 6. Implementation Plan & Phases

**Phase 1: Backend & Data Structure**
- Ensure `blog_posts` table in PostgreSQL/SQLite supports `skill_id`, `section`, and `category` fields.
- Create an admin seeder script or Markdown parser to batch-upload all 60 Structure skills into the database.

**Phase 2: Frontend UI Development**
- Refactor `frontend/src/components/blog/BlogList.tsx` into an `ELearningHub.tsx` with section tabs and accordions.
- Refactor `BlogPostView.tsx` into `SkillDocumentReader.tsx` with optimized typography, interactive example blocks, and sticky action buttons.

**Phase 3: Integration (The Glue)**
- Connect the "Practice Now" button to the `useNavigationStore` and Quiz Engine.
- Implement the "Ask AI" bottom sheet using the existing `aiService.ts` and a custom system prompt.
- Update `ErrorJailView.tsx` and `ReportView.tsx` to link back to the `SkillDocumentReader.tsx`.

## 7. Metrics & Analytics
- `doc_viewed`: Track which skills are read most often.
- `doc_practice_clicked`: Conversion rate from reading theory to starting a practice session.
- `doc_ai_tutor_used`: Track how often users need AI assistance to understand a specific skill (helps identify confusing documentation).
- `doc_time_spent`: Average time spent reading a skill.
