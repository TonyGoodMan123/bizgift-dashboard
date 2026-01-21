import { useState, useEffect, useCallback } from 'react';
import type { KpiActivity, KpiParams } from '../types/api';
import { api } from '../services/api';

interface UseKPIResult {
    kpiData: KpiActivity[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
    fetchKPI: () => Promise<void>;
}

/**
 * Custom hook for fetching KPI activity data
 * Only real API data - no mock fallback
 */
export const useKPI = (params: KpiParams): UseKPIResult => {
    const [kpiData, setKpiData] = useState<KpiActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchKPI = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Only use real API - no mock fallback
            const data = await api.getKPI(params);
            setKpiData(data);
        } catch (err: any) {
            console.error('Error fetching KPI:', err);
            setError(err.message || 'Не удалось загрузить KPI данные');
            // No mock fallback - set empty array
            setKpiData([]);
        } finally {
            setIsLoading(false);
        }
    }, [params.dateFrom, params.dateTo, params.managerId]);

    // Fetch KPI when params change
    useEffect(() => {
        fetchKPI();
    }, [fetchKPI]);

    return {
        kpiData,
        isLoading,
        error,
        refetch: fetchKPI,
        fetchKPI
    };
};
