import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.demo'; // DEMO VERSION
import SalesDashboard from './pages/SalesDashboard';
import AdminPanel from './components/AdminPanel';

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
            {/* Demo Mode Banner */}
            <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-bold">
                🔧 DEMO РЕЖИМ | Роль: {profile?.role} | {profile?.displayName}
            </div>

            <Routes>
                {/* Default route based on role */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Dashboard */}
                <Route path="/dashboard" element={<SalesDashboard />} />

                {/* Admin Panel (only for admin and super-admin) */}
                <Route
                    path="/admin"
                    element={
                        profile?.role === 'super-admin' || profile?.role === 'admin'
                            ? <AdminPanel />
                            : <Navigate to="/dashboard" replace />
                    }
                />

                {/* Demo role switcher routes */}
                <Route path="/demo/super-admin" element={<Navigate to="/?role=super-admin" replace />} />
                <Route path="/demo/admin" element={<Navigate to="/?role=admin" replace />} />
                <Route path="/demo/manager" element={<Navigate to="/?role=manager" replace />} />

                {/* 404 */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </div>
    );
};

export default App;
