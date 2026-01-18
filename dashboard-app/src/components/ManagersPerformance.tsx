import React from 'react';
import { Users, TrendingUp } from 'lucide-react';

interface ManagerPerformance {
    name: string;
    deals: number;
    revenue: number;
    conversion: number;
}

interface ManagersPerformanceProps {
    performance: ManagerPerformance[];
    isLoading: boolean;
}

/**
 * Managers Performance Component
 * Displays performance metrics for each manager
 */
const ManagersPerformance: React.FC<ManagersPerformanceProps> = ({ performance, isLoading }) => {
    const getConversionColor = (conversion: number) => {
        if (conversion >= 20) return 'text-green-600 bg-green-50';
        if (conversion >= 15) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const maxRevenue = performance.length > 0 ? Math.max(...performance.map(m => m.revenue)) : 1;

    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="mb-6 animate-pulse">
                    <div className="w-60 h-6 bg-slate-200 rounded mb-2"></div>
                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-xl animate-pulse">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
                                <div className="flex-1">
                                    <div className="w-32 h-4 bg-slate-200 rounded mb-2"></div>
                                    <div className="w-16 h-3 bg-slate-200 rounded"></div>
                                </div>
                                <div className="w-16 h-6 bg-slate-200 rounded"></div>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-purple-600" />
                        Производительность менеджеров
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{performance.length} менеджеров</p>
                </div>
            </div>

            <div className="space-y-4">
                {performance.map((manager, index) => {
                    const revenuePercent = maxRevenue > 0 ? (manager.revenue / maxRevenue) * 100 : 0;

                    return (
                        <div key={index} className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                                        {manager.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{manager.name}</p>
                                        <p className="text-xs text-slate-500">{manager.deals} сделок</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-800">₽{(manager.revenue / 1000).toFixed(0)}k</p>
                                    <div className={`flex items-center gap-1 justify-end text-xs font-bold px-2 py-1 rounded-full ${getConversionColor(manager.conversion)}`}>
                                        <TrendingUp size={12} />
                                        <span>{manager.conversion.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue Bar */}
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500"
                                    style={{ width: `${revenuePercent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ManagersPerformance;
