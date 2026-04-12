import { ModelEssay, EssayFilters, EssayInteraction, VocabularyItem } from '../types';

const ESSAYS_KEY = 'band9_essays_collection';
const INTERACTIONS_KEY = 'band9_interactions';
const VOCABULARY_KEY = 'band9_vocabulary';
const SAVED_ESSAYS_KEY = 'band9_saved_essays';

export interface EssayCollection {
    essays: ModelEssay[];
    lastUpdated: string;
    version: number;
}

export interface BandDistribution {
    band9: number;
    band8: number;
    band7: number;
    band6: number;
}

const DEFAULT_COLLECTION: ModelEssay[] = [
    {
        id: 'band9-1',
        topic: 'The impact of technology on communication',
        content: `In today's digital age, technology has fundamentally transformed the way people communicate. While some argue that this has led to a decline in meaningful human connection, I believe that technological advancements have predominantly enhanced our ability to interact across distances.

One of the most significant benefits of modern communication technology is its capacity to connect people instantaneously regardless of geographical boundaries. Social media platforms, video conferencing applications, and messaging services have made it possible for individuals to maintain relationships with friends and family across different continents. This has been particularly valuable for migrant workers and international students who can now stay connected with their loved ones through voice and video calls.

Furthermore, technology has democratized access to information and enabled diverse voices to be heard. Platforms such as blogs, podcasts, and social media have given ordinary people the opportunity to share their perspectives with a global audience. This has fostered greater cross-cultural understanding and dialogue.

However, it is important to acknowledge that excessive screen time and reliance on digital communication can have negative consequences. Face-to-face interactions remain essential for building deep, meaningful relationships, and excessive use of technology may lead to social isolation.

In conclusion, while technology has transformed communication patterns, its benefits far outweigh its drawbacks when used responsibly. The key lies in maintaining a balance between digital and personal interactions.`,
        category: 'technology',
        task_type: 'Task 2',
        band_score: 9,
        source: 'curated',
        word_count: 298,
        breakdown: {
            task_response: 9,
            coherence_cohesion: 9,
            lexical_resource: 9,
            grammatical_range: 9,
        },
        annotations: [],
        created_at: '2024-01-15T10:00:00Z',
    },
    {
        id: 'band9-2',
        topic: 'The role of government in environmental protection',
        content: `Environmental conservation has become one of the most pressing challenges of our time. While individuals and corporations play crucial roles in sustainable practices, I strongly believe that governments should take the lead in environmental protection efforts.

Firstly, governments possess the legislative authority to enforce environmental regulations that individual actions cannot achieve. They can implement policies such as carbon taxes, emissions standards, and pollution controls that compel industries to adopt greener practices. Without governmental intervention, many companies would prioritize profits over environmental sustainability.

Secondly, governments have the financial resources to invest in renewable energy infrastructure and environmental research. Countries that have made significant strides in renewable energy adoption, such as Norway and Germany, have done so through substantial government investments and policy support.

Additionally, governments can coordinate international efforts to address global environmental challenges. Issues such as climate change and ocean pollution require collective action that can only be orchestrated through international treaties and agreements facilitated by national governments.

However, this does not mean that individual responsibility should be disregarded. Environmental protection requires a multi-stakeholder approach where governments set the framework, businesses implement sustainable practices, and individuals make conscious choices.

In conclusion, governments must play a central role in environmental protection through policy-making, investment, and international cooperation.`,
        category: 'environment',
        task_type: 'Task 2',
        band_score: 9,
        source: 'curated',
        word_count: 285,
        breakdown: {
            task_response: 9,
            coherence_cohesion: 9,
            lexical_resource: 9,
            grammatical_range: 9,
        },
        annotations: [],
        created_at: '2024-01-20T10:00:00Z',
    },
    {
        id: 'band9-3',
        topic: 'The importance of university education',
        content: `The value of higher education has been a subject of considerable debate in recent years. While some argue that university degrees have become less relevant in the modern job market, I contend that university education remains crucial for both personal development and career prospects.

University education provides students with specialized knowledge and skills that are not typically acquired through secondary education. Professional fields such as medicine, law, and engineering require years of rigorous academic training that cannot be substituted by practical experience alone. Moreover, universities offer opportunities for students to engage with cutting-edge research and learn from experts in their respective fields.

Beyond academic knowledge, university fosters critical thinking and analytical skills that are essential in today's rapidly evolving job market. The ability to analyze complex problems, evaluate evidence, and develop logical arguments are competencies that employers across various sectors value highly.

Furthermore, university provides a platform for networking and building relationships that can last a lifetime. Students have the opportunity to connect with peers, professors, and industry professionals who can provide valuable insights and opportunities throughout their careers.

It is worth noting that alternative pathways such as vocational training and online courses can also lead to successful careers in certain fields. However, for professions requiring specialized knowledge and those seeking leadership positions, university education remains the most reliable route.

In conclusion, university education continues to play a vital role in preparing individuals for the challenges of the modern workforce.`,
        category: 'education',
        task_type: 'Task 2',
        band_score: 9,
        source: 'curated',
        word_count: 302,
        breakdown: {
            task_response: 9,
            coherence_cohesion: 9,
            lexical_resource: 9,
            grammatical_range: 9,
        },
        annotations: [],
        created_at: '2024-02-01T10:00:00Z',
    },
    {
        id: 'band9-4',
        topic: 'The impact of remote work on productivity and work-life balance',
        content: `The rise of remote work has fundamentally changed how modern professionals approach their careers. While some employers remain skeptical about remote arrangements, I believe that remote work, when properly implemented, significantly enhances both productivity and work-life balance.

One of the primary benefits of remote work is the elimination of time-consuming commutes. Employees who work from home save an average of one to two hours daily that would otherwise be spent traveling. This time can be allocated to professional development, family responsibilities, or simply rest, leading to improved overall wellbeing and potentially higher productivity during work hours.

Additionally, remote work often provides employees with greater flexibility to structure their day according to their most productive times. This autonomy can lead to more efficient work output, as employees can schedule challenging tasks during their peak mental energy periods. Many remote workers report feeling more trusted and valued by their employers, which fosters increased motivation and commitment.

However, it is important to acknowledge that remote work presents challenges. Some employees struggle with isolation and the absence of face-to-face interaction with colleagues. Furthermore, without clear boundaries between work and personal life, some remote workers may experience difficulty disconnecting from work responsibilities.

In conclusion, while remote work is not suitable for all professions or individuals, its benefits in terms of productivity and work-life balance make it a valuable option for many modern workplaces. The key lies in implementing proper support systems and clear communication guidelines.`,
        category: 'work',
        task_type: 'Task 2',
        band_score: 9,
        source: 'curated',
        word_count: 315,
        breakdown: {
            task_response: 9,
            coherence_cohesion: 9,
            lexical_resource: 9,
            grammatical_range: 9,
        },
        annotations: [],
        created_at: '2024-02-15T10:00:00Z',
    },
    {
        id: 'band9-5',
        topic: 'The importance of physical health in modern education',
        content: `While academic excellence has traditionally been the primary focus of educational institutions, there is a growing recognition that physical health is equally important for student success. I strongly believe that schools should place equal emphasis on physical education alongside academic subjects.

The connection between physical activity and cognitive function is well-documented. Regular exercise improves blood flow to the brain, which enhances memory, concentration, and overall academic performance. Students who participate in physical education classes often demonstrate better attention spans and higher test scores compared to their sedentary peers. Physical activity also reduces stress and anxiety, which can significantly impact a student's ability to learn effectively.

Furthermore, establishing healthy habits during school years provides long-term benefits that extend beyond the classroom. Schools that prioritize physical education help students develop lifelong habits of regular exercise and healthy eating. This is particularly crucial given the rising rates of childhood obesity and related health issues in many countries.

It is worth noting that some argue academic subjects should take precedence due to increasing educational demands and global competition. While academic achievement is undeniably important, it should not come at the expense of students' physical wellbeing. After all, a healthy body supports a healthy mind.

In conclusion, physical health should be treated as a fundamental component of education. Schools must ensure that students receive adequate opportunities for physical activity while maintaining rigorous academic standards.`,
        category: 'health',
        task_type: 'Task 2',
        band_score: 9,
        source: 'curated',
        word_count: 308,
        breakdown: {
            task_response: 9,
            coherence_cohesion: 9,
            lexical_resource: 9,
            grammatical_range: 9,
        },
        annotations: [],
        created_at: '2024-03-01T10:00:00Z',
    },
    {
        id: 'band9-6',
        topic: 'The influence of social media on modern communication patterns',
        content: `Social media has revolutionized the way people communicate and share information in the 21st century. While these platforms have undoubtedly connected billions of people worldwide, their impact on communication quality remains a subject of intense debate. In my view, social media has both enhanced and diminished the quality of human communication in equal measure.

On the positive side, social media has democratized information sharing and given voice to individuals who were previously unheard. People can now share their perspectives with global audiences instantly, fostering unprecedented levels of dialogue across geographical and cultural boundaries. This has been particularly valuable for marginalized communities seeking to raise awareness about important issues.

Moreover, social media has strengthened connections between friends and family members who live far apart. Platforms such as Facebook, Instagram, and video calling applications enable people to maintain relationships that might otherwise fade due to distance.

However, the negative consequences of social media cannot be overlooked. The brevity encouraged by platforms like Twitter has led to oversimplification of complex issues. Additionally, the performative nature of social media often promotes superficial interactions rather than meaningful exchanges. Many users curate their online personas rather than expressing authentic thoughts and feelings.

In conclusion, while social media has transformed communication patterns, its overall impact remains ambiguous. Users must develop digital literacy skills to navigate these platforms responsibly and maximize their benefits while minimizing potential harms.`,
        category: 'media',
        task_type: 'Task 2',
        band_score: 9,
        source: 'curated',
        word_count: 295,
        breakdown: {
            task_response: 9,
            coherence_cohesion: 9,
            lexical_resource: 9,
            grammatical_range: 9,
        },
        annotations: [],
        created_at: '2024-03-15T10:00:00Z',
    },
    {
        id: 'band9-7',
        topic: 'The role of community service in character development',
        content: `Community service has become an increasingly common requirement in educational institutions worldwide. While some view this as an unnecessary burden on students, I believe that participating in community service is essential for developing well-rounded individuals with strong character and civic responsibility.

Engaging in community service exposes young people to diverse perspectives and challenges they might not encounter in their everyday lives. Volunteering at homeless shelters, food banks, or community hospitals helps students develop empathy and compassion for those less fortunate. These experiences foster a deeper understanding of social issues and encourage critical thinking about potential solutions.

Furthermore, community service provides valuable opportunities for skill development that cannot be acquired through classroom learning alone. Students learn teamwork, leadership, time management, and communication skills through practical volunteer experiences. These competencies are highly sought after by employers and serve as important foundations for future career success.

Additionally, participation in community service instills a sense of civic duty and responsibility in young people. When students contribute to their communities, they develop an understanding of their role as active citizens rather than passive observers. This engagement often continues into adulthood, leading to more informed and participatory members of society.

Critics argue that mandatory community service undermines the spirit of volunteering by making it compulsory. While this concern has merit, the benefits of exposing students to service opportunities often outweigh this drawback. Many students who initially resist mandatory service go on to become enthusiastic volunteers.

In conclusion, community service plays a vital role in character development and should be encouraged throughout educational journeys. It develops empathy, skills, and civic responsibility that prepare students for meaningful contributions to society.`,
        category: 'society',
        task_type: 'Task 2',
        band_score: 9,
        source: 'curated',
        word_count: 320,
        breakdown: {
            task_response: 9,
            coherence_cohesion: 9,
            lexical_resource: 9,
            grammatical_range: 9,
        },
        annotations: [],
        created_at: '2024-04-01T10:00:00Z',
    },
];

const loadCollection = (): ModelEssay[] => {
    try {
        const stored = localStorage.getItem(ESSAYS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('[Band9Collection] Failed to load collection:', e);
    }
    saveCollection(DEFAULT_COLLECTION);
    return DEFAULT_COLLECTION;
};

const saveCollection = (essays: ModelEssay[]): void => {
    localStorage.setItem(ESSAYS_KEY, JSON.stringify(essays));
};

export const getEssays = (
    filters: EssayFilters = {},
    page: number = 0,
    limit: number = 9
): { essays: ModelEssay[]; total: number } => {
    let essays = loadCollection();

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        essays = essays.filter(e => 
            e.topic.toLowerCase().includes(searchLower) || 
            e.content.toLowerCase().includes(searchLower)
        );
    }

    if (filters.category && filters.category !== 'All') {
        essays = essays.filter(e => e.category === filters.category);
    }

    if (filters.task_type && filters.task_type !== 'all') {
        essays = essays.filter(e => e.task_type === filters.task_type);
    }

    if (filters.band_score_min) {
        essays = essays.filter(e => e.band_score >= filters.band_score_min!);
    }

    if (filters.source) {
        essays = essays.filter(e => e.source === filters.source);
    }

    const total = essays.length;
    const start = page * limit;
    return { essays: essays.slice(start, start + limit), total };
};

export const getEssayById = (id: string): ModelEssay | null => {
    const essays = loadCollection();
    return essays.find(e => e.id === id) || null;
};

export const getCategories = (): string[] => {
    const essays = loadCollection();
    const categories = [...new Set(essays.map(e => e.category).filter((c): c is string => !!c))];
    return categories.sort();
};

export const getBandDistribution = (): BandDistribution => {
    const essays = loadCollection();
    return {
        band9: essays.filter(e => e.band_score === 9).length,
        band8: essays.filter(e => e.band_score === 8).length,
        band7: essays.filter(e => e.band_score === 7).length,
        band6: essays.filter(e => e.band_score === 6).length,
    };
};

export const saveEssay = (essayId: string, userId: string): void => {
    const saved = getSavedEssayIds(userId);
    if (!saved.includes(essayId)) {
        saved.push(essayId);
        localStorage.setItem(`${SAVED_ESSAYS_KEY}_${userId}`, JSON.stringify(saved));
    }
};

export const unsaveEssay = (essayId: string, userId: string): void => {
    const saved = getSavedEssayIds(userId);
    const filtered = saved.filter(id => id !== essayId);
    localStorage.setItem(`${SAVED_ESSAYS_KEY}_${userId}`, JSON.stringify(filtered));
};

export const getSavedEssays = (userId: string): ModelEssay[] => {
    const savedIds = getSavedEssayIds(userId);
    const essays = loadCollection();
    return essays.filter(e => savedIds.includes(e.id));
};

export const isEssaySaved = (essayId: string, userId: string): boolean => {
    return getSavedEssayIds(userId).includes(essayId);
};

const getSavedEssayIds = (userId: string): string[] => {
    try {
        const stored = localStorage.getItem(`${SAVED_ESSAYS_KEY}_${userId}`);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const recordInteraction = (interaction: EssayInteraction): void => {
    try {
        const existing = JSON.parse(localStorage.getItem(INTERACTIONS_KEY) || '[]');
        existing.push(interaction);
        if (existing.length > 100) {
            existing.splice(0, existing.length - 100);
        }
        localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(existing));
    } catch (e) {
        console.warn('[Band9Collection] Failed to record interaction:', e);
    }
};

export const getInteractionStats = (userId: string): { viewed: number; saved: number; vocabCollected: number } => {
    const interactions = JSON.parse(localStorage.getItem(INTERACTIONS_KEY) || '[]');
    const userInteractions = interactions.filter((i: EssayInteraction) => i.user_id === userId);
    
    const savedIds = getSavedEssayIds(userId);
    const vocab = JSON.parse(localStorage.getItem(`${VOCABULARY_KEY}_${userId}`) || '[]');

    return {
        viewed: userInteractions.length,
        saved: savedIds.length,
        vocabCollected: vocab.length,
    };
};

export const addVocabulary = (userId: string, item: VocabularyItem): void => {
    try {
        const existing = JSON.parse(localStorage.getItem(`${VOCABULARY_KEY}_${userId}`) || '[]');
        existing.push({ ...item, collected_at: new Date().toISOString() });
        localStorage.setItem(`${VOCABULARY_KEY}_${userId}`, JSON.stringify(existing));
    } catch (e) {
        console.warn('[Band9Collection] Failed to add vocabulary:', e);
    }
};

export const getVocabulary = (userId: string): VocabularyItem[] => {
    try {
        return JSON.parse(localStorage.getItem(`${VOCABULARY_KEY}_${userId}`) || '[]');
    } catch {
        return [];
    }
};

export const removeVocabulary = (userId: string, vocabularyId: string): void => {
    try {
        const existing = JSON.parse(localStorage.getItem(`${VOCABULARY_KEY}_${userId}`) || '[]');
        const filtered = existing.filter((v: VocabularyItem) => v.id !== vocabularyId);
        localStorage.setItem(`${VOCABULARY_KEY}_${userId}`, JSON.stringify(filtered));
    } catch (e) {
        console.warn('[Band9Collection] Failed to remove vocabulary:', e);
    }
};

export const searchEssays = (query: string): ModelEssay[] => {
    const essays = loadCollection();
    const queryLower = query.toLowerCase();
    
    return essays.filter(e => 
        (e.topic?.toLowerCase().includes(queryLower) ?? false) ||
        (e.content?.toLowerCase().includes(queryLower) ?? false) ||
        (e.category?.toLowerCase().includes(queryLower) ?? false)
    );
};