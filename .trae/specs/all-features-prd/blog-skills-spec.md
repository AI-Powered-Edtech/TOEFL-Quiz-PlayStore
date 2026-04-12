# Blog & Skills Spec

## Why
Blog dan Skill Modules menyediakan konten edukasi untuk self-paced learning. Kedua fitur ini memperkaya pengalaman pengguna dengan materi belajar di luar quiz.

## What Changes
- Blog System (artikel edukasi)
- Skill Module System (structured learning)
- Skill Modules dengan AI Chat

## Impact
- Affected specs: Dashboard, Practice Hub
- Affected code: `frontend/src/components/blog/*`, `frontend/src/components/modules/*`

---

## ADDED Requirements

### Requirement: Blog System
The system SHALL provide educational articles.

#### Blog Categories
1. **Structure** - Grammar concepts
2. **Listening** - Listening tips
3. **Reading** - Reading strategies
4. **Writing** - Writing guides
5. **General** - Study tips, motivation

#### Blog Features
1. Listing by category
2. Search
3. Bookmark
4. Share
5. Related skills

#### Scenario: Browse Blog
- **GIVEN** user opens blog
- **WHEN** articles loaded
- **THEN** shows recent posts
- **AND** category filters

#### Scenario: Read Article
- **GIVEN** user selects article
- **WHEN** article loads
- **THEN** shows full content
- **AND** related skills at bottom

#### Scenario: Share Article
- **GIVEN** reading article
- **WHEN** clicks share
- **THEN** generates shareable link
- **AND** can copy/link

### Requirement: Skill Module System
The system SHALL provide structured skill learning modules.

#### Module Structure
1. **Skill List** - Browse skills
2. **Skill Reader** - Read skill content
3. **Practice Link** - Practice related quiz
4. **Progress Tracking** - Track completed

#### Skill Categories
- Grammar (structure)
- Vocabulary
- Reading Comprehension
- Listening Strategies
- Writing Techniques
- Speaking Tips

#### Scenario: Browse Skills
- **GIVEN** user opens skill list
- **WHEN** skills loaded
- **THEN** shows available skills
- **AND** completion status

#### Scenario: Read Skill
- **GIVEN** selects skill
- **WHEN** skill content shown
- **THEN** clear explanations
- **AND** examples provided

#### Scenario: Practice from Skill
- **GIVEN** reading skill
- **WHEN** views practice link
- **THEN** starts relevant quiz
- **AND** skill progress saved

### Requirement: AI Chat in Skills
The system SHALL provide AI tutor for skill questions.

#### AI Chat Features
1. Ask questions about skill
2. Get explanations
3. Example requests
4. Socratic prompting

#### Scenario: Ask AI
- **GIVEN** viewing skill
- **WHEN** opens AI chat
- **AND** types question
- **THEN** AI responds
- **AND** links to content

---

## Content Management

### Blog Post Schema
```json
{
  "id": "string",
  "title": "string",
  "content": "string (markdown)",
  "category": "string",
  "skills": "string[]",
  "author": "string",
  "published_at": "string",
  "views": "number",
  "estimated_read": "minutes"
}
```

### Skill Module Schema
```json
{
  "id": "string",
  "name": "string",
  "category": "string",
  "level": "A2|B1|B2|C1",
  "content": "string (markdown)",
  "examples": "Example[]",
  "practice_skill_id": "string",
  "order": "number"
}
```

---

## Content Guidelines

### Quality Standards
1. Accurate information (checkable)
2. Proper sources cited
3. Examples relevant
4. CEFR appropriate language
5. Updated regularly

### Moderation
1. Content review before publish
2. Flag inappropriate
3. Update outdated
4. Remove low quality

---

## Analytics Events

- `blog_view` - Article viewed
- `blog_share` - Article shared
- `blog_bookmark` - Article bookmarked
- `skill_module_view` - Module viewed
- `skill_module_complete` - Module read
- `skill_practice_start` - Practice started
- `ai_chat_query` - AI asked