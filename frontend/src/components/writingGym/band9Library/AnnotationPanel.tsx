
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Zap, GraduationCap, Link as LinkIcon, AlertCircle } from 'lucide-react';
import React from 'react';

import { Annotation } from '../../../types';
import { Button } from '../../Button';

interface AnnotationPanelProps {
    annotations: Annotation[];
    activeAnnotationId: string | null;
    onSelectAnnotation: (id: string | null) => void;
    onPracticeSkill?: (skillId: string) => void;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
    annotations,
    activeAnnotationId,
    onSelectAnnotation,
    onPracticeSkill
}) => {

    // Scroll to active annotation is handled by parent or simple refs if needed
    // For now, we render listing

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'vocabulary': return <Zap className="w-3 h-3 text-amber-500" />;
            case 'grammar': return <AlertCircle className="w-3 h-3 text-emerald-500" />;
            case 'coherence': return <LinkIcon className="w-3 h-3 text-indigo-500" />;
            default: return <GraduationCap className="w-3 h-3 text-rose-500" />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 px-1 flex items-center justify-between">
                <span>Analysis</span>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">
                    {annotations.length} insights
                </span>
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-20 no-scrollbar">
                {annotations.map((anno: any) => {
                    const isActive = activeAnnotationId === anno.id;
                    return (
                        <motion.div
                            key={anno.id}
                            initial={false}
                            animate={{
                                backgroundColor: isActive ? '#ffffff' : 'rgba(248, 250, 252, 0.5)',
                                scale: isActive ? 1.02 : 1,
                                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                            }}
                            className={`
                                    rounded-xl border transition-all cursor-pointer relative overflow-hidden group
                                    ${isActive
                                    ? 'border-indigo-500 dark:bg-slate-800'
                                    : 'border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'}
                                `}
                            onClick={() => onSelectAnnotation(isActive ? null : anno.id)}
                        >
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}

                            <div className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
                                            {getTypeIcon(anno.type)}
                                        </div>
                                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                            {anno.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {isActive && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSelectAnnotation(null); }}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <p className={`
                                    font-serif text-sm italic mb-3 text-slate-700 dark:text-slate-300
                                    ${isActive ? 'line-clamp-none' : 'line-clamp-2'}
                                `}>
                                    "{anno.quote}"
                                </p>

                                <div className={`
                                    text-sm text-slate-600 dark:text-slate-400 leading-relaxed
                                    ${isActive ? 'block' : 'hidden'}
                                `}>
                                    {anno.comment}

                                    {/* Action Button */}
                                    {anno.skill_ref && onPracticeSkill && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e: React.MouseEvent) => {
                                                    e.stopPropagation();
                                                    onPracticeSkill(anno.skill_ref!);
                                                }}
                                                className="text-xs w-full"
                                            >
                                                <Zap className="w-3 h-3 mr-2" />
                                                Practice this Skill
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
