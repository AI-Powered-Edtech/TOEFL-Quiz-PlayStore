

export const READING_RULES: Record<number, string> = {
    1: "Main Idea question. Generate 250-300 word academic passage about natural sciences (biology, physics, geology, astronomy). Passage must have 3-4 paragraphs, each with clear topic sentence. Use CEFR B2-C1 vocabulary. Question asks for overall main idea/central theme. Distractors: specific details from individual paragraphs, overly broad statements not supported by text, or minor supporting points.",

    2: "Stated Detail question. Generate 250-300 word academic passage about social sciences (psychology, sociology, economics, anthropology). Include 3-5 specific facts, statistics, or explicit statements. Question asks for information directly stated in text (often paraphrased). Distractors: details from other parts of passage, information implied but not stated, or contradictory statements.",

    3: "Unstated Detail (NOT/EXCEPT question). Generate 250-300 word academic passage about history (ancient civilizations, historical events, cultural developments). Include 3-4 explicitly mentioned facts. Question asks which option is NOT mentioned or is FALSE according to text. Distractors: three options that ARE mentioned in passage (paraphrased), one that is not mentioned or contradicts the text.",

    4: "Implied Detail question. Generate 250-300 word academic passage about environmental science (climate, ecology, conservation, sustainability). Include contextual clues that allow logical inference without explicit statement. Question asks what can be inferred/concluded from passage. Distractors: explicitly stated facts (not inferred), logical leaps not supported by text, or contradictory inferences.",

    5: "Vocabulary in Context question. Generate 250-300 word academic passage about technology/engineering (innovations, systems, processes, materials science). Include 1-2 moderately difficult words (CEFR B2-C1) with strong context clues (synonyms, antonyms, examples, or explanations nearby). Question asks meaning of underlined word based on context. Distractors: other meanings of the word, similar-sounding words, or words from same semantic field.",

    6: "Where/Reference question. Generate 250-300 word academic passage about arts/humanities (literature, philosophy, cultural studies, art history). Include specific information distributed across paragraphs. Question asks where specific information is located or what a pronoun/phrase refers to. Distractors: lines containing similar but different information, or incorrect referents for pronouns."
};

