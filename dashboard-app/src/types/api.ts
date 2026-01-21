// TypeScript type definitions for BizGift API

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
    kp_date: string | null;
    kp_approved_date: string | null;
    payment_confirmed: boolean;
    payment_date: string | null;
    payment_ratio: number;
    stage_durations: Record<string, number>;
}

export interface KpiActivity {
    manager_id: number;
    manager_name: string;
    calls_30_sec_count: number;
    offers_sent_count: number;
    needs_count: number;
    offers_agreed_count: number;
}

export interface Manager {
    manager_id: number;
    manager_name: string;
    avatar_color: string;
    is_active: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: {
        total?: number;
        filtered?: number;
        period?: { from: string; to: string; };
    };
    error?: string;
}

export interface SyncStatus {
    last_sync_deals: string | null;
    last_sync_calls: string | null;
    deals_count?: number;
    calls_count?: number;
}

export interface DealsParams {
    dateFrom: string;
    dateTo: string;
    managerId?: number | 'all';
    source?: string;
}

export interface KpiParams {
    dateFrom: string;
    dateTo: string;
    managerId?: number | 'all';
}
export interface SalaryParams {
    month: string;
    managerId?: number | 'all';
}

export interface SalaryData {
    manager_id: number;
    manager_name: string;
    month: string;
    salary_fixed: number;
    kpi_calls_bonus: number;
    kpi_offers_bonus: number;
    kpi_conversion_bonus: number;
    kpi_margin_bonus: number;
    salary_total: number;
    is_active: boolean;
}
