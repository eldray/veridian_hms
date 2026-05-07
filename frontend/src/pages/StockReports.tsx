// src/pages/StockReports.tsx - COMPLETE FIXED VERSION
import { useEffect, useState } from 'react';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { 
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  DollarSign,
  Building,
  FileText,
  Download,
  RefreshCw,
  BarChart3,
  X,
  ChevronLeft,
  ChevronRight,
  Printer,
  Boxes,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ReportType = 
  | 'stock-status'
  | 'stock-movement'
  | 'expiry'
  | 'financial'
  | 'usage'
  | 'supplier'
  | 'requisition';

interface ReportConfig {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const reportConfigs: ReportConfig[] = [
  {
    id: 'stock-status',
    name: 'Stock Status Report',
    description: 'Current stock levels, low stock alerts, and inventory summary',
    icon: <Package className="w-5 h-5" />,
    color: 'cyan'
  },
  {
    id: 'stock-movement',
    name: 'Stock Movement Report',
    description: 'Daily/weekly/monthly stock in/out transactions',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'green'
  },
  {
    id: 'expiry',
    name: 'Expiry Report',
    description: 'Items expiring soon and expired products',
    icon: <Calendar className="w-5 h-5" />,
    color: 'yellow'
  },
  {
    id: 'financial',
    name: 'Financial Report',
    description: 'Inventory value, COGS, and purchase summary',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'purple'
  },
  {
    id: 'usage',
    name: 'Usage Report',
    description: 'Most dispensed items and consumption trends',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'blue'
  },
  {
    id: 'supplier',
    name: 'Supplier Report',
    description: 'Purchase history and spending by supplier',
    icon: <Building className="w-5 h-5" />,
    color: 'orange'
  },
  {
    id: 'requisition',
    name: 'Requisition Report',
    description: 'Department requisitions and fulfillment rates',
    icon: <FileText className="w-5 h-5" />,
    color: 'indigo'
  }
];

export default function StockReports() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const {
    getStockValueSummary,
    getExpiryReport,
    getMovementSummary,
    getUsageReport,
    getSupplierReport,
    getRequisitionSummary,
    isLoading
  } = useStockStore();

  const [selectedReport, setSelectedReport] = useState<ReportType>('stock-status');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [period, setPeriod] = useState('month');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = hasRole(['admin', 'pharmacist', 'accounts']);

  const generateReport = async () => {
    setGenerating(true);
    try {
      let data = null;
      
      switch (selectedReport) {
        case 'stock-status':
          data = await getStockValueSummary();
          break;
        case 'stock-movement':
          data = await getMovementSummary(dateRange.startDate || undefined, dateRange.endDate || undefined);
          break;
        case 'expiry':
          data = await getExpiryReport(30);
          break;
        case 'financial':
          data = await getStockValueSummary();
          break;
        case 'usage':
          data = await getUsageReport(period, 20);
          break;
        case 'supplier':
          data = await getSupplierReport();
          break;
        case 'requisition':
          data = await getRequisitionSummary(dateRange.startDate || undefined, dateRange.endDate || undefined);
          break;
      }
      
      setReportData(data);
      success('Report generated', `${reportConfigs.find(r => r.id === selectedReport)?.name} is ready`);
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      toastError('Generation failed', err.message || 'Could not generate report');
    } finally {
      setGenerating(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await generateReport();
    } finally {
      setRefreshing(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;
    
    let headers: string[] = [];
    let rows: any[][] = [];
    
    switch (selectedReport) {
      case 'stock-status':
        if (reportData.lowStockItems) {
          headers = ['Item Name', 'Category', 'Current Stock', 'Reorder Level', 'Cost Price'];
          rows = reportData.lowStockItems.map((item: any) => [
            item.name, item.category, item.currentStock, item.reorderLevel, item.costPrice
          ]);
        } else if (reportData.byCategory) {
          headers = ['Category', 'Count', 'Value'];
          rows = Object.entries(reportData.byCategory).map(([cat, data]: [string, any]) => [
            cat, data.count, data.value.toFixed(2)
          ]);
        }
        break;
      case 'stock-movement':
        if (reportData.topMovements) {
          headers = ['Item', 'Quantity', 'Type'];
          rows = reportData.topMovements.map((item: any) => [item.name, item.quantity, item.type]);
        }
        break;
      case 'expiry':
        if (reportData.expiringSoon) {
          headers = ['Item Name', 'Category', 'Expiry Date', 'Current Stock'];
          rows = reportData.expiringSoon.map((item: any) => [
            item.name, item.category, new Date(item.expiryDate).toLocaleDateString(), item.currentStock
          ]);
        }
        break;
      case 'supplier':
        if (reportData.suppliers) {
          headers = ['Supplier', 'Total Spent', 'Invoices', 'Last Order'];
          rows = reportData.suppliers.map((s: any) => [
            s.name, s.totalSpent?.toFixed(2), s.invoiceCount, new Date(s.lastOrderDate).toLocaleDateString()
          ]);
        }
        break;
      case 'requisition':
        if (reportData.byDepartment) {
          headers = ['Department', 'Total', 'Fulfilled', 'Items'];
          rows = reportData.byDepartment.map((dept: any) => [
            dept.name, dept.total, dept.fulfilled, dept.items
          ]);
        }
        break;
      case 'usage':
        if (reportData.topItems) {
          headers = ['Item', 'Category', 'Quantity', 'Transactions'];
          rows = reportData.topItems.map((item: any) => [
            item.name, item.category, item.quantity, item.transactions
          ]);
        }
        break;
      case 'financial':
        if (reportData.byCategory) {
          headers = ['Category', 'Count', 'Value'];
          rows = Object.entries(reportData.byCategory).map(([cat, data]: [string, any]) => [
            cat, data.count, data.value.toFixed(2)
          ]);
        }
        break;
    }

    if (rows.length === 0) {
      toastError('Export failed', 'No data to export');
      return;
    }

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    success('Exported', 'Report exported to CSV');
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const reportName = reportConfigs.find(r => r.id === selectedReport)?.name;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportName} - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #1a56db; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1a56db; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportName}</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        <pre>${JSON.stringify(reportData, null, 2)}</pre>
        <div class="footer">
          <p>Confidential - Internal Use Only</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Render summary cards for financial/stock-status reports
  const renderSummaryCards = () => {
    if (!reportData) return null;
    
    const summaryItems = [];
    
    if (selectedReport === 'financial' || selectedReport === 'stock-status') {
      if (reportData.totalItems !== undefined) {
        summaryItems.push({ label: 'Total Items', value: reportData.totalItems, color: 'cyan' });
      }
      if (reportData.medications !== undefined) {
        summaryItems.push({ label: 'Medications', value: reportData.medications, color: 'green' });
      }
      if (reportData.totalValue !== undefined) {
        summaryItems.push({ label: 'Total Value', value: `₵${reportData.totalValue.toFixed(2)}`, color: 'purple' });
      }
      if (reportData.lowStockItems !== undefined) {
        summaryItems.push({ label: 'Low Stock', value: reportData.lowStockItems, color: 'red' });
      }
      if (reportData.outOfStockItems !== undefined) {
        summaryItems.push({ label: 'Out of Stock', value: reportData.outOfStockItems, color: 'red' });
      }
      if (reportData.expiringSoon !== undefined) {
        summaryItems.push({ label: 'Expiring Soon', value: reportData.expiringSoon, color: 'yellow' });
      }
    }
    
    if (selectedReport === 'requisition' && reportData.summary) {
      const statuses = reportData.summary.byStatus || {};
      summaryItems.push({ label: 'Total Requisitions', value: reportData.summary.total || 0, color: 'cyan' });
      summaryItems.push({ label: 'Submitted', value: statuses.submitted || 0, color: 'blue' });
      summaryItems.push({ label: 'Approved', value: statuses.approved || 0, color: 'green' });
      summaryItems.push({ label: 'Fulfilled', value: statuses.fulfilled || 0, color: 'purple' });
      summaryItems.push({ label: 'Fulfillment Rate', value: reportData.summary.fulfillmentRate || '0%', color: 'green' });
    }
    
    if (selectedReport === 'supplier' && reportData.summary) {
      summaryItems.push({ label: 'Total Suppliers', value: reportData.summary.totalSuppliers || 0, color: 'cyan' });
      summaryItems.push({ label: 'Total Spent', value: `₵${(reportData.summary.totalSpent || 0).toFixed(2)}`, color: 'green' });
      summaryItems.push({ label: 'Total Invoices', value: reportData.summary.totalInvoices || 0, color: 'purple' });
    }
    
    if (selectedReport === 'stock-movement' && reportData.summary) {
      summaryItems.push({ label: 'Total Transactions', value: reportData.summary.totalTransactions || 0, color: 'cyan' });
      summaryItems.push({ label: 'Stock In', value: reportData.summary.totalIn || 0, color: 'green' });
      summaryItems.push({ label: 'Stock Out', value: reportData.summary.totalOut || 0, color: 'red' });
      summaryItems.push({ label: 'Purchases', value: reportData.summary.byType?.purchases || 0, color: 'purple' });
    }
    
    if (selectedReport === 'expiry' && reportData.summary) {
      summaryItems.push({ label: 'Total with Expiry', value: reportData.summary.totalWithExpiry || 0, color: 'cyan' });
      summaryItems.push({ label: 'Expiring Soon', value: reportData.summary.expiringSoon || 0, color: 'yellow' });
      summaryItems.push({ label: 'Expired', value: reportData.summary.expired || 0, color: 'red' });
      summaryItems.push({ label: 'Expiring Value', value: `₵${(reportData.summary.expiringValue || 0).toFixed(2)}`, color: 'purple' });
    }
    
    if (selectedReport === 'usage' && reportData.summary) {
      summaryItems.push({ label: 'Items Dispensed', value: reportData.summary.totalItemsDispensed || 0, color: 'cyan' });
      summaryItems.push({ label: 'Total Quantity', value: reportData.summary.totalQuantity || 0, color: 'green' });
      if (reportData.summary.topItem) {
        summaryItems.push({ label: 'Top Item', value: reportData.summary.topItem.name || 'N/A', color: 'purple' });
      }
    }
    
    if (summaryItems.length === 0) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summaryItems.map((item, idx) => {
          const colorMap: Record<string, string> = {
            cyan: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
            green: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
            red: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
            yellow: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
            purple: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
            blue: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',
          };
          return (
            <div key={idx} className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
              <p className={`text-xl font-bold ${colorMap[item.color] || 'text-[var(--text-primary)]'}`}>
                {item.value}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Stock Reports</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Generate and export inventory analytics reports
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={generating || refreshing || isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 transition-all text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${(refreshing || isLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {reportData && (
            <>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={printReport}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportConfigs.map(report => {
          const colorMap: Record<string, string> = {
            cyan: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
            green: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
            yellow: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
            purple: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
            blue: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',
            orange: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]',
            indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
          };
          
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-4 rounded-xl border transition-all text-left ${
                selectedReport === report.id
                  ? 'border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)]'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[report.color]}`}>
                {report.icon}
              </div>
              <h3 className={`font-semibold text-sm ${selectedReport === report.id ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)]'}`}>
                {report.name}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                {report.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {(selectedReport === 'stock-movement' || selectedReport === 'requisition') && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
              />
            </div>
            <button
              onClick={generateReport}
              className="px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Period Selector for Usage Report */}
      {selectedReport === 'usage' && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Period</label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 3 Months</option>
                <option value="year">Last Year</option>
              </select>
            </div>
            <button
              onClick={generateReport}
              className="px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              Apply Period
            </button>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={generateReport}
          disabled={generating || isLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 transition-all text-sm font-medium"
        >
          {generating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4" />
          )}
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {/* Report Display */}
      {generating || (isLoading && !reportData) ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center border border-[var(--border-color)]">
          <RefreshCw className="w-12 h-12 text-[var(--icon-cyan-text)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Generating report...</p>
        </div>
      ) : reportData ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {reportConfigs.find(r => r.id === selectedReport)?.name}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Generated on {new Date().toLocaleString()}
            </p>
          </div>

          <div className="p-6">
            {/* Summary Cards */}
            {renderSummaryCards()}

            {/* Stock Status - Low Stock Items Table */}
            {selectedReport === 'stock-status' && reportData.lowStockItems && reportData.lowStockItems.length > 0 && (
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--icon-red-text)]" />
                  Low Stock Items
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-center">Stock</th>
                        <th className="px-3 py-2 text-center">Reorder</th>
                        <th className="px-3 py-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.lowStockItems.map((item: any, idx: number) => (
                        <tr key={idx} className="border-t border-[var(--border-color)]">
                          <td className="px-3 py-2 font-medium">{item.name}</td>
                          <td className="px-3 py-2 capitalize">{item.category}</td>
                          <td className="px-3 py-2 text-center text-[var(--icon-red-text)]">{item.currentStock}</td>
                          <td className="px-3 py-2 text-center">{item.reorderLevel}</td>
                          <td className="px-3 py-2 text-right">₵{item.costPrice?.toFixed(2) || '0.00'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stock Status - Category Summary */}
            {selectedReport === 'stock-status' && reportData.byCategory && (
              <div className="mt-6">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  Category Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-center">Count</th>
                        <th className="px-3 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.byCategory).map(([cat, data]: [string, any], idx: number) => (
                        <tr key={idx} className="border-t border-[var(--border-color)]">
                          <td className="px-3 py-2 font-medium">{cat}</td>
                          <td className="px-3 py-2 text-center">{data.count}</td>
                          <td className="px-3 py-2 text-right">₵{data.value.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stock Movement - Top Items */}
            {selectedReport === 'stock-movement' && reportData.topMovements && reportData.topMovements.length > 0 && (
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--icon-green-text)]" />
                  Top Moving Items
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-center">Quantity</th>
                        <th className="px-3 py-2 text-left">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topMovements.map((item: any, idx: number) => (
                        <tr key={idx} className="border-t border-[var(--border-color)]">
                          <td className="px-3 py-2 font-medium">{item.name}</td>
                          <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                          <td className="px-3 py-2 capitalize">{item.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Expiry Report */}
            {selectedReport === 'expiry' && reportData.expiringSoon && reportData.expiringSoon.length > 0 && (
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--icon-yellow-text)]" />
                  Expiring Within {reportData.reportPeriod || 30} Days
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Expiry Date</th>
                        <th className="px-3 py-2 text-center">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.expiringSoon.map((item: any, idx: number) => (
                        <tr key={idx} className="border-t border-[var(--border-color)]">
                          <td className="px-3 py-2 font-medium">{item.name}</td>
                          <td className="px-3 py-2 capitalize">{item.category}</td>
                          <td className="px-3 py-2 text-[var(--icon-yellow-text)]">
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-center">{item.currentStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Supplier Report */}
            {selectedReport === 'supplier' && reportData.suppliers && reportData.suppliers.length > 0 && (
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-[var(--icon-orange-text)]" />
                  Supplier Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Supplier</th>
                        <th className="px-3 py-2 text-right">Total Spent</th>
                        <th className="px-3 py-2 text-center">Invoices</th>
                        <th className="px-3 py-2 text-left">Last Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.suppliers.map((supplier: any, idx: number) => (
                        <tr key={idx} className="border-t border-[var(--border-color)]">
                          <td className="px-3 py-2 font-medium">{supplier.name}</td>
                          <td className="px-3 py-2 text-right text-[var(--icon-green-text)]">
                            ₵{supplier.totalSpent?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-3 py-2 text-center">{supplier.invoiceCount || 0}</td>
                          <td className="px-3 py-2">{supplier.lastOrderDate ? new Date(supplier.lastOrderDate).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Usage Report */}
            {selectedReport === 'usage' && reportData.topItems && reportData.topItems.length > 0 && (
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--icon-blue-text)]" />
                  Most Dispensed Items ({period})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-center">Quantity</th>
                        <th className="px-3 py-2 text-center">Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topItems.map((item: any, idx: number) => (
                        <tr key={idx} className="border-t border-[var(--border-color)]">
                          <td className="px-3 py-2 font-medium">{item.name}</td>
                          <td className="px-3 py-2 capitalize">{item.category || 'N/A'}</td>
                          <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                          <td className="px-3 py-2 text-center">{item.transactions || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Requisition Report - By Department */}
            {selectedReport === 'requisition' && reportData.byDepartment && reportData.byDepartment.length > 0 && (
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--icon-indigo-text)]" />
                  Requisitions by Department
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Department</th>
                        <th className="px-3 py-2 text-center">Total</th>
                        <th className="px-3 py-2 text-center">Fulfilled</th>
                        <th className="px-3 py-2 text-center">Items</th>
                        <th className="px-3 py-2 text-center">Fulfillment Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.byDepartment.map((dept: any, idx: number) => (
                        <tr key={idx} className="border-t border-[var(--border-color)]">
                          <td className="px-3 py-2 font-medium">{dept.name}</td>
                          <td className="px-3 py-2 text-center">{dept.total}</td>
                          <td className="px-3 py-2 text-center text-[var(--icon-green-text)]">{dept.fulfilled}</td>
                          <td className="px-3 py-2 text-center">{dept.items}</td>
                          <td className="px-3 py-2 text-center">
                            {dept.total > 0 ? Math.round((dept.fulfilled / dept.total) * 100) : 0}%
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Requisition Report - Status Summary */}
            {selectedReport === 'requisition' && reportData.summary?.byStatus && (
              <div className="mt-6">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  Status Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Object.entries(reportData.summary.byStatus).map(([status, count]: [string, any]) => {
                    const colorMap: Record<string, string> = {
                      draft: 'bg-[var(--icon-gray-bg)] text-[var(--icon-gray-text)]',
                      submitted: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',
                      approved: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
                      fulfilled: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
                      cancelled: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
                    };
                    return (
                      <div key={status} className={`rounded-lg p-3 text-center border ${colorMap[status] || 'bg-[var(--bg-main)]'}`}>
                        <p className="text-2xl font-bold">{String(count)}</p>
                        <p className="text-xs capitalize">{status}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Data Message */}
            {selectedReport === 'stock-status' && (!reportData.lowStockItems || reportData.lowStockItems.length === 0) && (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                <Package className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
                <p>No low stock items found</p>
                <p className="text-sm mt-1">All inventory levels are healthy</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center border border-[var(--border-color)]">
          <BarChart3 className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Report Generated</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Select a report type and click "Generate Report" to view data
          </p>
        </div>
      )}
    </div>
  );
}