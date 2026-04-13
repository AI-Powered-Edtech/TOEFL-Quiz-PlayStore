import { useState, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
    initialTranscripts?: Record<string, string>;
    onTranscriptChange?: (partId: string, transcript: string) => void;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
    const { initialTranscripts = {}, onTranscriptChange } = options;
    const [isRecording, setIsRecording] = useState(false);
    const [speakingTranscripts, setSpeakingTranscripts] = useState<Record<string, string>>(initialTranscripts);
    const [speechError, setSpeechError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    const isSpeechRecognitionSupported = useCallback((): boolean => {
        return typeof window !== 'undefined' &&
            ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    }, []);

    const toggleRecording = useCallback((partId: string) => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            // Handled by the caller with a proper UI warning instead of alert
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = speakingTranscripts[partId] || '';

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            const newTranscript = finalTranscript + interimTranscript;
            setSpeakingTranscripts(prev => ({ ...prev, [partId]: newTranscript }));
            onTranscriptChange?.(partId, newTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error("[CEFR] Speech recognition error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setSpeechError('permission denied');
            } else {
                setSpeechError(event.error);
            }
            setIsRecording(false);
        };

        recognition.onend = () => setIsRecording(false);

        setSpeechError(null); // Clear error on new start
        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
    }, [isRecording, speakingTranscripts, onTranscriptChange]);

    const stopRecording = useCallback(() => {
        if (isRecording && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    return {
        isRecording,
        speakingTranscripts,
        setSpeakingTranscripts,
        toggleRecording,
        stopRecording,
        isSpeechRecognitionSupported,
        speechError
    };
};
