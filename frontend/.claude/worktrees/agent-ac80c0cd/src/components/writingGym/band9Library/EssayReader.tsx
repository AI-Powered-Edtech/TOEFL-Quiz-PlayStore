
import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

import { ModelEssay, Annotation } from '../../../types';

interface EssayReaderProps {
    essay: ModelEssay;
    activeAnnotationId: string | null;
    onAnnotationClick: (id: string) => void;
    onWordLongPress?: (word: string) => void; // For vocabulary
}

export const EssayReader: React.FC<EssayReaderProps> = ({
    essay,
    activeAnnotationId,
    onAnnotationClick,
    onWordLongPress
}) => {

    // Core Logic: Segment content based on annotation indices
    const segments = useMemo(() => {
        if (!essay.annotations || essay.annotations.length === 0) {
            return [{ text: essay.content, isAnnotation: false }];
        }

        // Sort annotations by start index to handle linearity
        // NOTE: We assume NO Overlaps for simplicity. If overlaps exist, logic needs nesting.
        // Current AI prompt implies distinct features.
        const sortedAnnos = [...essay.annotations]
            .filter(a => a.start_index >= 0 && a.end_index > a.start_index)
            .sort((a, b) => a.start_index - b.start_index);

        const result: { text: string; isAnnotation: boolean; annotationId?: string; type?: string }[] = [];
        let currentIndex = 0;

        sortedAnnos.forEach(anno => {
            // Text before annotation
            if (anno.start_index > currentIndex) {
                result.push({
                    text: essay.content.slice(currentIndex, anno.start_index),
                    isAnnotation: false
                });
            }

            // Annotation text
            result.push({
                text: essay.content.slice(anno.start_index, anno.end_index),
                isAnnotation: true,
                annotationId: anno.id,
                type: anno.type
            });

            currentIndex = anno.end_index;
        });

        // Remaining text
        if (currentIndex < essay.content.length) {
            result.push({
                text: essay.content.slice(currentIndex),
                isAnnotation: false
            });
        }

        return result;
    }, [essay]);

    // Color mapping for annotation types
    const getTypeStyles = (type?: string, isActive?: boolean) => {
        switch (type) {
            case 'grammar':
                return isActive
                    ? 'bg-emerald-200 border-emerald-500 text-emerald-900'
                    : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
            case 'vocabulary':
                return isActive
                    ? 'bg-amber-200 border-amber-500 text-amber-900'
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100';
            case 'coherence':
                return isActive
                    ? 'bg-indigo-200 border-indigo-500 text-indigo-900'
                    : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100';
            case 'task_response':
                return isActive
                    ? 'bg-rose-200 border-rose-500 text-rose-900'
                    : 'bg-rose-50 border-rose-200 hover:bg-rose-100';
            default:
                return isActive
                    ? 'bg-slate-200 border-slate-500 text-slate-900'
                    : 'bg-slate-100 border-slate-200 hover:bg-slate-200';
        }
    };

    return (
        <div className="prose dark:prose-invert max-w-none font-serif text-lg leading-loose text-slate-700 dark:text-slate-300">
            <p>
                {segments.map((segment, index) => {
                    if (segment.isAnnotation) {
                        const isActive = activeAnnotationId === segment.annotationId;
                        return (
                            <motion.span
                                key={index}
                                layout
                                onClick={() => segment.annotationId && onAnnotationClick(segment.annotationId)}
                                className={`
                                    cursor-pointer px-1 py-0.5 rounded
                                    border-b-2 transition-all duration-300
                                    ${getTypeStyles(segment.type, isActive)}
                                    ${isActive ? 'shadow-sm font-semibold' : ''}
                                `}
                            >
                                {segment.text}
                            </motion.span>
                        );
                    }
                    return <span key={index}>{segment.text}</span>;
                })}
            </p>
        </div>
    );
};
