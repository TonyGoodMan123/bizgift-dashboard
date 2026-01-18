import { useState, useEffect } from 'react';
import type { Manager } from '../types/api';
import { generateMockManagers } from '../utils/mockData';
import { api } from '../services/api';

interface UseManagersResult {
    managers: Manager[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Custom hook for fetching managers data
 */
export const useManagers = (): UseManagersResult => {
    const [managers, setManagers] = useState<Manager[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

    const fetchManagers = async () => {
        try {
            setIsLoading(true);
            setError(null);

            let data: Manager[];

            if (useMockData || !import.meta.env.VITE_API_URL) {
                data = generateMockManagers();
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                data = await api.getManagers();
            }

            setManagers(data);
        } catch (err: any) {
            console.error('Error fetching managers:', err);
            setError(err.message || 'Failed to fetch managers');
            setManagers(generateMockManagers());
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchManagers();
    }, []);

    return {
        managers,
        isLoading,
        error,
        refetch: fetchManagers
    };
};
