// src/pages/PatientBillingItems.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { 
  ArrowLeft, Receipt, DollarSign, CreditCard, Eye, Printer,
  ChevronLeft, ChevronRight, FileText, User, Calendar, 
  Shield, CheckCircle, Clock, AlertCircle, X, Search,
  RefreshCw, TrendingUp, Wallet, Activity, Pill, Stethoscope,
  Microscope, Scan, Syringe, ClipboardList, Hospital, 
  CheckSquare, Square, Trash2, MinusCircle, PlusCircle,
  Download, Loader2, CreditCard as CreditCardIcon
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
  serviceCatalog?: {
    name: string;
    code: string;
  };
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

interface PaymentItem {
  billLineItemId: string;
  description: string;
  amount: number;
  balance: number;
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
  
  // Payment selection states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const { bills, isLoading, getBills, currentBill, getBill, clearCurrentBill, addPaymentToBill } = useBillingStore();
  const { patients, loadPatients } = usePatientStore();

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          getBills({ patientId }),
          loadPatients()
        ]);
      } catch (error) {
        console.error('Error loading patient billing data:', error);
        toastError('Error', 'Failed to load patient billing information');
      }
    };
    loadData();
  }, [patientId]);

  // Get patient details
  const patient = useMemo(() => {
    return patients.find(p => p.id === patientId);
  }, [patients, patientId]);

  // Filter bills for this patient
  const patientBills = useMemo(() => {
    let filtered = bills.filter(bill => bill.patientId === patientId);
    
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(bill => 
        bill.billNumber?.toLowerCase().includes(lower) ||
        bill.status?.toLowerCase().includes(lower)
      );
    }
    
    return filtered.sort((a, b) => 
      new Date(b.billDate || b.createdAt).getTime() - new Date(a.billDate || a.createdAt).getTime()
    );
  }, [bills, patientId, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(patientBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBills = patientBills.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fetch bill details with line items
  const handleViewBillDetails = useCallback(async (billId: string) => {
    setIsLoadingItems(true);
    try {
      await getBill(billId);
    } catch (error) {
      console.error('Error loading bill details:', error);
      toastError('Error', 'Failed to load bill details');
    } finally {
      setIsLoadingItems(false);
    }
  }, [getBill, toastError]);

  // Use currentBill from store
  useEffect(() => {
    if (currentBill) {
      // Process line items to add payment tracking
      const processedBill = {
        ...currentBill,
        BillLineItem: currentBill.BillLineItem?.map((item: any) => {
          // Calculate if this item is paid based on bill payments
          // This is simplified - in reality you'd track per-item payments
          const isFullyPaid = currentBill.status === 'paid';
          return {
            ...item,
            paidAmount: isFullyPaid ? item.patientPayableAmount : 0,
            balance: isFullyPaid ? 0 : item.patientPayableAmount,
            isFullyPaid,
            serviceCategory: item.serviceType || 'miscellaneous'
          };
        }) || []
      };
      setSelectedBill(processedBill as ProcessedBill);
      setExpandedBillId(currentBill.id);
      // Reset selections when new bill is loaded
      setSelectedItems(new Set());
    }
  }, [currentBill]);

  // Clear selected bill when navigating away
  useEffect(() => {
    return () => {
      clearCurrentBill();
    };
  }, [clearCurrentBill]);

  const toggleBillExpand = (billId: string) => {
    if (expandedBillId === billId) {
      setExpandedBillId(null);
      setSelectedBill(null);
    } else {
      handleViewBillDetails(billId);
    }
  };

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Group line items by service category
  const groupedItems = useMemo(() => {
    if (!selectedBill?.BillLineItem) return {};
    
    const groups: Record<string, BillLineItem[]> = {
      'Consultation': [],
      'Laboratory Tests': [],
      'Scans & Imaging': [],
      'Medications': [],
      'Procedures': [],
      'Ward & Accommodation': [],
      'Other Services': []
    };
    
    const categoryMapping: Record<string, string> = {
      'consultation': 'Consultation',
      'lab_test': 'Laboratory Tests',
      'scan': 'Scans & Imaging',
      'medication': 'Medications',
      'procedure': 'Procedures',
      'ward': 'Ward & Accommodation'
    };
    
    selectedBill.BillLineItem.forEach(item => {
      if (!item.isVoided) {
        const mappedCategory = categoryMapping[item.serviceType?.toLowerCase()] || 'Other Services';
        if (!groups[mappedCategory]) {
          groups[mappedCategory] = [];
        }
        groups[mappedCategory].push(item);
      }
    });
    
    // Remove empty categories
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });
    
    return groups;
  }, [selectedBill]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!selectedBill) return null;
    
    const allItems = selectedBill.BillLineItem?.filter(i => !i.isVoided) || [];
    const subtotal = allItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const insuranceCovered = allItems.reduce((sum, i) => sum + i.insuranceCoveredAmount, 0);
    const patientPayable = allItems.reduce((sum, i) => sum + i.patientPayableAmount, 0);
    const totalPaid = selectedBill.paidAmount || 0;
    const balance = selectedBill.balance || 0;
    
    return { subtotal, insuranceCovered, patientPayable, totalPaid, balance };
  }, [selectedBill]);

  // Calculate selected items total
  const selectedItemsTotal = useMemo(() => {
    if (!selectedBill || selectedItems.size === 0) return 0;
    
    let total = 0;
    selectedBill.BillLineItem?.forEach(item => {
      if (!item.isVoided && selectedItems.has(item.id) && !item.isFullyPaid) {
        total += item.patientPayableAmount;
      }
    });
    return total;
  }, [selectedBill, selectedItems]);

  // Handle item selection
  const toggleItemSelection = (itemId: string, patientPayable: number, isFullyPaid: boolean) => {
    if (isFullyPaid) return;
    
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Select all unpaid items
  const selectAllUnpaid = () => {
    if (!selectedBill) return;
    
    const unpaidItemIds = selectedBill.BillLineItem
      ?.filter(item => !item.isVoided && !item.isFullyPaid && item.patientPayableAmount > 0)
      .map(item => item.id) || [];
    
    setSelectedItems(new Set(unpaidItemIds));
    // Update payment amount to total of selected items
    const total = unpaidItemIds.reduce((sum, id) => {
      const item = selectedBill.BillLineItem?.find(i => i.id === id);
      return sum + (item?.patientPayableAmount || 0);
    }, 0);
    setPaymentAmount(total);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedItems(new Set());
    setPaymentAmount(0);
  };

  // Open payment modal
  const handleOpenPaymentModal = () => {
    if (selectedItems.size === 0) {
      toastError('No items selected', 'Please select at least one item to pay for');
      return;
    }
    setPaymentAmount(selectedItemsTotal);
    setIsPaymentModalOpen(true);
  };

  // Process payment
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
      // Call the API to add payment
      await addPaymentToBill(selectedBill.id, {
        amount: paymentAmount,
        paymentMethod,
        reference: paymentReference || `PAY-${Date.now()}`,
        notes: paymentNotes || `Payment for selected items (${selectedItems.size} items)`
      });
      
      // Close modal and reset
      setIsPaymentModalOpen(false);
      setSelectedItems(new Set());
      setPaymentAmount(0);
      setPaymentReference('');
      setPaymentNotes('');
      setPaymentMethod('cash');
      
      // Refresh bill data
      await handleViewBillDetails(selectedBill.id);
      
      success('Payment Successful', `Payment of ${formatCurrency(paymentAmount)} has been processed`);
      
      // Generate and show receipt
      await generateAndShowReceipt();
      
    } catch (error: any) {
      console.error('Payment failed:', error);
      toastError('Payment Failed', error.message || 'Failed to process payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Generate receipt using your existing infrastructure
  const generateAndShowReceipt = async () => {
    if (!selectedBill || !patient) return;
    
    try {
      // Call your receipt generation endpoint
      const response = await fetch(`/api/documents/receipt/${selectedBill.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.filePath) {
        // Open the receipt in a new window for printing
        const receiptWindow = window.open(data.data.filePath, '_blank');
        if (receiptWindow) {
          receiptWindow.focus();
        }
      } else {
        // Fallback: Generate HTML receipt
        const receiptHtml = generateSimpleReceiptHTML(selectedBill, patient, {
          amount: paymentAmount,
          method: paymentMethod,
          reference: paymentReference,
          date: new Date()
        });
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(receiptHtml);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      // Fallback: Simple receipt
      const receiptHtml = generateSimpleReceiptHTML(selectedBill, patient, {
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentReference,
        date: new Date()
      });
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  // Get icon for service category
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, JSX.Element> = {
      'Consultation': <Stethoscope className="w-5 h-5 text-blue-500" />,
      'Laboratory Tests': <Microscope className="w-5 h-5 text-purple-500" />,
      'Scans & Imaging': <Scan className="w-5 h-5 text-indigo-500" />,
      'Medications': <Pill className="w-5 h-5 text-green-500" />,
      'Procedures': <Syringe className="w-5 h-5 text-red-500" />,
      'Ward & Accommodation': <Hospital className="w-5 h-5 text-teal-500" />
    };
    return icons[category] || <ClipboardList className="w-5 h-5 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
      case 'partial': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
      case 'pending': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
    }
  };

  const getPaymentModeLabel = (mode: string) => {
    const modeMap: Record<string, string> = {
      'cash': 'Cash',
      'nhis': 'NHIS',
      'private_insurance': 'Private Insurance'
    };
    return modeMap[mode] || 'Cash';
  };

  const formatDate = (dateString: string) => {
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
  };

  const formatCurrency = (amount: number) => {
    return `₵${amount?.toFixed(2) || '0.00'}`;
  };

  const canMakePayment = hasRole(['admin', 'accounts']);

  if (isLoading && !patientBills.length) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Billing Items</h1>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--bg-main)] rounded animate-pulse w-48"></div>
                  <div className="h-3 bg-[var(--bg-main)] rounded animate-pulse w-32"></div>
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
          <Link
            to="/dashboard/billing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
          >
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
            <Link
              to="/dashboard/billing"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Billing
            </Link>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Billing Items</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            View and manage all billable items for {patient?.surname} {patient?.otherNames}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {patientBills.length} bill(s) • Folder: {patient?.folderNumber}
          </p>
        </div>
        <button
          onClick={() => {
            getBills({ patientId });
            loadPatients();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
        >
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
                <h2 className="font-semibold text-[var(--text-primary)]">
                  {patient.surname} {patient.otherNames}
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
            <div className="flex gap-2">
              <Link
                to={`/dashboard/patients/${patient.id}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                View Profile
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {patientBills.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: FileText, label: 'Total Bills', value: patientBills.length, color: 'cyan' },
            { icon: DollarSign, label: 'Total Amount', value: formatCurrency(patientBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0)), color: 'blue' },
            { icon: Wallet, label: 'Total Paid', value: formatCurrency(patientBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0)), color: 'green' },
            { icon: TrendingUp, label: 'Outstanding', value: formatCurrency(patientBills.reduce((sum, b) => sum + (b.balance || 0), 0)), color: 'red' },
          ].map((stat, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 bg-[var(--icon-${stat.color === 'red' ? 'red' : stat.color === 'green' ? 'green' : 'cyan'}-bg)] rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 text-[var(--icon-${stat.color === 'red' ? 'red' : stat.color === 'green' ? 'green' : 'cyan'}-text)]`} />
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

      {/* Search Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by bill number or status..."
                className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-[var(--bg-card)] text-sm placeholder-[var(--text-tertiary)]"
              />
            </div>
          </div>
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
          </select>
        </div>
      </div>

      {/* Bills List with Expandable Details */}
      {patientBills.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <Receipt className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No Bills Found' : 'No Billing Records'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {searchQuery 
              ? 'No bills match your search criteria.'
              : 'This patient has no associated bills yet.'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm"
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
                <div key={bill.id} className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                  {/* Bill Header - Click to expand */}
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
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                              {bill.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {bill.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                              {bill.status === 'partial' && <AlertCircle className="w-3 h-3 mr-1" />}
                              {bill.status?.charAt(0).toUpperCase() + bill.status?.slice(1)}
                            </span>
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
                          <p className="text-sm text-[var(--text-secondary)]">Total</p>
                          <p className="font-bold text-[var(--text-primary)]">{formatCurrency(bill.totalAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[var(--text-secondary)]">Balance</p>
                          <p className={`font-bold ${bill.balance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>
                            {formatCurrency(bill.balance)}
                          </p>
                        </div>
                        <div className="text-[var(--text-secondary)]">
                          <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content - Itemized Bill with Categories */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                      {isLoadingThis ? (
                        <div className="flex justify-center py-12">
                          <div className="w-8 h-8 border-2 border-[var(--icon-cyan-bg)] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : selectedBill ? (
                        <div className="p-4">
                          {/* Grouped Categories */}
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
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] w-8">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const allUnpaid = items.filter(i => !i.isFullyPaid && i.patientPayableAmount > 0);
                                            const allSelected = allUnpaid.every(i => selectedItems.has(i.id));
                                            if (allSelected) {
                                              allUnpaid.forEach(i => selectedItems.delete(i.id));
                                              setSelectedItems(new Set(selectedItems));
                                            } else {
                                              allUnpaid.forEach(i => selectedItems.add(i.id));
                                              setSelectedItems(new Set(selectedItems));
                                            }
                                          }}
                                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                          {items.filter(i => !i.isFullyPaid && i.patientPayableAmount > 0).length > 0 && (
                                            items.filter(i => !i.isFullyPaid && i.patientPayableAmount > 0).every(i => selectedItems.has(i.id)) 
                                              ? <CheckSquare className="w-4 h-4 text-green-600" />
                                              : <Square className="w-4 h-4" />
                                          )}
                                        </button>
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Service</th>
                                      <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">Qty</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Unit Price</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Total</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Insurance</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Patient Pays</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Paid</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">Balance</th>
                                      <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--border-color)]">
                                    {items.map((item) => (
                                      <tr key={item.id} className={`hover:bg-[var(--bg-card)] ${item.isFullyPaid ? 'opacity-60' : ''}`}>
                                        <td className="px-3 py-2">
                                          {!item.isFullyPaid && item.patientPayableAmount > 0 && canMakePayment && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleItemSelection(item.id, item.patientPayableAmount, item.isFullyPaid);
                                              }}
                                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                            >
                                              {selectedItems.has(item.id) ? (
                                                <CheckSquare className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Square className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}
                                          {item.isFullyPaid && <CheckCircle className="w-4 h-4 text-green-600" />}
                                        </td>
                                        <td className="px-3 py-2">
                                          <div>
                                            <p className="text-sm text-[var(--text-primary)]">{item.description}</p>
                                            {item.serviceCatalog?.code && (
                                              <p className="text-xs text-[var(--text-secondary)]">Code: {item.serviceCatalog.code}</p>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-[var(--text-secondary)]">{item.quantity}</td>
                                        <td className="px-3 py-2 text-right text-sm text-[var(--text-secondary)]">{formatCurrency(item.unitPrice)}</td>
                                        <td className="px-3 py-2 text-right text-sm font-medium text-[var(--text-primary)]">{formatCurrency(item.lineTotal)}</td>
                                        <td className="px-3 py-2 text-right text-sm text-green-600">{formatCurrency(item.insuranceCoveredAmount)}</td>
                                        <td className="px-3 py-2 text-right text-sm font-bold text-blue-600">{formatCurrency(item.patientPayableAmount)}</td>
                                        <td className="px-3 py-2 text-right text-sm text-green-600">{formatCurrency(item.paidAmount || 0)}</td>
                                        <td className="px-3 py-2 text-right text-sm font-bold text-red-600">{formatCurrency(item.balance || item.patientPayableAmount)}</td>
                                        <td className="px-3 py-2 text-center">
                                          {item.isFullyPaid ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                              <CheckCircle className="w-3 h-3" />
                                              Paid
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                              <AlertCircle className="w-3 h-3" />
                                              Pending
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-[var(--bg-card)]">
                                    <tr className="border-t border-[var(--border-color)]">
                                      <td colSpan={5} className="px-3 py-2 text-right font-semibold text-[var(--text-primary)]">Category Total:</td>
                                      <td className="px-3 py-2 text-right text-sm text-green-600">{formatCurrency(items.reduce((sum, i) => sum + i.insuranceCoveredAmount, 0))}</td>
                                      <td className="px-3 py-2 text-right font-bold text-blue-600">{formatCurrency(items.reduce((sum, i) => sum + i.patientPayableAmount, 0))}</td>
                                      <td className="px-3 py-2 text-right text-green-600">{formatCurrency(items.reduce((sum, i) => sum + (i.paidAmount || 0), 0))}</td>
                                      <td className="px-3 py-2 text-right font-bold text-red-600">{formatCurrency(items.reduce((sum, i) => sum + (i.balance || i.patientPayableAmount), 0))}</td>
                                      <td></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          ))}

                          {/* Bill Summary Footer */}
                          {totals && (
                            <div className="mt-6 pt-4 border-t-2 border-[var(--border-color)]">
                              {/* Selection Summary */}
                              {selectedItems.size > 0 && canMakePayment && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                      <CheckSquare className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm font-medium text-blue-800">
                                        {selectedItems.size} item(s) selected for payment
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-blue-600">Total to pay:</span>
                                      <span className="font-bold text-blue-800 ml-2">{formatCurrency(selectedItemsTotal)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={selectAllUnpaid}
                                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
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
                                        className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                      >
                                        <DollarSign className="w-4 h-4" />
                                        Make Payment
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end">
                                <div className="w-full md:w-96 space-y-2">
                                  <div className="flex justify-between py-1">
                                    <span className="text-[var(--text-secondary)]">Subtotal:</span>
                                    <span className="font-medium text-[var(--text-primary)]">{formatCurrency(totals.subtotal)}</span>
                                  </div>
                                  <div className="flex justify-between py-1">
                                    <span className="text-[var(--text-secondary)]">Insurance Coverage:</span>
                                    <span className="text-green-600 font-medium">- {formatCurrency(totals.insuranceCovered)}</span>
                                  </div>
                                  <div className="flex justify-between py-2 border-t border-[var(--border-color)]">
                                    <span className="font-bold text-[var(--text-primary)]">Patient Payable:</span>
                                    <span className="font-bold text-blue-600 text-lg">{formatCurrency(totals.patientPayable)}</span>
                                  </div>
                                  <div className="flex justify-between py-1">
                                    <span className="text-[var(--text-secondary)]">Amount Paid:</span>
                                    <span className="font-medium text-green-600">{formatCurrency(totals.totalPaid)}</span>
                                  </div>
                                  <div className="flex justify-between py-2 border-t border-[var(--border-color)]">
                                    <span className="font-bold text-[var(--text-primary)]">Balance Due:</span>
                                    <span className={`font-bold text-lg ${totals.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {formatCurrency(totals.balance)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Insurance Info */}
                              {selectedBill.InsuranceProvider && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-semibold text-gray-900">Insurance Details</span>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                                    <p>Provider: <span className="font-medium">{selectedBill.InsuranceProvider.name}</span></p>
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
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, patientBills.length)} of {patientBills.length} bills
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Process Payment</h2>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Selected Items Summary */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800 mb-2">
                    Paying for {selectedItems.size} item(s)
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedBill.BillLineItem?.filter(i => selectedItems.has(i.id)).map(item => (
                      <div key={item.id} className="text-xs text-blue-700 flex justify-between">
                        <span>{item.description}</span>
                        <span>{formatCurrency(item.patientPayableAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount to Pay
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₵</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      max={selectedItemsTotal}
                      step={0.01}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Maximum: {formatCurrency(selectedItemsTotal)}</p>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['cash', 'mobile_money', 'card', 'bank_transfer'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                          paymentMethod === method
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, Check No., etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Notes (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    placeholder="Additional payment notes..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Selected Items:</span>
                    <span className="font-medium">{formatCurrency(selectedItemsTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount to Pay:</span>
                    <span className="font-bold text-green-600">{formatCurrency(paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Remaining Balance:</span>
                    <span className="font-medium text-orange-600">{formatCurrency(selectedItemsTotal - paymentAmount)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment || paymentAmount <= 0 || paymentAmount > selectedItemsTotal}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        Process Payment
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

// Simple receipt HTML generator (fallback)
function generateSimpleReceiptHTML(bill: ProcessedBill, patient: any, payment: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${bill.billNumber}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0f766e; padding-bottom: 20px; }
    .hospital-name { font-size: 24px; font-weight: bold; color: #0f766e; }
    .receipt-title { font-size: 18px; margin-top: 10px; color: #555; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .info-item { margin: 10px 0; }
    .info-label { font-weight: bold; color: #555; }
    .amount-section { background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; }
    .amount { font-size: 32px; font-weight: bold; color: #16a34a; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="hospital-name">Veridian Hospital Management System</div>
    <div class="receipt-title">OFFICIAL PAYMENT RECEIPT</div>
  </div>
  
  <div class="info-grid">
    <div>
      <div class="info-item"><span class="info-label">Receipt No:</span> ${payment.reference || `REC-${Date.now()}`}</div>
      <div class="info-item"><span class="info-label">Date:</span> ${new Date().toLocaleString()}</div>
      <div class="info-item"><span class="info-label">Bill No:</span> ${bill.billNumber}</div>
    </div>
    <div>
      <div class="info-item"><span class="info-label">Patient:</span> ${patient.surname} ${patient.otherNames}</div>
      <div class="info-item"><span class="info-label">Folder No:</span> ${patient.folderNumber}</div>
      <div class="info-item"><span class="info-label">Payment Method:</span> ${payment.method.toUpperCase()}</div>
    </div>
  </div>
  
  <div class="amount-section">
    <div>Amount Paid</div>
    <div class="amount">₵${payment.amount.toFixed(2)}</div>
  </div>
  
  <div class="footer">
    <p>Thank you for your payment. This is an official receipt from Veridian Hospital.</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
}