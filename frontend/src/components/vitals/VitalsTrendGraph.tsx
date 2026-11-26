// src/components/vitals/VitalsTrendGraph.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Vitals } from '../../types/vitals';

interface VitalsTrendGraphProps {
  vitals: Vitals[];
  isAntenatal?: boolean;  // ✅ Add this prop
}

export const VitalsTrendGraph: React.FC<VitalsTrendGraphProps> = ({ vitals }) => {
  // Prepare data for the chart
  const chartData = vitals.map((vital, index) => {
    const bp = vital.bloodPressure ? vital.bloodPressure.split('/').map(Number) : [null, null];
    
    return {
      name: `Rec ${index + 1}`,
      timestamp: new Date(vital.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fullTime: new Date(vital.recordedAt).toLocaleString(),
      systolic: bp[0],
      diastolic: bp[1],
      temperature: vital.temperature,
      pulse: vital.pulse,
      respiration: vital.respiration,
      spo2: vital.spo2,
    };
  }).filter(item => 
    item.systolic !== null || 
    item.temperature !== undefined || 
    item.pulse !== undefined
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[var(--bg-card)] p-3 border border-[var(--border-color)] rounded-lg shadow-sm">
          <p className="font-semibold text-[var(--text-primary)]">{data.fullTime}</p>
          {data.systolic && (
            <p className="text-sm text-[var(--icon-blue-text)]">BP: {data.systolic}/{data.diastolic} mmHg</p>
          )}
          {data.temperature && (
            <p className="text-sm text-[var(--icon-yellow-text)]">Temp: {data.temperature}°C</p>
          )}
          {data.pulse && (
            <p className="text-sm text-[var(--icon-green-text)]">Pulse: {data.pulse} bpm</p>
          )}
          {data.respiration && (
            <p className="text-sm text-[var(--icon-purple-text)]">Resp: {data.respiration} bpm</p>
          )}
          {data.spo2 && (
            <p className="text-sm text-[var(--icon-red-text)]">SpO2: {data.spo2}%</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-full bg-[var(--bg-main)] rounded-lg flex items-center justify-center text-[var(--text-secondary)]">
        No chartable vitals data available
      </div>
    );
  }

  return (
    <div className="h-full bg-[var(--bg-main)] rounded-lg p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis 
            dataKey="timestamp" 
            tick={{ fontSize: 12 }}
            stroke="var(--text-tertiary)"
          />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--text-tertiary)" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {chartData.some(d => d.systolic) && (
            <Line 
              type="monotone" 
              dataKey="systolic" 
              stroke="var(--icon-blue-text)" 
              strokeWidth={3}
              name="Systolic BP"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          
          {chartData.some(d => d.diastolic) && (
            <Line 
              type="monotone" 
              dataKey="diastolic" 
              stroke="var(--icon-red-text)" 
              strokeWidth={3}
              name="Diastolic BP"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          
          {chartData.some(d => d.pulse) && (
            <Line 
              type="monotone" 
              dataKey="pulse" 
              stroke="var(--icon-green-text)" 
              strokeWidth={2}
              name="Pulse Rate"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
          
          {chartData.some(d => d.respiration) && (
            <Line 
              type="monotone" 
              dataKey="respiration" 
              stroke="var(--icon-purple-text)" 
              strokeWidth={2}
              name="Respiration"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
          
          {chartData.some(d => d.temperature) && (
            <Line 
              type="monotone" 
              dataKey="temperature" 
              stroke="var(--icon-yellow-text)" 
              strokeWidth={2}
              name="Temperature"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};