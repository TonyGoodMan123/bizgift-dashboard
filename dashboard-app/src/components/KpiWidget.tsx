import React from 'react';
import { Phone, FileText, CheckCircle, Target } from 'lucide-react';
import type { KpiActivity } from '../types/api';

interface KpiWidgetProps {
    kpiData: KpiActivity[];
    isLoading: boolean;
}

interface KpiMetric {
    label: string;
    value: number;
    target: number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
}

/**
 * KPI Widget Component
 * Displays key activity metrics
 */
const KpiWidget: React.FC<KpiWidgetProps> = ({ kpiData, isLoading }) => {
    // Aggregate KPI data across all managers
    const aggregatedKPI = kpiData.reduce(
        (acc, curr) => ({
            calls: acc.calls + curr.calls_30_sec_count,
            offers_sent: acc.offers_sent + curr.offers_sent_count,
            offers_agreed: acc.offers_agreed + curr.offers_agreed_count,
            needs: acc.needs + curr.needs_count
        }),
        { calls: 0, offers_sent: 0, offers_agreed: 0, needs: 0 }
    );

    const metrics: KpiMetric[] = [
        { label: 'Звонки > 30 сек', value: aggregatedKPI.calls, target: 150, icon: Phone, color: 'blue' },
        { label: 'КП отправлено', value: aggregatedKPI.offers_sent, target: 30, icon: FileText, color: 'purple' },
        { label: 'КП согласовано', value: aggregatedKPI.offers_agreed, target: 20, icon: CheckCircle, color: 'green' },
        { label: 'Потребности', value: aggregatedKPI.needs, target: 50, icon: Target, color: 'orange' }
    ];

    const getProgressColor = (value: number, target: number) => {
        const percent = (value / target) * 100;
        if (percent >= 100) return 'from-green-500 to-emerald-500';
        if (percent >= 80) return 'from-yellow-500 to-orange-500';
        return 'from-red-500 to-rose-500';
    };

    const getIconBgColor = (color: string) => {
        const colors: Record<string, string> = {
            blue: 'bg-blue-100 text-blue-600',
            purple: 'bg-purple-100 text-purple-600',
            green: 'bg-green-100 text-green-600',
            orange: 'bg-orange-100 text-orange-600'
        };
        return colors[color] || 'bg-slate-100 text-slate-600';
    };

    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
                <div className="mb-6 animate-pulse">
                    <div className="w-40 h-6 bg-slate-200 rounded mb-2"></div>
                    <div className="w-48 h-4 bg-slate-200 rounded"></div>
                </div>
                <div className="space-y-5">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-slate-200"></div>
                                    <div className="w-24 h-4 bg-slate-200 rounded"></div>
                                </div>
                                <div className="w-16 h-4 bg-slate-200 rounded"></div>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
            <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    🎯 KPI Активность
                </h2>
                <p className="text-sm text-slate-500 mt-1">Ключевые показатели команды</p>
            </div>

            <div className="space-y-5">
                {metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    const progress = Math.min((metric.value / metric.target) * 100, 100);

                    return (
                        <div key={index} className="group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getIconBgColor(metric.color)}`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-slate-800">{metric.value}</span>
                                    <span className="text-xs text-slate-400"> / {metric.target}</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${getProgressColor(metric.value, metric.target)} transition-all duration-500 rounded-full`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {/* Progress Text */}
                            <div className="mt-1 text-right">
                                <span className={`text-xs font-bold ${progress >= 100 ? 'text-green-600' :
                                        progress >= 80 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                    {progress.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Общий прогресс</span>
                    <span className="text-slate-800 font-bold">
                        {((metrics.reduce((sum, m) => sum + m.value, 0) / metrics.reduce((sum, m) => sum + m.target, 0)) * 100).toFixed(0)}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export default KpiWidget;
