// src/utils/pdfTemplates/referralLetterPDF.ts - REDESIGNED PROFESSIONAL VERSION
import type { Patient, Hospital } from '../../types';

export const generateReferralLetterHTML = (
  referral: any,
  patient: any,
  hospital: any
): string => {
  // Format dates
  const formatDate = (dateString?: string) => {
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

  const formatDateShort = (dateString?: string) => {
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

  const formatDateTime = (dateString?: string) => {
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

  // Safely get patient name
  const getPatientName = () => {
    if (patient?.surname && patient?.otherNames) {
      return `${patient.surname} ${patient.otherNames}`;
    }
    if (patient?.fullName) return patient.fullName;
    if (patient?.name) return patient.name;
    return 'Patient Name Not Available';
  };

  // Get hospital info
  const hospitalName = hospital?.name || 'Veridian Hospital';
  const hospitalAddress = hospital?.address || '123 Medical Center Drive, Accra, Ghana';
  const hospitalPhone = hospital?.phone || '+233-24-123-4567';
  const hospitalEmail = hospital?.email || 'info@veridianhospital.gov.gh';

  // Get patient info
  const patientName = getPatientName();
  const patientId = patient?.folderNumber || patient?.id || 'N/A';
  const patientDOB = patient?.dateOfBirth ? formatDate(patient.dateOfBirth) : 'N/A';
  const patientGender = patient?.gender || 'N/A';
  const patientContact = patient?.contact || patient?.phone || patient?.mobile || 'N/A';

  // Get referral info
  const referralNumber = referral?.referralNumber || 'N/A';
  const referralDate = referral?.referralDate || new Date().toISOString();
  const urgency = referral?.urgency || 'routine';
  const referralReason = referral?.referralReason || referral?.reason || 'Not specified';
  const referralNotes = referral?.referralNotes || '';
  const referredToFacility = referral?.referredToFacility || '_________________________';
  const referredToDoctor = referral?.referredToDoctor || 'Medical Officer';
  const referredToDepartment = referral?.referredToDepartment || 'General';
  const referringClinician = referral?.referringClinician || referral?.createdBy?.fullName || 'Unknown';

  // Get urgency badge class and label
  const getUrgencyClass = (urgency: string) => {
    const map: Record<string, string> = {
      routine: 'urgency-routine',
      urgent: 'urgency-urgent',
      stat: 'urgency-stat',
    };
    return map[urgency?.toLowerCase()] || 'urgency-routine';
  };

  const getUrgencyLabel = (urgency: string) => {
    const map: Record<string, string> = {
      routine: 'ROUTINE',
      urgent: 'URGENT',
      stat: 'STAT',
    };
    return map[urgency?.toLowerCase()] || urgency?.toUpperCase() || 'ROUTINE';
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Referral Letter - ${referralNumber}</title>
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
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
      overflow: hidden;
    }
    
    /* ── HEADER ── */
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
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
    
    .urgency-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 6px;
    }
    
    .urgency-routine {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .urgency-urgent {
      background: #fef3c7;
      color: #d97706;
    }
    
    .urgency-stat {
      background: #fee2e2;
      color: #dc2626;
      animation: pulse-stat 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse-stat {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
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
    
    /* ── TO SECTION ── */
    .to-section {
      background: #eff6ff;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 16px 0;
      border-left: 4px solid #3b82f6;
    }
    
    .to-section .facility {
      font-size: 18px;
      font-weight: 700;
      color: #1e3a8a;
    }
    
    .to-section .attn {
      font-size: 14px;
      color: #475569;
      margin-top: 4px;
    }
    
    .to-section .department {
      font-size: 13px;
      color: #64748b;
      margin-top: 2px;
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
    
    /* ── CLINICAL CONTENT ── */
    .clinical-box {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px 20px;
      border: 1px solid #e2e8f0;
      line-height: 1.8;
      font-size: 14px;
      color: #1e293b;
      white-space: pre-wrap;
    }
    
    .clinical-box.notes {
      background: #fef3c7;
      border-color: #fde68a;
    }
    
    .clinical-box .label {
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
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
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
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
      
      .to-section {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .urgency-badge {
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
      .no-print { flex-direction: column; padding: 16px; }
      .footer { flex-direction: column; text-align: center; }
      .signature-section { flex-direction: column; align-items: center; }
      .signature-line { margin: 32px auto 8px; }
    }
    
    @media screen and (max-width: 480px) {
      .patient-bar { grid-template-columns: 1fr; }
      .info-grid { grid-template-columns: 1fr; }
      .to-section .facility { font-size: 16px; }
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
        <div class="document-badge">REFERRAL LETTER</div>
        <div class="document-number">${escapeHtml(referralNumber)}</div>
        <span class="urgency-badge ${getUrgencyClass(urgency)}">
          ⚡ ${getUrgencyLabel(urgency)}
        </span>
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
        <span class="value">${escapeHtml(patientDOB)}</span>
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
        <span class="label">Referral Date</span>
        <span class="value">${formatDate(referralDate)}</span>
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      <!-- ── TO SECTION ── -->
      <div class="section-title">📬 To:</div>
      
      <div class="to-section">
        <div class="facility">${escapeHtml(referredToFacility)}</div>
        <div class="attn">Attn: ${escapeHtml(referredToDoctor)}</div>
        <div class="department">Department: ${escapeHtml(referredToDepartment)}</div>
      </div>

      <!-- ── PATIENT INFORMATION ── -->
      <div class="section-title">👤 Patient Information</div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Name</div>
          <div class="value">${escapeHtml(patientName)}</div>
        </div>
        <div class="info-card">
          <div class="label">Folder Number</div>
          <div class="value">${escapeHtml(patientId)}</div>
        </div>
        <div class="info-card">
          <div class="label">Date of Birth</div>
          <div class="value">${escapeHtml(patientDOB)}</div>
        </div>
        <div class="info-card">
          <div class="label">Gender</div>
          <div class="value" style="text-transform: capitalize;">${escapeHtml(patientGender)}</div>
        </div>
        <div class="info-card">
          <div class="label">Contact</div>
          <div class="value">${escapeHtml(patientContact)}</div>
        </div>
        <div class="info-card">
          <div class="label">Referral Number</div>
          <div class="value" style="font-family: monospace;">${escapeHtml(referralNumber)}</div>
        </div>
      </div>

      <!-- ── REASON FOR REFERRAL ── -->
      <div class="section-title">📝 Reason for Referral</div>
      
      <div class="clinical-box">
        ${escapeHtml(referralReason)}
      </div>

      <!-- ── ADDITIONAL NOTES ── -->
      ${referralNotes ? `
        <div class="section-title" style="margin-top: 24px;">📋 Additional Notes</div>
        
        <div class="clinical-box notes">
          <div class="label">📝 Notes from Referring Clinician</div>
          ${escapeHtml(referralNotes)}
        </div>
      ` : ''}

      <!-- ── SIGNATURES ── -->
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Referring Clinician</div>
          <div class="signature-name">${escapeHtml(referringClinician)}</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Signature &amp; Stamp</div>
          <div class="signature-name">_____________________</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Date</div>
          <div class="signature-name">${formatDate(new Date().toISOString())}</div>
        </div>
      </div>

      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This is an official referral letter from ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Please direct all communication to the referring clinician.
          </p>
          <p style="margin-top: 2px; font-size: 11px; color: #cbd5e1;">
            Referral ID: ${escapeHtml(referralNumber)}-${new Date().getTime().toString().slice(-6)}
          </p>
        </div>
        <div class="footer-right">
          <p style="font-size: 11px; color: #94a3b8;">
            ${urgency?.toUpperCase() || 'ROUTINE'} REFERRAL
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
        🖨️ Print Referral Letter
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