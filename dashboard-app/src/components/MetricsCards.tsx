import React from 'react';
import { TrendingUp, DollarSign, Target, Percent } from 'lucide-react';

interface MetricsCardsProps {
    metrics: {
        revenue: { value: number; change: number };
        margin: { value: number; change: number };
        deals: { value: number; change: number };
        conversion: { value: number; change: number };
    };
    isLoading: boolean;
}

/**
 * Metrics Cards Component
 * Displays 4 key business metrics
 */
const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, isLoading }) => {
    const cards = [
        {
            title: 'Выручка',
            value: `₽${metrics.revenue.value.toLocaleString('ru-RU')}`,
            change: metrics.revenue.change,
            icon: DollarSign,
            color: 'blue'
        },
        {
            title: 'Маржа',
            value: `₽${metrics.margin.value.toLocaleString('ru-RU')}`,
            change: metrics.margin.change,
            icon: TrendingUp,
            color: 'green'
        },
        {
            title: 'Сделок',
            value: metrics.deals.value.toString(),
            change: metrics.deals.change,
            icon: Target,
            color: 'purple'
        },
        {
            title: 'Конверсия',
            value: `${metrics.conversion.value.toFixed(1)}%`,
            change: metrics.conversion.change,
            icon: Percent,
            color: 'orange'
        }
    ];

    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600'
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-200"></div>
                            <div className="w-16 h-6 rounded-full bg-slate-200"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="w-20 h-4 bg-slate-200 rounded"></div>
                            <div className="w-28 h-8 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                const isPositive = card.change >= 0;

                return (
                    <div
                        key={index}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                                <Icon size={24} />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                <span>{isPositive ? '↑' : '↓'}</span>
                                <span>{Math.abs(card.change).toFixed(1)}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1">{card.title}</p>
                            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MetricsCards;
