import { Eye, Snowflake, Shuffle, HelpCircle } from 'lucide-react';
import React from 'react';

interface PowerUpsProps {
    powerUps: {
        reveal: number;
        freeze: number;
        shuffle: number;
        hint: number;
    };
    onUsePowerUp: (type: 'reveal' | 'freeze' | 'shuffle' | 'hint') => void;
    disabled?: boolean;
}

export const PowerUps: React.FC<PowerUpsProps> = ({ powerUps, onUsePowerUp, disabled }) => {
    const powerUpConfig = [
        { type: 'reveal' as const, icon: Eye, label: 'Reveal', color: 'blue', count: powerUps.reveal },
        { type: 'freeze' as const, icon: Snowflake, label: 'Freeze', color: 'cyan', count: powerUps.freeze },
        { type: 'shuffle' as const, icon: Shuffle, label: 'Shuffle', color: 'purple', count: powerUps.shuffle },
        { type: 'hint' as const, icon: HelpCircle, label: 'Hint', color: 'amber', count: powerUps.hint },
    ];

    return (
        <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Power-Ups</h4>
            <div className="grid grid-cols-2 gap-2">
                {powerUpConfig.map(({ type, icon: Icon, label, color, count }) => (
                    <button
                        key={type}
                        onClick={() => onUsePowerUp(type)}
                        disabled={disabled || count <= 0}
                        className={`
              relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 
              transition-all font-semibold text-xs
              ${count > 0 && !disabled
                                ? `bg-${color}-50 border-${color}-200 text-${color}-700 hover:shadow-md hover:scale-105 active:scale-95`
                                : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                            }
            `}
                    >
                        <Icon className="w-5 h-5" />
                        <span>{label}</span>
                        <div className={`
              absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
              ${count > 0 ? `bg-${color}-500 text-white` : 'bg-slate-300 text-slate-600'}
            `}>
                            {count}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
