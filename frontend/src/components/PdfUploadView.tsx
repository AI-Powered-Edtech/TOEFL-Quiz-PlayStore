import DOMPurify from 'dompurify';
import {
    ArrowLeft, Upload, FileText, MousePointer, Layers, Loader2, PlayCircle,
    AlertCircle, CheckCircle, Database, Search, BookOpen, RefreshCw,
    AlertTriangle, ListChecks, AlignLeft, Bot, Crosshair, Save, Sparkles,
    ScanText, MoreHorizontal, File, ChevronDown
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { TOEFL_STRUCTURE_SKILLS, TOEFL_READING_SKILLS, TOEFL_LISTENING_SKILLS } from '../data/skills';
import { smartExtractTOEFL, extractMultiSection } from '../services/extractor';
import { generateQuestionsFromContext, generateQuizFromContext, generateMultiSectionFromContext } from '../services/groq/generators';
import { loadPdfDocument, extractTextFromRange, chunkText } from '../services/pdfService';
import { questionBank } from '../services/questionBankService';
import { QuizData, AppView } from '../types';
import { showSuccess, showError } from '../utils/toast';

import { Button } from './Button';
import { Typewriter } from './Typewriter';

interface PdfUploadViewProps {
    onNavigate: (view: AppView) => void;
    onQuizReady: (data: QuizData[]) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// --- Simple Rate Limiter ---
const RATE_LIMIT_MS = 60000;
const MAX_REQUESTS = 3; // Lower requests per minute to stay under 6000 TPM limit
let requestCount = 0;
let resetTime = Date.now() + RATE_LIMIT_MS;

const checkRateLimit = async () => {
    if (Date.now() > resetTime) {
        requestCount = 0;
        resetTime = Date.now() + RATE_LIMIT_MS;
    }
    if (requestCount >= MAX_REQUESTS) {
        const waitTime = Math.max(0, resetTime - Date.now());
        console.warn(`[Rate Limiter] Pausing for ${waitTime / 1000}s to reset limit...`);
        await new Promise(r => setTimeout(r, waitTime));
        requestCount = 0;
        resetTime = Date.now() + RATE_LIMIT_MS;
    }
    requestCount++;
};

export const PdfUploadView: React.FC<PdfUploadViewProps> = ({ onNavigate, onQuizReady }) => {
    // Steps: 1. Upload -> 2. Setup (Range) -> 3. Analysis (Processing) -> 4. Configure (Selection) -> 5. Ready
    const [step, setStep] = useState<'upload' | 'setup' | 'processing' | 'configure' | 'ready'>('upload');

    // PDF State
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null); // PDFDocumentProxy
    const [totalPages, setTotalPages] = useState(0);
    const [pageRange, setPageRange] = useState<{ start: number, end: number }>({ start: 1, end: 1 });
    const [previewText, setPreviewText] = useState<string>('');

    // Content State
    const [extractedText, setExtractedText] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]);
    const [selectedText, setSelectedText] = useState<string>('');

    // Process State
    const [isProcessing, setIsProcessing] = useState(false); // For extraction/preview
    const [isGenerating, setIsGenerating] = useState(false); // For AI generation
    const [generatedQuestions, setGeneratedQuestions] = useState<QuizData[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // NEW: Generation Modes (Digitize, Auto, Manual)
    const [genMode, setGenMode] = useState<'digitize' | 'auto' | 'manual'>('digitize');
    const [manualSection, setManualSection] = useState<'structure' | 'written' | 'reading' | 'listening'>('structure');
    const [manualSkillId, setManualSkillId] = useState<number>(1);
    const [useCompound, setUseCompound] = useState<boolean>(true); // Use AI Agent for better accuracy

    const [generationProgress, setGenerationProgress] = useState<{ current: number, total: number, questions: number } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `> ${msg}`]);
    };

    // 1. HANDLE FILE UPLOAD & METADATA LOAD
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Enforce file size limit
        if (file.size > MAX_FILE_SIZE) {
            showError('File size exceeds 20MB limit. Please upload a smaller PDF.');
            return;
        }

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showError('Invalid file format. Please upload a valid PDF document.');
            return;
        }

        setPdfFile(file);
        setIsProcessing(true);

        try {
            const doc = await loadPdfDocument(file);
            setPdfDoc(doc);
            setTotalPages(doc.numPages);

            // Default range: Page 1 to min(5, total)
            setPageRange({ start: 1, end: Math.min(doc.numPages, 5) });

            setStep('setup');
        } catch (error: any) {
            console.error(error);
            let errorMsg = error.message || String(error);
            if (errorMsg.includes('blob') || errorMsg.includes('worker') || errorMsg.includes('denied')) {
                errorMsg = "Browser Security prevented PDF parsing. Try opening the app in a new tab or use a simpler PDF.";
            }
            showError(`Error loading PDF: ${errorMsg}`);
            setStep('upload');
        } finally {
            setIsProcessing(false);
        }
    };

    // 2. HANDLE RANGE PREVIEW
    const handlePreviewText = async () => {
        if (!pdfDoc) return;

        // Validate
        if (pageRange.start < 1 || pageRange.end > totalPages || pageRange.start > pageRange.end) {
            showError('Invalid page range. Please check your start and end pages.');
            return;
        }

        setIsProcessing(true);
        setPreviewText('Loading preview...');
        try {
            // Extract ONLY the specified range
            const text = await extractTextFromRange(pdfDoc, pageRange);

            // Show snippet
            const snippet = text.substring(0, 300).replace(/\n/g, ' ') + "...";
            setPreviewText(snippet);
        } catch (e) {
            console.error(e);
            showError('Failed to preview text. The PDF may be image-only or corrupted.');
            setPreviewText('');
        } finally {
            setIsProcessing(false);
        }
    };

    // 3. HANDLE FULL EXTRACTION & MOVE TO PROCESSING
    const handleConfirmRange = async () => {
        if (!pdfDoc) return;

        setStep('processing');
        setLogs([]);
        addLog(`Targeting Pages: ${pageRange.start} to ${pageRange.end}`);

        try {
            const text = await extractTextFromRange(pdfDoc, pageRange, (current, total) => {
                // Determine actual page number being processed
                addLog(`Scanning Page ${current}...`);
            });

            const cleanText = text.replace(/\s+/g, ' ').trim();
            const sanitizedText = DOMPurify.sanitize(cleanText);
            setExtractedText(sanitizedText);

            addLog(`Extraction Complete. ${cleanText.split(' ').length} words identified.`);
            addLog(`Ready for analysis.`);

            setTimeout(() => setStep('configure'), 2000); // 2s delay to show logs

        } catch (e) {
            console.error(e);
            addLog(`CRITICAL ERROR: Failed to extract text.`);
            setTimeout(() => setStep('setup'), 2000);
        }
    };

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 10) {
            setSelectedText(selection.toString());
        }
    };

    // Helper to clean questions (fix grading & display) with quality validation
    const cleanQuestions = (rawQuestions: any[]): QuizData[] => {
        return rawQuestions.map(q => {
            // 1. Clean Answer Key: "(B) Value" -> "B"
            let cleanAnswer = "A";
            const rawAns = (q.correct_response && q.correct_response[0]) || q.predicted_answer || "";
            const match = rawAns.match(/\b([A-D])\b/) || rawAns.match(/([A-D])/);
            if (match) {
                cleanAnswer = match[1] || match[0];
            }

            // 2. Clean Options: "(A) Text" -> "Text"
            let cleanChoices = (q.choices || q.options || []).map((opt: string) =>
                opt.replace(/^\([A-D]\)\s*/, "").replace(/^[A-D]\.\s*/, "").trim()
            );

            // 3. Fix duplicate choices instead of dropping later
            const seenChoices = new Set<string>();
            cleanChoices = cleanChoices.map((choice: string) => {
                let cTime = choice;
                let suffix = 2;
                while (seenChoices.has(cTime.toLowerCase()) && cTime !== "") {
                    cTime = `${choice} (Option ${suffix++})`;
                }
                seenChoices.add(cTime.toLowerCase());
                return cTime;
            });

            // 4. Auto-fix missing blanks or tags
            let cleanPrompt = q.prompt || '';
            const isStructure = q.section === 'structure' || q.interaction === 'fill_blank';
            const isWritten = q.section === 'written' || q.interaction === 'identify_error';

            if (isWritten && !cleanPrompt.includes('{A}')) {
                // Try to auto-fix (A) -> {A}
                if (cleanPrompt.includes('(A)')) {
                    cleanPrompt = cleanPrompt.replace(/\(A\)/g, '{A}').replace(/\(B\)/g, '{B}').replace(/\(C\)/g, '{C}').replace(/\(D\)/g, '{D}');
                } else if (cleanPrompt.match(/\bA[\.\)]/)) {
                    cleanPrompt = cleanPrompt.replace(/\bA[\.\)]/g, '{A}').replace(/\bB[\.\)]/g, '{B}').replace(/\bC[\.\)]/g, '{C}').replace(/\bD[\.\)]/g, '{D}');
                }
            }

            if (isStructure && !cleanPrompt.includes('___') && !cleanPrompt.includes('____')) {
                // Append blank to the end if missing
                cleanPrompt = `${cleanPrompt} _____`;
            }

            return {
                ...q,
                prompt: cleanPrompt,
                choices: cleanChoices.length === 4 ? cleanChoices : (q.choices || []),
                correct_response: [cleanAnswer],
                metadata: {
                    ...q.metadata,
                    explanation: q.metadata?.explanation || q.explanation || "AI Explanation Unavailable"
                }
            };
        }).filter(q => {
            // 5. Post-clean validation - drop malformed questions
            const prompt = q.prompt || '';
            const choices = q.choices || [];

            // Check for 4 unique choices
            const uniqueChoices = new Set(choices.map((c: string) => c.toLowerCase().trim()));
            if (uniqueChoices.size < 4) {
                console.warn(`[cleanQuestions] ❌ DROPPED: Only ${uniqueChoices.size} unique choices in:`, prompt.substring(0, 50));
                return false;
            }

            // Check structure blanks
            if ((q.section === 'structure' || q.interaction === 'fill_blank') &&
                !prompt.includes('___') && !prompt.includes('____')) {
                console.warn(`[cleanQuestions] ❌ DROPPED: Structure missing blank in:`, prompt.substring(0, 50));
                return false;
            }

            // Check written tags
            if ((q.section === 'written' || q.interaction === 'identify_error') &&
                !prompt.includes('{A}')) {
                console.warn(`[cleanQuestions] ❌ DROPPED: Written missing {A} tag in:`, prompt.substring(0, 50));
                return false;
            }

            return true;
        });
    };

    // Retry helper with exponential backoff
    const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, label = 'Operation'): Promise<T> => {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                return await fn();
            } catch (err: any) {
                if (attempt === retries - 1) throw err;

                let delay = 1000 * Math.pow(2, attempt);

                // Parse 429 rate limit wait time if available ("wait 60s" or "in 5.3s")
                if (err.message && (err.message.includes('429') || err.message.includes('rate limit') || err.message.includes('Too Many Requests'))) {
                    const waitMatch = err.message.match(/wait (\d+)s/i) || err.message.match(/in (\d+(?:\.\d+)?)s/i);
                    if (waitMatch) {
                        const waitSecs = parseFloat(waitMatch[1]);
                        // Add an extra 2 seconds buffer to the requested wait time
                        delay = Math.max(delay, (waitSecs + 2) * 1000);
                        addLog(`⏳ Rate limit hit for ${label}.Waiting ${Math.ceil(delay / 1000)}s before retry...`);
                    } else {
                        addLog(`⚠️ ${label} failed(Rate Limit), retrying in ${delay / 1000}s (${attempt + 1}/${retries})...`);
                    }
                } else {
                    addLog(`⚠️ ${label} failed, retrying in ${delay / 1000} s(${attempt + 1}/${retries})...`);
                }

                await new Promise(r => setTimeout(r, delay));
            }
        }
        throw new Error(`${label} failed after ${retries} retries`);
    };

    const handleGenerate = async () => {
        if (!extractedText) return;
        setIsGenerating(true);

        try {
            let questions: QuizData[] = [];

            // Use bulk processing (chunking) for all modes
            const chunks = chunkText(extractedText, 800);
            setGenerationProgress({ current: 0, total: chunks.length, questions: 0 });

            for (let i = 0; i < chunks.length; i++) {
                try {
                    await checkRateLimit();
                    let batch: QuizData[] = [];
                    const chunk = chunks[i];

                    if (genMode === 'digitize') {
                        // DIGITIZE: Extract existing questions
                        addLog(`📄 Processing chunk ${i + 1}/${chunks.length} (Digitize)...`);
                        const multiData = await withRetry(
                            () => extractMultiSection(chunk, useCompound),
                            3,
                            `Chunk ${i + 1} Digitize`
                        );

                        if (multiData && !multiData.extraction_failed && multiData.total_extracted > 0) {
                            // Fallback skill IDs if AI doesn't provide one
                            const fallbackSkillId: Record<string, number> = { structure: 1, written: 20, reading: 101, listening: 201 };
                            const transformBulkSection = (segments: any[], sectionType: string) =>
                                segments.flatMap(segment =>
                                    segment.questions.map((q: any) => ({
                                        // Use AI-detected skill_id, fallback to section default
                                        skill_id: q.skill_id || fallbackSkillId[sectionType] || 1,
                                        section: sectionType,
                                        skill_type: sectionType,
                                        interaction: sectionType === 'written' ? 'identify_error' : 'multiple_choice',
                                        stimulus: segment.passage ? { text: segment.passage } : undefined,
                                        prompt: q.prompt,
                                        choices: q.options,
                                        correct_response: [q.predicted_answer || 'A'],
                                        cefr_target: 'B1',
                                        difficulty_score: 50,
                                        metadata: {
                                            explanation: q.explanation || "Extracted from PDF",
                                            source: 'ai' as const,
                                            extraction_confidence: multiData.extraction_confidence,
                                            ai_skill_id: q.skill_id
                                        }
                                    }))
                                );

                            batch = [
                                ...transformBulkSection(multiData.sections.structure, 'structure'),
                                ...transformBulkSection(multiData.sections.written, 'written'),
                                ...transformBulkSection(multiData.sections.reading, 'reading'),
                                ...transformBulkSection(multiData.sections.listening, 'listening')
                            ];
                            addLog(`✅ Chunk ${i + 1}: ${batch.length} extracted`);
                        } else {
                            addLog(`⚠️ Chunk ${i + 1}: No questions extracted`);
                        }

                    } else if (genMode === 'auto') {
                        // AUTO: Generate Balanced Mix
                        addLog(`🚀 Chunk ${i + 1}: Generating multi-section quiz...`);
                        const multiResult = await withRetry(
                            () => generateMultiSectionFromContext(chunk, 2),
                            3,
                            `Chunk ${i + 1} Auto`
                        );

                        if (multiResult.total > 0) {
                            batch = [
                                ...multiResult.structure,
                                ...multiResult.written,
                                ...multiResult.reading,
                                ...multiResult.listening
                            ];
                            addLog(`✅ Chunk ${i + 1}: ${batch.length} generated (Balanced: S:${multiResult.structure.length} W:${multiResult.written.length} R:${multiResult.reading.length} L:${multiResult.listening.length})`);
                        } else {
                            addLog(`⚠️ Chunk ${i + 1}: Auto-generation yield low results, attempting fallback...`);
                            // Fallback to structure generation if multi fails
                            const fallback = await generateQuestionsFromContext(chunk, 'AUTO', 5, 'structure');
                            batch = fallback;
                        }

                    } else {
                        // MANUAL: Targeted Generation
                        addLog(`🎯 Chunk ${i + 1}: Generating ${manualSection.toUpperCase()} (Skill ${manualSkillId})...`);
                        batch = await withRetry(
                            () => generateQuestionsFromContext(
                                chunk,
                                manualSkillId,
                                3, // 3 questions per chunk to stay within limits when processing multiple chunks
                                manualSection as any
                            ),
                            3,
                            `Chunk ${i + 1} Manual`
                        );
                        addLog(`✅ Chunk ${i + 1}: ${batch.length} generated`);
                    }

                    questions = [...questions, ...batch];
                    setGenerationProgress({
                        current: i + 1,
                        total: chunks.length,
                        questions: questions.length
                    });

                } catch (err) {
                    console.error(`Error processing chunk ${i}:`, err);
                    addLog(`❌ Chunk ${i + 1} failed after retries: ${err}`);
                }
            }

            if (questions.length === 0) {
                throw new Error("Could not generate any questions.");
            }

            // FINAL CLEAN PASS: Ensure all paths (Smart or Fallback) are cleaned
            const finalCleanedQuestions = cleanQuestions(questions);

            setGeneratedQuestions(finalCleanedQuestions);
            setStep('ready');

        } catch (error: any) {
            console.error(error);
            showError(error.message || 'AI Generation failed. Please try again.');
            setGenerationProgress(null);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveToBank = async () => {
        setIsSaving(true);
        try {
            const result = await questionBank.importQuestionsToBank(generatedQuestions);
            showSuccess(`✅ Saved ${result.added} questions to Personal Bank!`);
            setStep('setup'); // Reset to setup to allow more generation
            setGeneratedQuestions([]);
        } catch (e) {
            showError("Failed to save questions.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndPlay = async () => {
        setIsSaving(true);
        try {
            await questionBank.importQuestionsToBank(generatedQuestions);
            showSuccess(`🎮 Starting quiz with ${generatedQuestions.length} questions!`);
            // Navigate directly
            onQuizReady(generatedQuestions);
        } catch (e) {
            showError("Failed to save questions.");
        } finally {
            setIsSaving(false);
        }
    };

    // -- HELPER: Get Skills for Dropdown --
    const getActiveSkills = () => {
        if (manualSection === 'structure') {
            // Skills 1-19 are Structure
            return TOEFL_STRUCTURE_SKILLS.filter(s => parseInt(s.id.slice(1)) <= 19);
        }
        if (manualSection === 'written') {
            // Skills 20-60 are Written Expression
            return TOEFL_STRUCTURE_SKILLS.filter(s => parseInt(s.id.slice(1)) >= 20);
        }
        if (manualSection === 'reading') return TOEFL_READING_SKILLS;
        if (manualSection === 'listening') return TOEFL_LISTENING_SKILLS;
        return [];
    };

    // -- RENDERERS --

    const renderHeader = () => (
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <button onClick={() => onNavigate(AppView.DASHBOARD)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h1 className="font-bold text-slate-800 text-lg">
                    {step === 'upload' && "Create Quiz"}
                    {step === 'setup' && "Setup Range"}
                    {step === 'processing' && "Processing PDF"}
                    {step === 'configure' && "Configure Quiz"}
                    {step === 'ready' && "Quiz Ready"}
                </h1>
            </div>
            <button className="p-2 hover:bg-slate-100 rounded-full">
                <MoreHorizontal className="w-5 h-5 text-slate-400" />
            </button>
        </div>
    );

    const renderStepsIndicator = () => {
        if (step === 'ready') return null;

        const steps = [
            { id: 'upload', label: 'Upload', number: 1 },
            { id: 'setup', label: 'Select', number: 2 },
            { id: 'configure', label: 'Generate', number: 3 },
        ];

        const getCurrentStepIndex = () => {
            if (step === 'upload') return 0;
            if (step === 'setup') return 1;
            return 2;
        };

        const currentIndex = getCurrentStepIndex();

        return (
            <div className="px-6 py-4 flex items-center justify-center gap-4">
                {steps.map((s, idx) => {
                    const isActive = idx === currentIndex || (step === 'processing' && idx === 2);
                    const isPast = idx < currentIndex;

                    return (
                        <div key={s.id} className="flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors
                                 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' :
                                    isPast ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                {s.number}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-slate-300'}`}>
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderUpload = () => (
        <div className="flex flex-col items-center p-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center mb-8 max-w-sm">
                <h2 className="text-2xl font-bold text-slate-800 mb-3">Upload your Material</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                    Upload a PDF, select pages, and AI will generate custom TOEFL questions tailored to your needs.
                </p>
            </div>

            {/* Dashed Dropzone */}
            <div className="w-full max-w-sm aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-blue-200 relative flex flex-col items-center justify-center mb-10 group hover:bg-blue-50/50 transition-colors">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    aria-label="Upload PDF file for quiz generation"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 relative">
                    <FileText className="w-10 h-10 text-blue-600" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-2">Select a PDF</h3>
                <p className="text-slate-400 text-xs text-center px-8">
                    Tap here to browse your files or import from cloud
                </p>

                <div className="absolute bottom-6 flex gap-3">
                    <span className="px-3 py-1 bg-slate-200/50 rounded-full text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <File className="w-3 h-3" /> PDF Only
                    </span>
                    <span className="px-3 py-1 bg-slate-200/50 rounded-full text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Max 20MB
                    </span>
                </div>
            </div>

            {/* Supported Formats Info */}
            <div className="w-full max-w-sm bg-slate-50 rounded-2xl border border-slate-100 p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Supported Content</h3>
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        <span>TOEFL Practice Tests & Textbooks</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        <span>Academic Articles & Reading Passages</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        <span>Grammar & Vocabulary References</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSetup = () => {
        const rangeSize = pageRange.end - pageRange.start + 1;
        const isLargeRange = rangeSize > 10;

        return (
            <div className="flex flex-col items-center p-6 animate-in fade-in slide-in-from-right-4">
                {/* File Card */}
                <div className="w-full max-w-sm bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 shrink-0">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 truncate text-sm">{pdfFile?.name || "Document.pdf"}</h3>
                        <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                            <span className="bg-blue-100 px-2 py-0.5 rounded-md">{totalPages} Pages Total</span>
                            <span className="text-slate-400">{(pdfFile?.size ? (pdfFile.size / 1024 / 1024).toFixed(1) : "2.4")} MB</span>
                        </div>
                    </div>
                </div>

                {/* Range Selector */}
                <div className="w-full max-w-sm mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Page Range</h3>
                        <button
                            onClick={() => window.open(URL.createObjectURL(pdfFile!), '_blank')}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                            <Search className="w-3 h-3" /> Preview PDF
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-2 font-medium">From</label>
                            <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={pageRange.start}
                                onChange={(e) => setPageRange(prev => ({ ...prev, start: Math.max(1, Math.min(parseInt(e.target.value) || 1, totalPages)) }))}
                                className="w-full h-14 border border-slate-200 rounded-2xl text-center text-2xl font-bold text-slate-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all"
                            />
                        </div>
                        <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180 mt-6" />
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-2 font-medium">To</label>
                            <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={pageRange.end}
                                onChange={(e) => setPageRange(prev => ({ ...prev, end: Math.max(1, Math.min(parseInt(e.target.value) || 1, totalPages)) }))}
                                className="w-full h-14 border border-slate-200 rounded-2xl text-center text-2xl font-bold text-slate-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-3 font-medium">
                        Selecting {rangeSize} page{rangeSize !== 1 ? 's' : ''} for analysis
                    </p>
                </div>

                {/* Text Preview */}
                <div className="w-full max-w-sm mb-24">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Extracted Text Preview</h3>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${previewText ? 'bg-green-500' : 'bg-slate-300'}`} />
                            <span className={`text-xs font-bold ${previewText ? 'text-green-600' : 'text-slate-400'}`}>
                                {previewText ? 'Readable' : 'No Preview'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50 pointer-events-none" />

                        <h4 className="font-bold text-slate-800 text-sm mb-2">[Page {pageRange.start}]</h4>
                        <p className="text-sm text-slate-600 leading-relaxed font-serif">
                            {previewText || (
                                <span className="italic text-slate-400">
                                    Content references specific to the selected page range will appear here.
                                    Click below to verify that the text matches your material.
                                </span>
                            )}
                        </p>

                        {!previewText && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    onClick={handlePreviewText}
                                    variant="secondary"
                                    size="sm"
                                    isLoading={isProcessing}
                                    className="shadow-lg"
                                >
                                    <Search className="w-4 h-4 mr-2" /> Load Preview
                                </Button>
                            </div>
                        )}

                        {/* Always show button if empty, but positioned better */}
                        {!previewText && !isProcessing && (
                            <button
                                onClick={handlePreviewText}
                                className="w-full mt-4 bg-white border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                            >
                                Tap to Load Text Preview
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-center z-50">
                    <Button
                        onClick={handleConfirmRange}
                        isLoading={isProcessing}
                        disabled={isProcessing || pageRange.start > pageRange.end}
                        className="w-full max-w-sm h-14 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 text-lg rounded-2xl"
                    >
                        Confirm & Analyze Context <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                    </Button>
                </div>
            </div>
        );
    };

    const renderAnalysisLogs = () => (
        <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-6 animate-in fade-in zoom-in-95">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Processing PDF</h2>
                <p className="text-slate-500 text-sm mt-1">StreamQuiz AI is analyzing your document</p>
            </div>

            <div className="w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 font-mono text-xs md:text-sm relative">
                <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none" />

                {/* Terminal Header */}
                <div className="bg-slate-800/80 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-slate-700">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                        secure_parser_v2.4.exe
                    </div>
                </div>

                {/* Terminal Content */}
                <div className="p-6 text-green-400 h-80 overflow-y-auto custom-scrollbar flex flex-col gap-3 font-medium relative z-10">
                    {logs.length === 0 && (
                        <span className="animate-pulse">Initializing environment...</span>
                    )}
                    {logs.map((log, idx) => (
                        <div key={idx} className="flex gap-3">
                            <span className="text-green-600 shrink-0">➜</span>
                            <Typewriter key={idx} text={log} speed={5} showCursor={idx === logs.length - 1} />
                        </div>
                    ))}

                    {/* Fake progress bar at bottom of terminal */}
                    <div className="mt-auto pt-4 border-t border-slate-800/50">
                        <div className="text-green-500 text-xs mb-1 flex justify-between">
                            <span>[SCANNING PAGES]</span>
                            <span>{Math.min(100, logs.length * 15)}%</span>
                        </div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-300"
                                style={{ width: `${Math.min(100, logs.length * 15)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Status Card */}
            <div className="w-full mt-6 bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between border border-slate-800 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full border-2 border-green-500/30 flex items-center justify-center animate-spin-slow">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1 h-1 bg-green-400 rounded-full animate-ping" />
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">STATUS</div>
                        <div className="text-green-400 font-bold text-sm tracking-wider">ANALYZING</div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">ESTIMATED TIME</div>
                    <div className="text-white font-mono text-sm">~12s</div>
                </div>
            </div>

            <p className="text-center text-slate-400 text-xs mt-8">
                Please keep the app open while we analyze your file.
            </p>
        </div>
    );

    const renderConfigure = () => (
        <div className="flex flex-col items-center p-6 animate-in fade-in slide-in-from-right-4">
            <div className="w-full max-w-lg space-y-6">

                {/* Source Context Card */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200 bg-white">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Source Context</h3>
                        </div>
                        <button className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                            <Layers className="w-3 h-3" /> Expand
                        </button>
                    </div>
                    <div className="p-5 max-h-48 overflow-y-auto font-serif text-sm text-slate-600 leading-relaxed custom-scrollbar bg-slate-50/50">
                        {extractedText ? (
                            <p>{extractedText.substring(0, 500)}...</p>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-xs">Loading context...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Configuration Options */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1">
                    <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                        <button
                            onClick={() => setGenMode('digitize')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${genMode === 'digitize' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-600'}`}
                        >
                            Digitize
                        </button>
                        <button
                            onClick={() => setGenMode('auto')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${genMode === 'auto' ? 'bg-blue-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-600'}`}
                        >
                            Generate
                        </button>
                        <button
                            onClick={() => setGenMode('manual')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${genMode === 'manual' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-600'}`}
                        >
                            Manual
                        </button>
                    </div>

                    <div className="px-5 pb-5 space-y-5">
                        {/* AI Agent Toggle */}
                        <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Use AI Agent</h4>
                                    <p className="text-[10px] text-slate-500">Auto-detect difficulty & nuances</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={useCompound} onChange={(e) => setUseCompound(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Section & Skill Selectors (Visible for Manual Only) */}
                        {genMode === 'manual' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Section</label>
                                    <div className="relative">
                                        <select
                                            value={manualSection}
                                            onChange={(e) => {
                                                const val = e.target.value as any;
                                                setManualSection(val);
                                                // Reset to valid skill ID for the section
                                                if (val === 'written') setManualSkillId(20);
                                                else if (val === 'reading') setManualSkillId(101); // Assuming 101 start for reading
                                                else if (val === 'listening') setManualSkillId(201); // Assuming 201 start for listening
                                                else setManualSkillId(1);
                                            }}
                                            className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="structure">Structure (Grammar)</option>
                                            <option value="written">Written Expression (Error Rec.)</option>
                                            <option value="reading">Reading Comprehension</option>
                                            <option value="listening">Listening Comprehension</option>
                                        </select>
                                        <Layers className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Skill</label>
                                    <div className="relative">
                                        <select
                                            value={manualSkillId}
                                            onChange={(e) => setManualSkillId(Number(e.target.value))}
                                            className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            {getActiveSkills().map(skill => (
                                                <option key={skill.id} value={parseInt(skill.id.replace(/\D/g, ''), 10)}>
                                                    {skill.name.split(':')[1]?.trim() || skill.name}
                                                </option>
                                            ))}
                                        </select>
                                        <BookOpen className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {genMode === 'digitize' && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3 animate-in fade-in">
                                <ScanText className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Digitize Existing Questions</h4>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        We will scan your PDF for existing TOEFL/IELTS style questions and convert them into an interactive quiz.
                                        Perfect for practice tests and textbooks.
                                    </p>
                                </div>
                            </div>
                        )}

                        {genMode === 'auto' && (
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-start gap-3 animate-in fade-in">
                                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Generate Balanced Quiz</h4>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        AI will analyze the content and generate a balanced mix of questions across all 4 sections:
                                        <span className="font-semibold text-purple-700"> Structure, Written Expression, Reading, and Listening.</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Generate Button */}
                <div className="pt-4">
                    <Button
                        onClick={handleGenerate}
                        isLoading={isGenerating}
                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 text-lg rounded-full"
                    >
                        {isGenerating ? (
                            <span className="flex items-center">
                                Processing {generationProgress ? `Batch ${generationProgress.current}/${generationProgress.total}` : '...'}
                            </span>
                        ) : (
                            <>Generate Quiz <PlayCircle className="w-5 h-5 ml-2 fill-white/20" /></>
                        )}
                    </Button>
                </div>

            </div>
        </div>
    );

    const renderPreview = () => (
        <div className="flex flex-col h-full items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header / Navigation replacement for this step */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
                <button onClick={() => setStep('configure')} className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div className="flex gap-2">
                    <div className="w-8 h-1 bg-slate-200 rounded-full" />
                    <div className="w-8 h-1 bg-slate-200 rounded-full" />
                    <div className="w-8 h-1 bg-slate-200 rounded-full" />
                    <div className="w-8 h-1 bg-blue-600 rounded-full" />
                </div>
                <div className="w-9" />
            </div>

            <div className="max-w-sm w-full text-center mt-12">
                <div className="w-32 h-32 mx-auto mb-8 relative">
                    <div className="absolute inset-0 bg-green-100/50 rounded-full animate-ping-slow" />
                    <div className="absolute inset-4 bg-green-100 rounded-full flex items-center justify-center shadow-inner">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz Ready!</h2>
                <p className="text-slate-500 mb-10 text-lg">
                    AI has successfully generated <br />
                    <span className="text-blue-600 font-bold">{generatedQuestions.length} questions</span> from your PDF.
                </p>

                {/* Quiz Info Card */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 text-left mb-6">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 shrink-0">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 truncate text-sm">{pdfFile?.name || "Generated Quiz"}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>15 mins</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span>Medium Difficulty</span>
                        </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-blue-600">
                        <Layers className="w-4 h-4" /> {/* Edit Icon replacement */}
                    </button>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">Reading Comprehension</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">Vocabulary</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">+3 more</span>
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={handleSaveAndPlay}
                        isLoading={isSaving}
                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 text-lg rounded-full font-bold"
                    >
                        <PlayCircle className="w-5 h-5 mr-2 fill-white/20" />
                        Save & Play Now
                    </Button>

                    <Button
                        onClick={handleSaveToBank}
                        isLoading={isSaving}
                        variant="outline"
                        className="w-full h-14 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full font-bold"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        Save to Library
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full bg-white flex flex-col font-sans">
            {renderHeader()}
            {renderStepsIndicator()}

            <div className="flex-1 overflow-y-auto pb-safe">
                {step === 'upload' && renderUpload()}
                {step === 'setup' && renderSetup()}
                {step === 'processing' && renderAnalysisLogs()}
                {step === 'configure' && renderConfigure()}
                {step === 'ready' && renderPreview()}
            </div>
        </div>
    );
};
