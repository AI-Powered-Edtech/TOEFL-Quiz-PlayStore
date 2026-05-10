import { ArrowLeft, Trophy, Flame, AlertCircle, Loader2, Sparkles, Flag } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { lookupPublicProfile, PublicProfile, PublicProfileLookupError } from '../services/publicProfileService';
import { ReportModal } from './peerReview/ReportModal';
import { useNavigationStore } from '../stores/useNavigationStore';
import { AppView } from '../types';

interface PublicProfileViewProps {
    onNavigate: (view: AppView) => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({ onNavigate }) => {
    const username = useNavigationStore((s) => s.publicProfileUsername);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setProfile(null);

        if (!username) {
            setError('No profile selected.');
            setLoading(false);
            return;
        }

        lookupPublicProfile(username)
            .then((p) => {
                if (cancelled) return;
                setProfile(p);
                if (!p) setError(`Profile "${username}" not found or is private.`);
            })
            .catch((e) => {
                if (cancelled) return;
                if (e instanceof PublicProfileLookupError) {
                    setError(e.message);
                } else {
                    setError('Could not load profile. Please try again later.');
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [username]);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-6 pb-16 flex items-center gap-4 shrink-0 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <button
                    onClick={() => onNavigate(AppView.DASHBOARD)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="relative z-10">
                    <h1 className="font-bold text-white text-xl">Public Profile</h1>
                    <p className="text-blue-100 text-xs">@{username || 'unknown'}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto -mt-10 relative z-20 px-4 pb-24">
                {loading && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Loading profile...</p>
                    </div>
                )}

                {!loading && error && !profile && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Profile unavailable</h3>
                        <p className="text-sm text-slate-500 mb-6">{error}</p>
                        <button
                            onClick={() => onNavigate(AppView.DASHBOARD)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"
                        >
                            Back to Home
                        </button>
                    </div>
                )}

                {!loading && profile && (
                    <>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
                            <div className="flex items-start gap-4">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.username} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-200">
                                        {profile.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 pt-1">
                                    <h2 className="font-bold text-slate-800 text-lg truncate">{profile.username}</h2>
                                    <p className="text-sm text-slate-500 mb-2">@{profile.username}</p>
                                    <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                                        Public profile
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-200 mb-3">
                                    <Trophy className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Total XP</div>
                                <div className="text-xl font-bold text-slate-800">{(profile.total_xp || 0).toLocaleString()}</div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-200 mb-3">
                                    <Flame className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Current Streak</div>
                                <div className="text-xl font-bold text-slate-800">{profile.current_streak || 0} <span className="text-xs font-medium text-slate-400">days</span></div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
                            <Sparkles className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-blue-700 font-semibold mb-1">Compete with {profile.username}</p>
                            <p className="text-xs text-blue-600 mb-4">Practice history and public achievements help friends see learning momentum.</p>
                            <button
                                onClick={() => onNavigate(AppView.PRACTICE_HUB)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-200 transition-all"
                            >
                                Practice your own quiz
                            </button>
                        </div>

                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                            >
                                <Flag className="w-3 h-3" />
                                Report this profile
                            </button>
                        </div>
                    </>
                )}
            </div>

            {showReportModal && profile && (
                <ReportModal
                    contentType="profile"
                    contentId={profile.username}
                    onClose={() => setShowReportModal(false)}
                    onSubmitted={() => { /* toast handled inside modal */ }}
                />
            )}
        </div>
    );
};
