import { QuizData } from '../types';

// This simulates your backend database (80% of the content)
export const QUESTION_BANK: QuizData[] = [
    // --- SKILL 1: SUBJECTS AND VERBS ---
    {
        id: 'db_s1_001',
        skill_id: 1, // S01
        skill_type: 'structure',
        section: 'structure',
        interaction: 'multiple_choice',
        prompt: "_______ was ringing continuously for hours.",
        choices: [
            'Loudly',
            'In the morning',
            'The phone',
            'The bells'
        ],
        correct_response: ['The phone'],
        cefr_target: 'A2',
        difficulty_score: 20,
        stimulus: { text: '' },
        metadata: {
            source: 'db',
            explanation: "The sentence needs a subject. 'Loudly' and 'In the morning' are not subjects. 'The bells' is plural and would require 'were'. 'The phone' fits the singular verb 'was'.",
            pattern_tip: "Check Subject-Verb Agreement",
            qti_compliant: true,
            cefr_compliant: true
        }
    },
    {
        id: 'db_s1_002',
        skill_id: 1, // S01
        skill_type: 'structure',
        section: 'structure',
        interaction: 'multiple_choice',
        prompt: "Newspapers _______ every morning and every evening.",
        choices: [
            'delivery',
            'are delivered',
            'on time',
            'regularly'
        ],
        correct_response: ['are delivered'],
        cefr_target: 'A2',
        difficulty_score: 30,
        stimulus: { text: '' },
        metadata: {
            source: 'db',
            explanation: "The sentence has a subject 'Newspapers' but is missing a verb. Option B provides the passive verb phrase 'are delivered'.",
            pattern_tip: "Missing Verb",
            qti_compliant: true,
            cefr_compliant: true
        }
    },
    {
        id: 'db_s1_003',
        skill_id: 1, // S01
        skill_type: 'structure',
        section: 'structure',
        interaction: 'multiple_choice',
        prompt: "The boy _______ to the movies with a friend last night.",
        choices: [
            'he is going',
            'went',
            'going',
            'always'
        ],
        correct_response: ['went'],
        cefr_target: 'A2',
        difficulty_score: 25,
        stimulus: { text: '' },
        metadata: {
            source: 'db',
            explanation: "The sentence needs a main verb. 'going' is a participle. 'went' is the correct past tense verb.",
            pattern_tip: "Missing Main Verb",
            qti_compliant: true,
            cefr_compliant: true
        }
    },
    {
        id: 'db_s1_004',
        skill_id: 1, // S01
        skill_type: 'structure',
        section: 'structure',
        interaction: 'multiple_choice',
        prompt: "The plane _______ landing at the airport in five minutes.",
        choices: [
            'it is',
            'it really is',
            'is descending',
            'will be'
        ],
        correct_response: ['will be'],
        cefr_target: 'B1',
        difficulty_score: 40,
        stimulus: { text: '' },
        metadata: {
            source: 'db',
            explanation: "The subject is 'The plane'. Option A and B repeat the subject 'it'. Option D 'will be' creates the future continuous 'will be landing'.",
            pattern_tip: "Double Subject Error",
            qti_compliant: true,
            cefr_compliant: true
        }
    },
    {
        id: 'db_s1_005',
        skill_id: 1, // S01
        skill_type: 'structure',
        section: 'structure',
        interaction: 'multiple_choice',
        prompt: "The new computer program _______ a variety of helpful applications.",
        choices: [
            'provides',
            'has provides',
            'providing',
            'to provide'
        ],
        correct_response: ['provides'],
        cefr_target: 'B1',
        difficulty_score: 35,
        stimulus: { text: '' },
        metadata: {
            source: 'db',
            explanation: "The sentence needs a main verb. 'provides' is the correct singular verb.",
            pattern_tip: "Subject-Verb Agreement",
            qti_compliant: true,
            cefr_compliant: true
        }
    },
    
    // --- SKILL 2: OBJECTS OF PREPOSITIONS ---
    {
        id: 'db_s2_001',
        skill_id: 2, // S02
        skill_type: 'structure',
        section: 'structure',
        interaction: 'multiple_choice',
        prompt: "With his friend, _______ found the movie theater.",
        choices: [
            'has',
            'he',
            'later',
            'when'
        ],
        correct_response: ['he'],
        cefr_target: 'B1',
        difficulty_score: 40,
        stimulus: { text: '' },
        metadata: {
            source: 'db',
            explanation: "'With his friend' is a prepositional phrase. The sentence needs a subject. 'he' is the subject.",
            pattern_tip: "Object of Preposition",
            qti_compliant: true,
            cefr_compliant: true
        }
    },

    // --- SKILL 20: AGREEMENT (Error Identification) ---
    // Note: Canonical format typically handles choices, but prompt can be formatted for error ID
    {
        id: 'db_s20_001',
        skill_id: 20, // S20
        skill_type: 'structure',
        section: 'written',
        interaction: 'identify_error', // Explicit interaction type
        prompt: "The {A}climbers{/A} on the {B}sheer{/B} face of the mountain {C}needs{/C} to be {D}rescued{/D}.",
        choices: [
            'climbers',
            'sheer',
            'needs',
            'rescued'
        ],
        correct_response: ['needs'],
        cefr_target: 'B2',
        difficulty_score: 60,
        stimulus: { text: '' },
        metadata: {
            source: 'db',
            explanation: "The subject is 'climbers' (plural). The verb 'needs' (singular) disagrees. It should be 'need'. Do not get confused by 'mountain'.",
            pattern_tip: "Subject-Verb Agreement",
            qti_compliant: true,
            cefr_compliant: true
        }
    }
];

export const getQuestionsBySkill = (skillId: string, limit: number = 8): QuizData[] => {
    // DATABASE LEVEL FILTER (WHERE skill_id = ?)
    // Extract numeric ID from string (e.g., S01 -> 1)
    const numericId = parseInt(skillId.replace(/\D/g, ''), 10);
    const relevant = QUESTION_BANK.filter(q => q.skill_id === numericId);
    
    // Shuffle
    const shuffled = relevant.sort(() => 0.5 - Math.random());
    
    // Return requested amount
    return shuffled.slice(0, limit);
};