// src/pages/PatientRegistration.tsx - FIXED
import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useInsuranceStore } from '../store/insuranceStore'; 
import { useAuthStore } from '../store/authStore';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  User, 
  CreditCard, 
  Info, 
  Hospital, 
  Shield, 
  Activity,
  Mail,
  Phone,
  MapPin,
  Droplets,
  Briefcase,
  Users,
  Folder,
  Edit,
  Eye
} from 'lucide-react';
import type { PaymentMode, InsuranceDetails, AdditionalInfo, Patient } from '../types';
import PaymentModeTab from '../components/PaymentModeTab';
import AdditionalInfoTab from '../components/AdditionalInfoTab';

// Helper function to generate folder number
const generateFolderNumber = (): string => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `F${timestamp}${random}`;
};

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { addPatient, updatePatient, fetchPatient, currentPatient } = usePatientStore();
  const { user } = useAuthStore();
  const [image, setImage] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'payment' | 'additional'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedPatientId, setSavedPatientId] = useState<string | null>(null);

  // Get edit mode and patient ID from URL parameters
  const isEditMode = searchParams.get('edit') === 'true';
  const patientId = searchParams.get('id');
  
  const [formData, setFormData] = useState({
    folderNumber: '',
    fullName: '',
    gender: 'male' as 'male' | 'female' | 'other',
    dateOfBirth: '',
    contact: '',
    address: '',
  });
  
  const insuranceStore = useInsuranceStore();

  const [paymentData, setPaymentData] = useState<{
    paymentMode: PaymentMode;
    insuranceDetails?: InsuranceDetails;
  }>({
    paymentMode: 'cash'
  });

  const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfo>({
    title: undefined,
    email: '',
    houseNumber: '',
    idType: undefined,
    idNumber: '',
    bloodType: undefined,
    occupation: '',
    nextOfKin: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });

  const [ageDisplay, setAgeDisplay] = useState('');

  // Smart back navigation - goes back to previous page or patients list
  const handleBack = () => {
    // Check if we have a previous page in history
    if (location.key !== 'default') {
      navigate(-1); // Go back to previous page
    } else {
      navigate('/dashboard/patients'); // Default fallback
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Loading insurance providers...');
        await insuranceStore.getInsuranceProviders();
        console.log('✅ Insurance providers loaded:', insuranceStore.providers);
      } catch (error) {
        console.error('❌ Failed to load insurance providers:', error);
      }
    };

    loadData();
    
    if (isEditMode && patientId) {
      // Load patient data for editing
      const loadPatientData = async () => {
        try {
          await fetchPatient(patientId);
        } catch (error) {
          console.error('Failed to load patient data:', error);
        }
      };
      loadPatientData();
    } else {
      // Generate folder number for new patient
      setFormData(prev => ({ ...prev, folderNumber: generateFolderNumber() }));
    }
  }, [isEditMode, patientId, fetchPatient, insuranceStore]);

  // Update age whenever dateOfBirth changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      setAgeDisplay(calculateAge(formData.dateOfBirth).display);
    } else {
      setAgeDisplay('');
    }
  }, [formData.dateOfBirth]);
  
  // Populate form when currentPatient changes (for edit mode)
  useEffect(() => {
    if (isEditMode && currentPatient) {
      setFormData({
        folderNumber: currentPatient.folderNumber || '',
        fullName: currentPatient.fullName || '',
        gender: currentPatient.gender || 'male',
        dateOfBirth: currentPatient.dateOfBirth || '',
        contact: currentPatient.contact || '',
        address: currentPatient.address || '',
      });
      
      // Set age display from stored data or calculate
      if (currentPatient.ageDisplay) {
        setAgeDisplay(currentPatient.ageDisplay);
      } else if (currentPatient.dateOfBirth) {
        setAgeDisplay(calculateAge(currentPatient.dateOfBirth).display);
      }

      setPaymentData({
        paymentMode: currentPatient.paymentMode || 'cash',
        insuranceDetails: currentPatient.insuranceDetails
      });

      setAdditionalInfo(currentPatient.additionalInfo || {
        title: undefined,
        email: '',
        houseNumber: '',
        idType: undefined,
        idNumber: '',
        bloodType: undefined,
        occupation: '',
        nextOfKin: '',
        emergencyContact: {
          name: '',
          relationship: '',
          phone: ''
        }
      });

      // Calculate and display age when editing
      if (currentPatient.dateOfBirth) {
        const ageData = calculateAge(currentPatient.dateOfBirth);
        console.log('🔄 Editing patient - Age calculated:', ageData);
      }
    }
  }, [currentPatient, isEditMode]);

  const calculateAge = (dob: string) => {
    if (!dob) return { years: 0, months: 0, display: '0 years' };
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    // Adjust if the current month is before the birth month
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // Adjust if the current day is before the birth day in the same month
    if (months === 0 && today.getDate() < birthDate.getDate()) {
      years--;
      months = 11; // Since we're going back a year, it's 11 months
    } else if (today.getDate() < birthDate.getDate()) {
      months--;
      // Add days from previous month
      const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, birthDate.getDate());
      const daysInPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      if (today.getDate() < birthDate.getDate()) {
        months--;
      }
    }
    
    // Format display string
    let display = '';
    if (years === 0 && months === 0) {
      display = 'Newborn';
    } else if (years === 0) {
      display = `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      display = `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      display = `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
    }
    
    return { years, months, display };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.fullName || !formData.gender || !formData.dateOfBirth || !formData.contact || !formData.address) {
        alert('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      const ageData = calculateAge(formData.dateOfBirth);
      
      // Create patient data object
      const patientData = {
        folderNumber: formData.folderNumber,
        fullName: formData.fullName,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        age: ageData.years,
        ageInMonths: ageData.months,
        ageDisplay: ageData.display,
        contact: formData.contact,
        address: formData.address,
        paymentMode: paymentData.paymentMode,
        insuranceDetails: paymentData.insuranceDetails,
        additionalInfo: additionalInfo,
        registeredBy: user?.fullName || user?.username || 'System',
      };

      console.log('📝 Sending patient data as JSON:', patientData);

      let result;
      if (isEditMode && patientId) {
        result = await updatePatient(patientId, patientData);
      } else {
        result = await addPatient(patientData);
      }
      
      console.log('✅ Patient saved successfully:', result);
      
      // Show success message and let user decide next action
      if (isEditMode) {
        alert('✅ Patient updated successfully!');
        // Stay on the same page for further edits
      } else {
        alert('✅ Patient registered successfully!');
        // Option 1: Stay on page for another registration
        const continueRegistering = confirm('Patient registered successfully! Would you like to register another patient?');
        if (continueRegistering) {
          // Reset form for new registration
          const newFolderNumber = generateFolderNumber();
          setFormData({
            folderNumber: newFolderNumber,
            fullName: '',
            gender: 'male',
            dateOfBirth: '',
            contact: '',
            address: '',
          });
          setPaymentData({ paymentMode: 'cash' });
          setAdditionalInfo({
            title: undefined,
            email: '',
            houseNumber: '',
            idType: undefined,
            idNumber: '',
            bloodType: undefined,
            occupation: '',
            nextOfKin: '',
            emergencyContact: {
              name: '',
              relationship: '',
              phone: ''
            }
          });
          setActiveTab('basic');
        } else {
          // Option 2: Go to patient details
          navigate(`/dashboard/patients/${result.id || result._id}`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Failed to save patient:', error);
      // Show detailed backend validation errors
      if (error.response?.data) {
        console.log('🔍 Backend response:', error.response.data);
        if (error.response.data.errors) {
          const errorMessages = error.response.data.errors.map((err: any) => 
            `${err.param}: ${err.msg}`
          ).join('\n');
          alert(`Validation errors:\n${errorMessages}`);
        } else {
          alert(`Error: ${error.response.data.message || 'Unknown error'}`);
        }
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = () => {
    if (savedPatientId) {
      navigate(`/dashboard/patients/${savedPatientId}`);
    }
  };

  const handleContinueEditing = () => {
    setSaveSuccess(false);
    // Stay on the current page for further edits
  };

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info', icon: User },
    { id: 'payment' as const, label: 'Payment Mode', icon: CreditCard },
    { id: 'additional' as const, label: 'Additional Info', icon: Info }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
                title="Go back to previous page"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  {isEditMode ? <Edit className="w-8 h-8 text-yellow-400" /> : <User className="w-8 h-8 text-blue-400" />}
                  {isEditMode ? 'Update Patient' : 'Patient Registration'}
                </h1>
                <p className="text-blue-100 mt-2">
                  {isEditMode ? 'Update patient information' : 'Register a new patient'}
                  {isEditMode && currentPatient && (
                    <span className="ml-2 text-yellow-200">
                      - Editing: {currentPatient.fullName}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Success Actions */}
            {saveSuccess && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleContinueEditing}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200 font-semibold"
                >
                  <Edit className="w-4 h-4" />
                  Continue Editing
                </button>
                <button
                  onClick={handleViewDetails}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-semibold"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Save className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-900">
                  {isEditMode ? 'Patient Updated Successfully!' : 'Patient Registered Successfully!'}
                </h3>
                <p className="text-green-700 mt-1">
                  {isEditMode 
                    ? 'Patient information has been updated. You can continue editing or view the updated details.'
                    : 'New patient has been registered. You can continue editing or view the patient details.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8 space-y-8">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {activeTab === 'basic' && (
              <div className="space-y-8">
                {/* Folder Number Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <Folder className="w-6 h-6 text-blue-600" />
                    <div>
                      <label className="block text-sm font-semibold text-blue-800 mb-1">
                        Folder Number
                      </label>
                      <div className="text-2xl font-bold text-blue-900 font-mono">
                        {formData.folderNumber}
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        {isEditMode 
                          ? 'This number identifies the patient in the system' 
                          : 'This number will be used to identify the patient in the system'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patient Photo */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Patient Photo</h2>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {image ? (
                        <img
                          src={URL.createObjectURL(image)}
                          alt="Patient preview"
                          className="w-full h-full object-cover rounded-xl"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : currentPatient?.imageUrl ? (
                        <img
                          src={currentPatient.imageUrl}
                          alt="Patient"
                          className="w-full h-full object-cover rounded-xl"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <User className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Upload Photo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImage(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                      />
                      <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF (max. 5MB)</p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                        placeholder="Enter patient's full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                      />
                      {formData.dateOfBirth && (
                        <p className="text-sm text-gray-600 mt-2">
                          Age: {calculateAge(formData.dateOfBirth).display}
                          {/* Show stored age if available and different from calculated */}
                          {isEditMode && currentPatient?.ageDisplay && 
                            calculateAge(formData.dateOfBirth).display !== currentPatient.ageDisplay && 
                            ` (was: ${currentPatient.ageDisplay})`
                          }
                        </p>
                      )}
                      {/* Show stored age when no date is entered but we have age data */}
                      {!formData.dateOfBirth && isEditMode && currentPatient?.ageDisplay && (
                        <p className="text-sm text-yellow-600 mt-2">
                          Stored age: {currentPatient.ageDisplay}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Contact Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          required
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                          placeholder="Phone number"
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                          placeholder="Full residential address"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <PaymentModeTab
                paymentMode={paymentData.paymentMode}
                insuranceDetails={paymentData.insuranceDetails}
                onPaymentModeChange={(mode) => setPaymentData({ ...paymentData, paymentMode: mode })}
                onInsuranceDetailsChange={(details) => setPaymentData({ ...paymentData, insuranceDetails: details })}
                insuranceProviders={insuranceStore.providers}
                isLoadingProviders={insuranceStore.isLoading}
                isOptional={false}
                patientId={currentPatient?.id || patientId}
              />
            )}

            {activeTab === 'additional' && (
              <AdditionalInfoTab
                additionalInfo={additionalInfo}
                onAdditionalInfoChange={setAdditionalInfo}
              />
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl transition-all duration-200 hover:shadow-lg shadow-md font-semibold text-lg ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-700 hover:to-teal-700'
              }`}
            >
              <Save className="w-6 h-6" />
              <span>
                {isSubmitting 
                  ? 'Saving...' 
                  : (isEditMode ? 'Update Patient' : 'Register Patient')
                }
              </span>
            </button>
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
