import { useState, useEffect, useCallback } from 'react';
import type { Manager } from '../types/api';
import { api } from '../services/api';

interface UseManagersResult {
    managers: Manager[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Custom hook for fetching managers data
 * Only real API data - no mock fallback
 */
export const useManagers = (): UseManagersResult => {
    const [managers, setManagers] = useState<Manager[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchManagers = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Only use real API - no mock fallback
            const data = await api.getManagers();
            setManagers(data);
        } catch (err: any) {
            console.error('Error fetching managers:', err);
            setError(err.message || 'Не удалось загрузить менеджеров');
            // No mock fallback - set empty array
            setManagers([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Managers are fetched once on mount
    useEffect(() => {
        fetchManagers();
    }, [fetchManagers]);

    return {
        managers,
        isLoading,
        error,
        refetch: fetchManagers
    };
};
