// src/pages/EditInsuranceClaim.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import {
  ArrowLeft,
  Save,
  Lock,
  Download,
  Printer,
  FileText,
  User,
  Shield,
  Calendar,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3,
  Clock
} from 'lucide-react';

export default function EditInsuranceClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();

  const {
    currentDraft,
    currentClaim,
    getClaimDraft,
    updateClaimDraft,
    finalizeClaim,
    generateClaimXML,
    generateClaimPrint,
    isLoading
  } = useInsuranceStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load claim draft data
  useEffect(() => {
    if (id) {
      loadClaimDraft();
    }
  }, [id]);

  const loadClaimDraft = async () => {
    try {
      await getClaimDraft(id!);
    } catch (error: any) {
      toastError('Load Failed', 'Could not load claim data');
      navigate('/dashboard/insurance-claims');
    }
  };

  // Initialize form data when draft loads
  useEffect(() => {
    if (currentDraft) {
      setFormData({
        diagnosisCodes: currentDraft.diagnosisCodes || [],
        procedureCodes: currentDraft.procedureCodes || [],
        labTestCodes: currentDraft.labTestCodes || [],
        medicationCodes: currentDraft.medicationCodes || [],
        scanCodes: currentDraft.scanCodes || [],
        serviceCodes: currentDraft.serviceCodes || [],
        notes: currentDraft.notes || '',
        preAuthNumber: currentDraft.preAuthNumber || '',
      });
    }
  }, [currentDraft]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addCode = (field: string, code: string) => {
    if (code.trim() && !formData[field].includes(code.trim())) {
      handleInputChange(field, [...formData[field], code.trim()]);
    }
  };

  const removeCode = (field: string, index: number) => {
    handleInputChange(field, formData[field].filter((_: any, i: number) => i !== index));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.diagnosisCodes.length) {
      errors.diagnosisCodes = 'At least one diagnosis code is required';
    }

    if (!formData.procedureCodes.length) {
      errors.procedureCodes = 'At least one procedure code is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) {
      warning('Validation Error', 'Please fix the errors before saving');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateClaimDraft(id!, formData);
      success('Draft Saved', 'Claim draft updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toastError('Save Failed', error.message || 'Could not save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeClaim = async () => {
    if (!validateForm()) {
      warning('Validation Error', 'Please fix the errors before finalizing');
      return;
    }

    // Save any changes first
    if (isEditing) {
      await handleSaveDraft();
    }

    try {
      setIsSubmitting(true);
      await finalizeClaim(id!);
      success('Claim Finalized', 'Claim has been finalized and is ready for submission');
      navigate('/dashboard/insurance-claims');
    } catch (error: any) {
      toastError('Finalize Failed', error.message || 'Could not finalize claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadXML = async () => {
    try {
      await generateClaimXML(id!);
      success('XML Downloaded', 'Claim XML file ready for NHIS submission');
    } catch (error: any) {
      toastError('Download Failed', 'Could not generate XML file');
    }
  };

  const handlePrintClaim = async () => {
    try {
      await generateClaimPrint(id!);
      success('Print Ready', 'Claim data ready for printing');
    } catch (error: any) {
      toastError('Print Failed', 'Could not generate print format');
    }
  };

  if (isLoading && !currentDraft) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-purple-text)]"></div>
      </div>
    );
  }

  if (!currentDraft) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Claim not found</p>
        </div>
      </div>
    );
  }

  const isFinalized = currentDraft.status === 'submitted';
  const isDraft = currentDraft.status === 'draft';

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/insurance-claims')}
              className="p-2 hover:bg-[var(--bg-card)] rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
            <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--icon-purple-text)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {isFinalized ? 'View Insurance Claim' : 'Edit Insurance Claim'}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {currentDraft.claimNumber} • {currentDraft.insuranceProvider?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDraft}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isSubmitting ? 'Saving...' : 'Save Draft'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-colors text-sm flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Draft
                  </button>
                )}
                <button
                  onClick={handleFinalizeClaim}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {isSubmitting ? 'Finalizing...' : 'Finalize Claim'}
                </button>
              </>
            )}

            {isFinalized && (
              <>
                <button
                  onClick={handleDownloadXML}
                  className="px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download XML
                </button>
                <button
                  onClick={handlePrintClaim}
                  className="px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Claim
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <div className={`p-4 rounded-xl mb-6 ${
          isFinalized 
            ? 'bg-[var(--icon-purple-bg)] border border-[var(--icon-purple-text)]' 
            : 'bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)]'
        }`}>
          <div className="flex items-center gap-3">
            {isFinalized ? (
              <CheckCircle className="w-5 h-5 text-[var(--icon-purple-text)]" />
            ) : (
              <Clock className="w-5 h-5 text-[var(--icon-yellow-text)]" />
            )}
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                {isFinalized ? 'Claim Finalized' : 'Draft in Progress'}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {isFinalized 
                  ? 'This claim has been finalized and is ready for submission to the insurance provider.'
                  : 'This claim is in draft mode. Finalize it when ready for submission.'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Claim Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient and Provider Info */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[var(--icon-blue-text)]" />
                Patient & Provider Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Patient Name</label>
                  <p className="text-[var(--text-primary)] font-medium">{currentDraft.patient?.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Insurance Provider</label>
                  <p className="text-[var(--text-primary)] font-medium">{currentDraft.insuranceProvider?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Attendance Date</label>
                  <p className="text-[var(--text-primary)] font-medium">
                    {new Date(currentDraft.attendance?.dateTime).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Claim Amount</label>
                  <p className="text-[var(--text-primary)] font-medium">GHS {currentDraft.totalClaimAmount?.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Medical Codes Section */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--icon-green-text)]" />
                Medical Codes
              </h2>

              {/* Diagnosis Codes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Diagnosis Codes {validationErrors.diagnosisCodes && (
                    <span className="text-[var(--icon-red-text)] text-xs ml-2">
                      {validationErrors.diagnosisCodes}
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add diagnosis code..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addCode('diagnosisCodes', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData?.diagnosisCodes.map((code: string, index: number) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-full text-sm">
                          {code}
                          <button
                            type="button"
                            onClick={() => removeCode('diagnosisCodes', index)}
                            className="hover:text-[var(--icon-red-text)]"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentDraft.diagnosisCodes?.map((code: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-full text-sm">
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Procedure Codes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Procedure Codes {validationErrors.procedureCodes && (
                    <span className="text-[var(--icon-red-text)] text-xs ml-2">
                      {validationErrors.procedureCodes}
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add procedure code..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addCode('procedureCodes', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData?.procedureCodes.map((code: string, index: number) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-full text-sm">
                          {code}
                          <button
                            type="button"
                            onClick={() => removeCode('procedureCodes', index)}
                            className="hover:text-[var(--icon-red-text)]"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentDraft.procedureCodes?.map((code: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-full text-sm">
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Codes (Read-only for now) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Lab Tests</label>
                  <div className="flex flex-wrap gap-1">
                    {currentDraft.labTestCodes?.map((code: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-[var(--bg-main)] text-[var(--text-primary)] rounded text-xs">
                        {code}
                      </span>
                    )) || <span className="text-[var(--text-tertiary)]">None</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Medications</label>
                  <div className="flex flex-wrap gap-1">
                    {currentDraft.medicationCodes?.map((code: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-[var(--bg-main)] text-[var(--text-primary)] rounded text-xs">
                        {code}
                      </span>
                    )) || <span className="text-[var(--text-tertiary)]">None</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--icon-yellow-text)]" />
                Additional Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Pre-Authorization Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData?.preAuthNumber || ''}
                      onChange={(e) => handleInputChange('preAuthNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                      placeholder="Enter pre-authorization number..."
                    />
                  ) : (
                    <p className="text-[var(--text-primary)]">
                      {currentDraft.preAuthNumber || 'Not provided'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Notes
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData?.notes || ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm resize-none"
                      placeholder="Add any additional notes..."
                    />
                  ) : (
                    <p className="text-[var(--text-primary)] whitespace-pre-wrap">
                      {currentDraft.notes || 'No notes provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Actions and Summary */}
          <div className="space-y-6">
            {/* Claim Summary */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Claim Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Claim Number:</span>
                  <span className="font-medium text-[var(--text-primary)]">{currentDraft.claimNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isFinalized 
                      ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border border-[var(--icon-purple-text)]'
                      : 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)]'
                  }`}>
                    {currentDraft.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Total Amount:</span>
                  <span className="font-bold text-[var(--text-primary)]">GHS {currentDraft.totalClaimAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Created:</span>
                  <span className="text-[var(--text-primary)]">{new Date(currentDraft.createdAt).toLocaleDateString()}</span>
                </div>
                {currentDraft.updatedAt && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Last Updated:</span>
                    <span className="text-[var(--text-primary)]">{new Date(currentDraft.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Warnings */}
            {isDraft && (
              <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--icon-yellow-text)] mt-0.5" />
                  <div>
                    <p className="font-medium text-[var(--text-primary)] text-sm">Before Finalizing</p>
                    <ul className="text-xs text-[var(--text-secondary)] mt-1 space-y-1">
                      <li>• Ensure all diagnosis codes are correct</li>
                      <li>• Verify procedure codes match services rendered</li>
                      <li>• Check that pre-authorization numbers are included if required</li>
                      <li>• Review claim amount and patient information</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Finalized Actions */}
            {isFinalized && (
              <div className="bg-[var(--icon-purple-bg)] border border-[var(--icon-purple-text)] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[var(--icon-purple-text)] mt-0.5" />
                  <div>
                    <p className="font-medium text-[var(--text-primary)] text-sm">Ready for Submission</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      This claim has been finalized. Download the XML file for NHIS submission or print for records.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}