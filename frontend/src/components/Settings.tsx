
import { Bell, Volume2, Moon, Trash2, Shield, CircleHelp, ArrowLeft, Zap, Crown, BookOpen, AlertTriangle } from 'lucide-react';
import React from 'react';

import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../stores/useAuthStore';
import { AppView } from '../types';

import { Button } from './Button';
import PaywallSheet from './PaywallSheet';
import { openSubscriptionManagement } from '../services/purchaseService';


interface SettingsProps {
    onNavigate: (view: AppView) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
    const openExternalLink = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const [showPaywall, setShowPaywall] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
    const [deleteError, setDeleteError] = React.useState<string | null>(null);
    const [deleteSuccess, setDeleteSuccess] = React.useState(false);
    const [soundEnabled, setSoundEnabled] = React.useState(() => localStorage.getItem('pref_sound_effects') !== '0');
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(() => localStorage.getItem('pref_notifications') === '1');
    const { tier, tierName, tierColor, tierIcon, tokenUsage, loading: subLoading } = useSubscription();
    const { isDark, toggleDark } = useTheme();
    const { isAuthenticated, deleteAccount, isLoading: authLoading } = useAuthStore();

    const canConfirmAccountDeletion = deleteConfirmText.trim().toUpperCase() === 'DELETE';

    const handleDeleteAccount = async () => {
        if (!canConfirmAccountDeletion || authLoading) return;
        setDeleteError(null);
        const result = await deleteAccount();
        if (result.ok) {
            setDeleteSuccess(true);
            setTimeout(() => {
                window.location.reload();
            }, 900);
            return;
        }
        setDeleteError(result.error || 'Gagal menghapus akun. Coba lagi.');
    };


    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Fixed Header */}
            <div className="flex-shrink-0 px-4 py-4 bg-slate-50 z-10">
                <div className="flex items-center pt-2">
                    <button
                        onClick={() => onNavigate(AppView.MORE_HUB)}
                        className="mr-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-blue-50 transition-colors shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-700" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Settings</h1>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-4">
                <div className="container mx-auto max-w-2xl space-y-6">

                    {/* Preferences Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
                            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Preferences</h2>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-4">
                                        <Volume2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm">Sound Effects</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Play sounds for correct answers and level ups</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={soundEnabled} onChange={(event) => { setSoundEnabled(event.target.checked); localStorage.setItem('pref_sound_effects', event.target.checked ? '1' : '0'); }} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mr-4">
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Email reminders for daily practice streaks</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={notificationsEnabled} onChange={(event) => { setNotificationsEnabled(event.target.checked); localStorage.setItem('pref_notifications', event.target.checked ? '1' : '0'); }} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mr-4">
                                        <Moon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm">Dark Mode</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Switch to dark theme</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isDark} onChange={toggleDark} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
                            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">My Plan</h2>
                        </div>
                        <div className="p-5">
                            {subLoading ? (
                                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{tierIcon}</span>
                                            <div>
                                                <div className="font-bold text-slate-800">{tierName}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {tier === 'free'
                                                        ? 'Limited AI features'
                                                        : 'Full access to all features'}
                                                </div>
                                            </div>
                                        </div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold border ${tierColor}`}
                                        >
                                            {tier.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* AI Token Usage Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> AI Tokens Today</span>
                                            <span>{tokenUsage.tokens_used} / {tokenUsage.tokens_limit}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${tokenUsage.percentage >= 80 ? 'bg-red-500' :
                                                    tokenUsage.percentage >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}
                                                style={{ width: `${tokenUsage.percentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {tier === 'free' ? (
                                        <button
                                            onClick={() => setShowPaywall(true)}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-violet-200 active:scale-95 transition-transform"
                                        >
                                            <Crown className="w-4 h-4" />
                                            Upgrade to Pro
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => openSubscriptionManagement()}
                                            className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
                                        >
                                            <Crown className="w-4 h-4" />
                                            Kelola Langganan di Google Play
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* AI Voice Engine */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
                            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">AI Voice Engine</h2>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                                    <Volume2 className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 text-sm">Kitten TTS Nano</div>
                                    <div className="text-xs text-slate-500 mt-0.5">On-device • ~35MB • Offline</div>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Support Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Support</h2>
                        </div>
                        <div className="p-2 space-y-1">
                            <div
                                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
                                onClick={() => window.dispatchEvent(new CustomEvent('featuretour:open'))}
                            >
                                <div className="flex items-center">
                                    <BookOpen className="w-5 h-5 text-slate-400 mr-3 group-hover:text-blue-600 transition-colors" />
                                    <span className="text-slate-700 font-medium">Lihat Tutorial Fitur</span>
                                </div>
                                <span className="text-slate-500 text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-200">Open</span>
                            </div>
                            <button
                                type="button"
                                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group text-left"
                                onClick={() => openExternalLink(import.meta.env.VITE_HELP_URL || 'mailto:support@toeflquiz.app')}
                            >
                                <div className="flex items-center">
                                    <CircleHelp className="w-5 h-5 text-slate-400 mr-3 group-hover:text-blue-600 transition-colors" />
                                    <span className="text-slate-700 font-medium">Help Center</span>
                                </div>
                                <span className="text-slate-500 text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-200">External ↗</span>
                            </button>
                            <button
                                type="button"
                                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group text-left"
                                onClick={() => openExternalLink(import.meta.env.VITE_PRIVACY_URL || 'https://toeflquiz.app/privacy')}
                            >
                                <div className="flex items-center">
                                    <Shield className="w-5 h-5 text-slate-400 mr-3 group-hover:text-blue-600 transition-colors" />
                                    <span className="text-slate-700 font-medium">Privacy Policy</span>
                                </div>
                                <span className="text-slate-500 text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-200">External ↗</span>
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-red-100 bg-red-50">
                            <h2 className="font-bold text-red-600 text-sm uppercase tracking-wider">Danger Zone</h2>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Reset Progress</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Delete all quiz history and XP (Cannot be undone)</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                    disabled
                                    title="Reset progress will be enabled after server-side recovery checks are complete."
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Coming Soon
                                </Button>
                            </div>

                            <div className="mt-5 pt-5 border-t border-red-100 flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Delete Account</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Permanently remove your account and server-saved learning data.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 disabled:opacity-50"
                                    disabled={!isAuthenticated}
                                    onClick={() => {
                                        setShowDeleteConfirm(true);
                                        setDeleteConfirmText('');
                                        setDeleteError(null);
                                        setDeleteSuccess(false);
                                    }}
                                >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Delete Account
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 mb-6 text-center text-xs text-slate-400 opacity-60 select-none">
                        TOEFL Quiz AI v1.0.0 • Built with AI
                    </div>
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 px-4 py-6">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-red-100 overflow-hidden">
                        <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-900">Delete your account?</h2>
                                <p className="text-xs text-red-700 mt-0.5">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                We will ask the server to remove your account, subscription entitlement cache, quiz/writing progress, media registry entries, creator profile, reports, and other account-owned records. Local tokens and cached draft data on this device will also be cleared.
                            </p>
                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Type DELETE to confirm</span>
                                <input
                                    value={deleteConfirmText}
                                    onChange={(event) => setDeleteConfirmText(event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold tracking-wide outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                                    placeholder="DELETE"
                                    autoFocus
                                />
                            </label>
                            {deleteError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                    {deleteError}
                                </div>
                            )}
                            {deleteSuccess && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                                    Account deleted. Clearing session...
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-slate-200 text-slate-600"
                                    disabled={authLoading || deleteSuccess}
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                    disabled={!canConfirmAccountDeletion || authLoading || deleteSuccess}
                                    onClick={handleDeleteAccount}
                                >
                                    {authLoading ? 'Deleting...' : 'Delete Forever'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PaywallSheet
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                currentTier={tier}
            />
        </div>
    );
};
