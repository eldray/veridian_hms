import type { Bill, Patient, InsuranceClaim, Payment } from '../types';

// PDF generation using browser's print functionality
// This creates a print-friendly HTML that can be saved as PDF

export const generateReceiptHTML = (
  bill: Bill,
  patient: Patient,
  payment: Payment,
  hospitalInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  }
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${payment.receiptNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .hospital-name {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .hospital-details {
      font-size: 12px;
      color: #666;
    }
    .receipt-title {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      margin: 20px 0;
      color: #1e40af;
    }
    .section {
      margin: 20px 0;
    }
    .section-title {
      font-weight: bold;
      font-size: 14px;
      color: #1e40af;
      margin-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dotted #e5e7eb;
    }
    .info-label {
      font-weight: 600;
      color: #666;
    }
    .info-value {
      color: #333;
    }
    .amount-section {
      background-color: #f0f9ff;
      border: 2px solid #2563eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 18px;
    }
    .total-amount {
      font-weight: bold;
      font-size: 24px;
      color: #1e40af;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
    }
    .signature-box {
      text-align: center;
      min-width: 200px;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 5px;
    }
    @media print {
      body {
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="hospital-name">${hospitalInfo.name}</div>
    <div class="hospital-details">
      ${hospitalInfo.address}<br>
      Tel: ${hospitalInfo.phone} | Email: ${hospitalInfo.email}
    </div>
  </div>

  <div class="receipt-title">PAYMENT RECEIPT</div>

  <div class="section">
    <div class="section-title">Receipt Information</div>
    <div class="info-row">
      <span class="info-label">Receipt Number:</span>
      <span class="info-value">${payment.receiptNumber}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date:</span>
      <span class="info-value">${new Date(payment.paymentDate).toLocaleString()}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Bill Number:</span>
      <span class="info-value">${bill.billNumber}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="info-row">
      <span class="info-label">Patient Name:</span>
      <span class="info-value">${patient.fullName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Patient ID:</span>
      <span class="info-value">${patient.id}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Registration Type:</span>
      <span class="info-value">${patient.registrationType.replace('_', ' ').toUpperCase()}</span>
    </div>
    ${patient.nhisNumber ? `
    <div class="info-row">
      <span class="info-label">NHIS Number:</span>
      <span class="info-value">${patient.nhisNumber}</span>
    </div>
    ` : ''}
  </div>

  <div class="amount-section">
    <div class="amount-row">
      <span>Payment Method:</span>
      <span style="font-weight: 600;">${payment.paymentMode.replace('_', ' ').toUpperCase()}</span>
    </div>
    ${payment.reference ? `
    <div class="amount-row">
      <span>Reference:</span>
      <span style="font-weight: 600;">${payment.reference}</span>
    </div>
    ` : ''}
    <div class="amount-row" style="margin-top: 20px; border-top: 2px solid #2563eb; padding-top: 15px;">
      <span>Amount Paid:</span>
      <span class="total-amount">$${payment.amount.toFixed(2)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill Summary</div>
    <div class="info-row">
      <span class="info-label">Total Bill Amount:</span>
      <span class="info-value">$${bill.totalAmount.toFixed(2)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Total Paid (including this payment):</span>
      <span class="info-value" style="color: #059669;">$${(bill.paidAmount + payment.amount).toFixed(2)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Outstanding Balance:</span>
      <span class="info-value" style="color: ${bill.balance - payment.amount > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">
        $${(bill.balance - payment.amount).toFixed(2)}
      </span>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Patient/Guardian Signature</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Received By: ${payment.receivedBy}</div>
    </div>
  </div>

  <div class="footer">
    <p>This is an official receipt from ${hospitalInfo.name}</p>
    <p>Please keep this receipt for your records</p>
    <p style="margin-top: 10px; font-size: 11px;">
      Generated on ${new Date().toLocaleString()}
    </p>
  </div>

  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      margin-right: 10px;
    ">Print Receipt</button>
    <button onclick="window.close()" style="
      background-color: #6b7280;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
    ">Close</button>
  </div>
</body>
</html>
  `;
};

export const generateInsuranceClaimHTML = (
  claim: InsuranceClaim,
  patient: Patient,
  hospitalInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  }
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Insurance Claim - ${claim.claimNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .hospital-info {
      flex: 1;
    }
    .hospital-name {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .hospital-details {
      font-size: 11px;
      color: #666;
      line-height: 1.5;
    }
    .claim-title {
      text-align: center;
      font-size: 26px;
      font-weight: bold;
      margin: 20px 0;
      color: #1e40af;
      text-transform: uppercase;
    }
    .claim-subtitle {
      text-align: center;
      font-size: 14px;
      color: #666;
      margin-bottom: 30px;
    }
    .section {
      margin: 25px 0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }
    .section-title {
      font-weight: bold;
      font-size: 16px;
      color: #1e40af;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #2563eb;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .info-item {
      padding: 8px 0;
    }
    .info-label {
      font-weight: 600;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      color: #333;
      font-size: 14px;
      margin-top: 4px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .items-table th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      color: #374151;
      border-bottom: 2px solid #2563eb;
    }
    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .total-section {
      background-color: #f0f9ff;
      border: 2px solid #2563eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 16px;
    }
    .grand-total {
      font-weight: bold;
      font-size: 22px;
      color: #1e40af;
      border-top: 2px solid #2563eb;
      margin-top: 10px;
      padding-top: 15px;
    }
    .approval-section {
      margin-top: 40px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      margin-top: 40px;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-top: 2px solid #333;
      margin-top: 60px;
      padding-top: 8px;
      font-size: 12px;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #666;
    }
    @media print {
      body {
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="hospital-info">
      <div class="hospital-name">${hospitalInfo.name}</div>
      <div class="hospital-details">
        ${hospitalInfo.address}<br>
        Tel: ${hospitalInfo.phone} | Email: ${hospitalInfo.email}
      </div>
    </div>
  </div>

  <div class="claim-title">${claim.insuranceType === 'nhis' ? 'NHIS' : 'Private Insurance'} Claim Form</div>
  <div class="claim-subtitle">Claim Number: ${claim.claimNumber} | Date: ${new Date(claim.claimDate).toLocaleDateString()}</div>

  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Full Name</div>
        <div class="info-value">${patient.fullName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Patient ID</div>
        <div class="info-value">${patient.id}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date of Birth</div>
        <div class="info-value">${new Date(patient.dateOfBirth).toLocaleDateString()} (Age: ${patient.age || 'N/A'})</div>
      </div>
      <div class="info-item">
        <div class="info-label">Gender</div>
        <div class="info-value">${patient.gender.toUpperCase()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Contact Number</div>
        <div class="info-value">${patient.contact}</div>
      </div>
      <div class="info-item">
        <div class="info-label">${claim.insuranceType === 'nhis' ? 'NHIS Number' : 'Policy Number'}</div>
        <div class="info-value">${claim.insuranceType === 'nhis' ? patient.nhisNumber : patient.insurancePolicyNumber}</div>
      </div>
      ${claim.insuranceType === 'private' ? `
      <div class="info-item">
        <div class="info-label">Insurance Provider</div>
        <div class="info-value">${patient.insuranceProvider}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Clinical Information</div>
    <div class="info-grid">
      <div class="info-item" style="grid-column: 1 / -1;">
        <div class="info-label">Diagnosis</div>
        <div class="info-value">${claim.diagnosis}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Attending Clinician</div>
        <div class="info-value">${claim.clinician}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date of Service</div>
        <div class="info-value">${new Date(claim.claimDate).toLocaleDateString()}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Services Rendered</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Category</th>
          <th style="text-align: center;">Quantity</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${claim.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td style="text-transform: capitalize;">${item.category}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">$${item.unitPrice.toFixed(2)}</td>
            <td style="text-align: right; font-weight: 600;">$${item.totalPrice.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="total-section">
    <div class="total-row grand-total">
      <span>Total Claim Amount:</span>
      <span>$${claim.totalAmount.toFixed(2)}</span>
    </div>
    ${claim.approvedAmount ? `
    <div class="total-row" style="color: #059669; font-weight: 600;">
      <span>Approved Amount:</span>
      <span>$${claim.approvedAmount.toFixed(2)}</span>
    </div>
    ` : ''}
  </div>

  <div class="approval-section">
    <div class="section-title">Claim Status & Approval</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value" style="text-transform: capitalize; font-weight: 600; color: ${
          claim.status === 'approved' ? '#059669' : 
          claim.status === 'rejected' ? '#dc2626' : '#f59e0b'
        };">${claim.status}</div>
      </div>
      ${claim.submittedAt ? `
      <div class="info-item">
        <div class="info-label">Submitted On</div>
        <div class="info-value">${new Date(claim.submittedAt).toLocaleString()}</div>
      </div>
      ` : ''}
      ${claim.approvedAt ? `
      <div class="info-item">
        <div class="info-label">Approved On</div>
        <div class="info-value">${new Date(claim.approvedAt).toLocaleString()}</div>
      </div>
      ` : ''}
    </div>
    ${claim.rejectionReason ? `
    <div class="info-item" style="margin-top: 15px; padding: 12px; background-color: #fee2e2; border-radius: 6px;">
      <div class="info-label" style="color: #dc2626;">Rejection Reason</div>
      <div class="info-value">${claim.rejectionReason}</div>
    </div>
    ` : ''}
  </div>

  <div class="signature-grid">
    <div class="signature-box">
      <div class="signature-line">Patient/Guardian</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Clinician<br>${claim.clinician}</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Hospital Stamp & Signature</div>
    </div>
  </div>

  <div class="footer">
    <p><strong>Important:</strong> This claim form must be submitted to the ${claim.insuranceType === 'nhis' ? 'NHIS office' : 'insurance provider'} for processing.</p>
    <p style="margin-top: 15px;">
      <strong>${hospitalInfo.name}</strong><br>
      ${hospitalInfo.address}<br>
      Tel: ${hospitalInfo.phone} | Email: ${hospitalInfo.email}
    </p>
    <p style="margin-top: 10px; font-size: 10px;">
      Generated on ${new Date().toLocaleString()}
    </p>
  </div>

  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      margin-right: 10px;
    ">Print Claim Form</button>
    <button onclick="window.close()" style="
      background-color: #6b7280;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
    ">Close</button>
  </div>
</body>
</html>
  `;
};

export const openPrintWindow = (htmlContent: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    alert('Please allow popups to print receipts and claims');
  }
};

