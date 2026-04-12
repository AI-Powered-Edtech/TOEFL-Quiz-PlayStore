export const STRUCTURE_PROMPT = `
SECTION: STRUCTURE (Sentence Completion / Fill-in-the-Blank)
interaction: fill_blank

=== FORMAT ===
- The "prompt" MUST be ONE complete academic sentence with exactly ONE blank: _______
- The blank replaces a grammatically critical word or phrase.
- Do NOT use {A}/{B}/{C}/{D} tags. Those are for Written Expression only.
- "choices" MUST contain EXACTLY 4 UNIQUE options. NO DUPLICATE CHOICES ALLOWED.

=== SENTENCE QUALITY (CRITICAL) ===
- Each sentence MUST be 20-35 words long.
- Use COMPLEX sentence structures: subordinate clauses, participial phrases, appositives, relative clauses.
- Use ACADEMIC topics: paleontology, astrophysics, economics, linguistics, marine biology, art history, sociology, microbiology, political science, environmental science.
- Use FORMAL register with B2-C1 vocabulary.
- NEVER write simple subject-verb-object sentences like "The cat _______ on the mat."

=== DISTRACTOR RULES ===
- All 4 choices must be the SAME part of speech and similar word form.
- For verb blanks: vary tense, voice, or agreement (e.g., "has increased" vs "have increased" vs "increasing" vs "increased").
- For noun/adjective blanks: use semantically related but grammatically wrong alternatives.
- Distractors must be plausible errors that B1-B2 learners commonly make.

=== FEW-SHOT EXAMPLES (COPY THIS QUALITY) ===

EXAMPLE 1 (Skill 1 - Subject/Verb):
{
  "prompt": "The discovery of penicillin, which _______ countless lives since its introduction in the 1940s, remains one of the most significant achievements in medical history.",
  "choices": ["has saved", "have saved", "saving", "were saved"],
  "correct_response": ["has saved"],
  "skill_id": 1,
  "interaction": "fill_blank",
  "explanation": "The subject is 'discovery' (singular), requiring the singular verb 'has saved'. 'Have saved' is incorrect because it requires a plural subject. The present perfect is needed because the action continues to the present."
}

EXAMPLE 2 (Skill 6 - Coordinate Connectors):
{
  "prompt": "The volcanic eruption not only devastated the surrounding agricultural land _______ also disrupted air travel across the entire northern hemisphere for several weeks.",
  "choices": ["but", "and", "nor", "yet"],
  "correct_response": ["but"],
  "skill_id": 6,
  "interaction": "fill_blank",
  "explanation": "The correlative conjunction pair 'not only...but also' is required. 'And' does not pair with 'not only'. 'Nor' is used with 'neither'. 'Yet' implies contrast, not addition."
}

EXAMPLE 3 (Skill 14 - Reduced Adverb Clauses):
{
  "prompt": "_______ by the sudden drop in atmospheric pressure, the meteorological team immediately began monitoring the storm system developing over the coastal region.",
  "choices": ["Alarmed", "Alarming", "Having alarm", "To alarm"],
  "correct_response": ["Alarmed"],
  "skill_id": 14,
  "interaction": "fill_blank",
  "explanation": "A reduced adverb clause requires a past participle ('Alarmed') when the subject receives the action. 'Alarming' would mean the team was causing alarm. 'Having alarm' is not a valid participial form."
}

=== VARIETY MANDATE (ONLY FOR GENERAL PRACTICE) ===
This section applies ONLY when no specific skill ID is provided.
If generating 5 questions for general practice, vary the grammar concepts across: Subject/verb agreement, participial phrases, connectors, noun clauses, adjective clauses, reduced clauses, inversion patterns.
`;

// ============================================================
// SKILL-SPECIFIC PROMPTS FOR FOCUSED GENERATION
// Each skill has unique patterns, examples, and negative constraints
// ============================================================

export const SKILL_SPECIFIC_PROMPTS: Record<number, string> = {
    // === SKILLS 1-5: SENTENCES WITH ONE CLAUSE ===
    1: `
=== SKILL 1: SUBJECTS AND VERBS ===
DEFINITION: Every sentence MUST have a subject and a verb. The verb must agree with the subject in number (singular/plural).

PATTERN: [Complex Subject with modifiers] _______ [predicate/continuation]

CORRECT EXAMPLES:
- "The results of the experiment, which were conducted over three years, _______ significant." (were)
- "Among the many factors influencing climate change, carbon emissions _______ the most critical." (remain)

NEGATIVE CONSTRAINT: Do NOT generate inversion, connector, or participle questions. Focus ONLY on subject-verb identification and agreement.
`,
    2: `
=== SKILL 2: OBJECTS OF PREPOSITIONS ===
DEFINITION: A noun in a prepositional phrase cannot be the subject of the sentence. The verb must agree with the TRUE subject, not the object of the preposition.

PATTERN: [Prepositional phrase] _______ [verb] [subject] OR [Subject] [prepositional phrase] _______ [verb]

CORRECT EXAMPLES:
- "In the laboratory _______ several microscopes for student use." (are) - Inversion after place expression
- "The list of candidates _______ being reviewed by the committee." (is) - Subject is 'list', not 'candidates'

NEGATIVE CONSTRAINT: Do NOT generate simple subject-verb questions without prepositional phrases. The prepositional phrase MUST be present and relevant.
`,
    3: `
=== SKILL 3: APPOSITIVES ===
DEFINITION: An appositive is a noun that renames another noun, usually set off by commas. Students must identify the main verb despite the appositive.

PATTERN: [Subject], [appositive phrase], _______ [rest of sentence]

CORRECT EXAMPLES:
- "The Amazon River, _______ largest river in South America, flows through several countries." (the)
- "Shakespeare, a renowned English playwright, _______ 37 plays during his career." (wrote)

NEGATIVE CONSTRAINT: Do NOT generate questions without appositives. Do NOT include a second verb in the appositive phrase if the main verb is already present (e.g., "Shakespeare, [who wrote] 37 plays, wrote...").
`,
    4: `
=== SKILL 4: PRESENT PARTICIPLES (-ING) ===
DEFINITION: Present participles (-ing forms) can be part of progressive verbs OR function as adjectives. Students must distinguish between them.

PATTERN: [Subject] _______ [context requiring -ing form] OR The [noun] _______ [showing ongoing action]

CORRECT EXAMPLES:
- "The scientist _______ the experiment noticed an anomaly." (conducting) - as adjective
- "The students _______ quietly when the professor entered." (were sitting) - as progressive verb

NEGATIVE CONSTRAINT: 
1. Do NOT generate past participle or simple tense questions. Focus on -ing forms.
2. The answer MUST NOT include "is/are/was/were" if it creates a double verb error (e.g., "The man [is standing] there is my friend" -> WRONG).
`,
    5: `
=== SKILL 5: PAST PARTICIPLES (V3) ===
DEFINITION: Past participles are used in perfect tenses (have/has/had + V3) and passive voice (be + V3).

PATTERN: [Subject] has/have/had _______ OR [Subject] is/are/was/were _______

CORRECT EXAMPLES:
- "The research team has _______ significant progress in the last year." (made)
- "The ancient artifacts were _______ by archaeologists last summer." (discovered)

NEGATIVE CONSTRAINT: 
1. Do NOT generate present participle (-ing) questions. Focus on V3 forms.
2. The answer MUST NOT include helper verbs (was/were) if it creates a double passive (e.g., "The book [was written] by him was famous" -> WRONG).
`,

    // === SKILLS 6-12: SENTENCES WITH MULTIPLE CLAUSES ===
    6: `
=== SKILL 6: COORDINATE CONNECTORS ===
DEFINITION: Coordinate connectors (and, but, or, so, for, nor, yet) join two independent clauses of equal importance.

PATTERN: [Independent clause] , _______ [independent clause]

CORRECT EXAMPLES:
- "The study was groundbreaking, _______ it received little attention initially." (but)
- "The team could conduct the experiment now, _______ they could wait for better conditions." (or)

NEGATIVE CONSTRAINT: Do NOT generate subordinating conjunction questions. Focus ONLY on coordinating conjunctions.
`,
    7: `
=== SKILL 7: ADVERB TIME/CAUSE CONNECTORS ===
DEFINITION: Adverb connectors like because, after, before, when, since, while join a dependent clause to an independent clause showing time or cause relationships.

PATTERN: _______ [dependent clause], [independent clause] OR [independent clause] _______ [dependent clause]

CORRECT EXAMPLES:
- "_______ the chemical reaction was complete, the scientists recorded the results." (After/When)
- "The species declined rapidly _______ its habitat was destroyed." (because)

NEGATIVE CONSTRAINT: Do NOT generate coordinate connector or contrast connector questions. Focus on TIME and CAUSE relationships.
`,
    8: `
=== SKILL 8: ADVERB CONTRAST/CONDITION CONNECTORS ===
DEFINITION: Connectors like although, even though, while, if, unless show contrast or condition relationships between clauses.

PATTERN: _______ [dependent clause], [independent clause]

CORRECT EXAMPLES:
- "_______ the weather was unfavorable, the expedition continued." (Although/Even though)
- "The project will succeed _______ adequate funding is secured." (if)

NEGATIVE CONSTRAINT: Do NOT generate time/cause connector questions. Focus on CONTRAST and CONDITION relationships.
`,
    9: `
=== SKILL 9: NOUN CLAUSE CONNECTORS ===
DEFINITION: Noun clause connectors (what, when, where, why, how, that, whether) introduce clauses that function as nouns (subject or object).

PATTERN: [Subject] [verb] _______ [noun clause] OR _______ [noun clause] [verb] [rest]

CORRECT EXAMPLES:
- "The researcher explained _______ the experiment failed." (why/how)
- "_______ caused the reaction remains unclear." (What)

NEGATIVE CONSTRAINT: Do NOT generate adjective clause or adverb clause questions. Focus on NOUN CLAUSES.
`,
    10: `
=== SKILL 10: NOUN CLAUSE SUBJECTS ===
DEFINITION: When the connector is ALSO the subject of the noun clause (who, what, which, whoever, whatever), no additional subject is needed.

PATTERN: _______ [verb of noun clause] [rest of noun clause]

CORRECT EXAMPLES:
- "_______ caused the accident is still under investigation." (What)
- "The prize will go to _______ finishes first." (whoever)

NEGATIVE CONSTRAINT: Do NOT generate noun clause questions where the connector is NOT the subject.
`,
    11: `
=== SKILL 11: ADJECTIVE CLAUSE CONNECTORS ===
DEFINITION: Adjective clause connectors (whom, which, that, whose, where, when) introduce clauses that modify nouns. The connector is followed by a subject and verb.

PATTERN: [Noun] _______ [subject] [verb] [rest of clause]

CORRECT EXAMPLES:
- "The scientist _______ the university hired last year won a prestigious award." (whom/that)
- "The theory _______ Einstein proposed revolutionized physics." (which/that)

NEGATIVE CONSTRAINT: Do NOT generate noun clause questions. Focus on ADJECTIVE CLAUSES that modify nouns.
`,
    12: `
=== SKILL 12: ADJECTIVE CLAUSE SUBJECTS ===
DEFINITION: When the connector (who, which, that) is ALSO the subject of the adjective clause, it is followed directly by the verb. Do NOT include a separate subject.

PATTERN: [Noun] _______ [verb] [rest of clause]

CORRECT EXAMPLES:
- "The results _______ surprising were published immediately." (which were)
- "The theory _______ most scientists accept has been challenged." (that)
- "The woman _______ the prize is my neighbor." (who won)

NEGATIVE CONSTRAINT: Do NOT generate questions with a separate subject after the connector (e.g., "The woman who she won"). The connector IS the subject.
`,

    // === SKILLS 13-14: REDUCED CLAUSES ===
    13: `
=== SKILL 13: REDUCED ADJECTIVE CLAUSES ===
DEFINITION: Adjective clauses can be reduced by omitting the relative pronoun (who, which, that) + be verb, leaving just the participle.

PATTERN: [Noun] _______ [rest of phrase] [verb] OR [Subject] [verb] [Noun] _______ [rest]

CORRECT EXAMPLES:
- "The artifacts _______ in the excavation date back to 3000 BCE." (discovered) - reduced from "which were discovered"
- "The scientist _______ the conference presented groundbreaking research." (attending) - reduced from "who was attending"

NEGATIVE CONSTRAINT: Do NOT form a complete clause. The answer MUST be a participle (V-ing or V-ed) acting as an adjective. NO connectors (who/which).
`,
    14: `
=== SKILL 14: REDUCED ADVERB CLAUSES ===
DEFINITION: Adverb clauses reduced to phrases. Pattern: [Conjunction] + [Participle]. Valid conjunctions: When, While, If, Unless, Once, Until.

PATTERN: _______ [participle phrase], [main clause] OR [Main clause] _______ [participle phrase]

CORRECT EXAMPLES:
- "_______ by the unexpected results, the team repeated the experiment." (Alarmed) - reduced from "Because/When they were alarmed"
- "_______ through the data, the researcher noticed a pattern." (While looking) - reduced from "While she was looking"
- "The experiment failed _______ to air." (when exposed)

NEGATIVE CONSTRAINT: 
1. The answer MUST include the Conjunction (When/While/If) OR be a clear introductory Participle.
2. Do NOT use "The fact that" or complex noun clauses. 
3. Do NOT include the main verb of the clause in the blank if it creates a double verb.
4. ABSOLUTELY FORBIDDEN: "...fact that [having failed] the navigation system failed." (Redundant).
`,

    // === SKILLS 15-19: INVERSION ===
    15: `
=== SKILL 15: INVERT WITH QUESTION WORDS ===
DEFINITION: In questions, the subject and auxiliary verb are inverted after question words (who, what, where, when, why, how).

PATTERN: [Question word] _______ [subject] [main verb] ...?

CORRECT EXAMPLES:
- "Where _______ the initial geological survey of the volcanic region take place?" (did)
- "Why _______ the results of the controlled experiment inconsistent with the hypothesis?" (were)
- "How _______ the researchers determine the age of the ancient artifacts found in the excavation?" (did)

NEGATIVE CONSTRAINT: Do NOT generate embedded questions (e.g., "I know where he is"). This must be a DIRECT question ending in a question mark.
`,
    16: `
=== SKILL 16: INVERT WITH PLACE EXPRESSIONS ===
DEFINITION: When sentences begin with place expressions (here, there, in the distance, on the wall), the subject and verb are inverted.

PATTERN: [Place expression] _______ [subject] ...

CORRECT EXAMPLES:
- "_______ the results of the experiment." (Here are)
- "In the distance _______ a small village." (was/could be seen)
- "On the wall _______ several portraits of former presidents." (hung/were hanging)

NEGATIVE CONSTRAINT: Do NOT generate normal word order questions. The sentence MUST start with a PLACE EXPRESSION followed by INVERSION.
`,
    17: `
=== SKILL 17: INVERT WITH NEGATIVES ===
DEFINITION: When sentences begin with negative or restrictive expressions (never, rarely, seldom, not only, hardly, barely, scarcely, at no time), the auxiliary verb and subject are inverted.

PATTERN: [Negative expression] _______ [subject] [main verb/participle] ...

CORRECT EXAMPLES:
- "_______ such a phenomenon been observed in nature." (Never has/Rarely has)
- "Not only _______ the theory, but he also improved it." (did he propose)
- "Seldom _______ such dedication in young researchers." (do we see/is seen)

NEGATIVE CONSTRAINT: Do NOT generate normal word order questions. Do NOT generate subject-verb agreement questions. The sentence MUST start with a NEGATIVE EXPRESSION followed by INVERSION.
`,
    18: `
=== SKILL 18: INVERT WITH CONDITIONALS ===
DEFINITION: In formal conditionals, "if" can be omitted and the auxiliary verb (had, should, were) is placed before the subject.

PATTERN: _______ [subject] [past participle/were to/should], [result clause]

CORRECT EXAMPLES:
- "_______ the funding approved, the project would proceed immediately." (Had/Were)
- "_______ you need assistance, please contact our department." (Should)
- "_______ the weather more favorable, we would have completed the survey." (Had been/Were)

NEGATIVE CONSTRAINT: Do NOT generate normal "if" conditional questions. The sentence MUST use INVERTED conditional form WITHOUT "if".
`,
    19: `
=== SKILL 19: INVERT WITH COMPARISONS ===
DEFINITION: In comparisons using "so," "neither," "nor," or "as," the verb can be inverted in the second clause with the subject placed after it.

PATTERN: [First clause], and _______ [subject]. OR [First clause], and [subject] _______.

CORRECT EXAMPLES:
- "The first sample was contaminated, and _______ the second." (so was/neither was - depending on context)
- "The hypothesis was supported by data, as _______ the prediction." (was)
- "The control group showed no reaction, nor _______ the experimental group." (did)

NEGATIVE CONSTRAINT: Do NOT generate subject-verb agreement questions. Do NOT generate simple comparison questions. The sentence MUST use INVERSION in a COMPARISON context.
`
};

export const STRUCTURE_FOCUSED_PROMPT = `
SECTION: STRUCTURE (Sentence Completion / Fill-in-the-Blank)
interaction: fill_blank

=== FORMAT ===
- The "prompt" MUST be ONE complete academic sentence with exactly ONE blank: _______
- The blank replaces a grammatically critical word or phrase related to the specific skill rule.
- Do NOT use {A}/{B}/{C}/{D} tags.
- "choices" MUST contain EXACTLY 4 UNIQUE options. NO DUPLICATE CHOICES ALLOWED.

=== STRICT ADHERENCE (CRITICAL) ===
- You MUST generate questions ONLY for the specific grammar rule described in the "Context".
- Do NOT mix in other grammar topics. Focus deeply on the requested skill.
- Ensure the distraction options are plausible errors for THIS specific grammar point.

=== NEGATIVE CONSTRAINTS (MANDATORY) ===
- If Context describes INVERSION (Skills 15-19), do NOT generate Subject-Verb Agreement questions.
- If Context describes CONNECTORS (Skills 6-12), do NOT generate Subject-Verb Agreement questions.
- If Context describes REDUCED CLAUSES (Skills 13-14), do NOT generate Subject-Verb Agreement questions.
- ONLY generate Subject-Verb Agreement questions when Context explicitly requests Skills 1-5 or 20-23.

=== SENTENCE QUALITY ===
- Length: 20-35 words.
- Register: Academic, formal.
- Structure: Complex (subordinate clauses, participial phrases).
`;

/**
 * Get skill-specific prompt for focused generation
 * Returns a detailed prompt with examples and constraints for the specific skill
 */
export const getSkillSpecificPrompt = (skillId: number): string => {
    return SKILL_SPECIFIC_PROMPTS[skillId] || '';
};
