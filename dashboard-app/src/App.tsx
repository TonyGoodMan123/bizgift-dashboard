import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.demo';
import SalesDashboard from './pages/SalesDashboard';

/**
 * Simplified App - Demo Mode Only
 * Direct link access without login/password
 * 
 * Usage:
 * - https://bizgift-dashboard.vercel.app/?role=super-admin
 * - https://bizgift-dashboard.vercel.app/?role=admin
 * - https://bizgift-dashboard.vercel.app/?role=manager
 */
const App: React.FC = () => {
    const { profile, loading } = useAuth();
    const isApiConfigured = !!import.meta.env.VITE_API_URL;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm">Загрузка...</p>
                </div>
            </div>
        );
    }

    // Show setup instructions if API not configured
    if (!isApiConfigured) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="max-w-2xl bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">⚙️</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Требуется настройка API</h1>
                        <p className="text-slate-400">Переменные окружения не настроены в Vercel</p>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-4 mb-6">
                        <p className="text-sm text-slate-400 mb-3">Добавьте в Vercel → Settings → Environment Variables:</p>
                        <div className="space-y-2 font-mono text-sm">
                            <div className="flex">
                                <span className="text-blue-400 w-40">VITE_API_URL</span>
                                <span className="text-slate-500">=</span>
                                <span className="text-green-400 ml-2">https://script.google.com/...</span>
                            </div>
                            <div className="flex">
                                <span className="text-blue-400 w-40">VITE_API_KEY</span>
                                <span className="text-slate-500">=</span>
                                <span className="text-green-400 ml-2">your-api-key</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                        <p className="text-amber-400 text-sm">
                            <strong>Важно:</strong> После добавления переменных необходимо сделать <strong>Redeploy</strong> в Vercel.
                        </p>
                    </div>

                    <div className="text-center">
                        <p className="text-slate-500 text-sm">
                            Текущая роль: <span className="text-white font-medium">{profile?.role}</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Demo Mode Indicator */}
            <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm font-medium">
                Demo Mode | Роль: <span className="font-bold">{profile?.role}</span> | {profile?.displayName}
            </div>

            <Routes>
                {/* All routes lead to dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<SalesDashboard />} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </div>
    );
};

export default App;

