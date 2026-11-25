// src/components/patients/CompactBasicInfo.tsx - WITH DEBUGGING
import { User, Calendar, Phone, MapPin, Folder } from 'lucide-react';

interface CompactBasicInfoProps {
  patient: any;
}

export const CompactBasicInfo: React.FC<CompactBasicInfoProps> = ({ patient }) => {
  // ✅ ADD DEBUGGING
  console.log('🔍 CompactBasicInfo rendering:', {
    patient: patient ? {
      fullName: patient.fullName,
      folderNumber: patient.folderNumber,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      contact: patient.contact,
      address: patient.address
    } : 'NO PATIENT'
  });

  if (!patient) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No patient data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Folder Number */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Folder Number</p>
            <p className="text-base font-bold text-blue-900">{patient.folderNumber || 'Not assigned'}</p>
          </div>
        </div>
      </div>

      {/* Basic Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-white p-2 rounded-lg border border-gray-200">
          <div className="flex items-center gap-1 mb-1">
            <User className="w-3 h-3 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Full Name</p>
          </div>
          <p className="text-sm font-medium text-gray-900">{patient.fullName || 'Not provided'}</p>
        </div>

        <div className="bg-white p-2 rounded-lg border border-gray-200">
          <div className="flex items-center gap-1 mb-1">
            <User className="w-3 h-3 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Gender</p>
          </div>
          <p className="text-sm font-medium text-gray-900 capitalize">{patient.gender || 'Not provided'}</p>
        </div>

        <div className="bg-white p-2 rounded-lg border border-gray-200">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Date of Birth</p>
          </div>
          <p className="text-sm font-medium text-gray-900">
            {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not provided'}
          </p>
        </div>

        <div className="bg-white p-2 rounded-lg border border-gray-200">
          <div className="flex items-center gap-1 mb-1">
            <Phone className="w-3 h-3 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Contact</p>
          </div>
          <p className="text-sm font-medium text-gray-900">{patient.contact || 'Not provided'}</p>
        </div>

        <div className="bg-white p-2 rounded-lg border border-gray-200 md:col-span-2">
          <div className="flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Address</p>
          </div>
          <p className="text-sm font-medium text-gray-900">{patient.address || 'Not provided'}</p>
        </div>
      </div>

      {/* Debug patient data - Remove after fixing */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="font-semibold text-gray-900 text-sm mb-2">Raw Patient Data</h4>
        <pre className="text-xs text-gray-600 overflow-auto max-h-32">
          {JSON.stringify(patient, null, 2)}
        </pre>
      </div>
    </div>
  );
};