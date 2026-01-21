import { useState, useEffect, useCallback } from 'react';
import type { Deal, DealsParams } from '../types/api';
import { api } from '../services/api';

interface UseDealsResult {
    deals: Deal[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
    fetchDeals: () => Promise<void>;
}

/**
 * Custom hook for fetching deals data
 * Only real API data - no mock fallback
 */
export const useDeals = (params: DealsParams): UseDealsResult => {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDeals = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Only use real API - no mock fallback
            const data = await api.getDeals(params);
            setDeals(data);
        } catch (err: any) {
            console.error('Error fetching deals:', err);
            setError(err.message || 'Не удалось загрузить сделки');
            // No mock fallback - set empty array
            setDeals([]);
        } finally {
            setIsLoading(false);
        }
    }, [params.dateFrom, params.dateTo, params.managerId, params.source]);

    // Fetch deals when params change
    useEffect(() => {
        fetchDeals();
    }, [fetchDeals]);

    return {
        deals,
        isLoading,
        error,
        refetch: fetchDeals,
        fetchDeals
    };
};
