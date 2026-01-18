// Salary Calculation Utilities

import type { Deal, Manager, KpiActivity, ManagerIncome } from '../types/sales';

export const CONFIG = {
    FIX_SALARY_BASE: 30000,
    NORM_WORKING_DAYS: 20,
    KPI_MAX_FLEX: 25000,
    KPI_LIMIT_PER_BLOCK: 5000,
    BONUS_PER_CALL: 5,
    BONUS_PER_OFFER: 125,
    BONUS_HIGH_MARGIN_DEAL: 1000,
    HIGH_MARGIN_THRESHOLD: 0.35,
    CONV_NEEDS_TARGET: 0.9,
    CONV_AGREED_TARGET: 0.25,
};

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
    activity: KpiActivity,
    dateFrom: string,
    dateTo: string
): ManagerIncome {
    // 1. FIX SALARY
    const totalWorkingDaysInPeriod = getWorkingDays(dateFrom, dateTo);
    const workedDays = Math.floor(totalWorkingDaysInPeriod * 0.9);

    const dailyRate = CONFIG.FIX_SALARY_BASE / CONFIG.NORM_WORKING_DAYS;
    const calculatedFix = Math.round(dailyRate * workedDays);

    // 2. KPI Flex
    const callsBonusRaw = activity.calls_30_sec_count * CONFIG.BONUS_PER_CALL;
    const callsBonus = Math.min(callsBonusRaw, CONFIG.KPI_LIMIT_PER_BLOCK);

    const offersBonusRaw = activity.offers_sent_count * CONFIG.BONUS_PER_OFFER;
    const offersBonus = Math.min(offersBonusRaw, CONFIG.KPI_LIMIT_PER_BLOCK);

    const convNeeds = activity.needs_count > 0 ? activity.offers_sent_count / activity.needs_count : 0;
    const convNeedsBonus = convNeeds >= CONFIG.CONV_NEEDS_TARGET ? CONFIG.KPI_LIMIT_PER_BLOCK : 0;

    const convAgreed = activity.offers_sent_count > 0 ? activity.offers_agreed_count / activity.offers_sent_count : 0;
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
        return {
            ...d,
            premPercent,
            bonus
        };
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
                callsBonus,
                callsBonusRaw,
                offersBonus,
                offersBonusRaw,
                convNeedsBonus,
                convNeeds,
                convAgreedBonus,
                convAgreed,
                highMarginBonus,
                highMarginBonusRaw,
                highMarginCount
            }
        },
        marginBonus: marginBonusTotal,
        bonusDeals,
        totalIncome: calculatedFix + kpiFlexTotal + marginBonusTotal,
        stats: {
            salesVolume,
            marginVolume,
            dealsCount: successfulDeals.length
        }
    };
}
