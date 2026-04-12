import React from 'react';

interface BackofficeHubProps {
    onNavigate?: (route: string) => void;
    onBack?: () => void;
}

export const BackofficeHub: React.FC<BackofficeHubProps> = ({ onBack }) => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
            <h1 className="text-3xl font-bold mb-4">Backoffice Hub</h1>
            <p className="text-slate-500 mb-6">Admin panel coming soon...</p>
            {onBack && (
                <button 
                    onClick={onBack}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                >
                    Back to App
                </button>
            )}
        </div>
    );
};