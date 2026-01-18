// API Service Layer for BizGift Dashboard

import type {
    Deal,
    KpiActivity,
    Manager,
    ApiResponse,
    SyncStatus,
    DealsParams,
    KpiParams,
} from '../types/api';

class BizGiftAPI {
    private apiUrl: string;
    private apiKey: string;

    constructor() {
        this.apiUrl = import.meta.env.VITE_API_URL || '';
        this.apiKey = import.meta.env.VITE_API_KEY || '';

        // Enable mock data fallback if credentials not configured
        if (!this.apiUrl || !this.apiKey) {
            const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';
            if (!useMockData) {
                console.error(
                    'API credentials not configured and mock data is disabled. ' +
                    'Set VITE_API_URL and VITE_API_KEY in .env file, or enable VITE_USE_MOCK_DATA=true'
                );
            }
        }
    }

    /**
     * Generic fetch method with error handling
     */
    private async fetch<T>(
        action: string,
        params: Record<string, any> = {}
    ): Promise<T> {
        try {
            const url = new URL(this.apiUrl);
            url.searchParams.append('action', action);
            url.searchParams.append('apiKey', this.apiKey);

            // Add additional parameters
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.append(key, String(value));
                }
            });

            const response = await fetch(url.toString(), {
                method: 'GET',
                // No headers - Apps Script handles CORS automatically
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<T> = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'API request failed');
            }

            return result.data;
        } catch (error) {
            console.error(`API error (${action}):`, error);
            throw error;
        }
    }

    /**
     * Get deals with filtering
     */
    async getDeals(params: DealsParams): Promise<Deal[]> {
        const queryParams: Record<string, any> = {
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
        };

        if (params.managerId && params.managerId !== 'all') {
            queryParams.managerId = params.managerId;
        }

        if (params.source && params.source !== 'all') {
            queryParams.source = params.source;
        }

        return this.fetch<Deal[]>('deals', queryParams);
    }

    /**
     * Get KPI activity data
     */
    async getKPI(params: KpiParams): Promise<KpiActivity[]> {
        const queryParams: Record<string, any> = {
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
        };

        if (params.managerId && params.managerId !== 'all') {
            queryParams.managerId = params.managerId;
        }

        return this.fetch<KpiActivity[]>('kpi', queryParams);
    }

    /**
     * Get list of managers
     */
    async getManagers(): Promise<Manager[]> {
        return this.fetch<Manager[]>('managers');
    }

    /**
     * Get sync status
     */
    async getSyncStatus(): Promise<SyncStatus> {
        return this.fetch<SyncStatus>('sync-status');
    }
}

// Export singleton instance
export const api = new BizGiftAPI();
