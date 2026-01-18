import React, { useState, useMemo } from 'react';
import { Calculator, DollarSign, TrendingUp, Percent, PieChart } from 'lucide-react';
import { useDeals } from '../hooks/useDeals';
import { useManagers } from '../hooks/useManagers';

/**
 * Calculations Page
 * Financial calculations and analytics
 */
const Calculations: React.FC = () => {
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });

    const { deals, isLoading: dealsLoading } = useDeals({ dateFrom: dateRange.from, dateTo: dateRange.to });
    const { managers, isLoading: managersLoading } = useManagers();

    const isLoading = dealsLoading || managersLoading;

    // Calculate financial metrics
    const calculations = useMemo(() => {
        const successfulDeals = deals.filter(d => d.stage === 'Сделка успешна');
        const lostDeals = deals.filter(d => d.stage === 'Провал');

        const totalRevenue = successfulDeals.reduce((sum, d) => sum + d.amount, 0);
        const totalCost = successfulDeals.reduce((sum, d) => sum + d.cost, 0);
        const totalMargin = successfulDeals.reduce((sum, d) => sum + d.margin_value, 0);

        const avgDealSize = successfulDeals.length > 0 ? totalRevenue / successfulDeals.length : 0;
        const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

        const conversionRate = deals.length > 0 ? (successfulDeals.length / deals.length) * 100 : 0;
        const lossRate = deals.length > 0 ? (lostDeals.length / deals.length) * 100 : 0;

        // By manager
        const byManager = managers.map(m => {
            const managerDeals = successfulDeals.filter(d => d.manager_id === m.manager_id);
            const revenue = managerDeals.reduce((sum, d) => sum + d.amount, 0);
            const margin = managerDeals.reduce((sum, d) => sum + d.margin_value, 0);
            return {
                name: m.manager_name,
                deals: managerDeals.length,
                revenue,
                margin,
                marginPercent: revenue > 0 ? (margin / revenue) * 100 : 0
            };
        }).sort((a, b) => b.revenue - a.revenue);

        // By source
        const sources = ['Сайт', 'Холодный звонок', 'Email', 'Реклама', 'Рекомендация'];
        const bySource = sources.map(source => {
            const sourceDeals = successfulDeals.filter(d => d.source === source);
            const revenue = sourceDeals.reduce((sum, d) => sum + d.amount, 0);
            return {
                source,
                deals: sourceDeals.length,
                revenue,
                percent: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
            };
        }).filter(s => s.deals > 0).sort((a, b) => b.revenue - a.revenue);

        return {
            totalDeals: deals.length,
            successfulDeals: successfulDeals.length,
            lostDeals: lostDeals.length,
            totalRevenue,
            totalCost,
            totalMargin,
            avgDealSize,
            avgMarginPercent,
            conversionRate,
            lossRate,
            byManager,
            bySource
        };
    }, [deals, managers]);

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen animate-pulse">
                <div className="w-48 h-8 bg-slate-200 rounded mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white h-32 rounded-2xl"></div>
                    ))}
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
                        <Calculator className="text-green-600" size={32} />
                        Расчёты
                    </h1>
                    <p className="text-slate-600 text-sm mt-1">
                        Финансовая аналитика и расчёты
                    </p>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                    <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                        className="border-none outline-none text-sm"
                    />
                    <span className="text-slate-400">—</span>
                    <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                        className="border-none outline-none text-sm"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white">
                    <DollarSign size={24} className="mb-2 opacity-80" />
                    <p className="text-sm opacity-80 mb-1">Общая выручка</p>
                    <p className="text-2xl font-bold">₽{calculations.totalRevenue.toLocaleString('ru-RU')}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white">
                    <TrendingUp size={24} className="mb-2 opacity-80" />
                    <p className="text-sm opacity-80 mb-1">Общая маржа</p>
                    <p className="text-2xl font-bold">₽{calculations.totalMargin.toLocaleString('ru-RU')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white">
                    <Percent size={24} className="mb-2 opacity-80" />
                    <p className="text-sm opacity-80 mb-1">Средняя маржинальность</p>
                    <p className="text-2xl font-bold">{calculations.avgMarginPercent.toFixed(1)}%</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl text-white">
                    <PieChart size={24} className="mb-2 opacity-80" />
                    <p className="text-sm opacity-80 mb-1">Конверсия</p>
                    <p className="text-2xl font-bold">{calculations.conversionRate.toFixed(1)}%</p>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Manager */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">По менеджерам</h2>
                    <div className="space-y-3">
                        {calculations.byManager.map((m, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div>
                                    <p className="font-medium text-slate-800">{m.name}</p>
                                    <p className="text-xs text-slate-500">{m.deals} сделок</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-800">₽{(m.revenue / 1000).toFixed(0)}k</p>
                                    <p className="text-xs text-green-600">Маржа: {m.marginPercent.toFixed(1)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Source */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">По источникам</h2>
                    <div className="space-y-3">
                        {calculations.bySource.map((s, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-800">{s.source}</span>
                                    <span className="font-bold text-slate-800">₽{(s.revenue / 1000).toFixed(0)}k</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                        style={{ width: `${s.percent}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{s.deals} сделок • {s.percent.toFixed(1)}% выручки</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Дополнительные показатели</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-slate-800">{calculations.totalDeals}</p>
                        <p className="text-sm text-slate-500">Всего сделок</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                        <p className="text-2xl font-bold text-green-600">{calculations.successfulDeals}</p>
                        <p className="text-sm text-slate-500">Успешных</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-xl">
                        <p className="text-2xl font-bold text-red-600">{calculations.lostDeals}</p>
                        <p className="text-sm text-slate-500">Провалов</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <p className="text-2xl font-bold text-blue-600">₽{(calculations.avgDealSize / 1000).toFixed(0)}k</p>
                        <p className="text-sm text-slate-500">Средний чек</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calculations;
