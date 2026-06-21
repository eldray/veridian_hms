// src/utils/pdfTemplates/billStatementPDF.ts - REDESIGNED TO MATCH LAB RESULTS STYLE
import type { Bill, Patient, Hospital } from '../types';

export const generateBillStatementHTML = (
  bill: any,
  patient: any,
  hospital: any
): string => {
  // Format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateShort = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Format currency
  const formatCurrency = (amount: any) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'GHS 0.00';
    return `GHS ${num.toFixed(2)}`;
  };

  // Helper to escape HTML
  const escapeHtml = (text: string): string => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Helper to get patient name
  const getPatientName = (p: any) => {
    if (p?.fullName) return p.fullName;
    if (p?.surname && p?.otherNames) return `${p.surname} ${p.otherNames}`;
    if (p?.name) return p.name;
    return 'Unknown Patient';
  };

  // Get hospital info
  const hospitalName = hospital?.name || 'Veridian Hospital';
  const hospitalAddress = hospital?.address || '123 Medical Center Drive, Accra, Ghana';
  const hospitalPhone = hospital?.phone || '+233-24-123-4567';
  const hospitalEmail = hospital?.email || 'info@veridianhospital.gov.gh';

  // Get patient info
  const patientName = getPatientName(patient);
  const patientId = patient?.folderNumber || patient?.id || 'N/A';
  const patientContact = patient?.contact || patient?.phone || patient?.mobile || 'N/A';
  const patientAge = patient?.age || patient?.ageYears || 'N/A';
  const patientGender = patient?.gender || 'N/A';

  // Get bill items
  const billItems = bill?.BillLineItem || bill?.items || [];
  
  // Get payments
  const payments = bill?.payments || bill?.Payments || bill?.paymentHistory || [];

  // Get status badge class
  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      paid: 'status-paid',
      pending: 'status-pending',
      partial: 'status-partial',
      cancelled: 'status-cancelled',
      voided: 'status-cancelled',
    };
    return statusMap[status?.toLowerCase()] || 'status-pending';
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      paid: 'PAID',
      pending: 'PENDING',
      partial: 'PARTIAL',
      cancelled: 'CANCELLED',
      voided: 'VOIDED',
    };
    return statusMap[status?.toLowerCase()] || status?.toUpperCase() || 'PENDING';
  };

  // Generate items HTML
  const generateItemsHTML = () => {
    if (!billItems || billItems.length === 0) {
      return `
        <tr>
          <td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">
            <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
            No items found in this bill
          </td>
        </tr>
      `;
    }

    let html = '';
    
    // Group items by category
    const groupedItems: Record<string, any[]> = {};
    
    billItems.forEach((item: any) => {
      if (item.isVoided) return;
      
      const category = item.serviceType || item.category || 'Other Services';
      if (!groupedItems[category]) groupedItems[category] = [];
      groupedItems[category].push(item);
    });

    let itemIndex = 0;
    for (const [category, items] of Object.entries(groupedItems)) {
      // Category header
      const categoryTotal = items.reduce((sum, item) => sum + (item.lineTotal || item.total || 0), 0);
      const categoryBalance = items.reduce((sum, item) => sum + (item.balance || item.patientPayableAmount || 0), 0);
      
      html += `
        <tr class="category-row">
          <td colspan="6" style="padding: 12px 16px; background: #f1f5f9; font-weight: 700; color: #0f766e; border-top: 2px solid #e2e8f0;">
            📂 ${escapeHtml(category)} 
            <span style="font-weight: 400; color: #64748b; font-size: 12px; margin-left: 8px;">
              (${items.length} items • Total: ${formatCurrency(categoryTotal)})
            </span>
          </td>
        </tr>
      `;
      
      // Items
      items.forEach((item: any) => {
        itemIndex++;
        const description = item.description || item.itemDescription || 'N/A';
        const code = item.code || item.itemCode || '';
        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || item.price || 0;
        const total = item.lineTotal || item.total || (quantity * unitPrice) || 0;
        const balance = item.balance || item.patientPayableAmount || total;
        
        html += `
          <tr style="${itemIndex % 2 === 0 ? 'background: #f8fafc;' : ''}">
            <td style="padding: 10px 16px;">
              <div style="font-weight: 500; color: #0f172a;">${escapeHtml(description)}</div>
              ${code ? `<div style="font-size: 11px; color: #94a3b8;">Code: ${escapeHtml(code)}</div>` : ''}
            </td>
            <td style="padding: 10px 16px; text-transform: capitalize; color: #475569; font-size: 13px;">
              ${escapeHtml(category)}
            </td>
            <td style="padding: 10px 16px; text-align: center; color: #475569;">${quantity}</td>
            <td style="padding: 10px 16px; text-align: right; color: #475569;">${formatCurrency(unitPrice)}</td>
            <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(total)}</td>
            <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: ${balance > 0 ? '#dc2626' : '#16a34a'};">
              ${formatCurrency(balance)}
            </td>
          </tr>
        `;
      });
      
      // Category total row
      html += `
        <tr style="background: #f8fafc; border-top: 1px solid #e2e8f0;">
          <td colspan="4" style="padding: 8px 16px; text-align: right; font-weight: 600; color: #475569;">
            Category Total:
          </td>
          <td style="padding: 8px 16px; text-align: right; font-weight: 600; color: #0f172a;">
            ${formatCurrency(categoryTotal)}
          </td>
          <td style="padding: 8px 16px; text-align: right; font-weight: 600; color: ${categoryBalance > 0 ? '#dc2626' : '#16a34a'};">
            ${formatCurrency(categoryBalance)}
          </td>
        </tr>
      `;
    }
    
    return html;
  };

  // Generate payments HTML
  const generatePaymentsHTML = () => {
    if (!payments || payments.length === 0) {
      return `
        <tr>
          <td colspan="5" style="padding: 30px; text-align: center; color: #94a3b8;">
            <div style="font-size: 28px; margin-bottom: 8px;">💳</div>
            No payment records found
          </td>
        </tr>
      `;
    }
    
    return payments.map((payment: any) => {
      const paymentDate = payment.transactionDate || payment.paymentDate || payment.createdAt || new Date().toISOString();
      const amount = payment.amount || 0;
      const method = payment.paymentMethod || payment.paymentMode || payment.method || 'N/A';
      const reference = payment.reference || payment.transactionId || payment.receiptNumber || '-';
      const receivedBy = payment.receivedBy || payment.processedBy || payment.createdBy || 'System';
      
      return `
        <tr>
          <td style="padding: 10px 16px; color: #475569;">${formatDateTime(paymentDate)}</td>
          <td style="padding: 10px 16px; font-weight: 600; color: #16a34a;">${formatCurrency(amount)}</td>
          <td style="padding: 10px 16px; text-transform: capitalize; color: #475569;">
            ${escapeHtml(method.replace('_', ' '))}
          </td>
          <td style="padding: 10px 16px; color: #475569; font-size: 13px;">${escapeHtml(reference)}</td>
          <td style="padding: 10px 16px; color: #475569;">${escapeHtml(receivedBy)}</td>
        </tr>
      `;
    }).join('');
  };

  // Calculate totals
  const subtotal = bill?.subtotal || bill?.totalAmount || 0;
  const discount = bill?.discount || 0;
  const insuranceCovered = bill?.insuranceCovered || 0;
  const patientPayable = bill?.patientPayable || bill?.totalAmount || 0;
  const totalAmount = bill?.totalAmount || 0;
  const paidAmount = bill?.paidAmount || 0;
  const waiverAmount = bill?.waiverAmount || 0;
  const balance = bill?.balance || (totalAmount - paidAmount - waiverAmount) || 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill Statement - ${bill.billNumber || 'N/A'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f1f5f9;
      padding: 30px;
      color: #1e293b;
    }
    
    .page-container {
      max-width: 1100px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
      overflow: hidden;
    }
    
    /* ── HEADER ── */
    .header {
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      color: white;
      padding: 30px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .logo-placeholder {
      width: 70px;
      height: 70px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      color: white;
      border: 2px solid rgba(255,255,255,0.3);
    }
    
    .hospital-info h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    
    .hospital-info p {
      font-size: 13px;
      opacity: 0.9;
      line-height: 1.4;
    }
    
    .header-right {
      text-align: right;
    }
    
    .document-badge {
      background: rgba(255,255,255,0.2);
      padding: 6px 18px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    
    .document-number {
      font-size: 14px;
      font-weight: 600;
      margin-top: 6px;
      opacity: 0.9;
    }
    
    /* ── PATIENT BAR ── */
    .patient-bar {
      background: #f8fafc;
      padding: 16px 40px;
      border-bottom: 2px solid #e2e8f0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    
    .patient-bar-item {
      display: flex;
      flex-direction: column;
    }
    
    .patient-bar-item .label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .patient-bar-item .value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    
    /* ── CONTENT ── */
    .content {
      padding: 30px 40px 40px;
    }
    
    /* ── STATUS BADGE ── */
    .status-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .status-paid {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .status-pending {
      background: #fef3c7;
      color: #d97706;
    }
    
    .status-partial {
      background: #f3e8ff;
      color: #7e22ce;
    }
    
    .status-cancelled {
      background: #fee2e2;
      color: #dc2626;
    }
    
    /* ── INFO CARDS ── */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .info-card {
      background: #f8fafc;
      padding: 14px 18px;
      border-radius: 10px;
      border-left: 3px solid #14b8a6;
    }
    
    .info-card .label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-card .value {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    
    /* ── SECTION TITLE ── */
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-title .count {
      font-size: 12px;
      font-weight: 400;
      color: #94a3b8;
    }
    
    /* ── ITEMS TABLE ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 24px;
    }
    
    .items-table th {
      background: #f1f5f9;
      padding: 10px 16px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .items-table td {
      padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    
    .items-table tr:last-child td {
      border-bottom: none;
    }
    
    .category-row td {
      font-size: 13px;
    }
    
    /* ── TOTALS SECTION ── */
    .totals-section {
      background: #f0fdfa;
      border-radius: 12px;
      padding: 20px 24px;
      border: 2px solid #ccfbf1;
      margin: 24px 0;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #d1fae5;
    }
    
    .total-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .total-row .label {
      font-weight: 500;
      color: #475569;
    }
    
    .total-row .value {
      font-weight: 600;
      color: #0f172a;
    }
    
    .total-row .value.grand {
      font-size: 20px;
      color: #0f766e;
    }
    
    .total-row .value.paid {
      color: #16a34a;
    }
    
    .total-row .value.balance {
      font-size: 18px;
      color: #dc2626;
    }
    
    .total-row .value.balance.zero {
      color: #16a34a;
    }
    
    /* ── PAYMENTS TABLE ── */
    .payments-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 12px;
    }
    
    .payments-table th {
      background: #f1f5f9;
      padding: 10px 16px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .payments-table td {
      padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .payments-table tr:last-child td {
      border-bottom: none;
    }
    
    /* ── FOOTER ── */
    .footer {
      margin-top: 30px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .footer-left {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
    }
    
    .footer-right {
      text-align: right;
      font-size: 12px;
      color: #94a3b8;
    }
    
    .signature-line {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      width: 200px;
      margin-left: auto;
    }
    
    .signature-label {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }
    
    /* ── PRINT BUTTONS ── */
    .no-print {
      padding: 20px 40px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    
    .print-btn {
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(20, 184, 166, 0.4);
    }
    
    .close-btn {
      background: #e2e8f0;
      color: #475569;
      border: none;
      padding: 12px 32px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .close-btn:hover {
      background: #cbd5e1;
    }
    
    /* ── PRINT STYLES ── */
    @media print {
      body {
        background: white;
        padding: 10px;
      }
      
      .page-container {
        box-shadow: none;
        border-radius: 0;
      }
      
      .no-print {
        display: none !important;
      }
      
      .header {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .status-badge,
      .category-row td {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .totals-section {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    
    /* ── RESPONSIVE ── */
    @media screen and (max-width: 768px) {
      body { padding: 10px; }
      .header { flex-direction: column; text-align: center; gap: 12px; padding: 20px; }
      .header-left { flex-direction: column; }
      .header-right { text-align: center; }
      .patient-bar { grid-template-columns: 1fr 1fr; padding: 12px 20px; }
      .content { padding: 20px; }
      .info-grid { grid-template-columns: 1fr 1fr; }
      .items-table { font-size: 12px; }
      .items-table th, .items-table td { padding: 8px 10px; }
      .no-print { flex-direction: column; padding: 16px; }
      .footer { flex-direction: column; text-align: center; }
      .signature-line { margin: 8px auto 0; }
    }
    
    @media screen and (max-width: 480px) {
      .patient-bar { grid-template-columns: 1fr; }
      .info-grid { grid-template-columns: 1fr; }
      .items-table { font-size: 11px; }
      .items-table th, .items-table td { padding: 6px 8px; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    
    <!-- ── HEADER ── -->
    <div class="header">
      <div class="header-left">
        <div class="logo-placeholder">🏥</div>
        <div class="hospital-info">
          <h1>${escapeHtml(hospitalName)}</h1>
          <p>${escapeHtml(hospitalAddress)}</p>
          <p>Tel: ${escapeHtml(hospitalPhone)} &nbsp;|&nbsp; Email: ${escapeHtml(hospitalEmail)}</p>
        </div>
      </div>
      <div class="header-right">
        <div class="document-badge">BILL STATEMENT</div>
        <div class="document-number">${escapeHtml(bill.billNumber || 'N/A')}</div>
      </div>
    </div>

    <!-- ── PATIENT BAR ── -->
    <div class="patient-bar">
      <div class="patient-bar-item">
        <span class="label">Patient Name</span>
        <span class="value">${escapeHtml(patientName)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Folder Number</span>
        <span class="value">${escapeHtml(patientId)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Age & Gender</span>
        <span class="value">${escapeHtml(patientAge)} yrs, ${escapeHtml(patientGender)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Contact</span>
        <span class="value">${escapeHtml(patientContact)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Bill Date</span>
        <span class="value">${formatDateShort(bill.billDate || bill.createdAt)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Status</span>
        <span class="value">
          <span class="status-badge ${getStatusClass(bill.status)}">
            ${getStatusLabel(bill.status)}
          </span>
        </span>
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      <!-- Bill Info Cards -->
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Total Amount</div>
          <div class="value">${formatCurrency(totalAmount)}</div>
        </div>
        <div class="info-card">
          <div class="label">Amount Paid</div>
          <div class="value" style="color: #16a34a;">${formatCurrency(paidAmount)}</div>
        </div>
        <div class="info-card">
          <div class="label">Outstanding Balance</div>
          <div class="value" style="color: ${balance > 0 ? '#dc2626' : '#16a34a'};">${formatCurrency(balance)}</div>
        </div>
        <div class="info-card">
          <div class="label">Payment Mode</div>
          <div class="value" style="text-transform: capitalize;">${escapeHtml((bill.paymentMode || 'cash').replace('_', ' '))}</div>
        </div>
      </div>

      <!-- ── ITEMS TABLE ── -->
      <div class="section-title">
        📋 Bill Details
        <span class="count">(${billItems.filter((i: any) => !i.isVoided).length} items)</span>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 32%;">Description</th>
            <th style="width: 18%;">Category</th>
            <th style="width: 8%; text-align: center;">Qty</th>
            <th style="width: 15%; text-align: right;">Unit Price</th>
            <th style="width: 13%; text-align: right;">Total</th>
            <th style="width: 14%; text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${generateItemsHTML()}
        </tbody>
      </table>

      <!-- ── TOTALS ── -->
      <div class="totals-section">
        <div class="total-row">
          <span class="label">Subtotal</span>
          <span class="value">${formatCurrency(subtotal)}</span>
        </div>
        ${discount > 0 ? `
          <div class="total-row">
            <span class="label">Discount</span>
            <span class="value" style="color: #dc2626;">-${formatCurrency(discount)}</span>
          </div>
        ` : ''}
        ${insuranceCovered > 0 ? `
          <div class="total-row">
            <span class="label">Insurance Covered</span>
            <span class="value" style="color: #16a34a;">${formatCurrency(insuranceCovered)}</span>
          </div>
        ` : ''}
        <div class="total-row">
          <span class="label">Patient Payable</span>
          <span class="value">${formatCurrency(patientPayable)}</span>
        </div>
        <div class="total-row" style="border-bottom: 2px solid #14b8a6; padding-bottom: 12px; margin-bottom: 8px;">
          <span class="label" style="font-size: 16px; font-weight: 700;">Total Amount</span>
          <span class="value grand">${formatCurrency(totalAmount)}</span>
        </div>
        <div class="total-row">
          <span class="label">Amount Paid</span>
          <span class="value paid">${formatCurrency(paidAmount)}</span>
        </div>
        ${waiverAmount > 0 ? `
          <div class="total-row">
            <span class="label">Waiver Amount</span>
            <span class="value" style="color: #7e22ce;">${formatCurrency(waiverAmount)}</span>
          </div>
        ` : ''}
        <div class="total-row" style="border-top: 2px solid #14b8a6; padding-top: 12px; margin-top: 8px;">
          <span class="label" style="font-size: 16px; font-weight: 700;">Outstanding Balance</span>
          <span class="value ${balance > 0 ? 'balance' : 'balance zero'}">
            ${formatCurrency(balance)}
          </span>
        </div>
      </div>

      <!-- ── PAYMENT HISTORY ── -->
      ${payments.length > 0 ? `
        <div class="section-title" style="margin-top: 24px;">
          💳 Payment History
          <span class="count">(${payments.length} payments)</span>
        </div>
        
        <table class="payments-table">
          <thead>
            <tr>
              <th style="width: 22%;">Date</th>
              <th style="width: 18%;">Amount</th>
              <th style="width: 20%;">Method</th>
              <th style="width: 22%;">Reference</th>
              <th style="width: 18%;">Received By</th>
            </tr>
          </thead>
          <tbody>
            ${generatePaymentsHTML()}
          </tbody>
        </table>
      ` : ''}

      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This is an official bill statement from ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Document ID: BILL-${escapeHtml(bill.billNumber || 'N/A')}-${new Date().getTime().toString().slice(-6)}
          </p>
        </div>
        <div class="footer-right">
          <div style="display: flex; gap: 40px; justify-content: flex-end;">
            <div>
              <div style="border-top: 1px solid #e2e8f0; width: 160px; margin: 0 auto 4px;"></div>
              <span class="signature-label">Authorized Signature</span>
            </div>
            <div>
              <div style="border-top: 1px solid #e2e8f0; width: 160px; margin: 0 auto 4px;"></div>
              <span class="signature-label">Patient/Representative</span>
            </div>
          </div>
          <p style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
            Generated: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
      
    </div>
    
    <!-- ── PRINT BUTTONS ── -->
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">
        🖨️ Print Bill Statement
      </button>
      <button class="close-btn" onclick="window.close()">
        ✕ Close
      </button>
    </div>
    
  </div>
</body>
</html>
  `;
};