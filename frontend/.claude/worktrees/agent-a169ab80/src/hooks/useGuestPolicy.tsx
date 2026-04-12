import React from 'react';
import { useAuth } from './useAuth';
import { ArrowLeft, LogIn } from 'lucide-react';

export type FeatureType =
    | 'error_jail'
    | 'peer_review';

export type PolicyType = 'full_access' | 'read_only' | 'blocked';

const GUEST_POLICIES: Record<FeatureType, PolicyType> = {
    error_jail: 'blocked',
    peer_review: 'read_only',
};

export const useGuestPolicy = (feature: FeatureType) => {
    const { user, signInWithGoogle } = useAuth();
    const isGuest = !user;
    const policy = isGuest ? GUEST_POLICIES[feature] : 'full_access';

    const renderGuestFallback = (
        title: string,
        description: string,
        onBack?: () => void,
        icon: React.ReactNode = <LogIn className="w-10 h-10 text-orange-600" />
    ) => {
        return (
            <div className="flex flex-col h-full bg-slate-50" >
                <div className="bg-transparent px-4 py-4 flex items-center justify-between shrink-0 z-10" >
                    {
                        onBack ? (
                            <button
                                onClick={onBack}
                                className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6 text-slate-800" />
                            </button>
                        ) : (
                            <div className="w-10" />
                        )
                    }
                    <h1 className="font-bold text-slate-800 text-lg" > {title} </h1>
                    < div className="w-10" />
                </div>

                < div className="flex-1 flex items-center justify-center p-6" >
                    <div className="max-w-md text-center" >
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4" >
                            {icon}
                        </div>
                        < h2 className="text-2xl font-bold text-slate-800 mb-2" > Login Required </h2>
                        < p className="text-slate-500 mb-6" > {description} </p>
                        < button
                            onClick={signInWithGoogle}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold w-full rounded-2xl py-4 text-lg shadow-lg shadow-orange-200 transition-colors"
                        >
                            Sign in with Google
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return { isGuest, policy, renderGuestFallback };
};
