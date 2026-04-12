/**
 * PaywallSheet — Premium Upgrade Bottom Sheet
 * 
 * A swipeable bottom sheet that displays subscription tiers,
 * feature comparison, and purchase buttons.
 * Mobile-first design with glassmorphism aesthetic.
 */

import {
    X, Crown, Zap, Star, Check, Lock,
    Headphones, BookOpen, PenTool, Shield,
    Sparkles, ArrowRight, Gem, Loader2
} from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { purchaseSubscription, restorePurchases, type ProductId } from '../services/purchaseService';
import { type SubscriptionTier, type GatedFeature, getTierPrice, clearTierCache } from '../services/subscriptionService';

interface PaywallSheetProps {
    isOpen: boolean;
    onClose: () => void;
    /** The feature that triggered the paywall */
    triggeredBy?: GatedFeature;
    /** Custom message explaining why the paywall appeared */
    reason?: string;
    /** Current user tier */
    currentTier?: SubscriptionTier;
    /** Callback when user selects a plan to purchase */
    onPurchase?: (tier: 'basic' | 'c2') => void;
    /** Callback to restore purchases */
    onRestore?: () => void;
}

const FEATURES = [
    {
        icon: Zap,
        label: 'Token AI Harian',
        free: '15 token',
        basic: '500 token',
        c2: 'Unlimited*',
    },
    {
        icon: BookOpen,
        label: 'CEFR Test',
        free: '1x/bulan',
        basic: '1x/minggu',
        c2: '1x/hari',
    },
    {
        icon: Shield,
        label: 'Full Simulation',
        free: '🔒 Terkunci',
        basic: '1x/minggu',
        c2: '1x/hari',
    },
    {
        icon: Headphones,
        label: 'Listening / Audio',
        free: '🔒 Terkunci',
        basic: '✅ Akses Penuh',
        c2: '✅ Akses Penuh',
    },
    {
        icon: PenTool,
        label: 'Writing Gym Lanjutan',
        free: '🔒 Mason saja',
        basic: '✅ Semua Fitur',
        c2: '✅ Semua Fitur',
    },
];

const PaywallSheet: React.FC<PaywallSheetProps> = ({
    isOpen,
    onClose,
    triggeredBy,
    reason,
    currentTier = 'free',
    onPurchase,
    onRestore,
}) => {
    const [selectedPlan, setSelectedPlan] = useState<'basic' | 'c2'>('basic');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handlePurchase = useCallback(async () => {
        const productId: ProductId = selectedPlan === 'basic' ? 'basic_monthly' : 'c2_monthly';
        setIsLoading(true);
        setStatusMsg(null);

        try {
            const result = await purchaseSubscription(productId);

            if (result.success) {
                setStatusMsg({ type: 'success', text: `🎉 Berhasil upgrade ke ${result.tier === 'basic' ? 'Basic' : 'C2 Pro'}!` });
                // Notify parent if callback provided
                onPurchase?.(selectedPlan);
                // Auto-close after 1.5s
                setTimeout(() => onClose(), 1500);
            } else if (result.error === 'cancelled') {
                // User cancelled — no error message needed
                setStatusMsg(null);
            } else {
                setStatusMsg({ type: 'error', text: result.error || 'Pembelian gagal' });
            }
        } catch (err) {
            setStatusMsg({ type: 'error', text: 'Terjadi kesalahan. Coba lagi.' });
        } finally {
            setIsLoading(false);
        }
    }, [selectedPlan, onPurchase, onClose]);

    const handleRestore = useCallback(async () => {
        setIsLoading(true);
        setStatusMsg(null);

        try {
            const result = await restorePurchases();
            if (result.success) {
                setStatusMsg({ type: 'success', text: `✅ Langganan ${result.tier === 'basic' ? 'Basic' : 'C2 Pro'} dipulihkan!` });
                onRestore?.();
                setTimeout(() => onClose(), 1500);
            } else {
                setStatusMsg({ type: 'error', text: result.error || 'Tidak ditemukan langganan' });
            }
        } catch (err) {
            setStatusMsg({ type: 'error', text: 'Gagal memulihkan. Coba lagi.' });
        } finally {
            setIsLoading(false);
        }
    }, [onRestore, onClose]);

    if (!isOpen) return null;

    const getTriggeredMessage = () => {
        if (reason) return reason;
        switch (triggeredBy) {
            case 'full_simulation': return 'Full Simulation tersedia di paket Basic & C2';
            case 'cefr_test': return 'Kuota CEFR Test habis untuk periode ini';
            case 'listening_audio': return 'Fitur Listening tersedia di paket Basic & C2';
            case 'writing_gym_advanced': return 'Fitur Writing lanjutan tersedia di paket Basic & C2';
            case 'ai_generation': return 'Token AI harian habis. Upgrade untuk lebih banyak token!';
            default: return 'Upgrade untuk membuka fitur premium!';
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9998,
                    animation: 'fadeIn 0.2s ease',
                }}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    borderRadius: '24px 24px 0 0',
                    zIndex: 9999,
                    animation: 'slideUp 0.3s ease',
                    padding: '0 0 env(safe-area-inset-bottom, 16px) 0',
                }}
            >
                {/* Handle bar */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                    }}
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', padding: '12px 24px 20px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        marginBottom: 12,
                    }}>
                        <Crown size={28} color="white" />
                    </div>
                    <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
                        Upgrade ke Premium
                    </h2>
                    <p style={{
                        color: '#94a3b8',
                        fontSize: 14,
                        margin: 0,
                        lineHeight: 1.4,
                        padding: '0 16px',
                    }}>
                        {getTriggeredMessage()}
                    </p>
                </div>

                {/* Plan Toggle */}
                <div style={{
                    display: 'flex',
                    gap: 10,
                    padding: '0 20px',
                    marginBottom: 20,
                }}>
                    {/* Basic Plan Card */}
                    <button
                        onClick={() => setSelectedPlan('basic')}
                        style={{
                            flex: 1,
                            padding: '16px 12px',
                            borderRadius: 16,
                            border: selectedPlan === 'basic' ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
                            background: selectedPlan === 'basic' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Gem size={24} color="#3b82f6" style={{ marginBottom: 6 }} />
                        <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Basic</div>
                        <div style={{ color: '#3b82f6', fontSize: 18, fontWeight: 800, margin: '4px 0' }}>
                            Rp 16.5rb
                        </div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>/bulan</div>
                    </button>

                    {/* C2 Plan Card */}
                    <button
                        onClick={() => setSelectedPlan('c2')}
                        style={{
                            flex: 1,
                            padding: '16px 12px',
                            borderRadius: 16,
                            border: selectedPlan === 'c2' ? '2px solid #f59e0b' : '2px solid rgba(255,255,255,0.1)',
                            background: selectedPlan === 'c2' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.2s',
                        }}
                    >
                        {/* Popular badge */}
                        <div style={{
                            position: 'absolute',
                            top: 6,
                            right: -20,
                            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                            color: 'white',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 24px',
                            transform: 'rotate(35deg)',
                        }}>
                            BEST
                        </div>
                        <Crown size={24} color="#f59e0b" style={{ marginBottom: 6 }} />
                        <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>C2 Pro</div>
                        <div style={{ color: '#f59e0b', fontSize: 18, fontWeight: 800, margin: '4px 0' }}>
                            Rp 165rb
                        </div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>/bulan</div>
                    </button>
                </div>

                {/* Feature Comparison */}
                <div style={{ padding: '0 20px', marginBottom: 16 }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 16,
                        overflow: 'hidden',
                    }}>
                        {FEATURES.map((feat, index) => {
                            const Icon = feat.icon;
                            const value = selectedPlan === 'basic' ? feat.basic : feat.c2;
                            const isLocked = value.includes('🔒');

                            return (
                                <div
                                    key={feat.label}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '12px 16px',
                                        borderBottom: index < FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    }}
                                >
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        background: isLocked ? 'rgba(100,116,139,0.2)' : 'rgba(59,130,246,0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <Icon size={16} color={isLocked ? '#64748b' : '#3b82f6'} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
                                            {feat.label}
                                        </div>
                                    </div>
                                    <div style={{
                                        color: isLocked ? '#64748b' : '#34d399',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        textAlign: 'right',
                                    }}>
                                        {value}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Status Message */}
                {statusMsg && (
                    <div style={{
                        margin: '0 20px 12px',
                        padding: '12px 16px',
                        borderRadius: 12,
                        background: statusMsg.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: statusMsg.type === 'success' ? '#4ade80' : '#f87171',
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: 'center',
                    }}>
                        {statusMsg.text}
                    </div>
                )}

                {/* CTA Button */}
                <div style={{ padding: '0 20px', marginBottom: 12 }}>
                    <button
                        onClick={handlePurchase}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: 16,
                            border: 'none',
                            background: isLoading ? '#475569' : selectedPlan === 'basic'
                                ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                : 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: 'white',
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transition: 'transform 0.1s',
                            opacity: isLoading ? 0.7 : 1,
                        }}
                        onTouchStart={(e) => !isLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
                        onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        {isLoading ? (
                            <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                        ) : (
                            <>
                                <Star size={18} />
                                Langganan {selectedPlan === 'basic' ? 'Basic' : 'C2 Pro'} — {getTierPrice(selectedPlan)}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>

                {/* Legal / Disclosure */}
                <div style={{ padding: '0 20px 8px', textAlign: 'center' }}>
                    <p style={{ color: '#475569', fontSize: 10, lineHeight: 1.4, margin: '0 0 8px' }}>
                        Langganan diperpanjang otomatis setiap bulan. Pembatalan bisa dilakukan kapan saja melalui Google Play Store.
                        Dengan berlangganan, kamu menyetujui{' '}
                        <a href="#" style={{ color: '#64748b', textDecoration: 'underline' }}>Syarat & Ketentuan</a>
                        {' '}dan{' '}
                        <a href="#" style={{ color: '#64748b', textDecoration: 'underline' }}>Kebijakan Privasi</a>.
                    </p>

                    {/* Restore button */}
                    <button
                        onClick={handleRestore}
                        disabled={isLoading}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontSize: 12,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            textDecoration: 'underline',
                            padding: '8px 16px',
                            opacity: isLoading ? 0.5 : 1,
                        }}
                    >
                        Pulihkan Pembelian Sebelumnya
                    </button>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0 }
                    to { opacity: 1 }
                }
                @keyframes slideUp {
                    from { transform: translateY(100%) }
                    to { transform: translateY(0) }
                }
            `}</style>
        </>
    );
};

export default PaywallSheet;
