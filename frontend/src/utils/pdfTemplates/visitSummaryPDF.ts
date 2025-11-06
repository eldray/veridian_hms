// src/utils/pdfTemplates/visitSummaryPDF.ts
import type { Attendance, Patient, Hospital } from '../../types';

export const generateVisitSummaryHTML = (
  attendance: Attendance,
  patient: Patient,
  hospital: Hospital
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
  <title>Visit Summary - ${attendance.attendanceNumber}</title>
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
    
    .summary-container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #7e22ce 0%, #a855f7 100%);
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
      color: #7e22ce;
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
    
    .summary-badge {
      position: absolute;
      top: 20px;
      right: 30px;
      background: white;
      color: #7e22ce;
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
      color: #7e22ce;
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
      background: #f5f3ff;
      padding: 15px;
      border-radius: 12px;
      border-left: 4px solid #a855f7;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #7e22ce;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #7e22ce;
    }
    
    .clinical-section {
      background: #f5f3ff;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .clinical-title {
      font-weight: 700;
      color: #7e22ce;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e9d5ff;
    }
    
    .clinical-content {
      color: #1e293b;
      line-height: 1.6;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .items-table th {
      background: #f5f3ff;
      padding: 12px 15px;
      text-align: left;
      font-weight: 700;
      color: #7e22ce;
      border-bottom: 2px solid #a855f7;
    }
    
    .items-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    
    .items-table tr:last-child td {
      border-bottom: none;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
    }
    
    .status-completed {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .status-active {
      background: #dbeafe;
      color: #1d4ed8;
    }
    
    .status-pending {
      background: #fff7ed;
      color: #ea580c;
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
      
      .summary-container {
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
      background: linear-gradient(135deg, #7e22ce 0%, #a855f7 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
    }
    
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(168, 85, 247, 0.6);
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
  <div class="summary-container">
    <div class="header">
      <div class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v18m-7-7l7 7 7-7"></path>
        </svg>
      </div>
      <div class="hospital-name">${hospital.name}</div>
      <div class="hospital-details">
        ${hospital.address}<br>
        Tel: ${hospital.phone} | Email: ${hospital.email}
      </div>
      <div class="summary-badge">VISIT SUMMARY</div>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">Visit Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Visit Number</div>
            <div class="info-value">${attendance.attendanceNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Visit Date</div>
            <div class="info-value">${formatDate(attendance.dateTime)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Visit Type</div>
            <div class="info-value">${attendance.attendanceType?.replace(/_/g, ' ').toUpperCase()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge status-${attendance.status}">${attendance.status.toUpperCase()}</span>
            </div>
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
      
      ${attendance.complaints ? `
      <div class="section">
        <div class="section-title">Clinical Information</div>
        <div class="clinical-section">
          <div class="clinical-title">Chief Complaint</div>
          <div class="clinical-content">${attendance.complaints}</div>
        </div>
      </div>
      ` : ''}
      
      ${attendance.medicalNotes ? `
      <div class="section">
        <div class="clinical-section">
          <div class="clinical-title">Medical Notes</div>
          <div class="clinical-content">${attendance.medicalNotes}</div>
        </div>
      </div>
      ` : ''}
      
      ${attendance.diagnoses && attendance.diagnoses.length > 0 ? `
      <div class="section">
        <div class="section-title">Diagnoses</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Diagnosis</th>
              <th>ICD Code</th>
              <th>Type</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.diagnoses.map(diag => `
            <tr>
              <td>${diag.name || diag.diagnosisId?.name}</td>
              <td>${diag.icdCode || diag.diagnosisId?.icdCode || '-'}</td>
              <td>${diag.primary ? 'Primary' : 'Secondary'}</td>
              <td>${formatDate(diag.date)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${attendance.medications && attendance.medications.length > 0 ? `
      <div class="section">
        <div class="section-title">Medications</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.medications.map(med => `
            <tr>
              <td>${med.name}</td>
              <td>${med.dosage}</td>
              <td>${med.frequency}</td>
              <td style="text-transform: capitalize;">${med.status}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${attendance.labTests && attendance.labTests.length > 0 ? `
      <div class="section">
        <div class="section-title">Lab Tests</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.labTests.map(test => `
            <tr>
              <td>${test.name || test.templateId?.name}</td>
              <td style="text-transform: capitalize;">${test.priority}</td>
              <td style="text-transform: capitalize;">${test.status}</td>
              <td>${formatDate(test.requestedAt)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${attendance.procedures && attendance.procedures.length > 0 ? `
      <div class="section">
        <div class="section-title">Procedures</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Procedure</th>
              <th>Status</th>
              <th>Scheduled Date</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.procedures.map(proc => `
            <tr>
              <td>${proc.name || proc.templateId?.name}</td>
              <td style="text-transform: capitalize;">${proc.status}</td>
              <td>${proc.scheduledDate ? formatDate(proc.scheduledDate) : '-'}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${attendance.scans && attendance.scans.length > 0 ? `
      <div class="section">
        <div class="section-title">Scans & Imaging</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Scan Type</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.scans.map(scan => `
            <tr>
              <td>${scan.scanType}</td>
              <td>${scan.description}</td>
              <td style="text-transform: capitalize;">${scan.status}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <div class="footer">
        <p>This visit summary is issued by ${hospital.name}. Please keep this document for your records.</p>
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
        Print Visit Summary
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
