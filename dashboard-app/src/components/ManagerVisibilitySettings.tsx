import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Users, Save, RefreshCw } from 'lucide-react';
import type { Manager } from '../types/api';

interface ManagerVisibilitySettingsProps {
    managers: Manager[];
    onSettingsChange?: (visibleIds: Set<number>) => void;
}

const STORAGE_KEY = 'dashboard_manager_visibility';

export const ManagerVisibilitySettings: React.FC<ManagerVisibilitySettingsProps> = ({
    managers,
    onSettingsChange
}) => {
    const [visibleManagers, setVisibleManagers] = useState<Set<number>>(new Set());
    const [saved, setSaved] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as number[];
                setVisibleManagers(new Set(parsed));
            } catch (e) {
                // If parse fails, show all managers
                setVisibleManagers(new Set(managers.map(m => m.manager_id)));
            }
        } else {
            // Default: show all managers
            setVisibleManagers(new Set(managers.map(m => m.manager_id)));
        }
    }, [managers]);

    // Notify parent component of changes
    useEffect(() => {
        onSettingsChange?.(visibleManagers);
    }, [visibleManagers, onSettingsChange]);

    const toggleManager = (managerId: number) => {
        const newSet = new Set(visibleManagers);
        if (newSet.has(managerId)) {
            newSet.delete(managerId);
        } else {
            newSet.add(managerId);
        }
        setVisibleManagers(newSet);
        setSaved(false);
    };

    const saveSettings = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visibleManagers)));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const selectAll = () => {
        setVisibleManagers(new Set(managers.map(m => m.manager_id)));
        setSaved(false);
    };

    const deselectAll = () => {
        setVisibleManagers(new Set());
        setSaved(false);
    };

    const visibleCount = visibleManagers.size;
    const totalCount = managers.length;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Видимость менеджеров</h1>
                            <p className="text-sm text-slate-500">Управление отображением менеджеров в дашборде</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{visibleCount}/{totalCount}</div>
                        <div className="text-xs text-slate-500">отображается</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={selectAll}
                        className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition-all flex items-center gap-2"
                    >
                        <Eye size={16} />
                        Выбрать всех
                    </button>
                    <button
                        onClick={deselectAll}
                        className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-all flex items-center gap-2"
                    >
                        <EyeOff size={16} />
                        Скрыть всех
                    </button>
                    <button
                        onClick={saveSettings}
                        disabled={saved}
                        className={`ml-auto px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${saved
                            ? 'bg-emerald-500 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                            }`}
                    >
                        {saved ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Сохранено!
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Сохранить настройки
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Managers List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-bold text-slate-800 text-sm">Список менеджеров</h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {managers.map((manager) => {
                        const mid = Number(manager.manager_id);
                        const isVisible = visibleManagers.has(mid);
                        return (
                            <div
                                key={mid}
                                className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${!isVisible ? 'opacity-50' : ''
                                    }`}
                                onClick={() => toggleManager(mid)}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${manager.avatar_color || 'bg-slate-600'
                                            }`}
                                    >
                                        {manager.manager_name?.charAt(0) || 'M'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{manager.manager_name}</p>
                                        <p className="text-xs text-slate-500">ID: {manager.manager_id}</p>
                                    </div>
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <span className={`text-sm font-medium ${isVisible ? 'text-green-600' : 'text-slate-400'}`}>
                                        {isVisible ? 'Отображается' : 'Скрыт'}
                                    </span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={isVisible}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleManager(mid);
                                            }}
                                            className="sr-only"
                                        />
                                        <div
                                            className={`w-14 h-8 rounded-full transition-all ${isVisible ? 'bg-green-500' : 'bg-slate-300'
                                                }`}
                                        >
                                            <div
                                                className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isVisible ? 'translate-x-7' : 'translate-x-1'
                                                    } mt-1`}
                                            />
                                        </div>
                                    </div>
                                </label>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <div className="text-amber-600 shrink-0">ℹ️</div>
                <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Как это работает:</p>
                    <ul className="list-disc ml-4 space-y-1 text-xs">
                        <li>Скрытые менеджеры не будут отображаться в дашборде (разделы "Продажи" и "Менеджеры")</li>
                        <li>Их данные будут полностью исключены из всех расчетов и статистики</li>
                        <li>Настройки сохраняются локально в браузере</li>
                        <li>Не забудьте нажать "Сохранить настройки" после изменений</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};


