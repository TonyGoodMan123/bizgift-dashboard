import React, { useState } from 'react';
import { Users, TrendingUp, Phone, FileText, CheckCircle, Target, Search } from 'lucide-react';
import { useManagers } from '../hooks/useManagers';
import { useKPI } from '../hooks/useKPI';

/**
 * Managers Page
 * Detailed view of all managers and their performance
 */
const Managers: React.FC = () => {
    const [dateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });
    const [searchQuery, setSearchQuery] = useState('');

    const { managers, isLoading: managersLoading } = useManagers();
    const { kpiData, isLoading: kpiLoading } = useKPI({ dateFrom: dateRange.from, dateTo: dateRange.to });

    const isLoading = managersLoading || kpiLoading;

    const getManagerKPI = (managerId: number) => {
        return kpiData.find(k => k.manager_id === managerId);
    };

    const filteredManagers = managers.filter(m =>
        m.manager_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
                <div className="animate-pulse">
                    <div className="w-48 h-8 bg-slate-200 rounded mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-6 rounded-2xl h-64 animate-pulse"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Users className="text-purple-600" size={32} />
                        Менеджеры
                    </h1>
                    <p className="text-slate-600 text-sm mt-1">
                        Детальная статистика по менеджерам
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Поиск менеджера..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none w-64"
                    />
                </div>
            </div>

            {/* Manager Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredManagers.map((manager) => {
                    const kpi = getManagerKPI(manager.manager_id);

                    return (
                        <div key={manager.manager_id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all">
                            {/* Manager Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div
                                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                                    style={{ background: `linear-gradient(135deg, ${manager.avatar_color}, #6366f1)` }}
                                >
                                    {manager.manager_name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{manager.manager_name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${manager.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {manager.is_active ? 'Активен' : 'Неактивен'}
                                    </span>
                                </div>
                            </div>

                            {/* KPI Stats */}
                            {kpi && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Phone size={16} className="text-blue-600" />
                                            <span className="text-sm text-slate-600">Звонки &gt; 30 сек</span>
                                        </div>
                                        <span className="font-bold text-slate-800">{kpi.calls_30_sec_count}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-purple-600" />
                                            <span className="text-sm text-slate-600">КП отправлено</span>
                                        </div>
                                        <span className="font-bold text-slate-800">{kpi.offers_sent_count}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={16} className="text-green-600" />
                                            <span className="text-sm text-slate-600">КП согласовано</span>
                                        </div>
                                        <span className="font-bold text-slate-800">{kpi.offers_agreed_count}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Target size={16} className="text-orange-600" />
                                            <span className="text-sm text-slate-600">Потребности</span>
                                        </div>
                                        <span className="font-bold text-slate-800">{kpi.needs_count}</span>
                                    </div>
                                </div>
                            )}

                            {/* Conversion Rate */}
                            {kpi && kpi.offers_sent_count > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Конверсия КП</span>
                                        <div className="flex items-center gap-1">
                                            <TrendingUp size={16} className="text-green-600" />
                                            <span className="font-bold text-green-600">
                                                {((kpi.offers_agreed_count / kpi.offers_sent_count) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredManagers.length === 0 && (
                <div className="text-center py-12">
                    <Users size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Менеджеры не найдены</p>
                </div>
            )}
        </div>
    );
};

export default Managers;
