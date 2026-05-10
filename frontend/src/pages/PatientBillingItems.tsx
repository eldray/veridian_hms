// src/pages/PatientBillingItems.tsx - FIXED VERSION (No JSX errors)
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useDocumentStore } from '../store/documentStore';
import { openPrintWindow, generatePDF } from '../utils/pdfGenerator';
import {
  ArrowLeft, Receipt, DollarSign, CreditCard, Eye, Printer,
  ChevronLeft, ChevronRight, FileText, User, Calendar,
  Shield, CheckCircle, Clock, AlertCircle, X, Search,
  RefreshCw, TrendingUp, Wallet, Activity, Pill, Stethoscope,
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
  const { success, error: toastError } = useToast();
  const { hasRole } = useAuthStore();

  const [selectedBill, setSelectedBill] = useState<ProcessedBill | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Payment related states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Add service modal states
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [addingServices, setAddingServices] = useState(false);

  // Store hooks
  const {
    bills, isLoading, getBills,
    currentBill, getBill, clearCurrentBill, addPaymentToBill,
    generateBillFromAttendance
  } = useBillingStore();
  
  const { serviceCatalog, getServiceCatalog, isLoading: servicesLoading } = useMedicalServicesStore();
  const { patients, loadPatients } = usePatientStore();
  const { generateReceipt } = useDocumentStore();

  const canMakePayment = hasRole(['admin', 'accounts']);
  const isCashPayment = selectedBill?.paymentMode === 'cash';

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          getBills({ patientId }), 
          loadPatients(), 
          getServiceCatalog({ isActive: true, limit: 1000 })
        ]);
      } catch {
        toastError('Error', 'Failed to load patient billing information');
      }
    };
    loadData();
  }, [patientId]);

  const patient = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId]
  );

  const patientBills = useMemo(() => {
    let filtered = bills.filter((b) => b.patientId === patientId);
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
  }, [bills, patientId, searchQuery]);

  const totalPages = Math.ceil(patientBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBills = patientBills.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // Bill detail fetch
  const handleViewBillDetails = useCallback(
    async (billId: string) => {
      setIsLoadingItems(true);
      try {
        await getBill(billId);
      } catch {
        toastError('Error', 'Failed to load bill details');
      } finally {
        setIsLoadingItems(false);
      }
    },
    [getBill, toastError]
  );

  useEffect(() => {
    if (currentBill) {
      const processedBill: ProcessedBill = {
        ...currentBill,
        BillLineItem:
          currentBill.BillLineItem?.map((item: any) => ({
            ...item,
            paidAmount: currentBill.status === 'paid' ? item.patientPayableAmount : 0,
            balance: currentBill.status === 'paid' ? 0 : item.patientPayableAmount,
            isFullyPaid: currentBill.status === 'paid',
            serviceCategory: item.serviceType || 'miscellaneous',
          })) || [],
      };
      setSelectedBill(processedBill);
      setExpandedBillId(currentBill.id);
    }
  }, [currentBill]);

  useEffect(() => () => { clearCurrentBill(); }, [clearCurrentBill]);

  const toggleBillExpand = (billId: string) => {
    if (expandedBillId === billId) {
      setExpandedBillId(null);
      setSelectedBill(null);
    } else {
      handleViewBillDetails(billId);
    }
  };

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Grouped line items
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

  // Totals
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

  // Item selection helpers
  const toggleItemSelection = (itemId: string, _amount: number, isFullyPaid: boolean) => {
    if (isFullyPaid) return;
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const selectAllUnpaid = () => {
    if (!selectedBill) return;
    const ids = selectedBill.BillLineItem?.filter(
      (i) => !i.isVoided && !i.isFullyPaid && i.patientPayableAmount > 0
    ).map((i) => i.id) || [];
    setSelectedItems(new Set(ids));
    setPaymentAmount(
      ids.reduce((s, id) => {
        const item = selectedBill.BillLineItem?.find((i) => i.id === id);
        return s + (item?.patientPayableAmount || 0);
      }, 0)
    );
  };

  const deselectAll = () => { setSelectedItems(new Set()); setPaymentAmount(0); };

  const handleOpenPaymentModal = () => {
    if (selectedItems.size === 0) {
      toastError('No items selected', 'Please select at least one item to pay for');
      return;
    }
    setPaymentAmount(selectedItemsTotal);
    setIsPaymentModalOpen(true);
  };

  // Add service to bill
  const addServiceToAttendance = async (attendanceId: string, data: any) => {
    // This function should call your API to add service to attendance
    // For now, we'll use the existing store method
    const response = await fetch(`/api/attendances/${attendanceId}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  };

  const handleAddServices = async () => {
    if (!selectedBill || selectedServices.size === 0) return;
    
    setAddingServices(true);
    try {
      for (const serviceId of selectedServices) {
        await addServiceToAttendance(selectedBill.Attendance?.id, {
          serviceCatalogId: serviceId,
          quantity: 1
        });
      }
      
      await generateBillFromAttendance(selectedBill.Attendance?.id);
      await handleViewBillDetails(selectedBill.id);
      
      success('Services Added', `${selectedServices.size} service(s) added to bill`);
      setShowAddServiceModal(false);
      setSelectedServices(new Set());
      setServiceSearchTerm('');
    } catch (err: any) {
      toastError('Failed', err.message);
    } finally {
      setAddingServices(false);
    }
  };

  // Payment processing
  const handleProcessPayment = async () => {
    if (!selectedBill || selectedItems.size === 0) return;
    if (paymentAmount <= 0) {
      toastError('Invalid amount', 'Please enter a valid payment amount');
      return;
    }
    if (paymentAmount > selectedItemsTotal) {
      toastError('Amount too high', `Maximum payment amount is ${formatCurrency(selectedItemsTotal)}`);
      return;
    }

    setIsProcessingPayment(true);
    try {
      await addPaymentToBill(selectedBill.id, {
        amount: paymentAmount,
        paymentMethod,
        reference: paymentReference || `PAY-${Date.now()}`,
        notes: paymentNotes || `Payment for selected items (${selectedItems.size} items)`,
      });

      setIsPaymentModalOpen(false);
      setSelectedItems(new Set());
      setPaymentAmount(0);
      setPaymentReference('');
      setPaymentNotes('');
      setPaymentMethod('cash');

      await handleViewBillDetails(selectedBill.id);
      success('Payment Successful', `Payment of ${formatCurrency(paymentAmount)} has been processed`);
      
      await generateAndShowReceipt();
    } catch (err: any) {
      toastError('Payment Failed', err.message || 'Failed to process payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const generateAndShowReceipt = async () => {
    if (!selectedBill) return;
    try {
      const result = await generateReceipt(selectedBill.id);
      if (result.success && result.data) {
        const hospitalInfo = {
          name: result.data.hospitalName || 'Veridian Hospital',
          address: result.data.hospitalAddress || '123 Main Street, Accra, Ghana',
          phone: result.data.hospitalPhone || '+233 123 456 789',
          email: result.data.hospitalEmail || 'info@veridianhospital.com'
        };
        
        const receiptData = {
          bill: selectedBill,
          patient: selectedBill.Patient,
          payment: {
            amount: paymentAmount,
            paymentMethod: paymentMethod,
            receiptNumber: `RCP-${Date.now()}`,
            paymentDate: new Date().toISOString(),
            receivedBy: result.data.receivedBy || 'System'
          },
          hospital: hospitalInfo
        };
        
        const html = generatePDF('receipt', receiptData, hospitalInfo);
        openPrintWindow(html, `Receipt-${selectedBill.billNumber}`);
      } else {
        toastError('Error', result.message || 'Failed to generate receipt');
      }
    } catch (err) {
      console.error('Receipt generation error:', err);
      toastError('Error', 'Could not generate receipt');
    }
  };

  // Add this after your existing generateAndShowReceipt function
const handleViewReceipt = async (billId: string) => {
  setIsLoadingItems(true);
  try {
    // First get the full bill details if not already loaded
    let billToReceipt = selectedBill;
    if (expandedBillId !== billId) {
      await getBill(billId);
      billToReceipt = currentBill;
    }
    
    if (!billToReceipt) {
      toastError('Error', 'Could not load bill details');
      return;
    }

    const result = await generateReceipt(billId);
    if (result.success && result.data) {
      const hospitalInfo = {
        name: result.data.hospitalName || 'Veridian Hospital',
        address: result.data.hospitalAddress || '123 Main Street, Accra, Ghana',
        phone: result.data.hospitalPhone || '+233 123 456 789',
        email: result.data.hospitalEmail || 'info@veridianhospital.com'
      };
      
      // Get the latest payment info for this bill
      const latestPayment = billToReceipt.payments?.[billToReceipt.payments.length - 1];
      
      const receiptData = {
        bill: billToReceipt,
        patient: billToReceipt.Patient,
        payment: latestPayment ? {
          amount: latestPayment.amount,
          paymentMethod: latestPayment.paymentMethod,
          receiptNumber: latestPayment.reference || `RCP-${Date.now()}`,
          paymentDate: latestPayment.transactionDate,
          receivedBy: 'System'
        } : null,
        hospital: hospitalInfo
      };
      
      const html = generatePDF('receipt', receiptData, hospitalInfo);
      openPrintWindow(html, `Receipt-${billToReceipt.billNumber}`);
    } else {
      toastError('Error', result.message || 'Failed to generate receipt');
    }
  } catch (err) {
    console.error('Receipt generation error:', err);
    toastError('Error', 'Could not generate receipt');
  } finally {
    setIsLoadingItems(false);
  }
};

  // UI helpers
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, JSX.Element> = {
      Consultation: <Stethoscope className="w-5 h-5 text-[var(--icon-cyan-text)]" />,
      'Laboratory Tests': <Microscope className="w-5 h-5 text-[var(--icon-purple-text)]" />,
      'Scans & Imaging': <Scan className="w-5 h-5 text-[var(--icon-yellow-text)]" />,
      Medications: <Pill className="w-5 h-5 text-[var(--icon-green-text)]" />,
      Procedures: <Syringe className="w-5 h-5 text-[var(--icon-red-text)]" />,
      'Ward & Accommodation': <Hospital className="w-5 h-5 text-[var(--icon-orange-text)]" />,
    };
    return icons[category] ?? <ClipboardList className="w-5 h-5 text-[var(--text-secondary)]" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
      case 'partial': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
      case 'pending': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
    }
  };

  const getPaymentModeLabel = (mode: string) =>
    ({ cash: 'Cash', nhis: 'NHIS', private_insurance: 'Private Insurance' }[mode] ?? 'Cash');

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Invalid Date'; }
  };

  const formatCurrency = (amount: number) => `₵${amount?.toFixed(2) ?? '0.00'}`;

  const filteredServices = serviceCatalog.filter(s =>
    s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(serviceSearchTerm.toLowerCase())
  );

  // Loading skeleton
  if (isLoading && !patientBills.length) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Billing Items</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--bg-main)] rounded animate-pulse w-48" />
                  <div className="h-3 bg-[var(--bg-main)] rounded animate-pulse w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!patient && !isLoading) {
    return (
      <div className="p-6">
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h3>
          <Link to="/dashboard/billing" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
            Back to Billing
          </Link>
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
            <Link to="/dashboard/billing" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Billing
            </Link>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Billing Items</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            View and manage all billable items for {patient?.surname} {patient?.otherNames}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {patientBills.length} bill(s) · Folder: {patient?.folderNumber}
          </p>
        </div>
        <button onClick={() => { getBills({ patientId }); loadPatients(); }} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Patient Info Card */}
      {patient && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-[var(--icon-cyan-text)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--text-primary)]">{patient.surname} {patient.otherNames}</h2>
                <div className="flex flex-wrap gap-3 mt-1">
                  <span className="text-xs text-[var(--text-secondary)]">Folder: {patient.folderNumber}</span>
                  {patient.contact && <span className="text-xs text-[var(--text-secondary)]">Contact: {patient.contact}</span>}
                </div>
              </div>
            </div>
            <Link to={`/dashboard/patients/${patient.id}`} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors text-sm">
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
            { icon: FileText, label: 'Total Bills', value: patientBills.length, bg: 'bg-[var(--icon-cyan-bg)]', text: 'text-[var(--icon-cyan-text)]' },
            { icon: DollarSign, label: 'Total Amount', value: formatCurrency(patientBills.reduce((s, b) => s + (b.totalAmount || 0), 0)), bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]' },
            { icon: Wallet, label: 'Total Paid', value: formatCurrency(patientBills.reduce((s, b) => s + (b.paidAmount || 0), 0)), bg: 'bg-[var(--icon-green-bg)]', text: 'text-[var(--icon-green-text)]' },
            { icon: TrendingUp, label: 'Outstanding', value: formatCurrency(patientBills.reduce((s, b) => s + (b.balance || 0), 0)), bg: 'bg-[var(--icon-red-bg)]', text: 'text-[var(--icon-red-text)]' },
          ].map((stat, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.text}`} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">{stat.label}</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Per-page */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by bill number or status..." className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all bg-[var(--bg-card)] text-sm placeholder-[var(--text-tertiary)]" />
            </div>
          </div>
          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] transition-all bg-[var(--bg-card)] text-[var(--text-primary)] text-sm">
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
          </select>
        </div>
      </div>

      {/* Bills List */}
      {patientBills.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <Receipt className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No Bills Found' : 'No Billing Records'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {searchQuery ? 'No bills match your search criteria.' : 'This patient has no associated bills yet.'}
          </p>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm">
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
                <div key={bill.id} className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                  {/* Bill header row */}
                  <div className="p-4 cursor-pointer hover:bg-[var(--bg-main)] transition-colors" onClick={() => toggleBillExpand(bill.id)}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[var(--text-primary)]">{bill.billNumber}</p>
                            
                            {/* Status Badge - moved outside the button container */}
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                              {bill.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {bill.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                              {bill.status === 'partial' && <AlertCircle className="w-3 h-3 mr-1" />}
                              {bill.status?.charAt(0).toUpperCase() + bill.status?.slice(1)}
                            </span>
                            
                            {/* Receipt Button - now properly placed outside the status badge */}
                            {(bill.status === 'paid' || bill.status === 'partial') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent expanding/collapsing
                                  handleViewReceipt(bill.id);
                                }}
                                className="p-1.5 rounded-lg bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors"
                                title="View Receipt"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
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
                          <p className="text-xs text-[var(--text-secondary)]">Total</p>
                          <p className="font-bold text-[var(--text-primary)]">{formatCurrency(bill.totalAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[var(--text-secondary)]">Balance</p>
                          <p className={`font-bold ${bill.balance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>
                            {formatCurrency(bill.balance)}
                          </p>
                        </div>
                        <svg className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded bill detail */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                      {isLoadingThis ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin" /></div>
                      ) : selectedBill ? (
                        <div className="p-4">

                          {/* Add Service Button */}
                          {canMakePayment && selectedBill.status !== 'paid' && (
                            <div className="mb-4 flex justify-end">
                              <button onClick={() => setShowAddServiceModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors text-sm">
                                <PlusCircle className="w-4 h-4" />
                                Add Miscellaneous Charge
                              </button>
                            </div>
                          )}

                          {/* Grouped categories */}
                          {Object.entries(groupedItems).map(([category, items]) => (
                            <div key={category} className="mb-6 last:mb-0">
                              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border-color)]">
                                {getCategoryIcon(category)}
                                <h3 className="font-semibold text-[var(--text-primary)]">{category}</h3>
                                <span className="text-xs text-[var(--text-secondary)]">({items.length} items)</span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-[var(--bg-card)]">
                                    <tr className="border-b border-[var(--border-color)]">
                                      <th className="px-3 py-2 w-8">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const unpaid = items.filter((i) => !i.isFullyPaid && i.patientPayableAmount > 0);
                                            const allSel = unpaid.every((i) => selectedItems.has(i.id));
                                            setSelectedItems((prev) => {
                                              const next = new Set(prev);
                                              unpaid.forEach((i) => (allSel ? next.delete(i.id) : next.add(i.id)));
                                              return next;
                                            });
                                          }}
                                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                          {items.filter((i) => !i.isFullyPaid && i.patientPayableAmount > 0).length > 0 &&
                                            (items.filter((i) => !i.isFullyPaid && i.patientPayableAmount > 0).every((i) => selectedItems.has(i.id)) ? (
                                              <CheckSquare className="w-4 h-4 text-[var(--icon-green-text)]" />
                                            ) : (
                                              <Square className="w-4 h-4" />
                                            ))}
                                        </button>
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Service</th>
                                      <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">Qty</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Unit Price</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Total</th>
                                      {!isCashPayment && (
                                        <>
                                          <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Insurance</th>
                                          <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Patient Pays</th>
                                        </>
                                      )}
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Paid</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Balance</th>
                                      <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--border-color)]">
                                    {items.map((item) => (
                                      <tr key={item.id} className={`hover:bg-[var(--bg-card)] transition-colors ${item.isFullyPaid ? 'opacity-60' : ''}`}>
                                        <td className="px-3 py-2">
                                          {item.isFullyPaid ? (
                                            <CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />
                                          ) : !item.isFullyPaid && item.patientPayableAmount > 0 && canMakePayment ? (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleItemSelection(item.id, item.patientPayableAmount, item.isFullyPaid);
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
                                        <td className="px-3 py-2">
                                          <p className="text-sm text-[var(--text-primary)]">{item.description}</p>
                                          {item.serviceCatalog?.code && <p className="text-xs text-[var(--text-secondary)]">Code: {item.serviceCatalog.code}</p>}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-[var(--text-secondary)]">{item.quantity}</td>
                                        <td className="px-3 py-2 text-right text-sm text-[var(--text-secondary)]">{formatCurrency(item.unitPrice)}</td>
                                        <td className="px-3 py-2 text-right text-sm font-medium text-[var(--text-primary)]">{formatCurrency(item.lineTotal)}</td>
                                        {!isCashPayment && (
                                          <>
                                            <td className="px-3 py-2 text-right text-sm text-[var(--icon-green-text)]">{formatCurrency(item.insuranceCoveredAmount)}</td>
                                            <td className="px-3 py-2 text-right text-sm font-bold text-[var(--icon-cyan-text)]">{formatCurrency(item.patientPayableAmount)}</td>
                                          </>
                                        )}
                                        <td className="px-3 py-2 text-right text-sm text-[var(--icon-green-text)]">{formatCurrency(item.paidAmount || 0)}</td>
                                        <td className="px-3 py-2 text-right text-sm font-bold text-[var(--icon-red-text)]">{formatCurrency(item.balance || item.patientPayableAmount)}</td>
                                        <td className="px-3 py-2 text-center">
                                          {item.isFullyPaid ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-[var(--icon-green-text)]"><CheckCircle className="w-3 h-3" /> Paid</span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-[var(--icon-red-text)]"><AlertCircle className="w-3 h-3" /> Pending</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-[var(--bg-card)]">
                                    <tr className="border-t border-[var(--border-color)]">
                                      <td colSpan={5} className="px-3 py-2 text-right font-semibold text-[var(--text-primary)]">Category Total:</td>
                                      {!isCashPayment && (
                                        <td className="px-3 py-2 text-right text-sm text-[var(--icon-green-text)]">{formatCurrency(items.reduce((s, i) => s + i.insuranceCoveredAmount, 0))}</td>
                                      )}
                                      <td className="px-3 py-2 text-right font-bold text-[var(--icon-cyan-text)]">{formatCurrency(items.reduce((s, i) => s + i.patientPayableAmount, 0))}</td>
                                      <td className="px-3 py-2 text-right text-[var(--icon-green-text)]">{formatCurrency(items.reduce((s, i) => s + (i.paidAmount || 0), 0))}</td>
                                      <td className="px-3 py-2 text-right font-bold text-[var(--icon-red-text)]">{formatCurrency(items.reduce((s, i) => s + (i.balance || i.patientPayableAmount), 0))}</td>
                                      <td />
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          ))}

                          {/* Bill summary footer */}
                          {totals && (
                            <div className="mt-6 pt-4 border-t-2 border-[var(--border-color)]">
                              {/* Selected items payment bar */}
                              {selectedItems.size > 0 && canMakePayment && (
                                <div className="mb-4 p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--border-color)]">
                                  <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                      <CheckSquare className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                                      <span className="text-sm font-medium text-[var(--icon-cyan-text)]">{selectedItems.size} item(s) selected for payment</span>
                                    </div>
                                    <div className="text-sm"><span className="text-[var(--text-secondary)]">Total to pay:</span><span className="font-bold text-[var(--text-primary)] ml-2">{formatCurrency(selectedItemsTotal)}</span></div>
                                    <div className="flex gap-2 flex-wrap">
                                      <button onClick={selectAllUnpaid} className="px-3 py-1.5 text-sm bg-[var(--bg-card)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--bg-main)] transition-colors border border-[var(--border-color)]">Select All Unpaid</button>
                                      <button onClick={deselectAll} className="px-3 py-1.5 text-sm bg-[var(--bg-main)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--border-color)] transition-colors">Deselect All</button>
                                      <button onClick={handleOpenPaymentModal} className="px-4 py-1.5 text-sm bg-[var(--icon-green-text)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"><DollarSign className="w-4 h-4" /> Make Payment</button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Totals table */}
                              <div className="flex justify-end">
                                <div className="w-full md:w-96 space-y-2">
                                  <div className="flex justify-between py-1"><span className="text-[var(--text-secondary)]">Subtotal:</span><span className="font-medium text-[var(--text-primary)]">{formatCurrency(totals.subtotal)}</span></div>
                                  {!isCashPayment && (
                                    <div className="flex justify-between py-1"><span className="text-[var(--text-secondary)]">Insurance Coverage:</span><span className="text-[var(--icon-green-text)] font-medium">– {formatCurrency(totals.insuranceCovered)}</span></div>
                                  )}
                                  <div className="flex justify-between py-2 border-t border-[var(--border-color)]"><span className="font-bold text-[var(--text-primary)]">Patient Payable:</span><span className="font-bold text-[var(--icon-cyan-text)] text-lg">{formatCurrency(totals.patientPayable)}</span></div>
                                  <div className="flex justify-between py-1"><span className="text-[var(--text-secondary)]">Amount Paid:</span><span className="font-medium text-[var(--icon-green-text)]">{formatCurrency(totals.totalPaid)}</span></div>
                                  <div className="flex justify-between py-2 border-t border-[var(--border-color)]"><span className="font-bold text-[var(--text-primary)]">Balance Due:</span><span className={`font-bold text-lg ${totals.balance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>{formatCurrency(totals.balance)}</span></div>
                                </div>
                              </div>

                              {/* Insurance detail - only show for NHIS/Private */}
                              {!isCashPayment && selectedBill.InsuranceProvider && (
                                <div className="mt-4 p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--border-color)]">
                                  <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[var(--icon-cyan-text)]" /><span className="text-sm font-semibold text-[var(--text-primary)]">Insurance Details</span></div>
                                  <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
                                    <p>Provider: <span className="font-medium text-[var(--text-primary)]">{selectedBill.InsuranceProvider.name}</span></p>
                                    <p>Coverage: {selectedBill.InsuranceProvider.coveragePercentage}%</p>
                                    <p>Covered Amount: {formatCurrency(totals?.insuranceCovered || 0)}</p>
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
            <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-[var(--text-secondary)]">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, patientBills.length)} of {patientBills.length} bills</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => goToPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'}`}>{pageNum}</button>
                    );
                  })}
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-[var(--border-color)]">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-3 flex justify-between">
              <h3 className="font-bold text-lg">Add Miscellaneous Charge</h3>
              <button onClick={() => { setShowAddServiceModal(false); setSelectedServices(new Set()); setServiceSearchTerm(''); }} className="p-1 hover:bg-[var(--bg-main)] rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input type="text" placeholder="Search by service name or code..." value={serviceSearchTerm} onChange={(e) => setServiceSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1 border rounded-lg">
                {servicesLoading ? (
                  <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-secondary)]">No services found</div>
                ) : (
                  filteredServices.map(service => (
                    <label key={service.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-main)] cursor-pointer">
                      <input type="checkbox" checked={selectedServices.has(service.id)} onChange={(e) => {
                        const newSet = new Set(selectedServices);
                        if (e.target.checked) newSet.add(service.id);
                        else newSet.delete(service.id);
                        setSelectedServices(newSet);
                      }} className="rounded" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{service.name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Code: {service.code} | Price: {formatCurrency(service.pricing?.cashPrice || 0)}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="border-t p-4 flex gap-3">
              <button onClick={handleAddServices} disabled={selectedServices.size === 0 || addingServices} className="flex-1 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50">
                {addingServices ? 'Adding...' : `Add ${selectedServices.size} Service(s)`}
              </button>
              <button onClick={() => { setShowAddServiceModal(false); setSelectedServices(new Set()); setServiceSearchTerm(''); }} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
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
                <div className="flex items-center gap-3"><div className="w-9 h-9 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5 text-[var(--icon-green-text)]" /></div><h2 className="text-lg font-bold text-[var(--text-primary)]">Process Payment</h2></div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="bg-[var(--icon-cyan-bg)] rounded-lg p-3 border border-[var(--border-color)]">
                  <p className="text-sm font-medium text-[var(--icon-cyan-text)] mb-2">Paying for {selectedItems.size} item(s)</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedBill.BillLineItem?.filter((i) => selectedItems.has(i.id)).map((item) => (
                      <div key={item.id} className="text-xs text-[var(--text-secondary)] flex justify-between"><span>{item.description}</span><span className="font-medium text-[var(--text-primary)]">{formatCurrency(item.patientPayableAmount)}</span></div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Amount to Pay</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm">₵</span>
                    <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} max={selectedItemsTotal} step={0.01} className="w-full pl-8 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm" />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Maximum: {formatCurrency(selectedItemsTotal)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['cash', 'mobile_money', 'card', 'bank_transfer'].map((method) => (
                      <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${paymentMethod === method ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--border-color)]'}`}>{method.replace('_', ' ')}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Reference Number <span className="text-[var(--text-tertiary)] font-normal">(Optional)</span></label>
                  <input type="text" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Transaction ID, Check No., etc." className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes <span className="text-[var(--text-tertiary)] font-normal">(Optional)</span></label>
                  <textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} placeholder="Additional payment notes..." className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all resize-none text-sm" />
                </div>
                <div className="bg-[var(--bg-main)] rounded-lg p-3 space-y-2 border border-[var(--border-color)]">
                  <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Total Selected Items:</span><span className="font-medium text-[var(--text-primary)]">{formatCurrency(selectedItemsTotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Amount to Pay:</span><span className="font-bold text-[var(--icon-green-text)]">{formatCurrency(paymentAmount)}</span></div>
                  <div className="flex justify-between text-sm pt-2 border-t border-[var(--border-color)]"><span className="text-[var(--text-secondary)]">Remaining Balance:</span><span className="font-medium text-[var(--icon-yellow-text)]">{formatCurrency(selectedItemsTotal - paymentAmount)}</span></div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 px-4 py-2.5 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] transition-colors text-sm font-medium">Cancel</button>
                  <button onClick={handleProcessPayment} disabled={isProcessingPayment || paymentAmount <= 0 || paymentAmount > selectedItemsTotal} className="flex-1 px-4 py-2.5 bg-[var(--icon-green-text)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium">
                    {isProcessingPayment ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><DollarSign className="w-4 h-4" /> Process Payment</>}
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