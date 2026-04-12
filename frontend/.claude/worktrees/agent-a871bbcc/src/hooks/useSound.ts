import { useState, useCallback } from 'react';

// Singleton AudioContext to avoid creating too many and hitting browser limits
let sharedAudioContext: any = null;

/**
 * Sound hook for game audio feedback
 * Enhanced with haptic feedback and dynamic pitch shifting for streaks
 */
export const useSound = () => {
    const [enabled, setEnabled] = useState(true);

    const play = useCallback((sound: string, streakCount: number = 0) => {
        if (!enabled) return;

        // Sound effects mapping (frequency, duration)
        const soundMap: Record<string, number[]> = {
            dragStart: [200, 0.1],
            dropSuccess: [400, 0.15],
            dropFail: [150, 0.1],
            reorder: [300, 0.08],
            success: [600, 0.2],
            error: [100, 0.15],
            powerUp: [500, 0.12],
            gameOver: [80, 0.3],
            timeout: [120, 0.2],
            reset: [250, 0.1],
            start: [350, 0.15],
            lock: [800, 0.05], // Short high pitch for locking in place
            tap: [400, 0.05]   // Short blip for tap interactions
        };

        let [frequency, duration] = soundMap[sound] || [200, 0.1];

        // Dynamic pitch for streaks (success chime ascends)
        if (sound === 'success' && streakCount > 0) {
            // Pentatonic scale-ish ascent for fun
            const semitones = Math.min(streakCount, 12);
            frequency = frequency * Math.pow(2, semitones / 12);
        }

        // --- AUDIO ---
        try {
            if (!sharedAudioContext) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    sharedAudioContext = new AudioContextClass();
                }
            }

            if (sharedAudioContext) {
                // Browsers often suspend audio context until user interaction. Resume if needed.
                if (sharedAudioContext.state === 'suspended') {
                    sharedAudioContext.resume().catch((e: any) => console.debug('Could not resume AudioContext', e));
                }

                // Create a new oscillator for each sound
                const oscillator = sharedAudioContext.createOscillator();
                const gainNode = sharedAudioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(sharedAudioContext.destination);

                oscillator.frequency.value = frequency;
                oscillator.type = sound === 'error' ? 'sawtooth' : 'sine'; // Errors sound buzzier

                gainNode.gain.setValueAtTime(0.1, sharedAudioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, sharedAudioContext.currentTime + duration);

                oscillator.start(sharedAudioContext.currentTime);
                oscillator.stop(sharedAudioContext.currentTime + duration);
            }
        } catch (e) {
            console.debug('Audio not supported:', e);
        }

        // --- HAPTICS ---
        if (navigator.vibrate) {
            if (sound === 'dropSuccess' || sound === 'lock') {
                navigator.vibrate(15); // Light tap
            } else if (sound === 'error' || sound === 'dropFail') {
                navigator.vibrate([30, 50, 30]); // Double buzz
            } else if (sound === 'success') {
                navigator.vibrate(20);
            } else if (sound === 'tap') {
                navigator.vibrate(5); // Very light tap
            }
        }

    }, [enabled]);

    return {
        play,
        setEnabled,
        enabled
    };
};
