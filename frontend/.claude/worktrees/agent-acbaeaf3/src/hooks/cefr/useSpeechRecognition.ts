import { useState, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [speakingTranscripts, setSpeakingTranscripts] = useState<Record<string, string>>({});
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
            alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari for the speaking section.");
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
            setSpeakingTranscripts(prev => ({ ...prev, [partId]: finalTranscript + interimTranscript }));
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);

            if (event.error === 'not-allowed') {
                alert("Microphone access was denied. Please allow microphone access in your browser settings to use the speaking section.");
            } else if (event.error === 'network') {
                alert("Network error occurred during speech recognition. Please check your internet connection.");
            }
        };

        recognition.onend = () => setIsRecording(false);

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
    }, [isRecording, speakingTranscripts]);

    return {
        isRecording,
        speakingTranscripts,
        setSpeakingTranscripts,
        toggleRecording,
        isSpeechRecognitionSupported
    };
};
