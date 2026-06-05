// src/pages/maternal/components/VitalsTab.tsx
import React from 'react';
import { Activity } from 'lucide-react';
import { SectionCard, EmptySlate, TD, TH } from './shared/TableComponents';

interface VitalsTabProps {
  latestVitals: any;
}

export const VitalsTab: React.FC<VitalsTabProps> = ({ latestVitals }) => {
  return (
    <div className="p-4">
      <SectionCard icon={<Activity className="w-4 h-4 text-pink-500" />} title="Latest Vitals" maxH="max-h-96">
        {latestVitals ? (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr><TH>Date / Time</TH><TH>BP</TH><TH>Temp</TH><TH>Pulse</TH><TH>Weight</TH><TH>FHR</TH><TH>Fundal Ht</TH></tr>
            </thead>
            <tbody>
              <tr className="hover:bg-[var(--bg-main)] transition-colors">
                <TD>{new Date(latestVitals.recordedAt).toLocaleString()}</TD>
                <TD>{latestVitals.bloodPressure || '—'}</TD>
                <TD>{latestVitals.temperature ? `${latestVitals.temperature}°C` : '—'}</TD>
                <TD>{latestVitals.pulse || '—'}</TD>
                <TD>{latestVitals.weight ? `${latestVitals.weight}kg` : '—'}</TD>
                <TD>{latestVitals.fetalHeartRate || '—'}</TD>
                <TD>{latestVitals.fundalHeight ? `${latestVitals.fundalHeight}cm` : '—'}</TD>
              </tr>
            </tbody>
          </table>
        ) : (
          <EmptySlate icon={<Activity className="w-8 h-8" />} label="No vitals recorded" />
        )}
      </SectionCard>
    </div>
  );
};