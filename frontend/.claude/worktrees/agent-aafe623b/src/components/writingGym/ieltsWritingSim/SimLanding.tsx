import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, FileText, AlertTriangle, PenTool } from 'lucide-react';
import { Button } from '../../Button';
import { TaskType } from './types';

interface SimLandingProps {
    taskType: TaskType;
    setTaskType: (type: TaskType) => void;
    isLoading: boolean;
    onStart: (type: TaskType) => void;
    onBack: () => void;
}

export const SimLanding: React.FC<SimLandingProps> = ({ taskType, setTaskType, isLoading, onStart, onBack }) => {
    return (
        <div className="w-full h-[100dvh] flex flex-col items-center justify-center p-8 text-center bg-[#EEF2FC] dark:bg-slate-950 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-900/20 blur-[100px] rounded-full pointer-events-none" />

            {/* Custom Header similar to design */}
            <div className="absolute top-0 left-0 right-0 px-6 py-6 flex items-center justify-between z-20">
                <button onClick={onBack} className="bg-white dark:bg-slate-800 rounded-full p-2.5 shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors" aria-label="Exit">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-black uppercase tracking-widest text-[#64748B] dark:text-slate-400">WRITING MODULE</span>
                <div className="w-10"></div> {/* spacer */}
            </div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-sm">

                {/* Monitor Graphic */}
                <div className="w-48 h-40 mb-10 relative">
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none flex items-center justify-center border border-white dark:border-slate-700">
                        <div className="w-32 h-24 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col p-3.5 gap-2.5 relative">
                            <div className="w-10 h-2 bg-indigo-200/60 dark:bg-indigo-900/50 rounded-full" />
                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
                            <div className="w-2/3 h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />

                            <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg border-[3px] border-white dark:border-slate-800">
                                <PenTool className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="absolute -bottom-4 w-12 h-8 bg-slate-200/50 dark:bg-slate-700/50 blur-sm rounded-full" />
                        <div className="absolute -bottom-5 w-12 h-5 bg-white/60 dark:bg-slate-800 backdrop-blur-md rounded-b-xl z-[-1]" />
                    </div>
                </div>

                <h2 className="text-4xl md:text-5xl font-black text-[#313A5C] dark:text-white mb-4 tracking-tight">
                    IELTS Sim Mode
                </h2>

                <p className="text-[#64748B] dark:text-slate-400 text-[15px] leading-relaxed mb-8">
                    Experience a distraction-free, exam-like environment designed to simulate real test conditions.
                </p>

                {/* Task Type Selector */}
                <div className="w-full bg-white/80 dark:bg-slate-900/80 border border-white/50 dark:border-slate-800 rounded-2xl flex p-1.5 shadow-sm backdrop-blur-md mb-6 px-4">
                    <button
                        onClick={() => setTaskType('Task 1')}
                        className={`flex-1 py-3 rounded-xl font-bold text-[14px] transition-all ${taskType === 'Task 1' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-indigo-600 dark:bg-slate-800 dark:text-indigo-400' : 'text-[#64748B] hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        Task 1
                    </button>
                    <button
                        onClick={() => setTaskType('Task 2')}
                        className={`flex-1 py-3 rounded-xl font-bold text-[14px] transition-all ${taskType === 'Task 2' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-indigo-600 dark:bg-slate-800 dark:text-indigo-400' : 'text-[#64748B] hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        Task 2
                    </button>
                </div>

                <div className="flex flex-col gap-3 mb-8 w-full px-4">
                    <div className="w-full bg-white dark:bg-slate-900 px-5 py-3.5 rounded-full flex items-center justify-center gap-3 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-full">
                            <Clock className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-bold text-[#313A5C] dark:text-slate-200 text-[15px]">
                            {taskType === 'Task 1' ? '20 Min Timer' : '40 Min Timer'}
                        </span>
                    </div>
                    <div className="w-full bg-white dark:bg-slate-900 px-5 py-3.5 rounded-full flex items-center justify-center gap-3 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-full">
                            <FileText className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="font-bold text-[#313A5C] dark:text-slate-200 text-[15px]">
                            Min. {taskType === 'Task 1' ? '150' : '250'} Words
                        </span>
                    </div>
                    <div className="w-full bg-white dark:bg-slate-900 px-5 py-3.5 rounded-full flex items-center justify-center gap-3 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="bg-purple-50 dark:bg-purple-900/30 p-1.5 rounded-full">
                            <AlertTriangle className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-bold text-[#313A5C] dark:text-slate-200 text-[15px]">No Distractions</span>
                    </div>
                </div>

                <Button
                    size="lg"
                    onClick={() => onStart(taskType)}
                    disabled={isLoading}
                    className={`w-full text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] dark:shadow-none border-transparent py-4 text-lg rounded-2xl transition-all font-bold flex justify-center items-center ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95'}`}
                >
                    {isLoading ? (
                        <>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full mr-3" />
                            Preparing Exam...
                        </>
                    ) : (
                        <>
                            Start {taskType} <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                        </>
                    )}
                </Button>

                <p className="mt-6 text-xs font-medium text-slate-400">
                    By starting, you agree to the exam simulation rules.
                </p>
            </div>
        </div>
    );
};
