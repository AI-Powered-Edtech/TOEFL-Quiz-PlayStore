import React, { useEffect, useState } from 'react';
import { isCurrentUserAdmin } from '../../services/adminService';
import { Button } from '../Button';

interface AdminAuthGateProps {
    children: React.ReactNode;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const hasAccess = await isCurrentUserAdmin();
                setIsAuthorized(hasAccess);
            } catch (error) {
                console.error('Failed to check admin status:', error);
                setIsAuthorized(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAccess();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Akses Ditolak</h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">
                        Anda tidak memiliki izin untuk mengakses halaman admin ini. Hanya pengguna dengan peran admin atau super_admin yang diizinkan.
                    </p>
                    <Button
                        onClick={() => window.history.back()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        Kembali
                    </Button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
