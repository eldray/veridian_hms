// src/pages/PatientBillingItems.tsx - OPTIMIZED VERSION

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useDocumentStore } from '../store/documentStore';
import { openPrintWindow, generatePDF } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import {
  ArrowLeft, Receipt, DollarSign, CreditCard, Eye, Printer,
  ChevronLeft, ChevronRight, FileText, User, Calendar,
  Shield, CheckCircle, Clock, AlertCircle, X, Search,
  RefreshCw, TrendingUp, Wallet, Pill, Stethoscope,
  Microscope, Scan, Syringe, ClipboardList, Hospital,
  CheckSquare, Square, PlusCircle, Loader2
} from 'lucide-react';

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
  const { success, error: toastError } = useToast();
  const { hasRole } = useAuthStore();

  // ===== Local UI state =====
  const [selectedBill, setSelectedBill] = useState<ProcessedBill | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [actualPatientId, setActualPatientId] = useState<string | null>(null);
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

  const getAttendance = useAttendanceStore((s) => s.getAttendance);

  const { generateReceipt } = useDocumentStore();

  const canMakePayment = hasRole(['admin', 'accounts']);
  const isCashPayment = selectedBill?.paymentMode === 'cash';

  // Guard so loadData only runs once per patientId
  const loadedForPatientRef = useRef<string | null>(null);

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

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
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
      Consultation: <Stethoscope className="w-5 h-5 text-cyan-600" />,
      'Laboratory Tests': <Microscope className="w-5 h-5 text-purple-600" />,
      'Scans & Imaging': <Scan className="w-5 h-5 text-yellow-600" />,
      Medications: <Pill className="w-5 h-5 text-green-600" />,
      Procedures: <Syringe className="w-5 h-5 text-red-600" />,
      'Ward & Accommodation': <Hospital className="w-5 h-5 text-orange-600" />,
    };
    return icons[category] ?? <ClipboardList className="w-5 h-5 text-gray-500" />;
  }, []);

  // ===== Load data (STABLE — reads fresh store values via getState) =====
  const loadData = useCallback(
    async (force = false) => {
      if (!patientId) return;
      if (!force && (dataLoaded || isResolving)) return;

      setIsResolving(true);
      try {
        console.log('🔄 Loading patient billing data for ID:', patientId);

        // Ensure patients are loaded, then read fresh snapshot
        await loadPatients();
        const freshPatients = usePatientStore.getState().patients;

        let resolvedId: string | null = patientId;
        const patientInStore = freshPatients.find((p) => p.id === patientId);

        if (!patientInStore) {
          // Try attendance by ID
          try {
            const attendance = await getAttendance(patientId);
            if (attendance && (attendance as any).patientId) {
              resolvedId = (attendance as any).patientId;
              console.log('✅ Resolved attendance → patient:', resolvedId);
            }
          } catch {
            // not an attendance ID
          }

          // Try attendances list
          if (!resolvedId || resolvedId === patientId) {
            const attendanceFromList = useAttendanceStore
              .getState()
              .attendances.find((a) => a.id === patientId);
            if (attendanceFromList && attendanceFromList.patientId) {
              resolvedId = attendanceFromList.patientId;
              console.log('✅ Found in attendances list:', resolvedId);
            }
          }
        } else {
          console.log('✅ Direct patient ID');
        }

        setActualPatientId(resolvedId);

        const cacheBuster = Date.now();
        await getBills({ patientId: resolvedId, _t: cacheBuster });
        await getServiceCatalog({ isActive: true, limit: 1000, _t: cacheBuster });

        setDataLoaded(true);
        console.log('✅ Billing data loaded');
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
      getAttendance,
      getBills,
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
    const billWithPatient = bills.find(
      (b) => b.patientId === actualPatientId && (b as any).Patient?.surname
    );
    return (billWithPatient as any)?.Patient ?? null;
  }, [patients, bills, actualPatientId]);

  // ===== Patient bills =====
  const patientBills = useMemo(() => {
    if (!actualPatientId) return [];
    let filtered = bills.filter((b) => b.patientId === actualPatientId);
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
  }, [bills, actualPatientId, searchQuery]);

  const totalPages = Math.ceil(patientBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBills = useMemo(
    () => patientBills.slice(startIndex, startIndex + itemsPerPage),
    [patientBills, startIndex, itemsPerPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  // Process currentBill into selectedBill — only when the bill's identity/version changes
  useEffect(() => {
    if (!currentBill) return;

    setSelectedBill((prev) => {
      // Skip if same bill and no meaningful change
      if (
        prev?.id === currentBill.id &&
        (prev as any).updatedAt === (currentBill as any).updatedAt &&
        (prev as any).paidAmount === (currentBill as any).paidAmount &&
        (prev as any).status === (currentBill as any).status
      ) {
        return prev;
      }

      return {
        ...currentBill,
        BillLineItem:
          currentBill.BillLineItem?.map((item: any) => ({
            ...item,
            paidAmount:
              currentBill.status === 'paid' ? item.patientPayableAmount : 0,
            balance:
              currentBill.status === 'paid' ? 0 : item.patientPayableAmount,
            isFullyPaid: currentBill.status === 'paid',
            serviceCategory: item.serviceType || 'miscellaneous',
          })) || [],
      };
    });

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
  const addServiceToAttendance = useCallback(async (attendanceId: string, data: any) => {
    const token =
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken');

    const response = await fetch(`/api/attendances/${attendanceId}/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add service');
    return response.json();
  }, []);

  const handleAddServices = useCallback(async () => {
    if (!selectedBill || selectedServices.size === 0 || !selectedBill.Attendance?.id)
      return;

    setAddingServices(true);
    try {
      for (const serviceId of selectedServices) {
        await addServiceToAttendance(selectedBill.Attendance.id, {
          serviceCatalogId: serviceId,
          quantity: 1,
        });
      }

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
    addServiceToAttendance,
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

      const payments = freshBill.Payment || freshBill.payments || [];
      const latestPayment = payments.length > 0 ? payments[payments.length - 1] : null;

      const hospitalInfo = {
        name: 'Veridian Hospital',
        address: '123 Main Street, Accra, Ghana',
        phone: '+233 123 456 789',
        email: 'info@veridianhospital.com',
      };

      const receiptData = {
        bill: freshBill,
        patient: freshBill.Patient,
        payment: latestPayment
          ? {
              amount: latestPayment.amount,
              paymentMethod: latestPayment.paymentMethod,
              receiptNumber: latestPayment.reference,
              paymentDate: latestPayment.transactionDate,
              receivedBy: latestPayment.User?.fullName || 'System',
            }
          : {
              amount: paymentAmount,
              paymentMethod,
              receiptNumber: paymentReference || `RCP-${Date.now()}`,
              paymentDate: new Date().toISOString(),
              receivedBy: 'System',
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

        const payments = (billToReceipt as any).Payment || (billToReceipt as any).payments || [];
        const latestPayment = payments.length > 0 ? payments[payments.length - 1] : null;

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
                receiptNumber: latestPayment.reference || `RCP-${Date.now()}`,
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
  if (isInitialLoad && (isLoading || isResolving)) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
          <p className="text-gray-500">Loading patient billing data...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===== Patient not found =====
  if (
    dataLoaded &&
    !isResolving &&
    !isLoading &&
    !patient &&
    actualPatientId &&
    patientBills.length === 0
  ) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Patient Not Found</h3>
          <p className="text-gray-500 mb-4">Could not find patient with ID: {patientId}</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-700 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Billing
            </button>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 ml-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Billing
            </button>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Patient Billing Items</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all billable items for {getPatientName(patient)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {patientBills.length} bill(s) · Folder: {patient?.folderNumber}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm text-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Patient Info Card */}
      {patient && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {getPatientName(patient)}
                </h2>
                <div className="flex flex-wrap gap-3 mt-1">
                  <span className="text-xs text-gray-500">
                    Folder: {patient.folderNumber}
                  </span>
                  {patient.contact && (
                    <span className="text-xs text-gray-500">
                      Contact: {patient.contact}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Link
              to={`/dashboard/patients/${patient.id}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              View Profile
            </Link>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {patientBills.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: FileText,
              label: 'Total Bills',
              value: patientBills.length,
              bg: 'bg-cyan-100',
              text: 'text-cyan-700',
            },
            {
              icon: DollarSign,
              label: 'Total Amount',
              value: formatCurrency(
                patientBills.reduce((s, b) => s + (b.totalAmount || 0), 0)
              ),
              bg: 'bg-purple-100',
              text: 'text-purple-700',
            },
            {
              icon: Wallet,
              label: 'Total Paid',
              value: formatCurrency(
                patientBills.reduce((s, b) => s + (b.paidAmount || 0), 0)
              ),
              bg: 'bg-green-100',
              text: 'text-green-700',
            },
            {
              icon: TrendingUp,
              label: 'Outstanding',
              value: formatCurrency(
                patientBills.reduce((s, b) => s + (b.balance || 0), 0)
              ),
              bg: 'bg-red-100',
              text: 'text-red-700',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center`}
                >
                  <stat.icon className={`w-4 h-4 ${stat.text}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Per-page */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by bill number or status..."
                className="w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-sm placeholder-gray-400"
              />
            </div>
          </div>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 transition-all bg-white text-gray-900 text-sm"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
          </select>
        </div>
      </div>

      {/* Bills List */}
      {patientBills.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {searchQuery ? 'No Bills Found' : 'No Billing Records'}
          </h3>
          <p className="text-gray-500 text-sm">
            {searchQuery
              ? 'No bills match your search criteria.'
              : 'This patient has no associated bills yet.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-all text-sm"
            >
              <X className="w-4 h-4" />
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedBills.map((bill) => {
              const isExpanded = expandedBillId === bill.id;
              const isLoadingThis = isLoadingItems && expandedBillId === bill.id;

              return (
                <div
                  key={bill.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Bill header row */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleBillExpand(bill.id)}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-cyan-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900">{bill.billNumber}</p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(
                                bill.status
                              )}`}
                            >
                              {bill.status === 'paid' && (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              )}
                              {bill.status === 'pending' && (
                                <Clock className="w-3 h-3 mr-1" />
                              )}
                              {bill.status === 'partial' && (
                                <AlertCircle className="w-3 h-3 mr-1" />
                              )}
                              {bill.status?.charAt(0).toUpperCase() +
                                bill.status?.slice(1)}
                            </span>
                            {(bill.status === 'paid' || bill.status === 'partial') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReceipt(bill.id);
                                }}
                                className="p-1.5 rounded-lg bg-cyan-100 text-cyan-600 hover:bg-cyan-600 hover:text-white transition-colors"
                                title="View Receipt"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(bill.billDate || bill.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {getPaymentModeLabel(bill.paymentMode)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-gray-900">
                            {formatCurrency(bill.totalAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Balance</p>
                          <p
                            className={`font-bold ${
                              bill.balance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {formatCurrency(bill.balance)}
                          </p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-500 transition-transform ${
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
                    <div className="border-t border-gray-200 bg-gray-50">
                      {isLoadingThis ? (
                        <div className="flex justify-center py-12">
                          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : selectedBill ? (
                        <div className="p-4">
                          {/* Add Service Button */}
                          {canMakePayment &&
                            selectedBill.status !== 'paid' &&
                            selectedBill.Attendance?.id && (
                              <div className="mb-4 flex justify-end">
                                <button
                                  onClick={() => setShowAddServiceModal(true)}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-700 hover:text-white transition-colors text-sm"
                                >
                                  <PlusCircle className="w-4 h-4" />
                                  Add Miscellaneous Charge
                                </button>
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
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                                  {getCategoryIcon(category)}
                                  <h3 className="font-semibold text-gray-900">
                                    {category}
                                  </h3>
                                  <span className="text-xs text-gray-500">
                                    ({items.length} items)
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-white">
                                      <tr className="border-b border-gray-200">
                                        <th className="px-3 py-2 w-8">
                                          {unpaidItems.length > 0 && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleCategorySelection(items);
                                              }}
                                              className="text-gray-500 hover:text-gray-700"
                                            >
                                              {allSelected ? (
                                                <CheckSquare className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Square className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                                          Service
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                                          Qty
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                                          Unit Price
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                                          Total
                                        </th>
                                        {!isCashPayment && (
                                          <>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                                              Insurance
                                            </th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                                              Patient Pays
                                            </th>
                                          </>
                                        )}
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                                          Paid
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                                          Balance
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {items.map((item) => (
                                        <tr
                                          key={item.id}
                                          className={`hover:bg-gray-50 transition-colors ${
                                            item.isFullyPaid ? 'opacity-60' : ''
                                          }`}
                                        >
                                          <td className="px-3 py-2">
                                            {item.isFullyPaid ? (
                                              <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : item.patientPayableAmount > 0 &&
                                              canMakePayment ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleItemSelection(item.id);
                                                }}
                                                className="text-gray-500 hover:text-gray-700"
                                              >
                                                {selectedItems.has(item.id) ? (
                                                  <CheckSquare className="w-4 h-4 text-green-600" />
                                                ) : (
                                                  <Square className="w-4 h-4" />
                                                )}
                                              </button>
                                            ) : null}
                                          </td>
                                          <td className="px-3 py-2">
                                            <p className="text-sm text-gray-900">
                                              {item.description}
                                            </p>
                                            {item.serviceCatalog?.code && (
                                              <p className="text-xs text-gray-500">
                                                Code: {item.serviceCatalog.code}
                                              </p>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-center text-sm text-gray-500">
                                            {item.quantity}
                                          </td>
                                          <td className="px-3 py-2 text-right text-sm text-gray-500">
                                            {formatCurrency(item.unitPrice)}
                                          </td>
                                          <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                                            {formatCurrency(item.lineTotal)}
                                          </td>
                                          {!isCashPayment && (
                                            <>
                                              <td className="px-3 py-2 text-right text-sm text-green-600">
                                                {formatCurrency(
                                                  item.insuranceCoveredAmount
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-right text-sm font-bold text-cyan-600">
                                                {formatCurrency(
                                                  item.patientPayableAmount
                                                )}
                                              </td>
                                            </>
                                          )}
                                          <td className="px-3 py-2 text-right text-sm text-green-600">
                                            {formatCurrency(item.paidAmount || 0)}
                                          </td>
                                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">
                                            {formatCurrency(
                                              item.balance || item.patientPayableAmount
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            {item.isFullyPaid ? (
                                              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                                <CheckCircle className="w-3 h-3" /> Paid
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                                <AlertCircle className="w-3 h-3" /> Pending
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                      <tr className="border-t border-gray-200">
                                        <td
                                          colSpan={5}
                                          className="px-3 py-2 text-right font-semibold text-gray-900"
                                        >
                                          Category Total:
                                        </td>
                                        {!isCashPayment && (
                                          <td className="px-3 py-2 text-right text-sm text-green-600">
                                            {formatCurrency(
                                              items.reduce(
                                                (s, i) => s + i.insuranceCoveredAmount,
                                                0
                                              )
                                            )}
                                          </td>
                                        )}
                                        <td className="px-3 py-2 text-right font-bold text-cyan-600">
                                          {formatCurrency(
                                            items.reduce(
                                              (s, i) => s + i.patientPayableAmount,
                                              0
                                            )
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right text-green-600">
                                          {formatCurrency(
                                            items.reduce(
                                              (s, i) => s + (i.paidAmount || 0),
                                              0
                                            )
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-red-600">
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
                            <div className="mt-6 pt-4 border-t-2 border-gray-200">
                              {selectedItems.size > 0 && canMakePayment && (
                                <div className="mb-4 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                                  <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                      <CheckSquare className="w-4 h-4 text-cyan-600" />
                                      <span className="text-sm font-medium text-cyan-700">
                                        {selectedItems.size} item(s) selected for payment
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-600">
                                        Total to pay:
                                      </span>
                                      <span className="font-bold text-gray-900 ml-2">
                                        {formatCurrency(selectedItemsTotal)}
                                      </span>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                      <button
                                        onClick={selectAllUnpaid}
                                        className="px-3 py-1.5 text-sm bg-white text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors border border-cyan-200"
                                      >
                                        Select All Unpaid
                                      </button>
                                      <button
                                        onClick={deselectAll}
                                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                      >
                                        Deselect All
                                      </button>
                                      <button
                                        onClick={handleOpenPaymentModal}
                                        className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-opacity flex items-center gap-2"
                                      >
                                        <DollarSign className="w-4 h-4" /> Make Payment
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end">
                                <div className="w-full md:w-96 space-y-2">
                                  <div className="flex justify-between py-1">
                                    <span className="text-gray-500">Subtotal:</span>
                                    <span className="font-medium text-gray-900">
                                      {formatCurrency(totals.subtotal)}
                                    </span>
                                  </div>
                                  {!isCashPayment && (
                                    <div className="flex justify-between py-1">
                                      <span className="text-gray-500">
                                        Insurance Coverage:
                                      </span>
                                      <span className="text-green-600 font-medium">
                                        – {formatCurrency(totals.insuranceCovered)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between py-2 border-t border-gray-200">
                                    <span className="font-bold text-gray-900">
                                      Patient Payable:
                                    </span>
                                    <span className="font-bold text-cyan-600 text-lg">
                                      {formatCurrency(totals.patientPayable)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1">
                                    <span className="text-gray-500">Amount Paid:</span>
                                    <span className="font-medium text-green-600">
                                      {formatCurrency(totals.totalPaid)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-2 border-t border-gray-200">
                                    <span className="font-bold text-gray-900">
                                      Balance Due:
                                    </span>
                                    <span
                                      className={`font-bold text-lg ${
                                        totals.balance > 0
                                          ? 'text-red-600'
                                          : 'text-green-600'
                                      }`}
                                    >
                                      {formatCurrency(totals.balance)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {!isCashPayment && selectedBill.InsuranceProvider && (
                                <div className="mt-4 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-cyan-600" />
                                    <span className="text-sm font-semibold text-gray-900">
                                      Insurance Details
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                                    <p>
                                      Provider:{' '}
                                      <span className="font-medium text-gray-900">
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
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to{' '}
                  {Math.min(startIndex + itemsPerPage, patientBills.length)} of{' '}
                  {patientBills.length} bills
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2)
                      pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-cyan-100 text-cyan-700 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex justify-between">
              <h3 className="font-bold text-lg">Add Miscellaneous Charge</h3>
              <button
                onClick={() => {
                  setShowAddServiceModal(false);
                  setSelectedServices(new Set());
                  setServiceSearchTerm('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by service name or code..."
                  value={serviceSearchTerm}
                  onChange={(e) => setServiceSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1 border rounded-lg">
                {servicesLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No services found
                  </div>
                ) : (
                  filteredServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
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
                        <div className="text-xs text-gray-500">
                          Code: {service.code} | Price:{' '}
                          {formatCurrency(service.pricing?.cashPrice || 0)}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="border-t p-4 flex gap-3">
              <button
                onClick={handleAddServices}
                disabled={selectedServices.size === 0 || addingServices}
                className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-700 hover:text-white disabled:opacity-50"
              >
                {addingServices
                  ? 'Adding...'
                  : `Add ${selectedServices.size} Service(s)`}
              </button>
              <button
                onClick={() => {
                  setShowAddServiceModal(false);
                  setSelectedServices(new Set());
                  setServiceSearchTerm('');
                }}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Process Payment</h2>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
                  <p className="text-sm font-medium text-cyan-700 mb-2">
                    Paying for {selectedItems.size} item(s)
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedBill.BillLineItem?.filter((i) =>
                      selectedItems.has(i.id)
                    ).map((item) => (
                      <div
                        key={item.id}
                        className="text-xs text-gray-600 flex justify-between"
                      >
                        <span>{item.description}</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(item.patientPayableAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount to Pay
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
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
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {formatCurrency(selectedItemsTotal)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {method.replace('_', ' ')}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number{' '}
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, Check No., etc."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    placeholder="Additional payment notes..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all resize-none text-sm"
                  />
                </div>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Selected Items:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(selectedItemsTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amount to Pay:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(paymentAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-500">Remaining Balance:</span>
                    <span className="font-medium text-yellow-600">
                      {formatCurrency(selectedItemsTotal - paymentAmount)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessPayment}
                    disabled={
                      isProcessingPayment ||
                      paymentAmount <= 0 ||
                      paymentAmount > selectedItemsTotal
                    }
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" /> Process Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}