import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, FileText, CheckCircle, ChevronUp, ChevronDown,
    AlignLeft, Undo2, Redo2, Copy, BarChart3
} from 'lucide-react';
import React from 'react';

import { IELTSWritingTask } from '../../../types';
import { Button } from '../../Button';

import { TaskType, SimActiveTab } from './types';

interface SimExamViewProps {
    task: IELTSWritingTask;
    taskType: TaskType;
    timeLeft: number;
    wordCount: number;
    isSubmitting: boolean;
    activeTab: SimActiveTab;
    expandedStructure: number | null;
    editorContent: string;
    editorRef: React.RefObject<HTMLDivElement | null>;
    isLoading: boolean;
    setActiveTab: (tab: SimActiveTab) => void;
    setExpandedStructure: (idx: number | null) => void;
    setEditorContent: (content: string) => void;
    setWordCount: (count: number) => void;
    onSubmit: () => void;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SimExamView: React.FC<SimExamViewProps> = ({
    task, taskType, timeLeft, wordCount, isSubmitting, activeTab,
    expandedStructure, editorContent, editorRef, isLoading,
    setActiveTab, setExpandedStructure, setEditorContent, setWordCount, onSubmit
}) => {
    return (
        <div className="flex-1 w-full flex flex-col relative px-2 md:px-4 lg:px-6 pt-2 pb-4 h-full">
            {/* Top Bar for active task */}
            <div className="px-2 py-3 md:py-4 flex items-center justify-between w-full max-w-4xl mx-auto shrink-0">
                <div className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 font-bold text-[13px] rounded-full uppercase tracking-wider shadow-sm border border-indigo-200 dark:border-indigo-800">
                    {taskType}
                </div>
                <div
                    data-testid="sim-timer"
                    aria-label={`Time remaining: ${formatTime(timeLeft)}`}
                    className="flex items-center gap-2 font-black text-xl text-[#313A5C] dark:text-white absolute left-1/2 -translate-x-1/2"
                >
                    <Clock className="w-5 h-5 text-slate-400" />
                    {formatTime(timeLeft)}
                </div>
                <Button
                    size="sm"
                    onClick={onSubmit}
                    disabled={isSubmitting || wordCount < 10}
                    data-testid="sim-submit-btn"
                    aria-label={isSubmitting ? 'Evaluating essay...' : 'Submit essay for AI evaluation'}
                    className={`rounded-full px-6 font-bold py-2 shadow-sm ${wordCount >= 10 ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}
                >
                    {isSubmitting ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : 'Submit'}
                </Button>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col gap-4 overflow-hidden relative mt-2 md:mt-4">
                {/* Tabs Box */}
                <div className="bg-white/80 dark:bg-slate-900/80 border border-white/50 dark:border-slate-800 rounded-2xl flex p-1.5 shadow-sm shrink-0 backdrop-blur-md mx-2 md:mx-0">
                    <button
                        onClick={() => setActiveTab('question')}
                        className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-[14px] transition-all ${activeTab === 'question' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-indigo-600 dark:bg-slate-800 dark:text-indigo-400' : 'text-[#64748B] hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <FileText className="w-4 h-4" /> Question
                    </button>
                    <button
                        onClick={() => setActiveTab('answer')}
                        className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-[14px] transition-all ${activeTab === 'answer' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-indigo-600 dark:bg-slate-800 dark:text-indigo-400' : 'text-[#64748B] hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <AlignLeft className="w-4 h-4" /> Editor
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-sm flex-1 overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 mx-1 md:mx-0">

                    {/* QUESTION TAB */}
                    <div className={`${activeTab === 'question' ? 'flex' : 'hidden'} flex-1 flex-col overflow-y-auto p-6 md:p-8 custom-scrollbar relative`}>
                        {(isLoading || isSubmitting) && (
                            <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 z-30 flex flex-col items-center justify-center gap-4 rounded-[28px]">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
                            </div>
                        )}
                        <h4 className="text-[12px] font-black uppercase text-[#64748B] dark:text-slate-400 tracking-widest mb-4">Prompt</h4>
                        <h3 className="text-[20px] md:text-[22px] font-bold text-[#1E293B] dark:text-white leading-[1.6] mb-6">
                            {task.prompt}
                        </h3>

                        {/* Source Text (Task 1: chart/table/data description) */}
                        {task.source_text && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-6">
                                <h4 className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" /> Source Data
                                </h4>
                                <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                    {task.source_text}
                                </p>
                            </div>
                        )}

                        <div className="bg-[#EEF2FC]/70 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl p-5 mb-8">
                            <p className="text-[#313A5C] dark:text-indigo-300 font-medium text-[15px] leading-relaxed">
                                {taskType === 'Task 1'
                                    ? 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
                                    : 'Discuss both views and give your own opinion.'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 mb-5">
                            <div className="text-indigo-600 dark:text-indigo-400"><CheckCircle className="w-[18px] h-[18px] opacity-80" /></div>
                            <h4 className="text-[12px] font-black uppercase tracking-widest text-[#64748B] dark:text-slate-400">Suggested Structure</h4>
                        </div>

                        <div className="space-y-3 pb-8">
                            {task.suggested_structure?.map((item, i) => {
                                const parts = item.split(':');
                                const titleText = parts[0] ? parts[0].trim() : `Paragraph ${i + 1}`;
                                const bodyText = parts.length > 1 ? parts.slice(1).join(':').trim() : 'Develop your points logically.';
                                const isExpanded = expandedStructure === i;
                                return (
                                    <div key={i} className={`border ${isExpanded ? 'border-indigo-100 dark:border-slate-700 shadow-sm' : 'border-slate-100 dark:border-slate-800'} transition-all rounded-[16px] bg-white dark:bg-slate-900 overflow-hidden`}>
                                        <button
                                            onClick={() => setExpandedStructure(isExpanded ? null : i)}
                                            className="w-full flex items-center justify-between p-4 text-left"
                                        >
                                            <span className="font-bold text-[15px] text-[#313A5C] dark:text-slate-200">
                                                {i + 1}. {titleText}
                                            </span>
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                        </button>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-4 pb-4 pt-1 text-[15px] text-[#64748B] dark:text-slate-400 leading-relaxed border-t border-slate-50 dark:border-slate-800 mx-4">
                                                        {bodyText}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* EDITOR TAB */}
                    <div className={`${activeTab === 'answer' ? 'flex' : 'hidden'} flex-1 flex-col h-full bg-white dark:bg-slate-900 relative`}>
                        {/* Phase 3: Editor toolbar with role="toolbar" and aria-labels */}
                        <div
                            role="toolbar"
                            aria-label="Text formatting"
                            className="flex items-center px-4 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0 overflow-x-auto gap-1"
                        >
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('undo', false, undefined); }} aria-label="Undo" className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors"><Undo2 className="w-[18px] h-[18px]" /></button>
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('redo', false, undefined); }} aria-label="Redo" className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors mr-1"><Redo2 className="w-[18px] h-[18px]" /></button>

                            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false, undefined); }} aria-label="Bold (Ctrl+B)" className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 rounded-lg font-serif font-bold text-[18px] transition-colors ml-1">B</button>
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false, undefined); }} aria-label="Italic (Ctrl+I)" className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 rounded-lg font-serif italic text-[18px] transition-colors">I</button>
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline', false, undefined); }} aria-label="Underline (Ctrl+U)" className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 rounded-lg font-serif underline underline-offset-4 text-[18px] transition-colors mr-1">U</button>

                            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

                            <button aria-label="Copy text" className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors ml-1" onClick={() => navigator.clipboard.writeText(editorRef.current?.innerText || '')}><Copy className="w-[18px] h-[18px]" /></button>
                        </div>

                        <div className="flex-1 relative" data-testid="sim-editor-wrapper">
                            <div
                                ref={editorRef}
                                contentEditable
                                role="textbox"
                                aria-multiline="true"
                                aria-label="Essay editor"
                                data-testid="sim-editor"
                                dir="ltr"
                                onInput={(e) => {
                                    const html = e.currentTarget.innerHTML;
                                    setEditorContent(html);
                                    const text = e.currentTarget.innerText || '';
                                    const count = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
                                    setWordCount(count);
                                }}
                                onKeyDown={(e) => {
                                    // Phase 3: Keyboard shortcuts for formatting
                                    if ((e.ctrlKey || e.metaKey)) {
                                        if (e.key === 'b') { e.preventDefault(); document.execCommand('bold', false, undefined); }
                                        if (e.key === 'i') { e.preventDefault(); document.execCommand('italic', false, undefined); }
                                        if (e.key === 'u') { e.preventDefault(); document.execCommand('underline', false, undefined); }
                                    }
                                }}
                                dangerouslySetInnerHTML={{ __html: editorContent }}
                                suppressContentEditableWarning={true}
                                style={{ whiteSpace: 'pre-wrap', direction: 'ltr', unicodeBidi: 'isolate' }}
                                className="absolute inset-0 w-full h-full p-6 md:p-8 outline-none bg-transparent text-[16px] text-[#1E293B] dark:text-slate-200 font-sans leading-[1.8] custom-scrollbar overflow-y-auto before:text-slate-400 dark:before:text-slate-500"
                                data-placeholder="Write your response here..."
                            />
                        </div>

                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 shrink-0">
                            <div className="flex items-center gap-2 text-[14px] font-bold text-slate-500 dark:text-slate-400">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> Saved
                            </div>
                            {/* Phase 3: aria-live for screen reader word count announcements */}
                            <div
                                data-testid="sim-word-count"
                                aria-live="polite"
                                aria-atomic="true"
                                aria-label={`Word count: ${wordCount} words`}
                                className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] font-bold text-[#313A5C] dark:text-slate-300 shadow-sm flex items-center"
                            >
                                {wordCount} Words
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
