/**
 * Mason Level Skill Map
 * Defines the progression path for sentence construction skills
 */

export interface MasonSkill {
    id: string;
    name: string;
    description: string;
    unlockAt: number; // Number of previous skills that must be completed
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    grammarFocus: string[];
}

export const MASON_SKILLS: MasonSkill[] = [
    // Beginner (S1-S8)
    {
        id: 'S1',
        name: 'Subject + Verb Agreement',
        description: 'Build simple sentences with correct subject-verb agreement',
        unlockAt: 0,
        difficulty: 'beginner',
        grammarFocus: ['subject-verb agreement', 'present tense']
    },
    {
        id: 'S2',
        name: 'Simple Compound Sentences',
        description: 'Connect two independent clauses with coordinating conjunctions',
        unlockAt: 1,
        difficulty: 'beginner',
        grammarFocus: ['coordinating conjunctions', 'compound sentences']
    },
    {
        id: 'S3',
        name: 'Basic Noun Phrases',
        description: 'Construct sentences with article + adjective + noun patterns',
        unlockAt: 2,
        difficulty: 'beginner',
        grammarFocus: ['articles', 'adjectives', 'noun phrases']
    },
    {
        id: 'S4',
        name: 'Simple Past Tense',
        description: 'Build sentences using regular and irregular past tense verbs',
        unlockAt: 2,
        difficulty: 'beginner',
        grammarFocus: ['past tense', 'irregular verbs']
    },
    {
        id: 'S5',
        name: 'Prepositional Phrases',
        description: 'Add location and time information using prepositions',
        unlockAt: 3,
        difficulty: 'beginner',
        grammarFocus: ['prepositions', 'prepositional phrases']
    },
    {
        id: 'S6',
        name: 'Modal Verbs',
        description: 'Express ability, permission, and possibility with modals',
        unlockAt: 4,
        difficulty: 'beginner',
        grammarFocus: ['modal verbs', 'can/could/may/might']
    },
    {
        id: 'S7',
        name: 'Comparative & Superlative',
        description: 'Make comparisons using -er/-est and more/most',
        unlockAt: 5,
        difficulty: 'beginner',
        grammarFocus: ['comparatives', 'superlatives']
    },
    {
        id: 'S8',
        name: 'Present Perfect Tense',
        description: 'Describe experiences and recent actions',
        unlockAt: 6,
        difficulty: 'beginner',
        grammarFocus: ['present perfect', 'have/has + past participle']
    },

    // Intermediate (S9-S16)
    {
        id: 'S9',
        name: 'Relative Clauses (Subject)',
        description: 'Use who/that/which to describe people and things',
        unlockAt: 7,
        difficulty: 'intermediate',
        grammarFocus: ['relative clauses', 'subject pronouns']
    },
    {
        id: 'S10',
        name: 'Passive Voice',
        description: 'Change focus from subject to object using passive voice',
        unlockAt: 8,
        difficulty: 'intermediate',
        grammarFocus: ['passive voice', 'by-phrases']
    },
    {
        id: 'S11',
        name: 'Conditionals (First & Second)',
        description: 'Express real and hypothetical situations with if-clauses',
        unlockAt: 9,
        difficulty: 'intermediate',
        grammarFocus: ['conditionals', 'if-clauses']
    },
    {
        id: 'S12',
        name: 'Gerunds & Infinitives',
        description: 'Use verb forms as nouns or objects correctly',
        unlockAt: 10,
        difficulty: 'intermediate',
        grammarFocus: ['gerunds', 'infinitives']
    },
    {
        id: 'S13',
        name: 'Reported Speech',
        description: 'Report what someone else said with tense changes',
        unlockAt: 11,
        difficulty: 'intermediate',
        grammarFocus: ['reported speech', 'tense shifts']
    },
    {
        id: 'S14',
        name: 'Embedded Questions',
        description: 'Form polite questions and questions inside statements',
        unlockAt: 12,
        difficulty: 'intermediate',
        grammarFocus: ['embedded questions', 'word order']
    },
    {
        id: 'S15',
        name: 'Adverbial Clauses',
        description: 'Show time, cause, and contrast with subordinating conjunctions',
        unlockAt: 13,
        difficulty: 'intermediate',
        grammarFocus: ['adverbial clauses', 'subordinating conjunctions']
    },
    {
        id: 'S16',
        name: 'Used to & Would',
        description: 'Talk about past habits and states',
        unlockAt: 14,
        difficulty: 'intermediate',
        grammarFocus: ['used to', 'would', 'past habits']
    },

    // Advanced (S17-S25)
    {
        id: 'S17',
        name: 'Third Conditional & Mixed',
        description: 'Discuss past regrets and unreal situations',
        unlockAt: 15,
        difficulty: 'advanced',
        grammarFocus: ['third conditional', 'mixed conditionals']
    },
    {
        id: 'S18',
        name: 'Reduced Relative Clauses',
        description: 'Concise modification using participle phrases',
        unlockAt: 16,
        difficulty: 'advanced',
        grammarFocus: ['reduced clauses', 'participles']
    },
    {
        id: 'S19',
        name: 'Inversion',
        description: 'Use inversion for emphasis or formal style',
        unlockAt: 17,
        difficulty: 'advanced',
        grammarFocus: ['inversion', 'negative adverbials']
    },
    {
        id: 'S20',
        name: 'Cleft Sentences',
        description: 'Emphasize specific information using It/What clauses',
        unlockAt: 18,
        difficulty: 'advanced',
        grammarFocus: ['cleft sentences', 'emphasis']
    },
    {
        id: 'S21',
        name: 'Participial Phrases',
        description: 'Combine sentences using present and past participles',
        unlockAt: 19,
        difficulty: 'advanced',
        grammarFocus: ['participial phrases', 'sentence combination']
    },
    {
        id: 'S22',
        name: 'Subjunctive Mood',
        description: 'Express wishes, suggestions, and demands formally',
        unlockAt: 20,
        difficulty: 'advanced',
        grammarFocus: ['subjunctive', 'formal english']
    },
    {
        id: 'S23',
        name: 'Future Perfect & Continuous',
        description: 'Talk about actions in progress or completed in the future',
        unlockAt: 21,
        difficulty: 'advanced',
        grammarFocus: ['future perfect', 'future continuous']
    },
    {
        id: 'S24',
        name: 'Discourse Markers',
        description: 'Connect ideas logically in standard written English',
        unlockAt: 22,
        difficulty: 'advanced',
        grammarFocus: ['discourse markers', 'cohesion']
    },
    {
        id: 'S25',
        name: 'Complex Sentence Structures',
        description: 'Master advanced coordination and subordination patterns',
        unlockAt: 23,
        difficulty: 'advanced',
        grammarFocus: ['complex sentences', 'advanced grammar']
    }
];

/**
 * Get skill by ID
 */
export function getMasonSkill(skillId: string): MasonSkill | undefined {
    return MASON_SKILLS.find(skill => skill.id === skillId);
}

/**
 * Get unlocked skills based on completed count
 */
export function getUnlockedSkills(completedCount: number): MasonSkill[] {
    return MASON_SKILLS.filter(skill => skill.unlockAt <= completedCount);
}

/**
 * Get next skill to unlock
 */
export function getNextSkill(completedCount: number): MasonSkill | undefined {
    return MASON_SKILLS.find(skill => skill.unlockAt === completedCount);
}
