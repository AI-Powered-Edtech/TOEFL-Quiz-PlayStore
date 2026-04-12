/**
 * Reviewer Qualification Service
 * Handles tutorial progress, quiz submission, and qualification status
 */

import {
    QualificationStatus,
    QualificationTutorial,
    QualificationQuiz,
    QuizResult,
    QuizQuestion
} from '../types/qualification';

export const REVIEWER_TUTORIAL: QualificationTutorial = {
    id: 'basic-reviewer',
    title: 'Peer Review Fundamentals',
    description: 'Learn how to provide effective feedback on IELTS/TOEFL essays',
    estimated_time: 15,
    steps: [
        {
            id: 'intro',
            title: 'Welcome to Peer Review',
            content: 'As a peer reviewer, you will help other learners improve their writing skills by providing constructive feedback. This tutorial will guide you through the review process and best practices.',
            type: 'text'
        },
        {
            id: 'scoring-criteria',
            title: 'Understanding IELTS Scoring',
            content: 'IELTS essays are scored on 4 criteria:\n\n**Task Response (TR)**: How well the essay addresses the prompt\n**Coherence & Cohesion (CC)**: Organization and logical flow\n**Lexical Resource (LR)**: Vocabulary range and accuracy\n**Grammar Range & Accuracy (GRA)**: Grammatical structures\n\nEach criterion is scored from 1-9, and the overall band is the average.',
            type: 'text'
        },
        {
            id: 'example-review',
            title: 'Example: Reviewing an Essay',
            content: 'Let\'s look at a sample essay and how to review it effectively.',
            type: 'example',
            example: {
                essay_content: `In todays world, technology has become an integral part of our lives. Some people believe that technology has made our lives easier, while others argue that it has created more problems than solutions.

In my opinion, technology has both positive and negative effects on our lives. On the one hand, it has made communication easier and more efficient. We can now connect with people from all over the world in just a few seconds. On the other hand, technology has also led to a decrease in face-to-face interactions and has contributed to a more sedentary lifestyle.

Furthermore, technology has transformed the way we work and learn. With the internet, we have access to a vast amount of information at our fingertips. However, this easy access to information can also lead to misinformation and a lack of critical thinking.

In conclusion, while technology has brought many benefits, it is important to use it wisely and in moderation. We should embrace the advantages it offers while being mindful of its potential drawbacks.`,
                prompt: 'Some people believe that technology has made our lives easier, while others argue that it has created more problems. Discuss both views and give your own opinion.',
                task_type: 'Task 2',
                sample_review: {
                    scores: {
                        taskResponse: 7,
                        coherence: 7,
                        lexical: 6,
                        grammar: 6
                    },
                    strengths: 'The essay has a clear structure with an introduction, body paragraphs, and conclusion. The writer presents both sides of the argument and gives their own opinion. Transition words like "On the one hand" and "Furthermore" help with coherence.',
                    weaknesses: 'The essay could benefit from more specific examples to support the arguments. Some vocabulary is repetitive (e.g., "technology" is used frequently). There is a minor grammatical error in the first sentence ("todays" should be "today\'s").',
                    suggestions: 'Consider using synonyms for "technology" such as "digital tools," "modern innovations," or "technological advancements." Add concrete examples to strengthen your arguments. Review apostrophe usage for possessives.',
                    inline_corrections: [
                        {
                            original: 'todays',
                            correction: "today's",
                            explanation: 'Apostrophe needed for possessive form'
                        }
                    ]
                },
                explanation: 'This is a good essay that addresses the task. The scores reflect:\n\n- TR 7: Addresses all parts of the task with a clear position\n- CC 7: Well-organized with clear progression\n- LR 6: Adequate vocabulary but some repetition\n- GRA 6: Mix of simple and complex sentences with some errors'
            }
        },
        {
            id: 'writing-feedback',
            title: 'Writing Effective Feedback',
            content: 'Good feedback should be:\n\n**Specific**: Point to exact examples in the essay\n**Constructive**: Focus on how to improve, not just what\'s wrong\n**Balanced**: Include both strengths and areas for improvement\n**Actionable**: Give concrete suggestions the writer can apply\n\nAvoid vague comments like "Good job" or "Needs work." Instead, explain WHY something is good or needs improvement.',
            type: 'text'
        },
        {
            id: 'inline-corrections',
            title: 'Adding Inline Corrections',
            content: 'Inline corrections help writers see exactly where improvements can be made. When adding corrections:\n\n1. Select the text that needs correction\n2. Provide the corrected version\n3. Add a brief explanation\n\nFocus on errors that affect meaning or are repeated throughout the essay. Don\'t correct every minor mistake - prioritize the most impactful ones.',
            type: 'text'
        },
        {
            id: 'scoring-tips',
            title: 'Scoring Tips',
            content: 'When scoring essays:\n\n- Read the entire essay before assigning scores\n- Consider the task type requirements (Task 1 vs Task 2)\n- Use the band descriptors as a guide\n- Be consistent - don\'t be too harsh or too lenient\n- If unsure between two scores, consider the overall impression\n\nRemember: The goal is to help the writer improve, not to judge them harshly.',
            type: 'text'
        }
    ]
};

export const QUALIFICATION_QUIZ: QualificationQuiz = {
    id: 'reviewer-qualification',
    passing_score: 80,
    time_limit: 10,
    questions: [
        {
            id: 'q1',
            question: 'What are the four criteria used to score IELTS essays?',
            type: 'multiple_choice' as const,
            options: [
                'Vocabulary, Grammar, Fluency, Accuracy',
                'Task Response, Coherence & Cohesion, Lexical Resource, Grammar Range & Accuracy',
                'Content, Organization, Style, Mechanics',
                'Ideas, Language, Structure, Format'
            ],
            correct_answer: 1,
            explanation: 'The four criteria are Task Response, Coherence & Cohesion, Lexical Resource, and Grammar Range & Accuracy.',
            points: 20
        },
        {
            id: 'q2',
            question: 'What is the maximum band score for each IELTS writing criterion?',
            type: 'multiple_choice' as const,
            options: ['6', '7', '8', '9'],
            correct_answer: 3,
            explanation: 'The maximum band score for each criterion is 9.',
            points: 20
        },
        {
            id: 'q3',
            question: 'When providing feedback, what should you prioritize?',
            type: 'multiple_choice' as const,
            options: [
                'Pointing out every grammatical error',
                'Providing specific, constructive, and actionable feedback',
                'Giving the highest score possible',
                'Only mentioning weaknesses'
            ],
            correct_answer: 1,
            explanation: 'Specific, constructive, and actionable feedback is most valuable for learner improvement.',
            points: 20
        },
        {
            id: 'q4',
            question: 'Which criterion assesses how well you address the task prompt?',
            type: 'multiple_choice' as const,
            options: ['Coherence and Cohesion', 'Lexical Resource', 'Task Response', 'Grammar Range and Accuracy'],
            correct_answer: 2,
            explanation: 'Task Response assesses how well you address the prompt and develop your ideas.',
            points: 20
        },
        {
            id: 'q5',
            question: 'What does "Coherence and Cohesion" refer to?',
            type: 'multiple_choice' as const,
            options: [
                'Vocabulary variety',
                'Logical organization and linking ideas',
                'Grammar accuracy',
                'Writing speed'
            ],
            correct_answer: 1,
            explanation: 'Coherence and Cohesion refers to how logically your ideas are organized and how they are linked together.',
            points: 20
        }
    ]
};

const QUALIFICATION_KEY_PREFIX = 'reviewer_qualification_';

const getQualificationKey = (userId: string): string => `${QUALIFICATION_KEY_PREFIX}${userId}`;

const getLocalStatus = (userId: string): QualificationStatus | null => {
    try {
        const stored = localStorage.getItem(getQualificationKey(userId));
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

const saveLocalStatus = (userId: string, status: QualificationStatus): void => {
    localStorage.setItem(getQualificationKey(userId), JSON.stringify(status));
};

export const completeTutorial = async (userId: string): Promise<boolean> => {
    let status = getLocalStatus(userId);
    if (!status) {
        const newStatus: QualificationStatus = {
            user_id: userId,
            tutorial_completed: false,
            quiz_completed: false,
            quiz_score: 0,
            quiz_attempts: 0,
            qualified: false,
            qualified_at: undefined,
            started_at: new Date().toISOString()
        };
        saveLocalStatus(userId, newStatus);
    }
    status = getLocalStatus(userId);
    if (status) {
        status.tutorial_completed = true;
        saveLocalStatus(userId, status);
        return true;
    }
    return false;
};

export const getQualificationStatus = async (userId: string): Promise<QualificationStatus | null> => {
    return qualificationService.getStatus(userId);
};

export const isQualifiedToReview = async (userId: string): Promise<boolean> => {
    const status = await qualificationService.getStatus(userId);
    return status?.qualified || false;
};

export const qualificationService = {

    async getTutorial(): Promise<QualificationTutorial> {
        return REVIEWER_TUTORIAL;
    },

    async getQuiz(): Promise<QualificationQuiz> {
        return QUALIFICATION_QUIZ;
    },

    async getStatus(userId: string): Promise<QualificationStatus | null> {
        return getLocalStatus(userId);
    },

    async startTutorial(userId: string): Promise<void> {
        const status: QualificationStatus = {
            user_id: userId,
            tutorial_completed: false,
            quiz_completed: false,
            quiz_score: 0,
            quiz_attempts: 0,
            qualified: false,
            qualified_at: undefined,
            started_at: new Date().toISOString()
        };
        saveLocalStatus(userId, status);
    },

    async completeTutorial(userId: string): Promise<void> {
        let status = getLocalStatus(userId);
        if (!status) {
            await this.startTutorial(userId);
            status = getLocalStatus(userId);
        }
        if (status) {
            status.tutorial_completed = true;
            saveLocalStatus(userId, status);
        }
    },

    async submitQuiz(userId: string, answers: number[]): Promise<{ passed: boolean; score: number; correctAnswers: number[] }> {
        const quiz = QUALIFICATION_QUIZ;
        let correct = 0;
        const correctAnswers: number[] = [];

        for (let i = 0; i < quiz.questions.length; i++) {
            correctAnswers.push(Number(quiz.questions[i].correct_answer));
            if (answers[i] === quiz.questions[i].correct_answer) {
                correct++;
            }
        }

        const score = Math.round((correct / quiz.questions.length) * 100);
        const passed = score >= quiz.passing_score;

        let status = getLocalStatus(userId);
        if (!status) {
            await this.startTutorial(userId);
            status = getLocalStatus(userId);
        }

        if (status) {
            status.quiz_completed = passed;
            status.quiz_score = score;
            status.quiz_attempts = (status.quiz_attempts || 0) + 1;
            status.qualified = passed;
            if (passed && !status.qualified_at) {
                status.qualified_at = new Date().toISOString();
            }
            saveLocalStatus(userId, status);
        }

        return { passed, score, correctAnswers };
    },

    async resetQualification(userId: string): Promise<void> {
        const status: QualificationStatus = {
            user_id: userId,
            tutorial_completed: false,
            quiz_completed: false,
            quiz_score: 0,
            quiz_attempts: 0,
            qualified: false,
            qualified_at: undefined,
            started_at: new Date().toISOString()
        };
        saveLocalStatus(userId, status);
    }
};
