/**
 * Per-Skill AI Prompts for Logic Weaver
 * Each skill has tailored instructions focusing on specific connectors and relationship types.
 */

interface SkillPromptConfig {
    skillId: string;
    name: string;
    relationship: string;
    connectors: string[];
    instruction: string;
    exampleMain: string;
    exampleSub: string;
    exampleCorrect: string;
}

const SKILL_PROMPTS: SkillPromptConfig[] = [
    // ========== BEGINNER (LW01–LW06) ==========
    {
        skillId: 'LW01',
        name: 'Cause & Effect I',
        relationship: 'cause_effect',
        connectors: ['because', 'so', 'since'],
        instruction: 'Generate a sentence pair where the second clause is a CAUSE or RESULT of the first. Use simple, direct causal language. The correct_connector MUST be one of: because, so, since.',
        exampleMain: 'Many students struggle with time management in college',
        exampleSub: 'they often procrastinate on important assignments',
        exampleCorrect: 'so'
    },
    {
        skillId: 'LW02',
        name: 'Contrast I',
        relationship: 'contrast',
        connectors: ['but', 'however', 'although'],
        instruction: 'Generate a sentence pair where the two clauses express OPPOSING or CONTRASTING ideas. The correct_connector MUST be one of: but, however, although.',
        exampleMain: 'Online learning offers flexible scheduling for students',
        exampleSub: 'it lacks the social interaction of traditional classrooms',
        exampleCorrect: 'however'
    },
    {
        skillId: 'LW03',
        name: 'Addition I',
        relationship: 'addition',
        connectors: ['and', 'also', 'in addition'],
        instruction: 'Generate a sentence pair where the second clause ADDS supporting information to the first. The correct_connector MUST be one of: and, also, in addition.',
        exampleMain: 'Regular exercise improves cardiovascular health',
        exampleSub: 'it enhances mental well-being and reduces stress',
        exampleCorrect: 'in addition'
    },
    {
        skillId: 'LW04',
        name: 'Sequence',
        relationship: 'sequence',
        connectors: ['first', 'then', 'finally'],
        instruction: 'Generate a sentence pair that describes SEQUENTIAL steps or events. The correct_connector MUST be one of: first, then, finally.',
        exampleMain: 'Researchers collected data from multiple sources',
        exampleSub: 'they analyzed the results using statistical software',
        exampleCorrect: 'then'
    },
    {
        skillId: 'LW05',
        name: 'Example',
        relationship: 'example',
        connectors: ['for example', 'such as', 'like'],
        instruction: 'Generate a sentence pair where the second clause provides a SPECIFIC EXAMPLE of the first. The correct_connector MUST be one of: for example, such as, like.',
        exampleMain: 'Renewable energy sources are becoming more affordable',
        exampleSub: 'solar panel costs have dropped by 70% in the last decade',
        exampleCorrect: 'for example'
    },
    {
        skillId: 'LW06',
        name: 'Condition I',
        relationship: 'condition',
        connectors: ['if', 'unless'],
        instruction: 'Generate a sentence pair where one clause states a CONDITION for the other. The correct_connector MUST be one of: if, unless.',
        exampleMain: 'Students will not pass the exam',
        exampleSub: 'they study consistently throughout the semester',
        exampleCorrect: 'unless'
    },

    // ========== INTERMEDIATE (LW07–LW12) ==========
    {
        skillId: 'LW07',
        name: 'Cause & Effect II',
        relationship: 'cause_effect',
        connectors: ['therefore', 'consequently', 'as a result'],
        instruction: 'Generate a sentence pair showing ACADEMIC causal relationships. Use formal tone. The correct_connector MUST be one of: therefore, consequently, as a result.',
        exampleMain: 'The experiment failed to control for confounding variables',
        exampleSub: 'the conclusions drawn from the study are unreliable',
        exampleCorrect: 'consequently'
    },
    {
        skillId: 'LW08',
        name: 'Contrast II',
        relationship: 'contrast',
        connectors: ['nevertheless', 'on the other hand', 'despite'],
        instruction: 'Generate a sentence pair showing NUANCED contrast or concession in academic context. The correct_connector MUST be one of: nevertheless, on the other hand, despite.',
        exampleMain: 'The initial results appeared promising',
        exampleSub: 'further analysis revealed significant methodological flaws',
        exampleCorrect: 'nevertheless'
    },
    {
        skillId: 'LW09',
        name: 'Clarification',
        relationship: 'clarification',
        connectors: ['in other words', 'that is', 'specifically'],
        instruction: 'Generate a sentence pair where the second clause CLARIFIES or EXPLAINS the first in simpler terms. The correct_connector MUST be one of: in other words, that is, specifically.',
        exampleMain: 'The policy aims to achieve carbon neutrality by 2050',
        exampleSub: 'the country plans to balance its emissions with removal efforts',
        exampleCorrect: 'in other words'
    },
    {
        skillId: 'LW10',
        name: 'Emphasis',
        relationship: 'emphasis',
        connectors: ['indeed', 'in fact', 'notably'],
        instruction: 'Generate a sentence pair where the second clause EMPHASIZES or STRENGTHENS the point made in the first. The correct_connector MUST be one of: indeed, in fact, notably.',
        exampleMain: 'Sleep deprivation affects academic performance',
        exampleSub: 'students who sleep less than six hours score 20% lower on exams',
        exampleCorrect: 'in fact'
    },
    {
        skillId: 'LW11',
        name: 'Comparison',
        relationship: 'comparison',
        connectors: ['similarly', 'likewise', 'in the same way'],
        instruction: 'Generate a sentence pair where the second clause shows a SIMILARITY to the first. The correct_connector MUST be one of: similarly, likewise, in the same way.',
        exampleMain: 'Japan has invested heavily in high-speed rail infrastructure',
        exampleSub: 'China has expanded its bullet train network across the country',
        exampleCorrect: 'similarly'
    },
    {
        skillId: 'LW12',
        name: 'Purpose',
        relationship: 'purpose',
        connectors: ['so that', 'in order to', 'to'],
        instruction: 'Generate a sentence pair where the second clause expresses the PURPOSE or GOAL of the first. The correct_connector MUST be one of: so that, in order to, to.',
        exampleMain: 'The university expanded its scholarship program',
        exampleSub: 'more disadvantaged students could access higher education',
        exampleCorrect: 'so that'
    },

    // ========== ADVANCED (LW13–LW16) ==========
    {
        skillId: 'LW13',
        name: 'Complex Condition',
        relationship: 'condition',
        connectors: ['provided that', 'assuming that', 'in case'],
        instruction: 'Generate a sentence pair using FORMAL or HYPOTHETICAL conditions. The correct_connector MUST be one of: provided that, assuming that, in case.',
        exampleMain: 'The merger will proceed as planned',
        exampleSub: 'both parties agree to the revised terms by Friday',
        exampleCorrect: 'provided that'
    },
    {
        skillId: 'LW14',
        name: 'Concession',
        relationship: 'concession',
        connectors: ['admittedly', 'granted', 'while it is true'],
        instruction: 'Generate a sentence pair where the speaker CONCEDES a point while maintaining their argument. The correct_connector MUST be one of: admittedly, granted, while it is true.',
        exampleMain: 'the implementation costs are significant',
        exampleSub: 'the long-term benefits far outweigh the initial investment',
        exampleCorrect: 'admittedly'
    },
    {
        skillId: 'LW15',
        name: 'Summary',
        relationship: 'summary',
        connectors: ['in conclusion', 'to summarize', 'overall'],
        instruction: 'Generate a sentence pair where the second clause SUMMARIZES or CONCLUDES an argument. The correct_connector MUST be one of: in conclusion, to summarize, overall.',
        exampleMain: 'Multiple studies have demonstrated the effectiveness of early intervention programs',
        exampleSub: 'investing in early childhood education yields significant societal returns',
        exampleCorrect: 'overall'
    },
    {
        skillId: 'LW16',
        name: 'Alternative',
        relationship: 'alternative',
        connectors: ['alternatively', 'otherwise', 'instead'],
        instruction: 'Generate a sentence pair where the second clause presents an ALTERNATIVE choice or consequence. The correct_connector MUST be one of: alternatively, otherwise, instead.',
        exampleMain: 'Companies can adopt remote work policies to reduce overhead costs',
        exampleSub: 'they could invest in smaller regional office spaces',
        exampleCorrect: 'alternatively'
    }
];

/**
 * Get the skill-specific prompt for a Logic Weaver exercise.
 * Falls back to a generic prompt if skill ID is not found.
 */
export function getLogicWeaverSkillPrompt(skillId: string): string {
    const config = SKILL_PROMPTS.find(s => s.skillId === skillId);

    if (!config) {
        return ''; // Will use the generic LOGIC_WEAVER_PROMPT
    }

    return `
=== SKILL-SPECIFIC INSTRUCTIONS ===
SKILL: ${config.name} (${config.skillId})
RELATIONSHIP TYPE: ${config.relationship}
ALLOWED CONNECTORS: ${config.connectors.join(', ')}

${config.instruction}

The "correct_connector" field MUST be one of: ${config.connectors.join(', ')}
The "connectors" array must include the correct one plus 3 distractors from OTHER relationship types.

EXAMPLE for this skill:
{
  "main_clause": "${config.exampleMain}",
  "subordinate_clause": "${config.exampleSub}",
  "connectors": ["${config.exampleCorrect}", "furthermore", "meanwhile", "whereas"],
  "correct_connector": "${config.exampleCorrect}",
  "relationship_type": "${config.relationship}",
  "explanation": "The connector '${config.exampleCorrect}' correctly links these clauses.",
  "translation": "Terjemahan bahasa Indonesia yang natural",
  "topic_category": "Academic Topic"
}

DO NOT use these exact example sentences. Generate completely NEW content.
`;
}

/**
 * Get the next skill ID after the given one.
 */
export function getNextSkillId(currentSkillId: string): string | null {
    const index = SKILL_PROMPTS.findIndex(s => s.skillId === currentSkillId);
    if (index === -1 || index >= SKILL_PROMPTS.length - 1) return null;
    return SKILL_PROMPTS[index + 1].skillId;
}
