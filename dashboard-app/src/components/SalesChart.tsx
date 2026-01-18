import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SalesChartProps {
    data: Array<{ date: string; revenue: number; margin: number }>;
    isLoading: boolean;
}

/**
 * Sales Chart Component
 * Displays revenue and margin trends over time
 */
const SalesChart: React.FC<SalesChartProps> = ({ data, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="mb-6 animate-pulse">
                    <div className="w-48 h-6 bg-slate-200 rounded mb-2"></div>
                    <div className="w-64 h-4 bg-slate-200 rounded"></div>
                </div>
                <div className="w-full h-[300px] bg-slate-100 rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    📊 Динамика продаж
                </h2>
                <p className="text-sm text-slate-500 mt-1">Выручка и маржа по дням</p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `₽${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                            padding: '12px'
                        }}
                        formatter={(value) => {
                            const numValue = typeof value === 'number' ? value : 0;
                            return [`₽${numValue.toLocaleString('ru-RU')}`, ''];
                        }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        name="Выручка"
                    />
                    <Line
                        type="monotone"
                        dataKey="margin"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 4 }}
                        name="Маржа"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesChart;
