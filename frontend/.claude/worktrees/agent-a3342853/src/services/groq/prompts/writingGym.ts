/**
 * Writing Gym AI Prompts for Groq
 * Generates exercises for Mason and Logic Weaver levels
 */

export const MASON_PROMPT = `
Generate a sentence reconstruction exercise (Mason Level).

REQUIREMENTS:
1. Create ONE academic sentence (15-25 words) suitable for TOEFL writing
2. Break it into logical fragments (4-8 pieces)
3. Include proper punctuation as separate fragments where needed
4. Sentence should demonstrate academic grammar patterns
5. Provide Indonesian translation for hint
6. IMPORTANT: Create UNIQUE content every time - vary topics, structures, and vocabulary
7. Use diverse subject matter (science, history, economics, technology, environment, education, etc.)

TOPIC VARIETY RULES (rotate through these):
- Skill 1-5: Simple sentences with basic clauses
- Skill 6-10: Compound sentences with conjunctions  
- Skill 11-15: Complex sentences with subordinate clauses
- Skill 16-20: Sentences with noun clauses
- Skill 21-25: Advanced sentences with multiple clauses
- Skill 26-30: Sentences with participle phrases
- Skill 31-35: Sentences with infinitive/gerund phrases
- Skill 36-40: Conditional sentences
- Skill 41-45: Passive voice constructions
- Skill 46-50: Complex academic writing patterns

OUTPUT SCHEMA:
{
  "target_sentence": "The complete sentence with proper punctuation.",
  "fragments": ["Fragment 1", "Fragment 2",  "...", "."],
  "translation": "Terjemahan Indonesia",
  "explanation": "Brief explanation of the grammar pattern used",
  "hints": ["Hint 1: Grammar tip", "Hint 2: Structure tip"],
  "difficulty_level": "beginner" | "intermediate" | "advanced"
}

EXAMPLE:
{
  "target_sentence": "The professor claims that the theory is invalid.",
  "fragments": ["The professor", "claims that", "the theory", "is invalid", "."],
  "translation": "Profesor tersebut mengklaim bahwa teori itu tidak valid.",
  "explanation": "This sentence uses a noun clause as the object of 'claims'.",
  "hints": ["Start with the subject", "The verb takes a that-clause"],
  "difficulty_level": "intermediate"
}
`;

export const LOGIC_WEAVER_PROMPT = `
Generate a clause combination exercise (Logic Weaver Level).

=== TOPIC VARIETY (ROTATE THROUGH THESE - PICK ONE RANDOMLY) ===
1. Climate Science: global warming, renewable energy, carbon footprint, ocean acidification
2. Technology: AI ethics, cybersecurity, social media, digital privacy, automation
3. Education: online learning, critical thinking, standardized testing, early childhood
4. Economics: globalization, income inequality, cryptocurrency, sustainable development
5. Health: mental health, nutrition, pandemic response, healthcare systems
6. Psychology: cognitive bias, motivation, social behavior, memory research
7. Biology: ecosystems, genetic engineering, biodiversity, evolution
8. Physics: quantum mechanics, space exploration, renewable materials
9. Sociology: urbanization, cultural identity, migration patterns
10. History: industrial revolution, ancient civilizations, political movements
11. Linguistics: language acquisition, bilingualism, communication barriers
12. Art & Culture: digital art, cultural preservation, media influence
13. Law & Ethics: privacy rights, intellectual property, international law
14. Urban Planning: smart cities, public transportation, green architecture
15. Environmental Policy: conservation, waste management, sustainable agriculture
16. Business: startup culture, corporate responsibility, innovation strategies
17. Philosophy: ethical dilemmas, existentialism, logic and reasoning
18. Anthropology: human migration, cultural evolution, archaeological discoveries
19. Astronomy: exoplanets, dark matter, space colonization
20. Marine Science: coral reefs, deep sea exploration, ocean conservation

=== LOGICAL RELATIONSHIP TYPES (VARY BASED ON SKILL) ===
• Cause & Effect: because, since, so, therefore, consequently, as a result, due to
• Contrast: but, however, although, nevertheless, on the other hand, despite, whereas
• Addition: and, also, in addition, furthermore, moreover, besides, additionally
• Sequence: first, then, finally, subsequently, afterward, meanwhile, previously
• Example: for example, such as, specifically, in particular, namely
• Condition: if, unless, provided that, assuming that, in case
• Clarification: in other words, that is, specifically, to put it another way
• Emphasis: indeed, in fact, notably, particularly, certainly
• Comparison: similarly, likewise, in the same way, compared to
• Purpose: so that, in order to, to, with the aim of
• Concession: admittedly, granted, while it is true, even though
• Summary: in conclusion, to summarize, overall, in short
• Alternative: alternatively, otherwise, instead, or else

=== CRITICAL RULES FOR VARIETY ===
1. **NEVER repeat the same topic twice** in a session
2. **VARY sentence structures**:
   - Start with subject sometimes: "Scientists believe that..."
   - Start with adverb clause: "Although evidence suggests..."
   - Start with prepositional phrase: "According to research..."
   - Use passive voice sometimes: "It has been demonstrated that..."
3. **VARY clause lengths**: Mix short punchy clauses with longer detailed ones
4. **USE UNIQUE vocabulary**: Avoid generic words like "important", "good", "bad"
5. **CREATE realistic scenarios**: Reference specific studies, events, or phenomena

=== OUTPUT SCHEMA ===
{
  "main_clause": "The first independent clause (8-15 words)",
  "subordinate_clause": "The second clause to connect (8-15 words)",
  "connectors": ["correct_one", "distractor1", "distractor2", "distractor3"],
  "correct_connector": "the correct connector from array",
  "relationship_type": "cause_effect | contrast | addition | etc.",
  "explanation": "Explain WHY this connector creates logical flow",
  "translation": "Terjemahan bahasa Indonesia yang natural",
  "topic_category": "which topic category this belongs to"
}

=== EXAMPLES (SHOW VARIETY) ===

Example 1 (Contrast - Climate Science):
{
  "main_clause": "The development of renewable energy sources is crucial for reducing greenhouse gas emissions",
  "subordinate_clause": "The cost of renewable energy technologies, such as solar and wind power, remains relatively high",
  "connectors": ["furthermore", "in addition", "however", "therefore"],
  "correct_connector": "however",
  "relationship_type": "contrast",
  "explanation": "These clauses present opposing ideas: importance vs. cost barrier",
  "translation": "Pengembangan sumber energi terbarukan sangat penting untuk mengurangi emisi gas rumah kaca, namun biaya teknologi energi terbarukan seperti tenaga surya dan angin masih relatif tinggi.",
  "topic_category": "Climate Science"
}

Example 2 (Cause & Effect - Psychology):
{
  "main_clause": "Chronic sleep deprivation significantly impairs cognitive function and memory consolidation",
  "subordinate_clause": "Students who consistently lack adequate sleep often struggle with academic performance",
  "connectors": ["however", "therefore", "although", "despite"],
  "correct_connector": "therefore",
  "relationship_type": "cause_effect",
  "explanation": "The second clause is a logical consequence of the first",
  "translation": "Kurang tidur kronis secara signifikan mengganggu fungsi kognitif dan konsolidasi memori, oleh karena itu siswa yang secara konsisten kurang tidur sering kesulitan dengan kinerja akademis.",
  "topic_category": "Psychology"
}

Example 3 (Concession - Technology):
{
  "main_clause": "Social media platforms have revolutionized global communication and information sharing",
  "subordinate_clause": "Concerns about privacy violations and misinformation continue to mount",
  "connectors": ["moreover", "nevertheless", "consequently", "specifically"],
  "correct_connector": "nevertheless",
  "relationship_type": "concession",
  "explanation": "Acknowledges benefit while introducing persistent concerns",
  "translation": "Platform media sosial telah merevolusi komunikasi global dan berbagi informasi, namun demikian kekhawatiran tentang pelanggaran privasi dan misinformasi terus meningkat.",
  "topic_category": "Technology"
}

Generate a COMPLETELY NEW and UNIQUE exercise now. Pick a different topic than the examples.
`;


export const DISTRACTOR_PROMPT = `
Generate plausible distractor words for a sentence reconstruction exercise.

Given a correct word/phrase, generate 2-3 similar but INCORRECT alternatives that:
1. Have similar grammatical form
2. Could plausibly fit but are semantically wrong
3. Represent common student errors

OUTPUT: JSON array of strings
["distractor1", "distractor2", "distractor3"]
`;

export const WRITING_GYM_SYSTEM_PROMPT = `
You are a TOEFL Writing Exercise Generator.
Generate exercises that help students master academic English grammar and sentence structure.
Focus on patterns commonly tested in TOEFL Writing section.
Always output valid JSON only, no markdown, no preamble.
`;
