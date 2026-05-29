// src/components/vitals/VitalsTrendGraph.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Vitals } from '../../types/vitals';

interface VitalsTrendGraphProps {
  vitals: Vitals[];
  isAntenatal?: boolean;  // ✅ Add this prop
}

export const VitalsTrendGraph: React.FC<VitalsTrendGraphProps> = ({ vitals, isAntenatal = false }) => {
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
      // ✅ Add antenatal fields if needed
      fetalHeartRate: isAntenatal ? vital.fetalHeartRate : undefined,
      fundalHeight: isAntenatal ? vital.fundalHeight : undefined,
    };
  }).filter(item => 
    item.systolic !== null || 
    item.temperature !== undefined || 
    item.pulse !== undefined ||
    (isAntenatal && (item.fetalHeartRate !== undefined || item.fundalHeight !== undefined))
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-sm">
          <p className="font-semibold text-gray-900">{data.fullTime}</p>
          {data.systolic && (
            <p className="text-sm text-blue-600">BP: {data.systolic}/{data.diastolic} mmHg</p>
          )}
          {data.temperature && (
            <p className="text-sm text-orange-600">Temp: {data.temperature}°C</p>
          )}
          {data.pulse && (
            <p className="text-sm text-green-600">Pulse: {data.pulse} bpm</p>
          )}
          {data.respiration && (
            <p className="text-sm text-purple-600">Resp: {data.respiration} bpm</p>
          )}
          {data.spo2 && (
            <p className="text-sm text-red-600">SpO2: {data.spo2}%</p>
          )}
          {isAntenatal && data.fetalHeartRate && (
            <p className="text-sm text-pink-600">Fetal Heart Rate: {data.fetalHeartRate} bpm</p>
          )}
          {isAntenatal && data.fundalHeight && (
            <p className="text-sm text-pink-600">Fundal Height: {data.fundalHeight} cm</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
        No chartable vitals data available
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 rounded-lg p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="timestamp" 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {chartData.some(d => d.systolic) && (
            <Line 
              type="monotone" 
              dataKey="systolic" 
              stroke="#3b82f6" 
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
              stroke="#ef4444" 
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
              stroke="#10b981" 
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
              stroke="#8b5cf6" 
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
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Temperature"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
          
          {isAntenatal && chartData.some(d => d.fetalHeartRate) && (
            <Line 
              type="monotone" 
              dataKey="fetalHeartRate" 
              stroke="#ec4899" 
              strokeWidth={2}
              name="Fetal Heart Rate"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};