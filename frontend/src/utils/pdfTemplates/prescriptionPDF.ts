// src/utils/pdfTemplates/prescriptionPDF.ts - REDESIGNED PROFESSIONAL VERSION
import type { Medication, Patient, Attendance, Hospital } from '../../types';

export const generatePrescriptionHTML = (
  medication: any,
  patient: any,
  attendance: any,
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
  const patientDOB = patient?.dateOfBirth ? formatDate(patient.dateOfBirth) : 'N/A';
  const patientAge = patient?.age || patient?.ageYears || 'N/A';
  const patientGender = patient?.gender || 'N/A';
  const patientContact = patient?.contact || patient?.phone || patient?.mobile || 'N/A';

  // Get medication info
  const medName = medication?.name || medication?.medicationName || 'Unknown Medication';
  const dosage = medication?.dosage || medication?.dose || 'As directed';
  const route = medication?.route || medication?.administrationRoute || 'oral';
  const frequency = medication?.frequency || 'As prescribed';
  const duration = medication?.duration || 'As directed';
  const quantity = medication?.quantity || 1;
  const instructions = medication?.instructions || medication?.specialInstructions || '';
  const notes = medication?.notes || medication?.prescriberNotes || '';
  const prescribedBy = medication?.prescribedBy || medication?.prescriberName || 'Unknown';
  const prescribedAt = medication?.prescribedAt || medication?.createdAt || new Date().toISOString();
  const refills = medication?.refills || 0;
  const strength = medication?.strength || medication?.concentration || '';

  // Get attendance info
  const attendanceNumber = attendance?.attendanceNumber || attendance?.id || 'N/A';
  const attendanceType = attendance?.attendanceType || attendance?.type || 'N/A';
  const attendanceDate = attendance?.dateTime || attendance?.createdAt || new Date().toISOString();

  // Format instruction text
  const instructionText = `Take ${dosage} ${route ? `by ${route}` : ''} ${frequency.toLowerCase()}, for ${duration}.`;
  const strengthText = strength ? ` (${strength})` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prescription - ${medName}</title>
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
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
      overflow: hidden;
    }
    
    /* ── HEADER ── */
    .header {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
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
    
    .rx-badge {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      border: 2px solid rgba(255,255,255,0.3);
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    
    .document-number {
      font-size: 14px;
      font-weight: 600;
      margin-top: 6px;
      opacity: 0.8;
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
      border-left: 3px solid #dc2626;
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
    
    /* ── MEDICATION CARD ── */
    .medication-card {
      background: #fef2f2;
      border-radius: 16px;
      padding: 24px 28px;
      border: 2px solid #fecaca;
      margin: 16px 0 24px;
      text-align: center;
    }
    
    .medication-name {
      font-size: 26px;
      font-weight: 700;
      color: #dc2626;
      margin-bottom: 4px;
    }
    
    .medication-strength {
      font-size: 16px;
      color: #b91c1c;
      margin-bottom: 16px;
    }
    
    .medication-instruction {
      font-size: 18px;
      font-weight: 500;
      color: #0f172a;
      padding: 16px 20px;
      background: white;
      border-radius: 12px;
      border: 1px dashed #dc2626;
      line-height: 1.6;
    }
    
    .medication-meta {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-top: 16px;
      font-size: 14px;
      color: #475569;
    }
    
    .medication-meta span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    /* ── INSTRUCTIONS BOX ── */
    .instructions-box {
      background: #f0fdfa;
      border: 2px solid #ccfbf1;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 16px 0;
    }
    
    .instructions-box .label {
      font-size: 11px;
      font-weight: 700;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .instructions-box .text {
      font-size: 14px;
      color: #0f172a;
      line-height: 1.6;
    }
    
    /* ── WARNING BOX ── */
    .warning-box {
      background: #fffbeb;
      border: 2px solid #fde68a;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 16px 0;
    }
    
    .warning-box .label {
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .warning-box ul {
      padding-left: 20px;
      margin-top: 4px;
      color: #78350f;
      font-size: 13px;
      line-height: 1.8;
    }
    
    .warning-box ul li {
      margin-bottom: 2px;
    }
    
    /* ── PRESCRIBER SECTION ── */
    .prescriber-section {
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
    
    .signature-date {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
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
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
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
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
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
      
      .medication-card {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .instructions-box,
      .warning-box {
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
      .medication-name { font-size: 20px; }
      .medication-instruction { font-size: 16px; }
      .medication-meta { flex-direction: column; gap: 8px; }
      .no-print { flex-direction: column; padding: 16px; }
      .footer { flex-direction: column; text-align: center; }
      .prescriber-section { flex-direction: column; align-items: center; }
      .signature-line { margin: 32px auto 8px; }
    }
    
    @media screen and (max-width: 480px) {
      .patient-bar { grid-template-columns: 1fr; }
      .info-grid { grid-template-columns: 1fr; }
      .medication-card { padding: 16px; }
      .medication-name { font-size: 18px; }
      .medication-instruction { font-size: 14px; padding: 12px; }
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
        <div class="document-badge">PRESCRIPTION</div>
        <div class="rx-badge">Rx</div>
        <div class="document-number">${escapeHtml(attendanceNumber)}</div>
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
        <span class="label">Prescription Date</span>
        <span class="value">${formatDate(prescribedAt)}</span>
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      <!-- ── PRESCRIBER INFO ── -->
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Prescribed By</div>
          <div class="value">${escapeHtml(prescribedBy)}</div>
        </div>
        <div class="info-card">
          <div class="label">Visit Type</div>
          <div class="value" style="text-transform: capitalize;">${escapeHtml(attendanceType)}</div>
        </div>
        <div class="info-card">
          <div class="label">Refills</div>
          <div class="value">${refills} refill${refills !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <!-- ── MEDICATION ── -->
      <div class="medication-card">
        <div class="medication-name">${escapeHtml(medName)}</div>
        ${strength ? `<div class="medication-strength">${escapeHtml(strength)}</div>` : ''}
        <div class="medication-instruction">
          ${escapeHtml(instructionText)}
        </div>
        <div class="medication-meta">
          <span>📦 Quantity: ${quantity}</span>
          <span>🔄 Refills: ${refills}</span>
          <span>📅 ${formatDateShort(prescribedAt)}</span>
        </div>
      </div>

      <!-- ── SPECIAL INSTRUCTIONS ── -->
      ${instructions ? `
        <div class="instructions-box">
          <div class="label">📋 Special Instructions</div>
          <div class="text">${escapeHtml(instructions)}</div>
        </div>
      ` : ''}

      <!-- ── PRESCRIBER NOTES ── -->
      ${notes ? `
        <div class="instructions-box" style="border-color: #fde68a; background: #fffbeb;">
          <div class="label" style="color: #92400e;">📝 Prescriber Notes</div>
          <div class="text" style="color: #78350f;">${escapeHtml(notes)}</div>
        </div>
      ` : ''}

      <!-- ── IMPORTANT WARNINGS ── -->
      <div class="warning-box">
        <div class="label">⚠️ Important Information</div>
        <ul>
          <li>Take exactly as prescribed by your healthcare provider</li>
          <li>Complete the full course even if symptoms improve</li>
          <li>Do not stop taking this medication without consulting your doctor</li>
          <li>Report any adverse reactions or side effects immediately</li>
          <li>Store in a cool, dry place away from direct sunlight</li>
          ${refills > 0 ? `<li>This prescription has ${refills} refill${refills !== 1 ? 's' : ''} remaining</li>` : ''}
        </ul>
      </div>

      <!-- ── PRESCRIBER SECTION ── -->
      <div class="prescriber-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Patient / Guardian Signature</div>
          <div class="signature-name">_____________________</div>
          <div class="signature-date">Acknowledgment of receipt</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Prescribing Physician</div>
          <div class="signature-name">${escapeHtml(prescribedBy)}</div>
          <div class="signature-date">${formatDate(prescribedAt)}</div>
        </div>
      </div>

      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This is an official prescription from ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Prescription ID: RX-${escapeHtml(attendanceNumber)}-${new Date().getTime().toString().slice(-6)}
          </p>
          <p style="margin-top: 2px; font-size: 11px; color: #cbd5e1;">
            Valid for 30 days from date of issue
          </p>
        </div>
        <div class="footer-right">
          <p style="font-size: 11px; color: #94a3b8;">
            Generated: ${new Date().toLocaleString()}
          </p>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            Page 1 of 1
          </p>
        </div>
      </div>
      
    </div>
    
    <!-- ── PRINT BUTTONS ── -->
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">
        🖨️ Print Prescription
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