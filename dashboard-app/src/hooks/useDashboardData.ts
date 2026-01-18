import { useMemo } from 'react';
import { useDeals } from './useDeals';
import { useManagers } from './useManagers';
import { useKPI } from './useKPI';
import { generateMockMetrics, generateMockSalesData, generateMockManagerPerformance } from '../utils/mockData';

/**
 * Master hook for all Dashboard data
 * Combines multiple data sources
 */
export const useDashboardData = (dateRange: { from: string; to: string }) => {
    const deals = useDeals({ dateFrom: dateRange.from, dateTo: dateRange.to });
    const managers = useManagers();
    const kpi = useKPI({ dateFrom: dateRange.from, dateTo: dateRange.to });

    // Generate derived data
    const metrics = useMemo(() => {
        return generateMockMetrics(dateRange);
    }, [dateRange.from, dateRange.to]);

    const salesData = useMemo(() => {
        return generateMockSalesData(dateRange);
    }, [dateRange.from, dateRange.to]);

    const managerPerformance = useMemo(() => {
        return generateMockManagerPerformance(dateRange);
    }, [dateRange.from, dateRange.to]);

    const isLoading = deals.isLoading || managers.isLoading || kpi.isLoading;
    const error = deals.error || managers.error || kpi.error;

    return {
        deals: deals.deals,
        managers: managers.managers,
        kpiData: kpi.kpiData,
        metrics,
        salesData,
        managerPerformance,
        isLoading,
        error,
        refetch: () => {
            deals.refetch();
            managers.refetch();
            kpi.refetch();
        }
    };
};
