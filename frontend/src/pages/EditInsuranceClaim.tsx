// src/pages/EditInsuranceClaim.tsx - FIXED VERSION
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../store/insuranceStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useToast } from '../store/toastStore';
import {
  ArrowLeft,
  Save,
  Lock,
  Download,
  Printer,
  FileText,
  User,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Plus,
  Search,
  Stethoscope,
  FlaskConical,
  Pill,
  Scissors,
  Scan,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// ==========================================
// HELPERS
// ==========================================

/**
 * The backend returns { success: true, data: { ...claim }, canEdit: true }
 * The store may store either the full response object OR just the claim.
 * This function always returns the actual claim object regardless.
 */
const normalizeClaim = (raw: any) => {
  if (!raw) return null;
  // If it has a `data` key that looks like a claim (has claimNumber), unwrap it
  if (raw.data && raw.data.claimNumber !== undefined) return raw.data;
  // Otherwise assume raw IS the claim
  return raw;
};

const getPatientFullName = (patient: any) => {
  if (!patient) return 'Unknown';
  return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown';
};

// ==========================================
// ADD DIAGNOSIS MODAL
// ==========================================

function AddDiagnosisModal({ isOpen, onClose, onAdd, existingCodes }: any) {
  const { diagnoses, getDiagnoses } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);

  useEffect(() => {
    if (isOpen) getDiagnoses();
  }, [isOpen, getDiagnoses]);

  const filteredDiagnoses = diagnoses.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.icdCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedDiagnosis && !existingCodes.includes(selectedDiagnosis.icdCode)) {
      onAdd(selectedDiagnosis.icdCode);
      setSelectedDiagnosis(null);
      setSearchTerm('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Diagnosis Code</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by diagnosis name or ICD code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredDiagnoses.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDiagnosis(d)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedDiagnosis?.id === d.id
                    ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                    : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'
                }`}
              >
                <div className="font-medium text-sm">{d.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">ICD-10: {d.icdCode}</div>
              </button>
            ))}
            {filteredDiagnoses.length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">No diagnoses found</p>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button
            onClick={handleAdd}
            disabled={!selectedDiagnosis}
            className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
          >
            Add Code
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// GENERIC CODE MODAL
// ==========================================

function AddCodeModal({ isOpen, onClose, onAdd, title, placeholder }: any) {
  const [code, setCode] = useState('');

  const handleAdd = () => {
    if (code.trim()) {
      onAdd(code.trim().toUpperCase());
      setCode('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Add {title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            placeholder={placeholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button
            onClick={handleAdd}
            disabled={!code.trim()}
            className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
          >
            Add Code
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function EditInsuranceClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();

  const {
    currentDraft,
    getClaimDraft,
    updateClaimDraft,
    finalizeClaim,
    generateClaimXML,
    generateClaimPrint,
    isLoading
  } = useInsuranceStore();

  const [formData, setFormData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    diagnosisCodes: true,
    procedureCodes: true,
    labTestCodes: true,
    medicationCodes: true,
    scanCodes: true,
    serviceCodes: true
  });

  // ── Load on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (id) {
      getClaimDraft(id).catch(() => {
        toastError('Load Failed', 'Could not load claim data');
        navigate('/dashboard/insurance-claims');
      });
    }
  }, [id]);

  // ── Sync formData whenever the store updates ───────────────────
  // KEY FIX: always normalize through normalizeClaim() so we always
  // read the actual claim fields regardless of how the store shaped them.
  useEffect(() => {
    if (!currentDraft) return;

    const claim = normalizeClaim(currentDraft);
    if (!claim) return;

    setFormData({
      diagnosisCodes:  Array.isArray(claim.diagnosisCodes)  ? claim.diagnosisCodes  : [],
      procedureCodes:  Array.isArray(claim.procedureCodes)  ? claim.procedureCodes  : [],
      labTestCodes:    Array.isArray(claim.labTestCodes)    ? claim.labTestCodes    : [],
      medicationCodes: Array.isArray(claim.medicationCodes) ? claim.medicationCodes : [],
      scanCodes:       Array.isArray(claim.scanCodes)       ? claim.scanCodes       : [],
      serviceCodes:    Array.isArray(claim.serviceCodes)    ? claim.serviceCodes    : [],
      notes:           claim.notes        ?? '',
      preAuthNumber:   claim.preAuthNumber ?? '',
    });
  }, [currentDraft]);

  // ── Derive the claim object for display (read-only fields) ─────
  // All JSX that reads claim metadata uses this, not currentDraft directly.
  const claim = normalizeClaim(currentDraft);
  const isFinalized = claim?.status === 'submitted';
  const isDraft     = claim?.status === 'draft';

  // ── Handlers ───────────────────────────────────────────────────
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const addCode = (field: string, code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed && !formData[field].includes(trimmed)) {
      handleInputChange(field, [...formData[field], trimmed]);
    }
    setActiveModal(null);
  };

  const removeCode = (field: string, index: number) => {
    const updated = [...formData[field]];
    updated.splice(index, 1);
    handleInputChange(field, updated);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const validateForm = () => {
    if (!formData?.diagnosisCodes?.length) {
      warning('Validation Error', 'At least one diagnosis code is required');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      await updateClaimDraft(id!, formData);
      success('Draft Saved', 'Claim draft updated successfully');
      await getClaimDraft(id!);
    } catch (err: any) {
      toastError('Save Failed', err.message || 'Could not save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeClaim = async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      await updateClaimDraft(id!, formData); // save latest edits first
      await finalizeClaim(id!);
      success('Claim Finalized', 'Claim is ready for submission');
      navigate('/dashboard/insurance-claims');
    } catch (err: any) {
      toastError('Finalize Failed', err.message || 'Could not finalize claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadXML = async () => {
    try {
      await generateClaimXML(id!);
      success('XML Downloaded', 'Claim XML file ready');
    } catch {
      toastError('Download Failed', 'Could not generate XML file');
    }
  };

  const handlePrintClaim = async () => {
    try {
      await generateClaimPrint(id!);
      success('Print Ready', 'Claim data ready for printing');
    } catch {
      toastError('Print Failed', 'Could not generate print format');
    }
  };

  // ── Code section config ────────────────────────────────────────
  const codeSections = [
    { key: 'diagnosisCodes',  title: 'Diagnosis Codes (ICD-10)', icon: Stethoscope, color: 'cyan',   required: true,  placeholder: 'Enter ICD-10 code (e.g., B54, I10)' },
    { key: 'procedureCodes',  title: 'Procedure Codes',          icon: Scissors,    color: 'orange', required: false, placeholder: 'Enter procedure code' },
    { key: 'labTestCodes',    title: 'Lab Test Codes',           icon: FlaskConical,color: 'purple', required: false, placeholder: 'Enter lab test code' },
    { key: 'medicationCodes', title: 'Medication Codes',         icon: Pill,        color: 'green',  required: false, placeholder: 'Enter medication code' },
    { key: 'scanCodes',       title: 'Scan Codes',               icon: Scan,        color: 'indigo', required: false, placeholder: 'Enter scan code' },
    { key: 'serviceCodes',    title: 'Service Codes',            icon: Activity,    color: 'blue',   required: false, placeholder: 'Enter service code' },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    cyan:   { bg: 'bg-[var(--icon-cyan-bg)]',   text: 'text-[var(--icon-cyan-text)]',   border: 'border-[var(--icon-cyan-text)]' },
    orange: { bg: 'bg-orange-50',               text: 'text-orange-600',                border: 'border-orange-400' },
    purple: { bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]', border: 'border-[var(--icon-purple-text)]' },
    green:  { bg: 'bg-[var(--icon-green-bg)]',  text: 'text-[var(--icon-green-text)]',  border: 'border-[var(--icon-green-text)]' },
    indigo: { bg: 'bg-indigo-50',               text: 'text-indigo-600',                border: 'border-indigo-400' },
    blue:   { bg: 'bg-[var(--icon-blue-bg)]',   text: 'text-[var(--icon-blue-text)]',   border: 'border-[var(--icon-blue-text)]' },
  };

  // ── Loading / not found guards ─────────────────────────────────
  if (isLoading && !currentDraft) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-purple-text)]" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Claim not found</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/insurance-claims')}
              className="p-2 hover:bg-[var(--bg-card)] rounded-xl transition-all"
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
                {claim.claimNumber} • {claim.InsuranceProvider?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleFinalizeClaim}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Finalize Claim
                </button>
              </>
            )}
            {isFinalized && (
              <>
                <button
                  onClick={handleDownloadXML}
                  className="px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download XML
                </button>
                <button
                  onClick={handlePrintClaim}
                  className="px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white text-sm flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Claim
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Status Banner ── */}
        <div className={`p-4 rounded-xl mb-6 ${
          isFinalized
            ? 'bg-[var(--icon-purple-bg)] border border-[var(--icon-purple-text)]'
            : 'bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)]'
        }`}>
          <div className="flex items-center gap-3">
            {isFinalized
              ? <CheckCircle className="w-5 h-5 text-[var(--icon-purple-text)]" />
              : <Clock className="w-5 h-5 text-[var(--icon-yellow-text)]" />
            }
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                {isFinalized ? 'Claim Finalized' : 'Draft in Progress'}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {isFinalized
                  ? 'This claim has been finalized. Download XML for submission.'
                  : 'Edit the claim details below. Finalize when ready.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Patient & Provider Info */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[var(--icon-blue-text)]" />
                Patient & Provider Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Patient Name</label>
                  {/* FIX: use PascalCase Patient from Prisma */}
                  <p className="text-[var(--text-primary)] font-medium">{getPatientFullName(claim.Patient)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Insurance Provider</label>
                  {/* FIX: use PascalCase InsuranceProvider from Prisma */}
                  <p className="text-[var(--text-primary)] font-medium">{claim.InsuranceProvider?.name ?? '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Attendance Date</label>
                  {/* FIX: use PascalCase Attendance from Prisma */}
                  <p className="text-[var(--text-primary)]">
                    {claim.Attendance?.dateTime
                      ? new Date(claim.Attendance.dateTime).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Claim Amount</label>
                  <p className="text-[var(--text-primary)] font-bold">
                    GHS {claim.totalClaimAmount != null ? Number(claim.totalClaimAmount).toFixed(2) : '0.00'}
                  </p>
                </div>
                {claim.Attendance?.nhisCCC && (
                  <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)]">NHIS CCC</label>
                    <p className="text-[var(--text-primary)]">{claim.Attendance.nhisCCC}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Folder Number</label>
                  <p className="text-[var(--text-primary)]">{claim.Patient?.folderNumber ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Code Sections */}
            {codeSections.map((section) => {
              const Icon = section.icon;
              const colors = colorMap[section.color];
              const codes: string[] = formData?.[section.key] ?? [];

              return (
                <div key={section.key} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                  {/* Section Header (toggle) */}
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full px-4 py-3 bg-[var(--bg-main)] border-b border-[var(--border-color)] flex items-center justify-between hover:bg-[var(--bg-card)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                        {section.title}
                        {section.required && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {codes.length}
                      </span>
                    </div>
                    {expandedSections[section.key]
                      ? <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                      : <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                    }
                  </button>

                  {expandedSections[section.key] && (
                    <div className="p-4">
                      {/* Code pills */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {codes.length > 0
                          ? codes.map((code, index) => (
                              <span
                                key={`${code}-${index}`}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-mono border ${colors.bg} ${colors.text} ${colors.border}`}
                              >
                                {code}
                                {isDraft && (
                                  <button
                                    onClick={() => removeCode(section.key, index)}
                                    className="hover:text-red-500 transition-colors ml-1"
                                    title="Remove code"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </span>
                            ))
                          : (
                            <p className="text-sm text-[var(--text-tertiary)]">No codes added yet</p>
                          )
                        }
                      </div>

                      {/* Add button (draft only) */}
                      {isDraft && (
                        <button
                          onClick={() => setActiveModal(section.key)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-dashed border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-[var(--text-secondary)]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add {section.title.split(' ')[0]} Code
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Notes & Pre-Auth */}
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
                  {isDraft ? (
                    <input
                      type="text"
                      value={formData?.preAuthNumber ?? ''}
                      onChange={(e) => handleInputChange('preAuthNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                      placeholder="Enter pre-authorization number..."
                    />
                  ) : (
                    <p className="text-[var(--text-primary)]">{claim.preAuthNumber || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Notes</label>
                  {isDraft ? (
                    <textarea
                      value={formData?.notes ?? ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm resize-none"
                      placeholder="Add any additional notes..."
                    />
                  ) : (
                    <p className="text-[var(--text-primary)] whitespace-pre-wrap">{claim.notes || 'No notes'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Summary ── */}
          <div className="space-y-6">
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] sticky top-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Claim Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)] text-sm">Claim Number</span>
                  <span className="font-medium text-[var(--text-primary)] text-sm">{claim.claimNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)] text-sm">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isFinalized
                      ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]'
                      : 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]'
                  }`}>
                    {claim.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)] text-sm">Total Amount</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    GHS {claim.totalClaimAmount != null ? Number(claim.totalClaimAmount).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)] text-sm">Created</span>
                  <span className="text-[var(--text-primary)] text-sm">
                    {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)] text-sm">Type</span>
                  <span className="text-[var(--text-primary)] text-sm">
                    {claim.InsuranceProvider?.type?.toUpperCase() ?? '—'}
                  </span>
                </div>
              </div>

              {/* Code counts */}
              <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-1">
                {codeSections.map(s => (
                  <div key={s.key} className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{s.title.split('(')[0].trim()}:</span>
                    <span className={`font-medium ${(formData?.[s.key]?.length ?? 0) > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                      {formData?.[s.key]?.length ?? 0}
                    </span>
                  </div>
                ))}
              </div>

              {/* Draft checklist */}
              {isDraft && (
                <div className="mt-4 p-3 bg-[var(--icon-yellow-bg)] rounded-lg border border-[var(--icon-yellow-text)]">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[var(--icon-yellow-text)] mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-[var(--text-secondary)]">
                      <p className="font-medium text-[var(--text-primary)]">Before Finalizing:</p>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        <li className={formData?.diagnosisCodes?.length ? 'line-through opacity-50' : ''}>
                          Add at least one diagnosis code
                        </li>
                        <li>Verify all codes are correct</li>
                        <li>Review claim amount</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Finalized submission date */}
              {isFinalized && claim.submissionDate && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Calendar className="w-4 h-4" />
                    Submitted: {new Date(claim.submissionDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AddDiagnosisModal
        isOpen={activeModal === 'diagnosisCodes'}
        onClose={() => setActiveModal(null)}
        onAdd={(code: string) => addCode('diagnosisCodes', code)}
        existingCodes={formData?.diagnosisCodes ?? []}
      />

      {(['procedureCodes', 'labTestCodes', 'medicationCodes', 'scanCodes', 'serviceCodes'] as const).map((key) => {
        const section = codeSections.find(s => s.key === key);
        return (
          <AddCodeModal
            key={key}
            isOpen={activeModal === key}
            onClose={() => setActiveModal(null)}
            onAdd={(code: string) => addCode(key, code)}
            title={section?.title ?? 'Code'}
            placeholder={section?.placeholder ?? 'Enter code...'}
          />
        );
      })}
    </div>
  );
}