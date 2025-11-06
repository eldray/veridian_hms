// src/utils/pdfTemplates/insuranceClaimPDF.ts
import type { InsuranceClaim, Patient, Hospital } from '../../types';

export const generateInsuranceClaimHTML = (
  claim: InsuranceClaim,
  patient: Patient,
  hospital: Hospital
): string => {
  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Insurance Claim - ${claim.claimNumber}</title>
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
    
    .claim-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      overflow: hidden;
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
    
    .no-print {
      margin-top: 30px;
      text-align: center;
    }
    
    .print-btn {
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      margin-right: 10px;
    }
    
    .close-btn {
      background-color: #6b7280;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="claim-container">
    <div class="header">
      <div class="hospital-info">
        <div class="hospital-name">${hospital.name}</div>
        <div class="hospital-details">
          ${hospital.address}<br>
          Tel: ${hospital.phone} | Email: ${hospital.email}
        </div>
      </div>
    </div>

    <div class="claim-title">${claim.insuranceType === 'nhis' ? 'NHIS' : 'Private Insurance'} Claim Form</div>
    <div class="claim-subtitle">Claim Number: ${claim.claimNumber} | Date: ${formatDate(claim.claimDate)}</div>

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
          <div class="info-value">${formatDate(claim.claimDate)}</div>
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
          <div class="info-value">${formatDate(claim.submittedAt)}</div>
        </div>
        ` : ''}
        ${claim.approvedAt ? `
        <div class="info-item">
          <div class="info-label">Approved On</div>
          <div class="info-value">${formatDate(claim.approvedAt)}</div>
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
        <strong>${hospital.name}</strong><br>
        ${hospital.address}<br>
        Tel: ${hospital.phone} | Email: ${hospital.email}
      </p>
      <p style="margin-top: 10px; font-size: 10px;">
        Generated on ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
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
  </div>
</body>
</html>
  `;
};
