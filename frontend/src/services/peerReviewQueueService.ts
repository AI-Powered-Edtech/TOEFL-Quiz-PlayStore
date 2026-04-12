import { PeerReviewSubmission, PeerReview, ReviewerStats } from '../types';

export interface PeerReviewQueueConfig {
    minReviewsForQueue: number;
    claimCooldownMinutes: number;
    maxActiveClaims: number;
    submissionExpiryHours: number;
    reviewDeadlineMinutes: number;
}

const DEFAULT_CONFIG: PeerReviewQueueConfig = {
    minReviewsForQueue: 3,
    claimCooldownMinutes: 30,
    maxActiveClaims: 3,
    submissionExpiryHours: 72,
    reviewDeadlineMinutes: 60,
};

export interface QueueFilter {
    taskType?: 'Task 1' | 'Task 2' | 'all';
    difficulty?: 'easy' | 'medium' | 'hard' | 'all';
    sortBy?: 'newest' | 'oldest' | 'word_count' | 'difficulty';
    bandRange?: [number, number];
    skillFocus?: string[];
}

export interface ClaimSubmissionResult {
    success: boolean;
    submission?: PeerReviewSubmission;
    error?: string;
    cooldownRemaining?: number;
}

export interface MatchSubmissionResult {
    success: boolean;
    submissions: PeerReviewSubmission[];
    total: number;
}

export const getQueueConfig = (): PeerReviewQueueConfig => {
    return { ...DEFAULT_CONFIG };
};

export const matchSubmissionsForReview = async (
    filters: QueueFilter,
    currentUserId: string,
    config: Partial<PeerReviewQueueConfig> = {}
): Promise<MatchSubmissionResult> => {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    
    const allSubmissions = JSON.parse(localStorage.getItem('peer_review_all_submissions') || '[]');
    
    let filtered = allSubmissions.filter((s: PeerReviewSubmission) => {
        if (s.status !== 'pending') return false;
        if (s.user_id === currentUserId) return false;
        
        if (filters.taskType && filters.taskType !== 'all' && s.task_type !== filters.taskType) {
            return false;
        }
        
        return true;
    });

    if (filters.sortBy === 'newest') {
        filtered.sort((a: PeerReviewSubmission, b: PeerReviewSubmission) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    } else if (filters.sortBy === 'oldest') {
        filtered.sort((a: PeerReviewSubmission, b: PeerReviewSubmission) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    } else if (filters.sortBy === 'word_count') {
        filtered.sort((a: PeerReviewSubmission, b: PeerReviewSubmission) => 
            b.word_count - a.word_count
        );
    }

    const total = filtered.length;
    const limited = filtered.slice(0, cfg.minReviewsForQueue);

    return {
        success: true,
        submissions: limited,
        total,
    };
};

export const claimSubmission = async (
    submissionId: string,
    reviewerId: string,
    config: Partial<PeerReviewQueueConfig> = {}
): Promise<ClaimSubmissionResult> => {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    const cooldownKey = `review_cooldown_${reviewerId}`;
    const lastClaimTime = localStorage.getItem(cooldownKey);
    
    if (lastClaimTime) {
        const elapsed = Date.now() - parseInt(lastClaimTime, 10);
        const cooldownMs = cfg.claimCooldownMinutes * 60 * 1000;
        
        if (elapsed < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - elapsed) / 60000);
            return {
                success: false,
                error: `Please wait ${remaining} minutes before claiming another`,
                cooldownRemaining: remaining,
            };
        }
    }

    const activeClaimsKey = `active_claims_${reviewerId}`;
    const activeClaims = JSON.parse(localStorage.getItem(activeClaimsKey) || '[]');
    
    if (activeClaims.length >= cfg.maxActiveClaims) {
        return {
            success: false,
            error: `You have ${activeClaims.length} active reviews. Complete them first.`,
        };
    }

    const allSubmissions = JSON.parse(localStorage.getItem('peer_review_all_submissions') || '[]');
    const submission = allSubmissions.find((s: PeerReviewSubmission) => s.id === submissionId);
    
    if (!submission) {
        return { success: false, error: 'Submission not found' };
    }
    
    if (submission.status !== 'pending') {
        return { success: false, error: 'Submission no longer available' };
    }

    submission.status = 'in_review';
    submission.claimed_by = reviewerId;
    submission.claimed_at = new Date().toISOString();
    
    const updatedSubmissions = allSubmissions.map((s: PeerReviewSubmission) => 
        s.id === submissionId ? submission : s
    );
    localStorage.setItem('peer_review_all_submissions', JSON.stringify(updatedSubmissions));

    activeClaims.push({
        submissionId,
        claimedAt: Date.now(),
        deadline: Date.now() + (cfg.reviewDeadlineMinutes * 60 * 1000),
    });
    localStorage.setItem(activeClaimsKey, JSON.stringify(activeClaims));
    localStorage.setItem(cooldownKey, Date.now().toString());

    return {
        success: true,
        submission,
    };
};

export const releaseClaim = async (
    submissionId: string,
    reviewerId: string
): Promise<{ success: boolean; error?: string }> => {
    const allSubmissions = JSON.parse(localStorage.getItem('peer_review_all_submissions') || '[]');
    const submission = allSubmissions.find((s: PeerReviewSubmission) => s.id === submissionId);
    
    if (!submission || submission.claimed_by !== reviewerId) {
        return { success: false, error: 'Cannot release this claim' };
    }

    submission.status = 'pending';
    submission.claimed_by = undefined;
    submission.claimed_at = undefined;
    
    const updatedSubmissions = allSubmissions.map((s: PeerReviewSubmission) => 
        s.id === submissionId ? submission : s
    );
    localStorage.setItem('peer_review_all_submissions', JSON.stringify(updatedSubmissions));

    const activeClaimsKey = `active_claims_${reviewerId}`;
    const activeClaims = JSON.parse(localStorage.getItem(activeClaimsKey) || '[]');
    const filtered = activeClaims.filter((c: any) => c.submissionId !== submissionId);
    localStorage.setItem(activeClaimsKey, JSON.stringify(filtered));

    return { success: true };
};

export const getActiveClaims = (reviewerId: string): Array<{
    submissionId: string;
    claimedAt: number;
    deadline: number;
    isExpired: boolean;
}> => {
    const activeClaimsKey = `active_claims_${reviewerId}`;
    const claims = JSON.parse(localStorage.getItem(activeClaimsKey) || '[]');
    
    const now = Date.now();
    return claims.map((c: any) => ({
        ...c,
        isExpired: now > c.deadline,
    }));
};

export const getQueuePosition = (submissionId: string): number => {
    const allSubmissions = JSON.parse(localStorage.getItem('peer_review_all_submissions') || '[]');
    const pending = allSubmissions.filter((s: PeerReviewSubmission) => s.status === 'pending');
    const index = pending.findIndex((s: PeerReviewSubmission) => s.id === submissionId);
    return index >= 0 ? index + 1 : -1;
};

export const getEstimatedWaitTime = (position: number): string => {
    const avgReviewTime = 15;
    const minutes = position * avgReviewTime;
    
    if (minutes < 60) {
        return `~${minutes} min`;
    }
    const hours = Math.ceil(minutes / 60);
    return `~${hours} hour${hours > 1 ? 's' : ''}`;
};

export const submitReview = async (
    submissionId: string,
    reviewerId: string,
    review: Omit<PeerReview, 'id' | 'created_at'>
): Promise<{ success: boolean; review?: PeerReview; error?: string }> => {
    const activeClaimsKey = `active_claims_${reviewerId}`;
    const activeClaims = JSON.parse(localStorage.getItem(activeClaimsKey) || '[]');
    const claim = activeClaims.find((c: any) => c.submissionId === submissionId);
    
    if (!claim) {
        return { success: false, error: 'No active claim for this submission' };
    }

    if (claim.isExpired) {
        return { success: false, error: 'Review deadline has passed' };
    }

    const newReview: PeerReview = {
        ...review,
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
    };

    const allReviews = JSON.parse(localStorage.getItem('peer_review_all_reviews') || '[]');
    allReviews.push(newReview);
    localStorage.setItem('peer_review_all_reviews', JSON.stringify(allReviews));

    const allSubmissions = JSON.parse(localStorage.getItem('peer_review_all_submissions') || '[]');
    const updatedSubmissions = allSubmissions.map((s: PeerReviewSubmission) => 
        s.id === submissionId ? { ...s, status: 'completed' as const } : s
    );
    localStorage.setItem('peer_review_all_submissions', JSON.stringify(updatedSubmissions));

    const updatedClaims = activeClaims.filter((c: any) => c.submissionId !== submissionId);
    localStorage.setItem(activeClaimsKey, JSON.stringify(updatedClaims));

    return { success: true, review: newReview };
};