import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: ('super-admin' | 'admin' | 'manager')[];
    children?: React.ReactNode;
}

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Optionally restricts based on user role
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
    const { user, profile, loading } = useAuth();

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

    // Not authenticated - redirect to login
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // Authenticated but no profile - show error or restricted state
    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md bg-slate-800 rounded-2xl p-8 border border-yellow-500/50 shadow-xl text-center">
                    <div className="w-16 h-16 bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Профиль не найден</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Ваш аккаунт еще не активирован администратором. Пожалуйста, свяжитесь с поддержкой.
                    </p>
                    <button
                        onClick={() => logout()}
                        className="px-6 py-2 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-all"
                    >
                        Выйти
                    </button>
                </div>
            </div>
        );
    }

    // Check role-based access if allowedRoles is specified
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md bg-slate-800 rounded-2xl p-8 border border-red-500/50 shadow-xl">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-8V7a4 4 0 10-8 0v2m0 0h8"
                                />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Доступ запрещён</h2>
                        <p className="text-slate-400 text-sm mb-6">
                            У вас нет прав для доступа к этой странице.
                        </p>
                        <button
                            onClick={() => window.history.back()}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                        >
                            Назад
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // User is authenticated and authorized
    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
