// src/utils/billSummaryTemplate.ts
import type { Bill, Patient, HospitalInfo } from '../types';

export const generateBillStatementHTML = (
  bill: Bill,
  patient: Patient,
  hospitalInfo: HospitalInfo
): string => {
  // Format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `GHS ${amount?.toFixed(2) ?? '0.00'}`;
  };

  // Get bill line items (BillLineItem from your data structure)
  const billLineItems = bill.BillLineItem || bill.items || [];
  
  // Group line items by category
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

  billLineItems.forEach((item: any) => {
    if (!item.isVoided) {
      const category = item.serviceType?.toLowerCase() || item.category?.toLowerCase() || 'other';
      const key = categoryMap[category] ?? 'Other Services';
      groupedItems[key].push(item);
    }
  });

  // Remove empty categories
  Object.keys(groupedItems).forEach(key => {
    if (groupedItems[key].length === 0) delete groupedItems[key];
  });

  // Generate grouped items HTML
  const generateItemsHTML = () => {
    // Check both possible property names
    const billLineItems = bill.BillLineItem || bill.items || [];
    
    console.log('Bill line items:', billLineItems); // Debug log
    
    if (!billLineItems || billLineItems.length === 0) {
      return '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #64748b;">No items found in this bill</td<tr>';
    }

    let html = '';
    
    // Group items by category
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

    billLineItems.forEach((item: any) => {
      if (!item.isVoided) {
        const serviceType = item.serviceType?.toLowerCase() || 'other';
        const category = categoryMap[serviceType] ?? 'Other Services';
        groupedItems[category].push(item);
      }
    });

    // Remove empty categories
    Object.keys(groupedItems).forEach(key => {
      if (groupedItems[key].length === 0) delete groupedItems[key];
    });

    // Generate HTML for each category
    for (const [category, items] of Object.entries(groupedItems)) {
      // Category header
      html += `
        <tr class="category-row">
          <td colspan="6" style="padding: 12px 15px; background: #f1f5f9; font-weight: 700; color: #0f766e;">
            📋 ${category} (${items.length} items)
          </td>
        </tr>
      `;
      
      // Items
      items.forEach((item: any) => {
        const description = item.description || 'N/A';
        const code = item.serviceCatalog?.code || '';
        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || 0;
        const total = item.lineTotal || 0;
        const paid = item.paidAmount || 0;
        const balance = item.balance || item.patientPayableAmount || total - paid;
        
        html += `
          <tr>
            <td style="padding: 12px 15px;">
              <div style="font-weight: 500;">${escapeHtml(description)}</div>
              ${code ? `<div style="font-size: 11px; color: #64748b;">Code: ${escapeHtml(code)}</div>` : ''}
            </td>
            <td style="padding: 12px 15px; text-transform: capitalize;">${category}</td>
            <td style="padding: 12px 15px; text-align: center;">${quantity}</td>
            <td style="padding: 12px 15px; text-align: right;">${formatCurrency(unitPrice)}</td>
            <td style="padding: 12px 15px; text-align: right; font-weight: 600;">${formatCurrency(total)}</td>
            <td style="padding: 12px 15px; text-align: right; color: ${balance > 0 ? '#dc2626' : '#059669'}; font-weight: 500;">
              ${formatCurrency(balance)}
            </td>
          </tr>
        `;
      });
      
      // Category total
      const categoryTotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
      const categoryPaid = items.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
      const categoryBalance = categoryTotal - categoryPaid;
      
      html += `
        <tr style="background: #f8fafc; border-top: 1px solid #e2e8f0;">
          <td colspan="4" style="padding: 10px 15px; text-align: right; font-weight: 600;">Category Total:</td>
          <td style="padding: 10px 15px; text-align: right; font-weight: 600;">${formatCurrency(categoryTotal)}</td>
          <td style="padding: 10px 15px; text-align: right; font-weight: 600; color: ${categoryBalance > 0 ? '#dc2626' : '#059669'};">${formatCurrency(categoryBalance)}</td>
        </tr>
      `;
    }
    
    return html;
  };

    // Generate payment history HTML
    const generatePaymentsHTML = () => {
      // Check all possible payment locations
      const payments = bill.payments || bill.Payments || bill.paymentHistory || [];
      
      console.log('Payments found:', payments); // Debug log
      
      if (!payments || payments.length === 0) {
        return '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #64748b;">No payment records found for this bill</td</tr>';
      }
      
      return payments.map((payment: any) => {
        // Handle different property names
        const paymentDate = payment.transactionDate || payment.paymentDate || payment.createdAt || new Date().toISOString();
        const amount = payment.amount || 0;
        const method = payment.paymentMethod || payment.paymentMode || payment.method || 'N/A';
        const reference = payment.reference || payment.transactionId || payment.receiptNumber || '-';
        const receivedBy = payment.receivedBy || payment.processedBy || payment.createdBy || 'System';
        
        return `
          <tr>
            <td style="padding: 12px 15px;">${formatDateTime(paymentDate)}</td>
            <td style="padding: 12px 15px; font-weight: 600;">${formatCurrency(amount)}</td>
            <td style="padding: 12px 15px; text-transform: capitalize;">${method.replace('_', ' ')}</td>
            <td style="padding: 12px 15px;">${escapeHtml(reference)}</td>
            <td style="padding: 12px 15px;">${escapeHtml(receivedBy)}</td>
          </tr>
        `;
      }).join('');
    };

  // Helper function to escape HTML
  function escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get patient info safely
  const patientFullName = patient?.fullName || 
    `${patient?.surname || ''} ${patient?.otherNames || ''}`.trim() || 
    'Unknown Patient';
  const patientId = patient?.folderNumber || patient?.id || 'N/A';
  const patientContact = patient?.contact || patient?.phone || 'N/A';
  const patientAge = patient?.age || 'N/A';
  const patientGender = patient?.gender || 'N/A';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill Statement - ${bill.billNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4edf9 100%);
      padding: 20px;
      color: #333;
    }
    
    .bill-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      color: white;
      padding: 30px;
      text-align: center;
      position: relative;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .logo svg {
      width: 40px;
      height: 40px;
      color: #0f766e;
    }
    
    .hospital-name {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    
    .hospital-details {
      font-size: 14px;
      opacity: 0.9;
      line-height: 1.5;
    }
    
    .bill-badge {
      position: absolute;
      top: 20px;
      right: 30px;
      background: white;
      color: #0f766e;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(255, 255, 255, 0.3);
    }
    
    .content {
      padding: 30px;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f766e;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }
    
    .info-item {
      background: #f0fdfa;
      padding: 15px;
      border-radius: 12px;
      border-left: 4px solid #14b8a6;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #0f766e;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .items-table th {
      background: #f0fdfa;
      padding: 12px 15px;
      text-align: left;
      font-weight: 700;
      color: #0f766e;
      border-bottom: 2px solid #14b8a6;
    }
    
    .items-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    
    .items-table tr:last-child td {
      border-bottom: none;
    }
    
    .category-row {
      background: #f8fafc;
      font-weight: 600;
    }
    
    .total-section {
      background: linear-gradient(135deg, #f0fdfa 0%, #d1fae5 100%);
      border-radius: 16px;
      padding: 25px;
      margin: 25px 0;
      border: 2px solid #a7f3d0;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #d1fae5;
    }
    
    .total-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .total-label {
      font-weight: 600;
      color: #0f766e;
    }
    
    .total-value {
      font-weight: 700;
      font-size: 18px;
      color: #0f766e;
    }
    
    .grand-total {
      font-size: 24px;
      color: #0f766e;
      margin-top: 10px;
      padding-top: 12px;
      border-top: 2px solid #a7f3d0;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
    }
    
    .status-paid {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .status-pending {
      background: #fff7ed;
      color: #ea580c;
    }
    
    .status-partial {
      background: #f3e8ff;
      color: #7e22ce;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
    }
    
    .signature-box {
      text-align: center;
      min-width: 200px;
    }
    
    .signature-line {
      height: 1px;
      background: #94a3b8;
      margin: 40px auto 10px;
      width: 80%;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .bill-container {
        box-shadow: none;
        border-radius: 0;
      }
      
      .no-print {
        display: none !important;
      }
    }
    
    .no-print {
      margin-top: 30px;
      text-align: center;
    }
    
    .print-btn {
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(20, 184, 166, 0.4);
    }
    
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(20, 184, 166, 0.6);
    }
    
    .close-btn {
      background: #64748b;
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-left: 12px;
    }
    
    .close-btn:hover {
      background: #475569;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="bill-container">
    <div class="header">
      <div class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"></path>
          <path d="M9 17H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"></path>
          <path d="M7 13h10M7 11h10M7 9h10"></path>
        </svg>
      </div>
      <div class="hospital-name">${hospitalInfo.name || 'Veridian Hospital'}</div>
      <div class="hospital-details">
        ${hospitalInfo.address || '123 Main Street, Accra, Ghana'}<br>
        Tel: ${hospitalInfo.phone || '+233 123 456 789'} | Email: ${hospitalInfo.email || 'info@hospital.com'}
      </div>
      <div class="bill-badge">BILL STATEMENT</div>
    </div>
    
    <div class="content">
      <!-- Bill Information -->
      <div class="section">
        <div class="section-title">Bill Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Bill Number</div>
            <div class="info-value">${bill.billNumber || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Bill Date</div>
            <div class="info-value">${formatDate(bill.billDate || bill.createdAt)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge status-${bill.status || 'pending'}">${(bill.status || 'PENDING').toUpperCase()}</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Payment Mode</div>
            <div class="info-value">${(bill.paymentMode || 'cash').replace('_', ' ').toUpperCase()}</div>
          </div>
        </div>
      </div>
      
      <!-- Patient Information -->
      <div class="section">
        <div class="section-title">Patient Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Patient Name</div>
            <div class="info-value">${escapeHtml(patientFullName)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Patient ID</div>
            <div class="info-value">${escapeHtml(patientId)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Contact</div>
            <div class="info-value">${escapeHtml(patientContact)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Age & Gender</div>
            <div class="info-value">${patientAge} years / ${patientGender}</div>
          </div>
        </div>
      </div>
      
      <!-- Bill Details (Line Items) -->
      <div class="section">
        <div class="section-title">Bill Details</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 35%;">Description</th>
              <th style="width: 15%;">Category</th>
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
      </div>
      
      <!-- Financial Summary -->
      <div class="total-section">
        <div class="total-row">
          <span class="total-label">Subtotal</span>
          <span class="total-value">${formatCurrency(bill.subtotal || bill.totalAmount || 0)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Discount</span>
          <span class="total-value" style="color: #dc2626;">-${formatCurrency(bill.discount || 0)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Insurance Covered</span>
          <span class="total-value" style="color: #059669;">${formatCurrency(bill.insuranceCovered || 0)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Patient Payable</span>
          <span class="total-value">${formatCurrency(bill.patientPayable || bill.totalAmount || 0)}</span>
        </div>
        <div class="total-row grand-total">
          <span style="font-size: 18px; font-weight: 700;">Total Amount</span>
          <span style="font-size: 20px; font-weight: 700;">${formatCurrency(bill.totalAmount || 0)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Amount Paid</span>
          <span class="total-value" style="color: #059669;">${formatCurrency(bill.paidAmount || 0)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Waiver Amount</span>
          <span class="total-value" style="color: #7e22ce;">${formatCurrency(bill.waiverAmount || 0)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Outstanding Balance</span>
          <span class="total-value" style="color: ${(bill.balance || 0) > 0 ? '#dc2626' : '#059669'}; font-weight: bold; font-size: 20px;">
            ${formatCurrency(bill.balance || 0)}
          </span>
        </div>
      </div>
      
      <!-- Payment History -->
      <div class="section">
        <div class="section-title">Payment History</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Received By</th>
            </tr>
          </thead>
          <tbody>
            ${generatePaymentsHTML()}
          </tbody>
        </table>
      </div>
      
      <!-- Signature Section -->
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Authorized Signature</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 8px;">(Cashier/Accounts)</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Patient/Representative Signature</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 8px;">(Acknowledgment)</div>
        </div>
      </div>
      
      <div class="footer">
        <p>This is an official bill statement from ${hospitalInfo.name || 'Veridian Hospital'}.</p>
        <p style="margin-top: 10px; font-size: 13px; color: #475569;">
          Please settle the outstanding balance promptly. This statement serves as an official record of all charges and payments.
        </p>
        <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
          Generated on ${new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
    
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">
        🖨️ Print Bill Statement
      </button>
      <button class="close-btn" onclick="window.close()">
        ✖ Close
      </button>
    </div>
  </div>
</body>
</html>
  `;
};