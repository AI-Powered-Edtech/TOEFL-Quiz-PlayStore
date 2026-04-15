import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CanonicalQuestionV1, SectionType } from '../types';

interface QuestionBankDB extends DBSchema {
    questions: {
        key: string;
        value: CanonicalQuestionV1 & { cachedAt: number; accessCount: number };
        indexes: { 
            'by-section': string; 
            'by-skill': number;
            'by-difficulty': number;
            'by-topic': string;
            'by-cached': number;
        };
    };
    question_metadata: {
        key: string;
        value: {
            questionId: string;
            lastAccessed: number;
            accessCount: number;
            wasCorrect?: boolean;
        };
    };
    sync_log: {
        key: number;
        value: {
            id?: number;
            timestamp: string;
            action: 'upload' | 'download';
            count: number;
            status: 'success' | 'failed';
        };
        indexes: { 'by-timestamp': string };
    };
}

const DB_NAME = 'toefl-question-bank';
const DB_VERSION = 1;

class QuestionBankService {
    private _dbPromise: Promise<IDBPDatabase<QuestionBankDB>>;
    
    get dbPromise(): Promise<IDBPDatabase<QuestionBankDB>> {
        return this._dbPromise;
    }

    constructor() {
        this._dbPromise = openDB<QuestionBankDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('questions')) {
                    const questionStore = db.createObjectStore('questions', { keyPath: 'id' });
                    questionStore.createIndex('by-section', 'section');
                    questionStore.createIndex('by-skill', 'skill_id');
                    questionStore.createIndex('by-difficulty', 'difficulty_score');
                    questionStore.createIndex('by-topic', 'topic');
                    questionStore.createIndex('by-cached', 'cachedAt');
                }

                if (!db.objectStoreNames.contains('question_metadata')) {
                    db.createObjectStore('question_metadata', { keyPath: 'questionId' });
                }

                if (!db.objectStoreNames.contains('sync_log')) {
                    const syncStore = db.createObjectStore('sync_log', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    syncStore.createIndex('by-timestamp', 'timestamp');
                }
            },
        });
    }

    async saveQuestions(questions: CanonicalQuestionV1[]): Promise<void> {
        const db = await this._dbPromise;
        const tx = db.transaction('questions', 'readwrite');
        const now = Date.now();

        for (const question of questions) {
            await tx.store.put({
                ...question,
                cachedAt: now,
                accessCount: 0,
            } as any);
        }

        await tx.done;
        console.log(`[QuestionBank] Saved ${questions.length} questions to IndexedDB`);
    }

    async getQuestions(params: {
        section?: SectionType;
        skillId?: number;
        difficultyRange?: [number, number];
        topic?: string;
        limit?: number;
    }): Promise<CanonicalQuestionV1[]> {
        const db = await this._dbPromise;
        let questions: any[] = [];

        if (params.section) {
            questions = await db.getAllFromIndex('questions', 'by-section', params.section);
        } else {
            questions = await db.getAll('questions');
        }

        if (params.skillId) {
            questions = questions.filter(q => q.skill_id === params.skillId);
        }

        if (params.difficultyRange) {
            const [min, max] = params.difficultyRange;
            questions = questions.filter(q => 
                q.difficulty_score >= min && q.difficulty_score <= max
            );
        }

        if (params.topic) {
            questions = questions.filter(q => q.topic === params.topic);
        }

        const limited = params.limit || questions.length;
        return questions.slice(0, limited);
    }

    async getQuestionById(id: string): Promise<CanonicalQuestionV1 | undefined> {
        const db = await this._dbPromise;
        const question = await db.get('questions', id);

        if (question) {
            question.accessCount = (question.accessCount || 0) + 1;
            await db.put('questions', question);

            await db.put('question_metadata', {
                questionId: id,
                lastAccessed: Date.now(),
                accessCount: question.accessCount,
            });
        }

        return question;
    }

    async getLRUQuestions(limit: number): Promise<CanonicalQuestionV1[]> {
        const db = await this._dbPromise;
        const all = await db.getAll('questions');
        
        return all
            .sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0))
            .slice(0, limit);
    }

    async getQuestionCount(): Promise<number> {
        const db = await this._dbPromise;
        return db.count('questions');
    }

    async clearOldQuestions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
        const db = await this._dbPromise;
        const all = await db.getAll('questions');
        const now = Date.now();
        const toDelete = all.filter(q => now - (q.cachedAt || 0) > maxAgeMs);

        const tx = db.transaction('questions', 'readwrite');
        for (const q of toDelete) {
            await tx.store.delete(q.id);
        }
        await tx.done;

        console.log(`[QuestionBank] Cleared ${toDelete.length} old questions`);
        return toDelete.length;
    }

    async getStorageStats(): Promise<{ questionCount: number; estimatedSize: string }> {
        const count = await this.getQuestionCount();
        const estimate = `${(count * 2).toFixed(1)} KB`;
        return { questionCount: count, estimatedSize: estimate };
    }

    async logSync(action: 'upload' | 'download', count: number, status: 'success' | 'failed'): Promise<void> {
        const db = await this._dbPromise;
        await db.add('sync_log', {
            timestamp: new Date().toISOString(),
            action,
            count,
            status,
        });
    }

    async getSyncHistory(limit: number = 10): Promise<Array<{ timestamp: string; action: string; count: number; status: string }>> {
        const db = await this._dbPromise;
        const logs = await db.getAllFromIndex('sync_log', 'by-timestamp');
        return logs.slice(-limit).reverse().map(log => ({
            timestamp: log.timestamp,
            action: log.action,
            count: log.count,
            status: log.status,
        }));
    }

    async exportQuestions(): Promise<string> {
        const all = await this.getQuestions({});
        return JSON.stringify(all, null, 2);
    }

    async importQuestionsToBank(questions: any[]): Promise<{ added: number }> {
        try {
            await this.saveQuestions(questions as CanonicalQuestionV1[]);
            return { added: questions.length };
        } catch (e) {
            console.error('[QuestionBank] Import to bank failed:', e);
            return { added: 0 };
        }
    }

    private shuffleArray<T>(array: T[]): T[] {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    async getRandomQuestionsForSimulation(
        section: string,
        count: number,
        excludeIds: string[] = [],
        difficulty?: number
    ): Promise<CanonicalQuestionV1[]> {
        const all = await this.getQuestions({ section: section as any });
        const available = all.filter(q => !excludeIds.includes(q.id));
        
        if (difficulty !== undefined) {
            const filtered = available.filter(q => {
                const diff = q.difficulty_score;
                return diff !== undefined && Math.abs(diff - difficulty) <= 20;
            });
            if (filtered.length > 0) {
                return this.shuffleArray(filtered).slice(0, count);
            }
        }
        
        return this.shuffleArray(available).slice(0, count);
    }
}

export const questionBank = new QuestionBankService();
export default questionBank;

export const getAllQuestions = async (): Promise<CanonicalQuestionV1[]> => {
    return questionBank.getQuestions({});
};

export const getUnifiedQuestionsBySkill = async (skillId: number): Promise<CanonicalQuestionV1[]> => {
    return questionBank.getQuestions({ skillId, limit: 100 });
};

export const updateQuestion = async (id: string, updates: Partial<CanonicalQuestionV1>): Promise<void> => {
    const existing = await questionBank.getQuestionById(id);
    if (existing) {
        await questionBank.saveQuestions([{ ...existing, ...updates }]);
    }
};

export const createQuestion = async (question: CanonicalQuestionV1): Promise<void> => {
    await questionBank.saveQuestions([question]);
};

export const deleteQuestion = async (id: string): Promise<void> => {
    const db = await questionBank.dbPromise;
    await db.delete('questions', id);
};

export const importQuestionsToBank = async (questions: any[]): Promise<{ added: number }> => {
    return questionBank.importQuestionsToBank(questions);
};

export const getRandomQuestionsForSimulation = async (
    section: string,
    count: number,
    excludeIds: string[] = [],
    difficulty?: number
): Promise<CanonicalQuestionV1[]> => {
    return questionBank.getRandomQuestionsForSimulation(section, count, excludeIds, difficulty);
};