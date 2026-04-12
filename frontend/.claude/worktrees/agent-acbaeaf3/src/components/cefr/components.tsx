import React from 'react';
import { BookOpen, AlertCircle, ArrowLeft, Headphones, PenTool, Mic, Trophy, Share2, Award, Loader2, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { AppView } from '../../types';
import { ReadingData, ListeningData, WritingData, SpeakingData } from './types';
import { getAudioElement } from '../../services/ttsService';

export const Button = ({ children, onClick, disabled, className = '', variant = 'primary' }: any) => {
    const baseStyle = "px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 touch-manipulation min-h-[44px]";
    const variants = {
        primary: "bg-[#2563EB] text-white hover:bg-blue-600 shadow-md shadow-blue-500/20",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:border-blue-500 hover:text-blue-600",
        danger: "bg-red-50 text-red-600 hover:bg-red-100"
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </button>
    );
};

export const AudioPlayer = ({ audioId, maxPlays, onEnded }: { audioId: string | undefined, maxPlays?: number, onEnded?: () => void }) => {
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [playCount, setPlayCount] = React.useState(0);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const limit = maxPlays ?? Infinity;

    React.useEffect(() => {
        if (!audioId) return;
        const el = getAudioElement(audioId);
        if (el) {
            audioRef.current = el;
            el.onended = () => {
                setIsPlaying(false);
                setProgress(100);
                if (onEnded) onEnded();
            };
            el.ontimeupdate = () => {
                setProgress((el.currentTime / el.duration) * 100);
            };
        }
        setPlayCount(0);
        setProgress(0);
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.onended = null;
                audioRef.current.ontimeupdate = null;
            }
        };
    }, [audioId, onEnded]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
        }
        if (playCount >= limit) return;
        setPlayCount(c => c + 1);
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        setIsPlaying(true);
    };

    if (!audioId) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-amber-700">Audio Unavailable</p>
                    <p className="text-xs text-amber-600">Audio is loading or unavailable. Please try again.</p>
                </div>
            </div>
        );
    }

    const exhausted = playCount >= limit;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <button
                onClick={togglePlay}
                disabled={exhausted && !isPlaying}
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 touch-manipulation transition-colors ${exhausted && !isPlaying ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
            >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <div className="flex-1">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
            </div>
            {limit < Infinity && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${exhausted ? 'bg-red-100 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    {exhausted ? 'No replays' : `${limit - playCount} play${limit - playCount !== 1 ? 's' : ''} left`}
                </span>
            )}
        </div>
    );
};

export const QuestionList = ({ questions, answers, setAnswers }: any) => (
    <div className="space-y-6">
        {questions?.map((q: any, idx: number) => (
            <div key={q.id || idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="font-medium text-slate-800 mb-4">{idx + 1}. {q.text}</p>
                <div className="space-y-2">
                    {q.options?.map((opt: string, oIdx: number) => (
                        <label key={oIdx} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${answers[q.id] === opt ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers((prev: any) => ({ ...prev, [q.id]: opt }))} className="mt-1" />
                            <span className="text-slate-700 leading-snug">{opt}</span>
                        </label>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

export const SectionHeader = ({ title, timeLeft, onNext, isNextDisabled, currentPart, totalParts }: any) => {
    return (
        <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                    {timeLeft}
                </div>
                <h2 className="font-bold text-slate-800 hidden sm:block">{title}</h2>
            </div>
            <Button onClick={onNext} disabled={isNextDisabled} className="py-2 px-4 text-sm">
                {currentPart < totalParts ? 'Next Part' : 'Submit Section'}
            </Button>
        </div>
    );
};
