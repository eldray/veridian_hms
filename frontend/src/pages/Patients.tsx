// src/pages/Patients.tsx - ENHANCED WITH EDIT BUTTON, PAGINATION & VIEW OPTIONS
import { useState } from 'react';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  FileText, 
  CreditCard, 
  Hospital, 
  Shield, 
  Activity, 
  Eye, 
  Stethoscope,
  Edit,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NewAttendanceModal from '../components/NewAttendanceModal';

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [itemsPerPage, setItemsPerPage] = useState(9);
  
  const { patients, searchPatients } = usePatientStore();
  const { hasRole } = useAuthStore();

  const displayedPatients = searchQuery
    ? searchPatients(searchQuery)
    : patients;

  // Pagination calculations
  const totalPages = Math.ceil(displayedPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = displayedPatients.slice(startIndex, startIndex + itemsPerPage);

  const canRegister = hasRole(['admin', 'nurse', 'doctor']);

  const handleAddAttendance = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowAttendanceModal(true);
  };

  const handleAttendanceSuccess = (attendance: any) => {
    console.log('Attendance created successfully:', attendance);
    setShowAttendanceModal(false);
    setSelectedPatientId(null);
  };

  const handleAttendanceClose = () => {
    setShowAttendanceModal(false);
    setSelectedPatientId(null);
  };

  const getPaymentModeColor = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'nhis':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'private_insurance':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPaymentModeLabel = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash':
        return 'CASH';
      case 'nhis':
        return 'NHIS';
      case 'private_insurance':
        return 'PRIVATE INS';
      default:
        return paymentMode?.toUpperCase() || 'UNKNOWN';
    }
  };

  const getPatientId = (patient: any) => patient.id || patient._id;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-6 p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Hospital className="w-6 h-6 text-blue-400" />
              Patient Management
            </h1>
            <p className="text-blue-100 mt-1 text-sm">Manage patient records and medical history</p>
          </div>
          {canRegister && (
            <Link
              to="/dashboard/patients/register"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register Patient</span>
            </Link>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 w-full sm:max-w-md">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search patients..."
                className="w-full pl-10 pr-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
              />
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'cards'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Items Per Page */}
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            >
              <option value={6}>6 per page</option>
              <option value={9}>9 per page</option>
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Count */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-800">
              Showing {paginatedPatients.length} of {displayedPatients.length} patients
            </p>
            {searchQuery && (
              <p className="text-xs text-blue-600 mt-1">
                Search results for: "{searchQuery}"
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-blue-700">
            <span className="bg-blue-100 px-2 py-1 rounded-full">
              Cash: {displayedPatients.filter(p => p.paymentMode === 'cash').length}
            </span>
            <span className="bg-green-100 px-2 py-1 rounded-full">
              NHIS: {displayedPatients.filter(p => p.paymentMode === 'nhis').length}
            </span>
            <span className="bg-purple-100 px-2 py-1 rounded-full">
              Private: {displayedPatients.filter(p => p.paymentMode === 'private_insurance').length}
            </span>
          </div>
        </div>
      </div>

      {/* Patient List */}
      {displayedPatients.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">
            {searchQuery ? 'No patients found' : 'No patients registered yet'}
          </p>
          {canRegister && !searchQuery && (
            <Link
              to="/dashboard/patients/register"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold mt-3 text-sm"
            >
              <Plus className="w-4 h-4" />
              Register Your First Patient
            </Link>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        // Cards View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPatients.map((patient) => {
            const patientId = getPatientId(patient);
            return (
              <div
                key={patientId}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{patient.fullName}</h3>
                      <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded border mt-1">
                        {patient.folderNumber || patientId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Edit Button - Made prominent */}
                    <Link
                      to={`/dashboard/patients/register?edit=true&id=${patientId}`}
                      className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Edit Patient"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">
                      {patient.age || 'N/A'} years • {patient.gender}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{patient.contact}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentModeColor(patient.paymentMode)}`}
                    >
                      {getPaymentModeLabel(patient.paymentMode)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <Link
                    to={`/dashboard/patients/${patientId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold text-xs shadow-sm hover:shadow-md"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </Link>
                  <button
                    onClick={() => handleAddAttendance(patientId)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-semibold text-xs shadow-sm hover:shadow-md"
                  >
                    <Stethoscope className="w-3 h-3" />
                    Visit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Age/Gender</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Mode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedPatients.map((patient) => {
                const patientId = getPatientId(patient);
                return (
                  <tr key={patientId} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center shadow-sm">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{patient.fullName}</p>
                          <p className="text-xs text-gray-500">{patient.folderNumber || patientId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-green-600" />
                        {patient.contact}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        {patient.age || 'N/A'} years • {patient.gender}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getPaymentModeColor(patient.paymentMode)}`}
                      >
                        {getPaymentModeLabel(patient.paymentMode)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/dashboard/patients/${patientId}`}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/dashboard/patients/register?edit=true&id=${patientId}`}
                          className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200"
                          title="Edit Patient"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleAddAttendance(patientId)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                          title="Add Visit"
                        >
                          <Stethoscope className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {displayedPatients.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, displayedPatients.length)} of{' '}
              {displayedPatients.length} patients
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {displayedPatients.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
            <p className="text-lg font-bold text-blue-600">{displayedPatients.length}</p>
            <p className="text-xs text-blue-700 font-medium">Total Patients</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
            <p className="text-lg font-bold text-green-600">
              {displayedPatients.filter(p => p.paymentMode === 'nhis').length}
            </p>
            <p className="text-xs text-green-700 font-medium">NHIS</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
            <p className="text-lg font-bold text-purple-600">
              {displayedPatients.filter(p => p.paymentMode === 'private_insurance').length}
            </p>
            <p className="text-xs text-purple-700 font-medium">Private</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
            <p className="text-lg font-bold text-gray-600">
              {displayedPatients.filter(p => p.paymentMode === 'cash').length}
            </p>
            <p className="text-xs text-gray-700 font-medium">Cash</p>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedPatientId && (
        <NewAttendanceModal
          patientId={selectedPatientId}
          onSuccess={handleAttendanceSuccess}
          onClose={handleAttendanceClose}
        />
      )}
    </div>
  );
}
