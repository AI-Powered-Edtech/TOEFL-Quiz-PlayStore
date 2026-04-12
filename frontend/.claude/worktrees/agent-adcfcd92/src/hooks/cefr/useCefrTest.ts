import { useState, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { callGroq, cleanJson } from '../../services/groq/client';
import { parseJsonSafely } from '../../services/groq/utils/jsonParser';
import { generateAudio } from '../../services/ttsService';
import { canAccessFeature, recordFeatureUsage } from '../../services/subscriptionService';
import { READING_PROMPT, LISTENING_CLIP_SPECS, generateListeningPrompt } from '../../data/cefrPrompts';
import { Phase, ReadingData, ListeningData, WritingData, SpeakingData, ListeningClip } from '../../components/cefr/types';

export const useCefrTest = (isPaid: boolean, startTimer: (seconds: number) => void) => {
    const [phase, setPhase] = useState<Phase>('intro');
    const [loadingMsg, setLoadingMsg] = useState('Initializing test environment...');
    const [errorMsg, setErrorMsg] = useState('');
    const [showPaywall, setShowPaywall] = useState(false);
    const [showFreeChoiceModal, setShowFreeChoiceModal] = useState(false);
    const [freeMode, setFreeMode] = useState(false);

    // Data State
    const [readingData, setReadingData] = useState<ReadingData | null>(null);
    const [listeningData, setListeningData] = useState<ListeningData | null>(null);
    const [writingData, setWritingData] = useState<WritingData | null>(null);
    const [speakingData, setSpeakingData] = useState<SpeakingData | null>(null);

    // User Answers
    const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
    const [listeningAnswers, setListeningAnswers] = useState<Record<string, string>>({});
    const [writingAnswers, setWritingAnswers] = useState<Record<string, string>>({});
    // speakingTranscripts is managed by useSpeechRecognition, we'll pass it in when needed, or return a setter

    // Results
    const [results, setResults] = useState<any>(null);

    // Section UI State
    const [currentPart, setCurrentPart] = useState(1);

    const testSetIdRef = useRef<string | null>(null);

    const generateJson = async (prompt: string) => {
        try {
            const content = await callGroq([
                { role: "system", content: "You are an expert Cambridge/CEFR English test creator. Output MUST be valid JSON only. Do not wrap in markdown blocks, just raw JSON." },
                { role: "user", content: prompt }
            ], 0.7, { jsonMode: true });
            const cleaned = cleanJson(content);
            return parseJsonSafely(cleaned);
        } catch (e) {
            console.error("JSON Generation failed:", e);
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

    const loadCachedTestSet = async () => {
        try {
            const { data, error } = await supabase
                .from('cefr_test_sets')
                .select('*')
                .eq('is_complete', true)
                .order('usage_count', { ascending: true })
                .limit(5);

            if (error || !data || data.length === 0) return null;

            const set = data[Math.floor(Math.random() * data.length)];
            if (!set.reading_data || !set.listening_data || !set.writing_prompts || !set.speaking_prompts) return null;

            await supabase
                .from('cefr_test_sets')
                .update({ usage_count: (set.usage_count || 0) + 1 })
                .eq('id', set.id);

            testSetIdRef.current = set.id;

            return {
                reading: set.reading_data as ReadingData,
                listening: set.listening_data as ListeningClip[],
                writing: set.writing_prompts as WritingData,
                speaking: set.speaking_prompts as SpeakingData,
            };
        } catch (e) {
            return null;
        }
    };

    const saveTestSetToDb = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !readingData || !listeningData || !writingData || !speakingData) return;

            const cleanListening = listeningData.map(({ audioId, ...rest }) => rest);

            const { data, error } = await supabase
                .from('cefr_test_sets')
                .insert({
                    created_by: user.id,
                    reading_data: readingData,
                    listening_data: cleanListening,
                    writing_prompts: writingData,
                    speaking_prompts: speakingData,
                    is_complete: true,
                })
                .select('id')
                .single();

            if (!error && data) {
                testSetIdRef.current = data.id;
            }
        } catch (e) { }
    };

    const saveResultsToDb = async (grades: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('cefr_results')
                .insert({
                    user_id: user.id,
                    test_set_id: testSetIdRef.current,
                    cefr_level: grades.cefrLevel,
                    overall_score: grades.overallScore,
                    reading_score: grades.readingScore,
                    listening_score: grades.listeningScore,
                    writing_score: grades.writingScore,
                    speaking_score: grades.speakingScore,
                    feedback: grades.feedback,
                });
        } catch (e) { }
    };

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
            return null;
        }
    };

    const generateRemainingInBackground = async () => {
        const clips: ListeningClip[] = [];
        for (let i = 0; i < LISTENING_CLIP_SPECS.length; i++) {
            const spec = LISTENING_CLIP_SPECS[i];
            const clip = await generateSingleClip(spec);
            if (clip) {
                clip.audioId = await safeTTS(clip.audioScript);
                clips.push(clip);
                setListeningData([...clips]);
            }
            if (i < LISTENING_CLIP_SPECS.length - 1) await delay(3000);
        }

        await delay(3000);
        await generateWritingInBackground();
        await delay(3000);
        await generateSpeakingInBackground();
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
        } catch (e) { }
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

            for (const p of parts) {
                sData[p].audioId = await safeTTS(sData[p].prompt);
            }
            setSpeakingData(sData);
        } catch (e) { }
    };

    const doStartTest = async (isFreeMode: boolean) => {
        setPhase('loading');
        if (!isFreeMode) {
            setLoadingMsg('Setting up audio engine...');
        }

        setLoadingMsg('Checking for available tests...');
        const cached = await loadCachedTestSet();

        if (cached) {
            setLoadingMsg('Loading test content...');
            setReadingData(cached.reading);
            setWritingData(cached.writing);

            if (!isFreeMode) {
                setSpeakingData(cached.speaking);
                setLoadingMsg('Preparing audio clips...');
                const clipsWithAudio: ListeningClip[] = [];
                for (const clip of cached.listening) {
                    const audioId = clip.audioScript ? await safeTTS(clip.audioScript) : undefined;
                    clipsWithAudio.push({ ...clip, audioId });
                }
                setListeningData(clipsWithAudio);

                const parts = ['part1', 'part2', 'part3', 'part4'] as const;
                for (const p of parts) {
                    if (cached.speaking?.[p]?.prompt) {
                        cached.speaking[p].audioId = await safeTTS(cached.speaking[p].prompt);
                    }
                }
                setSpeakingData(cached.speaking);
            }

            setPhase('reading');
            startTimer(20 * 60);
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
        readingAnswers, setReadingAnswers,
        listeningAnswers, setListeningAnswers,
        writingAnswers, setWritingAnswers,
        results, setResults,
        currentPart, setCurrentPart,
        testSetIdRef,
        startTest, startFreeTest,
        finishSection,
        saveResultsToDb, saveTestSetToDb
    };
};
