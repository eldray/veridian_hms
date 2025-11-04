// src/pages/PatientRegistration.tsx - UPDATED
import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Edit
} from 'lucide-react';
import type { PaymentMode, InsuranceDetails, AdditionalInfo, Patient } from '../types';
import PaymentModeTab from '../components/PaymentModeTab';
import AdditionalInfoTab from '../components/AdditionalInfoTab';

// API function to fetch insurance providers
const getInsuranceProviders = () => {
  return Promise.resolve([]);
};

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addPatient, updatePatient, fetchPatient, currentPatient } = usePatientStore();
  const { user } = useAuthStore();
  const [image, setImage] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'payment' | 'additional'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

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



  useEffect(() => {
   insuranceStore.getInsuranceProviders();
    
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
      const generateFolderNumber = () => {
        const timestamp = new Date().getTime().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `F${timestamp}${random}`;
      };
      
      setFormData(prev => ({ ...prev, folderNumber: generateFolderNumber() }));
    }
  }, [isEditMode, patientId, fetchPatient, insuranceStore.getInsuranceProviders]);

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
    }
  }, [currentPatient, isEditMode]);

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
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

      const age = calculateAge(formData.dateOfBirth);
      
      // Create patient data object - send as plain JSON
      const patientData = {
        folderNumber: formData.folderNumber,
        fullName: formData.fullName,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        age: age,
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
      
      // Navigate back to patient details after successful save
      navigate(`/dashboard/patients/${result.id || result._id}`);
      
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(isEditMode ? `/dashboard/patients/${patientId}` : '/dashboard/patients')}
              className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
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
        </div>

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
                    <div className="w-24 h-24 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                      {image ? (
                        <img
                          src={URL.createObjectURL(image)}
                          alt="Patient preview"
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : currentPatient?.imageUrl ? (
                        <img
                          src={currentPatient.imageUrl}
                          alt="Patient"
                          className="w-full h-full object-cover rounded-xl"
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
                          Age: {calculateAge(formData.dateOfBirth)} years
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
    		insuranceProviders={insuranceStore.insuranceProviders}
    		isLoadingProviders={insuranceStore.isLoading}
   		isOptional={false}
   		patientId={currentPatient?.id || patientId} // ADD THIS: Pass patient ID for attendance links
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
              onClick={() => navigate(isEditMode ? `/dashboard/patients/${patientId}` : '/dashboard/patients')}
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
