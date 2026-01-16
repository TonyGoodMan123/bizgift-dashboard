// API Service Layer for BizGift Dashboard

import type {
    Deal, KpiActivity, Manager, ApiResponse, SyncStatus, DealsParams, KpiParams,
} from '../types/api';

class BizGiftAPI {
    private apiUrl: string;
    private apiKey: string;

    constructor() {
        this.apiUrl = import.meta.env.VITE_API_URL || '';
        this.apiKey = import.meta.env.VITE_API_KEY || '';
    }

    private async fetch<T>(action: string, params: Record<string, any> = {}): Promise<T> {
        const url = new URL(this.apiUrl);
        url.searchParams.append('action', action);
        url.searchParams.append('apiKey', this.apiKey);

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, String(value));
            }
        });

        const response = await fetch(url.toString(), { method: 'GET' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result: ApiResponse<T> = await response.json();
        if (!result.success) throw new Error(result.error || 'API request failed');
        
        return result.data;
    }

    async getDeals(params: DealsParams): Promise<Deal[]> {
        return this.fetch<Deal[]>('deals', {
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            ...(params.managerId && params.managerId !== 'all' && { managerId: params.managerId }),
            ...(params.source && params.source !== 'all' && { source: params.source }),
        });
    }

    async getKPI(params: KpiParams): Promise<KpiActivity[]> {
        return this.fetch<KpiActivity[]>('kpi', {
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            ...(params.managerId && params.managerId !== 'all' && { managerId: params.managerId }),
        });
    }

    async getManagers(): Promise<Manager[]> {
        return this.fetch<Manager[]>('managers');
    }

    async getSyncStatus(): Promise<SyncStatus> {
        return this.fetch<SyncStatus>('sync-status');
    }
}

export const api = new BizGiftAPI();
