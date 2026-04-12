# Simulation Spec

## Why
Simulation memungkinkan pengguna merasakan pengalaman seperti tes TOEFL/iBT sebenarnya dengan timer realistis dan section order yang mengikuti format resmi.

## What Changes
- Full IBT-Style Simulation dengan section order sebenarnya
- Custom Simulation dengan konfigurasi kustom
- CEFR Simulation (A2-C1 level-based)
- Adaptive difficulty

## Impact
- Affected specs: Quiz System, Dashboard
- Affected code: `frontend/src/components/SimulationView.tsx`, `frontend/src/components/CefrSimulationView.tsx`

---

## ADDED Requirements

### Requirement: Full IBT Simulation
Simulasi penuh mengikuti format TOEFL iBT sebenarnya.

#### Section Order (TOEFL iBT Official)
1. **Reading** - 54-72 menit (2-3 passages)
2. **Listening** - 41-57 menit (4-6 lectures/conversations)
3. **Break** - 2 menit
4. **Speaking** - 17 menit (6 tasks) [optional untuk TOEFL Quiz]
5. **Writing** - 50 menit (2 tasks) [optional]

**Untuk TOEFL Quiz (PBT-style fokus):**
1. Reading (55 min)
2. Listening (40 min)
3. Structure + Written (25 min)

#### Scenario: Full Simulation Start
- **GIVEN** user selects Full Simulation
- **WHEN** instructions shown
- **THEN** user understands format
- **AND** clicks "Start"

#### Scenario: Section Transition
- **GIVEN** section A completed
- **WHEN** timer expires or user submits
- **THEN** automatic transition to section B
- **AND** break timer if applicable

#### Scenario: Section Review
- **GIVEN** within section time
- **WHEN** user clicks "Review"
- **THEN** shows answered/unanswered flags
- **AND** can jump to questions

### Requirement: Custom Simulation
Pengguna bisa konfigurasi simulation sesuai kebutuhan.

#### Configuration Options
- **Reading**: 10-50 questions
- **Listening**: 10-50 questions
- **Structure**: 5-15 questions
- **Written**: 5-25 questions
- **Timer**: Custom per section

#### Scenario: Custom Config
- **GIVEN** user clicks "Custom"
- **WHEN** sliders shown
- **THEN** configure each section
- **AND** start button enabled

### Requirement: Adaptive Difficulty
Difficulty menyesuaikan berdasarkan performance.

#### Difficulty Levels
| Level | Target Accuracy | Question Difficulty |
|-------|--------------|--------------------|
| Easy | >80% | 1-35 |
| Medium | 45-80% | 36-65 |
| Hard | <45% | 66-100 |

#### Scenario: Auto Adjustment
- **GIVEN** 5+ questions answered
- **WHEN** accuracy calculated
- **THEN** difficulty auto-adjusts
- **AND** indicator shows level

### Requirement: Timer Management
Timer harus akurat dan reliable.

#### Timer Behavior
1. Web Worker untuk akurasi (tidak terpengaruh tab background)
2. localStorage persistence ( recovers on refresh)
3. Warning sounds at 5 min, 1 min
4. Auto-submit on expiry

#### Scenario: Background Timer
- **GIVEN** user switches tabs
- **WHEN** returns to app
- **THEN** timer shows correct remaining time
- **AND** no time lost

#### Scenario: Page Refresh
- **GIVEN** page refreshes during simulation
- **WHEN** page reloads
- **THEN** timer resumes from saved state
- **AND** progress restored

---

## Simulation UX Requirements

### Landing Page
1. Clear description of each simulation type
2. Best score if previously completed
3. Estimated time
4. Quick start vs Custom toggle

### Instructions Screen
1. Section order explanation
2. Timer behavior
3. Navigation instructions
4. Break schedule
5. "Ready to start" checkbox

### Active Section
1. Timer prominently displayed
2. Question counter (e.g., "12/50")
3. Progress bar
4. "Flag" button per question
5. "Review" button
6. "End Section" (with confirmation)

### Break Screen
1. Time remaining to next section
2. Section summary
3. Nutrition tips (study breaks)
4. "Skip break" option

### Results Screen
1. Score per section
2. Total score
3. Time per section
4. Accuracy per skill
5. Comparison to previous
6. "Review answers" option
7. "Practice Weak Areas" CTA

---

## CEFR Simulation Spec

### Level Distribution
| CEFR | TOEFL Range | Question Count |
|-----|-----------|-----------------|
| A2 | 0-31 | 10 |
| B1 | 32-57 | 20 |
| B2 | 58-86 | 30 |
| C1 | 87-109 | 40 |
| C2 | 110-120 | 50 |

#### Scenario: CEFR Level Selection
- **GIVEN** user selects CEFR level
- **WHEN** simulation starts
- **THEN** appropriate level questions shown
- **AND** explanation includes CEFR context

---

## Performance Targets

### Timer Accuracy
- Max drift per hour: <1 second
- Background handling: Perfect
- Recovery on refresh: 100%

### Loading Times
- Section load: <2s
- Audio preload: <5s
- Results calculation: <1s

---

## Analytics Events

- `simulation_start` - Simulation begun
- `simulation_section_complete` - Section done
- `simulation_break_start` - Break started
- `simulation_break_skip` - Break skipped
- `simulation_complete` - Full sim done
- `simulation_custom_config` - Custom config used
- `simulation_adaptive_change` - Difficulty changed