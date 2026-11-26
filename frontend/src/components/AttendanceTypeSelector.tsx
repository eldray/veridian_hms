// src/components/AttendanceTypeSelector.tsx - UPDATED WITH RESPONSIVE DESIGN
import { Stethoscope, User, Activity, AlertTriangle, Scan, Baby, Home, Syringe } from 'lucide-react';
import type { AttendanceType } from '../types';

interface AttendanceTypeSelectorProps {
  attendanceType: AttendanceType;
  onAttendanceTypeChange: (type: AttendanceType) => void;
  disabled?: boolean;
}

type AttendanceColor = 'blue' | 'purple' | 'pink' | 'teal' | 'red' | 'gray' | 'indigo';

type AttendanceTypeOption = {
  value: AttendanceType;
  label: string;
  description: string;
  icon: typeof User;
  color: AttendanceColor;
};

const attendanceTypes: AttendanceTypeOption[] = [
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
    value: 'immunization' as AttendanceType,
    label: 'Immunization / Vaccination',
    description: 'Routine and catch-up vaccinations',
    icon: Syringe,
    color: 'teal'
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
  const getColorClasses = (type: { color: AttendanceColor }, isSelected: boolean) => {
    const colors: Record<AttendanceColor, string> = {
      blue: isSelected ? 'border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]' : 'hover:border-[var(--icon-cyan-text)]',
      purple: isSelected ? 'border-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)]' : 'hover:border-[var(--icon-purple-text)]',
      pink: isSelected ? 'border-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)]' : 'hover:border-[var(--icon-purple-text)]',
      teal: isSelected ? 'border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]' : 'hover:border-[var(--icon-cyan-text)]',
      red: isSelected ? 'border-[var(--icon-red-text)] bg-[var(--icon-red-bg)]' : 'hover:border-[var(--icon-red-text)]',
      gray: isSelected ? 'border-[var(--border-color)] bg-[var(--bg-main)]' : 'hover:border-[var(--border-color)]',
      indigo: isSelected ? 'border-[var(--icon-blue-text)] bg-[var(--icon-blue-bg)]' : 'hover:border-[var(--icon-blue-text)]'
    };
    return colors[type.color] ?? colors.blue;
  };

  const getIconColor = (type: { color: AttendanceColor }, isSelected: boolean) => {
    const colors: Record<AttendanceColor, string> = {
      blue: isSelected ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)]',
      purple: isSelected ? 'text-[var(--icon-purple-text)]' : 'text-[var(--text-secondary)]',
      pink: isSelected ? 'text-[var(--icon-purple-text)]' : 'text-[var(--text-secondary)]',
      teal: isSelected ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)]',
      red: isSelected ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-secondary)]',
      gray: isSelected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]',
      indigo: isSelected ? 'text-[var(--icon-blue-text)]' : 'text-[var(--text-secondary)]'
    };
    return colors[type.color] ?? colors.blue;
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-[var(--text-primary)]">
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
                  ? 'opacity-50 cursor-not-allowed border-[var(--border-color)] bg-[var(--bg-main)]' 
                  : `${getColorClasses(type, isSelected)} ${
                      isSelected ? 'shadow-md' : 'hover:shadow-sm'
                    }`
              }`}
              onClick={() => !disabled && onAttendanceTypeChange(type.value)}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  disabled ? 'text-[var(--text-tertiary)]' : getIconColor(type, isSelected)
                }`} />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-sm ${
                    disabled ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                  }`}>
                    {type.label}
                  </p>
                  <p className={`text-xs mt-1 ${
                    disabled ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'
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