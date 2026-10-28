import React from 'react';
import type { Vitals } from '../../types';
import { Activity, Gauge, Thermometer, Heart, Wind, Droplets, Scale, Ruler } from 'lucide-react';

interface VitalsDisplayProps {
  vitals: Vitals | null;
}

const TILE = {
  cyan: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
  orange: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]',
  red: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  green: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
  purple: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
  yellow: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
  neutral: 'bg-[var(--bg-main)] text-[var(--text-secondary)]',
} as const;

export const VitalsDisplay: React.FC<VitalsDisplayProps> = ({ vitals }) => {
  if (!vitals) return null;

  const tiles: { key: string; icon: React.ReactNode; hue: keyof typeof TILE; value: string; label: string }[] = []
  if (vitals.bloodPressure) tiles.push({ key: 'bp', icon: <Gauge className="w-4 h-4 mx-auto mb-1" />, hue: 'cyan', value: vitals.bloodPressure, label: 'BP' });
  if (vitals.temperature) tiles.push({ key: 'temp', icon: <Thermometer className="w-4 h-4 mx-auto mb-1" />, hue: 'orange', value: `${vitals.temperature}°C`, label: 'Temp' });
  if (vitals.pulse) tiles.push({ key: 'pulse', icon: <Heart className="w-4 h-4 mx-auto mb-1" />, hue: 'red', value: `${vitals.pulse} bpm`, label: 'Pulse' });
  if (vitals.respiration) tiles.push({ key: 'resp', icon: <Wind className="w-4 h-4 mx-auto mb-1" />, hue: 'green', value: `${vitals.respiration} rpm`, label: 'Resp' });
  if (vitals.spo2) tiles.push({ key: 'spo2', icon: <Droplets className="w-4 h-4 mx-auto mb-1" />, hue: 'purple', value: `${vitals.spo2}%`, label: 'SpO2' });
  if (vitals.weight) tiles.push({ key: 'weight', icon: <Scale className="w-4 h-4 mx-auto mb-1" />, hue: 'yellow', value: `${vitals.weight} kg`, label: 'Weight' });
  if (vitals.height) tiles.push({ key: 'height', icon: <Ruler className="w-4 h-4 mx-auto mb-1" />, hue: 'neutral', value: `${vitals.height} cm`, label: 'Height' });

  return (
    <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-2 text-[var(--text-primary)]">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-[var(--icon-cyan-text)]" />
        Recent Vitals
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        {tiles.map(({ key, icon, hue, value, label }) => (
          <div key={key} className={`text-center p-2 rounded-lg ${TILE[hue]}`}>
            {icon}
            <div className="font-semibold text-xs">{value}</div>
            <div className="text-xs opacity-80">{label}</div>
          </div>
        ))}
      </div>
      {vitals.bmi && (
        <div className="mt-2 text-xs text-[var(--text-secondary)] text-center">
          Recorded: {new Date(vitals.recordedAt).toLocaleDateString()} • BMI: {vitals.bmi}
        </div>
      )}
    </div>
  );
};
