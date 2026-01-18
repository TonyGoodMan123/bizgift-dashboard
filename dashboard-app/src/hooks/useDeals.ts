import { useState, useEffect } from 'react';
import type { Deal, DealsParams } from '../types/api';
import { generateMockDeals } from '../utils/mockData';
import { api } from '../services/api';

interface UseDealsResult {
    deals: Deal[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Custom hook for fetching deals data
 * Supports both API and mock data modes
 */
export const useDeals = (params: DealsParams): UseDealsResult => {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

    const fetchDeals = async () => {
        try {
            setIsLoading(true);
            setError(null);

            let data: Deal[];

            if (useMockData || !import.meta.env.VITE_API_URL) {
                // Use mock data
                data = generateMockDeals(params);
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 300));
            } else {
                // Use real API
                data = await api.getDeals(params);
            }

            setDeals(data);
        } catch (err: any) {
            console.error('Error fetching deals:', err);
            setError(err.message || 'Failed to fetch deals');

            // Fallback to mock data on error
            setDeals(generateMockDeals(params));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeals();
    }, [params.dateFrom, params.dateTo, params.managerId, params.source]);

    return {
        deals,
        isLoading,
        error,
        refetch: fetchDeals
    };
};
