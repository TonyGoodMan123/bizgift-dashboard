import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Lock, Mail, AlertCircle, TrendingUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isRegisterPage = location.pathname === '/register';
    const [isLogin, setIsLogin] = useState(!isRegisterPage);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(''); // Only for registration

    useEffect(() => {
        setIsLogin(location.pathname !== '/register');
    }, [location.pathname]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                if (name) {
                    await updateProfile(userCredential.user, {
                        displayName: name
                    });
                }
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Неверный email или пароль');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Этот email уже зарегистрирован. Войдите в систему.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Слишком много попыток. Попробуйте позже.');
            } else if (err.code === 'auth/weak-password') {
                setError('Пароль должен содержать минимум 6 символов');
            } else {
                setError('Ошибка авторизации. Попробуйте позже.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="mb-8 flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
                    <TrendingUp size={28} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                    Sales Dashboard <span className="text-blue-500">BIZGIFT</span>
                </h1>
            </div>

            <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isLogin ? 'Вход в систему' : 'Регистрация'}
                    </h2>
                    <p className="text-slate-400">
                        {isLogin ? 'Введите учетные данные для доступа' : 'Создайте новый аккаунт сотрудника'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-900/30 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-200 text-sm">
                        <AlertCircle className="shrink-0 text-red-400" size={18} />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="text-sm font-medium text-slate-300 ml-1">Имя и Фамилия</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Aa</span>
                                <input
                                    type="text"
                                    required={!isLogin}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                    placeholder="Иван Петров"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                placeholder="admin@bizgift.ru"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            'Войти'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            if (isLogin) {
                                navigate('/register');
                            } else {
                                navigate('/');
                            }
                            setError(null);
                        }}
                        className="text-slate-400 text-sm hover:text-white transition-colors"
                    >
                        {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                        <span className="text-blue-500 font-bold hover:underline">
                            {isLogin ? 'Зарегистрироваться' : 'Войти'}
                        </span>
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700 text-center">
                    <p className="text-xs text-slate-500 italic">
                        BizGift Sales Platform Dashboard v1.1
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
