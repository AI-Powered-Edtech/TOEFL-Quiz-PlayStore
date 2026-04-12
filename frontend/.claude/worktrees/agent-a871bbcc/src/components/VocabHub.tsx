
import {
    Microscope, Layers, BookOpen, ArrowLeft,
    Brain, Sparkles, Trophy, ChevronRight, Zap
} from 'lucide-react';
import React from 'react';

import { AppView } from '../types';

interface VocabHubViewProps {
    onNavigate: (view: AppView) => void;
}

interface VocabItem {
    id: string;
    icon: React.ElementType;
    title: string;
    description: string;
    category: 'CORE' | 'TOOL';
    theme: 'blue' | 'orange' | 'green' | 'purple';
    badge: string;
    onClick: () => void;
}

const VocabCard: React.FC<{ item: VocabItem }> = ({ item }) => {
    const themeStyles = {
        blue: {
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            border: 'hover:border-blue-200',
            badge: 'bg-blue-100 text-blue-700'
        },
        orange: {
            bg: 'bg-orange-50',
            text: 'text-orange-600',
            border: 'hover:border-orange-200',
            badge: 'bg-orange-100 text-orange-700'
        },
        green: {
            bg: 'bg-green-50',
            text: 'text-green-600',
            border: 'hover:border-green-200',
            badge: 'bg-green-100 text-green-700'
        },
        purple: {
            bg: 'bg-purple-50',
            text: 'text-purple-600',
            border: 'hover:border-purple-200',
            badge: 'bg-purple-100 text-purple-700'
        }
    };

    const style = themeStyles[item.theme];
    const isCore = item.category === 'CORE';

    return (
        <button
            onClick={item.onClick}
            className={`
                group relative flex flex-col text-left
                bg-white border border-slate-200 rounded-2xl
                transition-all duration-300 ease-out
                hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/5
                ${style.border}
                ${isCore ? 'col-span-2 p-5' : 'col-span-1 p-4'}
            `}
        >
            <div className={`flex ${isCore ? 'flex-row items-start gap-4' : 'flex-col gap-3'}`}>
                <div className={`
                    ${style.bg} ${style.text}
                    rounded-xl flex items-center justify-center
                    transition-transform group-hover:scale-110
                    ${isCore ? 'w-12 h-12 shrink-0' : 'w-10 h-10'}
                `}>
                    <item.icon className={isCore ? 'w-6 h-6' : 'w-5 h-5'} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                            {item.title}
                        </h3>
                    </div>

                    <p className={`text-slate-500 leading-snug ${isCore ? 'text-sm' : 'text-xs line-clamp-3'}`}>
                        {item.description}
                    </p>

                    <div className={`flex items-center justify-between ${isCore ? 'mt-3' : 'mt-4'}`}>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${style.badge}`}>
                            {item.badge}
                        </span>

                        {isCore && (
                            <div className="flex items-center text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                Enter Lab <ChevronRight className="w-3 h-3 ml-1" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
};

export const VocabHubView: React.FC<VocabHubViewProps> = ({ onNavigate }) => {

    const items: VocabItem[] = [
        {
            id: 'lexical-lab',
            category: 'CORE',
            title: 'Lexical Lab',
            description: 'Deep dive into word origins, collocations, and nuances. The best place to start learning new terms.',
            icon: Microscope,
            theme: 'blue',
            badge: 'Discovery',
            onClick: () => onNavigate(AppView.LEXICAL_LAB)
        },
        {
            id: 'flashcards',
            category: 'TOOL',
            title: 'Smart Flashcards',
            description: 'SRS-powered system adapts to your memory curve.',
            icon: BookOpen,
            theme: 'green',
            badge: 'Retention',
            onClick: () => onNavigate(AppView.FLASHCARDS)
        },
        {
            id: 'language-dojo',
            category: 'TOOL',
            title: 'Language Dojo',
            description: 'High-intensity drills to test your recall speed.',
            icon: Layers,
            theme: 'orange',
            badge: 'Challenge',
            onClick: () => onNavigate(AppView.LANGUAGE_DOJO)
        }
    ];

    const coreItems = items.filter(i => i.category === 'CORE');
    const toolItems = items.filter(i => i.category === 'TOOL');

    return (
        <div className="h-full flex flex-col bg-slate-50">
             {/* --- Fixed Header --- */}
            <div className="flex-shrink-0 bg-[#2563EB] z-10">
                <div className="px-5 pt-6 pb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate(AppView.DASHBOARD)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Vocabulary Hub</h1>
                            <p className="text-blue-100 text-xs font-medium opacity-80">Expand your word power</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Scrollable Content --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 bg-slate-50">
                {/* Gradient Extension */}
                <div 
                    className="relative z-0 px-5 pt-2 pb-20 -mt-1 overflow-hidden"
                    style={{ background: 'linear-gradient(180deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)' }}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500 opacity-[0.05] rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                    <div className="relative z-10 max-w-2xl mx-auto flex gap-3">
                         <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-300">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-white leading-none">3</div>
                                <div className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">Modes</div>
                            </div>
                        </div>
                        <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-400/20 flex items-center justify-center text-blue-200">
                                <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-white leading-none">TOEFL</div>
                                <div className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">Focus</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 -mt-12 bg-slate-50 rounded-t-[2.5rem]">
                    <div className="container max-w-2xl mx-auto px-5 pt-6 space-y-6">

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pl-1">
                                <Microscope className="w-4 h-4 text-slate-500" />
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discovery Phase</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {coreItems.map(item => (
                                    <VocabCard key={item.id} item={item} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pl-1">
                                <Zap className="w-4 h-4 text-slate-500" />
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reinforcement</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {toolItems.map(item => (
                                    <VocabCard key={item.id} item={item} />
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 mb-4 p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 shadow-sm">
                            <h4 className="font-bold text-blue-800 text-sm mb-4 flex items-center">
                                <Brain className="w-4 h-4 mr-2" />
                                Optimal Learning Flow
                            </h4>

                            <div className="flex items-center justify-between relative">
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-100 -z-10" />

                                <div className="flex flex-col items-center gap-2 bg-white px-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">1</div>
                                    <span className="text-[10px] font-semibold text-blue-900">Lab</span>
                                </div>

                                <ChevronRight className="w-4 h-4 text-blue-200 bg-white" />

                                <div className="flex flex-col items-center gap-2 bg-white px-2">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">2</div>
                                    <span className="text-[10px] font-semibold text-blue-900">SRS</span>
                                </div>

                                <ChevronRight className="w-4 h-4 text-blue-200 bg-white" />

                                <div className="flex flex-col items-center gap-2 bg-white px-2">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">3</div>
                                    <span className="text-[10px] font-semibold text-blue-900">Dojo</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
