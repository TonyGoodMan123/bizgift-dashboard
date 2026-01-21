import { useDeals } from './useDeals';
import { useManagers } from './useManagers';
import { useKPI } from './useKPI';

/**
 * Master hook for all Dashboard data
 * Combines multiple data sources - ONLY REAL DATA, NO MOCKS
 */
export const useDashboardData = (dateRange: { from: string; to: string }) => {
    const deals = useDeals({ dateFrom: dateRange.from, dateTo: dateRange.to });
    const managers = useManagers();
    const kpi = useKPI({ dateFrom: dateRange.from, dateTo: dateRange.to });

    const isLoading = deals.isLoading || managers.isLoading || kpi.isLoading;
    const error = deals.error || managers.error || kpi.error;

    // Check if we have any data
    const hasData = deals.deals.length > 0 || managers.managers.length > 0;

    return {
        deals: deals.deals,
        managers: managers.managers,
        kpiData: kpi.kpiData,
        isLoading,
        error,
        hasData,
        refetch: () => {
            deals.refetch();
            managers.refetch();
            kpi.refetch();
        },
        // Individual fetch functions for manual triggering
        fetchDeals: deals.fetchDeals,
        fetchKPI: kpi.fetchKPI
    };
};
