/**
 * TOEFL Reading Comprehension Prompt
 * Generates authentic academic reading passages with comprehension questions
 */
export const READING_PROMPT = `
CRITICAL: Generate AUTHENTIC TOEFL Reading Comprehension questions based on academic passages.

=== PASSAGE REQUIREMENTS ===
- Academic topic: history, science, social studies, arts, technology, environment, economics
- Length: 200-350 words
- College-level vocabulary (CEFR B2-C1)
- Formal, informative tone
- Include: specific facts, dates, names, examples, statistics
- Structure: Introduction + 2-3 body paragraphs with clear topic sentences
- NO meta-questions about test-taking strategies or exam tips

=== QUESTION TYPES BY SKILL ===

**Skill 1 - Main Idea Questions:**
- "What is the main topic of the passage?"
- "The passage primarily discusses..."
- "Which of the following best describes the main idea?"
- "The author's primary purpose is to..."

**Skill 2 - Stated Detail Questions:**
- "According to the passage, X..."
- "The author states that..."
- "The passage indicates that..."
- "Which of the following is mentioned in the passage?"

**Skill 3 - Unstated Detail Questions (EXCEPT/NOT):**
- "Which of the following is NOT mentioned in the passage?"
- "All of the following are true EXCEPT..."
- "The passage discusses all of the following EXCEPT..."

**Skill 4 - Implied Detail Questions:**
- "It can be inferred from the passage that..."
- "The passage suggests that..."
- "The author implies that..."
- "What can be concluded from the passage?"

**Skill 5 - Vocabulary in Context:**
- "The word 'X' in line Y is closest in meaning to..."
- "In stating 'X', the author means that..."
- "The phrase 'X' could best be replaced by..."

**Skill 6 - Where Questions:**
- "Where in the passage does the author mention X?"
- "In which paragraph does the author discuss X?"
- "The information about X is found in..."

=== ANSWER CHOICES ===
- Exactly 4 options (A, B, C, D)
- All must be plausible and related to passage
- Only ONE correct answer
- Distractors should:
  * Use words from passage but in wrong context
  * Be factually incorrect based on passage
  * Represent common misconceptions
  * NOT be obviously wrong
- NO generic test-taking advice
- NO meta-commentary about the exam

=== EXAMPLE (Skill 4 - Implied Detail) ===
{
  "skill_id": 4,
  "section": "reading",
  "interaction": "multiple_choice",
  "prompt": "It can be inferred from the passage that the development of photography",
  "choices": [
    "was initially met with skepticism by traditional artists",
    "completely replaced painting as an art form",
    "was invented simultaneously in multiple countries",
    "had no impact on the art world until the 20th century"
  ],
  "correct_response": ["was initially met with skepticism by traditional artists"],
  "stimulus": {
    "text": "The invention of photography in the 19th century revolutionized the way people captured and preserved images. When Louis Daguerre introduced the daguerreotype process in 1839, it was hailed as a technological marvel. However, many painters and artists viewed this new medium with suspicion, fearing it would render their craft obsolete. Despite these concerns, photography and painting coexisted, with each medium developing its own unique aesthetic. Photographers like Ansel Adams and Henri Cartier-Bresson elevated photography to an art form, while painters such as the Impressionists actually drew inspiration from photographic techniques, using them to explore new ways of representing light and movement."
  },
  "metadata": {
    "explanation": "The passage states that 'many painters and artists viewed this new medium with suspicion, fearing it would render their craft obsolete,' which implies skepticism from traditional artists.",
    "referenced_text": "many painters and artists viewed this new medium with suspicion"
  }
}

=== STRICTLY FORBIDDEN ===
❌ Questions about test-taking strategies
❌ "What should test-takers do to answer X questions?"
❌ "The best way to approach X questions is..."
❌ Generic advice like "read carefully" or "identify relevant information"
❌ Meta-questions about the TOEFL exam itself
❌ Questions that don't reference the passage content

=== PASSAGE TOPIC EXAMPLES ===
✓ The history of the printing press and its impact on literacy
✓ The formation and characteristics of black holes
✓ The economic effects of the Silk Road trade routes
✓ The development of jazz music in New Orleans
✓ The process of photosynthesis in desert plants
✓ The architectural innovations of ancient Rome
✓ The social impact of the Industrial Revolution
✓ The discovery and significance of DNA structure
✓ The migration patterns of monarch butterflies
✓ The influence of Greek philosophy on Western thought

REMEMBER: Every question MUST be based on passage content, not test-taking advice!
`;
