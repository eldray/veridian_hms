// src/components/AttendanceTypeSelector.tsx
import { Stethoscope, User, Activity, AlertTriangle, Scan, Baby, Home, Hospital, Shield } from 'lucide-react';
import type { AttendanceType } from '../types';

interface AttendanceTypeSelectorProps {
  attendanceType: AttendanceType;
  onAttendanceTypeChange: (type: AttendanceType) => void;
}

const attendanceTypes = [
  {
    value: 'general_opd' as AttendanceType,
    label: 'General OPD',
    description: 'Common ailments and routine check-ups',
    icon: User
  },
  {
    value: 'specialist_consultation' as AttendanceType,
    label: 'Specialist Consultation',
    description: 'Specialist doctor consultation',
    icon: Stethoscope
  },
  {
    value: 'antenatal_care' as AttendanceType,
    label: 'Antenatal Care (ANC)',
    description: 'Pregnancy and maternity care',
    icon: Baby
  },
  {
    value: 'diagnostic_opd' as AttendanceType,
    label: 'Diagnostic OPD',
    description: 'Laboratory tests and diagnostics',
    icon: Scan
  },
  {
    value: 'emergency' as AttendanceType,
    label: 'Emergency',
    description: 'Emergency medical care',
    icon: AlertTriangle
  },
  {
    value: 'other_opd' as AttendanceType,
    label: 'Other OPD',
    description: 'Other outpatient services',
    icon: Activity
  },
  {
    value: 'inpatient' as AttendanceType,
    label: 'Inpatient (IPD)',
    description: 'Hospital admission required',
    icon: Home
  }
];

export default function AttendanceTypeSelector({
  attendanceType,
  onAttendanceTypeChange
}: AttendanceTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <label className="block text-sm font-semibold text-gray-700 text-lg">
        Attendance Type *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {attendanceTypes.map((type) => {
          const Icon = type.icon;
          return (
            <div
              key={type.value}
              className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                attendanceType === type.value
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-teal-50 shadow-lg'
                  : 'border-gray-300 hover:border-gray-400 bg-white'
              }`}
              onClick={() => onAttendanceTypeChange(type.value)}
            >
              <div className="flex items-start gap-4">
                <Icon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${
                  attendanceType === type.value ? 'text-blue-600' : 'text-gray-600'
                }`} />
                <div>
                  <p className="font-bold text-gray-900 text-lg">{type.label}</p>
                  <p className="text-sm text-gray-600 mt-2">{type.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
