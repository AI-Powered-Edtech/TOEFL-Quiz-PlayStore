import { CheckCircle, XCircle, Edit2, Trash2, Save } from 'lucide-react';
import React, { useState } from 'react';

import { QuizData } from '../types';

import { Button } from './Button';

interface QuestionReviewCardProps {
    question: QuizData;
    index: number;
    onUpdate: (updatedQuestion: QuizData) => void;
    onDelete: () => void;
}

export const QuestionReviewCard: React.FC<QuestionReviewCardProps> = ({
    question,
    index,
    onUpdate,
    onDelete
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState(question.prompt);
    const [editedChoices, setEditedChoices] = useState([...question.choices]);
    const [editedCorrectAnswer, setEditedCorrectAnswer] = useState(
        question.correct_response[0] || 'A'
    );

    const handleSave = () => {
        onUpdate({
            ...question,
            prompt: editedPrompt,
            choices: editedChoices,
            correct_response: [editedCorrectAnswer]
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedPrompt(question.prompt);
        setEditedChoices([...question.choices]);
        setEditedCorrectAnswer(question.correct_response[0] || 'A');
        setIsEditing(false);
    };

    const updateChoice = (choiceIndex: number, value: string) => {
        const newChoices = [...editedChoices];
        newChoices[choiceIndex] = value;
        setEditedChoices(newChoices);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                        {index + 1}
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {question.section || question.skill_type}
                        </span>
                        <p className="text-xs text-slate-400">Skill ID: {question.skill_id}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                                title="Edit Question"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                title="Delete Question"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleSave}
                                className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600"
                                title="Save Changes"
                            >
                                <Save className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleCancel}
                                className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-600"
                                title="Cancel"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Question Prompt */}
            <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Question
                </label>
                {isEditing ? (
                    <textarea
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                    />
                ) : (
                    <p className="text-sm text-slate-700 leading-relaxed">{question.prompt}</p>
                )}
            </div>

            {/* Choices - Hide correct answer unless editing */}
            {question.interaction !== 'identify_error' && question.choices.length > 0 && (
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Options
                    </label>
                    <div className="space-y-2">
                        {editedChoices.map((choice, idx) => {
                            const label = String.fromCharCode(65 + idx); // A, B, C, D
                            const isCorrect = editedCorrectAnswer === label;

                            return (
                                <div
                                    key={idx}
                                    className={`flex items-start gap-3 p-3 rounded-lg border ${isEditing && isCorrect
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-slate-50 border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="font-bold text-sm text-slate-600">
                                            {label}.
                                        </span>
                                        {/* Only show checkmark when editing */}
                                        {isEditing && isCorrect && (
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={choice}
                                            onChange={(e) => updateChoice(idx, e.target.value)}
                                            className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    ) : (
                                        <span className="flex-1 text-sm text-slate-700">{choice}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Correct Answer Selector (Edit Mode) */}
            {isEditing && question.interaction !== 'identify_error' && (
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Correct Answer
                    </label>
                    <select
                        value={editedCorrectAnswer}
                        onChange={(e) => setEditedCorrectAnswer(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {editedChoices.map((_, idx) => {
                            const label = String.fromCharCode(65 + idx);
                            return (
                                <option key={idx} value={label}>
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                </div>
            )}

            {/* Identify Error Mode */}
            {question.interaction === 'identify_error' && isEditing && (
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Correct Answer (Error Location)
                    </label>
                    <select
                        value={editedCorrectAnswer}
                        onChange={(e) => setEditedCorrectAnswer(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                    </select>
                </div>
            )}

            {/* Explanation - Only show when editing to avoid spoilers */}
            {isEditing && question.metadata?.explanation && (
                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Explanation (Hidden from users)
                    </label>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                        {question.metadata.explanation}
                    </p>
                </div>
            )}
        </div>
    );
};
