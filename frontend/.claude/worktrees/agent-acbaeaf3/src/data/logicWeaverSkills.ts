/**
 * Logic Weaver Skill Map
 * Defines the progression path for logical connector skills
 */

export interface LogicWeaverSkill {
    id: string;
    name: string;
    description: string;
    unlockAt: number; // Number of previous skills that must be completed
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    connectors: string[];
}

export const LOGIC_WEAVER_SKILLS: LogicWeaverSkill[] = [
    // Beginner (LW01-LW06) - Basic Relationships
    {
        id: 'LW01',
        name: 'Cause & Effect I',
        description: 'Connect ideas using basic causal linkers',
        unlockAt: 0,
        difficulty: 'beginner',
        connectors: ['because', 'so', 'since']
    },
    {
        id: 'LW02',
        name: 'Contrast I',
        description: 'Express opposing ideas simply',
        unlockAt: 0, // Unlock after 1 completion ideally, but 0 for now
        difficulty: 'beginner',
        connectors: ['but', 'however', 'although']
    },
    {
        id: 'LW03',
        name: 'Addition I',
        description: 'Add information to a sentence',
        unlockAt: 0,
        difficulty: 'beginner',
        connectors: ['and', 'also', 'in addition']
    },
    {
        id: 'LW04',
        name: 'Sequence',
        description: 'Order events or steps',
        unlockAt: 0,
        difficulty: 'beginner',
        connectors: ['first', 'then', 'finally']
    },
    {
        id: 'LW05',
        name: 'Example',
        description: 'Introduce examples',
        unlockAt: 0,
        difficulty: 'beginner',
        connectors: ['for example', 'such as', 'like']
    },
    {
        id: 'LW06',
        name: 'Condition I',
        description: 'Basic conditional statements',
        unlockAt: 0,
        difficulty: 'beginner',
        connectors: ['if', 'unless']
    },

    // Intermediate (LW07-LW12) - Academic Connectors
    {
        id: 'LW07',
        name: 'Cause & Effect II',
        description: 'Academic causal relationships',
        unlockAt: 0,
        difficulty: 'intermediate',
        connectors: ['therefore', 'consequently', 'as a result']
    },
    {
        id: 'LW08',
        name: 'Contrast II',
        description: 'Nuanced contrast and concession',
        unlockAt: 0,
        difficulty: 'intermediate',
        connectors: ['nevertheless', 'on the other hand', 'despite']
    },
    {
        id: 'LW09',
        name: 'Clarification',
        description: 'Explain or clarify ideas',
        unlockAt: 0,
        difficulty: 'intermediate',
        connectors: ['in other words', 'that is', 'specifically']
    },
    {
        id: 'LW10',
        name: 'Emphasis',
        description: 'Highlight important points',
        unlockAt: 0,
        difficulty: 'intermediate',
        connectors: ['indeed', 'in fact', 'notably']
    },
    {
        id: 'LW11',
        name: 'Comparison',
        description: 'Show similarities between ideas',
        unlockAt: 0,
        difficulty: 'intermediate',
        connectors: ['similarly', 'likewise', 'in the same way']
    },
    {
        id: 'LW12',
        name: 'Purpose',
        description: 'Express intent or goal',
        unlockAt: 0,
        difficulty: 'intermediate',
        connectors: ['so that', 'in order to', 'to']
    },

    // Advanced (LW13-LW16) - Sophisticated Flow
    {
        id: 'LW13',
        name: 'Complex Condition',
        description: 'Hypothetical and formal conditions',
        unlockAt: 0,
        difficulty: 'advanced',
        connectors: ['provided that', 'assuming that', 'in case']
    },
    {
        id: 'LW14',
        name: 'Concession',
        description: 'Admit a point while maintaining argument',
        unlockAt: 0,
        difficulty: 'advanced',
        connectors: ['admittedly', 'granted', 'while it is true']
    },
    {
        id: 'LW15',
        name: 'Summary',
        description: 'Conclude or summarize arguments',
        unlockAt: 0,
        difficulty: 'advanced',
        connectors: ['in conclusion', 'to summarize', 'overall']
    },
    {
        id: 'LW16',
        name: 'Alternative',
        description: 'Present choices or alternatives',
        unlockAt: 0,
        difficulty: 'advanced',
        connectors: ['alternatively', 'otherwise', 'instead']
    }
];

export function getLogicWeaverSkill(skillId: string): LogicWeaverSkill | undefined {
    return LOGIC_WEAVER_SKILLS.find(skill => skill.id === skillId);
}

export function getUnlockedLogicWeaverSkills(completedCount: number): LogicWeaverSkill[] {
    // For now, unlock all or use a simple logic
    // Implementing simple sequential unlock logic similar to Mason
    return LOGIC_WEAVER_SKILLS.filter((_, index) => index <= completedCount);
}

export function getNextLogicWeaverSkill(completedCount: number): LogicWeaverSkill | undefined {
    return LOGIC_WEAVER_SKILLS[completedCount];
}
