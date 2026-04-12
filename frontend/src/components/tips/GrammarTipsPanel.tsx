import { BookOpen } from 'lucide-react';
import React from 'react';

interface GrammarTipsPanelProps {
    analysis: any;
    isAnalyzing: boolean;
    onShowDetails?: () => void;
}

export const GrammarTipsPanel: React.FC<GrammarTipsPanelProps> = ({
    analysis,
    isAnalyzing,
    onShowDetails
}) => {
    if (isAnalyzing) {
        return (
            <div className="bg-white rounded-[20px] border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Analyzing grammar...</span>
                </div>
            </div>
        );
    }

    if (!analysis) return null;

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-[20px] border border-purple-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-bold text-purple-900">Grammar Analysis</h4>
            </div>

            <div className="space-y-2 text-xs text-purple-800">
                <div className="flex justify-between">
                    <span className="text-purple-600">Sentence Type:</span>
                    <span className="font-semibold">{analysis.sentenceType}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-purple-600">Word Count:</span>
                    <span className="font-semibold">{analysis.wordCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-purple-600">Readability:</span>
                    <span className="font-semibold">{analysis.readabilityScore}/100</span>
                </div>
            </div>

            {analysis.grammarPoints && analysis.grammarPoints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-[10px] text-purple-600 font-semibold mb-1">Key Points:</p>
                    <ul className="text-[10px] text-purple-700 space-y-1">
                        {analysis.grammarPoints.map((point: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                                <span className="text-purple-400">•</span>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
