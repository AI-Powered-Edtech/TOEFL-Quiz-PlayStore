import { Star, ThumbsUp, Award, TrendingUp, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import * as peerReviewService from '../../services/peerReviewService';
import { PeerReview } from '../../types';
import { Button } from '../Button';

interface FeedbackCardProps {
    review: PeerReview;
    essayContent: string;
    onRate?: () => void;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ review, essayContent, onRate }) => {
    const { user } = useAuth();
    const [rating, setRating] = useState(review.helpfulness_rating || 0);
    const [isRating, setIsRating] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);

    const handleRate = async (stars: number) => {
        if (!user?.id) return;

        setIsRating(true);
        try {
            await peerReviewService.rateReview(review.id, user.id, stars, '');
            setRating(stars);
            setShowThankYou(true);
            setTimeout(() => setShowThankYou(false), 3000);
            onRate?.();
        } catch (error) {
            console.error('[FeedbackCard] Rate failed:', error);
        } finally {
            setIsRating(false);
        }
    };

    const getBandColor = (band: number) => {
        if (band >= 8) return 'text-green-600 dark:text-green-400';
        if (band >= 7) return 'text-blue-600 dark:text-blue-400';
        if (band >= 6) return 'text-cyan-600 dark:text-cyan-400';
        if (band >= 5) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-orange-600 dark:text-orange-400';
    };

    const renderEssayWithHighlights = () => {
        if (!review.inline_corrections || review.inline_corrections.length === 0) {
            return <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{essayContent}</p>;
        }

        let lastIndex = 0;
        const parts: React.ReactNode[] = [];
        const corrections = [...review.inline_corrections].sort((a, b) => a.start - b.start);

        corrections.forEach((correction, idx) => {
            if (correction.start > lastIndex) {
                parts.push(
                    <span key={`text-${idx}`}>
                        {essayContent.substring(lastIndex, correction.start)}
                    </span>
                );
            }

            parts.push(
                <span
                    key={`correction-${idx}`}
                    className="bg-yellow-200 dark:bg-yellow-800 border-b-2 border-yellow-500 cursor-help relative group"
                    title={`${correction.correction} - ${correction.comment}`}
                >
                    {correction.original}
                    <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-900 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap z-10 max-w-xs">
                        <div className="font-bold text-green-400">{correction.correction}</div>
                        <div className="text-slate-300">{correction.comment}</div>
                    </span>
                </span>
            );

            lastIndex = correction.end;
        });

        if (lastIndex < essayContent.length) {
            parts.push(
                <span key="text-end">
                    {essayContent.substring(lastIndex)}
                </span>
            );
        }

        return <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{parts}</div>;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
                            <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Peer Review Feedback</h3>
                            <p className="text-xs text-slate-500">
                                {new Date(review.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className={`text-4xl font-black ${getBandColor(review.overall_band)}`}>
                            {review.overall_band}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Overall Band</div>
                    </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'TR', score: review.task_response_score },
                        { label: 'CC', score: review.coherence_score },
                        { label: 'LR', score: review.lexical_score },
                        { label: 'GRA', score: review.grammar_score }
                    ].map((item) => (
                        <div key={item.label} className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                            <div className={`text-2xl font-bold ${getBandColor(item.score)}`}>{item.score}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                {/* Inline Corrections */}
                {review.inline_corrections && review.inline_corrections.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            <h4 className="font-bold text-slate-800 dark:text-white">
                                Your Essay with Corrections ({review.inline_corrections.length})
                            </h4>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
                            {renderEssayWithHighlights()}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">💡 Hover over highlighted text to see corrections</p>
                    </div>
                )}

                {/* Strengths */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h4 className="font-bold text-slate-800 dark:text-white">Strengths</h4>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{review.strengths}</p>
                    </div>
                </div>

                {/* Weaknesses */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <h4 className="font-bold text-slate-800 dark:text-white">Areas for Improvement</h4>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{review.weaknesses}</p>
                    </div>
                </div>

                {/* Suggestions */}
                {review.suggestions && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <h4 className="font-bold text-slate-800 dark:text-white">Suggestions</h4>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{review.suggestions}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer - Rating */}
            <div className="bg-slate-50 dark:bg-slate-800 p-6 border-t border-slate-200 dark:border-slate-800">
                <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        {rating > 0 ? 'You rated this feedback:' : 'How helpful was this feedback?'}
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => !rating && handleRate(star)}
                                disabled={isRating || rating > 0}
                                className={`transition-all ${rating > 0
                                    ? star <= rating
                                        ? 'text-yellow-500'
                                        : 'text-slate-300 dark:text-slate-600'
                                    : 'text-slate-300 dark:text-slate-600 hover:text-yellow-500 hover:scale-110'
                                    } ${rating > 0 ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                <Star className="w-8 h-8" fill={star <= rating ? 'currentColor' : 'none'} />
                            </button>
                        ))}
                    </div>
                    {showThankYou && (
                        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                            <ThumbsUp className="w-4 h-4" />
                            Thank you for your feedback!
                        </div>
                    )}
                    {rating > 0 && !showThankYou && (
                        <p className="text-xs text-slate-400">Thanks for rating!</p>
                    )}
                </div>
            </div>
        </div>
    );
};
