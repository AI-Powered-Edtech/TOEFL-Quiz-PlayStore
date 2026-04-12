
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Save } from 'lucide-react';
import React, { useState } from 'react';

import { ModelEssay } from '../../../types';
import { Button } from '../../Button';

interface VocabularyCollectorProps {
    isOpen: boolean;
    onClose: () => void;
    word: string;
    onSave: (data: { word: string; definition: string; example: string }) => void;
}

export const VocabularyCollector: React.FC<VocabularyCollectorProps> = ({
    isOpen,
    onClose,
    word,
    onSave
}) => {
    const [definition, setDefinition] = useState("");
    const [example, setExample] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Reset when opening new word
    React.useEffect(() => {
        if (isOpen) {
            setDefinition("");
            setExample("");
            setIsSaving(false);
        }
    }, [isOpen, word]);

    const handleSave = () => {
        setIsSaving(true);
        // Simulate slight delay for effect
        setTimeout(() => {
            onSave({ word, definition, example });
            onClose();
        }, 500);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800"
                >
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Plus className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Add to Collection</h3>
                        <p className="text-slate-500 text-sm">Save "{word}" to your spaced repetition deck.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Word</label>
                            <input
                                type="text"
                                value={word}
                                readOnly
                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">My Definition</label>
                            <textarea
                                value={definition}
                                onChange={(e) => setDefinition(e.target.value)}
                                placeholder="What does this mean to you?"
                                className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm min-h-[80px]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Example Sentence</label>
                            <input
                                type="text"
                                value={example}
                                onChange={(e) => setExample(e.target.value)}
                                placeholder="Use it in a sentence..."
                                className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm"
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button variant="ghost" fullWidth onClick={onClose} className="rounded-xl">
                                Cancel
                            </Button>
                            <Button
                                fullWidth
                                onClick={handleSave}
                                className="rounded-xl bg-amber-500 hover:bg-amber-600 border-amber-600"
                                disabled={!definition && !example}
                            >
                                {isSaving ? 'Saving...' : 'Save Word'}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
