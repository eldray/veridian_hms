// src/components/AttendanceTypeSelector.tsx - UPDATED WITH RESPONSIVE DESIGN
import { Stethoscope, User, Activity, AlertTriangle, Scan, Baby, Home } from 'lucide-react';
import type { AttendanceType } from '../types';

interface AttendanceTypeSelectorProps {
  attendanceType: AttendanceType;
  onAttendanceTypeChange: (type: AttendanceType) => void;
  disabled?: boolean;
}

const attendanceTypes = [
  {
    value: 'general_opd' as AttendanceType,
    label: 'General OPD',
    description: 'Common ailments and routine check-ups',
    icon: User,
    color: 'blue'
  },
  {
    value: 'specialist_consultation' as AttendanceType,
    label: 'Specialist Consultation',
    description: 'Specialist doctor consultation',
    icon: Stethoscope,
    color: 'purple'
  },
  {
    value: 'antenatal_care' as AttendanceType,
    label: 'Antenatal Care (ANC)',
    description: 'Pregnancy and maternity care',
    icon: Baby,
    color: 'pink'
  },
  {
    value: 'diagnostic_opd' as AttendanceType,
    label: 'Diagnostic OPD',
    description: 'Laboratory tests and diagnostics',
    icon: Scan,
    color: 'teal'
  },
  {
    value: 'emergency' as AttendanceType,
    label: 'Emergency',
    description: 'Emergency medical care',
    icon: AlertTriangle,
    color: 'red'
  },
  {
    value: 'other_opd' as AttendanceType,
    label: 'Other OPD',
    description: 'Other outpatient services',
    icon: Activity,
    color: 'gray'
  },
  {
    value: 'inpatient' as AttendanceType,
    label: 'Inpatient (IPD)',
    description: 'Hospital admission required',
    icon: Home,
    color: 'indigo'
  }
];

export default function AttendanceTypeSelector({
  attendanceType,
  onAttendanceTypeChange,
  disabled = false
}: AttendanceTypeSelectorProps) {
  const getColorClasses = (type: typeof attendanceTypes[0], isSelected: boolean) => {
    const colors = {
      blue: isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-300',
      purple: isSelected ? 'border-purple-500 bg-purple-50' : 'hover:border-purple-300',
      pink: isSelected ? 'border-pink-500 bg-pink-50' : 'hover:border-pink-300',
      teal: isSelected ? 'border-teal-500 bg-teal-50' : 'hover:border-teal-300',
      red: isSelected ? 'border-red-500 bg-red-50' : 'hover:border-red-300',
      gray: isSelected ? 'border-gray-500 bg-gray-50' : 'hover:border-gray-300',
      indigo: isSelected ? 'border-indigo-500 bg-indigo-50' : 'hover:border-indigo-300'
    };
    return colors[type.color] || colors.blue;
  };

  const getIconColor = (type: typeof attendanceTypes[0], isSelected: boolean) => {
    const colors = {
      blue: isSelected ? 'text-blue-600' : 'text-gray-600',
      purple: isSelected ? 'text-purple-600' : 'text-gray-600',
      pink: isSelected ? 'text-pink-600' : 'text-gray-600',
      teal: isSelected ? 'text-teal-600' : 'text-gray-600',
      red: isSelected ? 'text-red-600' : 'text-gray-600',
      gray: isSelected ? 'text-gray-600' : 'text-gray-600',
      indigo: isSelected ? 'text-indigo-600' : 'text-gray-600'
    };
    return colors[type.color] || colors.blue;
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-700">
        Attendance Type *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {attendanceTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = attendanceType === type.value;
          
          return (
            <div
              key={type.value}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                disabled 
                  ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' 
                  : `${getColorClasses(type, isSelected)} ${
                      isSelected ? 'shadow-md' : 'hover:shadow-sm'
                    }`
              }`}
              onClick={() => !disabled && onAttendanceTypeChange(type.value)}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  disabled ? 'text-gray-400' : getIconColor(type, isSelected)
                }`} />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-sm ${
                    disabled ? 'text-gray-500' : 'text-gray-900'
                  }`}>
                    {type.label}
                  </p>
                  <p className={`text-xs mt-1 ${
                    disabled ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {type.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}