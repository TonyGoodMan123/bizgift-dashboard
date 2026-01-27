import { useState, useEffect } from 'react';

const STORAGE_KEY = 'dashboard_manager_visibility';

export interface VisibilityState {
    visibleIds: Set<number>;
    isConfigured: boolean;
}

/**
 * Custom hook to get and monitor visible manager IDs from localStorage
 * Standard 'storage' event handles cross-tab syncing.
 * Local polling (1s) handles same-window updates from different components.
 */
export const useManagerVisibility = (): VisibilityState => {
    const [state, setState] = useState<VisibilityState>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const ids = (JSON.parse(stored) as any[]).map(id => Number(id));
                return {
                    visibleIds: new Set(ids),
                    isConfigured: true
                };
            } catch (e) {
                return { visibleIds: new Set(), isConfigured: false };
            }
        }
        return { visibleIds: new Set(), isConfigured: false };
    });

    useEffect(() => {
        const load = () => {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    const ids = (JSON.parse(stored) as any[]).map(id => Number(id));
                    setState({ visibleIds: new Set(ids), isConfigured: true });
                } catch (e) {
                    setState({ visibleIds: new Set(), isConfigured: false });
                }
            } else {
                setState({ visibleIds: new Set(), isConfigured: false });
            }
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) load();
        };

        const interval = setInterval(load, 1000);

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    return state;
};
