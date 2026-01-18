// Card Component with Trend Indicator

import React from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon?: LucideIcon;
    change?: number;
    invertColor?: boolean;
}

export const Card: React.FC<CardProps> = ({
    title,
    value,
    subtext,
    icon: Icon = DollarSign,
    change,
    invertColor = false
}) => {
    let trendColor = 'text-slate-400';
    let trendBg = 'bg-slate-50';
    let TrendIcon: LucideIcon | null = null;

    if (change !== undefined && change !== null) {
        if (change > 0) {
            trendColor = invertColor ? 'text-red-600' : 'text-emerald-600';
            trendBg = invertColor ? 'bg-red-50' : 'bg-emerald-50';
            TrendIcon = ArrowUpRight;
        } else if (change < 0) {
            trendColor = invertColor ? 'text-emerald-600' : 'text-red-600';
            trendBg = invertColor ? 'bg-emerald-50' : 'bg-red-50';
            TrendIcon = ArrowDownRight;
        } else {
            trendColor = 'text-slate-500';
            TrendIcon = ArrowRight;
        }
    }

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
                    <h3 className="text-xl font-bold text-slate-800 mt-1">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${trendBg} ${trendColor}`}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{subtext}</span>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 font-medium ${trendColor}`}>
                        {TrendIcon && <TrendIcon size={14} />}
                        {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </div>
                )}
            </div>
        </div>
    );
};

export default Card;
