
import { Skill } from '../types';

export const TOEFL_STRUCTURE_SKILLS: Skill[] = [
  // --- SENTENCES WITH ONE CLAUSE (Skills 1-5) ---
  { id: 'S01', name: 'Skill 1: Subjects and Verbs', description: 'Ensure every sentence has a subject and a verb.', category: 'I. Sentences with One Clause', part: 'Structure' },
  { id: 'S02', name: 'Skill 2: Objects of Prepositions', description: 'Recognize that objects of prepositions cannot be subjects.', category: 'I. Sentences with One Clause', part: 'Structure' },
  { id: 'S03', name: 'Skill 3: Appositives', description: 'Identify appositives and ensure they are not confused with subjects.', category: 'I. Sentences with One Clause', part: 'Structure' },
  { id: 'S04', name: 'Skill 4: Present Participles', description: 'Distinguish between present participles as verbs vs adjectives.', category: 'I. Sentences with One Clause', part: 'Structure' },
  { id: 'S05', name: 'Skill 5: Past Participles', description: 'Distinguish between past participles as verbs vs adjectives.', category: 'I. Sentences with One Clause', part: 'Structure' },

  // --- SENTENCES WITH MULTIPLE CLAUSES (Skills 6-12) ---
  { id: 'S06', name: 'Skill 6: Coordinate Connectors', description: 'Use correct connectors (and, but, or, so) for compound sentences.', category: 'II. Sentences with Multiple Clauses', part: 'Structure' },
  { id: 'S07', name: 'Skill 7: Adverb Time/Cause Connectors', description: 'Use connectors like because, after, before correctly.', category: 'II. Sentences with Multiple Clauses', part: 'Structure' },
  { id: 'S08', name: 'Skill 8: Other Adverb Connectors', description: 'Use other adverb connectors (although, even though, while).', category: 'II. Sentences with Multiple Clauses', part: 'Structure' },
  { id: 'S09', name: 'Skill 9: Noun Clause Connectors', description: 'Use what, when, where, why, how as noun clause connectors.', category: 'II. Sentences with Multiple Clauses', part: 'Structure' },
  { id: 'S10', name: 'Skill 10: Noun Clause Subjects', description: 'Recognize when the connector is also the subject.', category: 'II. Sentences with Multiple Clauses', part: 'Structure' },
  { id: 'S11', name: 'Skill 11: Adjective Clause Connectors', description: 'Use who, which, that correctly.', category: 'II. Sentences with Multiple Clauses', part: 'Structure' },
  { id: 'S12', name: 'Skill 12: Adjective Clause Subjects', description: 'Recognize when the adjective connector is the subject.', category: 'II. Sentences with Multiple Clauses', part: 'Structure' },

  // --- SENTENCES WITH REDUCED CLAUSES (Skills 13-14) ---
  { id: 'S13', name: 'Skill 13: Reduced Adjective Clauses', description: 'Rules for reducing adjective clauses to phrases.', category: 'III. Reduced Clauses', part: 'Structure' },
  { id: 'S14', name: 'Skill 14: Reduced Adverb Clauses', description: 'Rules for reducing adverb clauses to phrases.', category: 'III. Reduced Clauses', part: 'Structure' },

  // --- SENTENCES WITH INVERTED SUBJECTS AND VERBS (Skills 15-19) ---
  { id: 'S15', name: 'Skill 15: Invert with Question Words', description: 'Invert subject and verb with question words.', category: 'IV. Inversion', part: 'Structure' },
  { id: 'S16', name: 'Skill 16: Invert with Place Expressions', description: 'Invert after place expressions (Here is...).', category: 'IV. Inversion', part: 'Structure' },
  { id: 'S17', name: 'Skill 17: Invert with Negatives', description: 'Invert after negative expressions (Rarely, Never).', category: 'IV. Inversion', part: 'Structure' },
  { id: 'S18', name: 'Skill 18: Invert with Conditionals', description: 'Invert when "if" is omitted (Had he known...).', category: 'IV. Inversion', part: 'Structure' },
  { id: 'S19', name: 'Skill 19: Invert with Comparisons', description: 'Invert after comparisons (My sister does too).', category: 'IV. Inversion', part: 'Structure' },

  // --- WRITTEN EXPRESSION (Skills 1-41) ---
  // Problems with Subject/Verb Agreement (1-4)
  { id: 'S20', name: 'Skill 1: Agreement after Prepositions', description: 'Subject/Verb agreement ignoring prepositions.', category: 'V. Subject/Verb Agreement', part: 'Written Expression' },
  { id: 'S21', name: 'Skill 2: Agreement with Expressions of Quantity', description: 'All of, most of, some of + Object agreement.', category: 'V. Subject/Verb Agreement', part: 'Written Expression' },
  { id: 'S22', name: 'Skill 3: Inverted Subject/Verb Agreement', description: 'Agreement when verb comes before subject.', category: 'V. Subject/Verb Agreement', part: 'Written Expression' },
  { id: 'S23', name: 'Skill 4: Agreement with Certain Words', description: 'Words that are always singular (everybody, each).', category: 'V. Subject/Verb Agreement', part: 'Written Expression' },

  // Problems with Parallel Structure (5-7)
  { id: 'S24', name: 'Skill 5: Parallel Structure with Coordinate Conjunctions', description: 'Parallelism with and, but, or.', category: 'VI. Parallel Structure', part: 'Written Expression' },
  { id: 'S25', name: 'Skill 6: Parallel Structure with Paired Conjunctions', description: 'Both...and, either...or, etc.', category: 'VI. Parallel Structure', part: 'Written Expression' },
  { id: 'S26', name: 'Skill 7: Parallel Structure with Comparisons', description: 'Parallelism in comparisons.', category: 'VI. Parallel Structure', part: 'Written Expression' },

  // Problems with Comparatives (8-10)
  { id: 'S27', name: 'Skill 8: Comparative/Superlative Forms', description: 'Correct form of -er and -est.', category: 'VII. Comparatives', part: 'Written Expression' },
  { id: 'S28', name: 'Skill 9: Use of Comparatives/Superlatives', description: 'Comparative for 2 items, Superlative for 3+.', category: 'VII. Comparatives', part: 'Written Expression' },
  { id: 'S29', name: 'Skill 10: The Irregular -er, -er Structure', description: 'The more... the more structure.', category: 'VII. Comparatives', part: 'Written Expression' },

  // Problems with the Form of the Verb (11-13)
  { id: 'S30', name: 'Skill 11: After Have, Use Past Participle', description: 'Have/has/had + past participle.', category: 'VIII. Verb Forms', part: 'Written Expression' },
  { id: 'S31', name: 'Skill 12: After Be, Use Present/Past Participle', description: 'Be + -ing (active) or -ed (passive).', category: 'VIII. Verb Forms', part: 'Written Expression' },
  { id: 'S32', name: 'Skill 13: After Modals, Use Base Form', description: 'Will, can, may + base verb.', category: 'VIII. Verb Forms', part: 'Written Expression' },

  // Problems with the Use of the Verb (14-17)
  { id: 'S33', name: 'Skill 14: Know When to Use Past with Present', description: 'Logical sequence of tenses.', category: 'IX. Verb Use', part: 'Written Expression' },
  { id: 'S34', name: 'Skill 15: Use Have and Had Correctly', description: 'Present Perfect vs Past Perfect.', category: 'IX. Verb Use', part: 'Written Expression' },
  { id: 'S35', name: 'Skill 16: Use Correct Tense with Time Expressions', description: 'By 1990, since, lately.', category: 'IX. Verb Use', part: 'Written Expression' },
  { id: 'S36', name: 'Skill 17: Use Will and Would Correctly', description: 'Conditional and future context.', category: 'IX. Verb Use', part: 'Written Expression' },

  // Problems with Passive Voice (18-19)
  { id: 'S37', name: 'Skill 18: Use the Correct Form of the Passive', description: 'Be + Past Participle.', category: 'X. Passive Voice', part: 'Written Expression' },
  { id: 'S38', name: 'Skill 19: Recognize Active/Passive Meanings', description: 'Determine if subject does or receives action.', category: 'X. Passive Voice', part: 'Written Expression' },

  // Problems with Nouns (20-23)
  { id: 'S39', name: 'Skill 20: Singular and Plural Nouns', description: 'Agreement with keywords (each, various).', category: 'XI. Nouns', part: 'Written Expression' },
  { id: 'S40', name: 'Skill 21: Countable and Uncountable Nouns', description: 'Much vs Many, Amount vs Number.', category: 'XI. Nouns', part: 'Written Expression' },
  { id: 'S41', name: 'Skill 22: Irregular Plurals of Nouns', description: 'Person/People, Foot/Feet, Datum/Data.', category: 'XI. Nouns', part: 'Written Expression' },
  { id: 'S42', name: 'Skill 23: Distinguish Person from Thing', description: 'Authority vs Author, etc.', category: 'XI. Nouns', part: 'Written Expression' },

  // Problems with Pronouns (24-26)
  { id: 'S43', name: 'Skill 24: Subject and Object Pronouns', description: 'I vs Me, He vs Him.', category: 'XII. Pronouns', part: 'Written Expression' },
  { id: 'S44', name: 'Skill 25: Possessive Adjectives and Pronouns', description: 'My vs Mine, Their vs Theirs.', category: 'XII. Pronouns', part: 'Written Expression' },
  { id: 'S45', name: 'Skill 26: Pronoun Reference', description: 'Pronoun must refer to a specific noun.', category: 'XII. Pronouns', part: 'Written Expression' },

  // Problems with Adjectives and Adverbs (27-29)
  { id: 'S46', name: 'Skill 27: Basic Adjectives and Adverbs', description: 'Adjectives describe nouns; Adverbs describe verbs.', category: 'XIII. Adjectives/Adverbs', part: 'Written Expression' },
  { id: 'S47', name: 'Skill 28: Adjectives after Linking Verbs', description: 'Seem, look, smell + Adjective.', category: 'XIII. Adjectives/Adverbs', part: 'Written Expression' },
  { id: 'S48', name: 'Skill 29: Position of Adjectives and Adverbs', description: 'Adjective before noun; Adverb placement.', category: 'XIII. Adjectives/Adverbs', part: 'Written Expression' },

  // More Adjective Problems (30-32)
  { id: 'S49', name: 'Skill 30: Recognize -ly Adjectives', description: 'Friendly, lovely, costly are adjectives.', category: 'XIV. More Adjectives', part: 'Written Expression' },
  { id: 'S50', name: 'Skill 31: Predicate Adjectives', description: 'Alike, alive, alone, afraid, asleep.', category: 'XIV. More Adjectives', part: 'Written Expression' },
  { id: 'S51', name: 'Skill 32: -ed and -ing Adjectives', description: 'Boring vs Bored.', category: 'XIV. More Adjectives', part: 'Written Expression' },

  // Problems with Articles (33-36)
  { id: 'S52', name: 'Skill 33: Articles with Singular Nouns', description: 'Singular count nouns need articles.', category: 'XV. Articles', part: 'Written Expression' },
  { id: 'S53', name: 'Skill 34: Distinguish A and An', description: 'Based on sound, not spelling.', category: 'XV. Articles', part: 'Written Expression' },
  { id: 'S54', name: 'Skill 35: Make Articles Agree with Nouns', description: 'These vs This, Those vs That.', category: 'XV. Articles', part: 'Written Expression' },
  { id: 'S55', name: 'Skill 36: Distinguish Specific and General', description: 'Use of "the".', category: 'XV. Articles', part: 'Written Expression' },

  // Problems with Prepositions (37-38)
  { id: 'S56', name: 'Skill 37: Incorrect Prepositions', description: 'Idiomatic preposition errors.', category: 'XVI. Prepositions', part: 'Written Expression' },
  { id: 'S57', name: 'Skill 38: Omitted Prepositions', description: 'Missing required prepositions.', category: 'XVI. Prepositions', part: 'Written Expression' },

  // Problems with Usage (39-41)
  { id: 'S58', name: 'Skill 39: Make and Do', description: 'Make (create) vs Do (action).', category: 'XVII. Usage', part: 'Written Expression' },
  { id: 'S59', name: 'Skill 40: Like, Alike, Unlike', description: 'Grammar differences of these words.', category: 'XVII. Usage', part: 'Written Expression' },
  { id: 'S60', name: 'Skill 41: Other, Another, Others', description: 'Singular/Plural, Definite/Indefinite.', category: 'XVII. Usage', part: 'Written Expression' },
];

export const TOEFL_LISTENING_SKILLS: Skill[] = [
  // --- PART A: SHORT CONVERSATIONS (Skills 1-17) ---
  { id: 'L01', name: 'Skill 1: Focus on the Last Line', description: 'The answer is often in the second speaker\'s line.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L02', name: 'Skill 2: Choose Answers with Synonyms', description: 'Look for synonyms of keywords.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L03', name: 'Skill 3: Avoid Similar Sounds', description: 'Avoid words that sound like the dialogue but mean something else.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L04', name: 'Skill 4: Draw Conclusions about Who, What, Where', description: 'Infer context from clues.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L05', name: 'Skill 5: Listen for Who and What in Passives', description: 'Determine who performs the action.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L06', name: 'Skill 6: Listen for Who and What with Multiple Nouns', description: 'Keep track of multiple subjects/objects.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L07', name: 'Skill 7: Listen for Negative Expressions', description: 'Not, never, nobody.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L08', name: 'Skill 8: Listen for Double Negative Expressions', description: 'Two negatives make a positive.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L09', name: 'Skill 9: Listen for "Almost" Negative Expressions', description: 'Hardly, barely, scarcely.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L10', name: 'Skill 10: Listen for Negatives with Comparatives', description: 'No one is smarter = He is the smartest.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L11', name: 'Skill 11: Listen for Expressions of Agreement', description: 'So do I, Me too, I\'ll say.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L12', name: 'Skill 12: Listen for Uncertainty and Suggestion', description: 'Isn\'t it? Why not...?', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L13', name: 'Skill 13: Listen for Emphatic Expressions of Surprise', description: 'Then he DID go?', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L14', name: 'Skill 14: Listen for Wishes', description: 'Wishes imply the opposite of reality.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L15', name: 'Skill 15: Listen for Untrue Conditions', description: 'If clauses implying opposite reality.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L16', name: 'Skill 16: Listen for Two- and Three-Part Verbs', description: 'Phrasal verbs / idioms.', category: 'Part A: Short Conversations', part: 'Listening' },
  { id: 'L17', name: 'Skill 17: Listen for Idioms', description: 'Common idiomatic expressions.', category: 'Part A: Short Conversations', part: 'Listening' },

  // --- PART B: LONGER CONVERSATIONS (Skills 18-22) ---
  { id: 'L18', name: 'Skill 18: Anticipate the Topics', description: 'Predict the topic from the options.', category: 'Part B: Longer Conversations', part: 'Listening' },
  { id: 'L19', name: 'Skill 19: Anticipate the Questions', description: 'Predict questions (Who/What/Where) from options.', category: 'Part B: Longer Conversations', part: 'Listening' },
  { id: 'L20', name: 'Skill 20: Determine the Topic', description: 'Identify the main subject of the conversation.', category: 'Part B: Longer Conversations', part: 'Listening' },
  { id: 'L21', name: 'Skill 21: Draw Conclusions about Who, What, When, Where', description: 'Infer details about the speakers and setting.', category: 'Part B: Longer Conversations', part: 'Listening' },
  { id: 'L22', name: 'Skill 22: Listen for Answers in Order', description: 'Answers usually follow the order of the conversation.', category: 'Part B: Longer Conversations', part: 'Listening' },

  // --- PART C: LONG TALKS/LECTURES (Skills 23-27) ---
  { id: 'L23', name: 'Skill 23: Anticipate the Topics', description: 'Predict the academic subject from options.', category: 'Part C: Talks/Lectures', part: 'Listening' },
  { id: 'L24', name: 'Skill 24: Anticipate the Questions', description: 'Predict questions from answer choices.', category: 'Part C: Talks/Lectures', part: 'Listening' },
  { id: 'L25', name: 'Skill 25: Determine the Topic', description: 'Identify the main idea of the lecture.', category: 'Part C: Talks/Lectures', part: 'Listening' },
  { id: 'L26', name: 'Skill 26: Draw Conclusions about Who, What, When, Where', description: 'Infer context about the lecturer and setting.', category: 'Part C: Talks/Lectures', part: 'Listening' },
  { id: 'L27', name: 'Skill 27: Listen for Answers in Order', description: 'Details are presented sequentially.', category: 'Part C: Talks/Lectures', part: 'Listening' },
];

export const TOEFL_READING_SKILLS: Skill[] = [
  // --- READING COMPREHENSION (Skills 1-6) ---
  { id: 'R01', name: 'Skill 1: Main Idea Questions', description: 'Identify the primary topic or main idea.', category: 'I. Reading Comprehension', part: 'Reading' },
  { id: 'R02', name: 'Skill 2: Stated Detail Questions', description: 'Find specific info stated in text.', category: 'I. Reading Comprehension', part: 'Reading' },
  { id: 'R03', name: 'Skill 3: Unstated Detail Questions', description: 'Find what is NOT mentioned.', category: 'I. Reading Comprehension', part: 'Reading' },
  { id: 'R04', name: 'Skill 4: Implied Detail Questions', description: 'Draw inferences not explicitly stated.', category: 'I. Reading Comprehension', part: 'Reading' },
  { id: 'R05', name: 'Skill 5: Vocabulary in Context', description: 'Determine word meaning from context.', category: 'I. Reading Comprehension', part: 'Reading' },
  { id: 'R06', name: 'Skill 6: "Where" Questions', description: 'Locate specific information in the passage.', category: 'I. Reading Comprehension', part: 'Reading' },
];

export const WRITING_GYM_SKILL_MAP = {
  // Level 1: The Mason - Sentence Building
  mason: ['S01', 'S02', 'S03', 'S04', 'S05'],

  // Level 2: Logic Weaver - Connectors & Clauses
  logic_weaver: ['S06', 'S07', 'S08', 'S09', 'S10', 'S11', 'S12'],

  // Task Skills
  integrated_focus: ['S11', 'S12', 'S37', 'S38'],
  academic_focus: ['S17', 'S27', 'S28', 'S29']
};
