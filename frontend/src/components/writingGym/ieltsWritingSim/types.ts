export type TaskType = 'Task 1' | 'Task 2';

export type SimActiveTab = 'question' | 'answer';

export type FeedbackTabType = 'score' | 'grammar' | 'vocab' | 'heatmap' | 'flow' | 'issues' | 'tutor';

export interface TimerState {
    taskType: TaskType;
    timeLeft: number;
    totalTime: number;
    startedAt: number;
    infractions: number;
    prompt?: string;
}
