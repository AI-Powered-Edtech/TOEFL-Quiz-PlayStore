# Learning Path Spec

## Why
Learning Path memberikan AI-guided progression untuk membantu pengguna fokus pada area yang perlu diperbaiki berdasarkan data performance mereka.

## What Changes
- AI-recommended learning path
- Today's Focus recommendation
- Weak area identification
- Progress tracking

## Impact
- Affected specs: Dashboard, Score Oracle
- Affected code: `frontend/src/components/LearningPath.tsx`, `frontend/src/services/todaysFocusService.ts`

---

## ADDED Requirements

### Requirement: Learning Path
The system SHALL generate personalized learning recommendations.

#### Path Components
1. **Current Level** -用户的 level
2. **Recommended Skills** - Skills to focus
3. **Practice Order** - Suggested sequence
4. **Expected Outcome** - Target improvement

#### Path Generation
```
Path = f(
  weak_areas,
  target_score,
  time_available,
  skill_difficulty
)
```

#### Scenario: Generate Path
- **GIVEN** user has performed activities
- **WHEN** generates learning path
- **THEN** ordered recommendations shown
- **AND** explanations provided

### Requirement: Today's Focus
The system SHALL provide daily recommendations.

#### Focus Features
1. One main recommendation
2. Time estimation
3. Quick action button
4. Progress indicator

#### Scenario: Daily Recommendation
- **GIVEN** user opens app
- **WHEN** today's focus shown
- **THEN** based on weakest skill
- **AND** actionable

### Requirement: Weak Area Identification
Sistem mengidentifikasi area lemah berdasarkan performance.

#### Analysis Method
1. Compare section accuracies
2. Error pattern analysis
3. Skill breakdown
4. Trend over time

#### Scenario: Identify Weak Area
- **GIVEN** user completes quizzes
- **WHEN** analysis runs
- **THEN** show weakest areas
- **AND** suggest practice

---

## Path UX Requirements

### Path View
1. Visual path diagram
2. Current position
3. Upcoming skills
4. Progress to target

### Today's Focus Card
1. Skill name
2. Estimated time
3. Difficulty
4. "Start" button
5. Skip option

### Action Buttons
1. Start Practice
2. Save for Later
3. View Path
4. Adjust Target