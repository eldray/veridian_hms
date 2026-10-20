// src/pages/PatientRegistration.tsx - UPDATED WITH YOUR THEME
import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useCorporateStore } from '../store/corporateStore';
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
import type {
  PaymentMode,
  InsuranceDetails,
  AdditionalInfo,
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalHistory,
  PatientSurgicalHistory,
} from '../types';
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
  const {
    corporateAccounts,
    getCorporateAccounts,
    isLoading: isLoadingCorporate,
  } = useCorporateStore();

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
    corporateDetails?: {
      accountId: string;
      employeeId?: string;
      companyName?: string;
      employeeCode?: string;
    };
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
  const [clinicalHistory, setClinicalHistory] = useState<{
    allergies: PatientAllergy[];
    medicalHistories: PatientMedicalHistory[];
    surgicalHistories: PatientSurgicalHistory[];
    familyHistories: PatientFamilyHistory[];
  }>({
    allergies: [],
    medicalHistories: [],
    surgicalHistories: [],
    familyHistories: [],
  });

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
        await Promise.all([
          getInsuranceProviders(),
          getCorporateAccounts({ limit: 100 }),
        ]);

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
      const surname = currentPatient.surname || '';
      const otherNames = currentPatient.otherNames || '';

      setFormData({
        folderNumber: currentPatient.folderNumber || '',
        surname: surname,
        otherNames: otherNames,
        gender: currentPatient.gender || 'male',
        dateOfBirth: dob || '',
        contact: currentPatient.contact || '',
        address: currentPatient.address || '',
      });

      setPaymentData({
        paymentMode: currentPatient.paymentMode || 'cash',
        insuranceDetails: currentPatient.insuranceDetails
          ? {
              ...currentPatient.insuranceDetails,
              startDate: convertISODateToInputFormat(currentPatient.insuranceDetails.startDate),
              endDate: convertISODateToInputFormat(currentPatient.insuranceDetails.endDate),
              providerId: currentPatient.insuranceDetails.providerId || currentPatient.insuranceProviderId || '',
            }
          : currentPatient.nhisNumber
            ? {
                insuranceNumber: currentPatient.nhisNumber,
                startDate: '',
                endDate: currentPatient.nhisExpiryDate
                  ? convertISODateToInputFormat(currentPatient.nhisExpiryDate)
                  : '',
                isActive: currentPatient.nhisActive || false,
              }
          : undefined,
        corporateDetails: currentPatient.paymentMode === 'corporate'
          ? {
              accountId: currentPatient.employer?.corporateAccountId || currentPatient.insuranceProviderId || '',
              employeeId: currentPatient.employer?.employeeId || '',
              companyName: currentPatient.employer?.companyName || '',
            }
          : undefined,
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
      setClinicalHistory({
        allergies: currentPatient.allergies || [],
        medicalHistories: (currentPatient.medicalHistories || []).map((history) => ({
          ...history,
          diagnosedAt: history.diagnosedAt
            ? convertISODateToInputFormat(history.diagnosedAt)
            : '',
        })),
        surgicalHistories: (currentPatient.surgicalHistories || []).map((history) => ({
          ...history,
          surgeryDate: history.surgeryDate
            ? convertISODateToInputFormat(history.surgeryDate)
            : '',
        })),
        familyHistories: currentPatient.familyHistories || [],
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
      setClinicalHistory({
        allergies: [],
        medicalHistories: [],
        surgicalHistories: [],
        familyHistories: [],
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
    if ((paymentData.paymentMode === 'nhis' || paymentData.paymentMode === 'private_insurance')
      && !isInsuranceCoverageValid()) {
      toastError('Coverage dates required', 'Enter valid coverage dates, with the end date on or after the start date.');
      setActiveTab('payment');
      return;
    }
    if (paymentData.paymentMode === 'private_insurance' && !paymentData.insuranceDetails?.providerId) {
      toastError('Provider required', 'Select a private insurance provider.');
      setActiveTab('payment');
      return;
    }
    if (paymentData.paymentMode === 'corporate'
      && (!paymentData.corporateDetails?.accountId || !paymentData.corporateDetails.employeeId?.trim())) {
      toastError('Corporate details required', 'Select a corporate account and enter the employee ID.');
      setActiveTab('payment');
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
        ...getPaymentModePayload(),
        additionalInfo: additionalInfo,
        ...getClinicalHistoryPayload(),
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

    if ((paymentData.paymentMode === 'nhis' || paymentData.paymentMode === 'private_insurance')
      && !isInsuranceCoverageValid()) {
      toastError('Coverage dates required', 'Enter valid coverage dates, with the end date on or after the start date.');
      return;
    }
    if (paymentData.paymentMode === 'private_insurance' && !paymentData.insuranceDetails?.providerId) {
      toastError('Provider required', 'Select a private insurance provider.');
      return;
    }
    if (paymentData.paymentMode === 'corporate'
      && (!paymentData.corporateDetails?.accountId || !paymentData.corporateDetails.employeeId?.trim())) {
      toastError('Corporate details required', 'Select a corporate account and enter the employee ID.');
      return;
    }

    try {
      await updatePatient(patientIdToUse, getPaymentModePayload());
      success('Saved', 'Payment mode updated');
    } catch (error: any) {
      toastError('Save failed', error.message || 'Could not update payment mode');
    }
  };

  const isInsuranceCoverageValid = () => {
    const { startDate, endDate } = paymentData.insuranceDetails || {};
    return Boolean(
    startDate &&
    endDate &&
    !Number.isNaN(new Date(`${startDate}T00:00:00`).getTime()) &&
    !Number.isNaN(new Date(`${endDate}T00:00:00`).getTime()) &&
    new Date(`${endDate}T00:00:00`) >= new Date(`${startDate}T00:00:00`)
    );
  };

  const isInsuranceCurrentlyActive = () => {
    if (!isInsuranceCoverageValid()) return false;
    const { startDate, endDate } = paymentData.insuranceDetails!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${startDate}T00:00:00`) <= today && new Date(`${endDate}T00:00:00`) >= today;
  };

  const getPaymentModePayload = () => {
    const insuranceDetails = paymentData.insuranceDetails
    ? { ...paymentData.insuranceDetails, isActive: isInsuranceCurrentlyActive() }
      : undefined;
    const common = {
      paymentMode: paymentData.paymentMode,
      insuranceDetails: null,
      insuranceProviderId: null,
      nhisNumber: null,
      nhisExpiryDate: null,
      nhisActive: false,
      corporateAccountId: null,
      corporateEmployeeId: null,
      employer: null,
    };

    if (paymentData.paymentMode === 'nhis') {
      return {
        ...common,
        insuranceDetails,
        nhisNumber: insuranceDetails?.insuranceNumber || null,
        nhisExpiryDate: insuranceDetails?.endDate || null,
        nhisActive: isInsuranceCurrentlyActive(),
      };
    }

    if (paymentData.paymentMode === 'private_insurance') {
      return {
        ...common,
        insuranceDetails,
        insuranceProviderId: insuranceDetails?.providerId || null,
      };
    }

    if (paymentData.paymentMode === 'corporate') {
      const corporate = paymentData.corporateDetails;
      return {
        ...common,
        corporateAccountId: corporate?.accountId || null,
        corporateEmployeeId: corporate?.employeeId || null,
        employer: corporate ? {
          corporateAccountId: corporate.accountId,
          employeeId: corporate.employeeId || '',
          companyName: corporate.companyName || '',
        } : null,
      };
    }

    return common;
  };

  const getClinicalHistoryPayload = () => ({
    allergies: clinicalHistory.allergies
      .filter((item) => item.allergen.trim())
      .map(({ allergen, reaction, severity, notes }) => ({
        allergen: allergen.trim(),
        reaction: reaction?.trim() || undefined,
        severity: severity || undefined,
        notes: notes?.trim() || undefined,
      })),
    medicalHistories: clinicalHistory.medicalHistories
      .filter((item) => item.condition.trim())
      .map(({ condition, diagnosedAt, notes }) => ({
        condition: condition.trim(),
        diagnosedAt: diagnosedAt || undefined,
        notes: notes?.trim() || undefined,
      })),
    surgicalHistories: clinicalHistory.surgicalHistories
      .filter((item) => item.procedure.trim())
      .map(({ procedure, surgeryDate, notes }) => ({
        procedure: procedure.trim(),
        surgeryDate: surgeryDate || undefined,
        notes: notes?.trim() || undefined,
      })),
    familyHistories: clinicalHistory.familyHistories
      .filter((item) => item.relation.trim() && item.condition.trim())
      .map(({ relation, condition, notes }) => ({
        relation: relation.trim(),
        condition: condition.trim(),
        notes: notes?.trim() || undefined,
      })),
  });

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
        additionalInfo,
        ...getClinicalHistoryPayload(),
      });
      success('Saved', 'Additional and medical history updated');
    } catch (error: any) {
      toastError('Save failed', error.message || 'Could not save additional and medical history');
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
            corporateDetails={paymentData.corporateDetails}
            onPaymentModeChange={(mode) =>
              mode && setPaymentData((current) => ({ ...current, paymentMode: mode }))
            }
            onInsuranceDetailsChange={(details) =>
              setPaymentData((current) => ({ ...current, insuranceDetails: details }))
            }
            onCorporateDetailsChange={(details) =>
              setPaymentData((current) => ({ ...current, corporateDetails: details }))
            }
            insuranceProviders={providers}
            corporateAccounts={corporateAccounts}
            isLoadingProviders={isLoadingProviders}
            isLoadingCorporate={isLoadingCorporate}
            onRetryCorporate={() => { void getCorporateAccounts({ limit: 100 }); }}
            isOptional={true}
            patientId={
              savedPatientId || currentPatient?.id || patientId || undefined
            }
          />
        )}

        {activeTab === 'additional' && (
          <AdditionalInfoTab
            additionalInfo={additionalInfo}
            onAdditionalInfoChange={setAdditionalInfo}
            clinicalHistory={clinicalHistory}
            onClinicalHistoryChange={setClinicalHistory}
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