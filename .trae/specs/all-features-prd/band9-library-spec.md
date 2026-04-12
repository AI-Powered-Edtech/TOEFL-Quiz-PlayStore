# Band 9 Library Spec

## Why
Band 9 Library adalah koleksi essay/model answers yang membantu学生学习 high-scoring essays. Fitur ini membedakan TOEFL Quiz dari kompetitor dengan "library" approach.

## What Changes
- Model Essay Library
- Band 9 Reading/Annotations
- Essay Browser & Search
- Save to Collection

## Impact
- Affected specs: Writing Gym, Peer Review
- Affected code: `frontend/src/components/writingGym/band9Library/*`, `frontend/src/services/band9LibraryService.ts`

---

## ADDED Requirements

### Requirement: Model Essay Library
The system SHALL provide curated high-scoring essays.

#### Collection Sources
1. **AI Generated** - Validated by rubric
2. **Curated** - Manually selected
3. **Community** - Community submissions (verified)

#### Essay Metadata
- Topic category
- Task type (Task 1 / Task 2)
- Band score
- Word count
- Date added
- Views/Saves count

#### Scenario: Browse Essays
- **GIVEN** user opens library
- **WHEN** essays loaded
- **THEN** sorted by newest/popular
- **AND** filters available

#### Scenario: Filter by Band
- **GIVEN** user selects band filter
- **WHEN** filter applied
- **THEN** shows only selected band essays

### Requirement: Essay Reading Experience
The system SHALL provide rich reading experience with interactivity.

#### Annotation Types
1. **Grammar** - Highlight grammar features
2. **Vocabulary** - Highlight word choices
3. **Coherence** - Show paragraph flow
4. **Technique** - Show writing techniques

#### Scenario: Click for Definition
- **GIVEN** vocabulary highlighted
- **WHEN** user clicks word
- **THEN** definition popup shown
- **AND** example sentence

#### Scenario: Vocabulary Collection
- **GIVEN** user clicks "Save word"
- **WHEN** word saved
- **THEN** added to personal collection
- **AND** can review later

### Requirement: Essay Browser
The system SHALL provide advanced search and filtering.

#### Search Capabilities
1. Full text search
2. Topic search
3. Band score search
4. Word count range

#### Scenario: Search
- **GIVEN** user types search
- **WHEN** results shown
- **THEN** real-time filtering
- **AND** highlights found items

### Requirement: Save and Collection
Users SHALL save essays to personal collection.

#### Scenario: Save Essay
- **GIVEN** viewing essay
- **WHEN** clicks "Save"
- **THEN** added to saved collection
- **AND** can access offline

#### Scenario: View Collection
- **GIVEN** user has saved essays
- **WHEN** opens collection
- **THEN** shows all saved
- **AND** can remove

---

## Band Score Standards (IELTS)

### Band 9 (Expert)
- Fully appropriate response
- Complete flexibility
- Very wide vocabulary
- Perfect accuracy

### Band 8 (Very Good)
- Well-developed response
- Slight inaccuracies only
- Wide vocabulary
- Good coherence

### Band 7 (Good)
- Effective but not perfect
- Some errors
- Good range
- Generally clear

---

## Library UX Requirements

### Essay Card
1. Task type badge
2. Band score badge
3. Topic preview
4. Word count
5. Views/Saves icon
6. Quick actions (view, save)

### Reader View
1. Clean reading area
2. Annotation panel toggle
3. Font size controls
4. Progress indicator
5. Next/Previous

### Vocabulary Panel
1. Saved words list
2. CEFR level shown
3. Flashcard mode
4. Export option

---

## Content Sourcing

### AI Generation Guidelines
1. Generate with rubric alignment
2. Include breakdown annotations
3. Vary topics and styles
4. Target band distribution:
   - Band 9: 10%
   - Band 8: 20%
   - Band 7: 30%
   - Band 6: 40%

### Curation Standards
1. Source from Cambridge essays
2. Expert written
3. Properly annotated > **Reason**: Quality verified

### Community Submissions
1. Require peer review (3+ positive)
2. Band score verified
3. Author consent for display

---

## Performance Targets

- Page load: <2s
- Search: <500ms
- Save: <200ms
- Annotations render: <100ms

---

## Analytics Events

- `library_essay_view` - Essay viewed
- `library_search` - Search performed
- `library_filter` - Filter applied
- `library_save` - Essay saved
- `library_unsave` - Essay unsaved
- `library_vocab_save` - Vocab saved
- `library_collection_view` - Collection viewed