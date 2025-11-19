import React from 'react';
import { TrendingUp, Gauge, Activity, Thermometer } from 'lucide-react';
import type { Vitals, VitalsTrend } from '../../types';

interface VitalsVisualizationProps {
  vitals: Vitals[];
}

export const VitalsVisualization: React.FC<VitalsVisualizationProps> = ({ vitals }) => {
  const getVitalsTrends = (): VitalsTrend[] => {
    if (vitals.length === 0) return [];

    const trends: VitalsTrend[] = [];
    const latestVitals = vitals[vitals.length - 1];

    // Blood Pressure Trend
    if (latestVitals.bloodPressure) {
      const [systolic, diastolic] = latestVitals.bloodPressure.split('/').map(Number);
      const isNormal = systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80;
      trends.push({
        label: 'Blood Pressure',
        value: systolic,
        unit: 'mmHg',
        timestamp: latestVitals.recordedAt,
        isNormal,
        normalRange: '90/60 - 120/80'
      });
    }

    // Pulse Trend
    if (latestVitals.pulse) {
      const isNormal = latestVitals.pulse >= 60 && latestVitals.pulse <= 100;
      trends.push({
        label: 'Heart Rate',
        value: latestVitals.pulse,
        unit: 'bpm',
        timestamp: latestVitals.recordedAt,
        isNormal,
        normalRange: '60-100'
      });
    }

    // Temperature Trend
    if (latestVitals.temperature) {
      const isNormal = latestVitals.temperature >= 36.1 && latestVitals.temperature <= 37.2;
      trends.push({
        label: 'Temperature',
        value: latestVitals.temperature,
        unit: '°C',
        timestamp: latestVitals.recordedAt,
        isNormal,
        normalRange: '36.1-37.2'
      });
    }

    // SpO2 Trend
    if (latestVitals.spo2) {
      const isNormal = latestVitals.spo2 >= 95;
      trends.push({
        label: 'Oxygen Saturation',
        value: latestVitals.spo2,
        unit: '%',
        timestamp: latestVitals.recordedAt,
        isNormal,
        normalRange: '≥95%'
      });
    }

    return trends;
  };

  const getVitalIcon = (label: string) => {
    switch (label) {
      case 'Blood Pressure': return <Gauge className="w-5 h-5" />;
      case 'Heart Rate': return <Activity className="w-5 h-5" />;
      case 'Temperature': return <Thermometer className="w-5 h-5" />;
      case 'Oxygen Saturation': return <TrendingUp className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const vitalsTrends = getVitalsTrends();

  if (vitalsTrends.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-[var(--icon-cyan-text)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Vital Signs Overview</h2>
          <p className="text-sm text-[var(--text-secondary)]">Latest readings with normal ranges</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {vitalsTrends.map((trend, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              trend.isNormal 
                ? 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)]' 
                : 'bg-[var(--icon-red-bg)] border-[var(--icon-red-text)]'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                trend.isNormal ? 'bg-[var(--icon-green-text)] text-white' : 'bg-[var(--icon-red-text)] text-white'
              }`}>
                {getVitalIcon(trend.label)}
              </div>
              <span className="font-semibold text-[var(--text-primary)] text-sm">{trend.label}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{trend.value}</span>
              <span className="text-sm text-[var(--text-secondary)]">{trend.unit}</span>
            </div>
            <div className={`text-xs font-medium ${
              trend.isNormal ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'
            }`}>
              {trend.isNormal ? '✓ Normal' : '⚠ Abnormal'} • {trend.normalRange}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-2">
              {new Date(trend.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};