// src/utils/pdfTemplates/insuranceClaimPDF.ts - REDESIGNED PROFESSIONAL VERSION
import type { Hospital } from '../../types';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return '';
  }
};

const formatDateLong = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '';
  }
};

const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const formatCurrency = (amount: any): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const escapeHtml = (text: string): string => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const getStatusClass = (status: string): string => {
  const map: Record<string, string> = {
    draft: 'status-draft',
    submitted: 'status-submitted',
    approved: 'status-approved',
    paid: 'status-paid',
    rejected: 'status-rejected',
  };
  return map[status?.toLowerCase()] || 'status-draft';
};

const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    draft: 'DRAFT',
    submitted: 'SUBMITTED',
    approved: 'APPROVED',
    paid: 'PAID',
    rejected: 'REJECTED',
  };
  return map[status?.toLowerCase()] || status?.toUpperCase() || 'DRAFT';
};

// ==========================================
// MAIN EXPORTED FUNCTION
// ==========================================

export const generateInsuranceClaimHTML = (
  claim: any,
  patient: any,
  hospital: any
): string => {
  // Detect claim type
  const isNHIS = claim?.InsuranceProvider?.type === 'nhis' || 
                 claim?.insuranceProvider?.type === 'nhis' ||
                 claim?.typeOfService === 'NHIS' ||
                 claim?.Attendance?.paymentMode === 'nhis';

  // Extract data
  const attendance = claim?.Attendance;
  const diagnoses = attendance?.AttendanceDiagnosis || [];
  const labTests = attendance?.LabTest || [];
  const scans = attendance?.Scan || [];
  const medications = attendance?.Medication || [];
  const procedures = attendance?.Procedure || [];
  const services = attendance?.ServiceRendered || [];

  // Calculate age
  const calculateAge = (dob: string, refDate: string): number => {
    if (!dob) return 0;
    try {
      const birth = new Date(dob);
      const ref = new Date(refDate);
      if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return 0;
      let age = ref.getFullYear() - birth.getFullYear();
      const m = ref.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
      return Math.max(0, age);
    } catch {
      return 0;
    }
  };

  const age = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth, attendance?.dateTime || new Date().toISOString()) : 0;

  // Get patient info
  const patientName = patient?.surname && patient?.otherNames 
    ? `${patient.surname} ${patient.otherNames}` 
    : patient?.fullName || 'Unknown Patient';
  const patientId = patient?.folderNumber || patient?.id || 'N/A';
  const patientContact = patient?.contact || patient?.phone || patient?.mobile || 'N/A';
  const patientGender = patient?.gender || 'N/A';
  const patientDOB = patient?.dateOfBirth ? formatDateLong(patient.dateOfBirth) : 'N/A';
  const memberNumber = patient?.insurancePolicyNumber || patient?.nhisNumber || patient?.folderNumber || 'N/A';
  const cccCode = attendance?.nhisCCC || patient?.nhisNumber || '';

  // Get hospital info
  const hospitalName = hospital?.name || 'Veridian Hospital';
  const hospitalAddress = hospital?.address || '123 Medical Center Drive, Accra, Ghana';
  const hospitalPhone = hospital?.phone || '+233-24-123-4567';
  const hospitalEmail = hospital?.email || 'info@veridianhospital.gov.gh';
  const facilityCode = hospital?.nhisFacilityCode || 'FAC001';

  // Get claim info
  const claimNumber = claim?.claimNumber || 'N/A';
  const status = claim?.status || 'draft';
  const totalAmount = claim?.totalClaimAmount || claim?.Bill?.totalAmount || 0;
  const approvedAmount = claim?.approvedAmount || 0;
  const paidAmount = claim?.paidAmount || 0;
  const principalGDRG = claim?.principalGDRG || claim?.gdrgCodes?.[0] || 'OPDC06A';
  const mdcCode = claim?.mdcCode || principalGDRG?.slice(0, 4) || 'OPDC';
  const ageSplit = age >= 12 ? 'A' : 'C';
  const providerName = claim?.InsuranceProvider?.name || claim?.insuranceProvider?.name || 'N/A';
  const typeOfService = attendance?.Admission ? 'In-Patient' : 'Out-Patient';
  const serviceOutcome = attendance?.status === 'completed' ? 'Discharged' : 'Continued';
  const typeOfAttendance = attendance?.attendanceType === 'emergency_acute' ? 'Emergency/Acute Episode' 
    : attendance?.attendanceType === 'antenatal' ? 'ANC' 
    : attendance?.attendanceType === 'delivery' ? 'Delivery'
    : attendance?.attendanceType === 'surgery' ? 'Surgery'
    : 'Chronic/Follow-up';

  // Calculate totals
  const medicationsTotal = medications.reduce((sum: number, m: any) => sum + ((m.quantity || 1) * (m.unitPrice || m.dispensedUnitCost || 0)), 0);
  const investigationsTotal = [...labTests, ...scans].reduce((sum: number, i: any) => sum + (i.unitPrice || 0), 0);
  const proceduresTotal = procedures.reduce((sum: number, p: any) => sum + (p.unitPrice || 0), 0);
  const servicesTotal = services.reduce((sum: number, s: any) => sum + (s.unitPrice || 0), 0);
  const gdrgAmount = totalAmount - medicationsTotal - investigationsTotal - proceduresTotal - servicesTotal;

  // Combine investigations
  const investigations = [
    ...labTests.map((l: any) => ({ 
      name: l.ServiceCatalog?.name || l.name || 'Lab Test',
      date: l.requestedAt || l.createdAt,
      code: l.ServiceCatalog?.investigationCode || l.ServiceCatalog?.nhisServiceCode || '',
      amount: l.unitPrice || 0
    })),
    ...scans.map((s: any) => ({ 
      name: s.ServiceCatalog?.name || s.name || 'Scan',
      date: s.requestedAt || s.createdAt,
      code: s.ServiceCatalog?.investigationCode || s.ServiceCatalog?.nhisServiceCode || '',
      amount: s.unitPrice || 0
    }))
  ];

  // Generate items HTML
  const generateItemsHTML = () => {
    let html = '';
    const allItems = [
      ...medications.map((m: any) => ({ 
        type: 'Medication', 
        name: m.name || m.ServiceCatalog?.name || 'Medication', 
        details: `${m.dosage || ''} ${m.frequency || ''} x ${m.duration || ''}`.trim() || 'As prescribed',
        code: m.code || m.StockItem?.drugCode || '',
        quantity: m.quantity || 1,
        unitPrice: m.unitPrice || m.dispensedUnitCost || 0,
        total: (m.quantity || 1) * (m.unitPrice || m.dispensedUnitCost || 0)
      })),
      ...investigations.map((i: any) => ({ 
        type: 'Investigation', 
        name: i.name, 
        details: '',
        code: i.code,
        quantity: 1,
        unitPrice: i.amount,
        total: i.amount
      })),
      ...procedures.map((p: any) => ({ 
        type: 'Procedure', 
        name: p.ServiceCatalog?.name || p.name || 'Procedure', 
        details: '',
        code: p.ServiceCatalog?.code || '',
        quantity: 1,
        unitPrice: p.unitPrice || 0,
        total: p.unitPrice || 0
      })),
      ...services.map((s: any) => ({ 
        type: 'Service', 
        name: s.ServiceCatalog?.name || s.name || 'Service', 
        details: '',
        code: s.ServiceCatalog?.code || '',
        quantity: 1,
        unitPrice: s.unitPrice || 0,
        total: s.unitPrice || 0
      }))
    ];

    if (allItems.length === 0) {
      return `
        <tr>
          <td colspan="6" style="padding: 30px; text-align: center; color: #94a3b8;">
            <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
            No line items found
          </td>
        </tr>
      `;
    }

    allItems.forEach((item: any, idx: number) => {
      html += `
        <tr style="${idx % 2 === 0 ? 'background: #f8fafc;' : ''}">
          <td style="padding: 8px 12px;">
            <div style="font-weight: 500;">${escapeHtml(item.name)}</div>
            ${item.details ? `<div style="font-size: 11px; color: #94a3b8;">${escapeHtml(item.details)}</div>` : ''}
          </td>
          <td style="padding: 8px 12px;">
            <span style="font-size: 11px; padding: 2px 8px; background: #f1f5f9; border-radius: 10px; color: #475569;">
              ${escapeHtml(item.type)}
            </span>
          </td>
          <td style="padding: 8px 12px; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 12px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
        </tr>
      `;
    });

    return html;
  };

  // Generate diagnoses HTML
  const generateDiagnosesHTML = () => {
    if (diagnoses.length === 0) {
      return `
        <tr>
          <td colspan="3" style="padding: 16px; text-align: center; color: #94a3b8;">No diagnoses recorded</td>
        </tr>
      `;
    }
    return diagnoses.map((d: any) => `
      <tr>
        <td style="padding: 8px 12px; font-weight: 500;">${escapeHtml(d.Diagnosis?.name || d.description || '—')}</td>
        <td style="padding: 8px 12px; font-family: monospace;">${escapeHtml(d.Diagnosis?.icdCode || d.icdCode || '—')}</td>
        <td style="padding: 8px 12px; font-family: monospace;">${isNHIS ? principalGDRG : '—'}</td>
      </tr>
    `).join('');
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Insurance Claim - ${claimNumber}</title>
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
      background: linear-gradient(135deg, ${isNHIS ? '#0f766e' : '#1e40af'} 0%, ${isNHIS ? '#14b8a6' : '#3b82f6'} 100%);
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
    
    .status-draft { background: #fef3c7; color: #d97706; }
    .status-submitted { background: #dbeafe; color: #2563eb; }
    .status-approved { background: #dcfce7; color: #16a34a; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #dc2626; }
    
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
    
    /* ── INFO GRID ── */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .info-card {
      background: #f8fafc;
      padding: 14px 18px;
      border-radius: 10px;
      border-left: 3px solid ${isNHIS ? '#14b8a6' : '#3b82f6'};
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
    
    /* ── TABLES ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 20px;
    }
    
    .data-table th {
      background: #f1f5f9;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    
    .data-table tr:last-child td {
      border-bottom: none;
    }
    
    .data-table tr:hover {
      background: #f8fafc;
    }
    
    /* ── TOTALS ── */
    .totals-section {
      background: #f0fdf4;
      border-radius: 12px;
      padding: 20px 24px;
      border: 2px solid #bbf7d0;
      margin: 24px 0;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #d1fae5;
    }
    
    .total-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .total-row .label {
      font-weight: 500;
      color: #475569;
    }
    
    .total-row .value {
      font-weight: 600;
      color: #0f172a;
    }
    
    .total-row .value.grand {
      font-size: 20px;
      color: ${isNHIS ? '#0f766e' : '#1e40af'};
    }
    
    .total-row .value.approved {
      color: #16a34a;
    }
    
    .total-row .value.paid {
      color: #2563eb;
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
    
    .signature-line {
      width: 180px;
      height: 1px;
      background: #94a3b8;
      margin: 8px auto 4px;
    }
    
    .signature-label {
      font-size: 11px;
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
      background: linear-gradient(135deg, ${isNHIS ? '#0f766e' : '#1e40af'} 0%, ${isNHIS ? '#14b8a6' : '#3b82f6'} 100%);
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
      box-shadow: 0 4px 15px rgba(20, 184, 166, 0.4);
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
      
      .totals-section {
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
      .data-table th, .data-table td { padding: 6px 8px; }
      .no-print { flex-direction: column; padding: 16px; }
      .footer { flex-direction: column; text-align: center; }
    }
    
    @media screen and (max-width: 480px) {
      .patient-bar { grid-template-columns: 1fr; }
      .info-grid { grid-template-columns: 1fr; }
      .data-table { font-size: 11px; }
      .data-table th, .data-table td { padding: 4px 6px; }
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
          ${isNHIS ? `<p style="font-size: 12px; opacity: 0.8;">HI Code: ${escapeHtml(facilityCode)}</p>` : ''}
        </div>
      </div>
      <div class="header-right">
        <div class="document-badge">${isNHIS ? 'NHIS' : 'PRIVATE'} INSURANCE CLAIM</div>
        <div class="document-number">${escapeHtml(claimNumber)}</div>
        <span class="status-badge ${getStatusClass(status)}">${getStatusLabel(status)}</span>
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
        <span class="value">${escapeHtml(patientDOB)} (${age} yrs)</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Gender</span>
        <span class="value" style="text-transform: capitalize;">${escapeHtml(patientGender)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Member / CCC No.</span>
        <span class="value" style="font-family: monospace;">${escapeHtml(memberNumber)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Contact</span>
        <span class="value">${escapeHtml(patientContact)}</span>
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      <!-- ── INFO CARDS ── -->
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Provider</div>
          <div class="value">${escapeHtml(providerName)}</div>
        </div>
        <div class="info-card">
          <div class="label">Type of Service</div>
          <div class="value">${typeOfService}</div>
        </div>
        <div class="info-card">
          <div class="label">Type of Attendance</div>
          <div class="value">${typeOfAttendance}</div>
        </div>
        <div class="info-card">
          <div class="label">Service Outcome</div>
          <div class="value">${serviceOutcome}</div>
        </div>
        ${isNHIS ? `
          <div class="info-card">
            <div class="label">G-DRG Code</div>
            <div class="value" style="font-family: monospace;">${principalGDRG}</div>
          </div>
          <div class="info-card">
            <div class="label">MDC / Age Split</div>
            <div class="value" style="font-family: monospace;">${mdcCode}${ageSplit}</div>
          </div>
        ` : ''}
        <div class="info-card">
          <div class="label">Generated On</div>
          <div class="value">${formatDateTime(new Date().toISOString())}</div>
        </div>
      </div>

      <!-- ── DIAGNOSES ── -->
      <div class="section-title">
        🩺 Diagnoses
        <span class="count">(${diagnoses.length})</span>
      </div>
      
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50%;">Diagnosis Description</th>
            <th style="width: 25%;">ICD-10 Code</th>
            ${isNHIS ? `<th style="width: 25%;">G-DRG</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${generateDiagnosesHTML()}
        </tbody>
      </table>

      <!-- ── LINE ITEMS ── -->
      <div class="section-title">
        📋 Line Items
        <span class="count">(${medications.length + investigations.length + procedures.length + services.length})</span>
      </div>
      
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 32%;">Description</th>
            <th style="width: 15%;">Type</th>
            <th style="width: 10%; text-align: center;">Qty</th>
            <th style="width: 18%; text-align: right;">Unit Price</th>
            <th style="width: 25%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${generateItemsHTML()}
        </tbody>
      </table>

      <!-- ── TOTALS ── -->
      <div class="totals-section">
        <div class="total-row">
          <span class="label">Subtotal - Services</span>
          <span class="value">${formatCurrency(gdrgAmount)}</span>
        </div>
        ${medicationsTotal > 0 ? `
          <div class="total-row">
            <span class="label">Subtotal - Medications</span>
            <span class="value">${formatCurrency(medicationsTotal)}</span>
          </div>
        ` : ''}
        ${investigationsTotal > 0 ? `
          <div class="total-row">
            <span class="label">Subtotal - Investigations</span>
            <span class="value">${formatCurrency(investigationsTotal)}</span>
          </div>
        ` : ''}
        ${proceduresTotal > 0 ? `
          <div class="total-row">
            <span class="label">Subtotal - Procedures</span>
            <span class="value">${formatCurrency(proceduresTotal)}</span>
          </div>
        ` : ''}
        <div class="total-row" style="border-bottom: 2px solid #bbf7d0; padding-bottom: 10px; margin-bottom: 8px;">
          <span class="label" style="font-size: 16px; font-weight: 700;">Total Claim Amount</span>
          <span class="value grand">GHS ${formatCurrency(totalAmount)}</span>
        </div>
        ${approvedAmount > 0 ? `
          <div class="total-row">
            <span class="label">Approved Amount</span>
            <span class="value approved">GHS ${formatCurrency(approvedAmount)}</span>
          </div>
        ` : ''}
        ${paidAmount > 0 ? `
          <div class="total-row">
            <span class="label">Paid Amount</span>
            <span class="value paid">GHS ${formatCurrency(paidAmount)}</span>
          </div>
        ` : ''}
        <div class="total-row" style="border-top: 2px solid #bbf7d0; padding-top: 10px; margin-top: 8px;">
          <span class="label" style="font-size: 16px; font-weight: 700;">Outstanding Balance</span>
          <span class="value" style="font-size: 18px; color: ${(totalAmount - approvedAmount - paidAmount) > 0 ? '#dc2626' : '#16a34a'}; font-weight: 700;">
            GHS ${formatCurrency(Math.max(0, totalAmount - approvedAmount - paidAmount))}
          </span>
        </div>
      </div>

      <!-- ── SIGNATURES ── -->
      <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 24px; border-top: 2px solid #e2e8f0; flex-wrap: wrap; gap: 20px;">
        <div style="text-align: center; min-width: 180px;">
          <div class="signature-line"></div>
          <div class="signature-label">Client/Guardian Signature</div>
        </div>
        <div style="text-align: center; min-width: 180px;">
          <div class="signature-line"></div>
          <div class="signature-label">Provider's Signature / Stamp</div>
        </div>
        <div style="text-align: center; min-width: 180px;">
          <div class="signature-line"></div>
          <div class="signature-label">Date</div>
        </div>
      </div>

      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This is an official insurance claim document from ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Claim ID: ${escapeHtml(claimNumber)}-${new Date().getTime().toString().slice(-6)}
          </p>
        </div>
        <div class="footer-right">
          <p style="font-size: 11px; color: #94a3b8;">
            ${isNHIS ? 'NHIS Claim Form - Official' : 'Private Insurance Claim Form'}
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
        🖨️ Print Claim Form
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