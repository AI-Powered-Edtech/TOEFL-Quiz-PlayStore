/**
 * Compound Prompts
 * Specialized prompts for TOEFL extraction using Groq Compound agentic features
 */

// ========================================
// SECTION CONSTRAINT (Critical)
// ========================================

export const SECTION_CONSTRAINT = `
OUTPUT CONSTRAINT:
- section field MUST be one of: "structure", "written", "reading", "listening"
- Use "written" for error identification questions (underlined A,B,C,D parts)
- Use "structure" for fill-in-the-blank questions (___) 
- Use "reading" for passage comprehension
- Use "listening" for audio/dialogue questions

SKILL ID RANGES:
- Structure: 1-19
- Written: 20-60
- Reading: 101-106
- Listening: 201-227
`;

// ========================================
// EXTRACTION PROMPTS
// ========================================

export const COMPOUND_EXTRACTION_SYSTEM = `You are an advanced TOEFL Expert Agent with access to tools:
- web_search: Look up current TOEFL iBT/ITP standards
- code_interpreter: Parse and analyze text structure

TASK: Extract TOEFL questions from the provided PDF text.

WORKFLOW:
1. Use code_interpreter to:
   - Clean OCR artifacts and formatting issues
   - Count words per section
   - Identify question patterns (fill-blank, error identification, comprehension)

2. Use web_search (if needed) to:
   - Verify question format matches official TOEFL standards
   - Find similar official examples for comparison

3. Generate structured output with validated questions.

${SECTION_CONSTRAINT}

OUTPUT FORMAT (JSON):
{
  "detected_sections": ["structure", "written", "reading"],
  "total_questions": number,
  "questions": [
    {
      "section": "structure|written|reading|listening",
      "skill_id": number,
      "prompt": "Question text",
      "choices": ["A", "B", "C", "D"],
      "correct_response": ["B"],
      "explanation": "Brief explanation",
      "stimulus": { "text": "passage if applicable" }
    }
  ]
}`;

export const COMPOUND_EXTRACTION_USER = (pdfText: string) =>
    `Extract TOEFL questions from this PDF text. Identify all question types and map to appropriate sections.

PDF TEXT:
${pdfText}

Return JSON with all extracted questions following the format specified.`;

// ========================================
// DISTRACTOR GENERATION PROMPTS
// ========================================

export const COMPOUND_DISTRACTOR_SYSTEM = `You are creating TOEFL answer options (distractors).

TASK: Generate 3 incorrect but grammatically plausible options.

Use web_search to find:
- Common grammar mistakes for this pattern
- Authentic TOEFL distractor examples

Make distractors that:
- Look correct at first glance
- Test specific grammar knowledge
- Match TOEFL difficulty level

Return ONLY a JSON array of 3 strings.`;

export const COMPOUND_DISTRACTOR_USER = (correctAnswer: string, context: string, skillType: string) =>
    `Generate 3 distractors for:
Correct answer: "${correctAnswer}"
Context: "${context}"
Skill: ${skillType}

Return JSON array: ["distractor1", "distractor2", "distractor3"]`;

// ========================================
// VALIDATION PROMPTS
// ========================================

export const COMPOUND_VALIDATION_SYSTEM = `You are a TOEFL quality assurance agent.

TASK: Validate extracted questions against TOEFL standards.

Use web_search to verify:
- Question format matches official TOEFL patterns
- Difficulty level is appropriate (B2-C1 CEFR)
- Answer choices are grammatically consistent

Return validation results:
{
  "valid": number,
  "invalid": number,
  "issues": ["list of problems found"]
}`;

// ========================================
// SECTION DETECTION PROMPTS
// ========================================

export const SECTION_DETECTION_PROMPT = `Detect the TOEFL section for this question:

DETECTION RULES:
1. STRUCTURE (Skills 1-19):
   - Has blank: "___" or "_______"
   - Tests grammar completion
   - No error markers

2. WRITTEN (Skills 20-60):
   - Has underlined segments: {A}, {B}, {C}, {D} or (A), (B), (C), (D)
   - Tests error identification
   - Question asks "which is incorrect" or similar

3. READING (Skills 101+):
   - Has passage text (> 80 chars)
   - Tests comprehension
   - No blanks or error markers

4. LISTENING (Skills 201+):
   - References audio/dialogue/lecture/conversation
   - May have transcript

Return: {"section": "...", "skill_id": number, "confidence": 0.0-1.0}`;

// ========================================
// SKILL MAPPING HELPER
// ========================================

export const SKILL_MAPPING_PROMPT = `Map this question to specific TOEFL skill:

STRUCTURE SKILLS (1-19):
1. Subjects/Verbs | 2. Objects of Prepositions | 3. Appositives
4. Present Participles | 5. Past Participles | 6. Coordinate Connectors
7. Adverb Time/Cause | 8. Other Adverb Connectors | 9. Noun Clause Connectors
10. Noun Clause Subjects | 11. Adjective Clause Connectors | 12. Adjective Clause Subjects
13. Reduced Adjective Clauses | 14. Reduced Adverb Clauses
15-19. Inversion (Question/Place/Negative/Conditional/Comparison)

WRITTEN SKILLS (20-60):
20-23. Subject/Verb Agreement | 24-26. Parallel Structure | 27-29. Comparatives
30-32. Verb Forms | 33-36. Verb Use | 37-38. Passive Voice
39-42. Nouns | 43-45. Pronouns | 46-48. Adjectives/Adverbs
49-51. More Adjectives | 52-55. Articles | 56-57. Prepositions | 58-60. Usage

READING SKILLS (101-106):
101. Main Idea | 102. Stated Detail | 103. Unstated Detail
104. Implied Detail | 105. Vocabulary | 106. Where Questions

LISTENING SKILLS (201-227):
201-217. Short Conversations | 218-222. Longer Conversations | 223-227. Talks/Lectures

Return: {"skill_id": number, "skill_name": "...", "reasoning": "..."}`;
