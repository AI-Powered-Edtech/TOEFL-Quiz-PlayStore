import DOMPurify from 'dompurify';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Star, BookOpen, ChevronDown, ChevronUp,
    Award, Lightbulb, AlertTriangle, Eye, FileText
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { supabase } from '../../services/supabase';
import { AppView } from '../../types';
import { Button } from '../Button';

interface SampleResponse {
    id: string;
    topic: string;
    category: string;
    score: number;
    content: string;
    word_count: number;
    annotations: Array<{
        type: 'strength' | 'improvement';
        text: string;
    }>;
    highlights: string[];
}

interface SampleResponseLibraryProps {
    onNavigate: (view: AppView) => void;
    selectedScore?: number;
}

export const SampleResponseLibrary: React.FC<SampleResponseLibraryProps> = ({
    onNavigate,
    selectedScore = 5
}) => {
    const [samples, setSamples] = useState<SampleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeScore, setActiveScore] = useState(selectedScore);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchSamples();
    }, [activeScore]);

    const fetchSamples = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('integrated_writing_samples')
                .select('*')
                .eq('score', activeScore)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSamples(data || []);
        } catch (e) {
            console.error('Failed to fetch samples:', e);
            // Load mock data as fallback
            setSamples(getMockSamples(activeScore));
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        switch (score) {
            case 5: return 'from-emerald-500 to-green-600';
            case 4: return 'from-blue-500 to-indigo-600';
            case 3: return 'from-amber-500 to-orange-600';
            case 2: return 'from-orange-500 to-red-500';
            default: return 'from-red-500 to-rose-600';
        }
    };

    const getScoreLabel = (score: number) => {
        switch (score) {
            case 5: return 'Outstanding';
            case 4: return 'Good';
            case 3: return 'Fair';
            case 2: return 'Limited';
            default: return 'Weak';
        }
    };

    const highlightContent = (content: string, highlights: string[]) => {
        if (!highlights.length) return content;

        let result = content;
        highlights.forEach(phrase => {
            const regex = new RegExp(`(${phrase})`, 'gi');
            result = result.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900/40 px-1 rounded">$1</mark>');
        });
        return result;
    };

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] dark:bg-slate-950">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => onNavigate(AppView.WRITING_GYM_HUB)}
                        className="pl-0"
                    >
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        <span className="font-semibold">Sample Essays</span>
                    </Button>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                        <BookOpen className="w-4 h-4" />
                        <span>{samples.length} samples</span>
                    </div>
                </div>
            </div>

            {/* Score Filter Tabs */}
            <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {[5, 4, 3, 2, 1].map(score => (
                        <button
                            key={score}
                            onClick={() => setActiveScore(score)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                                ${activeScore === score
                                    ? `bg-gradient-to-r ${getScoreColor(score)} text-white shadow-lg`
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                        >
                            <div className="flex">
                                {[...Array(score)].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-current" />
                                ))}
                            </div>
                            <span>Score {score}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                ) : samples.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No samples available for Score {activeScore}</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-2xl mx-auto">
                        {/* Score Info Card */}
                        <div className={`bg-gradient-to-r ${getScoreColor(activeScore)} rounded-2xl p-4 text-white`}>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center">
                                    <Award className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold">Score {activeScore} - {getScoreLabel(activeScore)}</h3>
                                    <p className="text-sm opacity-90">
                                        {activeScore === 5 && 'Fully addresses task with excellent organization and language'}
                                        {activeScore === 4 && 'Good response with minor issues in development or language'}
                                        {activeScore === 3 && 'Adequate response but lacks coherence or has language errors'}
                                        {activeScore === 2 && 'Limited response with significant weaknesses'}
                                        {activeScore === 1 && 'Fails to address the task adequately'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Sample Cards */}
                        <AnimatePresence>
                            {samples.map((sample, idx) => (
                                <motion.div
                                    key={sample.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                                >
                                    {/* Card Header */}
                                    <button
                                        onClick={() => setExpandedId(expandedId === sample.id ? null : sample.id)}
                                        className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex">
                                                    {[...Array(sample.score)].map((_, i) => (
                                                        <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                    ))}
                                                </div>
                                                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 capitalize">
                                                    {sample.category}
                                                </span>
                                            </div>
                                            <h4 className="font-semibold text-slate-800 dark:text-white text-sm">
                                                {sample.topic}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {sample.word_count} words
                                            </p>
                                        </div>
                                        {expandedId === sample.id ? (
                                            <ChevronUp className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        )}
                                    </button>

                                    {/* Expanded Content */}
                                    <AnimatePresence>
                                        {expandedId === sample.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4 pt-0 space-y-4">
                                                    {/* Essay Content */}
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                                                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                            <Eye className="w-3 h-3" />
                                                            Sample Response
                                                        </h5>
                                                        <div
                                                            className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap"
                                                            dangerouslySetInnerHTML={{
                                                                __html: DOMPurify.sanitize(highlightContent(sample.content, sample.highlights || []))
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Annotations */}
                                                    {sample.annotations && sample.annotations.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                                                What Makes This a Score {sample.score}?
                                                            </h5>
                                                            {sample.annotations.map((ann, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`flex items-start gap-2 p-3 rounded-lg text-sm ${ann.type === 'strength'
                                                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                                                        }`}
                                                                >
                                                                    {ann.type === 'strength' ? (
                                                                        <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                    ) : (
                                                                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                    )}
                                                                    <span>{ann.text}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

// Mock data fallback
function getMockSamples(score: number): SampleResponse[] {
    const mockData: Record<number, SampleResponse[]> = {
        5: [{
            id: 'mock-5',
            topic: 'Benefits of Urban Green Spaces for Wildlife',
            category: 'environment',
            score: 5,
            content: `The lecture effectively challenges all three points made in the reading passage about the benefits of urban green spaces for wildlife.

First, while the reading claims that urban parks provide crucial habitat for species displaced by development, the professor argues that these spaces actually function as "ecological traps." Animals attracted to these areas face higher mortality rates due to traffic, pollution, and pet predation.

Second, the reading suggests that green spaces create wildlife corridors connecting fragmented habitats. However, the lecturer points out that most urban green spaces are too isolated and small to serve this function effectively.

Finally, the reading asserts that cities with green spaces support greater biodiversity. The professor counters this by explaining that urban wildlife communities are dominated by a few generalist species, representing a net loss of biodiversity.`,
            word_count: 145,
            annotations: [
                { type: 'strength', text: 'Clear thesis statement introducing all three counterpoints' },
                { type: 'strength', text: 'Logical paragraph structure addressing each reading point' },
                { type: 'strength', text: 'Precise use of academic vocabulary' }
            ],
            highlights: ['effectively challenges', 'ecological traps', 'too isolated and small']
        }],
        4: [{
            id: 'mock-4',
            topic: 'Effects of Social Media on Adolescents',
            category: 'technology',
            score: 4,
            content: `The lecture presents counterarguments to the reading's claims about social media's positive effects on adolescent development.

The reading argues that social media helps teenagers develop stronger social connections. The professor disagrees, stating that while teens may have more online contacts, the quality of these relationships is lower.

Additionally, the reading claims social media provides educational benefits. However, the lecturer notes that most social media use among adolescents is entertainment-focused rather than educational.

The professor also challenges the reading's assertion that social media builds self-confidence through positive feedback.`,
            word_count: 95,
            annotations: [
                { type: 'strength', text: 'Good summary of main points' },
                { type: 'improvement', text: 'Could include more specific examples from the lecture' }
            ],
            highlights: ['counterarguments', 'quality of these relationships']
        }],
        3: [{
            id: 'mock-3',
            topic: 'Remote Work and Urban Planning',
            category: 'society',
            score: 3,
            content: `The lecture talks about remote work and how it affects cities differently than the reading says.

The reading says remote work will reduce traffic and pollution in cities. But the professor says this might not happen because people who work from home still drive for shopping and other activities.

The reading also says downtown offices will become empty. The lecturer point out that many companies are using hybrid models.`,
            word_count: 75,
            annotations: [
                { type: 'strength', text: 'Attempts to address main points' },
                { type: 'improvement', text: 'Lacks specific details from the lecture' },
                { type: 'improvement', text: 'Grammar errors present' }
            ],
            highlights: ['talks about', 'might not happen']
        }]
    };
    return mockData[score] || [];
}
