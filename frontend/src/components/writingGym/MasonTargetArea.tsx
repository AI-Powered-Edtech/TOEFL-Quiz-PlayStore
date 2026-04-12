import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence } from 'framer-motion';
import React from 'react';

import { MasonItem, WritingExercise } from '../../types';
import { getSyntaxColor } from '../../utils/masonUtils';

import { MasonBrick } from './MasonBrick';

interface MasonTargetAreaProps {
    placedItems: MasonItem[];
    exercise: WritingExercise | null;
    isShaking: boolean;
    showSyntaxHighlight: boolean;
    onItemTap: (item: MasonItem) => void;
}

export const MasonTargetArea: React.FC<MasonTargetAreaProps> = ({
    placedItems,
    exercise,
    isShaking,
    showSyntaxHighlight,
    onItemTap
}) => {
    const { setNodeRef } = useDroppable({ id: 'target-area' });

    return (
        <div className="min-h-[220px] flex flex-col items-center justify-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">
                CONSTRUCT THE SENTENCE
            </h3>

            <SortableContext items={placedItems} strategy={horizontalListSortingStrategy}>
                <div
                    ref={setNodeRef}
                    className={`
                        flex flex-wrap gap-3 justify-center w-full max-w-2xl min-h-[140px] p-4 rounded-3xl transition-all duration-300
                        ${isShaking ? 'animate-shake bg-red-50 ring-4 ring-red-100' : 'bg-transparent'}
                    `}
                >
                    <AnimatePresence>
                        {placedItems.map((item) => (
                            <MasonBrick
                                key={item.id}
                                id={item.id}
                                content={item.content}
                                type={item.type}
                                role={item.role}
                                isPlaced={true}
                                highlightColor={showSyntaxHighlight ? getSyntaxColor(item.role) : undefined}
                                isLocked={item.isLocked}
                                onTap={() => onItemTap(item)}
                            />
                        ))}
                    </AnimatePresence>
                    {/* Empty Slot Placeholders */}
                    {Array.from({ length: Math.max(0, (exercise?.fragments?.length || 5) - placedItems.length) }).map((_, i) => (
                        <div
                            key={`slot-${i}`}
                            className="w-16 h-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50"
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};
