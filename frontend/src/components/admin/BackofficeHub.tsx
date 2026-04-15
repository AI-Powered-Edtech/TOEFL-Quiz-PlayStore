import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { assignUserRole, removeUserRole } from '../../services/adminService';
import { SystemHealth } from './SystemHealth';

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
    const [activeTab, setActiveTab] = useState<'users' | 'health'>('users');
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
        if (!window.confirm(`Apakah Anda yakin ingin mengubah role pengguna ini menjadi ${newRole}?`)) return;

        try {
            if (newRole === 'admin') {
                const res = await assignUserRole(userId, 'admin');
                if (!res.success) throw new Error(res.message);
            } else {
                const res = await removeUserRole(userId);
                if (!res.success) throw new Error(res.message);
            }
            alert(`Role berhasil diubah menjadi ${newRole}`);
            fetchUsers();
        } catch (err: any) {
            alert(`Gagal mengubah role: ${err.message}`);
        }
    };

    const handleChangeTier = async (userId: string, currentTier: string) => {
        const newTier = prompt('Masukkan tier baru (free, basic, c2):', currentTier);
        if (!newTier || newTier === currentTier) return;

        try {
            const response = await apiClient.patch(`/api/admin/users/${userId}/tier`, { tier: newTier });
            if (response.error) {
                if (response.error.status === 403 || response.error.error?.includes('super_admin')) {
                    alert('Hanya super_admin yang dapat mengubah tier.');
                    return;
                }
                throw new Error(response.error.error || 'Gagal mengubah tier');
            }
            alert(`Tier berhasil diubah menjadi ${newTier}`);
            fetchUsers();
        } catch (err: any) {
            alert(`Gagal mengubah tier: ${err.message}`);
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
            </div>

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
            ) : (
                <SystemHealth />
            )}
        </div>
    );
};