import React, { useState } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import MetricsCards from '../components/MetricsCards';
import SalesChart from '../components/SalesChart';
import DealsTable from '../components/DealsTable';
import ManagersPerformance from '../components/ManagersPerformance';
import KpiWidget from '../components/KpiWidget';
import { useDashboardData } from '../hooks/useDashboardData';

/**
 * Dashboard Main Page
 * Displays sales metrics, charts, and tables
 */
const Dashboard: React.FC = () => {
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });

    // Use centralized data fetching
    const { metrics, salesData, deals, managerPerformance, kpiData, isLoading, error } = useDashboardData(dateRange);

    if (error) {
        return (
            <div className="p-6 min-h-screen flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md">
                    <p className="text-red-700 font-bold">Ошибка загрузки данных</p>
                    <p className="text-red-600 text-sm mt-2">{error}</p>
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
                        <TrendingUp className="text-blue-600" size={32} />
                        Dashboard
                    </h1>
                    <p className="text-slate-600 text-sm mt-1">
                        Аналитика продаж и KPI команды
                    </p>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <Calendar size={20} className="text-slate-400" />
                    <div className="flex items-center gap-2 text-sm">
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-slate-400">—</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <MetricsCards metrics={metrics} isLoading={isLoading} />

            {/* Charts & KPI Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SalesChart data={salesData} isLoading={isLoading} />
                </div>
                <div>
                    <KpiWidget kpiData={kpiData} isLoading={isLoading} />
                </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DealsTable deals={deals.slice(0, 10)} isLoading={isLoading} />
                <ManagersPerformance performance={managerPerformance} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default Dashboard;
