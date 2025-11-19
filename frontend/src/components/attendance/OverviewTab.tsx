// src/components/attendance/OverviewTab.tsx
import { User, Calendar, Stethoscope, CreditCard, Activity, Pill, FlaskConical, Scissors, DollarSign, Folder, Phone, MapPin } from 'lucide-react';

interface OverviewTabProps {
  attendance: any;
  patient: any;
  getClinicianName: (attendance: any) => string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ 
  attendance, 
  patient, 
  getClinicianName 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'admitted': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'active': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPaymentModeLabel = (mode: string) => {
    switch (mode) {
      case 'cash': return 'Cash';
      case 'nhis': return 'NHIS';
      case 'private_insurance': return 'Private Insurance';
      default: return mode;
    }
  };

  const getAttendanceTypeLabel = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General OPD';
  };

  return (
    <div className="p-8 space-y-8">
      {/* Patient & Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Patient Information */}
          {patient && (
            <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" />
                Patient Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Patient Name</p>
                  <p className="font-bold text-lg text-gray-900">{patient.fullName}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Folder Number</p>
                  <p className="font-bold text-lg text-gray-900">{patient.folderNumber || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Age & Gender</p>
                  <p className="font-bold text-lg text-gray-900">
                    {patient.age || 'N/A'} years • {patient.gender || 'N/A'}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Contact</p>
                  <p className="font-bold text-lg text-gray-900">{patient.contact || 'N/A'}</p>
                </div>
                {patient.address && (
                  <div className="bg-white rounded-xl p-4 border border-gray-200 md:col-span-2">
                    <p className="text-sm text-gray-600 font-medium">Address</p>
                    <p className="font-bold text-lg text-gray-900">{patient.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendance Details */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Attendance Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Date & Time</p>
                  <p className="font-bold text-gray-900">
                    {new Date(attendance.dateTime).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <Stethoscope className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Attendance Type</p>
                  <p className="font-bold text-gray-900">
                    {getAttendanceTypeLabel(attendance.attendanceType)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <CreditCard className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Payment Mode</p>
                  <p className="font-bold text-gray-900">{getPaymentModeLabel(attendance.paymentMode)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <Activity className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Status</p>
                  <span className={`px-4 py-2 text-sm font-bold rounded-full ${getStatusColor(attendance.status)}`}>
                    {attendance.status?.charAt(0).toUpperCase() + attendance.status?.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Medical Information</h3>
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Complaints</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {attendance.complaints || 'No complaints recorded'}
                </p>
              </div>
              {attendance.diagnosis && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <p className="text-sm text-gray-600 font-medium mb-2">Diagnosis</p>
                  <p className="font-semibold text-gray-900 text-lg">{attendance.diagnosis}</p>
                </div>
              )}
              {attendance.medicalNotes && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <p className="text-sm text-gray-600 font-medium mb-2">Medical Notes</p>
                  <p className="font-semibold text-gray-900">{attendance.medicalNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vitals */}
          {attendance.vitals && Object.keys(attendance.vitals).some(key => attendance.vitals[key]) && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attendance.vitals.bloodPressure && (
                  <div className="text-center bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-gray-600 font-medium">Blood Pressure</p>
                    <p className="font-bold text-2xl text-gray-900">{attendance.vitals.bloodPressure}</p>
                  </div>
                )}
                {attendance.vitals.temperature && (
                  <div className="text-center bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 border border-green-200">
                    <p className="text-sm text-gray-600 font-medium">Temperature</p>
                    <p className="font-bold text-2xl text-gray-900">{attendance.vitals.temperature}°C</p>
                  </div>
                )}
                {attendance.vitals.pulse && (
                  <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 font-medium">Pulse</p>
                    <p className="font-bold text-2xl text-gray-900">{attendance.vitals.pulse}</p>
                  </div>
                )}
                {attendance.vitals.spo2 && (
                  <div className="text-center bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
                    <p className="text-sm text-gray-600 font-medium">SpO2</p>
                    <p className="font-bold text-2xl text-gray-900">{attendance.vitals.spo2}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Clinician & Quick Stats */}
        <div className="space-y-6">
          {/* Clinician Information */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Clinician</h3>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="font-semibold text-gray-900 text-lg">
                {getClinicianName(attendance)}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-200">
                <span className="text-gray-600 font-medium">Medications</span>
                <span className="font-bold text-lg text-gray-900">{attendance.medications?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-200">
                <span className="text-gray-600 font-medium">Lab Tests</span>
                <span className="font-bold text-lg text-gray-900">{attendance.labTests?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-200">
                <span className="text-gray-600 font-medium">Procedures</span>
                <span className="font-bold text-lg text-gray-900">{attendance.procedures?.length || 0}</span>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-200">
                  <span className="font-bold text-gray-900">Total Bill</span>
                  <span className="font-bold text-xl text-gray-900">
                    ${attendance.totalBill?.toFixed(2) || '0.00'}
                  </span>
                </div>
                {(attendance.outstandingBalance || 0) > 0 && (
                  <div className="flex justify-between items-center bg-red-50 rounded-xl p-4 border border-red-200 mt-3">
                    <span className="font-semibold text-red-700">Outstanding</span>
                    <span className="font-bold text-lg text-red-700">
                      ${(attendance.outstandingBalance || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};