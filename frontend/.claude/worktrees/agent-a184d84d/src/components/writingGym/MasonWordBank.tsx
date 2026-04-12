import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence } from 'framer-motion';
import { MasonItem } from '../../types';
import { MasonBrick } from './MasonBrick';

interface MasonWordBankProps {
    items: MasonItem[];
    revealedItemId: string | null;
    onItemTap: (item: MasonItem) => void;
}

export const MasonWordBank: React.FC<MasonWordBankProps> = ({
    items,
    revealedItemId,
    onItemTap
}) => {
    const { setNodeRef } = useDroppable({ id: 'pool-area' });

    return (
        <div className="relative mt-auto">
            {/* Word Bank Container */}
            <div className="bg-slate-100/80 rounded-[2rem] p-6 min-h-[200px] shadow-inner border border-white/50 backdrop-blur-sm">
                <SortableContext items={items} strategy={horizontalListSortingStrategy}>
                    <div
                        ref={setNodeRef}
                        className="flex flex-wrap justify-center gap-3"
                    >
                        <AnimatePresence>
                            {items.map((item) => (
                                <MasonBrick
                                    key={item.id}
                                    id={item.id}
                                    content={item.content}
                                    type={item.type}
                                    role={item.role}
                                    isRevealed={revealedItemId === item.id}
                                    onTap={() => onItemTap(item)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </SortableContext>
            </div>
        </div>
    );
};
