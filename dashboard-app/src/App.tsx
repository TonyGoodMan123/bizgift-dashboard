import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import SalesDashboard from './pages/SalesDashboard';
import DashboardLayout from './components/DashboardLayout';
import AdminPanel from './components/AdminPanel';

/**
 * Main Application Component
 * Routes:
 * - / → Login page
 * - /dashboard → Sales Dashboard (restored original functionality)
 * - /admin → Admin Panel (user management)
 */
const App: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm">Загрузка приложения...</p>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/"
                element={user && profile ? <Navigate to="/dashboard" replace /> : <Login />}
            />
            <Route
                path="/register"
                element={user && profile ? <Navigate to="/dashboard" replace /> : <Login />}
            />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                {/* Main Sales Dashboard - full functionality restored */}
                <Route path="/dashboard" element={<SalesDashboard />} />

                {/* Admin Panel - with layout */}
                <Route element={<DashboardLayout />}>
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['super-admin', 'admin']}>
                                <AdminPanel />
                            </ProtectedRoute>
                        }
                    />
                </Route>
            </Route>

            {/* 404 Route */}
            <Route
                path="*"
                element={
                    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                        <div className="text-center">
                            <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
                            <p className="text-slate-400 text-lg mb-6">Страница не найдена</p>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                            >
                                На главную
                            </button>
                        </div>
                    </div>
                }
            />
        </Routes>
    );
};

export default App;
