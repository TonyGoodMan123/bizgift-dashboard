import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, DollarSign, Briefcase, TrendingUp, Filter,
    LayoutDashboard, PieChart as PieIcon, List, Shield,
    Menu, ArrowRight, ShoppingCart, ArrowDown,
    Clock, XCircle, CheckCircle, Hourglass, Wallet, Info, Coins, LogOut, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { api } from '../services/api';
import type { Deal, KpiActivity, SalaryData } from '../types/api';
import {
    CONFIG, calcManagerIncome, calcPremPercent, calcDealBonus,
    calculateStats, calculateDealsSummary, getDealCycle, getDiff,
    formatMoney, formatPercent
} from '../utils/salaryCalc';
// import { generateData } from '../utils/mockSalesData'; // unused
import { Card } from '../components/Card';
import AdminPanel from '../components/AdminPanel';

const SalesDashboard: React.FC = () => {
    const { logout, profile } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
    const [managerFilter, setManagerFilter] = useState<number | 'all'>('all');
    const [dateFrom, setDateFrom] = useState('2025-11-01');
    const [dateTo, setDateTo] = useState('2025-11-30');
    const [compareDateFrom, setCompareDateFrom] = useState('2025-10-01');
    const [compareDateTo, setCompareDateTo] = useState('2025-10-31');
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    // Fetch primary data
    const {
        deals: fetchedDeals,
        managers: fetchedManagers,
        kpiData: fetchedKpi,
        isLoading: isMainLoading,
        error: mainError
    } = useDashboardData({ from: dateFrom, to: dateTo });

    // Fetch salary data (Source of Truth for financial results)
    const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
    const [, setIsSalaryLoading] = useState(false);

    useEffect(() => {
        // Don't fetch salary data if user is not authenticated
        if (!profile) {
            return;
        }

        const fetchSalaries = async () => {
            const currentMonth = dateFrom.substring(0, 7); // YYYY-MM
            setIsSalaryLoading(true);
            try {
                const results = await api.getSalary({ month: currentMonth });
                setSalaryData(results);
            } catch (err) {
                console.error('Failed to fetch salary data:', err);
            } finally {
                setIsSalaryLoading(false);
            }
        };
        fetchSalaries();
    }, [dateFrom, profile]);

    // Data normalization for component logic
    const data = useMemo(() => {
        if (isMainLoading || !fetchedManagers.length) return null;

        // Convert kpiData from array to Record<number, KpiActivity>
        const kpiMap: Record<number, KpiActivity> = {};
        fetchedKpi.forEach(k => {
            kpiMap[k.manager_id] = k;
        });

        return {
            managers: fetchedManagers.map(m => ({
                ...m,
                avatar_color: m.avatar_color || 'bg-blue-500' // Ensure fallback
            })),
            deals: fetchedDeals,
            kpi: kpiMap
        };
    }, [fetchedManagers, fetchedDeals, fetchedKpi, isMainLoading]);

    const getFilteredDeals = (deals: Deal[], start: string, end: string) => {
        return deals.filter(d => {
            const managerMatch = managerFilter === 'all' || d.manager_id === managerFilter;
            const dateMatch = d.created_at >= start && d.created_at <= end;
            return managerMatch && dateMatch;
        });
    };

    const currentDeals = useMemo(() => {
        if (!data) return [];
        return getFilteredDeals(data.deals, dateFrom, dateTo);
    }, [data, managerFilter, dateFrom, dateTo]);

    const comparisonDeals = useMemo(() => {
        if (!data) return [];
        return getFilteredDeals(data.deals, compareDateFrom, compareDateTo);
    }, [data, managerFilter, compareDateFrom, compareDateTo]);

    const stats = useMemo(() => currentDeals.length ? calculateStats(currentDeals) : null, [currentDeals]);
    const compareStats = useMemo(() => comparisonDeals.length ? calculateStats(comparisonDeals) : null, [comparisonDeals]);

    const changes = useMemo(() => {
        if (!stats || !compareStats) return null;
        return {
            volume: getDiff(stats.volume, compareStats.volume),
            cost: getDiff(stats.cost, compareStats.cost),
            margin: getDiff(stats.margin, compareStats.margin),
            marginPercent: getDiff(stats.marginPercentTotal, compareStats.marginPercentTotal),
            count: getDiff(stats.successfulCount, compareStats.successfulCount),
            avgCheck: getDiff(stats.avgCheck, compareStats.avgCheck)
        };
    }, [stats, compareStats]);

    const managersRating = useMemo(() => {
        if (!data) return [];
        return data.managers.map(m => {
            const income = calcManagerIncome(m as any, currentDeals.filter(d => d.manager_id === m.manager_id), data.kpi[m.manager_id], dateFrom, dateTo);

            // OVERRIDE WITH BACKEND SALARY IF AVAILABLE (ZERO DEVIATION PRINCIPLE)
            const backendSalary = salaryData.find(s => s.manager_id === m.manager_id);
            if (backendSalary) {
                return {
                    ...income,
                    fix: backendSalary.salary_fixed,
                    kpi: {
                        ...income.kpi,
                        total: backendSalary.kpi_calls_bonus + backendSalary.kpi_offers_bonus + backendSalary.kpi_conversion_bonus,
                        details: {
                            ...income.kpi.details,
                            callsBonus: backendSalary.kpi_calls_bonus,
                            offersBonus: backendSalary.kpi_offers_bonus,
                            convNeedsBonus: backendSalary.kpi_conversion_bonus,
                            // Note: margin bonus is handled separately in backend structure
                        }
                    },
                    marginBonus: backendSalary.kpi_margin_bonus,
                    totalIncome: backendSalary.salary_total
                };
            }
            return income;
        }).sort((a, b) => b.stats.marginVolume - a.stats.marginVolume);
    }, [data, currentDeals, salaryData, dateFrom, dateTo]);

    const dealsSummary = useMemo(() => {
        if (!currentDeals.length) return null;
        return calculateDealsSummary(currentDeals);
    }, [currentDeals]);

    const handleLogout = async () => { await logout(); navigate('/'); };

    if (isMainLoading && !data) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400 font-medium">Загрузка данных из Битрикс24...</p>
                </div>
            </div>
        );
    }

    if (mainError && !data) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900 p-4">
                <div className="max-w-md bg-slate-800 rounded-2xl p-8 border border-red-500/50 shadow-xl text-center">
                    <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Ошибка загрузки</h2>
                    <p className="text-slate-400 text-sm mb-6">{mainError}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">Попробовать снова</button>
                </div>
            </div>
        );
    }

    if (!data || !stats) return null;

    const currentManager = managerFilter === 'all' ? null : managersRating.find(r => r.manager.manager_id === managerFilter);

    // === RENDER FUNCTIONS ===

    const renderManagerDetail = () => {
        if (!currentManager) return null;
        return (
            <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setManagerFilter('all')} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
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
                    <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent border-none text-sm px-2 py-1 outline-none text-slate-600 font-medium" />
                            <span className="text-slate-400">-</span>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent border-none text-sm px-2 py-1 outline-none text-slate-600 font-medium" />
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Итого к выплате</p>
                            <p className="text-4xl font-bold text-emerald-600">{formatMoney(currentManager.totalIncome)}</p>
                        </div>
                    </div>
                </div>

                {/* 1. Fix Salary */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                        <Briefcase size={18} className="text-slate-500" />
                        <h3 className="font-bold text-slate-700">1. Оклад (Фиксированная часть)</h3>
                    </div>
                    <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex justify-between mb-2 text-sm">
                                <span className="text-slate-600">Отработано дней</span>
                                <span className="font-bold text-slate-900">{currentManager.fixDetails.workedDays} дн.</span>
                            </div>
                            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                                <div className="bg-slate-800 h-full rounded-full" style={{ width: `${Math.min(100, (currentManager.fixDetails.workedDays / CONFIG.NORM_WORKING_DAYS) * 100)}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                <Info size={12} /> Расчет: ({CONFIG.FIX_SALARY_BASE} ₽ / {CONFIG.NORM_WORKING_DAYS} дн.) × {currentManager.fixDetails.workedDays}
                            </p>
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
                                    <td className="p-4 text-slate-700 font-medium">Звонки {'>'}= 30 сек</td>
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
                                    <td className="p-4 text-slate-500 text-xs">{'>'}= 90% (фикс 5000)</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${currentManager.kpi.details.convNeeds >= 0.9 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {formatPercent(currentManager.kpi.details.convNeeds)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold">{formatMoney(currentManager.kpi.details.convNeedsBonus)}</td>
                                </tr>
                                <tr>
                                    <td className="p-4 text-slate-700 font-medium">Конверсия (КП → Согл.)</td>
                                    <td className="p-4 text-slate-500 text-xs">{'>'}= 25% (фикс 5000)</td>
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
                                        <th className="p-3 text-right">Сумма закупа</th>
                                        <th className="p-3 text-right">Маржа ₽</th>
                                        <th className="p-3 text-right">Маржа %</th>
                                        <th className="p-3 text-right">Прем %</th>
                                        <th className="p-3 text-right text-emerald-700 bg-emerald-50">Вознаграждение</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentManager.bonusDeals.map((d) => (
                                        <tr key={d.deal_id} className="hover:bg-slate-50">
                                            <td className="p-3"><div className="font-medium text-slate-700">{d.deal_name}</div><div className="text-slate-400 text-[10px]">{d.created_at}</div></td>
                                            <td className="p-3 text-right">{formatMoney(d.amount)}</td>
                                            <td className="p-3 text-right text-slate-500">{formatMoney(d.cost)}</td>
                                            <td className="p-3 text-right font-medium text-slate-700">{formatMoney(d.margin_value)}</td>
                                            <td className="p-3 text-right"><span className={`px-1.5 py-0.5 rounded ${d.margin_percent >= 0.35 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{formatPercent(d.margin_percent)}</span></td>
                                            <td className="p-3 text-right font-mono text-slate-600">{formatPercent(d.premPercent)}</td>
                                            <td className="p-3 text-right font-bold text-emerald-600 bg-emerald-50/30">
                                                {formatMoney(d.bonus)}
                                                {d.payment_ratio < 1 && <span className="block text-[9px] text-orange-400 font-normal">Аванс</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-100 font-bold text-slate-700">
                                    <tr>
                                        <td className="p-3">ИТОГО</td>
                                        <td className="p-3 text-right">{formatMoney(currentManager.stats.salesVolume)}</td>
                                        <td className="p-3 text-right text-slate-500">-</td>
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
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 mb-6">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2 min-w-max"><Filter size={16} /> Период расчета:</span>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto" />
                    <span className="text-slate-400">→</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto" />
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
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2 min-w-max"><Filter size={16} /> Период сделок:</span>
                    <div className="flex items-center gap-2">
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-36" />
                        <span className="text-slate-400">→</span>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-36" />
                    </div>
                </div>
            </div>

            {dealsSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Выручка</p><p className="text-xl font-bold text-slate-800">{formatMoney(dealsSummary.volume)}</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Закуп</p><p className="text-xl font-bold text-slate-600">{formatMoney(dealsSummary.cost)}</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Маржа</p><p className="text-xl font-bold text-emerald-600">{formatMoney(dealsSummary.margin)}</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Ср. Маржа %</p><p className="text-xl font-bold text-slate-800">{formatPercent(dealsSummary.avgMargin / 100)}</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Бонусы (Итого)</p><p className="text-xl font-bold text-indigo-600">{formatMoney(dealsSummary.bonus)}</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Ср. цикл успех</p><p className="text-xl font-bold text-slate-800">{dealsSummary.avgCycleSuccess.toFixed(0)} дн.</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Ср. цикл провал</p><p className="text-xl font-bold text-slate-600">{dealsSummary.avgCycleFail.toFixed(0)} дн.</p></div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-medium">Дата / Название</th>
                                <th className="p-4 font-medium">Менеджер</th>
                                <th className="p-4 font-medium">Статус</th>
                                <th className="p-4 font-medium text-right">Сумма продажи</th>
                                <th className="p-4 font-medium text-right">Сумма закупа</th>
                                <th className="p-4 font-medium text-right">Маржа ₽</th>
                                <th className="p-4 font-medium text-right">Маржа %</th>
                                <th className="p-4 font-medium text-right">Менеджер %</th>
                                <th className="p-4 font-medium text-right">Бонус ₽</th>
                                <th className="p-4 font-medium text-center">Цикл (Успех)</th>
                                <th className="p-4 font-medium text-center">Цикл (Отказ)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentDeals.slice(0, 100).map((deal) => {
                                const premPercent = calcPremPercent(deal.margin_percent);
                                const bonus = calcDealBonus(deal);
                                const cycleSuccess = deal.stage === 'Сделка успешна' ? getDealCycle(deal) : '-';
                                const cycleFail = deal.stage === 'Провал' ? getDealCycle(deal) : '-';

                                return (
                                    <tr key={deal.deal_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4"><div className="font-medium text-slate-800">{deal.deal_name}</div><div className="text-slate-500 text-xs">{deal.created_at}</div></td>
                                        <td className="p-4 text-slate-600 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${data?.managers.find(m => m.manager_id === deal.manager_id)?.avatar_color || 'bg-slate-400'}`} />{deal.manager_name}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${deal.stage === 'Сделка успешна' ? 'bg-green-100 text-green-700' : deal.stage === 'Провал' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{deal.stage}</span></td>
                                        <td className="p-4 text-right text-slate-700 font-medium">{formatMoney(deal.amount)}</td>
                                        <td className="p-4 text-right text-slate-500">{formatMoney(deal.cost)}</td>
                                        <td className="p-4 text-right text-emerald-600">{formatMoney(deal.margin_value)}</td>
                                        <td className="p-4 text-right"><span className={`${deal.margin_percent >= 0.35 ? 'text-green-600 font-bold' : 'text-slate-600'}`}>{(deal.margin_percent * 100).toFixed(1)}%</span></td>
                                        <td className="p-4 text-right text-slate-600 font-mono">{deal.stage === 'Сделка успешна' ? formatPercent(premPercent) : '-'}</td>
                                        <td className="p-4 text-right font-bold text-indigo-600">{deal.stage === 'Сделка успешна' ? formatMoney(bonus) : '-'}</td>
                                        <td className="p-4 text-center text-slate-600">{cycleSuccess !== '-' ? `${cycleSuccess} дн.` : '-'}</td>
                                        <td className="p-4 text-center text-slate-400">{cycleFail !== '-' ? `${cycleFail} дн.` : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderOverview = () => {
        const maxStageCount = stats.fullFunnelStats[0]?.value || 1;

        return (
            <div className="space-y-8 animate-in fade-in">
                {/* Date Filters Block */}
                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col md:flex-row items-center gap-4">
                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-2 min-w-max"><Filter size={16} /> Период отчета:</span>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto" />
                            <span className="text-slate-400">→</span>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto" />
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col md:flex-row items-center gap-4 border-dashed">
                        <span className="text-sm font-semibold text-slate-500 flex items-center gap-2 min-w-max"><ArrowRight size={16} className="text-slate-400" /> Период сравнения:</span>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <input type="date" value={compareDateFrom} onChange={(e) => setCompareDateFrom(e.target.value)} className="border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto text-slate-600" />
                            <span className="text-slate-400">→</span>
                            <input type="date" value={compareDateTo} onChange={(e) => setCompareDateTo(e.target.value)} className="border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto text-slate-600" />
                        </div>
                    </div>
                </div>

                {/* Top Cards with Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <Card title="Объем продаж" value={formatMoney(stats.volume)} icon={DollarSign} change={changes?.volume} subtext="Выручка" />
                    <Card title="Сумма закупа" value={formatMoney(stats.cost)} icon={ShoppingCart} change={changes?.cost} invertColor={true} subtext="Себестоимость" />
                    <Card title="Маржа (₽)" value={formatMoney(stats.margin)} icon={Wallet} change={changes?.margin} subtext="Валовая прибыль" />
                    <Card title="Рентабельность" value={`${stats.marginPercentTotal.toFixed(1)}%`} icon={TrendingUp} change={changes?.marginPercent} subtext="Маржинальность %" />
                    <Card title="Успешных сделок" value={stats.successfulCount} icon={Briefcase} change={changes?.count} subtext="Количество" />
                    <Card title="Средний чек" value={formatMoney(stats.avgCheck)} icon={PieIcon} change={changes?.avgCheck} subtext="Средняя сумма" />
                </div>

                {/* Conversion & Cycle Blocks */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500" />Ключевые конверсии</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100 transition-colors hover:bg-blue-50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-600 font-semibold uppercase">Потребность → КП</span>
                                    <span className="font-bold text-2xl text-blue-700">{stats.convNeedsToOffer.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-blue-100 h-2.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.convNeedsToOffer}%` }} />
                                </div>
                            </div>
                            <div className="p-5 bg-emerald-50/50 rounded-xl border border-emerald-100 transition-colors hover:bg-emerald-50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-600 font-semibold uppercase">КП → Согласовано</span>
                                    <span className="font-bold text-2xl text-emerald-700">{stats.convOfferToAgreed.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-emerald-100 h-2.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.convOfferToAgreed}%` }} />
                                </div>
                            </div>
                            <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 transition-colors hover:bg-indigo-50">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2"><CheckCircle size={16} className="text-indigo-600" /><span className="text-xs text-slate-600 font-semibold uppercase">Заявка → Успех</span></div>
                                    <span className="font-bold text-2xl text-indigo-700">{stats.convNewToWon.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-indigo-100 h-2.5 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.convNewToWon}%` }} />
                                </div>
                            </div>
                            <div className="p-5 bg-red-50/50 rounded-xl border border-red-100 transition-colors hover:bg-red-50">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2"><XCircle size={16} className="text-red-600" /><span className="text-xs text-slate-600 font-semibold uppercase">Заявка → Провал</span></div>
                                    <span className="font-bold text-2xl text-red-700">{stats.convNewToLost.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-red-100 h-2.5 rounded-full overflow-hidden">
                                    <div className="bg-red-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.convNewToLost}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock size={20} className="text-purple-500" />Цикл сделки / отказа</h3>
                        <div className="space-y-6 flex-1 flex flex-col justify-center">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div><p className="text-sm font-semibold text-slate-600">Цикл успешной сделки</p><p className="text-xs text-slate-400">От заявки до успеха</p></div>
                                <div className="text-right"><p className="text-2xl font-bold text-slate-800">{stats.avgCycleWon.toFixed(0)} <span className="text-sm font-normal text-slate-500">дней</span></p></div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div><p className="text-sm font-semibold text-slate-600">Цикл отказа</p><p className="text-xs text-slate-400">От заявки до провала</p></div>
                                <div className="text-right"><p className="text-2xl font-bold text-slate-800">{stats.avgCycleLost.toFixed(0)} <span className="text-sm font-normal text-slate-500">дней</span></p></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Visual Funnel */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Детализация воронки (Текущий период)</h3>
                    <div className="flex flex-col gap-0">
                        {stats.fullFunnelStats.map((item, index) => {
                            const prev = stats.fullFunnelStats[index - 1];
                            const conversion = prev && prev.value > 0 ? (item.value / prev.value) * 100 : 0;

                            return (
                                <div key={item.name}>
                                    {index > 0 && (
                                        <div className="pl-6 py-1 flex items-center gap-2 relative">
                                            <div className="h-4 w-px bg-slate-200 absolute left-[27px] top-0 bottom-0"></div>
                                            <div className="ml-8 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 flex items-center gap-1 z-10">
                                                <ArrowDown size={10} className="text-slate-400" />{conversion.toFixed(1)}% конверсия
                                            </div>
                                        </div>
                                    )}
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 bg-blue-50 rounded-lg transform origin-left transition-all duration-700 ease-out" style={{ width: `${(item.value / maxStageCount) * 100}%`, minWidth: '4px' }}></div>
                                        <div className="relative p-3 flex justify-between items-center z-10">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${index === stats.fullFunnelStats.length - 1 ? 'bg-emerald-500' : 'bg-blue-400'}`}></div>
                                                <span className="font-medium text-slate-700 text-sm">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1 text-xs text-slate-500 bg-white/60 px-2 py-1 rounded-md border border-slate-100 shadow-sm" title="Среднее время в этапе">
                                                    <Hourglass size={12} className="text-slate-400" /><span className="font-medium">{item.avgDays.toFixed(1)} дн.</span>
                                                </div>
                                                <span className="font-bold text-slate-900 bg-white/80 px-2 rounded-md shadow-sm border border-slate-100 text-sm">{item.value} шт</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Manager Results Table */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Результаты менеджеров (Текущий период)</h3>
                        <button onClick={() => setActiveTab('managers')} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">Подробнее <ArrowRight size={14} /></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 rounded-lg">
                                <tr><th className="p-3 rounded-l-lg">Менеджер</th><th className="p-3 text-right">Выручка</th><th className="p-3 text-right">Маржа</th><th className="p-3 text-right">Сделок</th><th className="p-3 text-right rounded-r-lg">Зарплата (Расчет)</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {managersRating.map((rating) => (
                                    <tr key={rating.manager.manager_id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setManagerFilter(rating.manager.manager_id); setActiveTab('managers'); }}>
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
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'managers': return managerFilter !== 'all' ? renderManagerDetail() : renderManagersList();
            case 'deals': return renderDeals();
            case 'admin': return <AdminPanel />;
            default: return renderOverview();
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
            {/* Sidebar Navigation */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-white transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-2xl md:shadow-none flex flex-col`}>
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50"><TrendingUp size={18} className="text-white" /></div>
                    <h1 className="text-xl font-bold tracking-tight">Sales Dashboard <span className="text-blue-500">BIZGIFT</span></h1>
                </div>
                <div className="px-4 py-6 space-y-1 flex-1">
                    {[
                        { id: 'overview', label: 'Продажи', icon: LayoutDashboard },
                        { id: 'managers', label: 'Менеджеры', icon: Users },
                        { id: 'deals', label: 'Сделки', icon: List },
                        ...(profile?.role === 'admin' || profile?.role === 'super-admin'
                            ? [{ id: 'admin', label: 'Админ-панель', icon: Shield }]
                            : [])
                    ].map((item) => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setManagerFilter('all'); if (window.innerWidth < 768) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><item.icon size={18} />{item.label}</button>
                    ))}
                </div>
                <div className="p-6 border-t border-slate-700">
                    <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">{profile?.displayName?.charAt(0) || 'U'}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{profile?.displayName || 'User'}</p><p className="text-xs text-slate-400 truncate">{profile?.email}</p></div></div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"><LogOut size={16} />Выйти</button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
                <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg active:bg-slate-200 transition-colors"><Menu size={20} className="text-slate-600" /></button>
                        <h2 className="text-xl font-bold text-slate-800 hidden md:block">{activeTab === 'overview' ? 'Отдел продаж: Сводка' : activeTab === 'managers' ? 'Эффективность команды' : activeTab === 'deals' ? 'Реестр сделок' : 'Панель администратора'}</h2>
                        <h2 className="text-lg font-bold text-slate-800 md:hidden">BIZGIFT</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 pr-3">
                            <div className="bg-white p-1.5 rounded-md shadow-sm"><Filter size={14} className="text-slate-500" /></div>
                            <select className="bg-transparent text-sm font-medium text-slate-600 outline-none cursor-pointer max-w-[100px] md:max-w-none" value={managerFilter} onChange={(e) => setManagerFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                                <option value="all">Все менеджеры</option>
                                {data?.managers.map(m => <option key={m.manager_id} value={m.manager_id}>{m.manager_name}</option>)}
                            </select>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                            <span className="font-bold text-slate-500">{profile?.displayName?.charAt(0) || 'A'}</span>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-4 md:p-8"><div className="max-w-7xl mx-auto">{renderContent()}</div></div>
            </main>
        </div>
    );
};

export default SalesDashboard;
