import React, { useState, useEffect, useRef } from 'react';
import { AppView } from '../../types';
import { ArrowLeft, Highlighter, BookA, Sparkles, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { TOEFL_STRUCTURE_SKILLS } from '../../data/skills';
import { AiBottomSheet } from './AiBottomSheet';
import { SkillAiChatOverlay } from './SkillAiChatOverlay';
import { fetchBlogPost, InteractiveExample } from '../../services/blogService';
import { recordFeatureUsage } from '../../services/subscriptionService';
import { BlogPost } from '../../data/blogPosts';

interface SkillModuleReaderProps {
    skillId: string;
    onNavigate: (view: AppView, params?: any) => void;
}

/**
 * Gets the caret position (Range) at a given point.
 */
function getCaretRangeFromPoint(x: number, y: number): Range | null {
    if (typeof document.caretRangeFromPoint === 'function') {
        return document.caretRangeFromPoint(x, y);
    }
    const pos = (document as any).caretPositionFromPoint?.(x, y);
    if (pos) {
        const range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
        return range;
    }
    return null;
}

// Simple Markdown Parser for the Reader
const MarkdownPreview = ({ content, highlightPhrase }: { content: string, highlightPhrase?: string }) => {
    return (
        <div className="prose prose-lg prose-slate max-w-none text-slate-800 leading-[1.8]">
            {content.split('\n').filter(line => line.trim() !== '').map((line, i) => {
                if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-black text-slate-900 mt-6 mb-3 leading-tight">{line.slice(2)}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-slate-900 mt-5 mb-2">{line.slice(3)}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-slate-800 mt-4 mb-1">{line.slice(4)}</h3>;
                if (line.startsWith('- ')) {
                    return (
                        <div key={i} className="flex gap-3 mb-1 ml-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 shrink-0" />
                            <p className="text-slate-700 leading-relaxed">{line.slice(2)}</p>
                        </div>
                    );
                }
                // Handle tables
                if (line.includes('|') && line.trim().startsWith('|')) {
                    const cells = line.split('|').filter(c => c.trim() !== '');
                    const isHeader = line.includes('---') || i === content.split('\n').findIndex(l => l.includes('|'));
                    if (line.includes('---')) return null; // Skip separator line
                    return (
                        <div key={i} className="overflow-x-auto my-4 font-sans bg-slate-50 border border-slate-200 rounded-xl">
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className={isHeader ? 'bg-slate-100' : ''}>
                                        {cells.map((cell, cellIdx) => (
                                            <td key={cellIdx} className={`px-4 py-3 border-b border-slate-200 ${isHeader ? 'font-bold text-slate-700' : 'text-slate-600'}`}>
                                                {cell.trim()}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    );
                }

                // Process bold text and highlight phrases
                let processedLine: React.ReactNode = line;

                // Basic markdown bold
                if (typeof processedLine === 'string' && processedLine.includes('**')) {
                    const parts = processedLine.split('**');
                    processedLine = parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="font-bold">{part}</strong> : part);
                }

                if (highlightPhrase && typeof line === 'string' && line.includes(highlightPhrase)) {
                    const parts = line.split(highlightPhrase);
                    processedLine = (
                        <span key={i}>
                            {parts[0]}
                            <span className="bg-blue-100/50 text-blue-900 px-1 rounded">{highlightPhrase}</span>
                            {parts[1]}
                        </span>
                    );
                }

                return <p key={i} className="mb-4">{processedLine}</p>;
            })}
        </div>
    );
};

export const SkillModuleReader: React.FC<SkillModuleReaderProps> = ({
    skillId,
    onNavigate
}) => {
    const skill = TOEFL_STRUCTURE_SKILLS.find(s => s.id === skillId) || TOEFL_STRUCTURE_SKILLS[0];
    const skillNumber = skill.name.match(/\d+/)?.[0] || '1';
    const skillTitle = skill.name.replace(/Skill \d+: /, '');

    const [post, setPost] = useState<(BlogPost & { quizData?: InteractiveExample, highlightPhrase?: string }) | null>(null);
    const [loading, setLoading] = useState(true);

    const [selectedText, setSelectedText] = useState('');
    const [showBottomBar, setShowBottomBar] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Interactive Example State
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    // AI Highlight Tool State
    const [isAiHighlightEnabled, setIsAiHighlightEnabled] = useState(false);

    // AI Bottom Sheet State
    const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);
    const [currentAiAction, setCurrentAiAction] = useState<'define' | 'explain' | 'highlight' | null>(null);

    // AI Chat Overlay State
    const [isChatOverlayOpen, setIsChatOverlayOpen] = useState(false);

    // Custom touch-drag config
    const isDraggingRef = useRef(false);
    const startRangeRef = useRef<Range | null>(null);
    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            const data = await fetchBlogPost(skillId);
            if (data) {
                setPost(data);
                recordFeatureUsage('skill_module_read').catch(console.error);
            }
            setLoading(false);
        };
        loadContent();
    }, [skillId]);

    // ── Custom Touch-Drag Selection (like PC mouse-drag) ──
    useEffect(() => {
        const contentEl = contentRef.current;
        if (!contentEl || !isAiHighlightEnabled) return;

        const handleTouchStart = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('a') || target.closest('input')) {
                return;
            }

            const touch = e.touches[0];
            const range = getCaretRangeFromPoint(touch.clientX, touch.clientY);

            if (range && contentEl.contains(range.startContainer)) {
                isDraggingRef.current = true;
                startRangeRef.current = range;

                window.getSelection()?.removeAllRanges();
                setShowBottomBar(false);
                setSelectedText('');

                e.preventDefault();
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDraggingRef.current || !startRangeRef.current) return;

            const touch = e.touches[0];
            const endRange = getCaretRangeFromPoint(touch.clientX, touch.clientY);

            if (endRange && contentEl.contains(endRange.startContainer)) {
                const selection = window.getSelection();
                if (!selection) return;

                const newRange = document.createRange();
                const startNode = startRangeRef.current.startContainer;
                const startOffset = startRangeRef.current.startOffset;
                const endNode = endRange.startContainer;
                const endOffset = endRange.startOffset;

                try {
                    const position = startNode.compareDocumentPosition(endNode);

                    if (position & Node.DOCUMENT_POSITION_FOLLOWING ||
                        (startNode === endNode && startOffset <= endOffset)) {
                        newRange.setStart(startNode, startOffset);
                        newRange.setEnd(endNode, endOffset);
                    } else {
                        newRange.setStart(endNode, endOffset);
                        newRange.setEnd(startNode, startOffset);
                    }

                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } catch {
                    // Ignore invalid ranges
                }
            }

            // Auto-scroll when near edges
            const rect = contentEl.getBoundingClientRect();
            const touchY = touch.clientY;
            const edgeThreshold = 50;

            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current);
                scrollIntervalRef.current = null;
            }

            if (touchY < rect.top + edgeThreshold) {
                scrollIntervalRef.current = setInterval(() => {
                    contentEl.scrollTop -= 8;
                }, 16);
            } else if (touchY > rect.bottom - edgeThreshold) {
                scrollIntervalRef.current = setInterval(() => {
                    contentEl.scrollTop += 8;
                }, 16);
            }

            e.preventDefault();
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current);
                scrollIntervalRef.current = null;
            }

            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            startRangeRef.current = null;

            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                const text = selection.toString().trim();
                if (text.length > 0) {
                    setSelectedText(text);
                    setShowBottomBar(true);
                }
            }
        };

        contentEl.addEventListener('touchstart', handleTouchStart, { passive: false });
        contentEl.addEventListener('touchmove', handleTouchMove, { passive: false });
        contentEl.addEventListener('touchend', handleTouchEnd);

        return () => {
            contentEl.removeEventListener('touchstart', handleTouchStart);
            contentEl.removeEventListener('touchmove', handleTouchMove);
            contentEl.removeEventListener('touchend', handleTouchEnd);
            if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
        };
    }, [isAiHighlightEnabled]);

    // ── Desktop mouse selection ──
    useEffect(() => {
        if (!isAiHighlightEnabled) {
            setShowBottomBar(false);
            setSelectedText('');
            return;
        }

        const onMouseUp = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) return;
            if (!contentRef.current?.contains(selection.anchorNode)) return;

            const text = selection.toString().trim();
            if (text.length > 0) {
                setSelectedText(text);
                setShowBottomBar(true);
            }
        };

        document.addEventListener('mouseup', onMouseUp);
        return () => document.removeEventListener('mouseup', onMouseUp);
    }, [isAiHighlightEnabled]);

    const handleAction = (action: 'highlight' | 'define' | 'explain') => {
        if (action === 'explain' || action === 'define') {
            setCurrentAiAction(action);
            setIsAiSheetOpen(true);
            setShowBottomBar(false);
            window.getSelection()?.removeAllRanges();
            return;
        }

        window.getSelection()?.removeAllRanges();
        setShowBottomBar(false);
        setSelectedText('');
    };

    const dismissBottomBar = () => {
        window.getSelection()?.removeAllRanges();
        setShowBottomBar(false);
        setSelectedText('');
    };

    return (
        <div
            data-testid="skill-module-reader"
            className="h-full flex flex-col bg-white overflow-hidden relative"
        >
            {/* Header */}
            <div className="flex-shrink-0 bg-white z-10 sticky top-0 relative">
                <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                    <button
                        onClick={() => onNavigate(AppView.SKILL_MODULE_LIST)}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition-all active:scale-95 -ml-2"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 px-4">
                        <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Skill {skillNumber}</h3>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight line-clamp-1 font-serif">{skillTitle}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const next = !isAiHighlightEnabled;
                                setIsAiHighlightEnabled(next);
                                if (!next) {
                                    setShowBottomBar(false);
                                    setSelectedText('');
                                    window.getSelection()?.removeAllRanges();
                                }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isAiHighlightEnabled
                                ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <Sparkles className={`w-3.5 h-3.5 ${isAiHighlightEnabled ? 'text-blue-500 fill-blue-500/20' : ''}`} />
                            <span>AI Select</span>
                        </button>
                    </div>
                </div>

                {/* Progress Line */}
                <div className="w-full h-[2px] bg-slate-100 flex absolute bottom-0">
                    <div className="h-full bg-blue-600 w-1/3 rounded-r-full" />
                </div>
            </div>

            {/* AI Select Mode Banner */}
            {isAiHighlightEnabled && (
                <div className="bg-blue-50 border-b border-blue-100 px-5 py-2 flex items-center gap-2 text-xs text-blue-700 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>Drag across text to select, then choose an action</span>
                </div>
            )}

            {/* Content (Book-like Typography) */}
            <div
                ref={contentRef}
                className={`flex-1 overflow-y-auto px-6 pt-8 pb-32 custom-scrollbar text-slate-800 text-[17px] leading-[1.8] font-serif transition-colors duration-300 ${isAiHighlightEnabled
                    ? 'bg-blue-50/30 selection:bg-blue-200 selection:text-blue-900'
                    : 'selection:bg-transparent selection:text-inherit'
                    }`}
                style={{
                    WebkitUserSelect: isAiHighlightEnabled ? 'text' : 'none',
                    userSelect: isAiHighlightEnabled ? 'text' : 'none',
                    WebkitTouchCallout: 'none',
                    touchAction: isAiHighlightEnabled ? 'none' : 'auto',
                } as React.CSSProperties}
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-500 text-sm">Loading content...</p>
                    </div>
                ) : !post ? (
                    <div className="text-center py-20 text-slate-500 font-sans">
                        <BookA className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Content for {skillTitle} is coming soon.</p>
                    </div>
                ) : (
                    <>
                        <MarkdownPreview content={post.content} highlightPhrase={post.highlightPhrase} />

                        {/* Interactive Example */}
                        {post.quizData && (
                            <>
                                <h2 className="text-xl font-bold text-slate-900 mb-4 font-sans tracking-tight mt-12">Test Your Understanding</h2>

                                <div className="bg-slate-50 border-l-4 border-blue-500 rounded-r-2xl p-6 mb-8 font-sans shadow-sm">
                                    <p className="text-lg font-medium text-slate-800 mb-5">
                                        {post.quizData.question.split('_______')[0]}
                                        <span className="inline-block w-16 border-b-2 border-slate-300 mx-1"></span>
                                        {post.quizData.question.split('_______')[1]}
                                    </p>
                                    <div className="space-y-3">
                                        {post.quizData.options.map((opt: any) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setSelectedOption(opt.id)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left
                                                    ${selectedOption === opt.id
                                                        ? opt.isCorrect
                                                            ? 'bg-green-50 border-green-200 text-green-900'
                                                            : 'bg-red-50 border-red-200 text-red-900'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                                                    }
                                                `}
                                            >
                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold
                                                    ${selectedOption === opt.id
                                                        ? opt.isCorrect
                                                            ? 'border-green-500 text-green-600'
                                                            : 'border-red-500 text-red-600'
                                                        : 'border-slate-300 text-slate-400'
                                                    }
                                                `}>
                                                    {opt.id}
                                                </div>
                                                <span className="flex-1">{opt.text}</span>
                                                {selectedOption === opt.id && opt.isCorrect && (
                                                    <Check className="w-5 h-5 text-green-500" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Explanation */}
                                {selectedOption && (
                                    <div className={`rounded-xl p-6 mb-8 font-sans ${post.quizData.options.find((o: any) => o.id === selectedOption)?.isCorrect
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-red-50 border border-red-200'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            {post.quizData.options.find((o: any) => o.id === selectedOption)?.isCorrect ? (
                                                <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                                            )}
                                            <div>
                                                <p className="font-bold text-slate-800 mb-2">
                                                    {post.quizData.options.find((o: any) => o.id === selectedOption)?.isCorrect
                                                        ? 'Correct!'
                                                        : 'Not quite right'}
                                                </p>
                                                <p className="text-slate-600">{post.quizData.explanation}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Action Bar */}
            {showBottomBar && selectedText && (
                <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-[#0F172A] text-white mx-3 mb-3 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden border border-white/10">
                        <div className="px-4 pt-3 pb-2 border-b border-white/10 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">Selected Text</p>
                                <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">"{selectedText}"</p>
                            </div>
                            <button
                                onClick={dismissBottomBar}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-colors shrink-0 mt-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center px-2 py-2 gap-1">
                            <button
                                onClick={() => handleAction('highlight')}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition-colors"
                            >
                                <Highlighter className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-semibold">Highlight</span>
                            </button>
                            <div className="w-[1px] h-8 bg-white/15" />
                            <button
                                onClick={() => handleAction('define')}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition-colors"
                            >
                                <BookA className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-semibold">Define</span>
                            </button>
                            <div className="w-[1px] h-8 bg-white/15" />
                            <button
                                onClick={() => handleAction('explain')}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition-colors text-blue-300"
                            >
                                <Sparkles className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-semibold">Explain</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Response Bottom Sheet */}
            <AiBottomSheet
                isOpen={isAiSheetOpen}
                onClose={() => setIsAiSheetOpen(false)}
                selectedText={selectedText}
                contextText={contentRef.current?.innerText || ''}
                skillContext={skillTitle}
                actionType={currentAiAction}
                onOpenChat={() => {
                    setIsAiSheetOpen(false);
                    setIsChatOverlayOpen(true);
                }}
            />

            {/* Skill AI Chat Overlay */}
            <SkillAiChatOverlay
                isOpen={isChatOverlayOpen}
                onClose={() => setIsChatOverlayOpen(false)}
                skillTitle={skillTitle}
                contextText={post?.content || ''}
            />

            {!showBottomBar && !isAiSheetOpen && !isChatOverlayOpen && (
                <div className="absolute bottom-6 right-6 z-40">
                    <button
                        onClick={() => setIsChatOverlayOpen(true)}
                        className="bg-[#0B132B] hover:bg-[#152349] text-white px-5 py-3.5 rounded-full shadow-xl shadow-blue-900/20 flex items-center gap-2.5 transition-transform active:scale-95 border border-white/10"
                    >
                        <Sparkles className="w-5 h-5 text-blue-300" />
                        <span className="font-bold text-sm font-sans mx-1">Ask AI</span>
                    </button>
                </div>
            )}
        </div>
    );
};
