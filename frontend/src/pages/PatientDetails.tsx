// src/pages/PatientDetails.tsx - ENHANCED WITH COMPACT ADDITIONAL INFO & ATTENDANCE MODAL
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useInsuranceStore } from '../store/insuranceStore'; 
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Heart, 
  Briefcase, 
  FileText,
  Plus,
  Edit,
  Stethoscope,
  Folder,
  Mail,
  DollarSign,
  Shield,
  Info,
  ClipboardList,
  History,
  FileArchive,
  Droplets,
  Home,
  Users,
  Download,
  MoreVertical,
  Badge,
  Activity,
  Clock,
  Pill,
  FlaskConical,
  Scissors,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import NewAttendanceModal from '../components/NewAttendanceModal';

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    patients, 
    getPatientById, 
    loadPatients,
    currentPatient 
  } = usePatientStore();
  const { 
    attendances, 
    getAttendances 
  } = useAttendanceStore();
  const { hasRole } = useAuthStore();
  const { 
    providers: insuranceProviders, 
    getInsuranceProviders 
  } = useInsuranceStore();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'attendances' | 'medical-records'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVisits: 0,
    completedVisits: 0,
    pendingVisits: 0,
    totalMedications: 0,
    totalLabTests: 0
  });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const patient = patients.find(p => p.id === id || p._id === id) || currentPatient;
  const patientAttendances = attendances.filter(a => 
    a.patientId === id || a.patientId === patient?._id || a.patientId === patient?.id
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (id) await getPatientById(id);
        await getAttendances();
        await loadPatients();
        await getInsuranceProviders();
        calculateStats();
      } catch (error) {
        console.error('Error loading patient data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, getPatientById, getAttendances, loadPatients, getInsuranceProviders]);

  useEffect(() => {
    calculateStats();
  }, [attendances, patient]);

  const calculateStats = () => {
    const totalVisits = patientAttendances.length;
    const completedVisits = patientAttendances.filter(a => a.status === 'completed').length;
    const pendingVisits = patientAttendances.filter(a => ['pending', 'active'].includes(a.status)).length;
    const totalMedications = patientAttendances.reduce((sum, att) => sum + (att.medications?.length || 0), 0);
    const totalLabTests = patientAttendances.reduce((sum, att) => sum + (att.labTests?.length || 0), 0);

    setStats({ totalVisits, completedVisits, pendingVisits, totalMedications, totalLabTests });
  };

  const handleAttendanceSuccess = (attendance: any) => {
    console.log('✅ Attendance created successfully:', attendance);
    setShowAttendanceModal(false);
    // Refresh attendances to show the new one
    getAttendances();
  };

  const handleAttendanceClose = () => {
    setShowAttendanceModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <User className="w-20 h-20 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Not Found</h2>
          <Link 
            to="/dashboard/patients" 
            className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Patients
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = hasRole(['admin', 'doctor', 'nurse']);
  const canCreateAttendance = hasRole(['admin', 'doctor', 'nurse']);

  const handleEdit = () => {
    navigate(`/dashboard/patients/register?edit=true&id=${patient.id || patient._id}`);
  };

  const handleNewAttendance = () => {
    setShowAttendanceModal(true);
  };

  return (
    <div className="space-y-6 p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen">
      {/* Header - Maintained original size */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard/patients')}
              className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl border-4 border-white/20">
                {patient.imageUrl ? (
                  <img src={patient.imageUrl} alt={patient.fullName} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{patient.fullName}</h1>
                <div className="flex items-center gap-4 text-blue-100 mt-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5" />
                    <span className="font-mono font-semibold">{patient.folderNumber}</span>
                  </div>
                  <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="capitalize">{patient.gender}</span>
                  </div>
                  <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Age:</span>
                    <span>{patient.age} years</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canCreateAttendance && (
              <button
                onClick={handleNewAttendance}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold border border-green-500/20"
              >
                <Plus className="w-5 h-5" />
                <span>New Attendance</span>
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 font-semibold border border-white/20"
              >
                <Edit className="w-5 h-5" />
                <span>Edit Patient</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Visits', value: stats.totalVisits, icon: Activity, color: 'blue' },
          { label: 'Completed', value: stats.completedVisits, icon: CheckCircle, color: 'green' },
          { label: 'Pending', value: stats.pendingVisits, icon: Clock, color: 'yellow' },
          { label: 'Medications', value: stats.totalMedications, icon: Pill, color: 'purple' },
          { label: 'Lab Tests', value: stats.totalLabTests, icon: FlaskConical, color: 'red' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            yellow: 'bg-yellow-100 text-yellow-600',
            purple: 'bg-purple-100 text-purple-600',
            red: 'bg-red-100 text-red-600'
          }[stat.color];

          return (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClasses}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4">
            {[
              { id: 'profile' as const, label: 'Profile', icon: User, count: null },
              { id: 'attendances' as const, label: 'Visits', icon: History, count: patientAttendances.length },
              { id: 'medical-records' as const, label: 'Medical', icon: ClipboardList, count: null },
              { id: 'documents' as const, label: 'Documents', icon: FileArchive, count: null },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'profile' && <CompactProfileTab patient={patient} insuranceProviders={insuranceProviders} patientId={patient.id || patient._id} />}
          {activeTab === 'attendances' && <CompactAttendancesTab attendances={patientAttendances} patient={patient} />}
          {activeTab === 'medical-records' && <CompactMedicalRecordsTab attendances={patientAttendances} patient={patient} />}
          {activeTab === 'documents' && <CompactDocumentsTab patient={patient} />}
        </div>
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <NewAttendanceModal
          patientId={patient.id || patient._id}
          onSuccess={handleAttendanceSuccess}
          onClose={handleAttendanceClose}
        />
      )}
    </div>
  );
}

// Compact Profile Tab Component
function CompactProfileTab({ patient, insuranceProviders, patientId }: { 
  patient: any; 
  insuranceProviders: any[];
  patientId: string;
}) {
  const [activeSection, setActiveSection] = useState<'basic' | 'payment' | 'additional'>('basic');

  const sections = [
    { id: 'basic' as const, label: 'Basic Info', icon: User },
    { id: 'payment' as const, label: 'Payment', icon: CreditCard },
    { id: 'additional' as const, label: 'Additional', icon: Info }
  ];

  return (
    <div className="space-y-4">
      {/* Compact Section Navigation */}
      <div className="flex gap-2 p-2 bg-gray-50 rounded-lg">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                activeSection === section.id
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="min-h-[400px]">
        {activeSection === 'basic' && <CompactBasicInfo patient={patient} />}
        {activeSection === 'payment' && <CompactPaymentInfo patient={patient} insuranceProviders={insuranceProviders} patientId={patientId} />}
        {activeSection === 'additional' && <CompactAdditionalInfo patient={patient} />}
      </div>
    </div>
  );
}

// Compact Basic Info Component
function CompactBasicInfo({ patient }: { patient: any }) {
  return (
    <div className="space-y-4">
      {/* Folder Number */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Folder className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Folder Number</p>
            <p className="text-lg font-bold text-blue-900">{patient.folderNumber}</p>
          </div>
        </div>
      </div>

      {/* Basic Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Full Name</p>
          </div>
          <p className="text-sm font-medium text-gray-900">{patient.fullName}</p>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Gender</p>
          </div>
          <p className="text-sm font-medium text-gray-900 capitalize">{patient.gender}</p>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Date of Birth</p>
          </div>
          <p className="text-sm font-medium text-gray-900">
            {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not provided'}
          </p>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Contact</p>
          </div>
          <p className="text-sm font-medium text-gray-900">{patient.contact || 'Not provided'}</p>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200 md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase">Address</p>
          </div>
          <p className="text-sm font-medium text-gray-900">{patient.address || 'Not provided'}</p>
        </div>
      </div>
    </div>
  );
}

// Compact Payment Info Component
function CompactPaymentInfo({ patient, insuranceProviders, patientId }: { 
  patient: any; 
  insuranceProviders: any[];
  patientId: string;
}) {
  const getPaymentModeColor = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash': return 'border-gray-300 bg-gray-50';
      case 'nhis': return 'border-green-300 bg-green-50';
      case 'private_insurance': return 'border-purple-300 bg-purple-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Payment Mode */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Current Payment Mode</p>
            <p className="text-lg font-bold text-green-900 capitalize">{patient.paymentMode || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Compact Payment Mode Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Cash Card */}
        <div className={`border rounded-lg p-3 transition-all duration-200 ${getPaymentModeColor('cash')} ${
          patient.paymentMode === 'cash' ? 'ring-2 ring-gray-400' : ''
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${patient.paymentMode === 'cash' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Cash</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3">Patient pays directly for services</p>
          {patient.paymentMode === 'cash' && patientId && (
            <Link
              to={`/dashboard/attendance/new?patientId=${patientId}&paymentMode=cash`}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create Attendance
            </Link>
          )}
        </div>

        {/* NHIS Card */}
        <div className={`border rounded-lg p-3 transition-all duration-200 ${getPaymentModeColor('nhis')} ${
          patient.paymentMode === 'nhis' ? 'ring-2 ring-green-400' : ''
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${patient.paymentMode === 'nhis' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">NHIS</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3">National Health Insurance Scheme</p>
          {patient.paymentMode === 'nhis' && patientId && (
            <Link
              to={`/dashboard/attendance/new?patientId=${patientId}&paymentMode=nhis`}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create Attendance
            </Link>
          )}
        </div>

        {/* Private Insurance Card */}
        <div className={`border rounded-lg p-3 transition-all duration-200 ${getPaymentModeColor('private_insurance')} ${
          patient.paymentMode === 'private_insurance' ? 'ring-2 ring-purple-400' : ''
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${patient.paymentMode === 'private_insurance' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Private Insurance</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3">Private insurance coverage</p>
          {patient.paymentMode === 'private_insurance' && patientId && (
            <Link
              to={`/dashboard/attendance/new?patientId=${patientId}&paymentMode=private_insurance`}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create Attendance
            </Link>
          )}
        </div>
      </div>

      {/* Insurance Details */}
      {(patient.paymentMode === 'nhis' || patient.paymentMode === 'private_insurance') && patient.insuranceDetails && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Insurance Details</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Insurance Number:</span>
              <span className="font-medium">{patient.insuranceDetails.insuranceNumber}</span>
            </div>
            {patient.paymentMode === 'private_insurance' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Provider:</span>
                <span className="font-medium">
                  {insuranceProviders.find(p => p.id === patient.insuranceDetails?.insuranceProvider)?.name || 'Not provided'}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Start Date:</span>
              <span className="font-medium">
                {patient.insuranceDetails.startDate ? new Date(patient.insuranceDetails.startDate).toLocaleDateString() : 'Not provided'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">End Date:</span>
              <span className="font-medium">
                {patient.insuranceDetails.endDate ? new Date(patient.insuranceDetails.endDate).toLocaleDateString() : 'Not provided'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact Additional Info Component - ENHANCED WITH 2 CARDS PER ROW
function CompactAdditionalInfo({ patient }: { patient: any }) {
  const additionalInfo = patient.additionalInfo || {};

  return (
    <div className="space-y-4">
      {/* Contact & Identification - 2 cards per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Contact Information */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold text-gray-900 text-sm">Contact Information</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-600 text-xs font-medium">Email</p>
              <p className="font-medium text-gray-900">{additionalInfo.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-medium">House Number</p>
              <p className="font-medium text-gray-900">{additionalInfo.houseNumber || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Identification */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-purple-600" />
            <h4 className="font-semibold text-gray-900 text-sm">Identification</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-600 text-xs font-medium">ID Type</p>
              <p className="font-medium text-gray-900">{additionalInfo.idType || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-medium">ID Number</p>
              <p className="font-medium text-gray-900">{additionalInfo.idNumber || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Medical & Emergency Contact - 2 cards per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Medical Information */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-red-600" />
            <h4 className="font-semibold text-gray-900 text-sm">Medical Information</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-600 text-xs font-medium">Blood Type</p>
              <p className="font-medium text-gray-900">{additionalInfo.bloodType || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-medium">Occupation</p>
              <p className="font-medium text-gray-900">{additionalInfo.occupation || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-green-600" />
            <h4 className="font-semibold text-gray-900 text-sm">Emergency Contact</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-600 text-xs font-medium">Next of Kin</p>
              <p className="font-medium text-gray-900">{additionalInfo.nextOfKin || 'Not provided'}</p>
            </div>
            {additionalInfo.emergencyContact && (
              <>
                <div>
                  <p className="text-gray-600 text-xs font-medium">Contact Name</p>
                  <p className="font-medium text-gray-900">{additionalInfo.emergencyContact.name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs font-medium">Relationship</p>
                  <p className="font-medium text-gray-900">{additionalInfo.emergencyContact.relationship || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs font-medium">Phone</p>
                  <p className="font-medium text-gray-900">{additionalInfo.emergencyContact.phone || 'Not provided'}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact Attendances Tab Component
function CompactAttendancesTab({ attendances, patient }: { attendances: any[], patient: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'admitted': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (attendances.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Previous Attendances</h3>
        <Link
          to={`/dashboard/attendance/new?patientId=${patient.id || patient._id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 font-semibold text-sm"
        >
          <Plus className="w-4 h-4" />
          Create First Attendance
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Attendance History</h3>
        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {attendances.length} visit{attendances.length !== 1 ? 's' : ''}
        </span>
      </div>

      {attendances.map((attendance) => (
        <div key={attendance._id || attendance.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 text-blue-600 p-1.5 rounded">
                <Stethoscope className="w-3 h-3" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">{attendance.attendanceNumber}</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusColor(attendance.status)}`}>
                    {attendance.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(attendance.dateTime).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <Link
              to={`/dashboard/attendance/${attendance._id || attendance.id}`}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
            >
              View
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div>
              <p className="text-gray-600">Type</p>
              <p className="font-medium text-gray-900 capitalize">{attendance.attendanceType?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-600">Clinician</p>
              <p className="font-medium text-gray-900">{attendance.clinicianName || attendance.attendingClinician}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Pill className="w-3 h-3" />
              {attendance.medications?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              {attendance.labTests?.length || 0}
            </span>
            {attendance.totalBill > 0 && (
              <span className="flex items-center gap-1 ml-auto text-green-600 font-medium">
                <DollarSign className="w-3 h-3" />
                ${attendance.totalBill?.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Compact Medical Records Tab Component
function CompactMedicalRecordsTab({ attendances, patient }: { attendances: any[], patient: any }) {
  const allMedications = attendances.flatMap(att => att.medications || []);
  const allLabTests = attendances.flatMap(att => att.labTests || []);
  const allDiagnoses = attendances.flatMap(att => 
    att.diagnoses?.map((d: any) => ({
      ...d,
      attendanceDate: att.dateTime,
      attendanceType: att.attendanceType
    })) || []
  );

  if (attendances.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Records</h3>
        <p className="text-gray-600 text-sm">Medical records will appear after patient visits</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-900">{attendances.length}</p>
          <p className="text-xs text-blue-700 font-medium">Visits</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-900">{allMedications.length}</p>
          <p className="text-xs text-green-700 font-medium">Meds</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-900">{allLabTests.length}</p>
          <p className="text-xs text-purple-700 font-medium">Tests</p>
        </div>
      </div>

      {/* Recent Diagnoses */}
      {allDiagnoses.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Recent Diagnoses</h4>
          <div className="space-y-2">
            {allDiagnoses.slice(0, 3).map((diagnosis, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div>
                  <p className="font-medium text-gray-900">{diagnosis.name}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(diagnosis.attendanceDate).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={`/dashboard/attendance/${diagnosis.attendanceId}`}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Medications */}
      {allMedications.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Recent Medications</h4>
          <div className="space-y-2">
            {allMedications.slice(0, 3).map((med, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div>
                  <p className="font-medium text-gray-900">{med.name}</p>
                  <p className="text-xs text-gray-600">{med.dosage} • {med.frequency}</p>
                </div>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  med.status === 'dispensed' ? 'bg-green-100 text-green-800' : 
                  med.status === 'administered' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {med.status?.charAt(0).toUpperCase() + med.status?.slice(1) || 'Prescribed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact Documents Tab Component
function CompactDocumentsTab({ patient }: { patient: any }) {
  return (
    <div className="text-center py-8">
      <FileArchive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents</h3>
      <p className="text-gray-600 text-sm mb-4">No documents uploaded yet</p>
      <div className="flex items-center justify-center gap-2">
        <button className="inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 font-semibold text-sm">
          <Plus className="w-3 h-3" />
          Upload
        </button>
        <button className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold text-sm">
          <Download className="w-3 h-3" />
          Template
        </button>
      </div>
    </div>
  );
}
