import { useDeals } from './useDeals';
import { useManagers } from './useManagers';
import { useKPI } from './useKPI';
import { useSalary } from './useSalary';

interface DashboardDataParams {
    from: string;
    to: string;
    managerId?: number | 'all';
}

/**
 * Master hook for all Dashboard data
 * Combines multiple data sources - ONLY REAL DATA, NO MOCKS
 */
export const useDashboardData = (params: DashboardDataParams) => {
    const deals = useDeals({ dateFrom: params.from, dateTo: params.to, managerId: params.managerId });
    const managers = useManagers();
    const kpi = useKPI({ dateFrom: params.from, dateTo: params.to, managerId: params.managerId });

    // Salary month is derived from the "from" date
    const salaryMonth = params.from.substring(0, 7); // YYYY-MM
    const salary = useSalary({
        month: salaryMonth,
        managerId: params.managerId
    });

    const isLoading = deals.isLoading || managers.isLoading || kpi.isLoading || salary.isLoading;
    const error = deals.error || managers.error || kpi.error || salary.error;

    // Check if we have any core data
    const hasData = deals.deals.length > 0 || managers.managers.length > 0;

    const refreshAll = async () => {
        // Run core refetches in parallel
        const refetches = [
            deals.refetch(),
            managers.refetch(),
            kpi.refetch()
        ];

        // Only refetch salary if a specific manager is selected (conditional as per requirements)
        if (params.managerId && params.managerId !== 'all') {
            refetches.push(salary.refetch());
        }

        await Promise.all(refetches);
    };

    return {
        deals: deals.deals,
        managers: managers.managers,
        kpiData: kpi.kpiData,
        salaryData: salary.salaryData, // Now centralized
        isLoading,
        error,
        hasData,
        refreshAll,
        refetch: refreshAll, // Maintain backward compatibility if needed
        // Individual fetch functions
        fetchDeals: deals.fetchDeals,
        fetchKPI: kpi.fetchKPI
    };
};
