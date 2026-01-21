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
