import { useState, useCallback } from 'react';
import { useGuestPolicy, type PolicyCheckResult } from './useGuestPolicy';
import PaywallSheet from '../components/PaywallSheet';
import { useAuthStore } from '../stores/useAuthStore';

export interface PaywallEnforcementOptions {
    feature: string;
    onAllowed?: () => void;
    autoEnforce?: boolean;
    showHeartsInstead?: boolean;
    heartsRequired?: number;
}

export interface UsePaywallReturn {
    checkAccess: () => Promise<PolicyCheckResult>;
    showPaywall: boolean;
    paywallReason: PolicyCheckResult | null;
    openPaywall: (reason?: PolicyCheckResult) => void;
    closePaywall: () => void;
}

export const usePaywallEnforcement = (
    options: PaywallEnforcementOptions
): UsePaywallReturn => {
    const { feature, onAllowed, autoEnforce = true } = options;
    const { checkPolicy, isGuest } = useGuestPolicy(feature);
    const [showPaywall, setShowPaywall] = useState(false);
    const [paywallReason, setPaywallReason] = useState<PolicyCheckResult | null>(null);

    const openPaywall = useCallback((reason?: PolicyCheckResult) => {
        setPaywallReason(reason || null);
        setShowPaywall(true);
    }, []);

    const closePaywall = useCallback(() => {
        setShowPaywall(false);
        setPaywallReason(null);
    }, []);

    const checkAccess = useCallback(async (): Promise<PolicyCheckResult> => {
        const result = await checkPolicy();
        
        if (!result.allowed && autoEnforce) {
            if (result.showPaywall || result.requiresAuth || result.requiresUpgrade) {
                openPaywall(result);
            }
        }
        
        if (result.allowed && onAllowed) {
            onAllowed();
        }
        
        return result;
    }, [checkPolicy, autoEnforce, onAllowed, openPaywall]);

    return {
        checkAccess,
        showPaywall,
        paywallReason,
        openPaywall,
        closePaywall,
    };
};

export const useFeatureGate = (feature: string, autoCheck: boolean = true) => {
    const { checkPolicy, enforcePolicy, isGuest, guestStats } = useGuestPolicy(feature);
    const [isLoading, setIsLoading] = useState(false);
    const [accessDenied, setAccessDenied] = useState<PolicyCheckResult | null>(null);

    const check = useCallback(async (): Promise<PolicyCheckResult> => {
        setIsLoading(true);
        try {
            const result = await checkPolicy();
            setAccessDenied(result.allowed ? null : result);
            return result;
        } finally {
            setIsLoading(false);
        }
    }, [checkPolicy]);

    const enforce = useCallback(async (onDenied?: (result: PolicyCheckResult) => void): Promise<boolean> => {
        setIsLoading(true);
        try {
            const result = await enforcePolicy(onDenied);
            if (!result && onDenied) {
                const policyResult = await checkPolicy();
                onDenied(policyResult);
            }
            setAccessDenied(result ? null : await checkPolicy());
            return result;
        } finally {
            setIsLoading(false);
        }
    }, [enforcePolicy, checkPolicy]);

    const canAccess = useCallback(async (): Promise<boolean> => {
        const result = await checkPolicy();
        return result.allowed;
    }, [checkPolicy]);

    return {
        check,
        enforce,
        canAccess,
        isLoading,
        accessDenied,
        isGuest,
        guestStats,
    };
};

export const withPaywall = <P extends object>(
    Component: React.ComponentType<P>,
    feature: string,
    options?: Partial<PaywallEnforcementOptions>
) => {
    return (props: P) => {
        const { showPaywall, paywallReason, openPaywall, closePaywall, checkAccess } = usePaywallEnforcement({
            feature,
            autoEnforce: false,
            ...options,
        });

        return (
            <>
                <Component {...props} onFeatureAccessCheck={checkAccess} />
                <PaywallSheet
                    isOpen={showPaywall}
                    onClose={closePaywall}
                    reason={paywallReason?.reason}
                    triggeredBy={paywallReason?.requiresUpgrade ? 'ai_generation' : undefined}
                />
            </>
        );
    };
};

export const GuestPrompt: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSignUp: () => void;
    onLogin: () => void;
    feature?: string;
    reason?: string;
}> = ({ isOpen, onClose, onSignUp, onLogin, feature, reason }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: 24,
                padding: 32,
                maxWidth: 400,
                width: '100%',
                textAlign: 'center',
                animation: 'fadeIn 0.2s ease',
            }}>
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: 32,
                }}>
                    🔐
                </div>
                <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
                    Masuk untuk Menggunakan
                </h2>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                    {reason || `Fitur "${feature || 'fitur ini'}" memerlukan akun. Daftar atau masuk untuk melanjutkan.`}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={onSignUp}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            borderRadius: 12,
                            border: 'none',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Daftar Gratis
                    </button>
                    <button
                        onClick={onLogin}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'transparent',
                            color: 'white',
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Sudah punya akun? Masuk
                    </button>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        marginTop: 16,
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: 14,
                        cursor: 'pointer',
                    }}
                >
                    Nanti saja
                </button>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};