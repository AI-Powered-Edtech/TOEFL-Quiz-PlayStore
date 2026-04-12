# Peer Review Spec

## Why
Peer review memungkinkan siswa mendapat feedback dari multiple reviewers dan melatih skill evaluate judgement. System ini membedakan TOEFL Quiz dengan platform kompetitor.

## What Changes
- Essay submission queue system
- Structured review interface with rubrics
- Reviewer tier system (Novice → Master)
- Inline corrections
- Review quality tracking

## Impact
- Affected specs: Writing Gym, Band 9 Library
- Affected code: `frontend/src/components/peerReview/*`, `frontend/src/services/peerReviewService.ts`

---

## ADDED Requirements

### Requirement: Essay Submission Queue
The system SHALL maintain a queue of essays for peer review with fair distribution.

#### Scenario: Submit Essay for Review
- **GIVEN** user has written essay
- **WHEN** submits for peer review
- **THEN** essay added to queue
- **AND** status set to "pending"
- **AND** expiry timer starts (24 jam)

#### Scenario: Queue Position
- **GIVEN** essay in queue
- **WHEN** user views queue
- **THEN** shows position and estimated wait
- **AND** filter by band score, task type

#### Scenario: Essay Expiry
- **GIVEN** 24 hours passed
- **WHEN** no reviewer claimed
- **THEN** essay status "expired"
- **AND** user can resubmit

### Requirement: Review Claim System
The system SHALL assign essays to reviewers with capacity management.

#### Scenario: Claim Essay
- **GIVEN** reviewer with available slots
- **WHEN** clicks "Claim"
- **THEN** essay assigned to reviewer
- **AND** status "in_review"
- **AND** countdown starts (1 jam)

#### Scenario: Claim Limit
- **GIVEN** reviewer at capacity (3 active)
- **WHEN** tries to claim more
- **THEN** button disabled
- **AND** shows "Complete pending reviews first"

### Requirement: Review Interface
Reviewers SHALL provide structured feedback using IELTS rubrics.

#### Scenario: Review Scoring
- **GIVEN** essay displayed
- **WHEN** reviewer scores
- **THEN** provide scores (1-9) for:
  - Task Response
  - Coherence & Cohesion
  - Lexical Resource
  - Grammatical Range
  - Overall Band

#### Scenario: Inline Corrections
- **GIVEN** text selected
- **WHEN** reviewer clicks correction
- **THEN** original shown with correction
- **AND** comment added

#### Scenario: Strengths & Weaknesses
- **GIVEN** reviewer completes scoring
- **WHEN** submits review
- **THEN** provides:
  - What worked well (strengths)
  - What to improve (weaknesses)
  - Suggestions for improvement

#### Scenario: Final Comment
- **GIVEN** all scoring done
- **WHEN** reviewer submits
- **THEN** summarize in final comment
- **AND** "Describe-Evaluate-Suggest" format

### Requirement: Reviewer Tier System
The system SHALL recognize active reviewers with tier progression.

#### Tier Progression (from research best practices)
| Tier | Reviews Required | Badge | Bonus |
|------|---------------|-------|-------|
| Novice | 0-9 | 🌱 | None |
| Helper | 10-49 | 🌿 | +10% XP |
| Mentor | 50-199 | 🌳 | +25% XP |
| Expert | 200-499 | ⭐ | +50% XP |
| Master | 500+ | 👑 | +100% XP |

#### Scenario: Tier Upgrade
- **GIVEN** reviewer completes required reviews
- **WHEN** threshold reached
- **THEN** tier upgraded
- **AND** notification shown
- **AND** bonus applied

#### Scenario: Tier Benefits
- **GIVEN** higher tier reviewer
- **WHEN** reviews submitted
- **THEN** XP bonus applied
- **AND** shown in profile badge

### Requirement: Review Quality
The system SHALL track review quality and mentor reviewers.

#### Scenario: Quality Check
- **GIVEN** review submitted
- **WHEN** author rates helpfulness
- **THEN** quality score updated
- **AND** affects reviewer tier

#### Scenario: Helpfulness Rating
- **GIVEN** author receives review
- **WHEN** reviews rated
- **THEN** can rate 1-5 helpfulness
- **AND** optional comment

---

## Peer Review UX Requirements

### Submission Form
1. Clear instructions
2. Word count validation (min 150 for Task 1, 250 for Task 2)
3. Task type selector (Task 1 / Task 2)
4. Anonymous toggle
5. Preview before submit

### Queue Filters
- Filter by band score range
- Filter by task type
- Filter by status (pending/in_review/completed)
- Sort by newest/oldest

### Review Interface
1. Essay with comfortable reading mode
2. Rubric on right panel
3. Inline correction toolbar
4. Progress indicator
5. Submit confirmation

### Post-Review
1. Notification of new review
2. View all received reviews
3. Rate reviewer
4. Reply to reviewer
5. Request re-review (if poor quality)

---

## Review Quality Standards (Best Practice from Research)

### Minimum Review Requirements
1. All 4 rubric scores given
2. At least 2 inline corrections (if applicable)
3. Strength and weakness each (min 20 chars)
4. Final comment (min 50 chars)
5. Helpfulness rating (required)

### Review Training Progression
| Stage | Focus | Examples |
|-------|-------|---------|
| 1 | Familiarization | "Good job!", "Nice essay" |
| 2 | Clarification | "Can you explain more?" |
| 3 | Enrichment | Specific improvements |

### Review Guidelines (to show reviewers)
1. Be constructive - focus on improvement
2. Use IELTS band descriptors
3. Give specific examples
4. Suggest actionable changes
5. Maintain respectful tone

---

## Queue Management

### Priority System
1. Longer wait → higher priority
2. Higher tier reviewers → more visible
3. Past expiry → auto-requeue

### Active Review Limits
- Max active reviews per reviewer: 3
- Review time limit: 1 jam (auto-release)
- Daily review limit: 10

### Matching Algorithm
- Band score ± 1 (to ensure capable reviewers)
- Task type match required
- Prefer different reviewers (no repeat)

---

## Error Handling

### Review Not Started
- **GIVEN** claim but no submission after 1 jam
- **THEN** auto-release
- **AND** warning to reviewer

### Poor Quality Review
- **GIVEN** author rates 1/5 helpfulness
- **WHEN** flag as poor
- **THEN** second review assigned
- **AND** reviewer gets warning

### Expired Review
- **GIVEN** essay expired without review
- **WHEN** status checked
- **THEN** auto-requeue
- **AND** notify original author

---

## Analytics Events

- `peer_review_submit` - Essay submitted
- `peer_review_claim` - Review claimed
- `peer_review_complete` - Review submitted
- `peer_review_rating` - Author rated review
- `peer_review_flag` - Flagged as poor
- `peer_review_expired` - Review expired
- `peer_review_helpful` - Average helpfulness
- `peer_review_tier_upgrade` - Tier advanced