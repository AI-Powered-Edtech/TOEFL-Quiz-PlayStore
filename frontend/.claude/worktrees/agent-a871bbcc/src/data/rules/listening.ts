

export const LISTENING_RULES: Record<number, string> = {
    // PART A: Short Dialogues (2-3 exchanges)
    1: "Focus on Last Line (Part A). Generate 2-3 exchange dialogue between two students discussing class schedule, assignment deadline, or campus event. Second speaker's final line contains key information (decision, plan, or implication). Question asks what second speaker will do or implies. Distractors: details from first speaker, literal interpretation when figurative meant, or opposite of what's implied.",

    2: "Synonyms (Part A). Generate 2-3 exchange dialogue between student and professor about course material or assignment. Use specific academic terms in dialogue, paraphrase them in correct answer. Question asks about main topic or what was discussed. Distractors: words from dialogue used literally (not paraphrased), unrelated topics, or opposite meaning.",

    3: "Similar Sounds (Part A). Generate 2-3 exchange dialogue between students about study plans or exam preparation. Include words that sound similar to key information but have different meanings. Question asks about plans or details. Distractors: words that sound like dialogue words but wrong meaning (e.g., 'passed/past', 'hear/here'), or misheard information.",

    4: "Who/What/Where Inference (Part A). Generate 2-3 exchange dialogue in specific campus location (library, lab, cafeteria, bookstore) with contextual clues. Question asks where conversation takes place, who speakers are, or what topic is. Distractors: other campus locations mentioned, wrong speaker roles, or unrelated topics.",

    5: "Passive/Active Voice (Part A). Generate 2-3 exchange dialogue about completed or ongoing action (research, assignment, event). Use active voice in dialogue, passive in answer or vice versa. Question asks who did what. Distractors: reversed agent/patient roles, wrong action, or wrong timing.",

    6: "Dual Subjects (Part A). Generate 2-3 exchange dialogue between student and professor about research project or group work involving multiple people/things. Clearly distinguish who did what. Question asks which person/thing performed specific action. Distractors: wrong subject for action, confused roles, or unmentioned subjects.",

    7: "Negative Expressions (Part A). Generate 2-3 exchange dialogue about availability, completion, or success using negative words ('not', 'never', 'no', 'un-', 'dis-'). Question asks about status or outcome. Distractors: positive interpretation of negative statement, missed negation, or double negative confusion.",

    8: "Double Negatives (Part A). Generate 2-3 exchange dialogue using double negative construction ('not uncommon', 'can't deny', 'no one disagrees'). Question asks about actual meaning (positive). Distractors: literal negative interpretation, single negative meaning, or opposite meaning.",

    9: "Almost Negative (Part A). Generate 2-3 exchange dialogue using words implying scarcity ('hardly', 'barely', 'scarcely', 'only', 'seldom'). Question asks about frequency or quantity. Distractors: positive interpretation (ignoring 'almost negative'), complete negative, or exaggerated positive.",

    10: "Negatives with Comparatives (Part A). Generate 2-3 exchange dialogue using negative comparative ('no one better', 'nothing more important', 'nowhere else'). Question asks about superlative meaning. Distractors: literal comparative interpretation, wrong superlative, or missed negative.",

    11: "Expressions of Agreement (Part A). Generate 2-3 exchange dialogue where second speaker agrees using idiomatic expressions ('So do I', 'Me too', 'I'll say', 'You can say that again', 'Absolutely'). Question asks what second speaker means. Distractors: disagreement, neutral response, or literal interpretation of idiom.",

    12: "Uncertainty/Suggestion (Part A). Generate 2-3 exchange dialogue using question tags ('Isn't it?', 'Don't you think?') or suggestions ('Why not...?', 'How about...?', 'Let's...'). Question asks what speaker suggests or implies. Distractors: statement as fact (not suggestion), wrong suggestion, or opposite meaning.",

    13: "Surprise/Emphasis (Part A). Generate 2-3 exchange dialogue where speaker expresses surprise using emphatic 'do/did/does' ('Then he DID go?', 'You DO understand?'). Question asks what speaker thought before or implies. Distractors: literal interpretation, wrong assumption, or missed emphasis.",

    14: "Wishes (Part A). Generate 2-3 exchange dialogue using 'I wish...' or 'If only...' construction. Question asks about current reality (opposite of wish). Distractors: wish as reality, future possibility, or wrong opposite.",

    15: "Untrue Conditions (Part A). Generate 2-3 exchange dialogue using hypothetical conditionals ('If I were you...', 'If I had time...', 'If it weren't for...'). Question asks about actual situation (opposite of condition). Distractors: hypothetical as reality, wrong actual situation, or future possibility.",

    16: "Phrasal Verbs (Part A). Generate 2-3 exchange dialogue using common phrasal verbs with idiomatic meanings ('put off', 'look into', 'run into', 'turn down', 'figure out'). Question asks meaning of phrasal verb in context. Distractors: literal meaning of verb, wrong phrasal verb, or unrelated meaning.",

    17: "Idioms (Part A). Generate 2-3 exchange dialogue using common English idioms ('under the weather', 'piece of cake', 'hit the books', 'call it a day'). Question asks meaning of idiom. Distractors: literal interpretation, wrong idiom meaning, or unrelated expression.",

    // PART B: Longer Conversations (4-6 exchanges)
    18: "Academic Advising (Part B). Generate 4-6 exchange conversation between student and academic advisor about course selection, major requirements, or graduation planning. Include specific course names, requirements, and deadlines. Questions ask about main topic, specific requirements, and student's plans. Distractors: wrong requirements, confused courses, or unmentioned plans.",

    19: "Office Hours Discussion (Part B). Generate 4-6 exchange conversation between student and professor about research project, paper topic, or exam preparation. Include specific academic content and advice. Questions ask about topic, professor's suggestions, and student's next steps. Distractors: wrong advice, confused topics, or unmentioned steps.",

    20: "Study Group Planning (Part B). Generate 4-6 exchange conversation between 2-3 students organizing study session, group project, or exam review. Include logistics (time, place, materials). Questions ask about plans, responsibilities, and logistics. Distractors: wrong time/place, confused responsibilities, or unmentioned details.",

    21: "Library/Resource Discussion (Part B). Generate 4-6 exchange conversation between student and librarian about finding research materials, using databases, or borrowing resources. Include specific resources and procedures. Questions ask about resources, procedures, and student's needs. Distractors: wrong resources, confused procedures, or unmentioned needs.",

    22: "Campus Event Planning (Part B). Generate 4-6 exchange conversation between students planning campus event (club meeting, fundraiser, presentation). Include logistics, responsibilities, and timeline. Questions ask about event details, who does what, and timeline. Distractors: wrong details, confused roles, or wrong timeline.",

    // PART C: Academic Lectures (6-8 sentences)
    23: "Biology/Life Sciences Lecture (Part C). Generate 6-8 sentence academic lecture about biological topic (evolution, ecology, cellular biology, genetics). Include main concept, supporting details, and examples. Questions ask about main idea, specific details, and examples. Distractors: minor details as main idea, wrong details, or unmentioned examples.",

    24: "History/Social Sciences Lecture (Part C). Generate 6-8 sentence academic lecture about historical event, social phenomenon, or cultural development. Include chronology, causes, and effects. Questions ask about main topic, chronology, and significance. Distractors: wrong chronology, confused causes/effects, or unmentioned significance.",

    25: "Physical Sciences Lecture (Part C). Generate 6-8 sentence academic lecture about physics, chemistry, or astronomy topic (laws, reactions, phenomena). Include theory, process, and applications. Questions ask about main concept, process steps, and applications. Distractors: wrong process, confused steps, or unmentioned applications.",

    26: "Arts/Humanities Lecture (Part C). Generate 6-8 sentence academic lecture about literature, philosophy, art movement, or cultural theory. Include main idea, key figures, and characteristics. Questions ask about main concept, key figures, and significance. Distractors: minor figures, wrong characteristics, or unmentioned significance.",

    27: "Environmental/Earth Sciences Lecture (Part C). Generate 6-8 sentence academic lecture about climate, geology, conservation, or environmental issue. Include problem, causes, and solutions/implications. Questions ask about main issue, causes, and solutions. Distractors: wrong causes, confused solutions, or unmentioned implications."
};

