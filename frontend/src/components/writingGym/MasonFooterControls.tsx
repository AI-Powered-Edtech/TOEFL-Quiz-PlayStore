import { Eye, Snowflake, Shuffle, Lightbulb, Check } from 'lucide-react';
import React from 'react';

import { MasonGameState } from '../../types/mason';

interface MasonFooterControlsProps {
    gameState: MasonGameState;
    isFrozen: boolean;
    onReveal: () => void;
    onFreeze: () => void;
    onShuffle: () => void;
    onHint: () => void;
    onCheck: () => void;
}

export const MasonFooterControls: React.FC<MasonFooterControlsProps> = ({
    gameState,
    isFrozen,
    onReveal,
    onFreeze,
    onShuffle,
    onHint,
    onCheck
}) => {
    return (
        <div
            className="absolute bottom-0 left-0 right-0 bg-white p-4 pb-8 flex items-center justify-center gap-3 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
            <button onClick={onReveal} className="flex flex-col items-center gap-1.5 group relative w-16">
                <div className="w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-all text-slate-600 group-hover:border-blue-200 group-hover:text-blue-500">
                    <Eye className="w-6 h-6" />
                </div>
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm transform translate-x-1/4 -translate-y-1/4">
                    {gameState.powerUps.reveal}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-blue-500">Reveal</span>
            </button>

            <button onClick={onFreeze} className="flex flex-col items-center gap-1.5 group relative w-16">
                <div className={`w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-all text-slate-600 group-hover:border-blue-200 group-hover:text-blue-500 ${isFrozen ? 'ring-2 ring-blue-400' : ''}`}>
                    <Snowflake className={`w-6 h-6 ${isFrozen ? 'text-blue-500 animate-spin-slow' : ''}`} />
                </div>
                <div className="absolute top-0 right-0 bg-cyan-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm transform translate-x-1/4 -translate-y-1/4">
                    {gameState.powerUps.freeze}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-blue-500">Freeze</span>
            </button>

            <button onClick={onShuffle} className="flex flex-col items-center gap-1.5 group relative w-16">
                <div className="w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-all text-slate-600 group-hover:border-blue-200 group-hover:text-blue-500">
                    <Shuffle className="w-6 h-6" />
                </div>
                <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm transform translate-x-1/4 -translate-y-1/4">
                    {gameState.powerUps.shuffle}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-blue-500">Shuffle</span>
            </button>

            <button onClick={onHint} className="flex flex-col items-center gap-1.5 group relative w-16">
                <div className="w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-all text-slate-600 group-hover:border-blue-200 group-hover:text-blue-500">
                    <Lightbulb className="w-6 h-6" />
                </div>
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm transform translate-x-1/4 -translate-y-1/4">
                    {gameState.powerUps.hint}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-blue-500">Hint</span>
            </button>

            {/* Scale Check Button */}
            <button
                onClick={onCheck}
                className="ml-2 w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 active:scale-95 transition-all hover:shadow-orange-300 hover:-translate-y-1"
            >
                <Check className="w-8 h-8 text-white drop-shadow-sm" strokeWidth={3.5} />
            </button>
        </div>
    );
};
