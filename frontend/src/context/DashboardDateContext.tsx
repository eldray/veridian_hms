// src/context/DashboardDateContext.tsx
// Provides the active date range to every self-fetching dashboard panel.
// Dashboard.tsx is the provider; all panels consume this via useDashboardDate().

import { createContext, useContext } from 'react';

export type DatePreset = 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
}

export interface DashboardDateCtx {
    preset: DatePreset;
    dateRange: DateRange;
}

export const DashboardDateContext = createContext<DashboardDateCtx>({
    preset: 'today',
    dateRange: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    },
});

export const useDashboardDate = () => useContext(DashboardDateContext);