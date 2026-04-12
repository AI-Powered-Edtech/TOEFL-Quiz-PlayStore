import { X, BookOpen, Award } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '../Button';

interface BandRubricProps {
    onClose: () => void;
}

interface BandDescriptor {
    band: string;
    taskResponse: string;
    coherence: string;
    lexical: string;
    grammar: string;
}

const BAND_DESCRIPTORS: BandDescriptor[] = [
    {
        band: '9',
        taskResponse: 'Fully addresses all parts of the task. Presents a fully developed position with relevant, fully extended and well supported ideas.',
        coherence: 'Uses cohesion in such a way that it attracts no attention. Skillfully manages paragraphing.',
        lexical: 'Uses a wide range of vocabulary with very natural and sophisticated control of lexical features. Rare minor errors occur only as slips.',
        grammar: 'Uses a wide range of structures with full flexibility and accuracy. Rare minor errors occur only as slips.'
    },
    {
        band: '8',
        taskResponse: 'Sufficiently addresses all parts of the task. Presents a clear position throughout the response.',
        coherence: 'Sequences information and ideas logically. Uses a range of cohesive devices appropriately.',
        lexical: 'Uses a wide range of vocabulary fluently and flexibly. Occasional inaccuracies in word choice.',
        grammar: 'Uses a wide range of structures. The majority of sentences are error-free.'
    },
    {
        band: '7',
        taskResponse: 'Addresses all parts of the task. Presents a clear position throughout the response.',
        coherence: 'Logically organizes information and ideas. Clear progression throughout. Uses a range of cohesive devices.',
        lexical: 'Uses a sufficient range of vocabulary. Uses less common lexical items with some awareness of style and collocation.',
        grammar: 'Uses a variety of complex structures. Produces frequent error-free sentences.'
    },
    {
        band: '6',
        taskResponse: 'Addresses all parts of the task although some parts may be more fully covered than others.',
        coherence: 'Arranges information and ideas coherently. There is a clear overall progression.',
        lexical: 'Uses an adequate range of vocabulary. Attempts to use less common vocabulary with some inaccuracy.',
        grammar: 'Uses a mix of simple and complex sentence forms. Makes some errors in grammar and punctuation.'
    },
    {
        band: '5',
        taskResponse: 'Addresses the task only partially. Expresses a position but development is not always clear.',
        coherence: 'Presents information with some organization but there may be lack of overall progression.',
        lexical: 'Uses a limited range of vocabulary, but this is minimally adequate for the task.',
        grammar: 'Attempts complex sentences but these tend to be less accurate than simple sentences.'
    },
    {
        band: '4',
        taskResponse: 'Responds to the task only in a minimal way. Position may be unclear.',
        coherence: 'Presents information and ideas but these are not arranged coherently.',
        lexical: 'Uses only basic vocabulary which may be used repetitively or inappropriate for the task.',
        grammar: 'Uses only a very limited range of structures with only rare use of subordinate clauses.'
    }
];

const CRITERIA_INFO = {
    taskResponse: {
        title: 'Task Response (TR)',
        description: 'How well the essay addresses the question and develops ideas'
    },
    coherence: {
        title: 'Coherence & Cohesion (CC)',
        description: 'Organization, paragraphing, and logical flow of ideas'
    },
    lexical: {
        title: 'Lexical Resource (LR)',
        description: 'Range and accuracy of vocabulary used'
    },
    grammar: {
        title: 'Grammar Range & Accuracy (GRA)',
        description: 'Range and accuracy of grammatical structures'
    }
};

export const BandRubricModal: React.FC<BandRubricProps> = ({ onClose }) => {
    const [selectedBand, setSelectedBand] = useState<string>('7');
    const [selectedCriteria, setSelectedCriteria] = useState<keyof typeof CRITERIA_INFO | 'all'>('all');

    const getCriteriaKey = (index: number): keyof typeof CRITERIA_INFO => {
        const keys: (keyof typeof CRITERIA_INFO)[] = ['taskResponse', 'coherence', 'lexical', 'grammar'];
        return keys[index];
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">
                                IELTS Band Descriptors
                            </h3>
                            <p className="text-xs text-slate-500">
                                Official scoring criteria reference
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Band Selector */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {BAND_DESCRIPTORS.map((descriptor) => (
                            <button
                                key={descriptor.band}
                                onClick={() => setSelectedBand(descriptor.band)}
                                className={`
                                    flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all
                                    ${selectedBand === descriptor.band
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }
                                `}
                            >
                                Band {descriptor.band}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Criteria Filter */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setSelectedCriteria('all')}
                            className={`
                                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                ${selectedCriteria === 'all'
                                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }
                            `}
                        >
                            All Criteria
                        </button>
                        {Object.entries(CRITERIA_INFO).map(([key, info]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedCriteria(key as keyof typeof CRITERIA_INFO)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                    ${selectedCriteria === key
                                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }
                                `}
                            >
                                {info.title.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {(() => {
                        const descriptor = BAND_DESCRIPTORS.find(d => d.band === selectedBand);
                        if (!descriptor) return null;

                        const criteriaKeys: (keyof typeof CRITERIA_INFO)[] = ['taskResponse', 'coherence', 'lexical', 'grammar'];
                        const criteriaValues = [descriptor.taskResponse, descriptor.coherence, descriptor.lexical, descriptor.grammar];

                        return (
                            <div className="space-y-4">
                                {criteriaKeys.map((key, index) => {
                                    if (selectedCriteria !== 'all' && selectedCriteria !== key) return null;
                                    
                                    const info = CRITERIA_INFO[key];
                                    const value = criteriaValues[index];

                                    return (
                                        <div
                                            key={key}
                                            className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                                                    <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                                                        {info.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mb-2">
                                                        {info.description}
                                                    </p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                        {value}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Based on official IELTS writing assessment criteria
                        </p>
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
