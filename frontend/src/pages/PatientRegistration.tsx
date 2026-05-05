// src/pages/PatientRegistration.tsx - UPDATED WITH YOUR THEME
import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  ArrowLeft,
  Save,
  User,
  CreditCard,
  Info,
  Edit,
  AlertCircle,
  Eye
} from 'lucide-react';
import type { PaymentMode, InsuranceDetails, AdditionalInfo, Patient } from '../types';
import PaymentModeTab from '../components/PaymentModeTab';
import AdditionalInfoTab from '../components/AdditionalInfoTab';
import { BasicInfoForm } from '../components/patients/BasicInfoForm';

// Convert ISO date to input format
const convertISODateToInputFormat = (isoDate: string): string => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

// Image compression
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
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
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
  const { success, error: toastError } = useToast();

  const { addPatient, updatePatient, fetchPatient, currentPatient, uploadPatientImage } = usePatientStore();
  const { user } = useAuthStore();
  const { getInsuranceProviders, providers, isLoading: isLoadingProviders } = useInsuranceStore();

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'payment' | 'additional'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedPatientId, setSavedPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isEditMode = searchParams.get('edit') === 'true';
  const patientId = searchParams.get('id');

  // Use surname + otherNames instead of fullName
  const [formData, setFormData] = useState({
    folderNumber: '',
    surname: '',
    otherNames: '',
    gender: 'male' as 'male' | 'female' | 'other',
    dateOfBirth: '',
    contact: '',
    address: '',
  });

  const [paymentData, setPaymentData] = useState<{
    paymentMode: PaymentMode;
    insuranceDetails?: InsuranceDetails;
  }>({ paymentMode: 'cash' });

  const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfo>({
    title: undefined,
    email: '',
    houseNumber: '',
    idType: undefined,
    idNumber: '',
    bloodType: undefined,
    occupation: '',
    nextOfKin: '',
    emergencyContact: { name: '', relationship: '', phone: '' }
  });

  const [ageDisplay, setAgeDisplay] = useState('');

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/dashboard/patients');
    }
  };

  // Load data
  useEffect(() => {
    console.log('🔍 PatientRegistration useEffect:', { 
      isEditMode, 
      patientId, 
      pathname: location.pathname,
      search: location.search
    });

    const loadData = async () => {
      try {
        // Always load insurance providers
        await getInsuranceProviders();

        // Only fetch patient if we're in edit mode AND have a valid patient ID
        if (isEditMode && patientId && patientId !== 'undefined' && patientId !== 'null') {
          console.log('🔄 Loading patient for editing:', patientId);
          setIsLoading(true);
          await fetchPatient(patientId);
        } else if (isEditMode) {
          console.warn('⚠️ Edit mode but no valid patient ID:', patientId);
          toastError('Invalid Patient', 'No valid patient ID provided for editing');
          navigate('/dashboard/patients');
        }
      } catch (error: any) {
        console.error('❌ Failed to load data:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Failed to load data';
        toastError('Load Failed', errorMsg);
        
        // If patient not found in edit mode, redirect to patients list
        if (isEditMode && error.response?.status === 404) {
          navigate('/dashboard/patients');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isEditMode, patientId]);

  // Load patient data for editing
  useEffect(() => {
    if (isEditMode && currentPatient) {
      console.log('🔄 Loading patient data for edit:', currentPatient);
      
      // Convert date for form input
      const dob = currentPatient.dateOfBirth && currentPatient.dateOfBirth.includes('T') 
        ? convertISODateToInputFormat(currentPatient.dateOfBirth)
        : currentPatient.dateOfBirth;

      // Split full name into surname and otherNames
      const nameParts = currentPatient.fullName?.split(' ') || [];
      const surname = nameParts[0] || '';
      const otherNames = nameParts.slice(1).join(' ') || '';

      setFormData({
        folderNumber: currentPatient.folderNumber || '',
        surname: surname,
        otherNames: otherNames,
        gender: currentPatient.gender || 'male',
        dateOfBirth: dob || '',
        contact: currentPatient.contact || '',
        address: currentPatient.address || '',
      });

      setAgeDisplay(currentPatient.ageDisplay || calculateAge(currentPatient.dateOfBirth).display);

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
        emergencyContact: { name: '', relationship: '', phone: '' }
      });

      // Set saved patient ID for edit mode
      setSavedPatientId(currentPatient.id);
    }
  }, [currentPatient, isEditMode]);

  // Reset form when switching from edit to create mode
  useEffect(() => {
    if (!isEditMode) {
      console.log('🔄 Resetting form for create mode');
      setFormData({
        folderNumber: '',
        surname: '',
        otherNames: '',
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
        emergencyContact: { name: '', relationship: '', phone: '' }
      });
      setImage(null);
      setImagePreview('');
      setSaveSuccess(false);
      setSavedPatientId(null);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (isEditMode && currentPatient?.imageUrl) {
      setImagePreview(currentPatient.imageUrl);
    } else {
      setImagePreview('');
    }
  }, [image, currentPatient, isEditMode]);

  useEffect(() => {
    if (formData.dateOfBirth) {
      setAgeDisplay(calculateAge(formData.dateOfBirth).display);
    } else {
      setAgeDisplay('');
    }
  }, [formData.dateOfBirth]);

  const calculateAge = (dob: string) => {
    if (!dob) return { years: 0, months: 0, display: '0 years' };
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    if (today.getDate() < birthDate.getDate()) months--;

    let display = '';
    if (years === 0 && months === 0) display = 'Newborn';
    else if (years === 0) display = `${months} month${months !== 1 ? 's' : ''}`;
    else if (months === 0) display = `${years} year${years !== 1 ? 's' : ''}`;
    else display = `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;

    return { years, months, display };
  };

  const handleImageUpload = async (file: File, patientId: string): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      const compressed = await compressImage(file);
      const base64 = await convertBlobToBase64(compressed);
      return await uploadPatientImage(patientId, base64);
    } catch {
      toastError('Upload failed', 'Could not upload image');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleBasicInfoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.surname || !formData.otherNames || !formData.gender || !formData.dateOfBirth || !formData.contact || !formData.address) {
      toastError('Required', 'Please fill all required fields');
      return;
    }
  
    setIsSubmitting(true);
    try {
      const ageData = calculateAge(formData.dateOfBirth);
      
      // Ensure date is in correct format for backend
      let normalizedDateOfBirth = formData.dateOfBirth;
      if (formData.dateOfBirth.includes('T')) {
        normalizedDateOfBirth = formData.dateOfBirth.split('T')[0];
      }
      
      const patientData = {
        ...(isEditMode && { folderNumber: formData.folderNumber }),
        surname: formData.surname,
        otherNames: formData.otherNames,
        gender: formData.gender,
        dateOfBirth: normalizedDateOfBirth,
        age: ageData.years,
        ageInMonths: ageData.months,
        contact: formData.contact,
        address: formData.address,
        paymentMode: paymentData.paymentMode,
        insuranceDetails: paymentData.insuranceDetails,
        additionalInfo: additionalInfo,
        registeredBy: user?.fullName || user?.username || 'System',
      };
  
      console.log('📤 Submitting patient data:', patientData);
  
      let result;
      if (isEditMode && patientId) {
        result = await updatePatient(patientId, patientData);
        if (image && result.id) {
          const imageUrl = await handleImageUpload(image, result.id);
          if (imageUrl) {
            await updatePatient(result.id, { ...patientData, imageUrl });
          }
        }
        success('Updated', 'Patient information saved');
      } else {
        result = await addPatient(patientData);
        if (image && result.id) {
          const imageUrl = await handleImageUpload(image, result.id);
          if (imageUrl) {
            await updatePatient(result.id, { ...patientData, imageUrl });
          }
        }
        success('Registered', 'New patient added');
      }
  
      setSavedPatientId(result.id);
      setSaveSuccess(true);
  
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      toastError('Save failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSavePaymentMode = async () => {
    if (!savedPatientId && !isEditMode) {
      toastError('Error', 'Please save basic information first');
      return;
    }

    const patientIdToUse = savedPatientId || currentPatient?.id;

    if (!patientIdToUse) {
      toastError('Error', 'No patient ID available');
      return;
    }

    try {
      await updatePatient(patientIdToUse, {
        paymentMode: paymentData.paymentMode,
        insuranceDetails: paymentData.insuranceDetails
      });
      success('Saved', 'Payment mode updated');
    } catch (error: any) {
      toastError('Save failed', 'Could not update payment mode');
    }
  };

  const handleSaveAdditionalInfo = async () => {
    if (!savedPatientId && !isEditMode) {
      toastError('Error', 'Please save basic information first');
      return;
    }

    const patientIdToUse = savedPatientId || currentPatient?.id;

    if (!patientIdToUse) {
      toastError('Error', 'No patient ID available');
      return;
    }

    try {
      await updatePatient(patientIdToUse, {
        additionalInfo: additionalInfo
      });
      success('Saved', 'Additional information updated');
    } catch (error: any) {
      toastError('Save failed', 'Could not update additional information');
    }
  };

  const handleViewDetails = () => {
    const patientIdToUse = savedPatientId || currentPatient?.id;
    if (patientIdToUse) {
      navigate(`/dashboard/patients/${patientIdToUse}`);
    }
  };

  const handleContinueEditing = () => {
    setSaveSuccess(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError('Invalid', 'Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError('Too large', 'Image must be under 5MB');
      return;
    }
    setImage(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview('');
  };

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info', icon: User },
    { id: 'additional' as const, label: 'Additional Info', icon: Info },
    { id: 'payment' as const, label: 'Payment Mode', icon: CreditCard }
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
        <div className="text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6 max-w-sm w-full">
          <div className="w-12 h-12 border-3 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Loading Patient...</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Fetching patient data</p>
        </div>
      </div>
    );
  }
// src/pages/PatientForm.tsx  — return() block only
// Drop this in place of your existing return() — all logic above stays unchanged.

return (
  <div className="space-y-4 p-6">

    {/* ── Header ──────────────────────────────────────────────────────── */}
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors"
          style={{
            color: 'var(--text-secondary)',
            borderColor: 'var(--border-color)',
            background: 'transparent',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              'var(--bg-main)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              'transparent')
          }
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div>
          <h1
            className="text-base font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {isEditMode ? 'Update patient' : 'Patient registration'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {isEditMode && currentPatient
              ? `Editing: ${currentPatient.surname} ${currentPatient.otherNames}`
              : saveSuccess
              ? `Registered: ${formData.surname} ${formData.otherNames}`
              : 'New outpatient record'}
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex gap-2">
          <button
            onClick={handleContinueEditing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors"
            style={{
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)',
              background: 'transparent',
            }}
          >
            <Edit className="w-3.5 h-3.5" />
            Continue editing
          </button>
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border-0 text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--icon-green-text)' }}
          >
            <Eye className="w-3.5 h-3.5" />
            View patient
          </button>
        </div>
      )}
    </div>

    {/* ── Success banner ───────────────────────────────────────────────── */}
    {saveSuccess && (
      <div
        className="flex items-center gap-3 px-4 py-3.5 rounded-xl border"
        style={{
          background: 'var(--icon-green-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--icon-green-text)' + '33' }}
        >
          <Save className="w-4 h-4" style={{ color: 'var(--icon-green-text)' }} />
        </div>
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {isEditMode ? 'Patient updated!' : 'Patient registered!'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--icon-green-text)' }}>
            {isEditMode
              ? 'Patient information has been updated successfully.'
              : 'Record saved. Add payment mode or additional info using the tabs above.'}
          </p>
        </div>
      </div>
    )}

    {/* ── Form card ───────────────────────────────────────────────────── */}
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Tab bar */}
      <div
        className="flex gap-1.5 px-3 py-2.5 border-b"
        style={{
          background: 'var(--bg-main)',
          borderColor: 'var(--border-color)',
        }}
      >
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: isActive ? 'var(--bg-card)' : 'transparent',
                border: isActive
                  ? '0.5px solid var(--border-color)'
                  : '0.5px solid transparent',
                color: isActive
                  ? 'var(--icon-cyan-text)'
                  : 'var(--text-secondary)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: isActive
                    ? 'var(--icon-cyan-text)'
                    : 'var(--text-tertiary)',
                }}
              />
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: isActive
                    ? 'var(--icon-cyan-bg)'
                    : 'var(--bg-main)',
                  color: isActive
                    ? 'var(--icon-cyan-text)'
                    : 'var(--text-tertiary)',
                  fontSize: 10,
                }}
              >
                0{idx + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-5" style={{ minHeight: 320 }}>
        {activeTab === 'basic' && (
          <BasicInfoForm
            formData={formData}
            additionalInfo={additionalInfo}
            ageDisplay={ageDisplay}
            imagePreview={imagePreview}
            isUploadingImage={isUploadingImage}
            isEditMode={isEditMode}
            currentPatient={currentPatient}
            onFormDataChange={setFormData}
            onAdditionalInfoChange={setAdditionalInfo}
            onImageChange={handleImageChange}
            removeImage={removeImage}
            calculateAge={calculateAge}
          />
        )}

        {activeTab === 'payment' && (
          <PaymentModeTab
            paymentMode={paymentData.paymentMode}
            insuranceDetails={paymentData.insuranceDetails}
            onPaymentModeChange={(mode) =>
              setPaymentData({ ...paymentData, paymentMode: mode })
            }
            onInsuranceDetailsChange={(details) =>
              setPaymentData({ ...paymentData, insuranceDetails: details })
            }
            insuranceProviders={providers}
            isLoadingProviders={isLoadingProviders}
            isOptional={true}
            patientId={
              savedPatientId || currentPatient?.id || patientId
            }
          />
        )}

        {activeTab === 'additional' && (
          <AdditionalInfoTab
            additionalInfo={additionalInfo}
            onAdditionalInfoChange={setAdditionalInfo}
          />
        )}
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 border-t"
        style={{
          background: 'var(--bg-main)',
          borderColor: 'var(--border-color)',
        }}
      >
        {/* Basic tab actions */}
        {activeTab === 'basic' && (
          <>
            <button
              type="submit"
              onClick={handleBasicInfoSubmit}
              disabled={isSubmitting || isUploadingImage}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: 'var(--icon-cyan-text)' }}
            >
              <Save className="w-4 h-4" />
              {isUploadingImage
                ? 'Uploading…'
                : isSubmitting
                ? 'Saving…'
                : isEditMode
                ? 'Update patient'
                : 'Register patient'}
            </button>
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting || isUploadingImage}
              className="px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50"
              style={{
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-color)',
                background: 'transparent',
              }}
            >
              Cancel
            </button>
          </>
        )}

        {/* Payment tab actions */}
        {activeTab === 'payment' && (savedPatientId || isEditMode) && (
          <button
            type="button"
            onClick={handleSavePaymentMode}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--icon-cyan-text)' }}
          >
            <Save className="w-4 h-4" />
            Save payment mode
          </button>
        )}

        {/* Additional tab actions */}
        {activeTab === 'additional' && (savedPatientId || isEditMode) && (
          <button
            type="button"
            onClick={handleSaveAdditionalInfo}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--icon-green-text)' }}
          >
            <Save className="w-4 h-4" />
            Save additional info
          </button>
        )}

        {/* Guard — tabs 2 & 3 before basic info is saved */}
        {(activeTab === 'payment' || activeTab === 'additional') &&
          !savedPatientId &&
          !isEditMode && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border"
              style={{
                background: 'var(--icon-yellow-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--icon-yellow-text)',
              }}
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Complete and save basic information first.
            </div>
          )}
      </div>
    </div>
  </div>
);
}