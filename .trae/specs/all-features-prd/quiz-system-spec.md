# Quiz System Spec

## Why
Quiz system adalah inti dari aplikasi TOEFL yang harus menyediakan pengalaman seperti test TOEFL sebenarnya dengan question bank yang kaya dan AI-powered question generation untuk unlimited practice.

## What Changes
- 4 Quiz Engines (Reading, Listening, Structure, Written)
- AI Question Generator menggunakan Groq
- Question Bank dengan offline support (IndexedDB)
- Adaptive difficulty berdasarkan performance

## Impact
- Affected specs: Simulation, Practice Hub, Question Bank
- Affected code: `frontend/src/services/groq/*QuizEngine.ts`, `frontend/src/components/QuizView*.tsx`

---

## ADDED Requirements

### Requirement: Quiz Engine Architecture
Each quiz engine SHALL handle its specific question type with proper validation and feedback.

#### Scenario: Reading Quiz Flow
- **GIVEN** user selects Reading practice
- **WHEN** quiz engine loads questions (bank + generated mix)
- **THEN** passage displayed with comprehension questions
- **AND** timer starts (per passage or global)
- **AND** answer validation shows instant feedback

#### Scenario: Listening Quiz Flow
- **GIVEN** user selects Listening practice
- **WHEN** audio plays automatically (after user click)
- **THEN** questions appear after audio completes
- **AND** user cannot replay audio during test mode

#### Scenario: Structure Quiz Flow
- **GIVEN** user selects Structure practice
- **WHEN** sentence completion questions shown
- **THEN** user selects best answer
- **AND** explanation shows after submission

#### Scenario: Written Expression Quiz Flow
- **GIVEN** user selects Written Expression practice
- **WHEN** error identification questions shown
- **THEN** user identifies error in underlined section
- **AND** explanation provided after answer

### Requirement: AI Question Generation
The system SHALL generate questions using Groq AI when question bank is insufficient.

#### Scenario: Hybrid Question Loading
- **GIVEN** user requests quiz
- **WHEN** bank has <50% of requested questions
- **THEN** AI generates remaining questions
- **AND** questions saved to bank for reuse

#### Scenario: AI Generation Failure
- **GIVEN** AI generation fails
- **WHEN** network error or API error
- **THEN** fallback to bank-only questions
- **AND** show toast about limited questions

#### Scenario: Rate Limiting
- **GIVEN** user exceeds API rate limit
- **THEN** circuit breaker activates
- **AND** user sees "Please wait..." with countdown
- **AND** queue continues when limit resets

### Requirement: Question Bank (IndexedDB)
Questions SHALL persist locally for offline access and faster loading.

#### Scenario: Offline Quiz
- **GIVEN** no network connectivity
- **WHEN** user starts quiz
- **THEN** only bank questions loaded
- **AND** user notified "Offline mode"

#### Scenario: Bank Sync
- **GIVEN** network restored
- **WHEN** app detects connectivity
- **THEN** sync new questions to server
- **AND** pull new questions from server

### Requirement: Adaptive Difficulty
Question difficulty SHALL adapt based on user's historical performance.

#### Scenario: Difficulty Adjustment
- **GIVEN** user scores >80% on 5+ questions
- **WHEN** next question loads
- **THEN** difficulty level increases
- **AND** indicator shows "Challenging yourself!"

#### Scenario: Difficulty Decrease
- **GIVEN** user scores <40% on 5+ questions
- **WHEN** next question loads
- **THEN** difficulty level decreases
- **AND** shows "Let's build confidence"

---

## Quiz Mechanics (Best Practice)

### Timer Behavior (per section)
| Section | Default Timer | Per Question (estimated) |
|---------|--------------|---------------------------|
| Reading | 55 min | 72 sec |
| Listening | 40 min | 53 sec |
| Structure | 18 min | 72 sec |
| Written | 18 min | 45 sec |

### CEFR Level Alignment (IELTS-compatible)
| CEFR Level | TOEFL Range | Difficulty 1-100 |
|-----------|------------|------------------|
| A2 | 0-31 | 1-25 |
| B1 | 32-57 | 26-50 |
| B2 | 58-86 | 51-75 |
| C1 | 87-109 | 76-90 |
| C2 | 110-120 | 91-100 |

### Question Types Supported
- Multiple choice (4 options)
- Fill in the blank
- Drag and drop (matching)
- Error identification
- True/False/Not Given

---

## Quiz Views UX Requirements

### Reading View
1. Passage shows with adjustable font size
2. Jump to question numbers
3. "Flag for review" button
4. Countdown timer visible
5. "Review" mode after completion

### Listening View
1. Audio controls (play/pause/replay when allowed)
2. Visual waveform or progress bar
3. Questions appear after audio (or during)
4. Hidden answers option (for exam simulation)
5. Audio quality indicator

### Structure View
1. Question with sentence
2. Blank/underline for answer
3. Options A-D
4. Submit button
5. Explanation on answer

### Written View
1. Highlighted text
2. Error options if multiple errors
3. "No error" option must exist
4. Explanation with grammar rule

---

## Question Bank Schema

### IndexedDB Structure
```
questions {
  id: string (UUID)
  skill_id: number
  section: 'reading' | 'listening' | 'structure' | 'written'
  interaction: 'fill_blank' | 'identify_error' | 'multiple_choice'
  stimulus: {
    text?: string
    audio_url?: string
    passage_id?: string
  }
  prompt: string
  choices: string[]
  correct_response: string[]
  cefr_target: 'A2' | 'B1' | 'B2' | 'C1'
  difficulty_score: number
  metadata: {
    source: 'ai' | 'db' | 'pdf'
    explanation: string
    hints: string[]
    validated_at: string
  }
  created_at: string
  last_used_at: string
  usage_count: number
}
```

### Sync Strategy
1. Load local questions first
2. Background fetch from server
3. Merge with local (server wins on conflict)
4. Cache new questions locally

---

## Performance Targets

### Loading Times (per Quiz Engine)
- Question load from cache: <100ms
- AI generation: <30s timeout
- Audio preload: <5s
- Total quiz init: <3s

### Question Bank Targets
- Minimum questions per section: 500
- Target questions per section: 2000
- Daily new questions: target 100
- Question reuse before regenerate: max 3x

---

## Error Handling

### API Failures
1. Show cached questions if available
2. Toast: "Limited questions available"
3. Retry button for generation
4. Report to analytics if persistent

### Audio Failures
1. Fallback to no-audio mode
2. Show transcript option
3. Log audio load failures
4. Cache audio for retry

---

## Analytics Events

- `quiz_started` - User begins quiz
- `quiz_completed` - User finishes quiz
- `quiz_question_answered` - Each answer
- `quiz_flagged` - Question flagged
- `quiz_skipped` - Question skipped
- `quiz_time_expired` - Timer ran out
- `ai_generation_success` - AI question created
- `ai_generation_error` - AI failed
- `question_bank_loaded` - Questions from cache