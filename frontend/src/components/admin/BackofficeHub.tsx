import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { assignUserRole, removeUserRole } from '../../services/adminService';
import { SystemHealth } from './SystemHealth';
import { ModerationQueueTab } from './ModerationQueueTab';
import { AuditLogTab } from './AuditLogTab';
import { CreatorEconomyTab } from './CreatorEconomyTab';
import { QuestionBankAdminTab } from './QuestionBankAdminTab';
import { MediaAssetsTab } from './MediaAssetsTab';
import { auditService } from '../../services/auditService';
import { requireAdminPin } from '../../services/adminPinService';

interface BackofficeHubProps {
    onNavigate?: (route: string) => void;
    onBack?: () => void;
}

interface UserData {
    id: string;
    username?: string;
    email?: string;
    role: string;
    subscription_tier: string;
}

export const BackofficeHub: React.FC<BackofficeHubProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'health' | 'moderation' | 'audit' | 'creator' | 'questions' | 'media'>('users');
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [roleChangeRequest, setRoleChangeRequest] = useState<{ userId: string; currentRole: string; email?: string; newRole: string } | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get<UserData[]>('/api/admin/users');
            if (response.error) {
                setError(response.error.error || 'Gagal memuat data pengguna');
            } else if (response.data) {
                setUsers(response.data);
            }
        } catch (err) {
            setError('Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab]);

    const handleChangeRole = async (userId: string, currentRole: string, email?: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        setRoleChangeRequest({ userId, currentRole, email, newRole });
    };

    const confirmChangeRole = async () => {
        if (!roleChangeRequest) return;
        const { userId, currentRole, email, newRole } = roleChangeRequest;
        setRoleChangeRequest(null);
        setNotice(null);
        if (!(await requireAdminPin('ubah role'))) return;

        try {
            if (newRole === 'admin') {
                const res = await assignUserRole(userId, 'admin');
                if (!res.success) throw new Error(res.message);
            } else {
                const res = await removeUserRole(userId);
                if (!res.success) throw new Error(res.message);
            }
            await auditService.logAction({ action: 'ROLE_CHANGE', target_type: 'user', target_id: userId, metadata: { from: currentRole, to: newRole, email } });
            setNotice({ type: 'success', text: `Role berhasil diubah menjadi ${newRole}.` });
            fetchUsers();
        } catch (err: any) {
            setNotice({ type: 'error', text: `Gagal mengubah role: ${err.message}` });
        }
    };

    const handleChangeTier = async (userId: string, currentTier: string) => {
        const newTier = prompt('Masukkan tier baru (free, basic, c2):', currentTier);
        if (!newTier || newTier === currentTier) return;
        if (!(await requireAdminPin('ubah tier'))) return;

        try {
            const response = await apiClient.patch(`/api/admin/users/${userId}/tier`, { tier: newTier });
            if (response.error) {
                if (response.error.status === 403 || response.error.error?.includes('super_admin')) {
                    setNotice({ type: 'error', text: 'Hanya super_admin yang dapat mengubah tier.' });
                    return;
                }
                throw new Error(response.error.error || 'Gagal mengubah tier');
            }
            await auditService.logAction({ action: 'TIER_CHANGE', target_type: 'user', target_id: userId, metadata: { from: currentTier, to: newTier } });
            setNotice({ type: 'success', text: `Tier berhasil diubah menjadi ${newTier}.` });
            fetchUsers();
        } catch (err: any) {
            setNotice({ type: 'error', text: `Gagal mengubah tier: ${err.message}` });
        }
    };

    return (
        <div className="w-full h-full flex flex-col p-8 overflow-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Backoffice Hub</h1>
                {onBack && (
                    <button 
                        onClick={onBack}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg font-medium"
                    >
                        Kembali ke Aplikasi
                    </button>
                )}
            </div>

            <div className="flex space-x-4 mb-6 border-b dark:border-slate-700">
                <button
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'users'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    onClick={() => setActiveTab('users')}
                >
                    User Management
                </button>
                <button
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'health'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    onClick={() => setActiveTab('health')}
                >
                    System Health
                </button>
                <button
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'moderation'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    onClick={() => setActiveTab('moderation')}
                >
                    Moderation
                </button>
                {[
                    ['audit', 'Audit Logs'],
                    ['creator', 'Creator'],
                    ['questions', 'Questions'],
                    ['media', 'Media'],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === key
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                        onClick={() => setActiveTab(key as any)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {notice && (
                <div role="status" aria-live="polite" className={`p-4 rounded-lg mb-6 ${notice.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {notice.text}
                </div>
            )}

            {error && activeTab === 'users' && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {activeTab === 'users' ? (
                loading ? (
                    <div className="flex justify-center items-center h-64">
                        <p className="text-slate-500">Memuat data pengguna...</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800 border-b dark:border-slate-700">
                                    <th className="p-4 font-semibold">ID</th>
                                    <th className="p-4 font-semibold">Username</th>
                                    <th className="p-4 font-semibold">Email</th>
                                    <th className="p-4 font-semibold">Role</th>
                                    <th className="p-4 font-semibold">Tier</th>
                                    <th className="p-4 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4 text-sm font-mono text-slate-500">{user.id.substring(0, 8)}...</td>
                                        <td className="p-4">{user.username || '-'}</td>
                                        <td className="p-4">{user.email || '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                user.role === 'admin' || user.role === 'super_admin' 
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                user.subscription_tier === 'c2' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                user.subscription_tier === 'basic' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {user.subscription_tier}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button 
                                                onClick={() => handleChangeRole(user.id, user.role, user.email)}
                                                className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                            >
                                                Ubah Role
                                            </button>
                                            <button 
                                                onClick={() => handleChangeTier(user.id, user.subscription_tier)}
                                                className="px-3 py-1 text-sm bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                            >
                                                Ubah Tier
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            Tidak ada data pengguna.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            ) : activeTab === 'health' ? (
                <SystemHealth />
            ) : activeTab === 'moderation' ? (
                <ModerationQueueTab />
            ) : activeTab === 'audit' ? (
                <AuditLogTab />
            ) : activeTab === 'creator' ? (
                <CreatorEconomyTab />
            ) : activeTab === 'questions' ? (
                <QuestionBankAdminTab />
            ) : (
                <MediaAssetsTab />
            )}
            {roleChangeRequest && (
                <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="role-change-title">
                    <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-100 dark:border-slate-800">
                        <h3 id="role-change-title" className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ubah role pengguna?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Role akan diubah menjadi <strong>{roleChangeRequest.newRole}</strong>. Aksi ini akan dicatat di audit log.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setRoleChangeRequest(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">Batal</button>
                            <button onClick={confirmChangeRole} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">Ubah</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};