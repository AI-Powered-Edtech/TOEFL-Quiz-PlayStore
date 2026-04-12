export const ERROR_ID_PROTOCOL = `
PROTOCOL: TRUTH-CHECK (MANDATORY for ERROR IDENTIFICATION)
One part of the sentence MUST violate a grammar rule. A correct sentence is a FAILURE.
1. Decide the target grammar rule to test (e.g., subject-verb agreement, parallel structure).
2. Write a CORRECT academic sentence first (25-40 words, multi-clause).
3. Introduce exactly ONE deliberate violation in one of the tagged portions.
4. Verify: three tags must be grammatically correct, exactly one tag must contain the error.
5. Double-check the error is unambiguous and the explanation is clear.
`;

export const WRITTEN_PROMPT = `
SECTION: WRITTEN EXPRESSION (Error Identification)
interaction: identify_error

=== FORMAT (ABSOLUTELY CRITICAL) ===
1. "prompt" MUST contain the FULL sentence with EXACTLY FOUR tags: {A}word(s){/A}, {B}word(s){/B}, {C}word(s){/C}, {D}word(s){/D}. DO NOT use any other tags like {E} or {F}.
2. EXACTLY one tagged portion contains a grammatical error.
3. "choices" MUST be exactly ["A", "B", "C", "D"]
4. "correct_response" MUST be the letter of the error, e.g. ["B"]
5. ABSOLUTELY DO NOT DUPLICATE WORDS. 
   - WRONG: "have {A}have{/A}" (You wrote 'have' twice!)
   - WRONG: "{B}been{/B} been" (You wrote 'been' twice!)
   - CORRECT: "{A}have{/A}"
   - The tagged word COMPLETELY REPLACES the original word in the sentence. If you tag a word, you MUST remove the untagged version from the surrounding text.

=== SENTENCE QUALITY ===
- Each sentence MUST be 25-40 words, multi-clause, academic register.
- Use complex structures: relative clauses, participial phrases, prepositional chains, passive voice.
- Academic topics: geology, anthropology, neuroscience, economics, ecology, literature, political science.
- NEVER use simple sentences like "She don't want to go."

=== ERROR TYPES (MUST VARY ACROSS QUESTIONS) ===
- Subject-verb agreement (singular/plural mismatch)
- Parallel structure (inconsistent verb forms in a list)
- Word form (adjective vs adverb, noun vs verb)
- Verb tense (past vs present perfect, conditional errors)
- Article usage (a/an/the misuse or omission)
- Preposition errors (wrong preposition with specific verbs/nouns)
- Comparative/superlative (more + -er, irregular forms)
- Pronoun reference (ambiguous or wrong case)
- NEVER repeat the same error type in a single batch.

=== FEW-SHOT EXAMPLES (COPY THIS QUALITY) ===

EXAMPLE 1 (Subject-Verb Agreement):
{
  "prompt": "The {A}proliferation{/A} of invasive species in freshwater ecosystems {B}have{/B} prompted researchers to {C}investigate{/C} the long-term {D}ecological{/D} consequences of habitat disruption.",
  "choices": ["A", "B", "C", "D"],
  "correct_response": ["B"],
  "interaction": "identify_error",
  "skill_id": 20,
  "explanation": "The error is in B. The subject 'proliferation' is singular, so the verb should be 'has' instead of 'have'. The prepositional phrase 'of invasive species' does not affect subject-verb agreement."
}

EXAMPLE 2 (Parallel Structure):
{
  "prompt": "The research methodology involved {A}collecting{/A} field samples, {B}analyze{/B} the chemical composition, and {C}comparing{/C} the results with {D}previously{/D} published data.",
  "choices": ["A", "B", "C", "D"],
  "correct_response": ["B"],
  "interaction": "identify_error",
  "skill_id": 24,
  "explanation": "The error is in B. In a parallel series joined by commas and 'and', all items must have the same form. 'Collecting' and 'comparing' are gerunds, so 'analyze' should be 'analyzing'."
}

EXAMPLE 3 (Word Form):
{
  "prompt": "The {A}recently{/A} discovered archaeological site has provided {B}substantially{/B} evidence that early human {C}settlements{/C} in this region were more {D}sophisticated{/D} than previously believed.",
  "choices": ["A", "B", "C", "D"],
  "correct_response": ["B"],
  "interaction": "identify_error",
  "skill_id": 46,
  "explanation": "The error is in B. 'Substantially' is an adverb but it modifies the noun 'evidence', which requires the adjective form 'substantial'. Adverbs modify verbs, adjectives, and other adverbs, not nouns."
}

=== VARIETY MANDATE ===
If generating 5 questions, EACH must test a DIFFERENT error type from the list above.
Distribute the error position: don't always put the error in B. Use A, B, C, and D roughly equally across the batch.

${ERROR_ID_PROTOCOL}
`;
