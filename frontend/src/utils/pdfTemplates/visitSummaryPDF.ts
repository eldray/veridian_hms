// src/utils/pdfTemplates/visitSummaryPDF.ts - REDESIGNED PROFESSIONAL VERSION
import type { Attendance, Patient, Hospital } from '../../types';

export const generateVisitSummaryHTML = (
  attendance: any,
  patient: any,
  hospital: any
): string => {
  // Format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

  // Get attendance info
  const attendanceNumber = attendance?.attendanceNumber || attendance?.id || 'N/A';
  const attendanceDate = attendance?.dateTime || attendance?.createdAt || new Date().toISOString();
  const attendanceType = attendance?.attendanceType || attendance?.type || 'N/A';
  const attendanceStatus = attendance?.status || 'N/A';
  const complaints = attendance?.complaints || attendance?.chiefComplaint || '';
  const medicalNotes = attendance?.medicalNotes || attendance?.notes || attendance?.clinicalNotes || '';
  const examination = attendance?.examination || attendance?.physicalExam || '';
  const vitals = attendance?.vitals || attendance?.vitalSigns || null;

  // Get arrays
  const diagnoses = attendance?.diagnoses || attendance?.AttendanceDiagnosis || [];
  const medications = attendance?.medications || attendance?.Medication || [];
  const labTests = attendance?.labTests || attendance?.LabTest || [];
  const procedures = attendance?.procedures || attendance?.Procedure || [];
  const scans = attendance?.scans || attendance?.Scan || [];

  // Get status badge class
  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      completed: 'status-completed',
      active: 'status-active',
      pending: 'status-pending',
      admitted: 'status-admitted',
      discharged: 'status-discharged',
    };
    return map[status?.toLowerCase()] || 'status-pending';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      completed: 'COMPLETED',
      active: 'ACTIVE',
      pending: 'PENDING',
      admitted: 'ADMITTED',
      discharged: 'DISCHARGED',
    };
    return map[status?.toLowerCase()] || status?.toUpperCase() || 'PENDING';
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Visit Summary - ${attendanceNumber}</title>
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
      background: linear-gradient(135deg, #7e22ce 0%, #a855f7 100%);
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
    
    .status-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 6px;
    }
    
    .status-completed { background: #dcfce7; color: #16a34a; }
    .status-active { background: #dbeafe; color: #2563eb; }
    .status-pending { background: #fef3c7; color: #d97706; }
    .status-admitted { background: #ede9fe; color: #7c3aed; }
    .status-discharged { background: #d1fae5; color: #065f46; }
    
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
      border-left: 3px solid #a855f7;
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
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 12px 0;
      border: 1px solid #e2e8f0;
    }
    
    .clinical-box .label {
      font-size: 11px;
      font-weight: 700;
      color: #7e22ce;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .clinical-box .text {
      font-size: 14px;
      color: #0f172a;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    
    .clinical-box.purple {
      background: #f5f3ff;
      border-color: #e9d5ff;
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
    
    /* ── VITALS ── */
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin: 12px 0;
    }
    
    .vital-item {
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 10px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    
    .vital-item .value {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }
    
    .vital-item .label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      background: linear-gradient(135deg, #7e22ce 0%, #a855f7 100%);
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
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
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
      .vitals-grid { grid-template-columns: 1fr 1fr; }
      .data-table { font-size: 12px; }
      .data-table th, .data-table td { padding: 8px 10px; }
      .no-print { flex-direction: column; padding: 16px; }
      .footer { flex-direction: column; text-align: center; }
    }
    
    @media screen and (max-width: 480px) {
      .patient-bar { grid-template-columns: 1fr; }
      .info-grid { grid-template-columns: 1fr; }
      .vitals-grid { grid-template-columns: 1fr; }
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
        <div class="document-badge">VISIT SUMMARY</div>
        <div class="document-number">${escapeHtml(attendanceNumber)}</div>
        <span class="status-badge ${getStatusClass(attendanceStatus)}">${getStatusLabel(attendanceStatus)}</span>
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
        <span class="label">Visit Date</span>
        <span class="value">${formatDate(attendanceDate)}</span>
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      <!-- ── VISIT INFO CARDS ── -->
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Visit Number</div>
          <div class="value">${escapeHtml(attendanceNumber)}</div>
        </div>
        <div class="info-card">
          <div class="label">Visit Type</div>
          <div class="value" style="text-transform: capitalize;">${escapeHtml(attendanceType.replace(/_/g, ' '))}</div>
        </div>
        <div class="info-card">
          <div class="label">Visit Status</div>
          <div class="value" style="text-transform: capitalize;">${escapeHtml(attendanceStatus)}</div>
        </div>
        <div class="info-card">
          <div class="label">Generated</div>
          <div class="value">${formatDateTime(new Date().toISOString())}</div>
        </div>
      </div>

      <!-- ── VITALS ── -->
      ${vitals ? `
        <div class="section-title">📊 Vital Signs</div>
        <div class="vitals-grid">
          ${vitals.systolic ? `<div class="vital-item"><div class="value">${vitals.systolic}/${vitals.diastolic}</div><div class="label">Blood Pressure</div></div>` : ''}
          ${vitals.heartRate ? `<div class="vital-item"><div class="value">${vitals.heartRate}</div><div class="label">Heart Rate (bpm)</div></div>` : ''}
          ${vitals.respiratoryRate ? `<div class="vital-item"><div class="value">${vitals.respiratoryRate}</div><div class="label">Respiratory Rate</div></div>` : ''}
          ${vitals.temperature ? `<div class="vital-item"><div class="value">${vitals.temperature}°C</div><div class="label">Temperature</div></div>` : ''}
          ${vitals.oxygenSaturation ? `<div class="vital-item"><div class="value">${vitals.oxygenSaturation}%</div><div class="label">SpO₂</div></div>` : ''}
          ${vitals.weight ? `<div class="vital-item"><div class="value">${vitals.weight}kg</div><div class="label">Weight</div></div>` : ''}
          ${vitals.height ? `<div class="vital-item"><div class="value">${vitals.height}cm</div><div class="label">Height</div></div>` : ''}
          ${vitals.bmi ? `<div class="vital-item"><div class="value">${vitals.bmi}</div><div class="label">BMI</div></div>` : ''}
        </div>
      ` : ''}

      <!-- ── CHIEF COMPLAINT ── -->
      ${complaints ? `
        <div class="section-title">🩺 Chief Complaint</div>
        <div class="clinical-box purple">
          <div class="text">${escapeHtml(complaints)}</div>
        </div>
      ` : ''}

      <!-- ── EXAMINATION ── -->
      ${examination ? `
        <div class="section-title">🔬 Examination Findings</div>
        <div class="clinical-box">
          <div class="text">${escapeHtml(examination)}</div>
        </div>
      ` : ''}

      <!-- ── MEDICAL NOTES ── -->
      ${medicalNotes ? `
        <div class="section-title">📋 Medical Notes</div>
        <div class="clinical-box">
          <div class="text">${escapeHtml(medicalNotes)}</div>
        </div>
      ` : ''}

      <!-- ── DIAGNOSES ── -->
      ${diagnoses.length > 0 ? `
        <div class="section-title">
          🩺 Diagnoses
          <span class="count">(${diagnoses.length})</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40%;">Diagnosis</th>
              <th style="width: 25%;">ICD-10 Code</th>
              <th style="width: 20%;">Type</th>
              <th style="width: 15%;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${diagnoses.map((diag: any) => `
              <tr>
                <td><strong>${escapeHtml(diag.name || diag.Diagnosis?.name || 'N/A')}</strong></td>
                <td>${escapeHtml(diag.icdCode || diag.Diagnosis?.icdCode || '-')}</td>
                <td>${diag.primary || diag.diagnosisType === 'primary' ? 'Primary' : 'Secondary'}</td>
                <td>${diag.date ? formatDateShort(diag.date) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- ── MEDICATIONS ── -->
      ${medications.length > 0 ? `
        <div class="section-title">
          💊 Medications
          <span class="count">(${medications.length})</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 30%;">Medication</th>
              <th style="width: 20%;">Dosage</th>
              <th style="width: 25%;">Frequency</th>
              <th style="width: 25%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${medications.map((med: any) => `
              <tr>
                <td><strong>${escapeHtml(med.name || med.medicationName || 'N/A')}</strong></td>
                <td>${escapeHtml(med.dosage || med.dose || '-')}</td>
                <td>${escapeHtml(med.frequency || '-')}</td>
                <td><span style="text-transform: capitalize;">${escapeHtml(med.status || 'active')}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- ── LAB TESTS ── -->
      ${labTests.length > 0 ? `
        <div class="section-title">
          🔬 Lab Tests
          <span class="count">(${labTests.length})</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35%;">Test Name</th>
              <th style="width: 20%;">Priority</th>
              <th style="width: 25%;">Status</th>
              <th style="width: 20%;">Requested</th>
            </tr>
          </thead>
          <tbody>
            ${labTests.map((test: any) => `
              <tr>
                <td><strong>${escapeHtml(test.name || test.LabTestTemplate?.name || 'N/A')}</strong></td>
                <td style="text-transform: capitalize;">${escapeHtml(test.priority || 'routine')}</td>
                <td style="text-transform: capitalize;">${escapeHtml(test.status || 'pending')}</td>
                <td>${test.requestedAt ? formatDateShort(test.requestedAt) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- ── PROCEDURES ── -->
      ${procedures.length > 0 ? `
        <div class="section-title">
          🔬 Procedures
          <span class="count">(${procedures.length})</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40%;">Procedure</th>
              <th style="width: 30%;">Status</th>
              <th style="width: 30%;">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            ${procedures.map((proc: any) => `
              <tr>
                <td><strong>${escapeHtml(proc.name || proc.ProcedureTemplate?.name || 'N/A')}</strong></td>
                <td style="text-transform: capitalize;">${escapeHtml(proc.status || 'scheduled')}</td>
                <td>${proc.scheduledDate ? formatDateShort(proc.scheduledDate) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- ── SCANS ── -->
      ${scans.length > 0 ? `
        <div class="section-title">
          🖼️ Scans & Imaging
          <span class="count">(${scans.length})</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40%;">Scan Type</th>
              <th style="width: 35%;">Description</th>
              <th style="width: 25%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${scans.map((scan: any) => `
              <tr>
                <td><strong>${escapeHtml(scan.scanType || scan.name || 'N/A')}</strong></td>
                <td>${escapeHtml(scan.description || '-')}</td>
                <td style="text-transform: capitalize;">${escapeHtml(scan.status || 'pending')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This visit summary is issued by ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Summary ID: VS-${escapeHtml(attendanceNumber)}-${new Date().getTime().toString().slice(-6)}
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
        🖨️ Print Visit Summary
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