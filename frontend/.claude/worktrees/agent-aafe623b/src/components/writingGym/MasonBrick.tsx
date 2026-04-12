import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export interface BrickProps {
    id: string;
    content: string;
    type: 'word' | 'punctuation';
    role?: string;
    isPlaced?: boolean;
    isLocked?: boolean;
    isError?: boolean;
    isRevealed?: boolean;
    highlightColor?: string;
    onTap?: () => void;
}

export const MasonBrick: React.FC<BrickProps> = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.id, disabled: props.isLocked });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
    };

    const getBrickStyles = () => {
        // New Chip Style - Clean, Rounded, Shadowed
        let base = "relative px-4 py-3 rounded-2xl font-bold text-lg transition-all duration-200 select-none touch-none shadow-sm cursor-pointer ";

        // Syntax Highlighting or Default White
        if (props.highlightColor) {
            base += `${props.highlightColor} text-white shadow-md `;
        } else {
            base += "bg-white text-slate-700 shadow-[0_2px_0_0_rgba(0,0,0,0.05)] border-2 border-slate-100 ";
        }

        // State Styles
        if (isDragging) {
            base += "scale-110 shadow-xl rotate-2 z-50 ring-4 ring-blue-100 ";
        } else if (props.isRevealed) {
            base += "ring-4 ring-blue-400 ring-offset-2 animate-pulse ";
        } else if (props.isLocked) {
            base += "bg-slate-100 text-slate-400 border-slate-200 shadow-none ";
        } else {
            base += "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0.5 active:shadow-sm ";
        }

        // Error Shake
        if (props.isError) {
            base += "animate-shake border-red-500 bg-red-50 text-red-600 ";
        }

        return base;
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={props.onTap}
            layout
            initial={false}
            className={getBrickStyles()}
        >
            <span className="drop-shadow-sm">{props.content}</span>
            {props.isLocked && (
                <div className="absolute -top-1 -right-1 bg-slate-400 rounded-full p-0.5 shadow-sm">
                    <Lock className="w-2.5 h-2.5 text-white" />
                </div>
            )}
        </motion.div>
    );
};
