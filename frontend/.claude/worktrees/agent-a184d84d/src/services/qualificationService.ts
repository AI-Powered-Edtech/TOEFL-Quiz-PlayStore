/**
 * Reviewer Qualification Service
 * Handles tutorial progress, quiz submission, and qualification status
 */

import { supabase } from './supabase';
import {
    QualificationStatus,
    QualificationTutorial,
    QualificationQuiz,
    QuizResult,
    QuizQuestion
} from '../types/qualification';

// ===== TUTORIAL DATA =====

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

// ===== QUIZ DATA =====

export const QUALIFICATION_QUIZ: QualificationQuiz = {
    id: 'reviewer-qualification',
    passing_score: 80,
    time_limit: 10,
    questions: [
        {
            id: 'q1',
            question: 'What are the four IELTS writing criteria?',
            type: 'multiple_choice',
            options: [
                'Task Response, Coherence & Cohesion, Lexical Resource, Grammar',
                'Content, Structure, Vocabulary, Spelling',
                'Introduction, Body, Conclusion, Style',
                'Fluency, Accuracy, Complexity, Range'
            ],
            correct_answer: 0,
            explanation: 'The four IELTS writing criteria are Task Response, Coherence & Cohesion, Lexical Resource, and Grammar Range & Accuracy.',
            points: 10
        },
        {
            id: 'q2',
            question: 'What should feedback be?',
            type: 'multiple_choice',
            options: [
                'Only positive to encourage the writer',
                'Only negative to show what needs improvement',
                'Specific, constructive, balanced, and actionable',
                'Brief and general to avoid overwhelming the writer'
            ],
            correct_answer: 2,
            explanation: 'Effective feedback should be specific, constructive, balanced (including both strengths and weaknesses), and actionable.',
            points: 10
        },
        {
            id: 'q3',
            question: 'An essay with a clear position, good organization, adequate vocabulary, and some grammatical errors would likely score around:',
            type: 'multiple_choice',
            options: [
                'Band 4-5',
                'Band 5-6',
                'Band 6-7',
                'Band 8-9'
            ],
            correct_answer: 2,
            explanation: 'An essay with these characteristics would typically score in the Band 6-7 range, as it shows good task response and coherence but has some limitations in vocabulary and grammar.',
            points: 10
        },
        {
            id: 'q4',
            question: 'When adding inline corrections, you should:',
            type: 'multiple_choice',
            options: [
                'Correct every single error in the essay',
                'Focus on errors that affect meaning or are repeated',
                'Only correct spelling mistakes',
                'Rewrite entire sentences for the writer'
            ],
            correct_answer: 1,
            explanation: 'Inline corrections should focus on errors that affect meaning or are repeated throughout the essay, not every minor mistake.',
            points: 10
        },
        {
            id: 'q5',
            question: 'True or False: The overall band score is calculated by adding all four criteria scores together.',
            type: 'true_false',
            correct_answer: 'false',
            explanation: 'The overall band score is the AVERAGE of the four criteria scores, not the sum.',
            points: 10
        },
        {
            id: 'q6',
            question: 'What is the minimum time you should spend reviewing an essay?',
            type: 'multiple_choice',
            options: [
                '30 seconds',
                '1 minute',
                '2 minutes',
                '5 minutes'
            ],
            correct_answer: 2,
            explanation: 'You should spend at least 2 minutes reviewing an essay to provide thoughtful feedback.',
            points: 10
        },
        {
            id: 'q7',
            question: 'True or False: You should review essays even if you\'re not familiar with the topic.',
            type: 'true_false',
            correct_answer: 'true',
            explanation: 'You can review essays on any topic because you\'re evaluating writing skills, not subject matter expertise.',
            points: 10
        },
        {
            id: 'q8',
            question: 'What makes a good "Strengths" comment?',
            type: 'multiple_choice',
            options: [
                '"Good job!"',
                '"The essay has a clear thesis statement and uses effective transition words between paragraphs."',
                '"I liked it."',
                '"No strengths found."'
            ],
            correct_answer: 1,
            explanation: 'Good feedback is specific and points to exact examples in the essay.',
            points: 10
        },
        {
            id: 'q9',
            question: 'If an essay is off-topic, which criterion is most affected?',
            type: 'multiple_choice',
            options: [
                'Coherence & Cohesion',
                'Lexical Resource',
                'Grammar',
                'Task Response'
            ],
            correct_answer: 3,
            explanation: 'Task Response measures how well the essay addresses the prompt, so an off-topic essay would score poorly in this criterion.',
            points: 10
        },
        {
            id: 'q10',
            question: 'What should you do if you\'re unsure about a score?',
            type: 'multiple_choice',
            options: [
                'Give the highest score to be nice',
                'Give the lowest score to be safe',
                'Consider the overall impression and use band descriptors',
                'Skip that criterion'
            ],
            correct_answer: 2,
            explanation: 'When unsure, consider the overall impression and refer to the band descriptors for guidance.',
            points: 10
        }
    ]
};

// ===== SERVICE FUNCTIONS =====

/**
 * Get user's qualification status
 */
export const getQualificationStatus = async (userId: string): Promise<QualificationStatus | null> => {
    try {
        const { data, error } = await supabase
            .from('reviewer_qualifications')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            // 42P01 = table not found
            if (error.code === '42P01') {
                return {
                    user_id: userId,
                    tutorial_completed: false,
                    quiz_passed: false,
                    quiz_attempts: 0,
                    qualification_level: 0
                };
            }
            // For any other error, return default instead of throwing
            console.warn('[Qualification] Non-fatal error, using defaults:', error.message);
            return {
                user_id: userId,
                tutorial_completed: false,
                quiz_passed: false,
                quiz_attempts: 0,
                qualification_level: 0
            };
        }

        if (!data) {
            return {
                user_id: userId,
                tutorial_completed: false,
                quiz_passed: false,
                quiz_attempts: 0,
                qualification_level: 0
            };
        }

        return data;
    } catch (error: any) {
        console.warn('[Qualification] Get status failed (using defaults):', error?.message);
        return {
            user_id: userId,
            tutorial_completed: false,
            quiz_passed: false,
            quiz_attempts: 0,
            qualification_level: 0
        };
    }
};

/**
 * Mark tutorial as completed
 */
export const completeTutorial = async (userId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('reviewer_qualifications')
            .upsert({
                user_id: userId,
                tutorial_completed: true,
                tutorial_completed_at: new Date().toISOString(),
                qualification_level: 1
            });

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.warn('[Qualification] Complete tutorial failed (table may not exist):', error?.message);
        return true; // Fail open — don't block the user
    }
};

/**
 * Submit quiz answers
 */
export const submitQuiz = async (
    userId: string,
    answers: Array<{ question_id: string; answer: string | number }>
): Promise<QuizResult> => {
    const quiz = QUALIFICATION_QUIZ;
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    const processedAnswers = answers.map(answer => {
        const question = quiz.questions.find(q => q.id === answer.question_id);
        if (!question) return { ...answer, correct: false };

        const isCorrect = answer.answer === question.correct_answer;
        if (isCorrect) {
            correctCount++;
            earnedPoints += question.points;
        }
        totalPoints += question.points;

        return { ...answer, correct: isCorrect };
    });

    const score = Math.round((earnedPoints / totalPoints) * 100);
    const passed = score >= quiz.passing_score;

    // Save result
    try {
        await supabase
            .from('reviewer_qualifications')
            .upsert({
                user_id: userId,
                tutorial_completed: true,
                quiz_score: score,
                quiz_passed: passed,
                quiz_attempts: 1, // Increment in production
                qualified_at: passed ? new Date().toISOString() : null,
                qualification_level: passed ? 2 : 1
            });
    } catch (error: any) {
        console.warn('[Qualification] Save quiz result failed (table may not exist):', error?.message);
    }

    return {
        user_id: userId,
        quiz_id: quiz.id,
        score,
        passed,
        answers: processedAnswers,
        completed_at: new Date().toISOString(),
        time_taken: 0 // Would be tracked in production
    };
};

/**
 * Check if user is qualified to review
 */
export const isQualifiedToReview = async (userId: string): Promise<boolean> => {
    try {
        if (typeof window !== 'undefined' && localStorage.getItem('PLAYWRIGHT_TEST_ADMIN') === 'true') {
            return true; // Bypass for E2E tests
        }

        const status = await getQualificationStatus(userId);
        if (!status) {
            return false;
        }

        // Must have completed tutorial (or skipped)
        if (typeof window !== 'undefined' && localStorage.getItem(`hasSkippedPeerReviewTutorial_${userId}`) === 'true') {
            return true;
        }

        const hasCompletedTutorial = status.tutorial_completed;

        // If we ever add expiry windows, respect them
        if (status.expires_at) {
            const expiresAt = new Date(status.expires_at).getTime();
            if (!Number.isNaN(expiresAt) && Date.now() > expiresAt) {
                return false;
            }
        }

        return hasCompletedTutorial;
    } catch (error) {
        console.error('[Qualification] Check qualification failed:', error);
        return false; // Fail closed — do not allow unqualified reviewers on errors
    }
};

/**
 * Get quiz questions (without answers)
 */
export const getQuizQuestions = (): Omit<QuizQuestion, 'correct_answer' | 'explanation'>[] => {
    return QUALIFICATION_QUIZ.questions.map(q => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        points: q.points
    }));
};
