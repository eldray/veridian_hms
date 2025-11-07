// src/utils/pdfTemplates/dischargeSummaryPDF.ts
import type { Admission, Attendance, Patient, Hospital, Diagnosis, Medication, Procedure } from '../../types';

export const generateDischargeSummaryHTML = (
  admission: Admission,
  attendance: Attendance,
  patient: Patient,
  clinicalData: {
    diagnoses: Diagnosis[];
    medications: Medication[];
    procedures: Procedure[];
  },
  hospital: Hospital
): string => {
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
  <title>Discharge Summary - ${admission.admissionNumber}</title>
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
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
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
      color: #1e3a8a;
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
      background: #fbbf24;
      color: #1e3a8a;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(251, 191, 36, 0.3);
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
      color: #1e3a8a;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #bfdbfe;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }
    
    .info-item {
      background: #eff6ff;
      padding: 15px;
      border-radius: 12px;
      border-left: 4px solid #3b82f6;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e3a8a;
    }
    
    .clinical-section {
      background: #eff6ff;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .clinical-title {
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #bfdbfe;
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
      background: #eff6ff;
      padding: 12px 15px;
      text-align: left;
      font-weight: 700;
      color: #1e3a8a;
      border-bottom: 2px solid #3b82f6;
    }
    
    .items-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    
    .items-table tr:last-child td {
      border-bottom: none;
    }
    
    .follow-up-section {
      background: #fffbeb;
      border: 1px solid #fbbf24;
      border-radius: 12px;
      padding: 20px;
      margin: 25px 0;
    }
    
    .follow-up-title {
      font-weight: 700;
      color: #b45309;
      margin-bottom: 15px;
      font-size: 18px;
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
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(30, 64, 175, 0.4);
    }
    
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(30, 64, 175, 0.6);
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
          <path d="M12 3v18m-7-7l7 7 7-7"></path>
        </svg>
      </div>
      <div class="hospital-name">${hospital.name}</div>
      <div class="hospital-details">
        ${hospital.address}<br>
        Tel: ${hospital.phone} | Email: ${hospital.email}
      </div>
      <div class="summary-badge">DISCHARGE SUMMARY</div>
    </div>
    
    <div class="content">
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
        <div class="section-title">Admission Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Admission Number</div>
            <div class="info-value">${admission.admissionNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Admission Date</div>
            <div class="info-value">${formatDate(admission.admissionDate)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Discharge Date</div>
            <div class="info-value">${formatDate(admission.dischargeDate)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Length of Stay</div>
            <div class="info-value">${admission.lengthOfStay} days</div>
          </div>
          <div class="info-item">
            <div class="info-label">Ward</div>
            <div class="info-value">${admission.wardName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Bed Number</div>
            <div class="info-value">${admission.bedNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Attending Doctor</div>
            <div class="info-value">${admission.admittingDoctor}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Discharge Status</div>
            <div class="info-value" style="text-transform: capitalize;">${admission.status}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Clinical Summary</div>
        <div class="clinical-section">
          <div class="clinical-title">Admission Diagnosis</div>
          <div class="clinical-content">
            ${admission.admissionDiagnosis || 'Not specified'}
          </div>
        </div>
        
        ${admission.dischargeDiagnosis ? `
        <div class="clinical-section">
          <div class="clinical-title">Discharge Diagnosis</div>
          <div class="clinical-content">
            ${admission.dischargeDiagnosis}
          </div>
        </div>
        ` : ''}
        
        ${admission.reasonForAdmission ? `
        <div class="clinical-section">
          <div class="clinical-title">Reason for Admission</div>
          <div class="clinical-content">
            ${admission.reasonForAdmission}
          </div>
        </div>
        ` : ''}
        
        ${admission.dischargeSummary ? `
        <div class="clinical-section">
          <div class="clinical-title">Discharge Summary</div>
          <div class="clinical-content">
            ${admission.dischargeSummary}
          </div>
        </div>
        ` : ''}
      </div>
      
      ${clinicalData.diagnoses && clinicalData.diagnoses.length > 0 ? `
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
            ${clinicalData.diagnoses.map(diag => `
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
      
      ${clinicalData.medications && clinicalData.medications.length > 0 ? `
      <div class="section">
        <div class="section-title">Medications</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${clinicalData.medications.map(med => `
            <tr>
              <td>${med.name}</td>
              <td>${med.dosage}</td>
              <td>${med.frequency}</td>
              <td>${med.duration}</td>
              <td style="text-transform: capitalize;">${med.status}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${clinicalData.procedures && clinicalData.procedures.length > 0 ? `
      <div class="section">
        <div class="section-title">Procedures</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Procedure</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${clinicalData.procedures.map(proc => `
            <tr>
              <td>${proc.name || proc.templateId?.name}</td>
              <td>${proc.performedAt ? formatDate(proc.performedAt) : '-'}</td>
              <td style="text-transform: capitalize;">${proc.status}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${admission.followUpInstructions ? `
      <div class="follow-up-section">
        <div class="follow-up-title">Follow-Up Instructions</div>
        <div class="clinical-content">
          ${admission.followUpInstructions}
        </div>
      </div>
      ` : ''}
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Patient/Guardian</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Attending Physician</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Discharge Date: ${formatDate(admission.dischargeDate)}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>This discharge summary is issued by ${hospital.name}. Please keep this document for your records and follow up as instructed.</p>
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
        Print Discharge Summary
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
