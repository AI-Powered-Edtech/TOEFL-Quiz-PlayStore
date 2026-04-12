import { X, Save, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';

import { QuizData } from '../types';

interface QuestionEditorProps {
    question?: QuizData | null;
    onSave: (question: Partial<QuizData>) => Promise<void>;
    onClose: () => void;
    isOpen: boolean;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, onSave, onClose, isOpen }) => {
    const [formData, setFormData] = useState<Partial<QuizData>>({
        skill_id: question?.skill_id || 1,
        section: question?.section || 'structure',
        interaction: question?.interaction || 'fill_blank',
        prompt: question?.prompt || '',
        choices: question?.choices || ['', '', '', ''],
        correct_response: question?.correct_response || ['A'],
        cefr_target: question?.cefr_target || 'B1',
        difficulty_score: question?.difficulty_score || 50,
        stimulus: question?.stimulus || {},
        metadata: {
            source: 'db' as 'db' | 'ai' | 'pdf',
            explanation: question?.metadata?.explanation || '',
            pattern_tip: question?.metadata?.pattern_tip || '',
            ...question?.metadata
        }
    });

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);

        try {
            // Validation
            if (!formData.prompt?.trim()) {
                throw new Error('Prompt is required');
            }
            if (formData.interaction === 'multiple_choice' && formData.choices!.filter(c => c.trim()).length < 2) {
                throw new Error('At least 2 choices required for multiple choice');
            }

            await onSave(formData);
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to save question');
        } finally {
            setIsSaving(false);
        }
    };

    const updateChoice = (index: number, value: string) => {
        const newChoices = [...(formData.choices || ['', '', '', ''])];
        newChoices[index] = value;
        setFormData({ ...formData, choices: newChoices });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">
                        {question ? 'Edit Question' : 'Create New Question'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Skill ID */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Skill ID</label>
                        <input
                            type="number"
                            value={formData.skill_id}
                            onChange={(e) => setFormData({ ...formData, skill_id: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            min="1"
                            max="60"
                            required
                        />
                    </div>

                    {/* Section */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Section</label>
                        <select
                            value={formData.section}
                            onChange={(e) => setFormData({ ...formData, section: e.target.value as any })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        >
                            <option value="structure">Structure</option>
                            <option value="written">Written Expression</option>
                            <option value="reading">Reading</option>
                            <option value="listening">Listening</option>
                        </select>
                    </div>

                    {/* Interaction Type */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Interaction Type</label>
                        <select
                            value={formData.interaction}
                            onChange={(e) => setFormData({ ...formData, interaction: e.target.value as any })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        >
                            <option value="fill_blank">Fill in the Blank</option>
                            <option value="identify_error">Identify Error</option>
                            <option value="multiple_choice">Multiple Choice</option>
                        </select>
                    </div>

                    {/* Prompt */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prompt/Question</label>
                        <textarea
                            value={formData.prompt}
                            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                            placeholder="Enter the question text..."
                            required
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            For fill_blank: use _______ for blanks. For identify_error: use {'{A}'}word{'{/A}'} tags.
                        </p>
                    </div>

                    {/* Choices (for multiple_choice and identify_error) */}
                    {(formData.interaction === 'multiple_choice' || formData.interaction === 'identify_error') && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                {formData.interaction === 'identify_error' ? 'Options (A, B, C, D)' : 'Answer Choices'}
                            </label>
                            <div className="space-y-2">
                                {formData.interaction === 'identify_error' ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {['A', 'B', 'C', 'D'].map((label, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-600 w-6">{label}.</span>
                                                <input
                                                    type="text"
                                                    value={formData.choices![idx] || label}
                                                    onChange={(e) => updateChoice(idx, e.target.value)}
                                                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm"
                                                    disabled
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    ['A', 'B', 'C', 'D'].map((label, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-600 w-6">{label}.</span>
                                            <input
                                                type="text"
                                                value={formData.choices![idx] || ''}
                                                onChange={(e) => updateChoice(idx, e.target.value)}
                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder={`Option ${label}`}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Correct Answer */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Correct Answer</label>
                        {formData.interaction === 'fill_blank' ? (
                            <input
                                type="text"
                                value={formData.correct_response?.[0] || ''}
                                onChange={(e) => setFormData({ ...formData, correct_response: [e.target.value] })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter the correct answer"
                                required
                            />
                        ) : (
                            <select
                                value={formData.correct_response?.[0] || 'A'}
                                onChange={(e) => setFormData({ ...formData, correct_response: [e.target.value] })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                            </select>
                        )}
                    </div>

                    {/* Explanation */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Explanation</label>
                        <textarea
                            value={formData.metadata?.explanation || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                metadata: { ...formData.metadata, explanation: e.target.value || '', source: formData.metadata?.source || 'db' }
                            })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                            placeholder="Explain why this is the correct answer..."
                        />
                    </div>

                    {/* CEFR & Difficulty */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CEFR Level</label>
                            <select
                                value={formData.cefr_target}
                                onChange={(e) => setFormData({ ...formData, cefr_target: e.target.value as any })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="A2">A2</option>
                                <option value="B1">B1</option>
                                <option value="B2">B2</option>
                                <option value="C1">C1</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Difficulty (1-100)</label>
                            <input
                                type="number"
                                value={formData.difficulty_score}
                                onChange={(e) => setFormData({ ...formData, difficulty_score: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                min="1"
                                max="100"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            {isSaving ? 'Saving...' : 'Save Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
