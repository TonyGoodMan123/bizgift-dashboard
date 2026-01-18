import { useState, useEffect } from 'react';
import type { KpiActivity, KpiParams } from '../types/api';
import { generateMockKPI } from '../utils/mockData';
import { api } from '../services/api';

interface UseKPIResult {
    kpiData: KpiActivity[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Custom hook for fetching KPI activity data
 */
export const useKPI = (params: KpiParams): UseKPIResult => {
    const [kpiData, setKpiData] = useState<KpiActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

    const fetchKPI = async () => {
        try {
            setIsLoading(true);
            setError(null);

            let data: KpiActivity[];

            if (useMockData || !import.meta.env.VITE_API_URL) {
                data = generateMockKPI(params);
                await new Promise(resolve => setTimeout(resolve, 250));
            } else {
                data = await api.getKPI(params);
            }

            setKpiData(data);
        } catch (err: any) {
            console.error('Error fetching KPI:', err);
            setError(err.message || 'Failed to fetch KPI data');
            setKpiData(generateMockKPI(params));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKPI();
    }, [params.dateFrom, params.dateTo, params.managerId]);

    return {
        kpiData,
        isLoading,
        error,
        refetch: fetchKPI
    };
};
