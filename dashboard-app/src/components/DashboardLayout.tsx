import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Calculator,
    Shield,
    Settings,
    LogOut,
    TrendingUp,
    Menu,
    X
} from 'lucide-react';

/**
 * Dashboard Layout Component
 * Provides navigation sidebar and header for authenticated pages
 */
const DashboardLayout: React.FC = () => {
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleLogout = async () => {
        const { signOut } = await import('firebase/auth');
        const { auth } = await import('../services/firebase');
        await signOut(auth);
        navigate('/');
    };

    const navItems = [
        {
            to: '/dashboard',
            icon: LayoutDashboard,
            label: 'Dashboard',
            allowedRoles: ['super-admin', 'admin', 'manager']
        },
        {
            to: '/managers',
            icon: Users,
            label: 'Менеджеры',
            allowedRoles: ['super-admin', 'admin', 'manager']
        },
        {
            to: '/calculations',
            icon: Calculator,
            label: 'Расчёты',
            allowedRoles: ['super-admin', 'admin', 'manager']
        },
        {
            to: '/admin',
            icon: Shield,
            label: 'Управление доступом',
            allowedRoles: ['super-admin', 'admin']
        },
        {
            to: '/settings',
            icon: Settings,
            label: 'Настройки',
            allowedRoles: ['super-admin', 'admin', 'manager']
        }
    ];

    const filteredNavItems = navItems.filter(item =>
        item.allowedRoles.includes(profile?.role ?? 'manager')
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <TrendingUp size={20} className="text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-slate-800">
                                BizGift <span className="text-blue-600">Dashboard</span>
                            </h1>
                        </div>
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-800">{profile?.displayName}</p>
                            <p className="text-xs text-slate-500 capitalize">{profile?.role?.replace('-', ' ')}</p>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                            {profile?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`
                        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                        lg:translate-x-0
                        fixed lg:static inset-y-0 left-0 z-30
                        w-64 bg-white border-r border-slate-200
                        transition-transform duration-300 ease-in-out
                        mt-[57px] lg:mt-0
                    `}
                >
                    <nav className="p-4 space-y-2">
                        {filteredNavItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }`
                                    }
                                >
                                    <Icon size={20} />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}

                        <div className="pt-4 border-t border-slate-200">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-all"
                            >
                                <LogOut size={20} />
                                <span>Выйти</span>
                            </button>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-h-screen">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default DashboardLayout;
