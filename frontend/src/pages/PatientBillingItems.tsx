// src/pages/PatientBillingItems.tsx - OPTIMIZED VERSION

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { useAuthStore } from '../store/authStore';
import { canAccessPage } from '../config/access';
import { useToast } from '../store/toastStore';
import { openPrintWindow, generatePDF } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import { addServicesToEncounter } from '../api';
import {
  ArrowLeft, Receipt, DollarSign, CreditCard, Eye, Printer,
  FileText, User, Calendar,
  Shield, CheckCircle, AlertCircle, X,
  RefreshCw, TrendingUp, Wallet, Pill, Stethoscope,
  Microscope, Scan, Syringe, ClipboardList, Hospital,
  CheckSquare, Square, PlusCircle, Loader2
} from 'lucide-react';
import {
  Badge, Button, Card, cn, Field, humanStatus, INPUT, LinkButton, PageHeader,
  Pagination, SearchInput, SELECT, StatCard, statusTone, TD, TH, TH_ROW, TR,
} from '../components/ui';

interface BillLineItem {
  id: string;
  description: string;
  serviceType: string;
  serviceCategory: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  insuranceCoveredAmount: number;
  patientPayableAmount: number;
  paidAmount: number;
  balance: number;
  discount: number;
  isVoided: boolean;
  isFullyPaid: boolean;
  voidReason?: string;
  serviceCatalog?: { name: string; code: string };
}

interface ProcessedBill {
  id: string;
  billNumber: string;
  billDate: string;
  status: string;
  paymentMode: string;
  subtotal: number;
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
  InsuranceProvider?: {
    id: string;
    name: string;
    coveragePercentage: number;
  };
  payments?: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    transactionDate: string;
    reference: string;
  }>;
}

export default function PatientBillingItems() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const goBack = () => (routerLocation.key === 'default' ? navigate('/dashboard/billing') : navigate(-1));
  const { success, error: toastError } = useToast();
  const { hasRole, user } = useAuthStore();
  // The patient record is not part of the billing page's grant, so the shortcut
  // only appears for roles that can actually open it (see config/access.ts).
  const canViewPatientProfile = canAccessPage(user?.role, 'patients');

  // ===== Local UI state =====
  const [selectedBill, setSelectedBill] = useState<ProcessedBill | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [actualPatientId, setActualPatientId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Payment states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Add service modal
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [addingServices, setAddingServices] = useState(false);

  // ===== Store slices (granular selectors to avoid re-renders) =====
  const bills = useBillingStore((s) => s.bills);
  const isLoading = useBillingStore((s) => s.isLoading);
  const getBills = useBillingStore((s) => s.getBills);
  const currentBill = useBillingStore((s) => s.currentBill);
  const getBill = useBillingStore((s) => s.getBill);
  const clearCurrentBill = useBillingStore((s) => s.clearCurrentBill);
  const addPaymentToBill = useBillingStore((s) => s.addPaymentToBill);
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
  const isCashPayment = selectedBill?.paymentMode === 'cash';

  // Guard so loadData only runs once per patientId
  const loadedForPatientRef = useRef<string | null>(null);
  const autoOpenedBillRef = useRef<string | null>(null);

  // ===== Helpers =====
  const formatCurrency = useCallback(
    (amount: number) => `₵${amount?.toFixed(2) ?? '0.00'}`,
    []
  );

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  }, []);

  const getPaymentModeLabel = useCallback(
    (mode: string) =>
      ({ cash: 'Cash', nhis: 'NHIS', private_insurance: 'Private Insurance' }[
        mode
      ] ?? 'Cash'),
    []
  );

  const getCategoryIcon = useCallback((category: string) => {
    const icons: Record<string, JSX.Element> = {
      Consultation: <Stethoscope className="w-5 h-5 text-[var(--icon-cyan-text)]" />,
      'Laboratory Tests': <Microscope className="w-5 h-5 text-[var(--icon-purple-text)]" />,
      'Scans & Imaging': <Scan className="w-5 h-5 text-[var(--icon-yellow-text)]" />,
      Medications: <Pill className="w-5 h-5 text-[var(--icon-green-text)]" />,
      Procedures: <Syringe className="w-5 h-5 text-[var(--icon-red-text)]" />,
      'Ward & Accommodation': <Hospital className="w-5 h-5 text-[var(--icon-orange-text)]" />,
    };
    return icons[category] ?? <ClipboardList className="w-5 h-5 text-[var(--text-secondary)]" />;
  }, []);

  // ===== Load data (STABLE — reads fresh store values via getState) =====
  const loadData = useCallback(
    async (force = false) => {
      if (!patientId) return;
      if (!force && (dataLoaded || isResolving)) return;

      setIsResolving(true);
      try {
        // The route parameter can name a patient OR a visit. Settle that with one targeted
        // request instead of downloading the whole register and searching it in the browser.
        let resolvedId: string | null = patientId;
        try {
          const direct = await fetchPatient(patientId);
          if (!direct?.id) resolvedId = null;
        } catch {
          // Not a patient id — it may be a visit id that carries the patient.
          try {
            const attendance = await getAttendance(patientId);
            if (attendance && (attendance as any).patientId) {
              resolvedId = (attendance as any).patientId;
            }
          } catch {
            // not an attendance ID
          }

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

        // The item picker and the patient search need reference lists, but neither is needed to
        // show this visit's bills, so they stream in afterwards rather than blocking the page.
        void getServiceCatalog({ isActive: true, limit: 1000, _t: cacheBuster }).catch(() => undefined);
        void loadPatients().catch(() => undefined);

        // Match the selected attendance to the bill clicked on the main Billing page;
        // otherwise default to the patient's most recent visit, like Vitals and Medical Entries.
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
      patientId,
      loadPatients,
      fetchPatient,
      getAttendance,
      getBills,
      getAttendances,
      getServiceCatalog,
      toastError,
      dataLoaded,
      isResolving,
    ]
  );

  // Run once per patientId
  useEffect(() => {
    if (!patientId) return;
    if (loadedForPatientRef.current === patientId) return;
    loadedForPatientRef.current = patientId;
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
    // The register can still be streaming in; the single fetched record is enough meanwhile.
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
      // Until an attendance is selected, do not mix bills from different visits.
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
      (a, b) =>
        new Date(b.billDate || b.createdAt).getTime() -
        new Date(a.billDate || a.createdAt).getTime()
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAttendanceId]);

  // ===== Bill detail fetch =====
  const handleViewBillDetails = useCallback(
    async (billId: string) => {
      setIsLoadingItems(true);
      try {
        await getBill(billId);
      } catch (err: any) {
        console.error('Error loading bill details:', err);
        toastError('Error', err.message || 'Failed to load bill details');
      } finally {
        setIsLoadingItems(false);
      }
    },
    [getBill, toastError]
  );

  // When opened from the main Billing list, open the exact bill the user selected.
  // The patient history remains visible, but its selected visit/bill details are loaded separately.
  useEffect(() => {
    const requestedBillId = new URLSearchParams(window.location.search).get('billId');
    if (!dataLoaded || !requestedBillId || autoOpenedBillRef.current === requestedBillId) return;
    if (!patientBills.some((bill) => bill.id === requestedBillId)) return;
    autoOpenedBillRef.current = requestedBillId;
    setExpandedBillId(requestedBillId);
    void handleViewBillDetails(requestedBillId);
  }, [dataLoaded, patientBills, handleViewBillDetails]);

  // Process currentBill into selectedBill — only when the bill's identity/version changes
  useEffect(() => {
    if (!currentBill) return;

    setSelectedBill(() => ({
        ...currentBill,
        BillLineItem:
          currentBill.BillLineItem?.map((item: any) => ({
            ...item,
            // Prefer actual per-line payment allocation from the API. Only fall back
            // to bill status for legacy records that do not expose line-level amounts.
            paidAmount:
              item.paidAmount ??
              (currentBill.status === 'paid' ? item.patientPayableAmount : 0),
            balance:
              item.balance ??
              (currentBill.status === 'paid' ? 0 : item.patientPayableAmount),
            isFullyPaid: item.isFullyPaid ?? currentBill.status === 'paid',
            serviceCategory: item.serviceCategory || item.serviceType || 'miscellaneous',
          })) || [],
      }));

    setExpandedBillId(currentBill.id);
    setSelectedItems(new Set());
  }, [currentBill]);

  // Clear currentBill on unmount
  useEffect(() => {
    return () => {
      clearCurrentBill();
    };
  }, [clearCurrentBill]);

  const toggleBillExpand = useCallback(
    (billId: string) => {
      if (expandedBillId === billId) {
        setExpandedBillId(null);
        setSelectedBill(null);
        setSelectedItems(new Set());
      } else {
        handleViewBillDetails(billId);
      }
    },
    [expandedBillId, handleViewBillDetails]
  );

  const goToPage = useCallback(
    (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    [totalPages]
  );

  // ===== Grouped items =====
  const groupedItems = useMemo(() => {
    if (!selectedBill?.BillLineItem) return {} as Record<string, BillLineItem[]>;

    const groups: Record<string, BillLineItem[]> = {
      Consultation: [],
      'Laboratory Tests': [],
      'Scans & Imaging': [],
      Medications: [],
      Procedures: [],
      'Ward & Accommodation': [],
      'Other Services': [],
    };

    const categoryMap: Record<string, string> = {
      consultation: 'Consultation',
      lab_test: 'Laboratory Tests',
      scan: 'Scans & Imaging',
      medication: 'Medications',
      procedure: 'Procedures',
      ward: 'Ward & Accommodation',
    };

    selectedBill.BillLineItem.forEach((item) => {
      if (!item.isVoided) {
        const key = categoryMap[item.serviceType?.toLowerCase()] ?? 'Other Services';
        groups[key].push(item);
      }
    });

    Object.keys(groups).forEach((k) => {
      if (groups[k].length === 0) delete groups[k];
    });

    return groups;
  }, [selectedBill]);

  // ===== Totals =====
  const totals = useMemo(() => {
    if (!selectedBill) return null;
    const allItems = selectedBill.BillLineItem?.filter((i) => !i.isVoided) || [];
    return {
      subtotal: allItems.reduce((s, i) => s + i.lineTotal, 0),
      insuranceCovered: allItems.reduce((s, i) => s + i.insuranceCoveredAmount, 0),
      patientPayable: allItems.reduce((s, i) => s + i.patientPayableAmount, 0),
      totalPaid: selectedBill.paidAmount || 0,
      balance: selectedBill.balance || 0,
    };
  }, [selectedBill]);

  const selectedItemsTotal = useMemo(() => {
    if (!selectedBill || selectedItems.size === 0) return 0;
    let total = 0;
    selectedBill.BillLineItem?.forEach((item) => {
      if (!item.isVoided && selectedItems.has(item.id) && !item.isFullyPaid)
        total += item.patientPayableAmount;
    });
    return total;
  }, [selectedBill, selectedItems]);

  // ===== Item selection helpers =====
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const selectAllUnpaid = useCallback(() => {
    if (!selectedBill) return;
    const unpaid = (selectedBill.BillLineItem || []).filter(
      (i) => !i.isVoided && !i.isFullyPaid && i.patientPayableAmount > 0
    );
    setSelectedItems(new Set(unpaid.map((i) => i.id)));
    setPaymentAmount(unpaid.reduce((s, i) => s + i.patientPayableAmount, 0));
  }, [selectedBill]);

  const deselectAll = useCallback(() => {
    setSelectedItems(new Set());
    setPaymentAmount(0);
  }, []);

  // Toggle all unpaid within a single category (used by header checkbox)
  const toggleCategorySelection = useCallback(
    (items: BillLineItem[]) => {
      const unpaid = items.filter(
        (i) => !i.isFullyPaid && i.patientPayableAmount > 0
      );
      if (unpaid.length === 0) return;

      setSelectedItems((prev) => {
        const next = new Set(prev);
        const allSelected = unpaid.every((i) => next.has(i.id));
        if (allSelected) {
          unpaid.forEach((i) => next.delete(i.id));
        } else {
          unpaid.forEach((i) => next.add(i.id));
        }
        return next;
      });
    },
    []
  );

  const handleOpenPaymentModal = useCallback(() => {
    if (selectedItems.size === 0) {
      toastError('No items selected', 'Please select at least one item to pay for');
      return;
    }
    setPaymentAmount(selectedItemsTotal);
    setIsPaymentModalOpen(true);
  }, [selectedItems.size, selectedItemsTotal, toastError]);

  // ===== Add services =====
  // One bulk request for the whole selection: adding eight services used to be eight POSTs,
  // each re-validating the encounter, and a failure half-way left the bill part-updated.
  const handleAddServices = useCallback(async () => {
    if (!selectedBill || selectedServices.size === 0 || !selectedBill.Attendance?.id)
      return;

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
  }, [
    selectedBill,
    selectedServices,
    generateBillFromAttendance,
    handleViewBillDetails,
    success,
    toastError,
  ]);

  // ===== Receipt generation =====
  const generateAndShowReceipt = useCallback(async () => {
    if (!selectedBill) return;
    try {
      // Fetch fresh bill using the same store action
      await getBill(selectedBill.id);
      const freshBill: any = useBillingStore.getState().currentBill;
      if (!freshBill) return;

      const payments = (freshBill.Payment || freshBill.payments || [])
        .filter((payment: any) => !payment.isVoided)
        .slice()
        .sort((a: any, b: any) => new Date(b.transactionDate || 0).getTime() - new Date(a.transactionDate || 0).getTime());
      const latestPayment = payments[0] || null;
      if (!latestPayment) {
        toastError('No payment recorded', 'A receipt can only be issued for a recorded, non-voided payment.');
        return;
      }

      const hospitalInfo = {
        name: 'Veridian Hospital',
        address: '123 Main Street, Accra, Ghana',
        phone: '+233 123 456 789',
        email: 'info@veridianhospital.com',
      };

      const receiptData = {
        bill: freshBill,
        patient: freshBill.Patient,
        payment: {
          amount: latestPayment.amount,
          paymentMethod: latestPayment.paymentMethod,
          receiptNumber: latestPayment.reference || latestPayment.id,
          paymentDate: latestPayment.transactionDate,
          receivedBy: latestPayment.User?.fullName || 'System',
        },
        hospital: hospitalInfo,
      };

      const html = generatePDF('receipt', receiptData, hospitalInfo);
      openPrintWindow(html, `Receipt-${freshBill.billNumber}`);
    } catch (err) {
      console.error('Receipt generation error:', err);
    }
  }, [selectedBill, getBill, paymentAmount, paymentMethod, paymentReference]);

  const handleViewReceipt = useCallback(
    async (billId: string) => {
      setIsLoadingItems(true);
      try {
        await getBill(billId);
        const billToReceipt = useBillingStore.getState().currentBill;
        if (!billToReceipt) {
          toastError('Error', 'Could not load bill details');
          return;
        }

        const payments = ((billToReceipt as any).Payment || (billToReceipt as any).payments || [])
          .filter((payment: any) => !payment.isVoided)
          .slice()
          .sort((a: any, b: any) => new Date(b.transactionDate || 0).getTime() - new Date(a.transactionDate || 0).getTime());
        const latestPayment = payments[0] || null;
        if (!latestPayment) {
          toastError('No payment recorded', 'A receipt can only be issued for a recorded, non-voided payment.');
          return;
        }

        const hospitalInfo = {
          name: 'Veridian Hospital',
          address: '123 Main Street, Accra, Ghana',
          phone: '+233 123 456 789',
          email: 'info@veridianhospital.com',
        };

        const receiptData = {
          bill: billToReceipt,
          patient: (billToReceipt as any).Patient,
          payment: latestPayment
            ? {
                amount: latestPayment.amount,
                paymentMethod: latestPayment.paymentMethod,
                receiptNumber: latestPayment.reference || latestPayment.id,
                paymentDate: latestPayment.transactionDate,
                receivedBy: 'System',
              }
            : null,
          hospital: hospitalInfo,
        };

        const html = generatePDF('receipt', receiptData, hospitalInfo);
        openPrintWindow(html, `Receipt-${billToReceipt.billNumber}`);
        success('Receipt opened', 'Receipt is ready to print');
      } catch (err: any) {
        console.error('Receipt generation error:', err);
        toastError('Error', err?.response?.data?.message || 'Could not generate receipt');
      } finally {
        setIsLoadingItems(false);
      }
    },
    [getBill, toastError, success]
  );

  // ===== Payment =====
  const handleProcessPayment = useCallback(async () => {
    if (!selectedBill || selectedItems.size === 0) return;
    if (paymentAmount <= 0) {
      toastError('Invalid amount', 'Please enter a valid payment amount');
      return;
    }
    if (paymentAmount > selectedItemsTotal) {
      toastError(
        'Amount too high',
        `Maximum payment amount is ${formatCurrency(selectedItemsTotal)}`
      );
      return;
    }

    setIsProcessingPayment(true);
    try {
      await addPaymentToBill(selectedBill.id, {
        amount: paymentAmount,
        paymentMethod,
        reference: paymentReference || `PAY-${Date.now()}`,
        notes:
          paymentNotes ||
          `Payment for selected items (${selectedItems.size} items)`,
      });

      setIsPaymentModalOpen(false);
      setSelectedItems(new Set());
      setPaymentAmount(0);
      setPaymentReference('');
      setPaymentNotes('');
      setPaymentMethod('cash');

      // Refresh list + bill
      await getBills({ patientId: actualPatientId, _t: Date.now() });
      await handleViewBillDetails(selectedBill.id);

      success(
        'Payment Successful',
        `Payment of ${formatCurrency(paymentAmount)} has been processed`
      );

      await generateAndShowReceipt();
    } catch (err: any) {
      toastError('Payment Failed', err.message || 'Failed to process payment');
    } finally {
      setIsProcessingPayment(false);
    }
  }, [
    selectedBill,
    selectedItems.size,
    paymentAmount,
    selectedItemsTotal,
    paymentMethod,
    paymentReference,
    paymentNotes,
    formatCurrency,
    addPaymentToBill,
    getBills,
    actualPatientId,
    handleViewBillDetails,
    success,
    toastError,
    generateAndShowReceipt,
  ]);

  // ===== Service search =====
  const filteredServices = useMemo(() => {
    if (!serviceSearchTerm) return serviceCatalog;
    const lower = serviceSearchTerm.toLowerCase();
    return serviceCatalog.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.code.toLowerCase().includes(lower)
    );
  }, [serviceCatalog, serviceSearchTerm]);

  // ===== Loading =====
  const pageHeader = (
    <PageHeader
      title="Patient Billing Items"
      subtitle={`View and manage all billable items for ${getPatientName(patient)}`}
      meta={`${patientBills.length} bill(s) for the selected visit${selectedAttendance?.attendanceNumber ? ` (${selectedAttendance.attendanceNumber})` : ''}${selectedAttendance?.dateTime ? ` · ${formatDate(selectedAttendance.dateTime)}` : ''} · Folder: ${patient?.folderNumber}`}
      icon={DollarSign}
      accent="yellow"
      onBack={goBack}
      actions={(
        <Button icon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
      )}
    />
  );

  if (isInitialLoad && (isLoading || isResolving)) {
    return (
      <div className="space-y-6 p-6">
        {pageHeader}
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--icon-cyan-text)]" />
          <p className="text-[var(--text-secondary)]">Loading patient billing data...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] animate-pulse"
            >
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
  // A patient can be missing from the loaded patient page while their bills and
  // visits are already here; only treat the route as invalid when nothing matches.
  const hasLoadedPatientRecords =
    bills.some((bill) => bill.patientId === actualPatientId) ||
    attendances.some((attendance: any) => attendance.patientId === actualPatientId);

  if (
    dataLoaded &&
    !isResolving &&
    !isLoading &&
    !patient &&
    actualPatientId &&
    !hasLoadedPatientRecords
  ) {
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
    <div className="space-y-6 p-6">
      {pageHeader}

      {/* Patient / attendance selector — consistent with Vitals and Medical Entries */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm">
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
            setSelectedAttendanceId(attendanceId);
            setExpandedBillId(null);
            setSelectedBill(null);
            setSelectedItems(new Set());
            clearCurrentBill();
          }}
          onClearSelection={() => {
            setSelectedPatientId('');
            setSelectedAttendanceId('');
            setExpandedBillId(null);
            setSelectedBill(null);
            setSelectedItems(new Set());
          }}
        />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Select a visit to view only its bills. Choose a previous attendance to review that visit’s charges and payments.
        </p>
      </div>

      {/* Patient Info Card */}
      {patient && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-[var(--icon-cyan-text)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--text-primary)]">
                  {getPatientName(patient)}
                </h2>
                <div className="flex flex-wrap gap-3 mt-1">
                  <span className="text-xs text-[var(--text-secondary)]">
                    Folder: {patient.folderNumber}
                  </span>
                  {patient.contact && (
                    <span className="text-xs text-[var(--text-secondary)]">
                      Contact: {patient.contact}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {canViewPatientProfile && (
              <LinkButton
                to={`/dashboard/patients/${patient.id}`}
                variant="secondary"
                icon={Eye}
              >
                View Profile
              </LinkButton>
            )}
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      {patientBills.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Bills"
            value={patientBills.length}
            icon={FileText}
            accent="cyan"
          />
          <StatCard
            size="money"
            label="Total Amount"
            value={formatCurrency(
              patientBills.reduce((s, b) => s + (b.totalAmount || 0), 0)
            )}
            icon={DollarSign}
            accent="purple"
          />
          <StatCard
            size="money"
            label="Total Paid"
            value={formatCurrency(
              patientBills.reduce((s, b) => s + (b.paidAmount || 0), 0)
            )}
            icon={Wallet}
            accent="green"
          />
          <StatCard
            size="money"
            label="Outstanding"
            value={formatCurrency(
              patientBills.reduce((s, b) => s + (b.balance || 0), 0)
            )}
            icon={TrendingUp}
            accent="red"
          />
        </div>
      )}

      {/* Search & Per-page */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <SearchInput
            className="w-full sm:max-w-sm"
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            placeholder="Search by bill number or status..."
          />
          <select
            aria-label="Rows per page"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={cn(SELECT, 'w-auto')}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
          </select>
        </div>
      </Card>

      {/* Bills List */}
      {patientBills.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <Receipt className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No Bills Found' : !selectedAttendanceId ? 'Select an Attendance' : 'No Billing Records for This Visit'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {searchQuery
              ? 'No bills match your search criteria.'
              : !selectedAttendanceId ? 'Choose the current or a previous attendance above to see its bills.' : 'This attendance has no associated bills yet.'}
          </p>
          {searchQuery && (
            <Button
              variant="secondary"
              className="mt-4"
              icon={X}
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedBills.map((bill) => {
              const isExpanded = expandedBillId === bill.id;
              const isLoadingThis = isLoadingItems && expandedBillId === bill.id;

              return (
                <Card key={bill.id} padded={false}>
                  {/* Bill header row */}
                  <div
                    className="p-4 cursor-pointer hover:bg-[var(--bg-main)] transition-colors"
                    onClick={() => toggleBillExpand(bill.id)}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[var(--text-primary)]">{bill.billNumber}</p>
                            <Badge tone={statusTone(bill.status)} dot size="sm">
                              {humanStatus(bill.status)}
                            </Badge>
                            {(bill.status === 'paid' || bill.status === 'partial') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                icon={Printer}
                                aria-label="View Receipt"
                                className="text-[var(--icon-cyan-text)]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReceipt(bill.id);
                                }}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(bill.billDate || bill.createdAt)}
                            </span>
                            {bill.Attendance?.attendanceNumber && (
                              <span className="flex items-center gap-1" title="Visit / attendance">
                                <ClipboardList className="w-3 h-3" />
                                Visit {bill.Attendance.attendanceNumber}
                                {bill.Attendance.dateTime && ` · ${formatDate(bill.Attendance.dateTime)}`}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {getPaymentModeLabel(bill.paymentMode)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-[var(--text-secondary)]">Total</p>
                          <p className="font-bold text-[var(--text-primary)]">
                            {formatCurrency(bill.totalAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[var(--text-secondary)]">Balance</p>
                          <p
                            className={`font-bold ${
                              bill.balance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'
                            }`}
                          >
                            {formatCurrency(bill.balance)}
                          </p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded bill detail */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                      {isLoadingThis ? (
                        <div className="flex justify-center py-12">
                          <div className="w-8 h-8 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : selectedBill?.id === bill.id ? (
                        <div className="p-4">
                          {/* Add Service Button */}
                          {canMakePayment &&
                            selectedBill.status !== 'paid' &&
                            selectedBill.Attendance?.id && (
                              <div className="mb-4 flex justify-end">
                                <Button
                                  variant="soft"
                                  accent="green"
                                  icon={PlusCircle}
                                  onClick={() => setShowAddServiceModal(true)}
                                >
                                  Add Miscellaneous Charge
                                </Button>
                              </div>
                            )}

                          {/* Make legacy zero-value bills visible as needing review instead of implying they have itemised charges. */}
                          {Object.entries(groupedItems).length === 0 && Number(selectedBill.totalAmount || 0) === 0 && (
                            <div className="mb-4 rounded-lg border border-[var(--border-color)] bg-[var(--icon-yellow-bg)] p-4 text-sm text-[var(--icon-yellow-text)]">
                              <p className="font-semibold">No itemised charges recorded</p>
                              <p className="mt-1">This zero-value bill has no active line items. Review the attendance and clinical records before taking any billing action.</p>
                            </div>
                          )}

                          {/* Grouped categories */}
                          {Object.entries(groupedItems).map(([category, items]) => {
                            const unpaidItems = items.filter(
                              (i) => !i.isFullyPaid && i.patientPayableAmount > 0
                            );
                            const allSelected =
                              unpaidItems.length > 0 &&
                              unpaidItems.every((i) => selectedItems.has(i.id));

                            return (
                              <div key={category} className="mb-6 last:mb-0">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border-color)]">
                                  {getCategoryIcon(category)}
                                  <h3 className="font-semibold text-[var(--text-primary)]">
                                    {category}
                                  </h3>
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    ({items.length} items)
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className={TH_ROW}>
                                      <tr>
                                        <th className={cn(TH, 'w-8 text-center')}>
                                          {unpaidItems.length > 0 && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleCategorySelection(items);
                                              }}
                                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                            >
                                              {allSelected ? (
                                                <CheckSquare className="w-4 h-4 text-[var(--icon-green-text)]" />
                                              ) : (
                                                <Square className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}
                                        </th>
                                        <th className={TH}>
                                          Service
                                        </th>
                                        <th className={cn(TH, 'text-center')}>
                                          Qty
                                        </th>
                                        <th className={cn(TH, 'text-right')}>
                                          Unit Price
                                        </th>
                                        <th className={cn(TH, 'text-right')}>
                                          Total
                                        </th>
                                        {!isCashPayment && (
                                          <>
                                            <th className={cn(TH, 'text-right')}>
                                              Insurance
                                            </th>
                                            <th className={cn(TH, 'text-right')}>
                                              Patient Pays
                                            </th>
                                          </>
                                        )}
                                        <th className={cn(TH, 'text-right')}>
                                          Paid
                                        </th>
                                        <th className={cn(TH, 'text-right')}>
                                          Balance
                                        </th>
                                        <th className={cn(TH, 'text-center')}>
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map((item) => (
                                        <tr
                                          key={item.id}
                                          className={cn(TR, item.isFullyPaid && 'opacity-60')}
                                        >
                                          <td className={cn(TD, 'text-center')}>
                                            {item.isFullyPaid ? (
                                              <CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />
                                            ) : item.patientPayableAmount > 0 &&
                                              canMakePayment ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleItemSelection(item.id);
                                                }}
                                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                              >
                                                {selectedItems.has(item.id) ? (
                                                  <CheckSquare className="w-4 h-4 text-[var(--icon-green-text)]" />
                                                ) : (
                                                  <Square className="w-4 h-4" />
                                                )}
                                              </button>
                                            ) : null}
                                          </td>
                                          <td className={cn(TD, 'whitespace-normal')}>
                                            <p className="text-sm text-[var(--text-primary)]">
                                              {item.description}
                                            </p>
                                            {item.serviceCatalog?.code && (
                                              <p className="text-xs text-[var(--text-secondary)]">
                                                Code: {item.serviceCatalog.code}
                                              </p>
                                            )}
                                          </td>
                                          <td className={cn(TD, 'text-center text-[var(--text-secondary)]')}>
                                            {item.quantity}
                                          </td>
                                          <td className={cn(TD, 'text-right text-[var(--text-secondary)]')}>
                                            {formatCurrency(item.unitPrice)}
                                          </td>
                                          <td className={cn(TD, 'text-right font-medium')}>
                                            {formatCurrency(item.lineTotal)}
                                          </td>
                                          {!isCashPayment && (
                                            <>
                                              <td className={cn(TD, 'text-right text-[var(--icon-green-text)]')}>
                                                {formatCurrency(
                                                  item.insuranceCoveredAmount
                                                )}
                                              </td>
                                              <td className={cn(TD, 'text-right font-bold text-[var(--icon-cyan-text)]')}>
                                                {formatCurrency(
                                                  item.patientPayableAmount
                                                )}
                                              </td>
                                            </>
                                          )}
                                          <td className={cn(TD, 'text-right text-[var(--icon-green-text)]')}>
                                            {formatCurrency(item.paidAmount || 0)}
                                          </td>
                                          <td className={cn(TD, 'text-right font-bold text-[var(--icon-red-text)]')}>
                                            {formatCurrency(
                                              item.balance || item.patientPayableAmount
                                            )}
                                          </td>
                                          <td className={cn(TD, 'text-center')}>
                                            <Badge
                                              tone={item.isFullyPaid ? 'green' : 'red'}
                                              dot
                                              size="sm"
                                            >
                                              {item.isFullyPaid ? 'Paid' : 'Pending'}
                                            </Badge>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-[var(--bg-main)]">
                                      <tr className="border-t border-[var(--border-color)]">
                                        <td
                                          colSpan={5}
                                          className={cn(TD, 'text-right font-semibold')}
                                        >
                                          Category Total:
                                        </td>
                                        {!isCashPayment && (
                                          <td className={cn(TD, 'text-right text-[var(--icon-green-text)]')}>
                                            {formatCurrency(
                                              items.reduce(
                                                (s, i) => s + i.insuranceCoveredAmount,
                                                0
                                              )
                                            )}
                                          </td>
                                        )}
                                        <td className={cn(TD, 'text-right font-bold text-[var(--icon-cyan-text)]')}>
                                          {formatCurrency(
                                            items.reduce(
                                              (s, i) => s + i.patientPayableAmount,
                                              0
                                            )
                                          )}
                                        </td>
                                        <td className={cn(TD, 'text-right text-[var(--icon-green-text)]')}>
                                          {formatCurrency(
                                            items.reduce(
                                              (s, i) => s + (i.paidAmount || 0),
                                              0
                                            )
                                          )}
                                        </td>
                                        <td className={cn(TD, 'text-right font-bold text-[var(--icon-red-text)]')}>
                                          {formatCurrency(
                                            items.reduce(
                                              (s, i) =>
                                                s + (i.balance || i.patientPayableAmount),
                                              0
                                            )
                                          )}
                                        </td>
                                        <td />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            );
                          })}

                          {/* Bill summary footer */}
                          {totals && (
                            <div className="mt-6 pt-4 border-t-2 border-[var(--border-color)]">
                              {selectedItems.size > 0 && canMakePayment && (
                                <div className="mb-4 p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--border-color)]">
                                  <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                      <CheckSquare className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                                      <span className="text-sm font-medium text-[var(--icon-cyan-text)]">
                                        {selectedItems.size} item(s) selected for payment
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-[var(--text-secondary)]">
                                        Total to pay:
                                      </span>
                                      <span className="font-bold text-[var(--text-primary)] ml-2">
                                        {formatCurrency(selectedItemsTotal)}
                                      </span>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                      <Button variant="outline" size="sm" onClick={selectAllUnpaid}>
                                        Select All Unpaid
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={deselectAll}>
                                        Deselect All
                                      </Button>
                                      <Button
                                        variant="soft"
                                        accent="green"
                                        size="sm"
                                        icon={DollarSign}
                                        onClick={handleOpenPaymentModal}
                                      >
                                        Make Payment
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end">
                                <div className="w-full md:w-96 space-y-2">
                                  <div className="flex justify-between py-1">
                                    <span className="text-[var(--text-secondary)]">Subtotal:</span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                      {formatCurrency(totals.subtotal)}
                                    </span>
                                  </div>
                                  {!isCashPayment && (
                                    <div className="flex justify-between py-1">
                                      <span className="text-[var(--text-secondary)]">
                                        Insurance Coverage:
                                      </span>
                                      <span className="text-[var(--icon-green-text)] font-medium">
                                        – {formatCurrency(totals.insuranceCovered)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between py-2 border-t border-[var(--border-color)]">
                                    <span className="font-bold text-[var(--text-primary)]">
                                      Patient Payable:
                                    </span>
                                    <span className="font-bold text-[var(--icon-cyan-text)] text-lg">
                                      {formatCurrency(totals.patientPayable)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1">
                                    <span className="text-[var(--text-secondary)]">Amount Paid:</span>
                                    <span className="font-medium text-[var(--icon-green-text)]">
                                      {formatCurrency(totals.totalPaid)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-2 border-t border-[var(--border-color)]">
                                    <span className="font-bold text-[var(--text-primary)]">
                                      Balance Due:
                                    </span>
                                    <span
                                      className={`font-bold text-lg ${
                                        totals.balance > 0
                                          ? 'text-[var(--icon-red-text)]'
                                          : 'text-[var(--icon-green-text)]'
                                      }`}
                                    >
                                      {formatCurrency(totals.balance)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {!isCashPayment && selectedBill.InsuranceProvider && (
                                <div className="mt-4 p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--border-color)]">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                                      Insurance Details
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
                                    <p>
                                      Provider:{' '}
                                      <span className="font-medium text-[var(--text-primary)]">
                                        {selectedBill.InsuranceProvider.name}
                                      </span>
                                    </p>
                                    <p>
                                      Coverage:{' '}
                                      {selectedBill.InsuranceProvider.coveragePercentage}%
                                    </p>
                                    <p>
                                      Covered Amount:{' '}
                                      {formatCurrency(totals?.insuranceCovered || 0)}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
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

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-[var(--border-color)]">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-3 flex justify-between">
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
                  <div className="text-center py-8 text-[var(--text-secondary)]">
                    No services found
                  </div>
                ) : (
                  filteredServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-main)] cursor-pointer"
                    >
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
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{service.name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          Code: {service.code} | Price:{' '}
                          {formatCurrency(service.pricing?.cashPrice || 0)}
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
                {addingServices
                  ? 'Adding...'
                  : `Add ${selectedServices.size} Service(s)`}
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

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-[var(--icon-green-text)]" />
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Process Payment</h2>
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
                <div className="bg-[var(--icon-cyan-bg)] rounded-lg p-3 border border-[var(--border-color)]">
                  <p className="text-sm font-medium text-[var(--icon-cyan-text)] mb-2">
                    Paying for {selectedItems.size} item(s)
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedBill.BillLineItem?.filter((i) =>
                      selectedItems.has(i.id)
                    ).map((item) => (
                      <div
                        key={item.id}
                        className="text-xs text-[var(--text-secondary)] flex justify-between"
                      >
                        <span>{item.description}</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {formatCurrency(item.patientPayableAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Field
                  label="Amount to Pay"
                  hint={`Maximum: ${formatCurrency(selectedItemsTotal)}`}
                >
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm">
                      ₵
                    </span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) =>
                        setPaymentAmount(parseFloat(e.target.value) || 0)
                      }
                      max={selectedItemsTotal}
                      step={0.01}
                      className={cn(INPUT, 'w-full pl-8')}
                    />
                  </div>
                </Field>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['cash', 'mobile_money', 'card', 'bank_transfer'].map(
                      (method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                            paymentMethod === method
                              ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border border-[var(--border-color)]'
                              : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--border-color)]'
                          }`}
                        >
                          {method.replace('_', ' ')}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <Field label="Reference Number" hint="Optional">
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, Check No., etc."
                    className={cn(INPUT, 'w-full')}
                  />
                </Field>
                <Field label="Notes" hint="Optional">
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    placeholder="Additional payment notes..."
                    className={cn(INPUT, 'w-full resize-none')}
                  />
                </Field>
                <div className="bg-[var(--bg-main)] rounded-lg p-3 space-y-2 border border-[var(--border-color)]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Total Selected Items:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(selectedItemsTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Amount to Pay:</span>
                    <span className="font-bold text-[var(--icon-green-text)]">
                      {formatCurrency(paymentAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)]">Remaining Balance:</span>
                    <span className="font-medium text-[var(--icon-yellow-text)]">
                      {formatCurrency(selectedItemsTotal - paymentAmount)}
                    </span>
                  </div>
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
                    disabled={
                      paymentAmount <= 0 ||
                      paymentAmount > selectedItemsTotal
                    }
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
    </div>
  );
}