# Writing Gym Spec

## Why
Writing Gym adalah suite lengkap untuk latihan menulis IELTS/TOEFL dengan 8+ level progresif. Fitur ini membedakan TOEFL Quiz dari kompetitor lain dengan gamified writing practice.

## What Changes
- Mason Level (drag-drop sentence building)
- Logic Weaver Level (connector practice)
- IELTS Paragraph Builder (step-by-step)
- IELTS Writing Simulation (full test)
- Integrated Writing Task
- Academic Discussion Task
- Complexity Ladder (sentence improvement)
- Devil's Advocate (argument practice)

## Impact
- Affected specs: Practice Hub, Band 9 Library, Essay Evaluation
- Affected code: `frontend/src/components/writingGym/*`, `frontend/src/services/writingGymService.ts`

---

## ADDED Requirements

### Requirement: Mason Level (Sentence Building)
The system SHALL provide drag-drop sentence construction exercises.

#### Scenario: Drag Word to Target
- **GIVEN** scrambled words displayed
- **WHEN** user drags word to correct position
- **THEN** word snaps to position
- **AND** visual feedback shows correct/incorrect
- **AND** hint available after 2 wrong attempts

#### Scenario: Complete Sentence
- **GIVEN** all words placed correctly
- **WHEN** user clicks "Check"
- **THEN** full sentence evaluation
- **AND** stars awarded (1-3 based on attempts)

#### Scenario: Puzzle Mode
- **GIVEN** user selects puzzle level
- **WHEN** pieces are scrambled
- **THEN** user must assemble in correct order
- **AND** pieces connect visually

### Requirement: Logic Weaver Level (Connectors)
The system SHALL practice sentence linking with connectors.

#### Scenario: Select Connector
- **GIVEN** two sentence clauses shown
- **WHEN** user selects connector
- **AND** places in correct position
- **THEN** sentence is validated
- **AND** explanation provided

#### Scenario: Multiple Connector Options
- **GIVEN** complex sentence with multiple blanks
- **WHEN** user fills all blanks
- **THEN** full sentence validated
- **AND** feedback on each connector choice

### Requirement: IELTS Paragraph Builder
The system SHALL guide users through step-by-step IELTS writing.

#### Scenario: Step Progression
- **GIVEN** task prompt displayed
- **WHEN** user completes step 1 (thesis)
- **THEN** transition to step 2 (argument)
- **AND** previous shown for reference

#### Scenario: Band Level Feedback
- **GIVEN** user submits paragraph
- **WHEN** AI evaluates
- **THEN** feedback shows band level
- **AND** suggestions per criteria

### Requirement: IELTS Writing Simulation
The system SHALL simulate full IELTS Writing test conditions.

#### Scenario: Task 1 (Data Description)
- **GIVEN** chart/table/graph displayed
- **WHEN** timer starts (20 min)
- **THEN** user writes response
- **AND** word count updates live

#### Scenario: Task 2 (Essay)
- **GIVEN** prompt displayed
- **WHEN** timer starts (40 min)
- **THEN** user writes essay
- **AND** structured feedback provided

#### Scenario: AI Evaluation
- **GIVEN** user submits essay
- **WHEN** AI evaluates
- **THEN** band score provided
- **AND** breakdown by IELTS criteria:
  - Task Response (25%)
  - Coherence & Cohesion (25%)
  - Lexical Resource (25%)
  - Grammatical Range & Accuracy (25%)

### Requirement: Integrated Writing (TOEFL iBT)
The system SHALL replicate TOEFL iBT Integrated Writing task.

#### Scenario: Reading Phase
- **GIVEN** academic passage displayed
- **WHEN** user reads passage
- **AND** notes key points
- **THEN** proceed to lecture

#### Scenario: Listening Phase
- **GIVEN** lecture audio plays
- **WHEN** user listens
- **AND** takes notes
- **THEN** proceed to writing

#### Scenario: Writing Response
- **GIVEN** based on notes and passage
- **WHEN** user writes response
- **AND** timer shows remaining
- **THEN** AI evaluates summary quality

### Requirement: Academic Discussion (IELTS)
The system SHALL simulate academic discussion task.

#### Scenario: Professor Prompt
- **GIVEN** question displayed
- **WHEN** user reads prompt
- **THEN** shows 3 student responses

#### Scenario: Student Response Analysis
- **GIVEN** three responses shown
- **WHEN** user analyzes each
- **THEN** user forms own response
- **AND** evaluates others

### Requirement: Complexity Ladder
The system SHALL improve sentence complexity progressively.

#### Scenario: Level Progression
- **GIVEN** simple sentence shown
- **WHEN** user transforms to complex
- **THEN** AI scores improvement
- **AND** suggests further improvements

#### Scenario: History Tracking
- **GIVEN** user completes levels
- **WHEN** viewing history
- **THEN** shows progression over time
- **AND** tracks learned patterns

### Requirement: Devil's Advocate
The system SHALL train argumentation and defense.

#### Scenario: Counter-Point Detection
- **GIVEN** user argument submitted
- **WHEN** AI analyzes
- **THEN** identifies counter-points
- **AND** suggests logical fallacies

#### Scenario: Defense Writing
- **GIVEN** counter-point given
- **WHEN** user writes defense
- **THEN** AI scores defense quality
- **AND** feedback on logic

---

## Writing Gym Hub UX Requirements

### Navigation
1. Clear level selection grid
2. Progress indicators per level
3. Unlock requirements shown
4. "Continue" from last position

### Level Unlock Logic
| Level | Prerequisite |
|-------|--------------|
| Mason | Default unlocked |
| Logic Weaver | Mason 3 stars |
| IELTS Paragraph | Logic Weaver 3 stars |
| Complexity Ladder | Any 2 stars |
| Devil's Advocate | IELTS Paragraph 2 stars |
| Integrated Writing | IELTS Paragraph 2 stars |
| Academic Discussion | Integrated Writing 2 stars |
| IELTS Writing Sim | Academic Discussion 2 stars |

### Progress Display
- Current level highlighted
- Stars earned per exercise
- Total XP
- Streak counter
- Best time

---

## Mason Level Detailed Spec

### Exercise Types
1. **Word Ordering** - Drag words to form sentence
2. **Puzzle Fit** - Assemble sentence pieces
3. **Error Fix** - Drag correct word to replace error
4. **Word Bank** - Select from available words

### Scoring
- 3 stars: First attempt correct
- 2 stars: 2-3 attempts
- 1 star: 4+ attempts (but completed)
- 0 stars: Not completed

### Feedback
- Green highlight: Correct placement
- Red highlight: Incorrect placement
- Shake animation: Wrong answer
- Confetti: Perfect (3 stars)

---

## Essay Evaluation Criteria (per IELTS Standards)

### Overall Band Calculation
```
Task Response × 0.25 + Coherence × 0.25 + Lexical × 0.25 + Grammar × 0.25
```

### Band Descriptors (simplified)
| Band | Description |
|------|------------|
| 9 | Expert user - fully appropriate |
| 8 | Very good - minor inaccuracies |
| 7 | Good - effective with some errors |
| 6 | Competent - some errors |
| 5 | Modest - frequent errors |
| 4 | Limited - many errors |
| 3 | Extremely limited - severe limitations |
| 2 | Intermittent - only basic words |
| 1 | Cannot use English |
| 0 | Did not attempt |

### Feedback Breakdown per Criteria
- Task Response: Topic relevance, idea development
- Coherence: Paragraph flow, transitions
- Lexical: Vocabulary range, collocations
- Grammar: Sentence variety, accuracy

---

## Technical Requirements

### Timer Implementation
- Use Web Workers for accuracy
- Persist timer in localStorage
- Recover from background
- Alert at 5 min, 1 min remaining

### Word Count
- Real-time counting
- Per-category breakdown (adjectives, verbs, etc.)
- Repetition warning

### Progress Saving
- Auto-save every 30 seconds
- Save on page blur
- Recover on crash/close

---

## Analytics Events

- `mason_exercise_start` - Exercise begun
- `mason_exercise_complete` - Exercise done
- `mason_stars_earned` - Stars awarded
- `logic_weaver_start` - Connector practice
- `ielts_paragraph_start` - Paragraph builder
- `ielts_sim_start` - Full simulation
- `ielts_essay_submit` - Essay submitted
- `ielts_evaluation_complete` - AI evaluation done
- `integrated_start` - Integrated task
- `academic_discussion_start` - Discussion task
- `complexity_ladder_level` - Level attempted
- `devils_advocate_start` - Argument practice
- `gym_progress_unlock` - New level unlocked