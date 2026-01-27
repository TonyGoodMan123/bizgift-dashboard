import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Call, CallsParams } from '../types/api';

export const useCalls = (params: CallsParams) => {
    const [calls, setCalls] = useState<Call[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCalls = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getCalls(params);
            setCalls(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch calls');
        } finally {
            setIsLoading(false);
        }
    }, [params.dateFrom, params.dateTo, params.managerId]);

    useEffect(() => {
        fetchCalls();
    }, [fetchCalls]);

    return { calls, isLoading, error, refetch: fetchCalls };
};
