import React, { useState, useEffect } from 'react';
import {
    Users, UserPlus, Shield, ShieldAlert, ShieldCheck,
    Trash2, Mail, Info, AlertTriangle, Eye
} from 'lucide-react';
import {
    collection, query, getDocs, doc, updateDoc,
    setDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext.demo';
import { INITIAL_USERS } from '../config/users.config';
import { ManagerVisibilitySettings } from './ManagerVisibilitySettings';
import { useDashboardData } from '../hooks/useDashboardData';

interface UserProfile {
    uid: string;
    email: string;
    role: 'super-admin' | 'admin' | 'manager';
    displayName: string;
}

type AdminTab = 'users' | 'managers';

const AdminPanel: React.FC = () => {
    const { profile: currentProfile } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTab>('users');

    // Fetch managers data for the visibility settings
    const { managers: managerData } = useDashboardData({ from: '', to: '' });

    // Form states for adding new user
    const [newEmail, setNewEmail] = useState('');
    const [newDisplayName, setNewDisplayName] = useState('');
    const [newPassword, setNewPassword] = useState(''); // NEW: Password field
    const [newRole, setNewRole] = useState<'admin' | 'manager'>('manager');
    const [isAdding, setIsAdding] = useState(false);

    // State for Password Reset
    const [resetPasswordUid, setResetPasswordUid] = useState<string | null>(null);
    const [resetNewPassword, setResetNewPassword] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'users'));
            const querySnapshot = await getDocs(q);
            const userList: UserProfile[] = [];
            querySnapshot.forEach((doc: import('firebase/firestore').QueryDocumentSnapshot) => {
                userList.push({ uid: doc.id, ...doc.data() } as UserProfile);
            });
            setUsers(userList);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError('Ошибка при загрузке списка пользователей');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdateRole = async (uid: string, newRole: 'admin' | 'manager' | 'super-admin') => {
        if (newRole === 'super-admin' && currentProfile?.role !== 'super-admin') {
            setError('Только Super-Admin может назначать других Super-Admin');
            return;
        }

        const targetUser = users.find((u: UserProfile) => u.uid === uid);
        if (targetUser?.role === 'super-admin' && currentProfile?.role !== 'super-admin') {
            setError('Вы не можете изменять роль Super-Admin');
            return;
        }

        try {
            await updateDoc(doc(db, 'users', uid), {
                role: newRole,
                updatedAt: serverTimestamp()
            });
            setSuccess('Роль успешно обновлена');
            fetchUsers();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Ошибка при обновлении роли');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    password: newPassword,
                    displayName: newDisplayName,
                    role: newRole
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Ошибка сервера');

            setSuccess(`Пользователь ${newEmail} успешно создан`);
            setNewEmail('');
            setNewDisplayName('');
            setNewPassword('');
            setIsAdding(false);
            // Wait a bit for Firestore to propagate
            setTimeout(fetchUsers, 1000);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Ошибка при добавлении пользователя');
        }
    };

    const handleResetPassword = async (uid: string) => {
        if (!resetNewPassword) {
            setError('Введите новый пароль');
            return;
        }

        try {
            const response = await fetch('/api/users/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid,
                    newPassword: resetNewPassword
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Ошибка сервера');

            setSuccess('Пароль успешно изменен');
            setResetPasswordUid(null);
            setResetNewPassword('');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Ошибка смены пароля');
        }
    };

    const handleDeleteUser = async (uid: string) => {
        const targetUser = users.find((u: UserProfile) => u.uid === uid);
        if (targetUser?.role === 'super-admin') {
            setError('Super-Admin не может быть удален');
            return;
        }

        if (window.confirm(`Вы уверены, что хотите удалить пользователя ${targetUser?.email}?`)) {
            try {
                const response = await fetch(`/api/users/delete?uid=${uid}`, {
                    method: 'DELETE'
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Ошибка сервера');

                setSuccess('Пользователь удален');
                // Wait for propagation
                setTimeout(fetchUsers, 1000);
                setTimeout(() => setSuccess(null), 3000);
            } catch (err: any) {
                setError(err.message || 'Ошибка при удалении');
            }
        }
    };

    // Seed initial users if list is empty (helper for the USER)
    const seedInitialUsers = async () => {
        if (currentProfile?.role !== 'super-admin') return;

        try {
            setLoading(true);
            for (const u of INITIAL_USERS) {
                // We use a query to avoid duplicates if possible, or just overwrite for the seed
                // In real app, we search by email
                await setDoc(doc(db, 'users_init', u.email.replace(/\./g, '_')), {
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    seededAt: serverTimestamp()
                });
            }
            setSuccess('Данные для инициализации пользователей созданы. При входе им будут назначены роли.');
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            setError('Ошибка инициализации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-2 md:p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Tab Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <Shield size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Панель администратора</h1>
                        <p className="text-sm text-slate-500">Управление доступом и настройками дашборда</p>
                    </div>
                </div>

                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        <Shield size={16} />
                        Пользователи
                    </button>
                    <button
                        onClick={() => setActiveTab('managers')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'managers'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        <Eye size={16} />
                        Менеджеры
                    </button>
                </div>
            </div>

            {/* Conditional Content Based on Active Tab */}
            {activeTab === 'users' ? (
                <>
                    {/* User Management Section - Original Content */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
                                <Shield size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Управление доступом</h2>
                                <p className="text-sm text-slate-500">Добавление пользователей и управление ролями</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {users.length === 0 && currentProfile?.role === 'super-admin' && (
                                <button
                                    onClick={seedInitialUsers}
                                    className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-all flex items-center gap-2"
                                >
                                    <Info size={16} /> Инициализировать список
                                </button>
                            )}
                            <button
                                onClick={() => setIsAdding(!isAdding)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                            >
                                <UserPlus size={18} /> Добавить пользователя
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-in shake duration-500">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700">×</button>
                        </div>
                    )}

                    {success && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 animate-in zoom-in duration-300">
                            <ShieldCheck size={20} className="shrink-0" />
                            <p className="text-sm font-medium">{success}</p>
                            <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-700">×</button>
                        </div>
                    )}

                    {/* Add User Form */}
                    {isAdding && (
                        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xl animate-in zoom-in duration-300">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <UserPlus size={20} className="text-blue-600" />
                                Новый пользователь
                            </h2>
                            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="example@gmail.com"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Имя</label>
                                    <input
                                        type="text"
                                        required
                                        value={newDisplayName}
                                        onChange={(e) => setNewDisplayName(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Имя Фамилия"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Пароль</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Минимум 6 символов"
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Роль</label>
                                    <select
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value as any)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                    >
                                        <option value="manager">Менеджер</option>
                                        <option value="admin">Администратор</option>
                                    </select>
                                </div>
                                <div className="flex items-end gap-2">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
                                    >
                                        Сохранить
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </form>
                            <p className="text-[10px] text-slate-400 mt-4 italic">
                                * После добавления, пользователь должен зайти в систему под этим email. При первом входе ему будет автоматически назначена роль.
                            </p>
                        </div>
                    )}

                    {/* Users Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <Users size={20} className="text-indigo-600" />
                                Список пользователей
                            </h2>
                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">{users.length} чел.</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Пользователь</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Роль</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                                Загрузка списка пользователей...
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                                Пользователи не найдены. Используйте кнопку "Добавить пользователя".
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user: UserProfile) => (
                                            <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${user.role === 'super-admin' ? 'bg-indigo-600' :
                                                            user.role === 'admin' ? 'bg-blue-600' : 'bg-slate-600'
                                                            }`}>
                                                            {user.displayName?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{user.displayName || 'Без имени'}</p>
                                                            {user.uid.startsWith('invited_') && (
                                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Ожидает входа</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                        <Mail size={14} className="text-slate-400" />
                                                        {user.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {user.role === 'super-admin' ? (
                                                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-indigo-200">
                                                                <ShieldAlert size={12} /> Super-Admin
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={user.role}
                                                                onChange={(e) => handleUpdateRole(user.uid, e.target.value as any)}
                                                                disabled={(user.role as string) === 'super-admin' && currentProfile?.role !== 'super-admin'}
                                                                className="bg-slate-100 border-none rounded-lg px-3 py-1 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-200 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <option value="manager">Manager</option>
                                                                <option value="admin">Admin</option>
                                                                {currentProfile?.role === 'super-admin' && <option value="super-admin">Super-Admin</option>}
                                                            </select>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {user.role !== 'super-admin' && (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => setResetPasswordUid(user.uid)}
                                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                title="Сменить пароль"
                                                            >
                                                                <Shield size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(user.uid)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Удалить пользователя"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Safety Info */}
                    <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <Info size={20} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-blue-900">Инструкция по управлению ролями</p>
                            <ul className="text-xs text-blue-700 space-y-1 mt-2 list-disc ml-4">
                                <li>Administrators могут управлять менеджерами и менять их роли.</li>
                                <li>Только Super-Admin может менять роли других администраторов.</li>
                                <li>Если пользователя нет в списке, добавьте его по email. При первом входе он увидит интерфейс дашборда.</li>
                                <li>Редактирование профиля Super-Admin (Антон Федотов) заблокировано для всех уровней, кроме системного.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Reset Password Modal */}
                    {resetPasswordUid && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Shield size={20} className="text-blue-600" />
                                    Смена пароля
                                </h3>
                                <p className="text-sm text-slate-600 mb-4">
                                    Введите новый пароль для пользователя.
                                </p>
                                <input
                                    type="password"
                                    value={resetNewPassword}
                                    onChange={(e) => setResetNewPassword(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                                    placeholder="Новый пароль (минимум 6 симв.)"
                                    minLength={6}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleResetPassword(resetPasswordUid)}
                                        className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
                                    >
                                        Сменить пароль
                                    </button>
                                    <button
                                        onClick={() => {
                                            setResetPasswordUid(null);
                                            setResetNewPassword('');
                                        }}
                                        className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                // Manager Visibility Tab
                <ManagerVisibilitySettings managers={managerData} />
            )}
        </div>
    );
};

export default AdminPanel;
