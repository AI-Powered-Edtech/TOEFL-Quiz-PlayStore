/**
 * Complexity Ladder Skill Map
 * Defines the progression path for sentence complexity skills
 */

export interface ComplexityLadderSkill {
    id: string;
    name: string;
    description: string;
    unlockAt: number; // Number of previous skills that must be completed
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    structures: string[];
}

export const COMPLEXITY_LADDER_SKILLS: ComplexityLadderSkill[] = [
    // Beginner (CL01-CL05) - Foundation
    {
        id: 'CL01',
        name: 'Simple Sentences',
        description: 'Master the basic Subject-Verb-Object structure',
        unlockAt: 0,
        difficulty: 'beginner',
        structures: ['S+V', 'S+V+O', 'S+V+Adj']
    },
    {
        id: 'CL02',
        name: 'Compound Subjects',
        description: 'Connect multiple subjects in one sentence',
        unlockAt: 0,
        difficulty: 'beginner',
        structures: ['S+S+V', 'S+S+V+O']
    },
    {
        id: 'CL03',
        name: 'Coordinating Conjunctions',
        description: 'Join independent clauses with FANBOYS',
        unlockAt: 0,
        difficulty: 'beginner',
        structures: ['IC + , + for/and/nor/but/or/yet/so + IC']
    },
    {
        id: 'CL04',
        name: 'Prepositional Phrases',
        description: 'Add detail about time and place',
        unlockAt: 0,
        difficulty: 'beginner',
        structures: ['Prep Phrase + S + V', 'S + V + Prep Phrase']
    },
    {
        id: 'CL05',
        name: 'Adverbs of Frequency',
        description: 'Describe how often something happens',
        unlockAt: 0,
        difficulty: 'beginner',
        structures: ['S + Adv + V', 'S + be + Adv']
    },

    // Intermediate (CL06-CL10) - Expansion
    {
        id: 'CL06',
        name: 'Complex Sentences (Time)',
        description: 'Use time clauses to connect events',
        unlockAt: 0,
        difficulty: 'intermediate',
        structures: ['After/When/While + S + V, S + V']
    },
    {
        id: 'CL07',
        name: 'Complex Sentences (Reason)',
        description: 'Explain why something happens',
        unlockAt: 0,
        difficulty: 'intermediate',
        structures: ['Because/Since/As + S + V, S + V']
    },
    {
        id: 'CL08',
        name: 'Relative Clauses (Subject)',
        description: 'Describe people or things',
        unlockAt: 0,
        difficulty: 'intermediate',
        structures: ['...person who...', '...thing which/that...']
    },
    {
        id: 'CL09',
        name: 'Conditional I (Real)',
        description: 'Talk about real possibilities',
        unlockAt: 0,
        difficulty: 'intermediate',
        structures: ['If + Present, Will + Verb']
    },
    {
        id: 'CL10',
        name: 'Passive Voice',
        description: 'Focus on the action, not the doer',
        unlockAt: 0,
        difficulty: 'intermediate',
        structures: ['Object + be + V3 (+ by Agent)']
    },

    // Advanced (CL11-CL15) - Mastery
    {
        id: 'CL11',
        name: 'Participle Phrases',
        description: 'Reduce relative clauses for flow',
        unlockAt: 0,
        difficulty: 'advanced',
        structures: ['V-ing..., S + V', 'V3..., S + V']
    },
    {
        id: 'CL12',
        name: 'Inversion',
        description: 'Add emphasis with inverted word order',
        unlockAt: 0,
        difficulty: 'advanced',
        structures: ['Never have I...', 'Not only... but also...']
    },
    {
        id: 'CL13',
        name: 'Cleft Sentences',
        description: 'Emphasize specific information',
        unlockAt: 0,
        difficulty: 'advanced',
        structures: ['It is... that...', 'What... is...']
    },
    {
        id: 'CL14',
        name: 'Conditional III (Unreal)',
        description: 'Regrets and impossible pasts',
        unlockAt: 0,
        difficulty: 'advanced',
        structures: ['If + Past Perfect, would have + V3']
    },
    {
        id: 'CL15',
        name: 'Nominalization',
        description: 'Turn verbs/adjectives into nouns for academic tone',
        unlockAt: 0,
        difficulty: 'advanced',
        structures: ['V -> Noun', 'Adj -> Noun']
    }
];

export function getComplexityLadderSkill(skillId: string): ComplexityLadderSkill | undefined {
    return COMPLEXITY_LADDER_SKILLS.find(skill => skill.id === skillId);
}

// Simple unlock logic: unlock based on count
export function getUnlockedComplexityLadderSkills(completedCount: number): ComplexityLadderSkill[] {
    return COMPLEXITY_LADDER_SKILLS.filter((_, index) => index <= completedCount);
}
