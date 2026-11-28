import { useSmartBack } from '../utils/useSmartBack';
import { PatientAvatar } from '../components/patients/PatientAvatar';
// src/pages/PatientBillingItems.tsx — Redesigned (Auto-Expanded)
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import RefundPaymentModal, { type RefundSubmission } from '../components/billing/RefundPaymentModal';
import { useAuthStore } from '../store/authStore';
import { useHospitalStore } from '../store/hospitalStore';
import { canAccessPage } from '../config/access';
import { useToast } from '../store/toastStore';
import { latestRecordedPayment, printThermalReceipt } from '../utils/receiptPrinter';
import { getPatientName } from '../utils/patient';
import { addServicesToEncounter } from '../api';
import { initiateMomoPayment, checkMomoPaymentStatus } from '../api/momo';
import { uuid } from '../utils/uuid';
import {
  ArrowLeft, Receipt, DollarSign, CreditCard, Eye, Printer,
  FileText, User, Calendar,
  Shield, CheckCircle, AlertCircle, X,
  RefreshCw, TrendingUp, Wallet, Pill, Stethoscope,
  Microscope, Scan, Syringe, ClipboardList, Hospital,
  CheckSquare, Square, PlusCircle, Loader2, ChevronDown, Undo2,
} from 'lucide-react';
import {
  Badge, Button, cn, Field, humanStatus, INPUT, LinkButton, PageHeader,
  Pagination, SearchInput, SELECT, statusTone, TD, TH, TH_ROW, TR,
} from '../components/ui';

interface BillLineItem {
  id: string;
  description: string;
  serviceType: string;
  serviceCategory: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  vatAmount: number;
  insuranceCoveredAmount: number;
  patientPayableAmount: number;
  paidAmount: number;
  balance: number;
  discount: number;
  isVoided: boolean;
  isFullyPaid: boolean;
  voidReason?: string;
  serviceCatalog?: { name: string; code: string };
  wardChargeRecord?: { ward?: { wardName?: string } | null } | null;
  /** Original bill-line IDs represented by a grouped ward-accommodation row. */
  sourceItemIds?: string[];
}

interface BillRefund {
  id: string;
  refundNumber: string;
  amount: number;
  refundMethod: string;
  reference?: string | null;
  reason: string;
  refundedAt: string;
  paymentId?: string | null;
  processedBy?: { id?: string; fullName?: string; username?: string } | null;
}

interface BillPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  transactionDate: string;
  reference?: string | null;
  notes?: string | null;
  isVoided?: boolean;
  refunds?: BillRefund[];
}

interface ProcessedBill {
  id: string;
  billNumber: string;
  billDate: string;
  status: string;
  paymentMode: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  insuranceCovered: number;
  patientPayable: number;
  createdAt?: string;
  updatedAt?: string;
  BillLineItem: BillLineItem[];
  Patient?: {
    id: string;
    surname: string;
    otherNames: string;
    folderNumber: string;
    contact: string;
    address: string;
  };
  Attendance?: {
    id: string;
    attendanceNumber: string;
    attendanceType: string;
    dateTime: string;
  };
  InsuranceProvider?: { id: string; name: string; type?: string; coveragePercentage: number };
  /** Prisma relation names as the API returns them. */
  Payment?: BillPayment[];
  Refund?: BillRefund[];
  /** Kept for older serialized bills. */
  payments?: BillPayment[];
  refunds?: BillRefund[];
}

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const refundedOn = (payment: BillPayment) =>
  roundMoney((payment.refunds || []).reduce((sum, refund) => sum + Number(refund.amount || 0), 0));
/** Never negative: several partial refunds may exhaust a payment. */
const refundableOn = (payment: BillPayment) => Math.max(0, roundMoney(Number(payment.amount) - refundedOn(payment)));

const getGroupedBillItems = (bill: ProcessedBill): Record<string, BillLineItem[]> => {
  const groups: Record<string, BillLineItem[]> = {
    Consultation: [], 'Laboratory Tests': [], 'Scans & Imaging': [],
    Medications: [], Procedures: [], 'Ward & Accommodation': [], 'Other Services': [],
  };
  const categoryMap: Record<string, string> = {
    consultation: 'Consultation', lab_test: 'Laboratory Tests', scan: 'Scans & Imaging',
    medication: 'Medications', procedure: 'Procedures', ward: 'Ward & Accommodation',
  };
  (bill.BillLineItem || []).forEach((item) => {
    if (!item.isVoided) {
      const key = categoryMap[item.serviceType?.toLowerCase()] ?? 'Other Services';
      groups[key].push(item);
    }
  });
  const wardGroups = new Map<string, BillLineItem[]>();
  for (const item of groups['Ward & Accommodation']) {
    const wardName = item.wardChargeRecord?.ward?.wardName?.trim();
    const isLegacyIdLabel = /^ward accommodation\s*\(/i.test(item.description || '');
    const displayDescription = wardName ? `Ward accommodation – ${wardName}`
      : isLegacyIdLabel ? 'Ward accommodation' : item.description;
    const groupingIdentity = wardName || item.description;
    const key = `${groupingIdentity}::${Number(item.unitPrice).toFixed(2)}`;
    const current = wardGroups.get(key) || [];
    current.push({ ...item, description: displayDescription });
    wardGroups.set(key, current);
  }
  groups['Ward & Accommodation'] = Array.from(wardGroups.values()).map((rows) => {
    if (rows.length === 1) return rows[0];
    const first = rows[0];
    return {
      ...first,
      id: `ward-group:${rows.map((row) => row.id).join(':')}`,
      sourceItemIds: rows.filter((row) => !row.isFullyPaid && Number(row.patientPayableAmount || 0) > 0).map((row) => row.id),
      quantity: rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
      lineTotal: rows.reduce((sum, row) => sum + Number(row.lineTotal || 0), 0),
      vatAmount: rows.reduce((sum, row) => sum + Number(row.vatAmount || 0), 0),
      insuranceCoveredAmount: rows.reduce((sum, row) => sum + Number(row.insuranceCoveredAmount || 0), 0),
      patientPayableAmount: rows.reduce((sum, row) => sum + Number(row.patientPayableAmount || 0), 0),
      paidAmount: rows.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0),
      balance: rows.reduce((sum, row) => sum + Number(row.balance || 0), 0),
      isFullyPaid: rows.every((row) => row.isFullyPaid || Number(row.balance || 0) <= 0),
    };
  });
  Object.keys(groups).forEach((key) => { if (!groups[key].length) delete groups[key]; });
  return groups;
};

const getBillRefundHistory = (bill: ProcessedBill): BillRefund[] => {
  const direct = bill.Refund ?? bill.refunds ?? [];
  const nested = (bill.Payment ?? bill.payments ?? []).flatMap((payment) => payment.refunds || []);
  const seen = new Set<string>();
  return [...direct, ...nested].filter((refund) => {
    const identity = refund.id || `${refund.refundNumber}:${refund.amount}:${refund.refundedAt}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  }).sort((a, b) => new Date(b.refundedAt).getTime() - new Date(a.refundedAt).getTime());
};

const paymentAttemptStorageKey = (billId: string) => `veridian:payment-attempt:${billId}`;
const getOrCreatePaymentAttemptKey = (billId: string) => {
  try {
    const storageKey = paymentAttemptStorageKey(billId);
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const key = uuid();
    sessionStorage.setItem(storageKey, key);
    return key;
  } catch {
    return uuid();
  }
};
const rotatePaymentAttemptKey = (billId: string) => {
  const key = uuid();
  try { sessionStorage.setItem(paymentAttemptStorageKey(billId), key); } catch { /* in-memory retry key remains */ }
  return key;
};

export default function PatientBillingItems() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const goBack = useSmartBack('/dashboard/billing');
  const { success, error: toastError } = useToast();
  const { hasRole, user } = useAuthStore();
  const { hospital } = useHospitalStore();
  const canViewPatientProfile = canAccessPage(user?.role, 'patients');

  // ===== Local UI state =====
  const [selectedBill, setSelectedBill] = useState<ProcessedBill | null>(null);
  const [billDetailsById, setBillDetailsById] = useState<Record<string, ProcessedBill>>({});
  const [loadingBillIds, setLoadingBillIds] = useState<Set<string>>(new Set());
  const [billLoadErrors, setBillLoadErrors] = useState<Record<string, string>>({});
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [actualPatientId, setActualPatientId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Payment state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [momoPhone, setMomoPhone] = useState('');

  // Refund state: the payment being refunded, if the dialog is open.
  const [refundTarget, setRefundTarget] = useState<BillPayment | null>(null);

  // Add-service state
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [addingServices, setAddingServices] = useState(false);

  // ===== Store slices =====
  const bills = useBillingStore((s) => s.bills);
  const isLoading = useBillingStore((s) => s.isLoading);
  const getBills = useBillingStore((s) => s.getBills);
  const currentBill = useBillingStore((s) => s.currentBill);
  const getBill = useBillingStore((s) => s.getBill);
  const clearCurrentBill = useBillingStore((s) => s.clearCurrentBill);
  const addPaymentToBill = useBillingStore((s) => s.addPaymentToBill);
  const refundBillPayment = useBillingStore((s) => s.refundBillPayment);
  const generateBillFromAttendance = useBillingStore((s) => s.generateBillFromAttendance);

  const serviceCatalog = useMedicalServicesStore((s) => s.serviceCatalog);
  const getServiceCatalog = useMedicalServicesStore((s) => s.getServiceCatalog);
  const servicesLoading = useMedicalServicesStore((s) => s.isLoading);

  const patients = usePatientStore((s) => s.patients);
  const loadPatients = usePatientStore((s) => s.loadPatients);
  const currentPatient = usePatientStore((s) => s.currentPatient);
  const fetchPatient = usePatientStore((s) => s.fetchPatient);

  const getAttendance = useAttendanceStore((s) => s.getAttendance);
  const attendances = useAttendanceStore((s) => s.attendances);
  const getAttendances = useAttendanceStore((s) => s.getAttendances);

  const canMakePayment = hasRole(['admin', 'accounts']);
  // Money leaving the till is a finance action; records may take payments but not refund them.
  const canRefund = hasRole(['admin', 'accounts']);
  const isCashPayment = selectedBill?.paymentMode === 'cash';

  const loadedForPatientRef = useRef<string | null>(null);
  const autoOpenedBillRef = useRef<string | null>(null);
  // Prevent a slow response for the previous visit from replacing the newly selected visit.
  const selectedAttendanceIdRef = useRef(selectedAttendanceId);
  selectedAttendanceIdRef.current = selectedAttendanceId;
  const billDetailsInFlightRef = useRef(new Set<string>());

  // ===== Helpers =====
  const formatCurrency = useCallback(
    (amount: number) => `₵${amount?.toFixed(2) ?? '0.00'}`,
    []
  );

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Invalid Date'; }
  }, []);

  const getPaymentModeLabel = useCallback(
    (mode: string) =>
      ({ cash: 'Cash', nhis: 'NHIS', private_insurance: 'Private Insurance' }[mode] ?? 'Cash'),
    []
  );

  const getCategoryIcon = useCallback((category: string) => {
    const icons: Record<string, JSX.Element> = {
      Consultation: <Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />,
      'Laboratory Tests': <Microscope className="w-4 h-4 text-[var(--icon-purple-text)]" />,
      'Scans & Imaging': <Scan className="w-4 h-4 text-[var(--icon-yellow-text)]" />,
      Medications: <Pill className="w-4 h-4 text-[var(--icon-green-text)]" />,
      Procedures: <Syringe className="w-4 h-4 text-[var(--icon-red-text)]" />,
      'Ward & Accommodation': <Hospital className="w-4 h-4 text-[var(--icon-orange-text)]" />,
    };
    return icons[category] ?? <ClipboardList className="w-4 h-4 text-[var(--text-secondary)]" />;
  }, []);

  // ===== Load data =====
  const loadData = useCallback(
    async (force = false) => {
      if (!patientId) return;
      if (!force && (dataLoaded || isResolving)) return;

      setIsResolving(true);
      try {
        let resolvedId: string | null = patientId;
        try {
          const direct = await fetchPatient(patientId);
          if (!direct?.id) resolvedId = null;
        } catch {
          try {
            const attendance = await getAttendance(patientId);
            if (attendance && (attendance as any).patientId) {
              resolvedId = (attendance as any).patientId;
            }
          } catch {}

          if (!resolvedId || resolvedId === patientId) {
            const attendanceFromList = useAttendanceStore
              .getState()
              .attendances.find((a) => a.id === patientId);
            if (attendanceFromList && attendanceFromList.patientId) {
              resolvedId = attendanceFromList.patientId;
            }
          }
          if (resolvedId) void fetchPatient(resolvedId).catch(() => undefined);
        }
        if (!resolvedId) resolvedId = patientId;

        setActualPatientId(resolvedId);

        const cacheBuster = Date.now();
        await Promise.all([
          getBills({ patientId: resolvedId, _t: cacheBuster }),
          getAttendances({ patientId: resolvedId }),
        ]);

        void getServiceCatalog({ isActive: true, limit: 1000, _t: cacheBuster }).catch(() => undefined);
        void loadPatients().catch(() => undefined);

        const freshBills = useBillingStore.getState().bills.filter((bill: any) => bill.patientId === resolvedId);
        const requestedBillId = new URLSearchParams(window.location.search).get('billId');
        const requestedBill = requestedBillId ? freshBills.find((bill: any) => bill.id === requestedBillId) : null;
        const freshAttendances = useAttendanceStore.getState().attendances
          .filter((attendance: any) => attendance.patientId === resolvedId)
          .sort((a: any, b: any) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime());
        const requestedAttendanceId = (requestedBill as any)?.attendanceId || (requestedBill as any)?.Attendance?.id;
        setSelectedPatientId(resolvedId || '');
        setSelectedAttendanceId(
          requestedAttendanceId && freshAttendances.some((a: any) => a.id === requestedAttendanceId)
            ? requestedAttendanceId
            : (freshAttendances[0]?.id || '')
        );

        setDataLoaded(true);
      } catch (err: any) {
        console.error('❌ Error loading patient billing:', err);
        toastError('Error', err.message || 'Failed to load patient billing');
      } finally {
        setIsResolving(false);
        setIsInitialLoad(false);
      }
    },
    [
      patientId, loadPatients, fetchPatient, getAttendance, getBills,
      getAttendances, getServiceCatalog, toastError, dataLoaded, isResolving,
    ]
  );

  useEffect(() => {
    if (!patientId) return;
    if (loadedForPatientRef.current === patientId) return;
    loadedForPatientRef.current = patientId;
    setBillDetailsById({});
    setBillLoadErrors({});
    setSelectedBill(null);
    setSelectedItems(new Set());
    loadData();
  }, [patientId, loadData]);

  const handleRefresh = useCallback(() => {
    loadedForPatientRef.current = null;
    setDataLoaded(false);
    setIsInitialLoad(true);
    loadData(true);
  }, [loadData]);

  // ===== Patient resolution =====
  const patient = useMemo(() => {
    if (!actualPatientId) return null;
    const fromStore = patients.find((p) => p.id === actualPatientId);
    if (fromStore) return fromStore;
    if (currentPatient?.id === actualPatientId) return currentPatient;
    const billWithPatient = bills.find(
      (b) => b.patientId === actualPatientId && (b as any).Patient?.surname
    );
    return (billWithPatient as any)?.Patient ?? null;
  }, [patients, currentPatient, bills, actualPatientId]);

  // ===== Patient bills =====
  const patientBills = useMemo(() => {
    if (!actualPatientId) return [];
    let filtered = bills.filter((b) => b.patientId === actualPatientId);
    if (selectedAttendanceId) {
      filtered = filtered.filter((bill: any) =>
        String(bill.attendanceId || bill.Attendance?.id || '') === selectedAttendanceId
      );
    } else {
      filtered = [];
    }
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.billNumber?.toLowerCase().includes(lower) ||
          b.status?.toLowerCase().includes(lower)
      );
    }
    return filtered.sort(
      (a, b) => new Date(b.billDate || b.createdAt).getTime() - new Date(a.billDate || a.createdAt).getTime()
    );
  }, [bills, actualPatientId, selectedAttendanceId, searchQuery]);

  const totalPages = Math.ceil(patientBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBills = useMemo(
    () => patientBills.slice(startIndex, startIndex + itemsPerPage),
    [patientBills, startIndex, itemsPerPage]
  );

  const selectedAttendance = useMemo(
    () => attendances.find((attendance: any) => attendance.id === selectedAttendanceId) || null,
    [attendances, selectedAttendanceId]
  );

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedAttendanceId]);

  // ===== Bill detail fetch =====
  const handleViewBillDetails = useCallback(
    async (billId: string) => {
      if (billDetailsInFlightRef.current.has(billId)) return;
      const attendanceAtRequest = selectedAttendanceId;
      billDetailsInFlightRef.current.add(billId);
      setLoadingBillIds((current) => new Set(current).add(billId));
      setBillLoadErrors((current) => { const next = { ...current }; delete next[billId]; return next; });
      try {
        await getBill(billId);
        const loadedBill = useBillingStore.getState().currentBill as ProcessedBill | null;
        if (loadedBill?.id === billId && selectedAttendanceIdRef.current === attendanceAtRequest) {
          setBillDetailsById((current) => ({ ...current, [billId]: loadedBill }));
        }
      } catch (err: any) {
        console.error('Error loading bill details:', err);
        if (selectedAttendanceIdRef.current === attendanceAtRequest) {
          setBillLoadErrors((current) => ({ ...current, [billId]: err?.message || 'Unable to load bill items.' }));
          toastError('Unable to load bill items', err.message || 'Please retry loading this bill.');
        }
      } finally {
        billDetailsInFlightRef.current.delete(billId);
        setLoadingBillIds((current) => { const next = new Set(current); next.delete(billId); return next; });
      }
    },
    [getBill, toastError, selectedAttendanceId]
  );

  // AUTO-EXPAND LOGIC: Fetch all bills in the current paginated view
  useEffect(() => {
    if (!dataLoaded || !selectedAttendanceId || paginatedBills.length === 0) return;
    let cancelled = false;
    const unloadedBills = paginatedBills.filter((bill: any) =>
      !billDetailsById[bill.id]
    );
    const loadAll = async () => {
      for (const bill of unloadedBills) {
        if (cancelled) break;
        await handleViewBillDetails(bill.id);
      }
    };
    void loadAll();
    return () => { cancelled = true; };
  // Keep the attendance and page identity stable; each fetch updates its own keyed cache.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded, selectedAttendanceId, paginatedBills.map((bill) => bill.id).join(',')]);

  useEffect(() => {
    const requestedBillId = new URLSearchParams(window.location.search).get('billId');
    if (!dataLoaded || !requestedBillId || autoOpenedBillRef.current === requestedBillId) return;
    if (!patientBills.some((bill) => bill.id === requestedBillId)) return;
    autoOpenedBillRef.current = requestedBillId;
    // If a specific bill was requested via URL, we ensure its details are fetched
    void handleViewBillDetails(requestedBillId);
  }, [dataLoaded, patientBills, handleViewBillDetails]);

  useEffect(() => {
    if (!currentBill || !patientBills.some((bill) => bill.id === currentBill.id)) return;
    const loadedAttendanceId = String((currentBill as any).attendanceId || currentBill.Attendance?.id || '');
    if (loadedAttendanceId && loadedAttendanceId !== selectedAttendanceId) return;
    setBillDetailsById((current) => ({ ...current, [currentBill.id]: currentBill as ProcessedBill }));
  }, [currentBill, patientBills, selectedAttendanceId]);

  useEffect(() => {
    return () => { clearCurrentBill(); };
  }, [clearCurrentBill]);

  const goToPage = useCallback(
    (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    [totalPages]
  );

  // ===== Grouped items =====
  const selectedItemsTotal = useMemo(() => {
    if (!selectedBill || selectedItems.size === 0) return 0;
    let total = 0;
    selectedBill.BillLineItem?.forEach((item) => {
      if (!item.isVoided && selectedItems.has(item.id) && !item.isFullyPaid)
        total += Number(item.patientPayableAmount || 0) + Number(item.vatAmount || 0);
    });
    return total;
  }, [selectedBill, selectedItems]);

  // ===== Selection helpers =====
  const toggleItemSelection = useCallback((itemIds: string | string[]) => {
    const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
    setSelectedItems((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const selectAllUnpaid = useCallback(() => {
    if (!selectedBill) return;
    const unpaid = (selectedBill.BillLineItem || []).filter(
      (i) => !i.isVoided && !i.isFullyPaid && i.patientPayableAmount > 0
    );
    setSelectedItems(new Set(unpaid.map((i) => i.id)));
    setPaymentAmount(unpaid.reduce((s, i) => s + Number(i.patientPayableAmount || 0) + Number(i.vatAmount || 0), 0));
  }, [selectedBill]);

  const deselectAll = useCallback(() => {
    setSelectedItems(new Set());
    setPaymentAmount(0);
  }, []);

  const toggleCategorySelection = useCallback((items: BillLineItem[]) => {
    const unpaidIds = items
      .filter((item) => !item.isFullyPaid && item.patientPayableAmount > 0)
      .flatMap((item) => item.sourceItemIds || [item.id]);
    if (unpaidIds.length === 0) return;
    setSelectedItems((prev) => {
      const next = new Set(prev);
      const allSelected = unpaidIds.every((id) => next.has(id));
      if (allSelected) unpaidIds.forEach((id) => next.delete(id));
      else unpaidIds.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const handleOpenPaymentModal = useCallback(() => {
    if (selectedItems.size === 0) {
      toastError('No items selected', 'Please select at least one item to pay for');
      return;
    }
    setPaymentAmount(selectedItemsTotal);
    setIsPaymentModalOpen(true);
  }, [selectedItems.size, selectedItemsTotal, toastError]);

  // ===== Add services =====
  const handleAddServices = useCallback(async () => {
    if (!selectedBill || selectedServices.size === 0 || !selectedBill.Attendance?.id) return;
    setAddingServices(true);
    try {
      await addServicesToEncounter(
        selectedBill.Attendance.id,
        [...selectedServices].map((serviceCatalogId) => ({ serviceCatalogId, quantity: 1 }))
      );
      await generateBillFromAttendance(selectedBill.Attendance.id);
      await handleViewBillDetails(selectedBill.id);
      success('Services Added', `${selectedServices.size} service(s) added`);
      setShowAddServiceModal(false);
      setSelectedServices(new Set());
      setServiceSearchTerm('');
    } catch (err: any) {
      toastError('Failed', err.message);
    } finally {
      setAddingServices(false);
    }
  }, [selectedBill, selectedServices, generateBillFromAttendance, handleViewBillDetails, success, toastError]);

  // ===== Receipt =====
  const generateAndShowReceipt = useCallback(async () => {
    if (!selectedBill) return;
    try {
      await getBill(selectedBill.id);
      const freshBill: any = useBillingStore.getState().currentBill;
      if (!freshBill) return;

      const latestPayment = latestRecordedPayment(freshBill);
      if (!latestPayment) {
        toastError('No payment recorded', 'A receipt can only be issued for a recorded, non-voided payment.');
        return;
      }

      printThermalReceipt({
        bill: freshBill,
        patient: freshBill.Patient || patient,
        payment: latestPayment,
        hospital,
        receivedBy: user?.fullName,
        autoPrint: true,
      });
    } catch (err) {
      console.error('Receipt generation error:', err);
    }
  }, [selectedBill, getBill, patient, hospital, user?.fullName, toastError]);

  const handleViewReceipt = useCallback(
    async (billId: string, paymentId?: string) => {
      setIsLoadingItems(true);
      try {
        await getBill(billId);
        const billToReceipt: any = useBillingStore.getState().currentBill;
        if (!billToReceipt || billToReceipt.id !== billId) {
          toastError('Error', 'Could not load the selected bill details');
          return;
        }

        const billPayments: any[] = billToReceipt.Payment ?? billToReceipt.payments ?? [];
        const paymentToPrint = paymentId
          ? billPayments.find((payment) => payment.id === paymentId && !payment.isVoided)
          : latestRecordedPayment(billToReceipt);

        if (!paymentToPrint) {
          toastError(
            paymentId ? 'Payment unavailable' : 'No payment recorded',
            paymentId
              ? 'This payment could not be found on the selected bill or has been voided.'
              : 'A receipt can only be issued for a recorded, non-voided payment.'
          );
          return;
        }

        printThermalReceipt({
          bill: billToReceipt,
          patient: billToReceipt.Patient || patient,
          payment: paymentToPrint,
          hospital,
          receivedBy: user?.fullName,
        });
        success('Receipt opened', 'Receipt is ready to print');
      } catch (err: any) {
        console.error('Receipt generation error:', err);
        toastError('Error', err?.response?.data?.message || 'Could not generate receipt');
      } finally {
        setIsLoadingItems(false);
      }
    },
    [getBill, patient, hospital, user?.fullName, toastError, success]
  );

  // ===== Payment =====
  const handleProcessPayment = useCallback(async () => {
    if (!selectedBill || selectedItems.size === 0) return;
    if (paymentAmount <= 0) {
      toastError('Invalid amount', 'Please enter a valid payment amount');
      return;
    }
    if (paymentAmount > selectedItemsTotal) {
      toastError('Amount too high', `Maximum payment amount is ${formatCurrency(selectedItemsTotal)}`);
      return;
    }

    if (paymentMethod === 'mobile_money' && !momoPhone.trim()) {
      toastError('Mobile number required', 'Enter the Ghana mobile number that should receive the MoMo prompt.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const attemptKey = getOrCreatePaymentAttemptKey(selectedBill.id);

      if (paymentMethod === 'mobile_money') {
        const intent = await initiateMomoPayment({
          billId: selectedBill.id,
          amount: paymentAmount,
          payerPhone: momoPhone.trim(),
          idempotencyKey: attemptKey,
        });
        let finalStatus = intent;
        const waitBudgetMs = 60_000;
        let waited = 0;
        while (waited < waitBudgetMs && finalStatus.status !== 'successful' && finalStatus.status !== 'failed') {
          const step = waited < 30_000 ? 2_000 : 5_000;
          await new Promise(resolve => window.setTimeout(resolve, step));
          waited += step;
          finalStatus = await checkMomoPaymentStatus(intent.id);
        }
        if (finalStatus.status === 'failed') {
          rotatePaymentAttemptKey(selectedBill.id);
          throw new Error(finalStatus.failureReason || 'The Mobile Money transaction was declined or failed.');
        }
        if (finalStatus.status !== 'successful') {
          throw new Error('The Mobile Money request is still pending. Verify the payer’s phone and check the status before attempting another collection. Do not record a separate manual payment.');
        }
        if (!finalStatus.paymentId) {
          throw new Error('MoMo confirmed success, but the HMS payment record is not available yet. Recheck this same attempt; do not collect again.');
        }
      } else {
        await addPaymentToBill(selectedBill.id, {
          amount: paymentAmount,
          paymentMethod,
          reference: paymentReference.trim() || undefined,
          notes: paymentNotes || `Payment for selected items (${selectedItems.size} items)`,
          idempotencyKey: attemptKey,
        });
      }

      // Rotate only after confirmed success; ambiguous network failures keep the same key.
      rotatePaymentAttemptKey(selectedBill.id);
      setIsPaymentModalOpen(false);
      setSelectedItems(new Set());
      setPaymentAmount(0);
      setPaymentReference('');
      setPaymentNotes('');
      setMomoPhone('');
      setPaymentMethod('cash');

      await getBills({ patientId: actualPatientId, _t: Date.now() });
      await handleViewBillDetails(selectedBill.id);

      success('Payment Successful', `Payment of ${formatCurrency(paymentAmount)} has been processed`);
      await generateAndShowReceipt();
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Failed to process payment';
      if (paymentMethod === 'mobile_money' && /pending|status|verify|outcome is unknown|not available yet|not confirmed/i.test(message)) {
        toastError('Mobile Money status not confirmed', `${message} Do not collect a second payment until this attempt is verified.`);
      } else {
        toastError('Payment Failed', message);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  }, [
    selectedBill, selectedItems.size, paymentAmount, selectedItemsTotal,
    paymentMethod, paymentReference, paymentNotes, momoPhone, formatCurrency,
    addPaymentToBill, getBills, actualPatientId, handleViewBillDetails,
    success, toastError, generateAndShowReceipt,
  ]);

  // ===== Refund =====
  const handleOpenRefundModal = useCallback((payment: BillPayment) => {
    if (refundableOn(payment) <= 0) {
      toastError('Nothing to refund', 'This payment has already been fully refunded.');
      return;
    }
    setRefundTarget(payment);
  }, [toastError]);

  const handleProcessRefund = useCallback(async (data: RefundSubmission) => {
    if (!selectedBill) return;
    await refundBillPayment(selectedBill.id, data);
    const refreshedBill = useBillingStore.getState().currentBill as ProcessedBill | null;
    if (refreshedBill?.id === selectedBill.id) {
      setSelectedBill(refreshedBill);
      setBillDetailsById((current) => ({ ...current, [refreshedBill.id]: refreshedBill }));
    }
    await getBills({ patientId: actualPatientId } as any);
    setRefundTarget(null);
    success('Refund processed', `${formatCurrency(data.amount)} has been refunded`);
  }, [
    selectedBill, formatCurrency, refundBillPayment, getBills, actualPatientId, success,
  ]);

  // ===== Service search =====
  const filteredServices = useMemo(() => {
    if (!serviceSearchTerm) return serviceCatalog;
    const lower = serviceSearchTerm.toLowerCase();
    return serviceCatalog.filter(
      (s) => s.name.toLowerCase().includes(lower) || s.code.toLowerCase().includes(lower)
    );
  }, [serviceCatalog, serviceSearchTerm]);

  // ===== Derived: paid % and totals for the strip =====
  const stripTotals = useMemo(() => {
    const totalAmount = patientBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const totalPaid = patientBills.reduce((s, b) => s + (b.paidAmount || 0), 0);
    const outstanding = patientBills.reduce((s, b) => s + (b.balance || 0), 0);
    const paidPct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
    return { totalAmount, totalPaid, outstanding, paidPct };
  }, [patientBills]);

  // ===== Page header =====
  const pageHeader = (
    <PageHeader
      title="Patient Billing Items"
      subtitle={`View and manage all billable items for ${getPatientName(patient)}`}
      meta={`${patientBills.length} bill(s) for the selected visit${selectedAttendance?.attendanceNumber ? ` (${selectedAttendance.attendanceNumber})` : ''}${selectedAttendance?.dateTime ? ` · ${formatDate(selectedAttendance.dateTime)}` : ''} · Folder: ${patient?.folderNumber}`}
      icon={DollarSign}
      accent="yellow"
      onBack={goBack}
      actions={<Button icon={RefreshCw} onClick={handleRefresh}>Refresh</Button>}
    />
  );

  // ===== Loading =====
  if (isInitialLoad && (isLoading || isResolving)) {
    return (
      <div className="space-y-6 p-6">
        {pageHeader}
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--icon-cyan-text)]" />
          <p className="text-[var(--text-secondary)]">Loading patient billing data...</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--bg-main)] rounded w-48" />
                  <div className="h-3 bg-[var(--bg-main)] rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===== Patient not found =====
  const hasLoadedPatientRecords =
    bills.some((bill) => bill.patientId === actualPatientId) ||
    attendances.some((attendance: any) => attendance.patientId === actualPatientId);

  if (dataLoaded && !isResolving && !isLoading && !patient && actualPatientId && !hasLoadedPatientRecords) {
    return (
      <div className="p-6">
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h3>
          <p className="text-[var(--text-secondary)] mb-4">Could not find patient with ID: {patientId}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="soft" accent="cyan" icon={ArrowLeft} onClick={goBack}>
              {routerLocation.key === 'default' ? 'Back to Billing' : 'Back'}
            </Button>
            <Button variant="secondary" icon={RefreshCw} onClick={handleRefresh}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5 p-4 sm:p-6', canMakePayment && selectedItems.size > 0 && 'pb-28')}>
      {pageHeader}

      {/* ── Patient / attendance band ───────────────────────────────── */}
      <div className="relative z-30 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        {patient && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] rounded-t-xl">
            <div className="flex items-start gap-3 min-w-0">
              <PatientAvatar patient={patient} size="sm" />
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)] truncate">{getPatientName(patient)}</p>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  Folder {patient.folderNumber}
                  {patient.contact ? ` · ${patient.contact}` : ''}
                </p>
              </div>
            </div>
            {canViewPatientProfile && (
              <LinkButton to={`/dashboard/patients/${patient.id}`} variant="secondary" icon={Eye}>
                View profile
              </LinkButton>
            )}
          </div>
        )}

        <div className="p-4">
          <PatientAttendanceSelector
            patients={patient ? [patient, ...patients.filter((p: any) => p.id !== patient.id)] : patients}
            attendances={attendances}
            selectedPatientId={selectedPatientId}
            selectedAttendanceId={selectedAttendanceId}
            onPatientSelect={(nextPatientId) => {
              if (nextPatientId && nextPatientId !== actualPatientId) {
                loadedForPatientRef.current = null;
                setDataLoaded(false);
                setIsInitialLoad(true);
                setSelectedPatientId(nextPatientId);
                setSelectedAttendanceId('');
                navigate(`/dashboard/patients/${nextPatientId}/billing`);
                return;
              }
              setSelectedPatientId(nextPatientId);
              setSelectedAttendanceId('');
              if (nextPatientId) getAttendances({ patientId: nextPatientId }).catch((err: any) => toastError('Attendances unavailable', err.message));
            }}
            onAttendanceSelect={(attendanceId) => {
              // Invalidate any in-flight detail request from the previously selected visit.
              setIsLoadingItems(false);
              setBillDetailsById({});
              setBillLoadErrors({});
              setSelectedBill(null);
              setSelectedAttendanceId(attendanceId);
              setSelectedBill(null);
              setSelectedItems(new Set());
              clearCurrentBill();
            }}
            onClearSelection={() => {
              setSelectedPatientId('');
              setSelectedAttendanceId('');
              setSelectedBill(null);
              setSelectedItems(new Set());
              setBillDetailsById({});
              setBillLoadErrors({});
              setSelectedBill(null);
            }}
          />
          {!selectedAttendanceId && (
            <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                 Select a visit above to see that visit's bills only.
            </p>
          )}
        </div>
      </div>

      {/* ── Summary strip ───────────────────────────────────────────── */}
      {patientBills.length > 0 && (
        <div className="relative z-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-color)]">
            {/* Outstanding — visually primary */}
            <div className="px-5 py-4 flex items-start gap-3">
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                stripTotals.outstanding > 0 ? 'bg-[var(--icon-red-bg)]' : 'bg-[var(--icon-green-bg)]'
              )}>
                <TrendingUp className={cn(
                  'w-4 h-4',
                  stripTotals.outstanding > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'
                )} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Outstanding
                </p>
                <p className={cn(
                  'mt-1 text-xl font-bold leading-tight tabular-nums',
                  stripTotals.outstanding > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'
                )}>
                  {formatCurrency(stripTotals.outstanding)}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  {patientBills.length} bill{patientBills.length !== 1 ? 's' : ''} · {stripTotals.paidPct}% settled
                </p>
              </div>
            </div>

            {/* Total billed with progress */}
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Total Billed
                </p>
                <p className="mt-1 text-xl font-bold leading-tight text-[var(--text-primary)] tabular-nums">
                  {formatCurrency(stripTotals.totalAmount)}
                </p>
                <div className="mt-1.5 h-1 rounded-full bg-[var(--bg-main)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--icon-green-text)] transition-all"
                    style={{ width: `${Math.min(100, stripTotals.paidPct)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Total paid */}
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--icon-green-bg)] flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 text-[var(--icon-green-text)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Total Paid
                </p>
                <p className="mt-1 text-xl font-bold leading-tight text-[var(--icon-green-text)] tabular-nums">
                  {formatCurrency(stripTotals.totalPaid)}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  Authoritative for this visit
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Search + visit context row ──────────────────────────────── */}
      <div className="relative z-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {patientBills.length} bill{patientBills.length !== 1 ? 's' : ''}
              {selectedAttendance?.attendanceNumber && (
                <span className="ml-1 font-normal text-[var(--text-secondary)]">
                  · visit {selectedAttendance.attendanceNumber}
                </span>
              )}
            </p>
            {selectedAttendance?.dateTime && (
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                {formatDate(selectedAttendance.dateTime)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SearchInput
              className="w-full sm:w-72"
              value={searchQuery}
              onChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
              placeholder="Search by bill number or status…"
            />
            <select
              aria-label="Rows per page"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className={cn(SELECT, 'w-auto flex-shrink-0')}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Bills list ──────────────────────────────────────────────── */}
      {patientBills.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center shadow-sm">
          <Receipt className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
            {searchQuery
              ? 'No bills match your search'
              : !selectedAttendanceId
                ? 'Select a visit'
                : 'No billing records for this visit'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            {searchQuery
              ? 'Try a different bill number or status.'
              : !selectedAttendanceId
                ? 'Choose the current or a previous attendance above to see its bills.'
                : 'This attendance has no associated bills yet.'}
          </p>
          {searchQuery && (
            <Button variant="secondary" className="mt-4" icon={X} onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedBills.map((bill) => {
              const billDetails = billDetailsById[bill.id]
                ?? ((bill as any).BillLineItem?.length > 0 ? bill as ProcessedBill : null);
              const isLoadingThis = loadingBillIds.has(bill.id);
              const groupedItems = billDetails ? getGroupedBillItems(billDetails) : {};
              const billItems = billDetails?.BillLineItem?.filter((item) => !item.isVoided) || [];
              const lineSubtotal = billItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
              const taxAmount = Number(billDetails?.taxAmount || 0);
              const totals = billDetails ? {
                subtotal: lineSubtotal,
                taxAmount,
                insuranceCovered: billItems.reduce((sum, item) => sum + Number(item.insuranceCoveredAmount || 0), 0),
                patientPayable: Number(billDetails.patientPayable ?? (lineSubtotal + taxAmount)),
                totalPaid: Number(billDetails.paidAmount || 0),
                balance: Number(billDetails.balance || 0),
              } : null;
              const isCashPayment = billDetails?.paymentMode === 'cash';
              const paymentsForBill = (billDetails?.Payment ?? billDetails?.payments ?? []).filter((payment) => !payment.isVoided);
              const billRefunds = billDetails ? getBillRefundHistory(billDetails) : [];
              const totalRefunded = billRefunds.reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
              const totalCollected = paymentsForBill.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
              const netCollected = Math.max(0, roundMoney(totalCollected - totalRefunded));

              return (
                <div key={bill.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
                  {/* Bill header row — now static, no toggle */}
                  <div className="p-4 bg-[var(--bg-main)]">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                          <Receipt className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[var(--text-primary)]">{bill.billNumber}</p>
                            <Badge tone={statusTone(bill.status)} dot size="sm">
                              {humanStatus(bill.status)}
                            </Badge>
                            {(bill.status === 'paid' || bill.status === 'partial') && (
                              <button
                                className="p-1 rounded text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-colors ml-1"
                                aria-label="View Receipt"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReceipt(bill.id);
                                }}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)] flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(bill.billDate || bill.createdAt)}
                            </span>
                            {bill.Attendance?.attendanceNumber && (
                              <span className="flex items-center gap-1" title="Visit / attendance">
                                <ClipboardList className="w-3 h-3" />
                                Visit {bill.Attendance.attendanceNumber}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {getPaymentModeLabel(bill.paymentMode)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-tertiary)]">Billed</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                            {formatCurrency(bill.totalAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-tertiary)]">Balance</p>
                          <p className={cn(
                            'text-sm font-bold tabular-nums',
                            bill.balance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'
                          )}>
                            {formatCurrency(bill.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded body — always open */}
                  <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                    {isLoadingThis ? (
                      <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : billDetails ? (
                      <div className="p-4 sm:p-5">
                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                              Line Items
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-tertiary)] tabular-nums">
                              {billDetails.BillLineItem?.filter((i) => !i.isVoided).length || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {canMakePayment && billDetails.status !== 'paid' && billDetails.Attendance?.id && (
                              <Button variant="soft" accent="green" size="sm" icon={PlusCircle} onClick={() => { setSelectedBill(billDetails); setShowAddServiceModal(true); }}>
                                Add charge
                              </Button>
                            )}
                            {(billDetails.status === 'paid' || billDetails.status === 'partial') && (
                              <Button variant="secondary" size="sm" icon={Printer} onClick={() => handleViewReceipt(billDetails.id)}>
                                Print Receipt
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Zero-value warning */}
                        {Object.entries(groupedItems).length === 0 && Number(billDetails.totalAmount || 0) === 0 && (
                          <div className="mb-4 rounded-lg border border-[var(--border-color)] bg-[var(--icon-yellow-bg)] p-4 text-sm text-[var(--icon-yellow-text)]">
                            <p className="font-semibold">No itemised charges recorded</p>
                            <p className="mt-1">This zero-value bill has no active line items. Review the attendance and clinical records before taking any billing action.</p>
                          </div>
                        )}

                        {/* Category tables */}
                        <div className="space-y-4">
                          {Object.entries(groupedItems).map(([category, items]) => {
                            const unpaidItems = items.filter((i) => !i.isFullyPaid && i.patientPayableAmount > 0);
                            const allSelected = unpaidItems.length > 0 && unpaidItems.every((i) => (i.sourceItemIds || [i.id]).every((id) => selectedItems.has(id)));

                            return (
                              <div key={category} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                                {/* Category header */}
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                                  {getCategoryIcon(category)}
                                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">{category}</h3>
                                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] tabular-nums">
                                    {items.length}
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                                        <th className="w-10 px-3 py-2 text-center">
                                          {unpaidItems.length > 0 && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setSelectedBill(billDetails); if (selectedBill?.id !== billDetails.id) setSelectedItems(new Set()); toggleCategorySelection(items); }}
                                              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                              aria-label={allSelected ? 'Deselect all unpaid' : 'Select all unpaid'}
                                            >
                                              {allSelected
                                                ? <CheckSquare className="w-4 h-4 text-[var(--icon-green-text)]" />
                                                : <Square className="w-4 h-4" />}
                                            </button>
                                          )}
                                        </th>
                                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Service</th>
                                        <th className="w-16 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Qty</th>
                                        <th className="w-28 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Unit Price</th>
                                        <th className="w-28 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Total</th>
                                        {!isCashPayment && (
                                          <>
                                            <th className="w-28 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Insurance</th>
                                            <th className="w-28 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Patient Pays</th>
                                          </>
                                        )}
                                        <th className="w-28 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Paid</th>
                                        <th className="w-28 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Balance</th>
                                        <th className="w-24 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)]">
                                      {items.map((item) => {
                                        const isFullyPaid = item.isFullyPaid || item.balance === 0;
                                        const displayBalance = Number(item.balance || 0);
                                        const itemIds = item.sourceItemIds || [item.id];
                                        const itemSelected = itemIds.every((id) => selectedItems.has(id));
                                        return (
                                          <tr key={item.id} className="hover:bg-[var(--bg-main)]/50 transition-colors">
                                            <td className="px-3 py-3 text-center">
                                              {isFullyPaid ? (
                                                <CheckCircle className="w-4 h-4 text-[var(--icon-green-text)] mx-auto" />
                                              ) : item.patientPayableAmount > 0 && canMakePayment ? (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setSelectedBill(billDetails); if (selectedBill?.id !== billDetails.id) setSelectedItems(new Set()); toggleItemSelection(itemIds); }}
                                                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mx-auto block transition-colors"
                                                  aria-label={itemSelected ? 'Deselect accommodation' : 'Select accommodation'}
                                                >
                                                  {itemSelected
                                                    ? <CheckSquare className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                                                    : <Square className="w-4 h-4" />}
                                                </button>
                                              ) : null}
                                            </td>
                                            <td className="px-3 py-3">
                                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                                {item.description}
                                              </p>
                                              {Number(item.vatAmount || 0) > 0 && (
                                                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                                                  incl. {formatCurrency(item.vatAmount)} VAT &amp; levies
                                                </p>
                                              )}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-[var(--text-secondary)] tabular-nums">{item.quantity}</td>
                                            <td className="px-3 py-3 text-right text-sm text-[var(--text-secondary)] tabular-nums">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-3 py-3 text-right text-sm font-medium text-[var(--text-primary)] tabular-nums">{formatCurrency(item.lineTotal)}</td>
                                            {!isCashPayment && (
                                              <>
                                                <td className="px-3 py-3 text-right text-sm text-[var(--icon-green-text)] tabular-nums">{formatCurrency(item.insuranceCoveredAmount)}</td>
                                                <td className="px-3 py-3 text-right text-sm font-medium text-[var(--text-primary)] tabular-nums">{formatCurrency(item.patientPayableAmount)}</td>
                                              </>
                                            )}
                                            <td className="px-3 py-3 text-right text-sm text-[var(--icon-green-text)] tabular-nums">{formatCurrency(item.paidAmount || 0)}</td>
                                            <td className={cn(
                                              'px-3 py-3 text-right text-sm font-bold tabular-nums',
                                              displayBalance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'
                                            )}>
                                              {formatCurrency(displayBalance)}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                              <Badge tone={isFullyPaid ? 'green' : 'red'} dot size="sm">
                                                {isFullyPaid ? 'Paid' : 'Pending'}
                                              </Badge>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-[var(--bg-main)] border-t-2 border-[var(--border-color)]">
                                        <td />
                                        <td colSpan={!isCashPayment ? 5 : 3} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                                          Category Total
                                        </td>
                                        {!isCashPayment && (
                                          <>
                                            <td className="px-3 py-2.5 text-right text-sm font-bold text-[var(--icon-green-text)] tabular-nums">
                                              {formatCurrency(items.reduce((s, i) => s + i.insuranceCoveredAmount, 0))}
                                            </td>
                                            <td className="px-3 py-2.5 text-right text-sm font-bold text-[var(--text-primary)] tabular-nums">
                                              {formatCurrency(items.reduce((s, i) => s + i.patientPayableAmount, 0))}
                                            </td>
                                          </>
                                        )}
                                        <td className="px-3 py-2.5 text-right text-sm font-bold text-[var(--icon-green-text)] tabular-nums">
                                          {formatCurrency(items.reduce((s, i) => s + (i.paidAmount || 0), 0))}
                                        </td>
                                        <td className={cn(
                                          'px-3 py-2.5 text-right text-sm font-bold tabular-nums',
                                          items.reduce((s, i) => s + Number(i.balance || 0), 0) > 0
                                            ? 'text-[var(--icon-red-text)]'
                                            : 'text-[var(--icon-green-text)]'
                                        )}>
                                          {formatCurrency(items.reduce((s, i) => s + Number(i.balance || 0), 0))}
                                        </td>
                                        <td />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* 4-up summary bar */}
                        {totals && (
                          <div className="mt-5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                            {totals.taxAmount > 0 && (
                              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] text-sm">
                                <span className="text-[var(--text-secondary)]">VAT &amp; levies on patient share</span>
                                <span className="font-semibold text-[var(--text-primary)] tabular-nums">{formatCurrency(totals.taxAmount)}</span>
                              </div>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border-color)] text-sm">
                              <div className="p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Subtotal{totals.taxAmount > 0 ? ' (excl. tax)' : ''}</p>
                                <p className="mt-0.5 font-semibold text-[var(--text-primary)] tabular-nums">{formatCurrency(totals.subtotal)}</p>
                              </div>
                              {!isCashPayment && (
                                <div className="p-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Insurance covered</p>
                                  <p className="mt-0.5 font-semibold text-[var(--icon-green-text)] tabular-nums">– {formatCurrency(totals.insuranceCovered)}</p>
                                </div>
                              )}
                              <div className="p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Patient payable</p>
                                <p className="mt-0.5 font-semibold text-[var(--text-primary)] tabular-nums">{formatCurrency(totals.patientPayable)}</p>
                              </div>
                              <div className={cn(
                                'p-3',
                                totals.balance > 0 ? 'bg-[var(--icon-red-bg)]/30' : 'bg-[var(--icon-green-bg)]/30'
                              )}>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Balance due</p>
                                <p className={cn(
                                  'mt-0.5 font-bold tabular-nums',
                                  totals.balance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'
                                )}>
                                  {formatCurrency(totals.balance)}
                                </p>
                              </div>
                            </div>
                            {!isCashPayment && billDetails.InsuranceProvider && (
                              <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border-color)] text-[11px] text-[var(--text-secondary)]">
                                <Shield className="w-3 h-3 text-[var(--icon-cyan-text)] flex-shrink-0" />
                                <span>
                                  <span className="font-medium text-[var(--text-primary)]">{billDetails.InsuranceProvider.name}</span>
                                  {billDetails.InsuranceProvider.type !== 'nhis' && (
                                    <>
                                      {' · '}
                                      {billDetails.InsuranceProvider.coveragePercentage}% coverage
                                    </>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Payments & refunds */}
                        {(paymentsForBill.length > 0 || billRefunds.length > 0) && (
                          <div className="mt-5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                              <Wallet className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Payments &amp; refunds</h3>
                              <span className="px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] tabular-nums">
                                {paymentsForBill.length}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Date</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Method</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Reference</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Paid</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Refunded</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Refundable</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Receipt</th>
                                    {canRefund && <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Action</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {paymentsForBill.map((payment) => {
                                    const linkedRefundTotal = billRefunds
                                      .filter((refund) => refund.paymentId === payment.id)
                                      .reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
                                    const refunded = roundMoney(linkedRefundTotal || refundedOn(payment));
                                    const refundable = Math.max(0, roundMoney(Number(payment.amount) - refunded));
                                    return (
                                      <tr key={payment.id} className="border-b border-[var(--border-color)] last:border-b-0">
                                        <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">{formatDate(payment.transactionDate)}</td>
                                        <td className="px-3 py-2 capitalize text-[var(--text-primary)]">{payment.paymentMethod.replace(/_/g, ' ')}</td>
                                        <td className="px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">{payment.reference || '—'}</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--text-primary)]">{formatCurrency(Number(payment.amount))}</td>
                                        <td className={cn('px-3 py-2 text-right tabular-nums', refunded > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-tertiary)]')}>
                                          {refunded > 0 ? `-${formatCurrency(refunded)}` : '—'}
                                        </td>
                                        <td className={cn('px-3 py-2 text-right tabular-nums', refundable > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]')}>
                                          {formatCurrency(refundable)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            icon={Printer}
                                            disabled={isLoadingItems}
                                            onClick={() => handleViewReceipt(billDetails.id, payment.id)}
                                          >
                                            Print
                                          </Button>
                                        </td>
                                        {canRefund && (
                                          <td className="px-3 py-2 text-right">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              icon={Undo2}
                                              disabled={refundable <= 0}
                                              onClick={() => { setSelectedBill(billDetails); handleOpenRefundModal(payment); }}
                                            >
                                              Refund
                                            </Button>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Collected</p>
                                <p className="mt-1 text-sm font-bold tabular-nums text-[var(--text-primary)]">{formatCurrency(totalCollected)}</p>
                              </div>
                              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Refunded</p>
                                <p className="mt-1 text-sm font-bold tabular-nums text-[var(--icon-red-text)]">−{formatCurrency(totalRefunded)}</p>
                              </div>
                              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Net retained</p>
                                <p className="mt-1 text-sm font-bold tabular-nums text-[var(--icon-green-text)]">{formatCurrency(netCollected)}</p>
                              </div>
                            </div>
                            {billRefunds.length > 0 && (
                              <div className="border-t border-[var(--border-color)]">
                                <div className="flex items-center justify-between gap-3 px-4 py-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">Refund history</p>
                                    <p className="text-[11px] text-[var(--text-secondary)]">{billRefunds.length} refund transaction{billRefunds.length === 1 ? '' : 's'} recorded</p>
                                  </div>
                                  <span className="text-sm font-bold tabular-nums text-[var(--icon-red-text)]">−{formatCurrency(totalRefunded)}</span>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 p-3 pt-0">
                                  {billRefunds.map((refund) => (
                                    <div key={refund.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-[var(--text-primary)]">{refund.refundNumber || 'Refund'}</p>
                                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{refund.reason}</p>
                                        </div>
                                        <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--icon-red-text)]">−{formatCurrency(Number(refund.amount))}</span>
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-tertiary)]">
                                        <span>{formatDate(refund.refundedAt)}</span>
                                        <span className="capitalize">{refund.refundMethod.replace(/_/g, ' ')}</span>
                                        {refund.reference && <span>Ref: {refund.reference}</span>}
                                        {(refund.processedBy?.fullName || refund.processedBy?.username) && <span>By: {refund.processedBy.fullName || refund.processedBy.username}</span>}
                                        {refund.paymentId && <span>Payment: {refund.paymentId.slice(-8)}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : billLoadErrors[bill.id] ? (
                      <div className="p-6 text-center text-sm text-[var(--icon-red-text)]">
                        <p>Unable to load this bill’s items.</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{billLoadErrors[bill.id]}</p>
                        <Button className="mt-3" size="sm" variant="secondary" icon={RefreshCw} onClick={() => void handleViewBillDetails(bill.id)}>Retry</Button>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-sm text-[var(--text-tertiary)]">Preparing items…</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={patientBills.length}
            onChange={goToPage}
            noun="bills"
          />
        </>
      )}

      {/* ── Fixed bottom pay dock ───────────────────────────────────── */}
      {canMakePayment && selectedItems.size > 0 && (
        <div
          role="region"
          aria-label="Payment actions"
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <CheckSquare className="w-4 h-4 text-[var(--icon-cyan-text)] flex-shrink-0" />
              <span className="font-medium text-[var(--text-primary)]">
                {selectedItems.size} selected
              </span>
              <span className="text-[var(--text-secondary)]">·</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums">
                {formatCurrency(selectedItemsTotal)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={deselectAll}>Clear</Button>
              <Button variant="outline" size="sm" onClick={selectAllUnpaid}>Select all unpaid</Button>
              <Button variant="soft" accent="green" size="sm" icon={DollarSign} onClick={handleOpenPaymentModal}>
                Make payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Service Modal ─────────────────────────────────────── */}
      {showAddServiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-[var(--border-color)]">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-3 flex justify-between items-center z-10">
              <h3 className="font-bold text-lg">Add Miscellaneous Charge</h3>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={X}
                aria-label="Close"
                onClick={() => {
                  setShowAddServiceModal(false);
                  setSelectedServices(new Set());
                  setServiceSearchTerm('');
                }}
              />
            </div>
            <div className="p-4">
              <SearchInput
                className="mb-4"
                value={serviceSearchTerm}
                onChange={setServiceSearchTerm}
                placeholder="Search by service name or code..."
              />
              <div className="max-h-96 overflow-y-auto space-y-1 border border-[var(--border-color)] rounded-lg">
                {servicesLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-secondary)]">No services found</div>
                ) : (
                  filteredServices.map((service) => (
                    <label key={service.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-main)] cursor-pointer transition-colors border-b border-[var(--border-color)] last:border-0">
                      <input
                        type="checkbox"
                        checked={selectedServices.has(service.id)}
                        onChange={(e) => {
                          setSelectedServices((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(service.id);
                            else next.delete(service.id);
                            return next;
                          });
                        }}
                        className="rounded w-4 h-4 text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-[var(--text-primary)]">{service.name}</div>
                        <div className="text-xs text-[var(--text-secondary)] flex gap-2 mt-0.5">
                          <span className="font-mono bg-[var(--bg-main)] px-1 rounded border border-[var(--border-color)]">{service.code}</span>
                          <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(service.pricing?.cashPrice || 0)}</span>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-[var(--border-color)] p-4 flex gap-3">
              <Button
                variant="soft"
                accent="green"
                className="flex-1"
                onClick={handleAddServices}
                disabled={selectedServices.size === 0 || addingServices}
                loading={addingServices}
              >
                {addingServices ? 'Adding...' : `Add ${selectedServices.size} Service(s)`}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowAddServiceModal(false);
                  setSelectedServices(new Set());
                  setServiceSearchTerm('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ─────────────────────────────────────────── */}
      {isPaymentModalOpen && selectedBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-[var(--icon-green-text)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">Process Payment</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Bill {selectedBill.billNumber}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  iconOnly
                  icon={X}
                  aria-label="Close"
                  onClick={() => setIsPaymentModalOpen(false)}
                />
              </div>
              
              <div className="space-y-4">
                <div className="bg-[var(--icon-cyan-bg)]/50 rounded-lg p-3 border border-[var(--border-color)]">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--icon-cyan-text)] mb-2">
                    Paying for {selectedItems.size} item(s)
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                    {selectedBill.BillLineItem?.filter((i) => selectedItems.has(i.id)).map((item) => (
                      <div key={item.id} className="text-xs text-[var(--text-secondary)] flex justify-between gap-3">
                        <span className="truncate">{item.description}</span>
                        <span className="font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0">
                          {formatCurrency(item.patientPayableAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Field label="Amount to Pay" hint={`Maximum: ${formatCurrency(selectedItemsTotal)}`}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium text-sm">₵</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      max={selectedItemsTotal}
                      step={0.01}
                      className={cn(INPUT, 'w-full pl-8 tabular-nums font-semibold text-lg py-2.5')}
                    />
                  </div>
                </Field>
                
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['cash', 'mobile_money', 'card', 'bank_transfer'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors border',
                          paymentMethod === method
                            ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)] ring-1 ring-[var(--icon-cyan-text)]'
                            : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--border-color)]'
                        )}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                
                {paymentMethod === 'mobile_money' && (
                  <Field label="Mobile Money Number" hint="Enter the payer's Ghana mobile number">
                    <input
                      type="tel"
                      value={momoPhone}
                      onChange={(e) => setMomoPhone(e.target.value)}
                      placeholder="024 000 0000"
                      className={cn(INPUT, 'w-full text-sm')}
                    />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Reference No." hint="Optional">
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Txn ID, Check No."
                      className={cn(INPUT, 'w-full text-sm')}
                    />
                  </Field>
                  <Field label="Notes" hint="Optional">
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Additional notes..."
                      className={cn(INPUT, 'w-full text-sm')}
                    />
                  </Field>
                </div>
                
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3 space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Items selected</span>
                    <span className="font-medium text-[var(--text-primary)] tabular-nums">{formatCurrency(selectedItemsTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Amount to pay</span>
                    <span className="font-bold text-[var(--icon-green-text)] tabular-nums">{formatCurrency(paymentAmount)}</span>
                  </div>
                  {paymentAmount < selectedItemsTotal && (
                    <div className="flex justify-between text-sm pt-2 border-t border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">Remaining for this visit</span>
                      <span className="font-medium text-[var(--icon-yellow-text)] tabular-nums">
                        {formatCurrency(selectedItemsTotal - paymentAmount)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setIsPaymentModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="soft"
                    accent="green"
                    className="flex-1"
                    icon={DollarSign}
                    loading={isProcessingPayment}
                    disabled={paymentAmount <= 0 || paymentAmount > selectedItemsTotal}
                    onClick={handleProcessPayment}
                  >
                    {isProcessingPayment ? 'Processing...' : 'Process Payment'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <RefundPaymentModal
        payment={refundTarget}
        billNumber={selectedBill?.billNumber || ''}
        onClose={() => setRefundTarget(null)}
        onSubmit={handleProcessRefund}
      />
    </div>
  );
}