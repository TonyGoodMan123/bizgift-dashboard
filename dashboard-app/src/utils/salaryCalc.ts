// Salary Calculation Utilities - Full version from original source

import type { Deal, Manager, KpiActivity, ManagerIncome, DashboardStats, DealStage, FunnelStats, DealsSummary } from '../types/sales';

export const CONFIG = {
    FIX_SALARY_BASE: 30000,
    NORM_WORKING_DAYS: 20.5833,
    KPI_MAX_FLEX: 25000,
    KPI_LIMIT_PER_BLOCK: 5000,
    BONUS_PER_CALL: 5,
    BONUS_PER_OFFER: 125,
    BONUS_HIGH_MARGIN_DEAL: 1000,
    HIGH_MARGIN_THRESHOLD: 0.35,
    CONV_NEEDS_TARGET: 0.9,
    CONV_AGREED_TARGET: 0.25,
};

export const STAGES: DealStage[] = [
    'Новая заявка',
    'Потребность выявлена',
    'КП отправлено',
    'КП на рассмотрении',
    'КП согласовано',
    'Договор/Счет отправлен',
    'Договор/Счет предоплачен',
    'Сделка успешна'
];

// Working days calculator (Mon-Fri)
export function getWorkingDays(startDateStr: string, endDateStr: string): number {
    let count = 0;
    const curDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (curDate > endDate) return 0;

    while (curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
        curDate.setDate(curDate.getDate() + 1);
    }
    return Math.max(0, count);
}

// Calculate premium percentage based on margin
export function calcPremPercent(marginPercent: number): number {
    const m = marginPercent;
    if (m < 0.25) return 0.02;
    if (m < 0.30) return 0.05 + (m - 0.25) * (0.07 - 0.05) / (0.30 - 0.25);
    if (m < 0.40) return 0.07 + (m - 0.30) * (0.10 - 0.07) / (0.40 - 0.30);
    if (m < 0.45) return 0.10 + (m - 0.40) * (0.12 - 0.10) / (0.45 - 0.40);
    return 0.12;
}

// Calculate deal bonus
export function calcDealBonus(deal: Deal): number {
    const premPercent = calcPremPercent(deal.margin_percent);
    return deal.margin_value * premPercent * deal.payment_ratio;
}

// Calculate manager total income
export function calcManagerIncome(
    manager: Manager,
    deals: Deal[],
    activity: KpiActivity | undefined | null
): ManagerIncome {
    // 1. FIX SALARY (Based on shifts_count from backend)
    // Worked shifts = number of unique days with at least 1 call
    const workedDays = activity?.shifts_count || 0;

    const dailyRate = CONFIG.FIX_SALARY_BASE / CONFIG.NORM_WORKING_DAYS;
    const calculatedFix = Math.round(dailyRate * workedDays);

    // 2. KPI Flex - use default values if activity is undefined
    const safeActivity: KpiActivity = activity || {
        manager_id: manager.manager_id,
        calls_30_sec_count: 0,
        offers_sent_count: 0,
        needs_count: 0,
        offers_agreed_count: 0,
        shifts_count: 0
    };

    const callsBonusRaw = safeActivity.calls_30_sec_count * CONFIG.BONUS_PER_CALL;
    const callsBonus = Math.min(callsBonusRaw, CONFIG.KPI_LIMIT_PER_BLOCK);

    const offersBonusRaw = safeActivity.offers_sent_count * CONFIG.BONUS_PER_OFFER;
    const offersBonus = Math.min(offersBonusRaw, CONFIG.KPI_LIMIT_PER_BLOCK);

    const convNeeds = safeActivity.needs_count > 0 ? safeActivity.offers_sent_count / safeActivity.needs_count : 0;
    const convNeedsBonus = convNeeds >= CONFIG.CONV_NEEDS_TARGET ? CONFIG.KPI_LIMIT_PER_BLOCK : 0;

    const convAgreed = safeActivity.offers_sent_count > 0 ? safeActivity.offers_agreed_count / safeActivity.offers_sent_count : 0;
    const convAgreedBonus = convAgreed >= CONFIG.CONV_AGREED_TARGET ? CONFIG.KPI_LIMIT_PER_BLOCK : 0;

    const highMarginCount = deals.filter(d => d.margin_percent >= CONFIG.HIGH_MARGIN_THRESHOLD).length;
    const highMarginBonusRaw = highMarginCount * CONFIG.BONUS_HIGH_MARGIN_DEAL;
    const highMarginBonus = Math.min(highMarginBonusRaw, CONFIG.KPI_LIMIT_PER_BLOCK);

    const kpiFlexTotal = Math.min(
        callsBonus + offersBonus + convNeedsBonus + convAgreedBonus + highMarginBonus,
        CONFIG.KPI_MAX_FLEX
    );

    // 3. Margin Bonus (Detailed)
    const successfulDeals = deals.filter(d => d.stage === 'Сделка успешна');

    const bonusDeals = successfulDeals.map(d => {
        const premPercent = calcPremPercent(d.margin_percent);
        const bonus = calcDealBonus(d);
        return { ...d, premPercent, bonus };
    });

    const marginBonusTotal = bonusDeals.reduce((sum, d) => sum + d.bonus, 0);
    const salesVolume = successfulDeals.reduce((sum, d) => sum + d.amount, 0);
    const marginVolume = successfulDeals.reduce((sum, d) => sum + d.margin_value, 0);

    return {
        manager,
        fix: calculatedFix,
        fixDetails: { workedDays, dailyRate },
        kpi: {
            total: kpiFlexTotal,
            details: {
                callsBonus, callsBonusRaw,
                offersBonus, offersBonusRaw,
                convNeedsBonus, convNeeds,
                convAgreedBonus, convAgreed,
                highMarginBonus, highMarginBonusRaw, highMarginCount
            }
        },
        marginBonus: marginBonusTotal,
        bonusDeals,
        totalIncome: calculatedFix + kpiFlexTotal + marginBonusTotal,
        stats: { salesVolume, marginVolume, dealsCount: successfulDeals.length }
    };
}

// Calculate dashboard stats
export function calculateStats(deals: Deal[]): DashboardStats {
    const successful = deals.filter(d => d.stage === 'Сделка успешна');
    const lost = deals.filter(d => d.stage === 'Провал');
    const totalDeals = deals.length;

    const volume = successful.reduce((acc, val) => acc + val.amount, 0);
    const cost = successful.reduce((acc, val) => acc + val.cost, 0);
    const margin = successful.reduce((acc, val) => acc + val.margin_value, 0);
    const marginPercentTotal = volume > 0 ? (margin / volume) * 100 : 0;
    const avgCheck = successful.length ? volume / successful.length : 0;

    const countPassedStage = (minStageIndex: number) => {
        return deals.filter(d => {
            if (d.stage === 'Провал') return false;
            const idx = STAGES.indexOf(d.stage);
            return idx >= minStageIndex;
        }).length;
    };

    const funnelCounts = {
        needs: countPassedStage(1),
        offers: countPassedStage(2),
        agreed: countPassedStage(4),
        won: successful.length
    };

    const fullFunnelStats: FunnelStats[] = STAGES.map((stageName, idx) => {
        const count = countPassedStage(idx);
        const relevantDeals = deals.filter(d => d.stage_durations && d.stage_durations[stageName] !== undefined);
        const totalDays = relevantDeals.reduce((sum, d) => sum + d.stage_durations[stageName], 0);
        const avgDays = relevantDeals.length ? totalDays / relevantDeals.length : 0;
        return { name: stageName, value: count, avgDays };
    });

    const convNeedsToOffer = funnelCounts.needs > 0 ? (funnelCounts.offers / funnelCounts.needs) * 100 : 0;
    const convOfferToAgreed = funnelCounts.offers > 0 ? (funnelCounts.agreed / funnelCounts.offers) * 100 : 0;
    const convNewToWon = totalDeals > 0 ? (successful.length / totalDeals) * 100 : 0;
    const convNewToLost = totalDeals > 0 ? (lost.length / totalDeals) * 100 : 0;

    const getDiffDays = (start: string, end: string | null) => {
        if (!end) return 0;
        const d1 = new Date(start).getTime();
        const d2 = new Date(end).getTime();
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    };

    const avgCycleWon = successful.length
        ? successful.reduce((acc, d) => acc + getDiffDays(d.created_at, d.closed_at), 0) / successful.length
        : 0;

    const avgCycleLost = lost.length
        ? lost.reduce((acc, d) => acc + getDiffDays(d.created_at, d.lost_at), 0) / lost.length
        : 0;

    return {
        volume, cost, margin, marginPercentTotal, avgCheck,
        successfulCount: successful.length, funnelCounts, fullFunnelStats,
        convNeedsToOffer, convOfferToAgreed, convNewToWon, convNewToLost,
        avgCycleWon, avgCycleLost
    };
}

// Calculate deals summary
export function calculateDealsSummary(deals: Deal[]): DealsSummary {
    const successful = deals.filter(d => d.stage === 'Сделка успешна');
    const lost = deals.filter(d => d.stage === 'Провал');

    const volume = deals.reduce((sum, d) => sum + d.amount, 0);
    const cost = deals.reduce((sum, d) => sum + d.cost, 0);
    const margin = deals.reduce((sum, d) => sum + d.margin_value, 0);
    const bonus = deals.reduce((sum, d) => sum + (d.stage === 'Сделка успешна' ? calcDealBonus(d) : 0), 0);
    const avgMargin = volume > 0 ? (margin / volume) * 100 : 0;

    const getDiffDays = (start: string, end: string | null) => {
        if (!end) return 0;
        const d1 = new Date(start).getTime();
        const d2 = new Date(end).getTime();
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    };

    const avgCycleSuccess = successful.length
        ? successful.reduce((acc, d) => acc + getDiffDays(d.created_at, d.closed_at), 0) / successful.length
        : 0;

    const avgCycleFail = lost.length
        ? lost.reduce((acc, d) => acc + getDiffDays(d.created_at, d.lost_at), 0) / lost.length
        : 0;

    return { volume, cost, margin, bonus, avgMargin, avgCycleSuccess, avgCycleFail };
}

// Get deal cycle days
export function getDealCycle(deal: Deal): number | string {
    if (deal.closed_at) {
        const start = new Date(deal.created_at).getTime();
        const end = new Date(deal.closed_at).getTime();
        return Math.floor((end - start) / (1000 * 60 * 60 * 24));
    }
    if (deal.lost_at) {
        const start = new Date(deal.created_at).getTime();
        const end = new Date(deal.lost_at).getTime();
        return Math.floor((end - start) / (1000 * 60 * 60 * 24));
    }
    return '-';
}

// Get difference percentage
export function getDiff(current: number, prev: number): number {
    if (prev === 0) return current === 0 ? 0 : 100;
    return ((current - prev) / prev) * 100;
}

// Format helpers
export const formatMoney = (val: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
export const formatPercent = (val: number) => (val * 100).toFixed(1) + '%';
