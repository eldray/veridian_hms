// src/pages/insurance-claims/EditCorporateClaim.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../../store/insuranceStore';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { usePatientStore } from '../../store/patientStore';
import { useCorporateStore } from '../../store/corporateStore';
import { useToast } from '../../store/toastStore';
import {
  ArrowLeft, Save, Lock, Download, Printer, FileText, User, Calendar,
  Activity, CheckCircle, XCircle, AlertCircle, Clock, Plus, Search, Trash2,
  Stethoscope, Building, Users, CreditCard, TrendingUp, AlertTriangle,
  Edit, Trash2 as TrashIcon, Briefcase, UserCheck
} from 'lucide-react';

// Re-use shared modal components
function AddDiagnosisModalCorporate({ isOpen, onClose, onAdd, existingDiagnoses }: any) {
  // Same as NHIS version but with corporate styling
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
    if (selectedDiagnosis) {
      onAdd({
        description: selectedDiagnosis.name,
        icd10: selectedDiagnosis.icdCode,
        diagnosisId: selectedDiagnosis.id
      });
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
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Diagnosis</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search diagnosis..."
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
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleAdd} disabled={!selectedDiagnosis} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg disabled:opacity-50 text-sm font-medium">
            Add Diagnosis
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Employee Service Modal (for corporate)
function AddEmployeeServiceModal({ isOpen, onClose, onAdd, employees }: any) {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAdd = () => {
    if (selectedEmployee && description && amount > 0) {
      onAdd({
        employeeId: selectedEmployee.id,
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
        description,
        amount,
        date: serviceDate
      });
      setSelectedEmployee(null);
      setDescription('');
      setAmount(0);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Employee Service</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Select Employee</label>
            <select
              value={selectedEmployee?.id || ''}
              onChange={(e) => setSelectedEmployee(employees.find((emp: any) => emp.id === e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} - {emp.employeeId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Service Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Consultation, Lab Test, etc."
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Amount (GHS)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Service Date</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
              />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleAdd} disabled={!selectedEmployee || !description || amount <= 0} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg disabled:opacity-50 text-sm font-medium">
            Add Service
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function EditCorporateClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const isInitialized = useRef(false);

  const {
    currentClaim,
    getInsuranceClaim,
    updateInsuranceClaim,
    finalizeClaim,
    generateClaimXML,
    generateClaimPrint,
    isLoading
  } = useInsuranceStore();

  const {
    corporateAccounts,
    getCorporateAccounts,
    getCorporateEmployees,
    currentEmployees
  } = useCorporateStore();

  const { patients } = usePatientStore();

  // Corporate specific state
  const [corporateAccount, setCorporateAccount] = useState<any>(null);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [employeeServices, setEmployeeServices] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [creditWarning, setCreditWarning] = useState(false);

  const isDraft = currentClaim?.status === 'draft';
  const isFinalized = currentClaim?.status === 'submitted';

  // Calculate totals
  useEffect(() => {
    const newTotal = employeeServices.reduce((sum, s) => sum + s.amount, 0);
    setTotalAmount(newTotal);
    
    const newDiscount = newTotal * (discountPercentage / 100);
    setDiscountAmount(newDiscount);
    setFinalAmount(newTotal - newDiscount);
  }, [employeeServices, discountPercentage]);

  // Check credit limit
  useEffect(() => {
    if (corporateAccount && finalAmount > (corporateAccount.creditLimit - corporateAccount.currentBalance)) {
      setCreditWarning(true);
    } else {
      setCreditWarning(false);
    }
  }, [corporateAccount, finalAmount]);

  // Load data
  useEffect(() => {
    if (id) {
      getInsuranceClaim(id);
      getCorporateAccounts();
    }
  }, [id]);

  // Populate form from claim
  useEffect(() => {
    if (!currentClaim || isInitialized.current) return;
    isInitialized.current = true;

    const attendance = currentClaim.Attendance;
    const corporateId = currentClaim.corporateAccountId || attendance?.corporateAccountId;
    
    if (corporateId) {
      const account = corporateAccounts.find(a => a.id === corporateId);
      setCorporateAccount(account);
      setDiscountPercentage(account?.discountPercentage || 0);
      
      // Load employees for this corporate account
      getCorporateEmployees(corporateId);
    }

    setVisitDate(attendance?.dateTime?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setNotes(currentClaim.notes || '');

    // Parse diagnoses
    const attendanceDiagnoses = attendance?.AttendanceDiagnosis || [];
    setDiagnoses(attendanceDiagnoses.map((d: any) => ({
      id: d.id,
      description: d.Diagnosis?.name || '',
      icd10: d.Diagnosis?.icdCode || '',
      diagnosisId: d.diagnosisId
    })));

    // Parse employee services from claim data
    if (currentClaim.metadata?.employeeServices) {
      setEmployeeServices(currentClaim.metadata.employeeServices);
    }
  }, [currentClaim, corporateAccounts]);

  const addDiagnosis = (diagnosis: any) => {
    setDiagnoses([...diagnoses, diagnosis]);
  };

  const removeDiagnosis = (index: number) => {
    setDiagnoses(diagnoses.filter((_, i) => i !== index));
  };

  const addEmployeeService = (service: any) => {
    setEmployeeServices([...employeeServices, service]);
  };

  const removeEmployeeService = (index: number) => {
    setEmployeeServices(employeeServices.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!isDraft) return;
    
    if (creditWarning) {
      if (!window.confirm(`Warning: This claim exceeds the credit limit. Continue anyway?`)) {
        return;
      }
    }
    
    try {
      setIsSubmitting(true);
      
      const updateData = {
        diagnosisCodes: diagnoses.map(d => d.icd10),
        totalClaimAmount: finalAmount,
        notes,
        metadata: {
          employeeServices,
          discountPercentage,
          discountAmount,
          subtotal: totalAmount
        }
      };
      
      await updateInsuranceClaim(id!, updateData);
      success('Saved', 'Corporate claim updated successfully');
      await getInsuranceClaim(id!);
    } catch (err: any) {
      toastError('Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    await handleSave();
    await finalizeClaim(id!);
    success('Finalized', 'Claim is ready for submission');
    navigate('/dashboard/insurance-claims');
  };

  if (isLoading && !currentClaim) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-purple-text)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/insurance-claims')} className="p-2 hover:bg-[var(--bg-card)] rounded-xl">
              <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
            <div className="w-12 h-12 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Edit Corporate Claim</h1>
              <p className="text-sm text-[var(--text-secondary)]">{currentClaim?.claimNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <button onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg">
                  <Save className="w-4 h-4" /> Save Draft
                </button>
                <button onClick={handleFinalize} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg">
                  <Lock className="w-4 h-4" /> Finalize
                </button>
              </>
            )}
            {isFinalized && (
              <>
                <button onClick={() => generateClaimXML(id!)} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg">
                  <Download className="w-4 h-4" /> XML
                </button>
                <button onClick={() => generateClaimPrint(id!)} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg">
                  <Printer className="w-4 h-4" /> Print
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <div className={`p-3 rounded-xl mb-6 ${isDraft ? 'bg-[var(--icon-yellow-bg)]' : 'bg-[var(--icon-green-bg)]'}`}>
          <div className="flex items-center gap-3">
            {isDraft ? <Clock className="w-5 h-5 text-[var(--icon-yellow-text)]" /> : <CheckCircle className="w-5 h-5 text-[var(--icon-green-text)]" />}
            <span className="text-sm">{isDraft ? 'DRAFT - Corporate claim requires employee service details' : 'FINALIZED - Ready for corporate billing'}</span>
          </div>
        </div>

        {/* Credit Limit Warning */}
        {creditWarning && isDraft && (
          <div className="bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)] rounded-xl p-3 mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--icon-red-text)]" />
              <span className="text-sm text-[var(--icon-red-text)]">
                Warning: This claim (GHS {finalAmount.toFixed(2)}) would exceed the available credit limit. 
                Current balance: GHS {corporateAccount?.currentBalance?.toFixed(2)} / {corporateAccount?.creditLimit?.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Corporate Account Details */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Building className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              Corporate Account Details
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Company</label>
              <p className="text-sm font-medium">{corporateAccount?.companyName || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Credit Limit</label>
              <p className="text-sm">GHS {corporateAccount?.creditLimit?.toFixed(2) || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Current Balance</label>
              <p className="text-sm">GHS {corporateAccount?.currentBalance?.toFixed(2) || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Service Date</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                disabled={!isDraft}
                className="w-full px-3 py-1 border rounded-lg bg-[var(--bg-main)] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Diagnoses Section */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              Diagnoses ({diagnoses.length})
            </h2>
            {isDraft && (
              <button onClick={() => setActiveModal('diagnosis')} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded">
                <Plus className="w-3 h-3" /> Add Diagnosis
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b">
                <tr><th className="px-3 py-2 text-left text-xs">#</th><th className="px-3 py-2 text-left text-xs">DESCRIPTION</th><th className="px-3 py-2 text-left text-xs">ICD-10</th>{isDraft && <th className="px-3 py-2 text-center text-xs">Actions</th>}</tr>
              </thead>
              <tbody className="divide-y">
                {diagnoses.length === 0 ? (
                  <tr><td colSpan={isDraft ? 4 : 3} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No diagnoses added</td></tr>
                ) : (
                  diagnoses.map((diag, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)]">
                      <td className="px-3 py-2">{idx + 1}.</td>
                      <td className="px-3 py-2">{diag.description}</td>
                      <td className="px-3 py-2 font-mono text-xs">{diag.icd10}</td>
                      {isDraft && (
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => removeDiagnosis(idx)} className="text-red-500"><TrashIcon className="w-4 h-4" /></button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employee Services Section */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              Employee Services ({employeeServices.length})
            </h2>
            {isDraft && (
              <button onClick={() => setActiveModal('employeeService')} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded">
                <Plus className="w-3 h-3" /> Add Service
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs">#</th>
                  <th className="px-3 py-2 text-left text-xs">EMPLOYEE</th>
                  <th className="px-3 py-2 text-left text-xs">SERVICE</th>
                  <th className="px-3 py-2 text-left text-xs">DATE</th>
                  <th className="px-3 py-2 text-right text-xs">AMOUNT</th>
                  {isDraft && <th className="px-3 py-2 text-center text-xs">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {employeeServices.length === 0 ? (
                  <tr><td colSpan={isDraft ? 6 : 5} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No employee services added</td></tr>
                ) : (
                  employeeServices.map((service, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)]">
                      <td className="px-3 py-2">{idx + 1}.</td>
                      <td className="px-3 py-2">{service.employeeName}</td>
                      <td className="px-3 py-2">{service.description}</td>
                      <td className="px-3 py-2">{service.date}</td>
                      <td className="px-3 py-2 text-right font-medium">GHS {service.amount.toFixed(2)}</td>
                      {isDraft && (
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => removeEmployeeService(idx)} className="text-red-500"><TrashIcon className="w-4 h-4" /></button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary with Corporate Discount */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              Financial Summary
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Subtotal:</span>
                <span className="font-medium">GHS {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Corporate Discount:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                    disabled={!isDraft}
                    className="w-20 px-2 py-1 border rounded text-right"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="flex justify-between py-2 border-t">
                <span className="text-[var(--text-secondary)]">Discount Amount:</span>
                <span className="text-[var(--icon-green-text)]">- GHS {discountAmount.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between py-2 border-t border-b p-3 rounded-lg ${creditWarning ? 'bg-[var(--icon-red-bg)]' : 'bg-[var(--icon-cyan-bg)]'}`}>
                <span className="font-bold">Total Corporate Bill:</span>
                <span className={`font-bold ${creditWarning ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-cyan-text)]'}`}>
                  GHS {finalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b">
            <h2 className="font-semibold">Notes</h2>
          </div>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isDraft}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] resize-none"
              placeholder="Additional notes..."
            />
            
            {isDraft && (
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => navigate('/dashboard/insurance-claims')} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <AddDiagnosisModalCorporate
          isOpen={activeModal === 'diagnosis'}
          onClose={() => setActiveModal(null)}
          onAdd={addDiagnosis}
          existingDiagnoses={diagnoses}
        />

        <AddEmployeeServiceModal
          isOpen={activeModal === 'employeeService'}
          onClose={() => setActiveModal(null)}
          onAdd={addEmployeeService}
          employees={currentEmployees}
        />
      </div>
    </div>
  );
}