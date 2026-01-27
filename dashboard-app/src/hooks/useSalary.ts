import { useState, useEffect, useCallback } from 'react';
import type { SalaryData } from '../types/api';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext.demo';

interface UseSalaryParams {
    month: string;
    managerId?: number | 'all';
}

interface UseSalaryResult {
    salaryData: SalaryData[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching salary data
 * Only real API data - no mock fallback
 */
export const useSalary = (params: UseSalaryParams): UseSalaryResult => {
    const { profile } = useAuth();
    const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSalary = useCallback(async () => {
        // Don't fetch if conditions aren't met
        if (!profile || !import.meta.env.VITE_API_URL || !params.month) {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const results = await api.getSalary({
                month: params.month,
                managerId: params.managerId
            });

            setSalaryData(results);
        } catch (err: any) {
            console.error('Failed to fetch salary data:', err);
            setError(err.message || 'Ошибка при загрузке данных о зарплате');
            setSalaryData([]);
        } finally {
            setIsLoading(false);
        }
    }, [params.month, params.managerId, profile]);

    // Fetch on mount or when params change
    useEffect(() => {
        fetchSalary();
    }, [fetchSalary]);

    return {
        salaryData,
        isLoading,
        error,
        refetch: fetchSalary
    };
};
