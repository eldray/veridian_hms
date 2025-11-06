// src/pages/PatientRegistration.tsx - COMPLETE UPDATED VERSION
import { useState, FormEvent, useEffect, useCallback } from 'react';
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
  Eye,
  Camera
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

// Add this function to convert ISO date to YYYY-MM-DD format
const convertISODateToInputFormat = (isoDate: string): string => {
  if (!isoDate) return '';
  
  try {
    const date = new Date(isoDate);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', isoDate);
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error converting date:', error);
    return '';
  }
};

// Image upload utility functions
const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Image loading failed'));
    };
    
    reader.onerror = () => reject(new Error('File reading failed'));
  });
};

const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { addPatient, updatePatient, fetchPatient, currentPatient, uploadPatientImage } = usePatientStore();
  const { user } = useAuthStore();
  
  const { 
    getInsuranceProviders, 
    providers, 
    isLoading: isLoadingProviders 
  } = useInsuranceStore();

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/dashboard/patients');
    }
  };

  const loadData = useCallback(async () => {
    try {
      console.log('🔄 Loading insurance providers...');
      await getInsuranceProviders();
      console.log('✅ Insurance providers loaded, count:', providers.length);
    } catch (error) {
      console.error('❌ Failed to load insurance providers:', error);
    }
  }, [getInsuranceProviders, providers.length]);

  useEffect(() => {
    loadData();
    
    if (isEditMode && patientId) {
      const loadPatientData = async () => {
        try {
          await fetchPatient(patientId);
        } catch (error) {
          console.error('Failed to load patient data:', error);
        }
      };
      loadPatientData();
    } else {
      setFormData(prev => ({ ...prev, folderNumber: generateFolderNumber() }));
    }
  }, [isEditMode, patientId, fetchPatient, loadData]);

  // Set image preview when image changes or when editing existing patient
  useEffect(() => {
    if (image) {
      const objectUrl = URL.createObjectURL(image);
      setImagePreview(objectUrl);
      
      return () => URL.revokeObjectURL(objectUrl);
    } else if (isEditMode && currentPatient?.imageUrl) {
      setImagePreview(currentPatient.imageUrl);
    } else {
      setImagePreview('');
    }
  }, [image, currentPatient, isEditMode]);

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
      console.log('🔄 Loading patient data for editing:', currentPatient);
      
      const formattedDateOfBirth = convertISODateToInputFormat(currentPatient.dateOfBirth);
      console.log('📅 Date conversion:', { 
        original: currentPatient.dateOfBirth, 
        formatted: formattedDateOfBirth 
      });
      
      setFormData({
        folderNumber: currentPatient.folderNumber || '',
        fullName: currentPatient.fullName || '',
        gender: currentPatient.gender || 'male',
        dateOfBirth: formattedDateOfBirth,
        contact: currentPatient.contact || '',
        address: currentPatient.address || '',
      });
      
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
    }
  }, [currentPatient, isEditMode]);

  const calculateAge = (dob: string) => {
    if (!dob) return { years: 0, months: 0, display: '0 years' };
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (months === 0 && today.getDate() < birthDate.getDate()) {
      years--;
      months = 11;
    } else if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    
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

  const handleImageUpload = async (file: File, patientId: string): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      
      // Compress image before upload
      const compressedBlob = await compressImage(file);
      const base64Image = await convertBlobToBase64(compressedBlob);
      
      // Upload to backend
      const imageUrl = await uploadPatientImage(patientId, base64Image);
      return imageUrl;
    } catch (error) {
      console.error('❌ Failed to upload image:', error);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.fullName || !formData.gender || !formData.dateOfBirth || !formData.contact || !formData.address) {
        alert('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      const ageData = calculateAge(formData.dateOfBirth);
      
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
        
        // Handle image upload for existing patient
        if (image && result.id) {
          const imageUrl = await handleImageUpload(image, result.id);
          if (imageUrl) {
            console.log('✅ Image uploaded successfully:', imageUrl);
          }
        }
      } else {
        result = await addPatient(patientData);
        
        // Handle image upload for new patient
        if (image && result.id) {
          const imageUrl = await handleImageUpload(image, result.id);
          if (imageUrl) {
            console.log('✅ Image uploaded successfully:', imageUrl);
            // Update patient with image URL if needed
            await updatePatient(result.id, { ...patientData, imageUrl });
          }
        }
      }
      
      console.log('✅ Patient saved successfully:', result);
      
      if (isEditMode) {
        alert('✅ Patient updated successfully!');
      } else {
        alert('✅ Patient registered successfully!');
        const continueRegistering = confirm('Patient registered successfully! Would you like to register another patient?');
        if (continueRegistering) {
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
          setImage(null);
          setImagePreview('');
          setActiveTab('basic');
        } else {
          navigate(`/dashboard/patients/${result.id || result._id}`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Failed to save patient:', error);
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
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB');
        return;
      }
      
      setImage(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview('');
    // If you want to remove the image from the patient in edit mode, you'll need to call an API
  };

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info', icon: User },
    { id: 'additional' as const, label: 'Additional Info', icon: Info },
    { id: 'payment' as const, label: 'Payment Mode', icon: CreditCard }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="space-y-6">
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

                {/* Patient Photo - FIXED VERSION */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <Camera className="w-6 h-6 text-blue-600" />
                    Patient Photo
                  </h2>
                  <div className="flex items-start gap-6">
                    <div className="relative">
                      <div className="w-32 h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shadow-lg">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Patient preview"
                            className="w-full h-full object-cover rounded-xl"
                            onError={(e) => {
                              console.error('Image failed to load:', imagePreview);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <User className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Upload Photo {isUploadingImage && '(Uploading...)'}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                        disabled={isUploadingImage}
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        JPG, PNG or GIF (max. 5MB). Image will be automatically compressed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Basic Information with TITLE FIELD ADDED */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Title Field - NEW */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Title
                      </label>
                      <select
                        value={additionalInfo.title || ''}
                        onChange={(e) => setAdditionalInfo({
                          ...additionalInfo,
                          title: e.target.value as 'Mr' | 'Mrs' | 'Miss' | 'Dr' | 'Prof' | 'Rev' | 'Other'
                        })}
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                      >
                        <option value="">Select Title</option>
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Miss">Miss</option>
                        <option value="Dr">Dr</option>
                        <option value="Prof">Prof</option>
                        <option value="Rev">Rev</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

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
                          {isEditMode && currentPatient?.ageDisplay && 
                            calculateAge(formData.dateOfBirth).display !== currentPatient.ageDisplay && 
                            ` (was: ${currentPatient.ageDisplay})`
                          }
                        </p>
                      )}
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
                insuranceProviders={providers}
                isLoadingProviders={isLoadingProviders}
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
              disabled={isSubmitting || isUploadingImage}
              className={`flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl transition-all duration-200 hover:shadow-lg shadow-md font-semibold text-lg ${
                (isSubmitting || isUploadingImage) ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-700 hover:to-teal-700'
              }`}
            >
              <Save className="w-6 h-6" />
              <span>
                {isUploadingImage ? 'Uploading Image...' : 
                 isSubmitting ? 'Saving...' : 
                 (isEditMode ? 'Update Patient' : 'Register Patient')}
              </span>
            </button>
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting || isUploadingImage}
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