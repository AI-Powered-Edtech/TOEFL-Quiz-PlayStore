import React from 'react';

interface ScoringSlidersProps {
    scores: {
        taskResponse: number;
        coherence: number;
        lexical: number;
        grammar: number;
    };
    onChange: (scores: {
        taskResponse: number;
        coherence: number;
        lexical: number;
        grammar: number;
    }) => void;
}

export const ScoringSliders: React.FC<ScoringSlidersProps> = ({ scores, onChange }) => {
    const overallBand = ((scores.taskResponse + scores.coherence + scores.lexical + scores.grammar) / 4).toFixed(1);

    const getDescriptor = (key: string, score: number) => {
        if (score >= 8) return 'Provides a highly developed and comprehensive response.';
        if (score >= 7) return 'Addresses all parts of the task effectively.';

        switch (key) {
            case 'taskResponse':
                return 'Addresses all parts of the task partially.';
            case 'coherence':
                return 'Logically organizes information and ideas.';
            case 'lexical':
                return 'Uses an adequate range of vocabulary.';
            case 'grammar':
                return 'Uses a mix of simple and complex sentence forms.';
            default:
                return 'Produces an adequate response.';
        }
    };

    const criteria = [
        { key: 'taskResponse', label: 'Task Response' },
        { key: 'coherence', label: 'Coherence & Cohesion' },
        { key: 'lexical', label: 'Lexical Resource' },
        { key: 'grammar', label: 'Grammatical Range' }
    ];

    const handleChange = (key: string, value: number) => {
        onChange({
            ...scores,
            [key]: value
        });
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 mt-4 pb-32">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    Scoring Criteria
                </h2>
                <div className="text-right">
                    <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                        OVERALL BAND
                    </div>
                    <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                        {overallBand} <span className="text-sm font-normal text-slate-400">/ 9.0</span>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {criteria.map(({ key, label }) => {
                    const score = scores[key as keyof typeof scores];
                    return (
                        <div key={key}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                    {label}
                                </span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    {score.toFixed(1)}
                                </span>
                            </div>
                            <div className="relative mb-2">
                                {/* Custom track background rendering to simulate filling to the thumb */}
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-indigo-100 dark:bg-indigo-950 rounded-full pointer-events-none" />
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 left-0 h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full pointer-events-none"
                                    style={{ width: `${((score - 1) / 8) * 100}%` }}
                                />
                                <input
                                    type="range"
                                    min="1"
                                    max="9"
                                    step="0.5"
                                    value={score}
                                    onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                                    className="w-full h-2 appearance-none bg-transparent cursor-pointer relative z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-indigo-200"
                                />
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                {getDescriptor(key, score)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
