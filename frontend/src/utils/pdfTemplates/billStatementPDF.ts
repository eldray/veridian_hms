// src/utils/billSummaryTemplate.ts
import type { Bill, Patient, HospitalInfo } from '../types';

export const generateBillStatementHTML = (
  bill: Bill,
  patient: Patient,
  hospitalInfo: HospitalInfo
): string => {
  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `GHS ${amount.toFixed(2)}`;
  };

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
      max-width: 1000px;
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
      margin-bottom: 25px;
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
      font-size: 28px;
      color: #0f766e;
      text-align: right;
      margin-top: 10px;
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
      <div class="hospital-name">${hospitalInfo.name}</div>
      <div class="hospital-details">
        ${hospitalInfo.address}<br>
        Tel: ${hospitalInfo.phone} | Email: ${hospitalInfo.email}
      </div>
      <div class="bill-badge">BILL STATEMENT</div>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">Bill Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Bill Number</div>
            <div class="info-value">${bill.billNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Bill Date</div>
            <div class="info-value">${formatDate(bill.billDate)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge status-${bill.status}">${bill.status.toUpperCase()}</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Payment Mode</div>
            <div class="info-value">${bill.paymentMode.replace('_', ' ').toUpperCase()}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Patient Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Patient Name</div>
            <div class="info-value">${patient.fullName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Patient ID</div>
            <div class="info-value">${patient.folderNumber || patient.id}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Contact</div>
            <div class="info-value">${patient.contact}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Age & Gender</div>
            <div class="info-value">${patient.age} years / ${patient.gender}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Bill Details</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${bill.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td style="text-transform: capitalize;">${item.category}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(item.totalPrice)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="total-section">
        <div class="total-row">
          <span class="total-label">Subtotal</span>
          <span class="total-value">${formatCurrency(bill.subtotal)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Discount</span>
          <span class="total-value" style="color: #dc2626;">-${formatCurrency(bill.discount)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Tax</span>
          <span class="total-value">${formatCurrency(bill.taxAmount)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Insurance Covered</span>
          <span class="total-value" style="color: #059669;">${formatCurrency(bill.insuranceCovered)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Patient Payable</span>
          <span class="total-value">${formatCurrency(bill.patientPayable)}</span>
        </div>
        <div class="total-row grand-total">
          <span>Total Amount</span>
          <span>${formatCurrency(bill.totalAmount)}</span>
        </div>
        <div class="total-row">
          <span>Amount Paid</span>
          <span style="color: #059669;">${formatCurrency(bill.paidAmount)}</span>
        </div>
        <div class="total-row">
          <span>Outstanding Balance</span>
          <span style="color: ${bill.balance > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">
            ${formatCurrency(bill.balance)}
          </span>
        </div>
      </div>
      
      ${bill.payments && bill.payments.length > 0 ? `
      <div class="section">
        <div class="section-title">Payment History</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            ${bill.payments.map(payment => `
            <tr>
              <td>${formatDate(payment.paymentDate)}</td>
              <td style="font-weight: 600;">${formatCurrency(payment.amount)}</td>
              <td>${payment.paymentMode.replace('_', ' ')}</td>
              <td>${payment.reference || '-'}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Authorized Signature</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Prepared By: ${bill.createdBy}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>This is an official bill statement from ${hospitalInfo.name}. Please settle the outstanding balance by the due date.</p>
        <p style="margin-top: 10px; font-size: 13px; color: #475569;">
          Generated on ${new Date().toLocaleDateString('en-US', {
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
        Print Bill Statement
      </button>
      <button class="close-btn" onclick="window.close()">
        Close
      </button>
    </div>
  </div>
</body>
</html>
  `;
};
