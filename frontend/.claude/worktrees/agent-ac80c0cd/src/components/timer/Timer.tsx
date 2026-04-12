import { Clock } from 'lucide-react';
import React from 'react';

import { formatTime } from '../../utils/gameUtils';

interface TimerProps {
    timeRemaining: number;
    maxTime: number;
    isRunning: boolean;
}

export const Timer: React.FC<TimerProps> = ({ timeRemaining, maxTime, isRunning }) => {
    const percentage = (timeRemaining / maxTime) * 100;
    const isLow = percentage < 20;

    return (
        <div className="flex items-center gap-2 bg-white rounded-[20px] border border-slate-100 px-4 py-2 shadow-sm">
            <Clock className={`w-4 h-4 ${isLow ? 'text-red-500' : 'text-slate-500'}`} />
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-medium">Time</span>
                <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatTime(timeRemaining)}
                </span>
            </div>
            {isRunning && isLow && (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
        </div>
    );
};
