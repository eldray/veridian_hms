// src/utils/pdfTemplates/receiptPDF.ts - REDESIGNED PROFESSIONAL VERSION
import type { Bill, Patient, Payment, Hospital } from '../types';

export const generateReceiptHTML = (
  bill: any,
  patient: any,
  payment: any,
  hospital: any
): string => {
  // Format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

  const formatCurrency = (amount: any): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
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

  // Get payment info
  const receiptNumber = payment?.receiptNumber || payment?.receiptId || `RCP-${Date.now()}`;
  const paymentAmount = payment?.amount || 0;
  const paymentMethod = payment?.paymentMethod || payment?.paymentMode || 'cash';
  const paymentDate = payment?.paymentDate || payment?.transactionDate || new Date().toISOString();
  const reference = payment?.reference || payment?.transactionId || '';
  const receivedBy = payment?.receivedBy || payment?.processedBy || 'System';

  // Get bill info
  const billNumber = bill?.billNumber || 'N/A';
  const billTotal = bill?.totalAmount || 0;
  const billPaidAmount = bill?.paidAmount || 0;
  const billBalance = bill?.balance || 0;
  const billPaymentMode = bill?.paymentMode || 'cash';
  const billItems = bill?.BillLineItem || bill?.items || [];

  // Calculate this payment vs previous payments
  const previousPayments = billPaidAmount - paymentAmount;

  // Group bill items by category
  const groupedItems: Record<string, any[]> = {
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

  billItems.forEach((item: any) => {
    if (!item.isVoided) {
      const serviceType = item.serviceType?.toLowerCase() || item.category?.toLowerCase() || 'other';
      const key = categoryMap[serviceType] ?? 'Other Services';
      groupedItems[key].push(item);
    }
  });

  // Remove empty categories
  Object.keys(groupedItems).forEach(key => {
    if (groupedItems[key].length === 0) delete groupedItems[key];
  });

  // Generate line items HTML
  const generateLineItemsHTML = () => {
    if (billItems.length === 0) {
      return `
        <tr>
          <td colspan="6" style="padding: 30px; text-align: center; color: #94a3b8;">
            <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
            No items in this bill
          </td>
        </tr>
      `;
    }

    let html = '';
    let itemIndex = 0;

    for (const [category, items] of Object.entries(groupedItems)) {
      // Category header
      const categoryTotal = items.reduce((sum, item) => sum + (item.lineTotal || item.total || 0), 0);
      const categoryBalance = items.reduce((sum, item) => sum + (item.balance || item.patientPayableAmount || 0), 0);

      html += `
        <tr class="category-row">
          <td colspan="6" style="padding: 12px 16px; background: #f1f5f9; font-weight: 700; color: #1e40af; border-top: 2px solid #e2e8f0;">
            📂 ${escapeHtml(category)}
            <span style="font-weight: 400; color: #94a3b8; font-size: 12px; margin-left: 8px;">
              (${items.length} items)
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
        const paid = item.paidAmount || 0;
        const balance = item.balance || item.patientPayableAmount || 0;

        html += `
          <tr style="${itemIndex % 2 === 0 ? 'background: #f8fafc;' : ''}">
            <td style="padding: 10px 16px;">
              <div style="font-weight: 500; color: #0f172a;">${escapeHtml(description)}</div>
              ${code ? `<div style="font-size: 11px; color: #94a3b8;">Code: ${escapeHtml(code)}</div>` : ''}
            </td>
            <td style="padding: 10px 16px; text-align: center; color: #475569;">${quantity}</td>
            <td style="padding: 10px 16px; text-align: right; color: #475569;">GHS ${formatCurrency(unitPrice)}</td>
            <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #0f172a;">GHS ${formatCurrency(total)}</td>
            <td style="padding: 10px 16px; text-align: right; color: #16a34a;">GHS ${formatCurrency(paid)}</td>
            <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: ${balance > 0 ? '#dc2626' : '#16a34a'};">
              GHS ${formatCurrency(balance)}
            </td>
          </tr>
        `;
      });

      // Category totals
      html += `
        <tr style="background: #f8fafc; border-top: 1px solid #e2e8f0;">
          <td colspan="3" style="padding: 8px 16px; text-align: right; font-weight: 600; color: #475569;">
            Category Total:
          </td>
          <td style="padding: 8px 16px; text-align: right; font-weight: 600; color: #0f172a;">
            GHS ${formatCurrency(categoryTotal)}
          </td>
          <td style="padding: 8px 16px; text-align: right; font-weight: 600; color: #16a34a;">
            GHS ${formatCurrency(categoryTotal - categoryBalance)}
          </td>
          <td style="padding: 8px 16px; text-align: right; font-weight: 600; color: ${categoryBalance > 0 ? '#dc2626' : '#16a34a'};">
            GHS ${formatCurrency(categoryBalance)}
          </td>
        </tr>
      `;
    }

    return html;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${receiptNumber}</title>
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
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
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
    
    /* ── INFO CARDS ── */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .info-card {
      background: #f8fafc;
      padding: 14px 18px;
      border-radius: 10px;
      border-left: 3px solid #3b82f6;
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
    
    /* ── ITEMS TABLE ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin: 12px 0;
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
    
    /* ── PAYMENT SUMMARY ── */
    .payment-summary {
      background: #eff6ff;
      border-radius: 12px;
      padding: 20px 24px;
      border: 2px solid #bfdbfe;
      margin: 20px 0;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #dbeafe;
    }
    
    .summary-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .summary-row .label {
      font-weight: 500;
      color: #475569;
    }
    
    .summary-row .value {
      font-weight: 600;
      color: #0f172a;
    }
    
    .summary-row .value.grand {
      font-size: 20px;
      color: #1e40af;
    }
    
    .summary-row .value.paid {
      color: #16a34a;
    }
    
    .summary-row .value.balance {
      font-size: 18px;
      color: #dc2626;
    }
    
    .summary-row .value.balance.zero {
      color: #16a34a;
    }
    
    /* ── SIGNATURES ── */
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .signature-box {
      text-align: center;
      min-width: 180px;
    }
    
    .signature-line {
      width: 180px;
      height: 1px;
      background: #94a3b8;
      margin: 32px auto 8px;
    }
    
    .signature-label {
      font-size: 11px;
      color: #94a3b8;
    }
    
    .signature-name {
      font-weight: 600;
      color: #0f172a;
      font-size: 14px;
      margin-top: 4px;
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
    
    .qr-placeholder {
      display: inline-block;
      padding: 8px 16px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 11px;
      color: #94a3b8;
      border: 1px dashed #e2e8f0;
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
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
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
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
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
      
      .payment-summary {
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
      .signature-section { flex-direction: column; align-items: center; }
      .signature-line { margin: 32px auto 8px; }
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
        <div class="document-badge">PAYMENT RECEIPT</div>
        <div class="document-number">${escapeHtml(receiptNumber)}</div>
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
        <span class="label">Contact</span>
        <span class="value">${escapeHtml(patientContact)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Payment Mode</span>
        <span class="value" style="text-transform: capitalize;">${escapeHtml(billPaymentMode.replace('_', ' '))}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Payment Method</span>
        <span class="value" style="text-transform: capitalize;">${escapeHtml(paymentMethod.replace('_', ' '))}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Date & Time</span>
        <span class="value">${formatDate(paymentDate)}</span>
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      <!-- ── RECEIPT INFO CARDS ── -->
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Receipt Number</div>
          <div class="value" style="font-family: monospace;">${escapeHtml(receiptNumber)}</div>
        </div>
        <div class="info-card">
          <div class="label">Bill Number</div>
          <div class="value">${escapeHtml(billNumber)}</div>
        </div>
        ${reference ? `
          <div class="info-card">
            <div class="label">Reference</div>
            <div class="value" style="font-family: monospace; font-size: 13px;">${escapeHtml(reference)}</div>
          </div>
        ` : ''}
        <div class="info-card">
          <div class="label">Received By</div>
          <div class="value">${escapeHtml(receivedBy)}</div>
        </div>
      </div>

      <!-- ── BILL ITEMS ── -->
      <div class="section-title">
        📋 Bill Details
        <span class="count">(${billItems.filter((i: any) => !i.isVoided).length} items)</span>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 32%;">Description</th>
            <th style="width: 8%; text-align: center;">Qty</th>
            <th style="width: 15%; text-align: right;">Unit Price</th>
            <th style="width: 15%; text-align: right;">Total</th>
            <th style="width: 15%; text-align: right;">Paid</th>
            <th style="width: 15%; text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${generateLineItemsHTML()}
        </tbody>
      </table>

      <!-- ── PAYMENT SUMMARY ── -->
      <div class="payment-summary">
        <div class="summary-row">
          <span class="label">Total Bill Amount</span>
          <span class="value">GHS ${formatCurrency(billTotal)}</span>
        </div>
        ${previousPayments > 0 ? `
          <div class="summary-row">
            <span class="label">Previous Payments</span>
            <span class="value">GHS ${formatCurrency(previousPayments)}</span>
          </div>
        ` : ''}
        <div class="summary-row" style="border-bottom: 2px solid #bfdbfe; padding-bottom: 12px; margin-bottom: 8px;">
          <span class="label" style="font-size: 16px; font-weight: 700;">This Payment</span>
          <span class="value paid" style="font-size: 16px; font-weight: 700;">GHS ${formatCurrency(paymentAmount)}</span>
        </div>
        <div class="summary-row">
          <span class="label" style="font-size: 18px; font-weight: 700;">Outstanding Balance</span>
          <span class="value ${(billBalance - paymentAmount) <= 0 ? 'balance zero' : 'balance'}">
            GHS ${formatCurrency(Math.max(0, billBalance - paymentAmount))}
          </span>
        </div>
      </div>

      <!-- ── SIGNATURES ── -->
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Authorized Signature</div>
          <div class="signature-name">_____________________</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Received By</div>
          <div class="signature-name">${escapeHtml(receivedBy)}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${formatDateShort(paymentDate)}</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Patient / Guardian</div>
          <div class="signature-name">_____________________</div>
        </div>
      </div>

      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This is an official payment receipt from ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Receipt ID: ${escapeHtml(receiptNumber)}-${new Date().getTime().toString().slice(-6)}
          </p>
        </div>
        <div class="footer-right">
          <div class="qr-placeholder">🔲 QR Code<br><span style="font-size: 10px;">Scan to verify</span></div>
          <p style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
            Generated: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
      
    </div>
    
    <!-- ── PRINT BUTTONS ── -->
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">
        🖨️ Print Receipt
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