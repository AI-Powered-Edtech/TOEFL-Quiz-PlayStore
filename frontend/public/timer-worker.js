const TIMER_KEY = 'toefl-timer';

interface TimerMessage {
    action: 'start' | 'stop' | 'reset' | 'tick';
    duration?: number;
    timerId?: string;
}

interface TimerState {
    timerId: string;
    remaining: number;
    isRunning: boolean;
    startedAt: number;
    expectedEnd: number;
}

let currentTimer: TimerState | null = null;
let intervalId: number | null = null;
let lastTickTime = 0;

function tick() {
    const now = Date.now();
    if (currentTimer && currentTimer.isRunning && currentTimer.expectedEnd > 0) {
        const remaining = Math.max(0, Math.ceil((currentTimer.expectedEnd - now) / 1000));
        
        if (remaining !== lastTickTime) {
            lastTickTime = remaining;
            
            self.postMessage({
                type: 'tick',
                timerId: currentTimer.timerId,
                remaining,
                isRunning: true,
            });

            if (remaining <= 0) {
                stopTimer(currentTimer.timerId);
                self.postMessage({
                    type: 'timeUp',
                    timerId: currentTimer.timerId,
                });
            }
        }
    }
}

function startTimer(timerId: string, duration: number) {
    if (intervalId) {
        clearInterval(intervalId);
    }
    
    currentTimer = {
        timerId,
        remaining: duration,
        isRunning: true,
        startedAt: Date.now(),
        expectedEnd: Date.now() + (duration * 1000),
    };
    
    lastTickTime = duration;
    intervalId = setInterval(tick, 100) as unknown as number;
    
    self.postMessage({
        type: 'started',
        timerId,
        duration,
    });
}

function stopTimer(timerId?: string) {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    
    if (currentTimer && (!timerId || currentTimer.timerId === timerId)) {
        const remaining = timerId ? currentTimer.remaining : Math.max(0, Math.ceil((currentTimer.expectedEnd - Date.now()) / 1000));
        
        self.postMessage({
            type: 'stopped',
            timerId: currentTimer.timerId,
            remaining,
        });
        
        if (timerId) {
            currentTimer = null;
        }
    }
}

function resetTimer(timerId?: string) {
    if (currentTimer && (!timerId || currentTimer.timerId === timerId)) {
        const id = currentTimer.timerId;
        stopTimer();
        
        self.postMessage({
            type: 'reset',
            timerId: id,
        });
    }
}

self.onmessage = (event: MessageEvent<TimerMessage>) => {
    const { action, duration, timerId } = event.data;
    
    switch (action) {
        case 'start':
            if (timerId && duration !== undefined) {
                startTimer(timerId, duration);
            }
            break;
        case 'stop':
            stopTimer(timerId);
            break;
        case 'reset':
            resetTimer(timerId);
            break;
    }
};

self.postMessage({ type: 'ready' });