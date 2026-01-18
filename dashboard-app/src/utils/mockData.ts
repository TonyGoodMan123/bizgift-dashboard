/**
 * Mock Data Generators for BizGift Dashboard
 * Provides realistic test data for all components
 */

import type { Deal, KpiActivity, Manager, DealsParams, KpiParams } from '../types/api';

/**
 * Generate mock deals based on parameters
 */
export const generateMockDeals = (params: DealsParams): Deal[] => {
    const { dateFrom, dateTo, managerId, source } = params;

    const managers = generateMockManagers();
    const sources = ['Сайт', 'Холодный звонок', 'Email', 'Реклама', 'Рекомендация'];
    const stages: Deal['stage'][] = [
        'Новая заявка',
        'Потребность выявлена',
        'КП отправлено',
        'КП на рассмотрении',
        'КП согласовано',
        'Договор/Счет отправлен',
        'Договор/Счет предоплачен',
        'Сделка успешна',
        'Провал'
    ];

    const deals: Deal[] = [];
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

    // Generate 20-50 deals
    const dealsCount = Math.floor(Math.random() * 30) + 20;

    for (let i = 0; i < dealsCount; i++) {
        const randomManager = managers[Math.floor(Math.random() * managers.length)];
        const randomSource = sources[Math.floor(Math.random() * sources.length)];
        const randomStage = stages[Math.floor(Math.random() * stages.length)];

        // Random date within range
        const randomDay = Math.floor(Math.random() * daysDiff);
        const dealDate = new Date(fromDate);
        dealDate.setDate(dealDate.getDate() + randomDay);

        // Skip if filters don't match
        if (managerId && managerId !== 'all' && randomManager.manager_id !== managerId) continue;
        if (source && source !== 'all' && randomSource !== source) continue;

        const amount = Math.floor(Math.random() * 300000) + 50000;
        const costPercent = 0.7 + Math.random() * 0.15; // 70-85%
        const cost = Math.floor(amount * costPercent);
        const margin = amount - cost;

        deals.push({
            deal_id: `DEAL-${1000 + i}`,
            deal_name: generateDealName(),
            manager_id: randomManager.manager_id,
            manager_name: randomManager.manager_name,
            stage: randomStage,
            created_at: dealDate.toISOString(),
            closed_at: randomStage === 'Сделка успешна' ? new Date(dealDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
            lost_at: randomStage === 'Провал' ? new Date(dealDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString() : null,
            amount,
            cost,
            margin_value: margin,
            margin_percent: ((margin / amount) * 100),
            source: randomSource,
            kp_date: ['КП отправлено', 'КП на рассмотрении', 'КП согласовано'].includes(randomStage)
                ? new Date(dealDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
                : null,
            kp_approved_date: randomStage === 'КП согласовано'
                ? new Date(dealDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString()
                : null,
            payment_confirmed: randomStage === 'Сделка успешна',
            payment_date: randomStage === 'Сделка успешна'
                ? new Date(dealDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString()
                : null,
            payment_ratio: randomStage === 'Сделка успешна' ? 1 : 0,
            stage_durations: {}
        });
    }

    return deals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

/**
 * Generate mock KPI activity data
 */
export const generateMockKPI = (params: KpiParams): KpiActivity[] => {
    const managers = generateMockManagers();

    return managers
        .filter(m => !params.managerId || params.managerId === 'all' || m.manager_id === params.managerId)
        .map(manager => ({
            manager_id: manager.manager_id,
            manager_name: manager.manager_name,
            calls_30_sec_count: Math.floor(Math.random() * 80) + 40,
            offers_sent_count: Math.floor(Math.random() * 20) + 5,
            needs_count: Math.floor(Math.random() * 30) + 10,
            offers_agreed_count: Math.floor(Math.random() * 15) + 3
        }));
};

/**
 * Generate mock managers list
 */
export const generateMockManagers = (): Manager[] => {
    return [
        {
            manager_id: 1,
            manager_name: 'Антон Федотов',
            avatar_color: '#6366f1',
            is_active: true
        },
        {
            manager_id: 2,
            manager_name: 'Антон Маркелов',
            avatar_color: '#8b5cf6',
            is_active: true
        },
        {
            manager_id: 3,
            manager_name: 'Ксения Коледова',
            avatar_color: '#ec4899',
            is_active: true
        }
    ];
};

/**
 * Generate metrics data for dashboard cards
 */
export const generateMockMetrics = (dateRange: { from: string; to: string }) => {
    const deals = generateMockDeals({ dateFrom: dateRange.from, dateTo: dateRange.to });
    const successfulDeals = deals.filter(d => d.stage === 'Сделка успешна');

    const totalRevenue = successfulDeals.reduce((sum, d) => sum + d.amount, 0);
    const totalMargin = successfulDeals.reduce((sum, d) => sum + d.margin_value, 0);
    const totalDeals = deals.length;
    const conversion = totalDeals > 0 ? (successfulDeals.length / totalDeals) * 100 : 0;

    return {
        revenue: {
            value: totalRevenue,
            change: (Math.random() - 0.3) * 20 // -6% to +14%
        },
        margin: {
            value: totalMargin,
            change: (Math.random() - 0.2) * 15
        },
        deals: {
            value: totalDeals,
            change: (Math.random() - 0.5) * 10
        },
        conversion: {
            value: conversion,
            change: (Math.random() - 0.3) * 8
        }
    };
};

/**
 * Generate sales chart data
 */
export const generateMockSalesData = (dateRange: { from: string; to: string }) => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

    const data = [];
    let prevRevenue = 30000;

    for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(fromDate);
        date.setDate(date.getDate() + i);

        // Add some variation but keep trend
        const variance = (Math.random() - 0.5) * 15000;
        const revenue = Math.max(10000, prevRevenue + variance);
        const margin = revenue * (0.15 + Math.random() * 0.1); // 15-25% margin

        data.push({
            date: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
            revenue: Math.floor(revenue),
            margin: Math.floor(margin)
        });

        prevRevenue = revenue;
    }

    return data;
};

/**
 * Generate manager performance data
 */
export const generateMockManagerPerformance = (dateRange: { from: string; to: string }) => {
    const managers = generateMockManagers();
    const deals = generateMockDeals({ dateFrom: dateRange.from, dateTo: dateRange.to });

    return managers.map(manager => {
        const managerDeals = deals.filter(d => d.manager_id === manager.manager_id);
        const successfulDeals = managerDeals.filter(d => d.stage === 'Сделка успешна');
        const revenue = successfulDeals.reduce((sum, d) => sum + d.amount, 0);
        const conversion = managerDeals.length > 0
            ? (successfulDeals.length / managerDeals.length) * 100
            : 0;

        return {
            name: manager.manager_name,
            deals: managerDeals.length,
            revenue,
            conversion
        };
    });
};

/**
 * Helper: Generate random deal name
 */
const generateDealName = (): string => {
    const products = [
        'Новогодние корзины',
        'Подарочные наборы',
        'VIP подарки',
        'Промо-продукция',
        'Корпоративные сувениры',
        'Брендированная упаковка',
        'Эксклюзивные подарки',
        'Сезонные наборы'
    ];

    const companies = [
        'ООО "Рога и Копыта"',
        'ПАО "Газпром"',
        'АО "РЖД"',
        'ООО "Яндекс"',
        'ООО "Тинькофф"',
        'для сотрудников',
        'для партнёров',
        'для топ-менеджеров'
    ];

    const product = products[Math.floor(Math.random() * products.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];

    return `${product} ${company}`;
};

/**
 * Sync status mock
 */
export const generateMockSyncStatus = () => {
    const now = new Date();
    const lastSync = new Date(now.getTime() - Math.random() * 60 * 60 * 1000); // Last hour

    return {
        last_sync_deals: lastSync.toISOString(),
        last_sync_calls: lastSync.toISOString(),
        deals_count: Math.floor(Math.random() * 100) + 50,
        calls_count: Math.floor(Math.random() * 500) + 200
    };
};
