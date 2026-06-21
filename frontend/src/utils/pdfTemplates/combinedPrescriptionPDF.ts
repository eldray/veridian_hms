// src/utils/pdfTemplates/combinedPrescriptionPDF.ts - REDESIGNED PROFESSIONAL VERSION
import type { Patient, Attendance, Hospital } from '../../types';

export const generateCombinedPrescriptionHTML = (
  medications: any[],
  patient: any,
  attendance: any,
  hospital: any,
  prescriberName: string
): string => {
  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return new Date().toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
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

  // Get attendance info
  const attendanceNumber = attendance?.attendanceNumber || attendance?.id || 'N/A';
  const attendanceDate = attendance?.dateTime || attendance?.createdAt || new Date().toISOString();

  // Get prescriber info
  const prescriber = prescriberName || 'Unknown';

  // Ensure medications is an array
  const meds = Array.isArray(medications) ? medications : [];

  // Format prescription instructions
  const formatInstruction = (med: any) => {
    const parts = [];
    if (med.dosage) parts.push(`${med.dosage}`);
    if (med.frequency) parts.push(`${med.frequency}`);
    if (med.duration) parts.push(`for ${med.duration}`);
    if (med.route) parts.push(`(${med.route})`);
    return parts.join(' ') || 'As prescribed';
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prescription - ${patientId}</title>
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
    
    .document-number {
      font-size: 14px;
      font-weight: 600;
      margin-top: 6px;
      opacity: 0.9;
    }
    
    /* ── RX BADGE ── */
    .rx-badge {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      border: 2px solid rgba(255,255,255,0.3);
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 4px;
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
    
    /* ── PRESCRIPTION TABLE ── */
    .prescription-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin: 16px 0;
    }
    
    .prescription-table th {
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
    
    .prescription-table td {
      padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    
    .prescription-table tr:last-child td {
      border-bottom: none;
    }
    
    .prescription-table tr:hover {
      background: #f8fafc;
    }
    
    .med-name {
      font-weight: 600;
      color: #0f172a;
    }
    
    .med-code {
      font-size: 11px;
      color: #94a3b8;
      display: block;
    }
    
    .med-instruction {
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    
    /* ── PRESCRIBER INFO ── */
    .prescriber-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .prescriber-box {
      text-align: center;
      min-width: 200px;
    }
    
    .signature-line {
      width: 200px;
      height: 1px;
      background: #94a3b8;
      margin: 32px auto 8px;
    }
    
    .prescriber-name {
      font-weight: 600;
      color: #0f172a;
      font-size: 15px;
    }
    
    .prescriber-title {
      font-size: 12px;
      color: #94a3b8;
    }
    
    /* ── INSTRUCTIONS ── */
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
      margin-bottom: 6px;
    }
    
    .instructions-box .text {
      font-size: 13px;
      color: #0f172a;
      line-height: 1.6;
    }
    
    /* ── NOTES ── */
    .notes-section {
      margin-top: 24px;
      padding: 16px 20px;
      background: #fef3c7;
      border-radius: 12px;
      border: 1px solid #fde68a;
    }
    
    .notes-section .label {
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .notes-section .text {
      font-size: 13px;
      color: #78350f;
      line-height: 1.5;
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
      
      .instructions-box,
      .notes-section {
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
      .prescription-table { font-size: 12px; }
      .prescription-table th, .prescription-table td { padding: 8px 10px; }
      .no-print { flex-direction: column; padding: 16px; }
      .footer { flex-direction: column; text-align: center; }
      .prescriber-section { flex-direction: column; align-items: center; }
      .signature-line { margin: 32px auto 8px; }
    }
    
    @media screen and (max-width: 480px) {
      .patient-bar { grid-template-columns: 1fr; }
      .prescription-table { font-size: 11px; }
      .prescription-table th, .prescription-table td { padding: 6px 8px; }
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
        <span class="value">${formatDate(attendanceDate)}</span>
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      <!-- ── PRESCRIPTION TABLE ── -->
      <div class="section-title">
        💊 Prescribed Medications
        <span class="count">(${meds.length} items)</span>
      </div>

      ${meds.length === 0 ? `
        <div style="text-align: center; padding: 30px; color: #94a3b8;">
          <div style="font-size: 32px; margin-bottom: 8px;">💊</div>
          No medications prescribed
        </div>
      ` : `
        <table class="prescription-table">
          <thead>
            <tr>
              <th style="width: 25%;">Medication</th>
              <th style="width: 20%;">Dosage</th>
              <th style="width: 20%;">Frequency</th>
              <th style="width: 15%;">Duration</th>
              <th style="width: 10%; text-align: center;">Qty</th>
              <th style="width: 10%; text-align: center;">Refills</th>
            </tr>
          </thead>
          <tbody>
            ${meds.map((med: any) => `
              <tr>
                <td>
                  <div class="med-name">${escapeHtml(med.name || med.description || 'Unknown')}</div>
                  ${med.code ? `<span class="med-code">Code: ${escapeHtml(med.code)}</span>` : ''}
                  ${med.instructions ? `<span class="med-code">${escapeHtml(med.instructions)}</span>` : ''}
                </td>
                <td>
                  ${escapeHtml(med.dosage || med.strength || '—')}
                  ${med.route ? `<div style="font-size: 11px; color: #94a3b8;">${escapeHtml(med.route)}</div>` : ''}
                </td>
                <td>
                  ${escapeHtml(med.frequency || '—')}
                  ${med.administration ? `<div style="font-size: 11px; color: #94a3b8;">${escapeHtml(med.administration)}</div>` : ''}
                </td>
                <td>${escapeHtml(med.duration || '—')}</td>
                <td style="text-align: center; font-weight: 600;">${med.quantity || 1}</td>
                <td style="text-align: center;">${med.refills || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}

      <!-- ── INSTRUCTIONS ── -->
      ${meds.some((m: any) => m.instructions) ? `
        <div class="instructions-box">
          <div class="label">📋 Special Instructions</div>
          <div class="text">
            ${meds.map((m: any) => {
              if (!m.instructions) return '';
              return `<div><strong>${escapeHtml(m.name || m.description)}:</strong> ${escapeHtml(m.instructions)}</div>`;
            }).filter(Boolean).join('')}
          </div>
        </div>
      ` : ''}

      <!-- ── GENERAL NOTES ── -->
      <div class="notes-section">
        <div class="label">⚠️ Important Notes</div>
        <div class="text">
          • Take medications exactly as prescribed.<br>
          • Do not stop taking medication without consulting your doctor.<br>
          • Store medications in a cool, dry place away from direct sunlight.<br>
          • If you experience any side effects, contact your healthcare provider immediately.<br>
          • This prescription is valid for 30 days from the date of issue.
        </div>
      </div>

      <!-- ── PRESCRIBER SECTION ── -->
      <div class="prescriber-section">
        <div class="prescriber-box">
          <div class="signature-line"></div>
          <div class="prescriber-name">Dr. ${escapeHtml(prescriber)}</div>
          <div class="prescriber-title">Prescribing Physician</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Medical License: #####</div>
        </div>
        <div class="prescriber-box">
          <div class="signature-line"></div>
          <div class="prescriber-name">________________________</div>
          <div class="prescriber-title">Patient/Guardian Signature</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Acknowledgment of receipt</div>
        </div>
      </div>

      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This is an official prescription from ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Prescription ID: RX-${escapeHtml(attendanceNumber)}-${new Date().getTime().toString().slice(-6)}
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