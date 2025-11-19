// src/components/patients/PatientDetailsHeader.tsx
import { User, Edit, Plus, ArrowLeft, Folder } from 'lucide-react';

interface PatientDetailsHeaderProps {
  patient: any;
  canEdit: boolean;
  canCreateAttendance: boolean;
  onEdit: () => void;
  onNewAttendance: () => void;
  onBack: () => void;
}

export const PatientDetailsHeader: React.FC<PatientDetailsHeaderProps> = ({
  patient,
  canEdit,
  canCreateAttendance,
  onEdit,
  onNewAttendance,
  onBack
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl p-4 text-white shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/20 overflow-hidden">
              {patient.imageUrl ? (
                <img 
                  src={patient.imageUrl} 
                  alt={patient.fullName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              {!patient.imageUrl && <User className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{patient.fullName}</h1>
              <div className="flex items-center gap-3 text-blue-100 mt-1 text-sm">
                <div className="flex items-center gap-1">
                  <Folder className="w-4 h-4" />
                  <span className="font-mono font-semibold">{patient.folderNumber}</span>
                </div>
                <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span className="capitalize">{patient.gender}</span>
                </div>
                <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Age:</span>
                  <span>{patient.age} years</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCreateAttendance && (
            <button
              onClick={onNewAttendance}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 hover:shadow-md font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Visit</span>
            </button>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 font-semibold text-sm"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};