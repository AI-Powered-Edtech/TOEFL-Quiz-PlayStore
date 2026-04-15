
import { Bell, Volume2, Moon, Trash2, Shield, CircleHelp, ArrowLeft, Zap, Crown, BookOpen } from 'lucide-react';
import React from 'react';

import { useSubscription } from '../hooks/useSubscription';
import { AppView } from '../types';

import { Button } from './Button';
import PaywallSheet from './PaywallSheet';


interface SettingsProps {
    onNavigate: (view: AppView) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
    const [showPaywall, setShowPaywall] = React.useState(false);
    const { tier, tierName, tierColor, tierIcon, tokenUsage, loading: subLoading } = useSubscription();


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
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
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
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between opacity-60">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mr-4 border border-slate-200">
                                        <Moon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm">Dark Mode</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Switch to dark theme (Coming Soon)</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-not-allowed">
                                    <input type="checkbox" disabled className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 shadow-inner"></div>
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

                                    {tier === 'free' && (
                                        <button
                                            onClick={() => setShowPaywall(true)}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-violet-200 active:scale-95 transition-transform"
                                        >
                                            <Crown className="w-4 h-4" />
                                            Upgrade to Pro
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
                            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                                <div className="flex items-center">
                                    <CircleHelp className="w-5 h-5 text-slate-400 mr-3 group-hover:text-blue-600 transition-colors" />
                                    <span className="text-slate-700 font-medium">Help Center</span>
                                </div>
                                <span className="text-slate-500 text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-200">External ↗</span>
                            </div>
                            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                                <div className="flex items-center">
                                    <Shield className="w-5 h-5 text-slate-400 mr-3 group-hover:text-blue-600 transition-colors" />
                                    <span className="text-slate-700 font-medium">Privacy Policy</span>
                                </div>
                                <span className="text-slate-500 text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-200">External ↗</span>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-red-100 bg-red-50">
                            <h2 className="font-bold text-red-600 text-sm uppercase tracking-wider">Danger Zone</h2>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Reset Progress</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Delete all quiz history and XP (Cannot be undone)</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                    onClick={() => alert("Are you sure? This feature is locked in this demo.")}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Reset Data
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 mb-6 text-center text-xs text-slate-400 opacity-60 select-none">
                        TOEFL PBT Master v1.0.0 • Built with AI
                    </div>
                </div>
            </div>

            <PaywallSheet
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                currentTier={tier}
            />
        </div>
    );
};
