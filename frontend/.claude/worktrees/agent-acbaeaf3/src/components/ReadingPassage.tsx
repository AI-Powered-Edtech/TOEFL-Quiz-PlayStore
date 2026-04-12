import { Type } from 'lucide-react';
import React from 'react';

interface ReadingPassageProps {
    text: string;
    textSize: 'text-base' | 'text-lg' | 'text-xl';
    referencedText?: string;
    onTextSizeChange: () => void;
}

export const ReadingPassage: React.FC<ReadingPassageProps> = ({
    text,
    textSize,
    referencedText,
    onTextSizeChange
}) => {

    const processText = (originalText: string, highlight?: string) => {
        // CLEANING: Remove PDF artifacts but NOT line markers we'll add ourselves
        const cleanedText = originalText
            // Remove "Line X" markers that may have been extracted from PDF (we'll add our own)
            .replace(/Line\s*\d+/gi, '')
            // Remove standalone numbers surrounded by spaces (page numbers, etc)
            .replace(/ [0-9]{2,} /g, ' ')
            // Remove question numbers at start of lines
            .replace(/^\s*\d{1,2}\./gm, '')
            // Remove answer options
            .replace(/^\s*[A-D][.)]\s*.*/gm, '')
            .replace(/^\s*\([A-D]\)\s*.*/gm, '')
            // Remove "correct answer" lines
            .replace(/correct\s*answer\s*[:=]\s*[A-D]?.*$/gim, '')
            .replace(/explanation\s*[:=].*$/gim, '')
            .replace(/passage\s*analysis\s*strategy\s*[:=]?.*/gim, '')
            .replace(/paragraph\s*\d+\s*\(.*?\)\s*[:=]?.*/gim, '')
            // Remove question stems that may have leaked into passage
            .replace(/what\s+is\s+the\s+(main|primary|author's)\s+(idea|purpose|topic).*/gi, '')
            .replace(/according\s+to\s+the\s+passage.*/gi, '')
            .replace(/the\s+word\s+"?\w+"?\s+(in\s+paragraph|is\s+closest).*/gi, '')
            // Handle escaped newlines from JSON
            .replace(/\\n\\n/g, '\n\n')
            .replace(/\\n/g, '\n')
            // Clean up whitespace
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // Split into paragraphs
        let paragraphs = cleanedText
            .replace(/\r/g, '')
            .split(/\n\s*\n/)
            .filter(p => p.trim().length > 0);

        // FALLBACK: If only 1 paragraph and text is long, split by sentences
        if (paragraphs.length === 1 && cleanedText.length > 300) {
            // Split into sentences
            const sentences = cleanedText.split(/(?<=[.!?])\s+/);

            // Group sentences into paragraphs (3-4 sentences each)
            const SENTENCES_PER_PARAGRAPH = 4;
            paragraphs = [];
            for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
                const chunk = sentences.slice(i, i + SENTENCES_PER_PARAGRAPH).join(' ');
                if (chunk.trim().length > 0) {
                    paragraphs.push(chunk.trim());
                }
            }
        }

        // Calculate approximate words per visual line
        const WORDS_PER_LINE = 10;
        let runningLineCount = 0;

        return paragraphs.map((para, paraIdx) => {
            // Clean paragraph text
            const cleanPara = para.replace(/\s+/g, ' ').trim();
            const words = cleanPara.split(/\s+/);
            const linesInParagraph = Math.max(1, Math.ceil(words.length / WORDS_PER_LINE));
            const startLine = runningLineCount + 1;
            runningLineCount += linesInParagraph;

            // Build line markers for this paragraph (every 5 lines)
            const lineMarkers: number[] = [];
            for (let line = startLine; line <= runningLineCount; line++) {
                if (line % 5 === 0) {
                    lineMarkers.push(line);
                }
            }

            // Apply highlighting if needed
            let content: React.ReactNode = cleanPara;
            if (highlight && highlight.length > 2 && cleanPara.includes(highlight)) {
                const parts = cleanPara.split(highlight);
                content = (
                    <span>
                        {parts.map((part, i) => (
                            <React.Fragment key={i}>
                                {part}
                                {i < parts.length - 1 && (
                                    <span className="bg-blue-50 border-b-2 border-blue-600 font-semibold px-0.5 rounded-sm">
                                        {highlight}
                                    </span>
                                )}
                            </React.Fragment>
                        ))}
                    </span>
                );
            }

            // Calculate line positions
            const lineHeight = textSize === 'text-xl' ? 2.0 : textSize === 'text-lg' ? 1.85 : 1.7;

            return (
                <div key={paraIdx} className="flex gap-4 mb-8">
                    {/* Left margin column - Line numbers */}
                    <div className="w-12 flex-shrink-0 relative hidden md:block" style={{ minHeight: `${linesInParagraph * lineHeight}rem` }}>
                        {/* Paragraph number */}
                        <div className="absolute top-0 right-2 text-blue-600 font-bold text-sm">
                            ¶{paraIdx + 1}
                        </div>

                        {/* Line markers */}
                        {lineMarkers.map(lineNum => {
                            const lineWithinPara = lineNum - startLine + 1;
                            const topOffset = (lineWithinPara - 0.5) * lineHeight;
                            return (
                                <div
                                    key={`line-${lineNum}`}
                                    className="absolute right-2 text-slate-400 text-xs font-mono"
                                    style={{ top: `${topOffset}rem` }}
                                >
                                    {lineNum}
                                </div>
                            );
                        })}
                    </div>

                    {/* Main content column */}
                    <div className="flex-1">
                        <p className="indent-8 text-justify leading-relaxed">
                            {content}
                        </p>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-3 px-4 md:px-6 bg-blue-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-600 text-sm">Passage</span>
                    <span className="text-xs text-slate-500 hidden md:inline">(Line numbers shown every 5 lines)</span>
                </div>

                {/* Text Resizer */}
                <div className="flex items-center space-x-1 bg-white rounded-md border border-slate-200 p-1">
                    <button onClick={onTextSizeChange} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Change Text Size">
                        <Type className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className={`p-4 md:p-6 overflow-y-auto flex-1 bg-white custom-scrollbar ${textSize} font-serif text-slate-800`}>
                {processText(text, referencedText)}
            </div>
        </div>
    );
};