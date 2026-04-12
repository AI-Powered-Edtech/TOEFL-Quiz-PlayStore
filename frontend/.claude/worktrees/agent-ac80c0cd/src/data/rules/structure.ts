

export const STRUCTURE_RULES: Record<number, string> = {
    1: "Subject-Verb requirement. Generate complex academic sentences where students must identify the missing verb that agrees with a distant or complex subject. Pattern: [Long subject with modifiers] _______ [predicate]. Distractors: verb forms agreeing with nearby nouns in modifying phrases, not the actual subject.",

    2: "Object of preposition cannot be subject. Generate sentences starting with prepositional phrase followed by verb and subject. Pattern: [Prep phrase] _______ [noun]. Blank = verb. Distractors: verbs agreeing with object of preposition instead of actual subject after the verb.",

    3: "Appositive recognition. Generate sentences with appositive (noun renaming another noun in commas) where students must identify the main verb. Pattern: [Subject], [appositive], _______. Distractors: verb forms treating appositive as subject, or missing main verb entirely.",

    4: "Present participle (-ing) usage. Generate sentences where blank requires either 'be + V-ing' (progressive) or standalone -ing as adjective. Pattern: The [noun] _______ [context]. Distractors: bare -ing without 'be', or 'be' without -ing, or wrong tense of 'be'.",

    5: "Past participle (V3) usage. Generate sentences testing 'have/has/had + V3' or 'be + V3' (passive). Pattern: The [noun] _______ [by/since/context]. Distractors: wrong auxiliary (have vs be), bare V3, or wrong participle form.",

    6: "Coordinate connectors (and, but, or, so). Generate two independent clauses where blank is the connector. Pattern: [Complete clause] _______ [complete clause]. Distractors: subordinating conjunctions, or missing comma, or wrong logical relationship.",

    7: "Adverb time/cause connectors (because, after, before, when, since). Generate complex sentence where blank is connector joining clauses. Pattern: _______ [subject verb], [subject verb]. Distractors: coordinate connectors, or connectors with wrong time/cause logic.",

    8: "Adverb contrast/condition connectors (although, while, if, unless). Generate sentence testing connector choice based on contrast or condition. Pattern: _______ [clause], [clause]. Distractors: time connectors, or coordinate connectors, or wrong logical relationship.",

    9: "Noun clause connectors (what, when, where, why, how, that, whether). Generate sentence where noun clause functions as subject or object. Pattern: [Subject] knows _______ [clause]. Distractors: adjective clause connectors, or adverb connectors, or missing connector.",

    10: "Noun clause connector as subject (who, what, which, whatever). Generate sentence where connector is both connector AND subject of noun clause. Pattern: _______ happened is unclear. Distractors: connectors requiring separate subject, or wrong connector type.",

    11: "Adjective clause connectors (whom, which, that) + subject. Generate sentence modifying noun with adjective clause. Pattern: [Noun] _______ [subject] [verb]. Distractors: noun clause connectors, or missing subject after connector, or wrong connector for person/thing.",

    12: "Adjective clause connector as subject (who, which, that). Generate sentence where connector is both connector AND subject. Pattern: [Noun] _______ [verb]. Distractors: connectors requiring separate subject (whom), or noun clause connectors, or missing verb.",

    13: "Reduced adjective clause. Generate sentence with reduced clause (omit connector + be). Pattern: [Noun] _______ [by/in/context]. Blank = participle. Distractors: full clause with connector, or wrong participle form (active -ing vs passive -ed).",

    14: "Reduced adverb clause. Generate sentence with reduced adverb clause (omit subject + be, keep connector). Pattern: _______ [participle phrase], [main clause]. Distractors: full clause, or missing connector, or wrong participle form.",

    15: "Question word inversion. Generate question starting with question word. Pattern: _______ the experiment conducted? Distractors: statement word order (no inversion), or missing auxiliary, or wrong auxiliary.",

    16: "Place expression inversion (Here, There). Generate sentence starting with place expression. Pattern: _______ the results. Blank = verb + subject inverted. Distractors: normal word order, or wrong verb agreement, or missing inversion.",

    17: "Negative expression inversion (Rarely, Never, Seldom, Not only). Generate sentence starting with negative. Pattern: _______ such results been observed. Blank = auxiliary + subject. Distractors: normal word order, or missing auxiliary, or wrong auxiliary.",

    18: "Conditional inversion (omit 'if'). Generate conditional sentence without 'if'. Pattern: _______ the conditions been met, [result]. Blank = Had/Should/Were + subject. Distractors: normal 'if' structure, or wrong auxiliary, or no inversion.",

    19: "Comparison inversion. Generate comparison sentence with inverted second clause. Pattern: [Subject] [verb] better than _______ [subject]. Blank = auxiliary inverted. Distractors: normal word order, or wrong auxiliary, or missing inversion."
};

