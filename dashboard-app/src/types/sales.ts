// Sales Dashboard Type Definitions

export interface Manager {
    manager_id: number;
    manager_name: string;
    avatar_color: string;
    is_active?: boolean;
}

export type DealStage =
    | 'Новая заявка'
    | 'Потребность выявлена'
    | 'КП отправлено'
    | 'КП на рассмотрении'
    | 'КП согласовано'
    | 'Договор/Счет отправлен'
    | 'Договор/Счет предоплачен'
    | 'Сделка успешна'
    | 'Провал';

export interface Deal {
    deal_id: string;
    deal_name: string;
    manager_id: number;
    manager_name: string;
    stage: DealStage;
    created_at: string;
    closed_at: string | null;
    lost_at: string | null;
    amount: number;
    cost: number;
    margin_value: number;
    margin_percent: number;
    source: string;
    stage_durations: Record<string, number>;
    payment_ratio: number;
}

export interface KpiActivity {
    manager_id: number;
    calls_30_sec_count: number;
    offers_sent_count: number;
    needs_count: number;
    offers_agreed_count: number;
}

export interface ManagerIncome {
    manager: Manager;
    fix: number;
    fixDetails: { workedDays: number; dailyRate: number };
    kpi: {
        total: number;
        details: {
            callsBonus: number;
            callsBonusRaw: number;
            offersBonus: number;
            offersBonusRaw: number;
            convNeedsBonus: number;
            convNeeds: number;
            convAgreedBonus: number;
            convAgreed: number;
            highMarginBonus: number;
            highMarginBonusRaw: number;
            highMarginCount: number;
        };
    };
    marginBonus: number;
    bonusDeals: Array<Deal & { premPercent: number; bonus: number }>;
    totalIncome: number;
    stats: {
        salesVolume: number;
        marginVolume: number;
        dealsCount: number;
    };
}

export interface FunnelStats {
    name: string;
    value: number;
    avgDays: number;
}

export interface DashboardStats {
    volume: number;
    cost: number;
    margin: number;
    marginPercentTotal: number;
    avgCheck: number;
    successfulCount: number;
    funnelCounts: {
        needs: number;
        offers: number;
        agreed: number;
        won: number;
    };
    fullFunnelStats: FunnelStats[];
    convNeedsToOffer: number;
    convOfferToAgreed: number;
    convNewToWon: number;
    convNewToLost: number;
    avgCycleWon: number;
    avgCycleLost: number;
}

export interface DealsSummary {
    volume: number;
    cost: number;
    margin: number;
    bonus: number;
    avgMargin: number;
    avgCycleSuccess: number;
    avgCycleFail: number;
}
