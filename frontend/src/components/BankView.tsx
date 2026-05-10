import { ArrowLeft, Search, Database, AlertCircle, Plus, Edit2, Trash2, Loader2, RefreshCw, CheckSquare, Square, Play } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { getAllQuestions, getUnifiedQuestionsBySkill, updateQuestion, createQuestion, deleteQuestion } from '../services/questionBankService';
import { AppView, QuizData } from '../types';

import { QuestionEditor } from './QuestionEditor';

interface BankViewProps {
    onNavigate: (view: AppView) => void;
    onStartQuizWithQuestions?: (questions: QuizData[]) => void;
}

/**
 * Extract choices from identify_error prompt tags
 * Example: "{A}was{/A} {B}give{/B}" => ["was", "give", ...]
 */
const extractIdentifyErrorChoices = (prompt: string): string[] => {
    const regex = /\{([A-D])\}([^{]+?)\{\/\1\}/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(prompt)) !== null) {
        matches.push(match[2].trim());
    }

    return matches.length === 4 ? matches : ['A', 'B', 'C', 'D'];
};

export const BankView: React.FC<BankViewProps> = ({ onNavigate, onStartQuizWithQuestions }) => {
    // View Mode State
    const [viewMode, setViewMode] = useState<'search' | 'all'>('all');

    // Search Mode State
    const [searchSkillId, setSearchSkillId] = useState<string>('1');
    const [searchResults, setSearchResults] = useState<QuizData[]>([]);

    // All Questions Mode State
    const [allQuestions, setAllQuestions] = useState<QuizData[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [filterSection, setFilterSection] = useState<string>('all');

    // Multi-Select State
    const [selectedQuestions, setSelectedQuestions] = useState<Map<string, QuizData>>(new Map());

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const canMutateBank = import.meta.env.DEV;

    // Editor State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuizData | null>(null);

    const questionsPerPage = 20;
    const totalPages = Math.ceil(totalQuestions / questionsPerPage);

    // Load all questions
    const loadAllQuestions = async (page: number = 1, section: string = 'all') => {
        setIsLoading(true);
        try {
            const result = await getAllQuestions();
            const filtered = section === 'all' ? result : result.filter(q => q.section === section);
            const start = (page - 1) * questionsPerPage;
            setAllQuestions(filtered.slice(start, start + questionsPerPage));
            setTotalQuestions(filtered.length);
            setCurrentPage(page);
        } catch (error) {
            console.error('Failed to load questions:', error);
            setAllQuestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Search by skill ID
    const handleSearch = async () => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const results = await getUnifiedQuestionsBySkill(parseInt(searchSkillId, 10));
            setSearchResults(results);
        } catch (error) {
            console.error(error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Realtime subscription - disabled (Supabase removed)
    useEffect(() => {
        // Realtime subscription disabled - Supabase removed
        return () => {};
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, currentPage, filterSection, hasSearched, searchSkillId]);

    // Load all questions on mount
    useEffect(() => {
        if (viewMode === 'all') {
            loadAllQuestions(1, filterSection);
        }
    }, [viewMode, filterSection]);

    // Handle create/edit save
    const handleSaveQuestion = async (questionData: Partial<QuizData>) => {
        if (editingQuestion?.id) {
            await updateQuestion(editingQuestion.id, questionData as any);
        } else {
            await createQuestion(questionData as any);
        }
        setIsEditorOpen(false);
        setEditingQuestion(null);
    };

    // Handle delete
    const handleDelete = (id: string) => {
        setDeleteTargetId(id);
    };

    const confirmDeleteQuestion = async () => {
        if (!deleteTargetId) return;
        const id = deleteTargetId;
        setDeleteTargetId(null);
        try {
            await deleteQuestion(id);
            setNotice('Question deleted.');
            loadAllQuestions(currentPage, filterSection);
        } catch (error) {
            console.error('Failed to delete:', error);
            setNotice('Failed to delete question. Please try again.');
        }
    };

    // Handle question selection - stores full QuizData for cross-page persistence
    const toggleQuestionSelection = (question: QuizData) => {
        setSelectedQuestions(prev => {
            const newMap = new Map(prev);
            if (newMap.has(question.id!)) {
                newMap.delete(question.id!);
            } else {
                newMap.set(question.id!, question);
            }
            return newMap;
        });
    };

    // Select/Deselect all - adds current page questions to existing selection
    const handleSelectAll = () => {
        const displayQuestions = viewMode === 'all' ? allQuestions : searchResults;
        setSelectedQuestions(prev => {
            const newMap = new Map(prev);
            displayQuestions.forEach(q => {
                if (q.id) newMap.set(q.id, q);
            });
            return newMap;
        });
    };

    const handleDeselectAll = () => {
        setSelectedQuestions(new Map());
    };

    // Start quiz with selected questions - uses stored question data directly
    const handleStartQuiz = () => {
        // Get all selected questions from Map (preserves cross-page selections)
        const selected: QuizData[] = Array.from(selectedQuestions.values());

        console.log('[BankView] Starting quiz with selected questions:', {
            selectedCount: selected.length,
            sections: selected.map(q => q.section),
            skills: selected.map(q => q.skill_id)
        });

        if (selected.length === 0) {
            setNotice('Please select at least one question.');
            return;
        }

        // Helper: Determine effective section based on skill_id (fixes legacy data issues)
        const getEffectiveSection = (q: QuizData): string => {
            // Written Expression: skill_id 20-60 OR explicit indicators
            if ((q.skill_id >= 20 && q.skill_id <= 60) ||
                q.section === 'written' ||
                q.interaction === 'identify_error' ||
                (q.prompt && q.prompt.includes('{A}'))) {
                return 'written';
            }
            // Reading and Listening should already be correct
            if (q.section === 'reading' || q.section === 'listening') {
                return q.section;
            }
            // Structure: skill_id 1-19
            return 'structure';
        };

        // Group by effective section to prevent malformed quiz
        const grouped = {
            structure: selected.filter(q => getEffectiveSection(q) === 'structure'),
            written: selected.filter(q => getEffectiveSection(q) === 'written'),
            reading: selected.filter(q => getEffectiveSection(q) === 'reading'),
            listening: selected.filter(q => getEffectiveSection(q) === 'listening')
        };

        const orderedQuestions = [
            ...grouped.structure,
            ...grouped.written,
            ...grouped.reading,
            ...grouped.listening
        ];

        console.log('[BankView] Ordered questions:', orderedQuestions.length, orderedQuestions);

        if (onStartQuizWithQuestions) {
            onStartQuizWithQuestions(orderedQuestions);
        }
    };

    // Get breakdown of selected questions - uses stored data for accuracy
    const getSelectionBreakdown = () => {
        const selected: QuizData[] = Array.from(selectedQuestions.values());

        const breakdown: Record<string, number[]> = {};
        selected.forEach(q => {
            const section = q.section || 'unknown';
            if (!breakdown[section]) breakdown[section] = [];
            if (!breakdown[section].includes(q.skill_id)) {
                breakdown[section].push(q.skill_id);
            }
        });

        return breakdown;
    };

    const handleCreateNew = () => {
        setEditingQuestion(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (question: QuizData) => {
        setEditingQuestion(question);
        setIsEditorOpen(true);
    };

    const displayQuestions = viewMode === 'all' ? allQuestions : searchResults;

    return (
        <div className="h-full bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate(AppView.DASHBOARD)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-600" />
                        <h1 className="font-bold text-slate-800">Question Bank</h1>
                    </div>
                </div>
                {canMutateBank && (
                    <button
                        onClick={handleCreateNew}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
                <div className="max-w-4xl mx-auto space-y-6">
                    {notice && (
                        <div role="status" aria-live="polite" className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                            {notice}
                        </div>
                    )}
                    {/* View Mode Tabs */}
                    <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'all'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Database className="w-4 h-4 inline mr-2" />
                            View All ({totalQuestions})
                        </button>
                        <button
                            onClick={() => setViewMode('search')}
                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'search'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Search className="w-4 h-4 inline mr-2" />
                            Search by Skill
                        </button>
                    </div>

                    {/* Search Mode */}
                    {viewMode === 'search' && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Search by Skill ID</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <AlertCircle className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchSkillId}
                                        onChange={(e) => setSearchSkillId(e.target.value)}
                                        placeholder="Enter Skill ID (e.g., 1, 14, 25)"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    disabled={isLoading || !searchSkillId}
                                    className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
                                >
                                    {isLoading ? 'Searching...' : 'Search'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* All Questions Mode - Filters & Actions */}
                    {viewMode === 'all' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Filter:</span>
                                    <div className="flex gap-1">
                                        {['all', 'structure', 'written', 'reading', 'listening'].map((section) => (
                                            <button
                                                key={section}
                                                onClick={() => setFilterSection(section)}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterSection === section
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {section.charAt(0).toUpperCase() + section.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => loadAllQuestions(currentPage, filterSection)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {displayQuestions.length > 0 && (
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        onClick={handleDeselectAll}
                                        className="text-xs font-bold text-slate-600 hover:text-slate-700 px-2 py-1 hover:bg-slate-100 rounded transition-colors"
                                    >
                                        Deselect All
                                    </button>
                                    {selectedQuestions.size > 0 && (
                                        <>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-xs text-slate-500">
                                                {selectedQuestions.size} selected
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    )}

                    {/* Results */}
                    {!isLoading && (viewMode === 'search' ? hasSearched : true) && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {displayQuestions.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-600">No questions found</h3>
                                    <p className="text-slate-400 text-sm max-w-xs mx-auto mt-1">
                                        {viewMode === 'search'
                                            ? `No questions found for Skill ${searchSkillId}`
                                            : 'No questions in the database yet'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-2">
                                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                            {displayQuestions.length} Question{displayQuestions.length !== 1 ? 's' : ''}
                                            {viewMode === 'all' && totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                                        </h2>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            Live
                                        </span>
                                    </div>

                                    {/* Questions List */}
                                    {displayQuestions.map((q, idx) => {
                                        const isSelected = selectedQuestions.has(q.id!);  // Map.has() works same as Set.has()
                                        const displayChoices = q.interaction === 'identify_error'
                                            ? extractIdentifyErrorChoices(q.prompt)
                                            : q.choices;

                                        return (
                                            <div key={q.id || idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        {/* Checkbox */}
                                                        <button
                                                            onClick={() => toggleQuestionSelection(q)}
                                                            className="shrink-0"
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                                            ) : (
                                                                <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                                                            )}
                                                        </button>

                                                        {/* Tags */}
                                                        <div className="flex gap-2 flex-wrap">
                                                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                                                                Skill {q.skill_id}
                                                            </span>
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${q.section === 'structure' ? 'bg-orange-50 text-orange-700' :
                                                                q.section === 'written' ? 'bg-purple-50 text-purple-700' :
                                                                    q.section === 'reading' ? 'bg-green-50 text-green-700' :
                                                                        'bg-pink-50 text-pink-700'
                                                                }`}>
                                                                {q.section}
                                                            </span>
                                                            <span className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                                                                {q.interaction}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    {canMutateBank && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleEdit(q)}
                                                            className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4 text-blue-600" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(q.id!)}
                                                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </button>
                                                    </div>
                                                    )}
                                                </div>

                                                {/* Prompt */}
                                                <h3 className="font-medium text-slate-800 mb-4 text-sm leading-relaxed ml-8">
                                                    {q.prompt.replace(/_______/g, '_______')}
                                                </h3>

                                                {/* Choices - NO ANSWER HIGHLIGHTING */}
                                                {displayChoices && displayChoices.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 ml-8">
                                                        {displayChoices.map((choice, cIdx) => (
                                                            <div key={cIdx} className="text-xs p-2 rounded border bg-slate-50 border-slate-200 text-slate-700">
                                                                <span className="inline-block w-4 mr-1 font-bold text-slate-500">{['A', 'B', 'C', 'D'][cIdx]}.</span>
                                                                {choice}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Pagination */}
                                    {viewMode === 'all' && totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-4">
                                            <button
                                                onClick={() => loadAllQuestions(currentPage - 1, filterSection)}
                                                disabled={currentPage === 1}
                                                className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                ← Prev
                                            </button>
                                            <span className="text-sm text-slate-600 font-medium">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => loadAllQuestions(currentPage + 1, filterSection)}
                                                disabled={currentPage === totalPages}
                                                className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Next →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Start Quiz Panel */}
            {selectedQuestions.size > 0 && (
                <div className="fixed bottom-20 left-0 right-0 flex justify-center px-4 pointer-events-none z-20">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 pointer-events-auto animate-in slide-in-from-bottom-4 max-w-md w-full">
                        {/* Section Breakdown */}
                        <div className="mb-3">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selected Questions</div>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(getSelectionBreakdown()).map(([section, skills]) => (
                                    <div key={section} className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${section === 'reading' ? 'bg-blue-100 text-blue-700' :
                                        section === 'structure' ? 'bg-green-100 text-green-700' :
                                            section === 'written' ? 'bg-orange-100 text-orange-700' :
                                                section === 'listening' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-slate-100 text-slate-700'
                                        }`}>
                                        <span className="capitalize">{section}</span>
                                        <span className="text-[10px] opacity-70">(Skills: {skills.sort((a, b) => a - b).join(', ')})</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStartQuiz}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
                        >
                            <Play className="w-5 h-5" fill="currentColor" />
                            Start Quiz ({selectedQuestions.size} question{selectedQuestions.size !== 1 ? 's' : ''})
                        </button>
                    </div>
                </div>
            )}

            {deleteTargetId && (
                <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-question-title">
                    <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-red-100">
                        <h3 id="delete-question-title" className="text-lg font-bold text-slate-900 mb-2">Delete question?</h3>
                        <p className="text-sm text-slate-500 mb-5">This removes the question from the local bank. This action is only available in development mode.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTargetId(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Cancel</button>
                            <button onClick={confirmDeleteQuestion} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Question Editor Modal */}
            <QuestionEditor
                question={editingQuestion}
                onSave={handleSaveQuestion}
                onClose={() => {
                    setIsEditorOpen(false);
                    setEditingQuestion(null);
                }}
                isOpen={isEditorOpen}
            />
        </div>
    );
};
