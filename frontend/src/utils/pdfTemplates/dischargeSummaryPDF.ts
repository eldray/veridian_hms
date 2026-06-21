// src/utils/pdfTemplates/dischargeSummaryPDF.ts - REDESIGNED PROFESSIONAL VERSION
import type { Admission, Attendance, Patient, Hospital, Diagnosis, Medication, Procedure } from '../../types';

export const generateDischargeSummaryHTML = (
  admission: any,
  attendance: any,
  patient: any,
  clinicalData: {
    diagnoses: any[];
    medications: any[];
    procedures: any[];
  },
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
  const patientDOB = patient?.dateOfBirth ? formatDate(patient.dateOfBirth) : 'N/A';

  // Get admission info
  const admissionNumber = admission?.admissionNumber || admission?.id || 'N/A';
  const admissionDate = admission?.admissionDate || admission?.createdAt || new Date().toISOString();
  const dischargeDate = admission?.dischargeDate || admission?.updatedAt || new Date().toISOString();
  const lengthOfStay = admission?.lengthOfStay || 'N/A';
  const wardName = admission?.ward?.wardName || admission?.wardName || 'N/A';
  const bedNumber = admission?.bed?.bedNumber || admission?.bedNumber || 'N/A';
  const admittingDoctor = admission?.admittingDoctor || admission?.doctor?.fullName || 'N/A';
  const admissionDiagnosis = admission?.admissionDiagnosis || 'Not specified';
  const dischargeDiagnosis = admission?.dischargeDiagnosis || '';
  const reasonForAdmission = admission?.reasonForAdmission || '';
  const dischargeSummary = admission?.dischargeSummary || '';
  const followUpInstructions = admission?.followUpInstructions || '';
  const dischargeStatus = admission?.status || 'discharged';

  // Get attendance info
  const attendanceNumber = attendance?.attendanceNumber || attendance?.id || 'N/A';
  const attendanceDate = attendance?.dateTime || attendance?.createdAt || new Date().toISOString();

  // Get clinical data
  const diagnoses = clinicalData?.diagnoses || [];
  const medications = clinicalData?.medications || [];
  const procedures = clinicalData?.procedures || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Discharge Summary - ${admissionNumber}</title>
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
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
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
      border-left: 3px solid #2563eb;
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
    
    /* ── CLINICAL BOX ── */
    .clinical-box {
      background: #eff6ff;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 12px 0;
      border-left: 4px solid #2563eb;
    }
    
    .clinical-box .label {
      font-size: 12px;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .clinical-box .text {
      font-size: 14px;
      color: #0f172a;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    
    /* ── TABLES ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin: 12px 0;
    }
    
    .data-table th {
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
    
    .data-table td {
      padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    
    .data-table tr:last-child td {
      border-bottom: none;
    }
    
    .data-table tr:hover {
      background: #f8fafc;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .status-active {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .status-completed {
      background: #dbeafe;
      color: #2563eb;
    }
    
    .status-discontinued {
      background: #fee2e2;
      color: #dc2626;
    }
    
    /* ── FOLLOW UP ── */
    .follow-up-box {
      background: #fffbeb;
      border: 2px solid #fde68a;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 16px 0;
    }
    
    .follow-up-box .label {
      font-size: 12px;
      font-weight: 700;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .follow-up-box .text {
      font-size: 14px;
      color: #78350f;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    
    /* ── SIGNATURES ── */
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
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
      font-size: 12px;
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
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
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
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
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
      
      .clinical-box,
      .follow-up-box {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .status-badge {
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
      .data-table { font-size: 12px; }
      .data-table th, .data-table td { padding: 8px 10px; }
      .no-print { flex-direction: column; padding: 16px; }
      .footer { flex-direction: column; text-align: center; }
      .signature-section { flex-direction: column; align-items: center; }
      .signature-line { margin: 32px auto 8px; }
    }
    
    @media screen and (max-width: 480px) {
      .patient-bar { grid-template-columns: 1fr; }
      .info-grid { grid-template-columns: 1fr; }
      .data-table { font-size: 11px; }
      .data-table th, .data-table td { padding: 6px 8px; }
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
        <div class="document-badge">DISCHARGE SUMMARY</div>
        <div class="document-number">${escapeHtml(admissionNumber)}</div>
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
        <span class="label">Date of Birth</span>
        <span class="value">${escapeHtml(patientDOB)} (${escapeHtml(patientAge)} yrs)</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Gender</span>
        <span class="value" style="text-transform: capitalize;">${escapeHtml(patientGender)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Contact</span>
        <span class="value">${escapeHtml(patientContact)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Discharge Status</span>
        <span class="value" style="text-transform: capitalize;">${escapeHtml(dischargeStatus)}</span>
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      <!-- ── ADMISSION INFO CARDS ── -->
      <div class="section-title">
        📋 Admission Information
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Admission Date</div>
          <div class="value">${formatDate(admissionDate)}</div>
        </div>
        <div class="info-card">
          <div class="label">Discharge Date</div>
          <div class="value">${formatDate(dischargeDate)}</div>
        </div>
        <div class="info-card">
          <div class="label">Length of Stay</div>
          <div class="value">${lengthOfStay} days</div>
        </div>
        <div class="info-card">
          <div class="label">Ward / Bed</div>
          <div class="value">${escapeHtml(wardName)} / ${escapeHtml(bedNumber)}</div>
        </div>
        <div class="info-card">
          <div class="label">Attending Doctor</div>
          <div class="value">${escapeHtml(admittingDoctor)}</div>
        </div>
        <div class="info-card">
          <div class="label">Visit Number</div>
          <div class="value">${escapeHtml(attendanceNumber)}</div>
        </div>
      </div>

      <!-- ── ADMISSION DIAGNOSIS ── -->
      <div class="section-title">
        🩺 Clinical Summary
      </div>
      
      <div class="clinical-box">
        <div class="label">Admission Diagnosis</div>
        <div class="text">${escapeHtml(admissionDiagnosis)}</div>
      </div>

      ${dischargeDiagnosis ? `
        <div class="clinical-box">
          <div class="label">Discharge Diagnosis</div>
          <div class="text">${escapeHtml(dischargeDiagnosis)}</div>
        </div>
      ` : ''}

      ${reasonForAdmission ? `
        <div class="clinical-box">
          <div class="label">Reason for Admission</div>
          <div class="text">${escapeHtml(reasonForAdmission)}</div>
        </div>
      ` : ''}

      ${dischargeSummary ? `
        <div class="clinical-box">
          <div class="label">Discharge Summary</div>
          <div class="text">${escapeHtml(dischargeSummary)}</div>
        </div>
      ` : ''}

      <!-- ── DIAGNOSES ── -->
      ${diagnoses.length > 0 ? `
        <div class="section-title" style="margin-top: 24px;">
          📝 Diagnoses
          <span class="count">(${diagnoses.length} items)</span>
        </div>
        
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40%;">Diagnosis</th>
              <th style="width: 20%;">ICD Code</th>
              <th style="width: 20%;">Type</th>
              <th style="width: 20%;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${diagnoses.map((diag: any) => `
              <tr>
                <td><strong>${escapeHtml(diag.name || diag.diagnosisId?.name || 'N/A')}</strong></td>
                <td>${escapeHtml(diag.icdCode || diag.diagnosisId?.icdCode || '-')}</td>
                <td>${diag.primary || diag.diagnosisType === 'primary' ? 'Primary' : 'Secondary'}</td>
                <td>${diag.date ? formatDateShort(diag.date) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- ── MEDICATIONS ── -->
      ${medications.length > 0 ? `
        <div class="section-title" style="margin-top: 24px;">
          💊 Medications
          <span class="count">(${medications.length} items)</span>
        </div>
        
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 30%;">Medication</th>
              <th style="width: 20%;">Dosage</th>
              <th style="width: 20%;">Frequency</th>
              <th style="width: 15%;">Duration</th>
              <th style="width: 15%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${medications.map((med: any) => `
              <tr>
                <td><strong>${escapeHtml(med.name || med.medicationName || 'N/A')}</strong></td>
                <td>${escapeHtml(med.dosage || med.dose || '-')}</td>
                <td>${escapeHtml(med.frequency || '-')}</td>
                <td>${escapeHtml(med.duration || '-')}</td>
                <td>
                  <span class="status-badge status-${med.status === 'completed' ? 'completed' : med.status === 'active' ? 'active' : 'discontinued'}">
                    ${escapeHtml(med.status || 'active')}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- ── PROCEDURES ── -->
      ${procedures.length > 0 ? `
        <div class="section-title" style="margin-top: 24px;">
          🔬 Procedures
          <span class="count">(${procedures.length} items)</span>
        </div>
        
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40%;">Procedure</th>
              <th style="width: 30%;">Date</th>
              <th style="width: 30%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${procedures.map((proc: any) => `
              <tr>
                <td><strong>${escapeHtml(proc.name || proc.templateId?.name || 'N/A')}</strong></td>
                <td>${proc.performedAt ? formatDateShort(proc.performedAt) : proc.date ? formatDateShort(proc.date) : '-'}</td>
                <td>
                  <span class="status-badge status-${proc.status === 'completed' ? 'completed' : 'active'}">
                    ${escapeHtml(proc.status || 'completed')}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- ── FOLLOW UP INSTRUCTIONS ── -->
      ${followUpInstructions ? `
        <div class="follow-up-box">
          <div class="label">📅 Follow-Up Instructions</div>
          <div class="text">${escapeHtml(followUpInstructions)}</div>
        </div>
      ` : ''}

      <!-- ── SIGNATURES ── -->
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Patient / Guardian</div>
          <div class="signature-name">________________________</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Attending Physician</div>
          <div class="signature-name">Dr. ${escapeHtml(admittingDoctor)}</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Discharge Date</div>
          <div class="signature-name">${formatDate(dischargeDate)}</div>
        </div>
      </div>

      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This discharge summary is issued by ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Document ID: DS-${escapeHtml(admissionNumber)}-${new Date().getTime().toString().slice(-6)}
          </p>
        </div>
        <div class="footer-right">
          <p style="font-size: 11px; color: #94a3b8;">
            Please keep this document for your records.
          </p>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            Generated: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
      
    </div>
    
    <!-- ── PRINT BUTTONS ── -->
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">
        🖨️ Print Discharge Summary
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