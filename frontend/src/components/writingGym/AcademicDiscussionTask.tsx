import { ArrowLeft, Send, GraduationCap, Sparkles, RefreshCcw, Users } from 'lucide-react';
import React, { useState } from 'react';

import { essayEvaluationService } from '../../services/essayEvaluationService';
import { AppView, EssaySubmission } from '../../types';
import { getUserId } from '../../utils/guestId';
import { Button } from '../Button';

import { FeedbackCard } from './FeedbackCard';

export const AcademicDiscussionTask: React.FC<{ onNavigate: (view: AppView) => void }> = ({ onNavigate }) => {
    const [essay, setEssay] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<EssaySubmission['ai_feedback'] | null>(null);

    const prompt = "Do you agree or disagree with the following statement? Grades encourage students to learn.";
    const student1 = "I agree. Grades give us a goal to aim for. Without them, I wouldn't study as hard.";
    const student2 = "I disagree. Grades make us focus on the score, not the actual learning. It creates unnecessary stress.";

    const handleSubmit = async () => {
        if (!essay.trim()) return;
        setIsSubmitting(true);
        try {
            const result = await essayEvaluationService.evaluateDiscussion(prompt, essay);
            setFeedback(result);
        } catch (e) {
            console.error(e);
            alert("Evaluation failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitToPeerReview = async () => {
        if (!essay || essay.split(/\s+/).filter(w => w.length > 0).length < 50) return;

        try {
            const { submitEssay } = await import('../../services/peerReviewService');
            const userId = getUserId();

            // Format prompt to include the student responses for context
            const fullPrompt = `Academic Discussion Task\n\nProfessor: ${prompt}\n\nStudent A: ${student1}\n\nStudent B: ${student2}`;

            await submitEssay(userId, essay, fullPrompt, 'Task 2', false);
            alert('Essay submitted to Peer Review! You\'ll receive feedback from the community soon.');
            onNavigate(AppView.PEER_REVIEW);
        } catch (error) {
            console.error('[AcademicDiscussionTask] Submit to peer review failed:', error);
            alert('Failed to submit essay. Please try again.');
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#F5F7FA] dark:bg-black">
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 z-10 shadow-sm flex items-center">
                <Button variant="ghost" onClick={() => onNavigate(AppView.WRITING_GYM_HUB as AppView)} className="pl-0">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Gym Task 2
                </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-28">
                <div className="max-w-3xl mx-auto">
                    <div className="space-y-6">
                        {/* Prompt Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                    <GraduationCap className="w-6 h-6 text-purple-600" />
                                </div>
                                <h2 className="font-bold text-lg">Dr. Diaz asks:</h2>
                            </div>
                            <p className="text-lg font-medium text-slate-800 dark:text-white leading-relaxed">
                                {prompt}
                            </p>
                        </div>

                        {/* Student Responses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">A</div>
                                    <span className="font-bold text-sm text-slate-600">Alex</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{student1}</p>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">S</div>
                                    <span className="font-bold text-sm text-slate-600">Sarah</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{student2}</p>
                            </div>
                        </div>

                        {/* Writing Area */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold mb-4 flex items-center justify-between">
                                Your Contribution
                                {feedback && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Evaluated</span>}
                            </h3>

                            {!feedback ? (
                                <>
                                    <textarea
                                        value={essay}
                                        onChange={(e) => setEssay(e.target.value)}
                                        placeholder="Write your opinion here..."
                                        className="w-full h-48 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-serif text-lg leading-relaxed mb-4"
                                    />
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Sparkles className="w-3 h-3 text-amber-500" />
                                            <span>Pro Tip: Use an inversion ("Rarely do we see...") for higher score.</span>
                                        </div>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || !essay.trim()}
                                            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 w-full sm:w-auto"
                                        >
                                            {isSubmitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            Post Opinion
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-700 font-serif text-slate-600 dark:text-slate-300">
                                        {essay}
                                    </div>
                                    <FeedbackCard feedback={feedback} />
                                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                                        <Button
                                            onClick={handleSubmitToPeerReview}
                                            disabled={essay.split(/\s+/).filter(w => w.length > 0).length < 50}
                                            className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:hover:bg-amber-900/40"
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Get Peer Feedback
                                        </Button>
                                        <Button onClick={() => { setEssay(''); setFeedback(null); }} variant="outline">
                                            Write Another
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
