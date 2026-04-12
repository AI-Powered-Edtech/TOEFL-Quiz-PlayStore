import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import api from '../services/apiClient';

const GUEST_HEARTS_KEY = 'guest_hearts_count';
const GUEST_LAST_RESET_KEY = 'guest_hearts_reset_date';
const GUEST_ACTIVITY_KEY = 'guest_activity_log';
const GUEST_DEVICE_ID_KEY = 'guest_device_id';
const GUEST_FINGERPRINT_KEY = 'guest_fingerprint';
const GUEST_ACTIVITY_TIMESTAMP_KEY = 'guest_last_activity';
const GUEST_WARNING_FLAGS_KEY = 'guest_warning_flags';
const MAX_GUEST_HEARTS = 5;
const HEART_RESET_HOUR = 0;

export interface GuestActivity {
    feature: string;
    action: string;
    heartsUsed: number;
    timestamp: number;
}

export interface GuestUsageStats {
    totalHeartsUsed: number;
    featuresUsed: string[];
    lastActive: number;
    consecutiveDays: number;
}

export interface DeviceFingerprint {
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
    hash: string;
}

export interface TamperingDetection {
    hasClockManipulation: boolean;
    hasFingerprintMismatch: boolean;
    warningFlags: string[];
    lastActivityTimestamp: number;
    currentTimestamp: number;
}

const generateFingerprintHash = (fingerprint: Omit<DeviceFingerprint, 'hash'>): string => {
    const data = `${fingerprint.screenResolution}|${fingerprint.timezone}|${fingerprint.language}|${fingerprint.platform}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
};

const getDeviceFingerprint = (): DeviceFingerprint => {
    const fingerprint: Omit<DeviceFingerprint, 'hash'> = {
        screenResolution: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
    };
    return {
        ...fingerprint,
        hash: generateFingerprintHash(fingerprint),
    };
};

const validateFingerprint = (): { isValid: boolean; hasChanged: boolean; flags: string[] } => {
    const storedFingerprint = localStorage.getItem(GUEST_FINGERPRINT_KEY);
    const currentFingerprint = getDeviceFingerprint();
    const flags: string[] = [];

    if (!storedFingerprint) {
        localStorage.setItem(GUEST_FINGERPRINT_KEY, currentFingerprint.hash);
        return { isValid: true, hasChanged: false, flags: [] };
    }

    const hasChanged = storedFingerprint !== currentFingerprint.hash;
    if (hasChanged) {
        flags.push('fingerprint_changed');
    }

    const significantChanges = detectSignificantChanges(storedFingerprint, currentFingerprint);
    if (significantChanges) {
        flags.push('significant_fingerprint_change');
    }

    return {
        isValid: flags.length === 0,
        hasChanged,
        flags,
    };
};

const detectSignificantChanges = (storedHash: string, currentFingerprint: DeviceFingerprint): boolean => {
    const currentHash = generateFingerprintHash({
        screenResolution: currentFingerprint.screenResolution,
        timezone: currentFingerprint.timezone,
        language: currentFingerprint.language,
        platform: currentFingerprint.platform,
    });
    return storedHash !== currentHash;
};

const checkClockManipulation = (): { isManipulated: boolean; warningFlags: string[] } => {
    const lastActivity = parseInt(localStorage.getItem(GUEST_ACTIVITY_TIMESTAMP_KEY) || '0', 10);
    const currentTimestamp = Date.now();
    const warningFlags: string[] = [];

    if (lastActivity > 0 && currentTimestamp < lastActivity) {
        warningFlags.push('clock_rewind_detected');
    }

    if (lastActivity > 0 && currentTimestamp - lastActivity < 0) {
        warningFlags.push('negative_time_elapsed');
    }

    const daysSinceLastActivity = (currentTimestamp - lastActivity) / (1000 * 60 * 60 * 24);
    if (daysSinceLastActivity > 365) {
        warningFlags.push('future_date_detected');
    }

    return {
        isManipulated: warningFlags.length > 0,
        warningFlags,
    };
};

const addWarningFlag = (flag: string): void => {
    try {
        const existingFlags = JSON.parse(localStorage.getItem(GUEST_WARNING_FLAGS_KEY) || '[]') as string[];
        if (!existingFlags.includes(flag)) {
            existingFlags.push(flag);
            localStorage.setItem(GUEST_WARNING_FLAGS_KEY, JSON.stringify(existingFlags));
        }
    } catch {
        localStorage.setItem(GUEST_WARNING_FLAGS_KEY, JSON.stringify([flag]));
    }
};

const getWarningFlags = (): string[] => {
    try {
        return JSON.parse(localStorage.getItem(GUEST_WARNING_FLAGS_KEY) || '[]');
    } catch {
        return [];
    }
};

const clearWarningFlags = (): void => {
    localStorage.removeItem(GUEST_WARNING_FLAGS_KEY);
};

export const detectTampering = (): TamperingDetection => {
    const lastActivity = parseInt(localStorage.getItem(GUEST_ACTIVITY_TIMESTAMP_KEY) || '0', 10);
    const currentTimestamp = Date.now();
    const warningFlags = getWarningFlags();

    const clockCheck = checkClockManipulation();
    const fingerprintCheck = validateFingerprint();

    return {
        hasClockManipulation: clockCheck.isManipulated,
        hasFingerprintMismatch: !fingerprintCheck.isValid,
        warningFlags,
        lastActivityTimestamp: lastActivity,
        currentTimestamp,
    };
};

const updateActivityTimestamp = (): void => {
    const currentTimestamp = Date.now();
    localStorage.setItem(GUEST_ACTIVITY_TIMESTAMP_KEY, currentTimestamp.toString());
};

const getGuestDeviceId = (): string => {
    let deviceId = localStorage.getItem(GUEST_DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = `guest_${crypto.randomUUID()}`;
        localStorage.setItem(GUEST_DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
};

export const useFreePlanHearts = () => {
    const { user, isAuthenticated } = useAuthStore();
    const [hearts, setHearts] = useState<number>(MAX_GUEST_HEARTS);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            const fingerprintCheck = validateFingerprint();
            fingerprintCheck.flags.forEach(flag => addWarningFlag(flag));

            const clockCheck = checkClockManipulation();
            clockCheck.warningFlags.forEach(flag => addWarningFlag(flag));
        }
    }, [isAuthenticated]);

    const getToday = useCallback(() => {
        const now = new Date();
        const resetDate = new Date(now);
        resetDate.setHours(HEART_RESET_HOUR, 0, 0, 0);
        return resetDate.getTime();
    }, []);

    const shouldResetHearts = useCallback((): boolean => {
        const lastReset = localStorage.getItem(GUEST_LAST_RESET_KEY);
        if (!lastReset) return true;
        
        const lastResetTime = parseInt(lastReset, 10);
        const todayReset = getToday();
        return lastResetTime < todayReset;
    }, [getToday]);

    const loadHearts = useCallback(async () => {
        setIsLoading(true);

        if (isAuthenticated && user?.hearts_count !== undefined) {
            setHearts(user.hearts_count);
            localStorage.removeItem(GUEST_HEARTS_KEY);
            localStorage.removeItem(GUEST_LAST_RESET_KEY);
        } else {
            if (shouldResetHearts()) {
                const newHearts = MAX_GUEST_HEARTS;
                localStorage.setItem(GUEST_HEARTS_KEY, newHearts.toString());
                localStorage.setItem(GUEST_LAST_RESET_KEY, getToday().toString());
                setHearts(newHearts);
            } else {
                const cloudHeartsUsed = await fetchGuestUsageFromCloud();
                const localHeartsUsed = parseInt(localStorage.getItem(GUEST_HEARTS_KEY) || '0', 10);
                const totalUsed = Math.max(cloudHeartsUsed, localHeartsUsed);
                
                const storedHearts = MAX_GUEST_HEARTS - totalUsed;
                const heartsValue = Math.max(0, storedHearts);
                
                localStorage.setItem(GUEST_HEARTS_KEY, heartsValue.toString());
                setHearts(heartsValue);
            }
        }
        setIsLoading(false);
        
        syncGuestUsageToCloud().catch(() => {});
    }, [isAuthenticated, user?.hearts_count, shouldResetHearts, getToday]);

    useEffect(() => {
        loadHearts();
    }, [loadHearts]);

    const decrementHeart = useCallback(async (feature?: string) => {
        if (hearts <= 0) return false;

        const newHearts = hearts - 1;
        setHearts(newHearts);
        localStorage.setItem(GUEST_HEARTS_KEY, newHearts.toString());

        if (feature) {
            recordGuestActivity(feature, 'use_heart', 1);
        }

        return true;
    }, [hearts]);

    const isOutOfHearts = hearts <= 0;

    const getHeartsDisplay = useCallback((): string => {
        if (hearts === 0) return 'Habis';
        if (hearts === 1) return '1 heart';
        return `${hearts} hearts`;
    }, [hearts]);

    return {
        hearts,
        decrementHeart,
        isOutOfHearts,
        isLoading,
        getHeartsDisplay,
    };
};

export const recordGuestActivity = (feature: string, action: string, heartsUsed: number = 0): void => {
    if (localStorage.getItem('access_token')) return;

    const activity: GuestActivity = {
        feature,
        action,
        heartsUsed,
        timestamp: Date.now(),
    };

    try {
        const existing = localStorage.getItem(GUEST_ACTIVITY_KEY);
        const logs: GuestActivity[] = existing ? JSON.parse(existing) : [];
        logs.push(activity);

        const maxLogs = 100;
        const trimmedLogs = logs.slice(-maxLogs);
        localStorage.setItem(GUEST_ACTIVITY_KEY, JSON.stringify(trimmedLogs));
        updateActivityTimestamp();
    } catch (e) {
        console.warn('[GuestAnalytics] Failed to record activity:', e);
    }
};

export const getGuestUsageStats = (): GuestUsageStats => {
    try {
        const activityLog = localStorage.getItem(GUEST_ACTIVITY_KEY);
        const logs: GuestActivity[] = activityLog ? JSON.parse(activityLog) : [];

        const featuresUsed = [...new Set(logs.map(l => l.feature))];
        const totalHeartsUsed = logs.reduce((sum, l) => sum + l.heartsUsed, 0);
        
        const timestamps = logs.map(l => l.timestamp).sort((a, b) => a - b);
        const lastActive = timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0;

        const daysActive = new Set(
            logs.map(l => new Date(l.timestamp).toDateString())
        ).size;

        return {
            totalHeartsUsed,
            featuresUsed,
            lastActive,
            consecutiveDays: Math.max(1, daysActive),
        };
    } catch {
        return {
            totalHeartsUsed: 0,
            featuresUsed: [],
            lastActive: 0,
            consecutiveDays: 0,
        };
    }
};

export const clearGuestData = (): void => {
    localStorage.removeItem(GUEST_HEARTS_KEY);
    localStorage.removeItem(GUEST_LAST_RESET_KEY);
    localStorage.removeItem(GUEST_ACTIVITY_KEY);
    localStorage.removeItem(GUEST_FINGERPRINT_KEY);
    localStorage.removeItem(GUEST_ACTIVITY_TIMESTAMP_KEY);
    clearWarningFlags();
};

export const getHeartsResetTime = (): Date | null => {
    const lastReset = localStorage.getItem(GUEST_LAST_RESET_KEY);
    if (!lastReset) return null;

    const resetTime = parseInt(lastReset, 10);
    const nextReset = new Date(resetTime);
    nextReset.setDate(nextReset.getDate() + 1);
    return nextReset;
};

export const isGuestUser = (): boolean => {
    return !localStorage.getItem('access_token');
};

export const syncGuestUsageToCloud = async (): Promise<void> => {
    if (!isGuestUser()) return;
    
    const deviceId = getGuestDeviceId();
    const stats = getGuestUsageStats();
    const tampering = detectTampering();
    
    try {
        await api.post('/guest-usage/sync', {
            device_id: deviceId,
            hearts_used: stats.totalHeartsUsed,
            features_used: stats.featuresUsed,
            last_active: stats.lastActive,
            consecutive_days: stats.consecutiveDays,
            tampering_detected: tampering.hasClockManipulation || tampering.hasFingerprintMismatch,
            warning_flags: tampering.warningFlags,
        });
    } catch (error) {
        console.warn('[GuestUsage] Cloud sync failed:', error);
    }
};

export const fetchGuestUsageFromCloud = async (): Promise<number> => {
    if (!isGuestUser()) return 0;
    
    const deviceId = getGuestDeviceId();
    
    try {
        const response = await api.get<{ hearts_used: number }>(`/guest-usage/${deviceId}`);
        return response.data?.hearts_used ?? 0;
    } catch {
        return 0;
    }
};
