import React from 'react';
import { Vitals } from '../types';
import { Activity, Gauge, Thermometer, Heart, Wind, Droplets, Scale, Ruler } from 'lucide-react';

interface VitalsDisplayProps {
  vitals: Vitals | null;
}

export const VitalsDisplay: React.FC<VitalsDisplayProps> = ({ vitals }) => {
  if (!vitals) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 pt-2">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-900">
        <Activity className="w-4 h-4 text-blue-600" />
        Recent Vitals
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        {vitals.bloodPressure && (
          <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
            <Gauge className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <div className="font-semibold text-gray-900 text-xs">{vitals.bloodPressure}</div>
            <div className="text-xs text-gray-600">BP</div>
          </div>
        )}

        {vitals.temperature && (
          <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-200">
            <Thermometer className="w-4 h-4 text-orange-600 mx-auto mb-1" />
            <div className="font-semibold text-gray-900 text-xs">{vitals.temperature}°C</div>
            <div className="text-xs text-gray-600">Temp</div>
          </div>
        )}

        {vitals.pulse && (
          <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
            <Heart className="w-4 h-4 text-red-600 mx-auto mb-1" />
            <div className="font-semibold text-gray-900 text-xs">{vitals.pulse} bpm</div>
            <div className="text-xs text-gray-600">Pulse</div>
          </div>
        )}

        {vitals.respiration && (
          <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
            <Wind className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <div className="font-semibold text-gray-900 text-xs">{vitals.respiration} rpm</div>
            <div className="text-xs text-gray-600">Resp</div>
          </div>
        )}

        {vitals.spo2 && (
          <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
            <Droplets className="w-4 h-4 text-purple-600 mx-auto mb-1" />
            <div className="font-semibold text-gray-900 text-xs">{vitals.spo2}%</div>
            <div className="text-xs text-gray-600">SpO2</div>
          </div>
        )}

        {vitals.weight && (
          <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-200">
            <Scale className="w-4 h-4 text-yellow-600 mx-auto mb-1" />
            <div className="font-semibold text-gray-900 text-xs">{vitals.weight} kg</div>
            <div className="text-xs text-gray-600">Weight</div>
          </div>
        )}

        {vitals.height && (
          <div className="text-center p-2 bg-teal-50 rounded-lg border border-teal-200">
            <Ruler className="w-4 h-4 text-teal-600 mx-auto mb-1" />
            <div className="font-semibold text-gray-900 text-xs">{vitals.height} cm</div>
            <div className="text-xs text-gray-600">Height</div>
          </div>
        )}
      </div>
      {vitals.bmi && (
        <div className="mt-2 text-xs text-gray-600 text-center">
          Recorded: {new Date(vitals.recordedAt).toLocaleDateString()} • BMI: {vitals.bmi}
        </div>
      )}
    </div>
  );
};