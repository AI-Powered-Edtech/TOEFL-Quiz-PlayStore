import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { apiV2 } from '../../services/apiV2'
import VwfdHealthCard from './VwfdHealthCard'

interface HealthData {
    status: string;
    version: string;
    services: {
        database: string;
        redis: string;
    };
    uptime: number;
}

interface ErrorLog {
    id: string;
    timestamp: string;
    error_message: string;
    stack_trace: string;
    user_id?: string;
    path: string;
}

export const SystemHealth: React.FC = () => {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [errors, setErrors] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchMonitoringData = async () => {
        setLoading(true);
        try {
            const [healthRes, errorsRes] = await Promise.all([
                apiClient.get<HealthData>('/api/admin/monitoring/health'),
                apiClient.get<ErrorLog[]>('/api/admin/monitoring/errors')
            ]);

            if (healthRes.error) {
                setErrorMsg(healthRes.error.error || 'Failed to fetch health data');
            } else if (healthRes.data) {
                setHealth(healthRes.data);
            }

            if (errorsRes.error) {
                setErrorMsg(errorsRes.error.error || 'Failed to fetch error logs');
            } else if (errorsRes.data) {
                setErrors(errorsRes.data);
            }
        } catch (err) {
            setErrorMsg('Terjadi kesalahan saat memuat data monitoring');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitoringData();
        const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading && !health) {
        return (
            <div className="flex justify-center items-center h-64">
      <div className="mb-4"><VwfdHealthCard /></div>
                <p className="text-slate-500">Memuat data sistem...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {errorMsg && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg">
                    {errorMsg}
                </div>
            )}

            {health && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Status Sistem</h3>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${health.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className="text-2xl font-bold capitalize">{health.status}</span>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Database</h3>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${health.services.database === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className="text-2xl font-bold capitalize">{health.services.database}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Redis</h3>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${health.services.redis === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className="text-2xl font-bold capitalize">{health.services.redis}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Uptime</h3>
                        <span className="text-2xl font-bold">{Math.floor(health.uptime / 3600)}j {Math.floor((health.uptime % 3600) / 60)}m</span>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Error Logs Terakhir</h2>
                    <button 
                        onClick={fetchMonitoringData}
                        className="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                                <th className="p-4 font-semibold text-sm">Waktu</th>
                                <th className="p-4 font-semibold text-sm">Path</th>
                                <th className="p-4 font-semibold text-sm">Pesan Error</th>
                                <th className="p-4 font-semibold text-sm">User ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {errors.map((err) => (
                                <tr key={err.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                                        {new Date(err.timestamp).toLocaleString('id-ID')}
                                    </td>
                                    <td className="p-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                                        {err.path}
                                    </td>
                                    <td className="p-4 text-sm text-red-600 dark:text-red-400">
                                        {err.error_message}
                                    </td>
                                    <td className="p-4 text-sm font-mono text-slate-500">
                                        {err.user_id ? err.user_id.substring(0, 8) + '...' : '-'}
                                    </td>
                                </tr>
                            ))}
                            {errors.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">
                                        Tidak ada error log. Sistem berjalan lancar!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
