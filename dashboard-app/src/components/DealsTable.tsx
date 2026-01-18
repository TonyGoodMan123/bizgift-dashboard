import React, { useState } from 'react';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';
import type { Deal } from '../types/api';

interface DealsTableProps {
    deals: Deal[];
    isLoading: boolean;
}

type SortField = 'deal_name' | 'manager_name' | 'amount' | 'created_at';
type SortDirection = 'asc' | 'desc';

/**
 * Deals Table Component
 * Displays recent deals with sorting
 */
const DealsTable: React.FC<DealsTableProps> = ({ deals, isLoading }) => {
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedDeals = [...deals].sort((a, b) => {
        let compareValue = 0;

        switch (sortField) {
            case 'deal_name':
                compareValue = a.deal_name.localeCompare(b.deal_name);
                break;
            case 'manager_name':
                compareValue = a.manager_name.localeCompare(b.manager_name);
                break;
            case 'amount':
                compareValue = a.amount - b.amount;
                break;
            case 'created_at':
                compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                break;
        }

        return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    };

    const getStageColor = (stage: string) => {
        const colors: Record<string, string> = {
            'Сделка успешна': 'bg-green-100 text-green-700',
            'Договор/Счет предоплачен': 'bg-blue-100 text-blue-700',
            'КП отправлено': 'bg-yellow-100 text-yellow-700',
            'КП на рассмотрении': 'bg-orange-100 text-orange-700',
            'Потребность выявлена': 'bg-purple-100 text-purple-700'
        };
        return colors[stage] || 'bg-slate-100 text-slate-700';
    };

    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="mb-6 animate-pulse">
                    <div className="w-48 h-6 bg-slate-200 rounded mb-2"></div>
                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded animate-pulse"></div>
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
                        <Package size={20} className="text-blue-600" />
                        Последние сделки
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{deals.length} сделок</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th
                                className="pb-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-slate-700"
                                onClick={() => handleSort('deal_name')}
                            >
                                <div className="flex items-center gap-1">
                                    Сделка
                                    <SortIcon field="deal_name" />
                                </div>
                            </th>
                            <th
                                className="pb-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-slate-700"
                                onClick={() => handleSort('manager_name')}
                            >
                                <div className="flex items-center gap-1">
                                    Менеджер
                                    <SortIcon field="manager_name" />
                                </div>
                            </th>
                            <th className="pb-3 text-xs font-bold text-slate-500 uppercase">
                                Этап
                            </th>
                            <th
                                className="pb-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-slate-700 text-right"
                                onClick={() => handleSort('amount')}
                            >
                                <div className="flex items-center gap-1 justify-end">
                                    Сумма
                                    <SortIcon field="amount" />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedDeals.map((deal) => (
                            <tr key={deal.deal_id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3">
                                    <p className="font-medium text-slate-800 text-sm">{deal.deal_name}</p>
                                    <p className="text-xs text-slate-500">{new Date(deal.created_at).toLocaleDateString('ru-RU')}</p>
                                </td>
                                <td className="py-3 text-sm text-slate-600">{deal.manager_name}</td>
                                <td className="py-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStageColor(deal.stage)}`}>
                                        {deal.stage}
                                    </span>
                                </td>
                                <td className="py-3 text-right text-sm font-bold text-slate-800">
                                    ₽{deal.amount.toLocaleString('ru-RU')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DealsTable;
