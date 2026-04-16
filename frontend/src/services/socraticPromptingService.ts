import { callGroq, GroqMessage } from './groq/client';
import { getUserTier, consumeToken, type SubscriptionTier } from './subscriptionService';

export type SocraticStrategy = 
    | 'clarifying'
    | 'probing'
    | 'challenging'
    | 'example_based'
    | 'connective';

export interface SocraticPromptConfig {
    strategy: SocraticStrategy;
    includeExamples: boolean;
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export const DEFAULT_SOCRATIC_CONFIG: SocraticPromptConfig = {
    strategy: 'probing',
    includeExamples: true,
    skillLevel: 'intermediate',
};

const generateSocraticPrompt = (
    userQuestion: string,
    skillTitle: string,
    contextText: string,
    config: Partial<SocraticPromptConfig> = {}
): string => {
    const cfg = { ...DEFAULT_SOCRATIC_CONFIG, ...config };
    
    const strategyPrompts: Record<SocraticStrategy, string> = {
        clarifying: `Your goal is to help the student clarify their understanding. Ask questions that help them identify exactly what they don't understand.`,
        probing: `Your goal is to probe deeper into the student's understanding. Ask questions that make them think about the underlying principles.`,
        challenging: `Your goal is to challenge assumptions. Ask questions that make them consider alternative perspectives or edge cases.`,
        example_based: `Your goal is to use examples to guide understanding. Provide similar examples and ask the student to identify patterns.`,
        connective: `Your goal is to connect concepts. Ask questions that help them see how this relates to things they already know.`,
    };

    const levelGuidance: Record<string, string> = {
        beginner: `Use simple, clear language. Give direct explanations when needed.`,
        intermediate: `Balance hints with explanations. Encourage critical thinking.`,
        advanced: `Focus on nuances and edge cases. Challenge their assumptions.`,
    };

    const systemPrompt = `
You are an expert TOEFL ${skillTitle} tutor using the Socratic method to teach. 

${strategyPrompts[cfg.strategy]}
${levelGuidance[cfg.skillLevel]}

Guidelines:
- Ask guiding questions FIRST before giving direct answers
- Use the user's context: "${contextText}"
- Be encouraging but precise
- When they struggle, provide a hint rather than the full answer
- Always connect back to TOEFL test skills
- Keep responses concise (2-4 sentences for questions, brief for explanations)
- Use **bold** for key terms
- If they're stuck, provide a specific example related to ${skillTitle}

Remember: Your role is to guide them to discover the answer themselves, not to simply provide it.
`;

    const messages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion },
    ];

    return JSON.stringify(messages);
};

export const createSocraticQuestion = (
    skill: string,
    userLevel: 'beginner' | 'intermediate' | 'advanced',
    currentUnderstanding: string
): string => {
    const templates: Record<string, Record<string, string[]>> = {
        Grammar: {
            beginner: [
                'What is the subject of this sentence?',
                'Which tense is being used here?',
                'Can you identify the verb form?',
            ],
            intermediate: [
                'How does the verb form change the meaning?',
                'What grammatical rule applies here?',
                'Why might this structure be incorrect?',
            ],
            advanced: [
                'How does this grammatical choice affect tone?',
                'What nuance does this form add?',
                'Compare this to an alternative construction.',
            ],
        },
        Vocabulary: {
            beginner: [
                'What does this word mean in your own words?',
                'Can you find a simpler word with the same meaning?',
                'What word type is this (noun, verb, etc.)?',
            ],
            intermediate: [
                'How does context change this word\'s meaning?',
                'What collocations does this word commonly appear in?',
                'What are alternative words for this?',
            ],
            advanced: [
                'What register does this word belong to?',
                'How does this word contribute to the overall tone?',
                'What connotation does this word carry?',
            ],
        },
        Writing: {
            beginner: [
                'What is the main idea of this paragraph?',
                'How many ideas are being discussed?',
                'What is the topic sentence?',
            ],
            intermediate: [
                'How do the ideas connect to each other?',
                'What evidence supports this argument?',
                'What transition words are being used?',
            ],
            advanced: [
                'How effective is this argument structure?',
                'What assumption is being made here?',
                'How could this be more persuasive?',
            ],
        },
        Reading: {
            beginner: [
                'What is the main topic of this passage?',
                'Where in the text does the author say this?',
                'What does this word mean based on context?',
            ],
            intermediate: [
                'What can you infer from this passage?',
                'How does the author support this claim?',
                'What is the author\'s purpose here?',
            ],
            advanced: [
                'What rhetorical strategy is being used here?',
                'How does this passage connect to the overall argument?',
                'What underlying assumption does this reveal?',
            ],
        },
    };

    const skillTemplates = templates[skill] || templates.Writing;
    const levelTemplates = skillTemplates[userLevel] || skillTemplates.intermediate;
    
    return levelTemplates[Math.floor(Math.random() * levelTemplates.length)];
};

export const getRecommendedStrategy = (
    skill: string,
    userPerformance: number
): SocraticStrategy => {
    if (userPerformance < 0.4) return 'clarifying';
    if (userPerformance < 0.6) return 'probing';
    if (userPerformance < 0.8) return 'example_based';
    return 'challenging';
};

export const generateHintInsteadOfAnswer = (
    question: string,
    skill: string
): string => {
    const hints: Record<string, string[]> = {
        Grammar: [
            'Think about the subject-verb agreement...',
            'Consider what tense the sentence is in...',
            'Look at the word before the blank - what part of speech is it?',
        ],
        Vocabulary: [
            'Try to think of a synonym...',
            'Consider the context clues around this word...',
            'What other words could fit here grammatically?',
        ],
        Writing: [
            'What is the main argument the author is making?',
            'How many body paragraphs do you see?',
            'What type of essay is this (opinion, discussion, problem)?',
        ],
        Reading: [
            'Where does the passage mention this concept?',
            'What can you infer from the first paragraph?',
            'What is the author\'s attitude toward this topic?',
        ],
    };

    const skillHints = hints[skill] || hints.Writing;
    return skillHints[Math.floor(Math.random() * skillHints.length)];
};

export const socraticChat = async (
    userQuestion: string,
    skillTitle: string,
    contextText: string,
    config?: Partial<SocraticPromptConfig>
): Promise<{ response: string; error?: string }> => {
    try {
        const prompt = generateSocraticPrompt(userQuestion, skillTitle, contextText, config);
        const messages = JSON.parse(prompt) as GroqMessage[];
        
        const response = await callGroq(messages, {
            model: 'llama-3.1-70b-versatile',
            temperature: 0.7,
            max_tokens: 500,
        });

        return { response: response.data };
    } catch (error) {
        return {
            response: '',
            error: error instanceof Error ? error.message : 'Failed to get response',
        };
    }
};

export const shouldSwitchStrategy = (
    messages: Array<{ role: string; content: string }>,
    lastResponseQuality: 'good' | 'stuck' | 'confused'
): SocraticStrategy | null => {
    if (messages.length < 3) return null;
    if (lastResponseQuality === 'stuck') return 'example_based';
    if (lastResponseQuality === 'confused') return 'clarifying';
    return null;
};