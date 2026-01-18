import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Briefcase, TrendingUp, Filter,
    LayoutDashboard, List, Calculator, Menu, ArrowDown,
    Wallet, Coins, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Manager, Deal, KpiActivity } from '../types/sales';
import { CONFIG, calcManagerIncome, calcDealBonus } from '../utils/salaryCalc';
import { generateData } from '../utils/mockSalesData';

const formatMoney = (val: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
const formatPercent = (val: number) => (val * 100).toFixed(1) + '%';

const SalesDashboard: React.FC = () => {
    const { logout, profile } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState<{ managers: Manager[], deals: Deal[], kpi: Record<number, KpiActivity> } | null>(null);
    const [managerFilter, setManagerFilter] = useState<number | 'all'>('all');
    const [dateFrom, setDateFrom] = useState('2025-10-01');
    const [dateTo, setDateTo] = useState('2025-11-25');
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => { setData(generateData()); }, []);

    const currentDeals = useMemo(() => {
        if (!data) return [];
        return data.deals.filter(d => {
            const managerMatch = managerFilter === 'all' || d.manager_id === managerFilter;
            const dateMatch = d.created_at >= dateFrom && d.created_at <= dateTo;
            return managerMatch && dateMatch;
        });
    }, [data, managerFilter, dateFrom, dateTo]);

    const stats = useMemo(() => {
        const successful = currentDeals.filter(d => d.stage === 'Сделка успешна');
        const volume = successful.reduce((acc, val) => acc + val.amount, 0);
        const margin = successful.reduce((acc, val) => acc + val.margin_value, 0);
        const marginPercent = volume > 0 ? (margin / volume) * 100 : 0;
        const avgCheck = successful.length ? volume / successful.length : 0;
        return { volume, margin, marginPercent, avgCheck, successfulCount: successful.length };
    }, [currentDeals]);

    const managersRating = useMemo(() => {
        if (!data || !currentDeals) return [];
        return data.managers.map(m =>
            calcManagerIncome(m, currentDeals.filter(d => d.manager_id === m.manager_id), data.kpi[m.manager_id], dateFrom, dateTo)
        ).sort((a, b) => b.stats.marginVolume - a.stats.marginVolume);
    }, [data, currentDeals, dateFrom, dateTo]);

    const handleLogout = async () => { await logout(); navigate('/'); };

    if (!data) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Загрузка данных...</p>
                </div>
            </div>
        );
    }

    const currentManager = managerFilter === 'all' ? null : managersRating.find(r => r.manager.manager_id === managerFilter);

    const renderManagerDetail = () => {
        if (!currentManager) return null;
        return (
            <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setManagerFilter('all')} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                            <ArrowDown className="rotate-90" size={20} />
                        </button>
                        <div className={`w-16 h-16 rounded-full ${currentManager.manager.avatar_color} flex items-center justify-center text-white font-bold text-2xl shadow-md`}>
                            {currentManager.manager.manager_name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{currentManager.manager.manager_name}</h2>
                            <p className="text-slate-500">Расчетный лист</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500 uppercase">Итого к выплате</p>
                        <p className="text-4xl font-bold text-emerald-600">{formatMoney(currentManager.totalIncome)}</p>
                    </div>
                </div>

                {/* 1. Fix Salary */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                        <Briefcase size={18} className="text-slate-500" />
                        <h3 className="font-bold text-slate-700">1. Оклад (Фиксированная часть)</h3>
                    </div>
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex justify-between mb-2 text-sm">
                                <span className="text-slate-600">Отработано дней</span>
                                <span className="font-bold">{currentManager.fixDetails.workedDays} дн.</span>
                            </div>
                            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                                <div className="bg-slate-800 h-full rounded-full" style={{ width: `${Math.min(100, (currentManager.fixDetails.workedDays / CONFIG.NORM_WORKING_DAYS) * 100)}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Расчет: ({CONFIG.FIX_SALARY_BASE} ₽ / {CONFIG.NORM_WORKING_DAYS} дн.) × {currentManager.fixDetails.workedDays}</p>
                        </div>
                        <div className="text-right min-w-[150px]">
                            <p className="text-xs text-slate-400">Начислено</p>
                            <p className="text-2xl font-bold text-slate-800">{formatMoney(currentManager.fix)}</p>
                        </div>
                    </div>
                </div>

                {/* 2. KPI Flex */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <List size={18} className="text-indigo-600" />
                            <h3 className="font-bold text-indigo-900">2. Гибкая часть KPI</h3>
                        </div>
                        <div className="text-sm font-medium text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                            {formatMoney(currentManager.kpi.total)} / 25 000 ₽
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 font-medium w-1/3">Показатель</th>
                                    <th className="p-4 font-medium">Правило</th>
                                    <th className="p-4 font-medium">Факт</th>
                                    <th className="p-4 font-medium text-right">Начислено</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                <tr>
                                    <td className="p-4 text-slate-700 font-medium">Звонки {'>'} 30 сек</td>
                                    <td className="p-4 text-slate-500 text-xs">5 ₽ / звонок (до 5000)</td>
                                    <td className="p-4 font-mono">{currentManager.kpi.details.callsBonusRaw / 5} шт</td>
                                    <td className="p-4 text-right font-bold">{formatMoney(currentManager.kpi.details.callsBonus)}</td>
                                </tr>
                                <tr>
                                    <td className="p-4 text-slate-700 font-medium">Отправленные КП</td>
                                    <td className="p-4 text-slate-500 text-xs">125 ₽ / КП (до 5000)</td>
                                    <td className="p-4 font-mono">{currentManager.kpi.details.offersBonusRaw / 125} шт</td>
                                    <td className="p-4 text-right font-bold">{formatMoney(currentManager.kpi.details.offersBonus)}</td>
                                </tr>
                                <tr>
                                    <td className="p-4 text-slate-700 font-medium">Конверсия (Потребн. → КП)</td>
                                    <td className="p-4 text-slate-500 text-xs">{'>'} 90% (фикс 5000)</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${currentManager.kpi.details.convNeeds >= 0.9 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {formatPercent(currentManager.kpi.details.convNeeds)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold">{formatMoney(currentManager.kpi.details.convNeedsBonus)}</td>
                                </tr>
                                <tr>
                                    <td className="p-4 text-slate-700 font-medium">Конверсия (КП → Согл.)</td>
                                    <td className="p-4 text-slate-500 text-xs">{'>'} 25% (фикс 5000)</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${currentManager.kpi.details.convAgreed >= 0.25 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {formatPercent(currentManager.kpi.details.convAgreed)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold">{formatMoney(currentManager.kpi.details.convAgreedBonus)}</td>
                                </tr>
                                <tr>
                                    <td className="p-4 text-slate-700 font-medium">Маржинальные сделки</td>
                                    <td className="p-4 text-slate-500 text-xs">1000 ₽ / сделка {'>'}35%</td>
                                    <td className="p-4 font-mono">{currentManager.kpi.details.highMarginCount} шт</td>
                                    <td className="p-4 text-right font-bold">{formatMoney(currentManager.kpi.details.highMarginBonus)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Margin Bonus */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                        <Wallet size={18} className="text-emerald-600" />
                        <h3 className="font-bold text-emerald-900">3. Премия от маржи</h3>
                    </div>
                    <div className="p-6">
                        <div className="mb-6">
                            <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">Шкала премиального процента</p>
                            <div className="flex text-xs w-full rounded-lg overflow-hidden border border-slate-200">
                                <div className="bg-slate-100 p-2 text-center flex-1 border-r border-slate-200"><div className="text-slate-400 mb-1">{'<'}25%</div><div className="font-bold text-slate-600">2%</div></div>
                                <div className="bg-emerald-50 p-2 text-center flex-1 border-r border-emerald-100"><div className="text-emerald-600 mb-1">25-30%</div><div className="font-bold text-emerald-800">5-7%</div></div>
                                <div className="bg-emerald-100 p-2 text-center flex-1 border-r border-emerald-200"><div className="text-emerald-700 mb-1">30-40%</div><div className="font-bold text-emerald-900">7-10%</div></div>
                                <div className="bg-emerald-200 p-2 text-center flex-1 border-r border-emerald-300"><div className="text-emerald-800 mb-1">40-45%</div><div className="font-bold text-emerald-950">10-12%</div></div>
                                <div className="bg-emerald-300 p-2 text-center flex-1"><div className="text-emerald-900 mb-1">{'>'}45%</div><div className="font-bold text-emerald-950">12%</div></div>
                            </div>
                        </div>
                        <div className="overflow-x-auto mb-4 border rounded-lg">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold">
                                    <tr>
                                        <th className="p-3">Дата / Сделка</th>
                                        <th className="p-3 text-right">Сумма продаж</th>
                                        <th className="p-3 text-right">Маржа ₽</th>
                                        <th className="p-3 text-right">Маржа %</th>
                                        <th className="p-3 text-right">Прем %</th>
                                        <th className="p-3 text-right text-emerald-700 bg-emerald-50">Вознаграждение</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentManager.bonusDeals.slice(0, 10).map((d) => (
                                        <tr key={d.deal_id} className="hover:bg-slate-50">
                                            <td className="p-3"><div className="font-medium text-slate-700">{d.deal_name}</div><div className="text-slate-400 text-[10px]">{d.created_at}</div></td>
                                            <td className="p-3 text-right">{formatMoney(d.amount)}</td>
                                            <td className="p-3 text-right font-medium text-slate-700">{formatMoney(d.margin_value)}</td>
                                            <td className="p-3 text-right"><span className={`px-1.5 py-0.5 rounded ${d.margin_percent >= 0.35 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{formatPercent(d.margin_percent)}</span></td>
                                            <td className="p-3 text-right font-mono text-slate-600">{formatPercent(d.premPercent)}</td>
                                            <td className="p-3 text-right font-bold text-emerald-600 bg-emerald-50/30">{formatMoney(d.bonus)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-100 font-bold text-slate-700">
                                    <tr>
                                        <td className="p-3">ИТОГО ({currentManager.bonusDeals.length} сделок)</td>
                                        <td className="p-3 text-right">{formatMoney(currentManager.stats.salesVolume)}</td>
                                        <td className="p-3 text-right">{formatMoney(currentManager.stats.marginVolume)}</td>
                                        <td className="p-3 text-right text-slate-500">-</td>
                                        <td className="p-3 text-right text-slate-500">-</td>
                                        <td className="p-3 text-right text-emerald-700 bg-emerald-100">{formatMoney(currentManager.marginBonus)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 4. Result */}
                <div className="bg-slate-800 text-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div><h3 className="text-2xl font-bold mb-1 flex items-center gap-2"><Coins className="text-yellow-400" /> Итоговый результат</h3></div>
                        <div className="flex items-center gap-8 text-right">
                            <div className="hidden md:block"><p className="text-slate-400 text-xs uppercase mb-1">Оклад</p><p className="text-lg font-semibold">{formatMoney(currentManager.fix)}</p></div>
                            <div className="hidden md:block text-slate-600 font-light text-2xl">+</div>
                            <div className="hidden md:block"><p className="text-slate-400 text-xs uppercase mb-1">KPI</p><p className="text-lg font-semibold text-indigo-300">{formatMoney(currentManager.kpi.total)}</p></div>
                            <div className="hidden md:block text-slate-600 font-light text-2xl">+</div>
                            <div className="hidden md:block"><p className="text-slate-400 text-xs uppercase mb-1">Бонусы</p><p className="text-lg font-semibold text-emerald-300">{formatMoney(currentManager.marginBonus)}</p></div>
                            <div className="bg-white/10 p-4 rounded-lg border border-white/10 min-w-[200px]">
                                <p className="text-slate-300 text-xs uppercase font-bold mb-1">К ВЫПЛАТЕ</p>
                                <p className="text-3xl font-bold text-white">{formatMoney(currentManager.totalIncome)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderManagersList = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 mb-6">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Filter size={16} /> Период расчета:</span>
                <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <span className="text-slate-400">→</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {managersRating.map((rating) => (
                    <div key={rating.manager.manager_id} onClick={() => setManagerFilter(rating.manager.manager_id)} className="cursor-pointer bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full ${rating.manager.avatar_color} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>{rating.manager.manager_name.charAt(0)}</div>
                                <div><h3 className="font-bold text-slate-800">{rating.manager.manager_name}</h3><p className="text-xs text-slate-500">На руки</p></div>
                                <div className="ml-auto text-right"><p className="font-bold text-emerald-600 text-xl">{formatMoney(rating.totalIncome)}</p></div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">Оклад</span><span className="font-medium">{formatMoney(rating.fix)}</span></div>
                            <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">KPI Flex</span><span className="font-medium text-indigo-600">{formatMoney(rating.kpi.total)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Бонус</span><span className="font-medium text-blue-600">{formatMoney(rating.marginBonus)}</span></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderDeals = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Filter size={16} /> Период:</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <span className="text-slate-400">→</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-medium">Дата / Название</th>
                                <th className="p-4 font-medium">Менеджер</th>
                                <th className="p-4 font-medium">Статус</th>
                                <th className="p-4 font-medium text-right">Сумма</th>
                                <th className="p-4 font-medium text-right">Маржа ₽</th>
                                <th className="p-4 font-medium text-right">Маржа %</th>
                                <th className="p-4 font-medium text-right">Бонус ₽</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentDeals.slice(0, 50).map((deal) => {
                                const bonus = deal.stage === 'Сделка успешна' ? calcDealBonus(deal) : 0;
                                return (
                                    <tr key={deal.deal_id} className="hover:bg-slate-50">
                                        <td className="p-4"><div className="font-medium text-slate-800">{deal.deal_name}</div><div className="text-slate-500 text-xs">{deal.created_at}</div></td>
                                        <td className="p-4 text-slate-600">{deal.manager_name}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${deal.stage === 'Сделка успешна' ? 'bg-green-100 text-green-700' : deal.stage === 'Провал' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{deal.stage}</span></td>
                                        <td className="p-4 text-right text-slate-700 font-medium">{formatMoney(deal.amount)}</td>
                                        <td className="p-4 text-right text-emerald-600">{formatMoney(deal.margin_value)}</td>
                                        <td className="p-4 text-right"><span className={`${deal.margin_percent >= 0.35 ? 'text-green-600 font-bold' : 'text-slate-600'}`}>{(deal.margin_percent * 100).toFixed(1)}%</span></td>
                                        <td className="p-4 text-right font-bold text-indigo-600">{bonus > 0 ? formatMoney(bonus) : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-wrap items-center gap-4">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Filter size={16} /> Период:</span>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    <span className="text-slate-400">→</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm"><p className="text-slate-500 text-xs font-semibold uppercase">Объем продаж</p><h3 className="text-xl font-bold text-slate-800 mt-1">{formatMoney(stats.volume)}</h3></div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm"><p className="text-slate-500 text-xs font-semibold uppercase">Маржа</p><h3 className="text-xl font-bold text-emerald-600 mt-1">{formatMoney(stats.margin)}</h3></div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm"><p className="text-slate-500 text-xs font-semibold uppercase">Рентабельность</p><h3 className="text-xl font-bold text-slate-800 mt-1">{stats.marginPercent.toFixed(1)}%</h3></div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm"><p className="text-slate-500 text-xs font-semibold uppercase">Успешных сделок</p><h3 className="text-xl font-bold text-slate-800 mt-1">{stats.successfulCount}</h3></div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Результаты менеджеров</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 rounded-lg">
                            <tr><th className="p-3 rounded-l-lg">Менеджер</th><th className="p-3 text-right">Выручка</th><th className="p-3 text-right">Маржа</th><th className="p-3 text-right">Сделок</th><th className="p-3 text-right rounded-r-lg">Зарплата</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {managersRating.map((rating) => (
                                <tr key={rating.manager.manager_id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setManagerFilter(rating.manager.manager_id); setActiveTab('managers'); }}>
                                    <td className="p-3 flex items-center gap-3"><div className={`w-8 h-8 rounded-full ${rating.manager.avatar_color} flex items-center justify-center text-white text-xs font-bold`}>{rating.manager.manager_name.charAt(0)}</div><span className="font-medium text-slate-700">{rating.manager.manager_name}</span></td>
                                    <td className="p-3 text-right text-slate-600">{formatMoney(rating.stats.salesVolume)}</td>
                                    <td className="p-3 text-right font-medium text-emerald-600">{formatMoney(rating.stats.marginVolume)}</td>
                                    <td className="p-3 text-right text-slate-600">{rating.stats.dealsCount}</td>
                                    <td className="p-3 text-right font-bold text-slate-800">{formatMoney(rating.totalIncome)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'managers': return managerFilter !== 'all' ? renderManagerDetail() : renderManagersList();
            case 'deals': return renderDeals();
            default: return renderOverview();
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-white transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-2xl md:shadow-none flex flex-col`}>
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50"><TrendingUp size={18} className="text-white" /></div>
                    <h1 className="text-xl font-bold tracking-tight">Sales <span className="text-blue-500">BIZGIFT</span></h1>
                </div>
                <div className="px-4 py-6 space-y-1 flex-1">
                    {[{ id: 'overview', label: 'Продажи', icon: LayoutDashboard }, { id: 'managers', label: 'Менеджеры', icon: Users }, { id: 'deals', label: 'Сделки', icon: List }, { id: 'kpi', label: 'KPI Мотивация', icon: Calculator }].map((item) => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setManagerFilter('all'); if (window.innerWidth < 768) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><item.icon size={18} />{item.label}</button>
                    ))}
                </div>
                <div className="p-6 border-t border-slate-700">
                    <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">{profile?.displayName?.charAt(0) || 'U'}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{profile?.displayName || 'User'}</p><p className="text-xs text-slate-400 truncate">{profile?.email}</p></div></div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"><LogOut size={16} />Выйти</button>
                </div>
            </aside>
            {/* Main */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
                <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg"><Menu size={20} className="text-slate-600" /></button>
                        <h2 className="text-xl font-bold text-slate-800 hidden md:block">{activeTab === 'overview' ? 'Отдел продаж: Сводка' : activeTab === 'managers' ? 'Эффективность команды' : activeTab === 'deals' ? 'Реестр сделок' : 'Расчет мотивации'}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <select className="bg-slate-100 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 outline-none" value={managerFilter} onChange={(e) => setManagerFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                            <option value="all">Все менеджеры</option>
                            {data?.managers.map(m => <option key={m.manager_id} value={m.manager_id}>{m.manager_name}</option>)}
                        </select>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-4 md:p-8"><div className="max-w-7xl mx-auto">{renderContent()}</div></div>
            </main>
        </div>
    );
};

export default SalesDashboard;
