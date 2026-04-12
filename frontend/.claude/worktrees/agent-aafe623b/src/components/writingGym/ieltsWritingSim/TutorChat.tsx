import React from 'react';
import { Bot, Send } from 'lucide-react';
import { Button } from '../../Button';
import { ChatMessage } from '../../../types';

interface TutorChatProps {
    chatHistory: ChatMessage[];
    chatInput: string;
    isChatLoading: boolean;
    chatEndRef: React.RefObject<HTMLDivElement | null>;
    setChatInput: (input: string) => void;
    handleChatSubmit: (e?: React.FormEvent) => void;
}

export const TutorChat: React.FC<TutorChatProps> = ({
    chatHistory,
    chatInput,
    isChatLoading,
    chatEndRef,
    setChatInput,
    handleChatSubmit
}) => {
    return (
        <div className="flex-1 flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-indigo-50 dark:bg-slate-800 border-b border-indigo-100 dark:border-slate-700 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-indigo-700" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">AI Examiner</h3>
                    <p className="text-xs text-slate-500">Ask about your score or how to improve</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-950">
                {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-none'
                            }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            <span className="text-[10px] opacity-70 mt-1 block text-right">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                {isChatLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a question about your essay..."
                        aria-label="Chat with AI examiner"
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isChatLoading}
                    />
                    <Button type="submit" disabled={!chatInput.trim() || isChatLoading} className="shadow-lg shadow-indigo-200 dark:shadow-none">
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
};
