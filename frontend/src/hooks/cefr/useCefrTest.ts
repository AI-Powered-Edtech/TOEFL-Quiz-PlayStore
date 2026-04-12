import { useState, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

import { Phase, ReadingData, ListeningData, WritingData, SpeakingData, ListeningClip } from '../../components/cefr/types';
import { READING_PROMPT, LISTENING_CLIP_SPECS, generateListeningPrompt } from '../../data/cefrPrompts';
import { callGroq, cleanJson } from '../../services/groq/client';
import { parseJsonSafely } from '../../services/groq/utils/jsonParser';
import { canAccessFeature, recordFeatureUsage } from '../../services/subscriptionService';
import { supabase } from '../../services/supabase';
import { generateAudio } from '../../services/ttsService';
import { useLocalStorage } from '../useLocalStorage';

// ─── Persistence Keys ────────────────────────────────────────────────────────
const CEFR_PHASE_KEY = 'cefr_phase';
const CEFR_READING_KEY = 'cefr_reading_data';
const CEFR_LISTENING_KEY = 'cefr_listening_data';
const CEFR_WRITING_KEY = 'cefr_writing_data';
const CEFR_SPEAKING_KEY = 'cefr_speaking_data';
const CEFR_READING_ANS_KEY = 'cefr_reading_ans';
const CEFR_LISTENING_ANS_KEY = 'cefr_listening_ans';
const CEFR_WRITING_ANS_KEY = 'cefr_writing_ans';
const CEFR_SPEAKING_TRANS_KEY = 'cefr_speaking_trans';
const CEFR_CURRENT_PART_KEY = 'cefr_current_part';
const CEFR_FREE_MODE_KEY = 'cefr_free_mode';
const CEFR_TEST_SET_ID_KEY = 'cefr_test_set_id';

export const useCefrTest = (isPaid: boolean, startTimer: (seconds: number) => void) => {
    // ─── UI State (not persisted) ─────────────────────────────────────────────
    const [loadingMsg, setLoadingMsg] = useState('Initializing test environment...');
    const [errorMsg, setErrorMsg] = useState('');
    const [showPaywall, setShowPaywall] = useState(false);
    const [showFreeChoiceModal, setShowFreeChoiceModal] = useState(false);
    const [results, setResults] = useState<any>(null);

    // ─── Persisted State ──────────────────────────────────────────────────────
    const [phase, setPhase, clearPhase] = useLocalStorage<Phase>(CEFR_PHASE_KEY, 'intro');
    const [readingData, setReadingData, clearReadingData] = useLocalStorage<ReadingData | null>(CEFR_READING_KEY, null);
    const [listeningData, setListeningData, clearListeningData] = useLocalStorage<ListeningData | null>(CEFR_LISTENING_KEY, null);
    const [writingData, setWritingData, clearWritingData] = useLocalStorage<WritingData | null>(CEFR_WRITING_KEY, null);
    const [speakingData, setSpeakingData, clearSpeakingData] = useLocalStorage<SpeakingData | null>(CEFR_SPEAKING_KEY, null);
    const [readingAnswers, setReadingAnswers, clearReadingAnswers] = useLocalStorage<Record<string, string>>(CEFR_READING_ANS_KEY, {});
    const [listeningAnswers, setListeningAnswers, clearListeningAnswers] = useLocalStorage<Record<string, string>>(CEFR_LISTENING_ANS_KEY, {});
    const [writingAnswers, setWritingAnswers, clearWritingAnswers] = useLocalStorage<Record<string, string>>(CEFR_WRITING_ANS_KEY, {});
    const [speakingTranscripts, setPersistedSpeakingTranscripts, clearSpeakingTranscripts] = useLocalStorage<Record<string, string>>(CEFR_SPEAKING_TRANS_KEY, {});
    const [currentPart, setCurrentPart, clearCurrentPart] = useLocalStorage<number>(CEFR_CURRENT_PART_KEY, 1);
    const [freeMode, setFreeMode, clearFreeMode] = useLocalStorage<boolean>(CEFR_FREE_MODE_KEY, false);

    // testSetId is not critical for UX, but store in localStorage for consistency
    const testSetIdRef = useRef<string | null>(localStorage.getItem(CEFR_TEST_SET_ID_KEY));

    // ─── Session Cleanup ──────────────────────────────────────────────────────
    const clearSession = useCallback(() => {
        clearPhase();
        clearReadingData();
        clearListeningData();
        clearWritingData();
        clearSpeakingData();
        clearReadingAnswers();
        clearListeningAnswers();
        clearWritingAnswers();
        clearSpeakingTranscripts();
        clearCurrentPart();
        clearFreeMode();
        localStorage.removeItem(CEFR_TEST_SET_ID_KEY);
        localStorage.removeItem('cefr_timer_end_ts');
        testSetIdRef.current = null;
    }, [clearPhase, clearReadingData, clearListeningData, clearWritingData, clearSpeakingData,
        clearReadingAnswers, clearListeningAnswers, clearWritingAnswers, clearSpeakingTranscripts,
        clearCurrentPart, clearFreeMode]);

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const generateJson = async (prompt: string) => {
        try {
            const content = await callGroq([
                { role: "system", content: "You are an expert Cambridge/CEFR English test creator. Output MUST be valid JSON only. Do not wrap in markdown blocks, just raw JSON." },
                { role: "user", content: prompt }
            ], 0.7, { jsonMode: true });
            const cleaned = cleanJson(content);
            return parseJsonSafely(cleaned);
        } catch (e) {
            console.error("[CEFR] JSON Generation failed:", e);
            throw e;
        }
    };

    const safeTTS = async (text: string): Promise<string | undefined> => {
        try {
            return await generateAudio(text);
        } catch (e) {
            console.warn("[CEFR] TTS generation failed:", (e as Error).message);
            return undefined;
        }
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // ─── Cache Loading ────────────────────────────────────────────────────────
    const loadCachedTestSet = async () => {
        try {
            const { data, error } = await supabase
                .from('cefr_test_sets')
                .select('*')
                .eq('is_complete', true)
                .order('usage_count', { ascending: true })
                .limit(5) as any;

            if (error || !data || (data as any[]).length === 0) {
                // Fallback: Load default CEFR test from local storage
                return getLocalTestSet();
            }

            const set = data[Math.floor(Math.random() * (data as any[]).length)] as any;
            if (!set.reading_data || !set.listening_data || !set.writing_prompts || !set.speaking_prompts) {
                return getLocalTestSet();
            }

            try {
                await supabase
                    .from('cefr_test_sets')
                    .update({ usage_count: (set.usage_count || 0) + 1 })
                    .eq('id', set.id);
            } catch { }

            testSetIdRef.current = set.id;
            localStorage.setItem(CEFR_TEST_SET_ID_KEY, set.id);

            return {
                reading: set.reading_data as ReadingData,
                listening: set.listening_data as ListeningClip[],
                writing: set.writing_prompts as WritingData,
                speaking: set.speaking_prompts as SpeakingData,
            };
        } catch (e) {
            console.warn("[CEFR] Failed to load cached test set:", e);
            return getLocalTestSet();
        }
    };

    const getLocalTestSet = (): any => {
        // Return a basic local test set as fallback
        const localData = localStorage.getItem('local_cefr_test_set');
        if (localData) {
            return JSON.parse(localData);
        }
        
        // Return default test set
        const defaultSet: any = {
            reading: {
                passage: "The Impact of Technology on Education\n\nTechnology has revolutionized the way we learn and teach. In recent years, the integration of digital tools in classrooms has transformed traditional educational methods. Students now have access to a wealth of information at their fingertips, enabling them to explore subjects in greater depth than ever before.\n\nOne of the most significant changes has been the rise of online learning platforms. These platforms provide students with flexible learning options that can be accessed anytime, anywhere. This has been particularly beneficial for students in remote areas or those with busy schedules.\n\nHowever, the integration of technology in education also presents challenges. Teachers must adapt their teaching methods to incorporate new technologies effectively. Additionally, there are concerns about the digital divide, where students from lower-income families may not have equal access to technology.\n\nDespite these challenges, the benefits of technology in education far outweigh the drawbacks. As we continue to embrace digital innovation, we can expect to see further improvements in student outcomes and engagement.",
                questions: [
                    { id: 1, question: "What is the main topic of the passage?", options: ["Online learning", "Technology in education", "Digital divide", "Teacher training"], correct: 1 },
                    { id: 2, question: "According to the passage, what is one benefit of online learning platforms?", options: ["They are only available to rich students", "They provide flexible learning options", "They replace teachers entirely", "They require expensive equipment"], correct: 1 },
                    { id: 3, question: "What is mentioned as a challenge of technology in education?", options: ["Students learn too quickly", "Teachers refuse to use technology", "Digital divide", "Technology is too cheap"], correct: 2 },
                ]
            },
            listening: [],
            writing: [
                { id: 1, type: 'long', topic: "Describe a technological innovation that has changed education.", minWords: 150, maxWords: 300, rubric: {} }
            ],
            speaking: [
                { id: 1, type: 'Cue Card', topic: "Talk about a time you used technology for learning.", prepTime: 30, responseTime: 60 }
            ]
        };
        
        localStorage.setItem('local_cefr_test_set', JSON.stringify(defaultSet));
        return defaultSet;
    };

    const saveTestSetToDb = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !readingData || !listeningData || !writingData || !speakingData) return;

            const cleanListening = listeningData.map(({ audioId, ...rest }: any) => rest);

            try {
                const insertResult: any = await supabase
                    .from('cefr_test_sets')
                    .insert({
                        created_by: user.id,
                        reading_data: readingData,
                        listening_data: cleanListening,
                        writing_prompts: writingData,
                        speaking_prompts: speakingData,
                        is_complete: true,
                    });

                const insertData = (insertResult as any) as { data: { id: string }[] | null; error: { message: string } | null };
                const data = insertData?.data?.[0];

                if (!insertData?.error && data && data.id) {
                    testSetIdRef.current = data.id;
                    localStorage.setItem(CEFR_TEST_SET_ID_KEY, data.id);
                }
            } catch { }
        } catch (e) {
            console.warn("[CEFR] Failed to save test set to DB:", e);
        }
    };

    const saveResultsToDb = async (grades: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;
            if (!userId || !testSetIdRef.current) return;

            const insertResult = await supabase
                .from('cefr_results')
                .insert({
                    user_id: userId,
                    test_set_id: testSetIdRef.current,
                    cefr_level: grades.cefrLevel,
                    overall_score: grades.overallScore,
                    reading_score: grades.readingScore,
                    listening_score: grades.listeningScore,
                    writing_score: grades.writingScore,
                    speaking_score: grades.speakingScore,
                    feedback: grades.feedback,
                });

            const insertResultAny = insertResult as unknown as { error: { message: string } | null };
            if (insertResultAny.error) {
                console.error("[CEFR] Failed to save results to DB:", insertResultAny.error.message);
            }
        } catch (e) {
            console.error("[CEFR] Exception saving results:", e);
        }
    };

    // ─── Background Generation ────────────────────────────────────────────────
    const generateSingleClip = async (spec: typeof LISTENING_CLIP_SPECS[0]): Promise<ListeningClip | null> => {
        try {
            const prompt = generateListeningPrompt(spec);
            const clip = await generateJson(prompt);
            if (clip?.audioScript && clip?.questions?.length > 0) {
                const hasPlaceholders = clip.questions.some((q: any) =>
                    q.options?.some((o: string) => /^[A-D]$/.test(o?.trim()))
                );
                if (hasPlaceholders) {
                    const retry = await generateJson(prompt);
                    if (retry?.audioScript && retry?.questions?.length > 0) {
                        retry.id = spec.id;
                        retry.difficulty = spec.difficulty;
                        return retry as ListeningClip;
                    }
                }
                clip.id = spec.id;
                clip.difficulty = spec.difficulty;
                return clip as ListeningClip;
            }
            return null;
        } catch (e) {
            console.warn("[CEFR] Failed to generate clip:", spec.id, e);
            return null;
        }
    };

    const generateRemainingInBackground = async () => {
        // Generate all sections in parallel — each section's intro screen
        // unlocks independently as soon as its data arrives
        const isNativePlatform = Capacitor.isNativePlatform();
        const listeningPromise = (async () => {
            const clips: ListeningClip[] = [];
            for (let i = 0; i < LISTENING_CLIP_SPECS.length; i++) {
                const spec = LISTENING_CLIP_SPECS[i];
                const clip = await generateSingleClip(spec);
                if (clip) {
                    // On native, skip TTS pre-generation — speak() plays audio immediately
                    if (!isNativePlatform) {
                        clip.audioId = await safeTTS(clip.audioScript);
                    }
                    clips.push(clip);
                    setListeningData([...clips]);
                }
                if (i < LISTENING_CLIP_SPECS.length - 1) await delay(2000);
            }
        })();

        const writingPromise = generateWritingInBackground();
        const speakingPromise = generateSpeakingInBackground();

        await Promise.allSettled([listeningPromise, writingPromise, speakingPromise]);
    };

    const generateWritingInBackground = async () => {
        try {
            const prompt = `You are generating CEFR Writing test prompts. Return ONLY valid JSON.
IMPORTANT: Each value (part1, part2, part3, part4) MUST be a plain STRING — NOT an object, NOT nested.
Return EXACTLY this structure:
{
  "part1": "You received an email from a friend asking about your weekend plans. Write a reply of 80-100 words. You should: describe what you plan to do, invite your friend to join you, and suggest a time and place to meet.",
  "part2": "You recently purchased a product online that arrived damaged. Write a formal letter of complaint to the company (120-150 words). Include: a description of what you ordered, an explanation of the damage, and what action you expect them to take.",
  "part3": "Some people believe that social media has more negative effects than positive ones on society. Write a discussion essay of 200-250 words presenting both sides of the argument and giving your own opinion. Support your points with examples.",
  "part4": "Many universities now offer fully online degree programs. To what extent do you think online education can replace traditional classroom learning? Write an argumentative essay of 250-300 words discussing the advantages and disadvantages. Give your own conclusion."
}
RULES:
- part1, part2, part3, part4 must each be a SINGLE STRING value.
- Do NOT wrap them in objects like {"prompt": "..."}.
- Do NOT use any key names other than part1, part2, part3, part4.
- Generate DIFFERENT topics from the examples above.
- Make each prompt detailed with clear word count targets and specific instructions.`;
            const wData = await generateJson(prompt);
            const normalize = (v: any): string | null => {
                if (typeof v === 'string') return v;
                if (v && typeof v === 'object') return v.prompt || v.text || v.description || Object.values(v)[0] as string;
                return null;
            };
            const p1 = normalize(wData?.part1);
            const p2 = normalize(wData?.part2);
            const p3 = normalize(wData?.part3);
            const p4 = normalize(wData?.part4);

            if (p1 && p2 && p3 && p4) {
                setWritingData({ part1: p1, part2: p2, part3: p3, part4: p4 });
            }
        } catch (e) {
            console.warn("[CEFR] Writing background generation failed:", e);
        }
    };

    const generateSpeakingInBackground = async () => {
        try {
            const prompt = `You are generating CEFR Speaking test prompts. Return ONLY valid JSON.
Parts 1-2 are SHADOWING exercises: provide a short audio script that the student must listen to and repeat aloud.
Parts 3-4 are FREE RESPONSE: provide a discussion prompt the student speaks about freely.
Each part has a "prompt" field and a "type" field ("shadowing" or "free_response").
{
  "part1": { "type": "shadowing", "prompt": "The city council has announced plans to convert three downtown parking lots into green spaces. Residents have expressed mixed reactions, with some welcoming the environmental benefits while others worry about reduced parking availability. The project is expected to be completed by next spring." },
  "part2": { "type": "shadowing", "prompt": "Recent studies suggest that exposure to natural environments can significantly reduce cortisol levels and improve cognitive function. Researchers at Stanford University found that participants who walked through forested areas showed a twenty percent decrease in anxiety symptoms compared to those who walked along busy urban streets." },
  "part3": { "type": "free_response", "prompt": "Let's discuss tourism and travel. Do you think international tourism benefits local communities? What are some negative effects of mass tourism? How can governments balance tourism with environmental protection? Share your views." },
  "part4": { "type": "free_response", "prompt": "Consider the topic of cultural globalization. Some argue that globalization leads to cultural homogenization, while others believe it promotes cultural exchange. What is your perspective? Discuss the advantages and disadvantages, using specific examples to support your argument." }
}
Rules:
- part1 & part2 (shadowing): Write a clear, natural-sounding passage of 40-60 words at B1-B2 level. Use varied vocabulary and complex sentences worth repeating.
- part3 & part4 (free_response): Write detailed prompts with sub-questions to guide 1-2 minutes of speaking.
- ALL parts must have "type" and "prompt" fields.`;
            const sData = await generateJson(prompt);
            const parts = ['part1', 'part2', 'part3', 'part4'] as const;
            if (!parts.every(p => sData?.[p]?.prompt)) return;

            // On native, skip TTS pre-generation — audio plays on-demand
            if (!Capacitor.isNativePlatform()) {
                for (const p of parts) {
                    sData[p].audioId = await safeTTS(sData[p].prompt);
                }
            }
            setSpeakingData(sData);
        } catch (e) {
            console.warn("[CEFR] Speaking background generation failed:", e);
        }
    };

    // ─── Test Start ───────────────────────────────────────────────────────────
    const doStartTest = async (isFreeMode: boolean) => {
        setPhase('loading');
        if (!isFreeMode) {
            setLoadingMsg('Setting up audio engine...');
        }

        setLoadingMsg('Checking for available tests...');
        const cached = await loadCachedTestSet();

        if (cached) {
            setReadingData(cached.reading);
            setWritingData(cached.writing);

            // Show Reading immediately — user has 20 min, plenty of time
            // to generate audio for Listening & Speaking in background
            setPhase('reading');
            startTimer(20 * 60);

            if (!isFreeMode) {
                // Set raw data immediately so intro screens don't show "Generating content..."
                setListeningData(cached.listening);
                setSpeakingData(cached.speaking);

                // On native, DON'T pre-generate TTS — speak() plays audio immediately!
                // Audio will be generated on-demand when user enters each section.
                if (!Capacitor.isNativePlatform()) {
                    // Web: Background generate TTS blobs while user does Reading
                    (async () => {
                        try {
                            const clipsWithAudio = [...cached.listening];
                            for (let i = 0; i < clipsWithAudio.length; i++) {
                                const clip = clipsWithAudio[i];
                                if (clip.audioScript) {
                                    clip.audioId = await safeTTS(clip.audioScript);
                                    setListeningData([...clipsWithAudio]);
                                }
                            }

                            const parts = ['part1', 'part2', 'part3', 'part4'] as const;
                            for (const p of parts) {
                                if (cached.speaking?.[p]?.prompt) {
                                    cached.speaking[p].audioId = await safeTTS(cached.speaking[p].prompt);
                                    setSpeakingData({ ...cached.speaking });
                                }
                            }
                        } catch (e) {
                            console.warn('[CEFR] Background audio generation failed:', e);
                        }
                    })();
                }
            }
        } else {
            setLoadingMsg('Generating Reading Section...');
            try {
                const rData = await generateJson(READING_PROMPT);
                setReadingData(rData);
                setPhase('reading');
                startTimer(20 * 60);

                if (!isFreeMode) {
                    generateRemainingInBackground();
                } else {
                    generateWritingInBackground();
                }
            } catch (err: any) {
                console.error("[CEFR] Failed to start test:", err);
                setErrorMsg("Failed to start test: " + err.message);
                setPhase('intro');
            }
        }
    };

    const startTest = async () => {
        if (!isPaid) {
            setShowFreeChoiceModal(true);
            return;
        }
        const access = await canAccessFeature('cefr_test');
        if (!access.allowed) {
            setShowPaywall(true);
            return;
        }
        await recordFeatureUsage('cefr_test');
        await doStartTest(false);
    };

    const startFreeTest = async () => {
        setShowFreeChoiceModal(false);
        setFreeMode(true);
        await doStartTest(true);
    };

    const finishSection = (nextPhase: Phase, performGradingFn?: () => void) => {
        setCurrentPart(1);
        setPhase(nextPhase);
        if (nextPhase === 'grading' && performGradingFn) {
            performGradingFn();
        }
    };

    return {
        phase, setPhase,
        loadingMsg, setLoadingMsg,
        errorMsg, setErrorMsg,
        showPaywall, setShowPaywall,
        showFreeChoiceModal, setShowFreeChoiceModal,
        freeMode, setFreeMode,
        readingData, listeningData, writingData, speakingData,
        setListeningData,
        readingAnswers, setReadingAnswers,
        listeningAnswers, setListeningAnswers,
        writingAnswers, setWritingAnswers,
        speakingTranscripts, setPersistedSpeakingTranscripts,
        results, setResults,
        currentPart, setCurrentPart,
        testSetIdRef,
        startTest, startFreeTest,
        finishSection,
        saveResultsToDb, saveTestSetToDb,
        clearSession,
    };
};
