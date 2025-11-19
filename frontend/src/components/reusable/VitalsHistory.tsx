import React from 'react';
import { Vitals } from '../types';
import { Activity } from 'lucide-react';

interface VitalsHistoryProps {
  previousVitals: Vitals[];
}

export const VitalsHistory: React.FC<VitalsHistoryProps> = ({ previousVitals }) => {
  if (previousVitals.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-900">
        <Activity className="w-4 h-4 text-blue-600" />
        Previous Vitals History
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">BP</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Temp</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pulse</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Resp</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SpO2</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Weight</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Height</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">BMI</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previousVitals.map((vital, index) => {
              const key = vital._id || `vital-${index}`;
              return (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-900">
                    {new Date(vital.recordedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{vital.bloodPressure || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{vital.temperature || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{vital.pulse || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{vital.respiration || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{vital.spo2 || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{vital.weight || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{vital.height || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{vital.bmi || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};