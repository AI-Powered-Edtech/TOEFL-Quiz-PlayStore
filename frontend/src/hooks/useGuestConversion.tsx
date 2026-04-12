import { useCallback, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { clearGuestData, getGuestUsageStats, type GuestUsageStats } from './useFreePlanHearts';

export interface GuestConversionResult {
    success: boolean;
    error?: string;
    guestStats?: GuestUsageStats;
}

export interface UseGuestConversionReturn {
    conversionPrompt: boolean;
    showConversionPrompt: () => void;
    hideConversionPrompt: () => void;
    convertToRegistered: (email: string, password: string) => Promise<GuestConversionResult>;
    mergeGuestData: (userId: string) => Promise<GuestConversionResult>;
    guestStats: GuestUsageStats | null;
    shouldPromptConversion: () => boolean;
}

const CONVERSION_THRESHOLD = 3;
const CONVERSION_PROMPT_KEY = 'guest_conversion_prompted';

export const useGuestConversion = (): UseGuestConversionReturn => {
    const { register } = useAuthStore();
    const [conversionPrompt, setConversionPrompt] = useState(false);
    const [guestStats, setGuestStats] = useState<GuestUsageStats | null>(null);

    const showConversionPrompt = useCallback(() => {
        const stats = getGuestUsageStats();
        setGuestStats(stats);
        
        const alreadyPrompted = localStorage.getItem(CONVERSION_PROMPT_KEY);
        if (!alreadyPrompted && stats.totalHeartsUsed >= CONVERSION_THRESHOLD) {
            setConversionPrompt(true);
            localStorage.setItem(CONVERSION_PROMPT_KEY, 'true');
        }
    }, []);

    const hideConversionPrompt = useCallback(() => {
        setConversionPrompt(false);
    }, []);

    const shouldPromptConversion = useCallback((): boolean => {
        const stats = getGuestUsageStats();
        const alreadyPrompted = localStorage.getItem(CONVERSION_PROMPT_KEY);
        return !alreadyPrompted && stats.totalHeartsUsed >= CONVERSION_THRESHOLD;
    }, []);

    const convertToRegistered = useCallback(async (email: string, password: string): Promise<GuestConversionResult> => {
        try {
            const result = await register(email, password);
            
            if (result.ok) {
                clearGuestData();
                return { success: true };
            }
            
            return {
                success: false,
                error: result.error || 'Registration failed',
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }, [register]);

    const mergeGuestData = useCallback(async (userId: string): Promise<GuestConversionResult> => {
        const stats = getGuestUsageStats();
        
        try {
            const response = await fetch('/api/guest/merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({
                    user_id: userId,
                    guest_stats: stats,
                }),
            });

            if (response.ok) {
                clearGuestData();
                return { success: true, guestStats: stats };
            }

            return {
                success: false,
                error: 'Failed to merge guest data',
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }, []);

    return {
        conversionPrompt,
        showConversionPrompt,
        hideConversionPrompt,
        convertToRegistered,
        mergeGuestData: async () => ({ success: true }),
        guestStats,
        shouldPromptConversion,
    };
};

export const GuestConversionPrompt: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSignUpWithEmail: () => void;
    onSignUpWithGoogle: () => void;
    guestStats?: GuestUsageStats | null;
}> = ({ isOpen, onClose, onSignUpWithEmail, onSignUpWithGoogle, guestStats }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: 24,
                padding: 32,
                maxWidth: 420,
                width: '100%',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                animation: 'slideUp 0.3s ease',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: 36,
                    }}>
                        🎁
                    </div>
                    <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                        Simpan Progress Anda!
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.5 }}>
                        Buat akun untuk menyimpan data dan继续 belajar tanpa kehilangan progress.
                    </p>
                </div>

                {guestStats && (
                    <div style={{
                        background: 'rgba(59,130,246,0.1)',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 24,
                        border: '1px solid rgba(59,130,246,0.2)',
                    }}>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>
                            Progress Anda:
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <div style={{ color: '#3b82f6', fontSize: 14, fontWeight: 600 }}>
                                ❤️ {guestStats.totalHeartsUsed} hearts used
                            </div>
                            <div style={{ color: '#34d399', fontSize: 14, fontWeight: 600 }}>
                                📅 {guestStats.consecutiveDays} days active
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={onSignUpWithGoogle}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            borderRadius: 12,
                            border: 'none',
                            background: 'white',
                            color: '#1e293b',
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Daftar dengan Google
                    </button>
                    
                    <button
                        onClick={onSignUpWithEmail}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'transparent',
                            color: 'white',
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Daftar dengan Email
                    </button>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 20,
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: 14,
                        cursor: 'pointer',
                        padding: 8,
                    }}
                >
                    Nanti saja, lanjut sebagai tamu
                </button>
            </div>
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};