import React from 'react';
import type { Vitals } from '../../types';
import { Activity } from 'lucide-react';
import { TH, TH_ROW, TD, TD_MUTED, TR } from '../ui';

interface VitalsHistoryProps {
  previousVitals: Vitals[];
}

export const VitalsHistory: React.FC<VitalsHistoryProps> = ({ previousVitals }) => {
  if (previousVitals.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <Activity aria-hidden="true" className="h-4 w-4 text-[var(--icon-cyan-text)]" />
        Previous Vitals History
      </h3>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]" tabIndex={0} role="region" aria-label="Previous vitals history table">
        <table className="min-w-full divide-y divide-[var(--border-color)] text-sm">
          <thead className={TH_ROW}>
            <tr>
              <th scope="col" className={TH}>Date &amp; Time</th>
              <th scope="col" className={TH}>BP</th>
              <th scope="col" className={TH}>Temp</th>
              <th scope="col" className={TH}>Pulse</th>
              <th scope="col" className={TH}>Resp</th>
              <th scope="col" className={TH}>SpO2</th>
              <th scope="col" className={TH}>Weight</th>
              <th scope="col" className={TH}>Height</th>
              <th scope="col" className={TH}>BMI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {previousVitals.map((vital, index) => {
              const key = (vital as any)._id || `vital-${index}`;
              return (
                <tr key={key} className={TR}>
                  <td className={TD}>{new Date(vital.recordedAt).toLocaleString('en-GH')}</td>
                  <td className={TD_MUTED}>{vital.bloodPressure || '-'}</td>
                  <td className={TD_MUTED}>{vital.temperature || '-'}</td>
                  <td className={TD_MUTED}>{vital.pulse || '-'}</td>
                  <td className={TD_MUTED}>{vital.respiration || '-'}</td>
                  <td className={TD_MUTED}>{vital.spo2 || '-'}</td>
                  <td className={TD_MUTED}>{vital.weight || '-'}</td>
                  <td className={TD_MUTED}>{vital.height || '-'}</td>
                  <td className={TD_MUTED}>{vital.bmi || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
