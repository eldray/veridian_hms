// src/utils/receiptTemplate.ts
import type { Bill, Patient, Payment, HospitalInfo } from '../types';

export const generateReceiptHTML = (
  bill: Bill,
  patient: Patient,
  payment: Payment,
  hospitalInfo: HospitalInfo
): string => {
  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${payment.receiptNumber}</title>
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
    
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
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
      color: #1e40af;
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
    
    .receipt-badge {
      position: absolute;
      top: 20px;
      right: 30px;
      background: #dc2626;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);
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
      color: #1e40af;
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
      background: #f8fafc;
      padding: 15px;
      border-radius: 12px;
      border-left: 4px solid #3b82f6;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .amount-section {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-radius: 16px;
      padding: 25px;
      margin: 25px 0;
      border: 2px solid #93c5fd;
    }
    
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #bfdbfe;
    }
    
    .amount-label {
      font-weight: 600;
      color: #1e40af;
    }
    
    .amount-value {
      font-weight: 700;
      font-size: 18px;
      color: #1e40af;
    }
    
    .total-amount {
      font-size: 28px;
      color: #1e40af;
      text-align: right;
      margin-top: 10px;
    }
    
    .bill-summary {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    
    .summary-row:last-child {
      border-bottom: none;
    }
    
    .summary-label {
      color: #64748b;
    }
    
    .summary-value {
      font-weight: 600;
      color: #1e293b;
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
    
    .qr-code {
      text-align: center;
      margin: 20px 0;
    }
    
    .qr-placeholder {
      width: 100px;
      height: 100px;
      background: #f1f5f9;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 12px;
      margin: 0 auto;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .receipt-container {
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
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    }
    
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
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
  <div class="receipt-container">
    <div class="header">
      <div class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
      </div>
      <div class="hospital-name">${hospitalInfo.name}</div>
      <div class="hospital-details">
        ${hospitalInfo.address}<br>
        Tel: ${hospitalInfo.phone} | Email: ${hospitalInfo.email}
      </div>
      <div class="receipt-badge">OFFICIAL RECEIPT</div>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">Receipt Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Receipt Number</div>
            <div class="info-value">${payment.receiptNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date & Time</div>
            <div class="info-value">${formatDate(payment.paymentDate)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Bill Number</div>
            <div class="info-value">${bill.billNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Payment Method</div>
            <div class="info-value">${payment.paymentMode.replace('_', ' ').toUpperCase()}</div>
          </div>
          ${payment.reference ? `
          <div class="info-item">
            <div class="info-label">Reference</div>
            <div class="info-value">${payment.reference}</div>
          </div>
          ` : ''}
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
            <div class="info-label">Payment Mode</div>
            <div class="info-value">${bill.paymentMode.replace('_', ' ').toUpperCase()}</div>
          </div>
        </div>
      </div>
      
      <div class="amount-section">
        <div class="amount-row">
          <span class="amount-label">Amount Paid</span>
          <span class="amount-value">GHS ${payment.amount.toFixed(2)}</span>
        </div>
        <div class="total-amount">GHS ${payment.amount.toFixed(2)}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Bill Summary</div>
        <div class="bill-summary">
          <div class="summary-row">
            <span class="summary-label">Total Bill Amount</span>
            <span class="summary-value">GHS ${bill.totalAmount.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Previous Payments</span>
            <span class="summary-value">GHS ${(bill.paidAmount - payment.amount).toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">This Payment</span>
            <span class="summary-value">GHS ${payment.amount.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Outstanding Balance</span>
            <span class="summary-value" style="color: ${bill.balance > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">
              GHS ${(bill.balance - payment.amount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Authorized Signature</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Received By: ${payment.receivedBy}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>This is an official receipt from ${hospitalInfo.name}. Please keep this document for your records.</p>
        <p style="margin-top: 10px; font-size: 13px; color: #475569;">
          Generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
        
        <div class="qr-code">
          <div class="qr-placeholder">QR Code<br>(Verification)</div>
          <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
            Scan to verify this receipt
          </p>
        </div>
      </div>
    </div>
    
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">
        Print Receipt
      </button>
      <button class="close-btn" onclick="window.close()">
        Close
      </button>
    </div>
  </div>
  
  <script>
    // Auto-print in some browsers
    window.addEventListener('load', function() {
      // Uncomment the next line if you want to auto-print
      // window.print();
    });
  </script>
</body>
</html>
  `;
};
