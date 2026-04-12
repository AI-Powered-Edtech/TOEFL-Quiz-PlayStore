# Score Oracle Spec

## Why
Score Oracle menyediakan prediksi skor TOEFL/IELTS berdasarkan aktivitas pengguna. Fitur ini penting untuk motivation dan tracking progress terhadap target score.

## What Changes
- TOEFL PBT/iBT/ITP prediction
- IELTS prediction
- Confidence levels
- Breakdown per section
- Smart recommendations

## Impact
- Affected specs: Dashboard, Learning Path
- Affected code: `frontend/src/components/ScoreOracleView.tsx`, `frontend/src/services/oracleDataService.ts`

---

## ADDED Requirements

### Requirement: Score Prediction
Sistem memprediksi skor berdasarkan aktivitas.

#### Supported Test Types
- **TOEFL PBT**: 310-677
- **TOEFL iBT**: 0-120
- **TOEFL ITP**: 210-677
- **IELTS**: 1-9 (half bands)

#### Prediction Algorithm
```
Predicted Score = f(
  quizzes_completed,
  avg_accuracy_per_section,
  writing_gym_stars,
  total_activities,
  time_since_last_activity
)
```

#### Confidence Levels
| Data Points | Confidence |
|-----------|-----------|
| <5 | Low (show confidence warning) |
| 5-20 | Medium |
| >20 | High |

#### Scenario: First Prediction
- **GIVEN** new user with <10 activities
- **WHEN** views Oracle
- **THEN** shows "Keep practicing for accurate prediction"
- **AND** confidence marked as Low

#### Scenario: Mature Prediction
- **GIVEN** user with 50+ activities
- **WHEN** views Oracle
- **THEN** shows predicted score with confidence
- **AND** breakdown by section

### Requirement: Score Breakdown
Setiap prediksi menyertakan breakdown per section.

#### TOEFL PBT Breakdown
- Listening (31 questions)
- Structure (25 questions)
- Written Expression (40 questions)
- Reading (50 questions)

#### IELTS Breakdown
- Listening (40 items)
- Reading (40 items)
- Writing (2 tasks)
- Speaking (4 tasks) - optional

#### Scenario: Section Breakdown
- **GIVEN** user views Oracle
- **WHEN** clicks "View breakdown"
- **THEN** shows per-section predictions
- **AND** highlights weakest areas

### Requirement: Recommendations
Oracle menyediakan rekomendasi spesifik untuk improvement.

#### Recommendation Types
1. **Weak Skill Focus** - Practice specific skills where weak
2. **Practice More** - Need more data points
3. **Ready for Test** - Prediction confidence is high

#### Scenario: Weak Area Recommendation
- **GIVEN** structure accuracy <50%
- **WHEN** Oracle generates tips
- **THEN** recommends specific structure skills
- **AND** links to practice

#### Scenario: Test Readiness
- **GIVEN** prediction confidence High
- **AND** prediction within target range
- **WHEN** user views Oracle
- **THEN** shows "Ready for test" message
- **AND** suggests booking test

---

## Prediction Validation

### Score Ranges (from research)
| TOEFL iBT | TOEFL PBT | IELTS | Description |
|-----------|----------|-------|------------|
| 118-120 | 673-677 | 9 | Expert |
| 110-117 | 627-672 | 8 | Very Good |
| 92-109 | 560-626 | 7 | Good |
| 72-91 | 460-559 | 6 | Competent |
| 56-71 | 393-459 | 5 | Modest |
| 40-55 | 310-392 | 4 | Limited |
| <40 | <310 | <4 | Extremely Limited |

### Accuracy Metrics
- Target prediction accuracy: ±5 points
- Target confidence calibration: 80%+ for High confidence

---

## Oracle UX Requirements

### Main Display
1. Large predicted score
2. Confidence indicator
3. Target score input
4. Progress to target
5. Last updated

### Detailed View
1. Score history chart
2. Section breakdown
3. Activity timeline
4. Predicted date to target

### Recommendations Panel
1. Prioritized recommendations
2. Actionable links
3. Expected impact

---

## Data Collection

### Required Data Points
- Quiz results (section, score, date)
- Writing Gym progress (total stars)
- Essay submissions (scores if evaluated)
- Session duration
- Streak information

### Privacy
- Data stays in app/Supabase
- No external sharing
- Delete on account deletion

---

## Analytics Events

- `oraclePredictionView` - User viewed prediction
- `oracleScoreUpdated` - New prediction calculated
- `oracleTargetSet` - Target score set
- `oracleRecommendationClick` - Clicked recommendation
- `oracleConfidenceChange` - Confidence changed