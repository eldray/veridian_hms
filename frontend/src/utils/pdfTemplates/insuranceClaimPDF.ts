// src/utils/pdfTemplates/insuranceClaimPDF.ts - UNIFIED VERSION (Works with both NHIS & Private)

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const calculateAge = (dob: string, refDate: string): number => {
  if (!dob) return 0;
  const birth = new Date(dob);
  const ref = new Date(refDate);
  if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return 0;
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
};

const formatCurrency = (amount: number): string => {
  if (isNaN(amount)) return '0.00';
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// ==========================================
// PRIVATE INSURANCE CLAIM HTML
// ==========================================

const generatePrivateInsuranceClaimHTML = (
  claim: any,
  patient: any,
  hospital: any
): string => {
  // Extract data from claim object
  const attendance = claim.Attendance;
  const diagnoses = claim.Attendance?.AttendanceDiagnosis || [];
  const labTests = claim.Attendance?.LabTest || [];
  const scans = claim.Attendance?.Scan || [];
  const medications = claim.Attendance?.Medication || [];
  const procedures = claim.Attendance?.Procedure || [];
  const services = claim.Attendance?.ServiceRendered || [];

  const age = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth, attendance?.dateTime || new Date().toISOString()) : 0;
  const memberNumber = patient?.insurancePolicyNumber || patient?.nhisNumber || patient?.folderNumber || 'N/A';
  
  // Calculate totals
  const totalAmount = claim.totalClaimAmount || claim.Bill?.totalAmount || 0;
  const medicationsTotal = medications.reduce((sum: number, m: any) => sum + ((m.quantity || 1) * (m.unitPrice || m.dispensedUnitCost || 0)), 0);
  const investigationsTotal = [...labTests, ...scans].reduce((sum: number, i: any) => sum + (i.unitPrice || 0), 0);
  const proceduresTotal = procedures.reduce((sum: number, p: any) => sum + (p.unitPrice || 0), 0);
  const servicesTotal = services.reduce((sum: number, s: any) => sum + (s.unitPrice || 0), 0);

  const providerName = claim.InsuranceProvider?.name || claim.insuranceProvider?.name || 'Private Insurance';
  const typeOfService = attendance?.Admission ? 'In-Patient' : 'Out-Patient';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Private Insurance Claim - ${claim.claimNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; padding: 20px; font-size: 12px; }
    .claim-form { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center; }
    .title { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
    .subtitle { font-size: 11px; margin-top: 5px; opacity: 0.9; }
    .facility-section { background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
    .client-info { padding: 20px; border-bottom: 1px solid #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 13px; font-weight: 500; color: #1e293b; margin-top: 2px; }
    .section { margin: 0 20px 20px 20px; }
    .section-title { font-size: 14px; font-weight: bold; color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 15px; }
    .data-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .data-table th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155; }
    .amount { text-align: right; }
    .total-section { background: #f0fdf4; margin: 20px; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { font-weight: bold; font-size: 16px; color: #166534; border-top: 1px solid #bbf7d0; margin-top: 8px; padding-top: 8px; }
    .signature-row { display: flex; justify-content: space-between; margin: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
    .signature-item { text-align: center; width: 200px; }
    .signature-line { border-top: 1px solid #333; margin-top: 30px; padding-top: 6px; font-size: 10px; }
    .footer { background: #f8fafc; padding: 12px 20px; text-align: center; font-size: 9px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
    .status-approved { background: #dcfce7; color: #166534; }
    .status-draft { background: #fef9c3; color: #854d0e; }
    .status-submitted { background: #dbeafe; color: #1e40af; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    @media print { body { padding: 0; background: white; } .claim-form { box-shadow: none; margin: 0; } .no-print { display: none; } }
    .no-print { margin-top: 20px; text-align: center; padding: 15px; }
    .print-btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; cursor: pointer; margin: 0 5px; }
  </style>
</head>
<body>
  <div class="claim-form">
    <div class="header">
      <div class="title">PRIVATE INSURANCE CLAIM FORM</div>
      <div class="subtitle">${claim.claimNumber} | Generated: ${formatDateTime(new Date().toISOString())}</div>
    </div>
    
    <div class="facility-section">
      <span><strong>${hospital?.name || 'HEALTH FACILITY'}</strong></span>
      <span><strong>Provider:</strong> ${providerName}</span>
      <span><strong>Type:</strong> ${typeOfService}</span>
      <span><strong>Status:</strong> <span class="status-badge status-${claim.status}">${claim.status?.toUpperCase() || 'DRAFT'}</span></span>
    </div>
    
    <div class="client-info">
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Patient Name</span><span class="info-value">${patient?.surname || ''} ${patient?.otherNames || ''}</span></div>
        <div class="info-item"><span class="info-label">Policy/Member Number</span><span class="info-value">${memberNumber}</span></div>
        <div class="info-item"><span class="info-label">Date of Birth / Age</span><span class="info-value">${formatDate(patient?.dateOfBirth)} (${age} years)</span></div>
        <div class="info-item"><span class="info-label">Gender</span><span class="info-value">${patient?.gender?.toUpperCase() || 'N/A'}</span></div>
        <div class="info-item"><span class="info-label">Folder Number</span><span class="info-value">${patient?.folderNumber || 'N/A'}</span></div>
        <div class="info-item"><span class="info-label">Contact</span><span class="info-value">${patient?.contact || 'N/A'}</span></div>
      </div>
    </div>

    <!-- Diagnoses Section -->
    <div class="section">
      <div class="section-title">Diagnoses (${diagnoses.length})</div>
      <table class="data-table">
        <thead><tr><th style="width: 60%">Diagnosis Description</th><th>ICD-10 Code</th><th class="amount">Date</th></tr></thead>
        <tbody>
          ${diagnoses.length > 0 ? diagnoses.map((d: any) => `
            <tr><td>${d.Diagnosis?.name || d.description || '—'}</td><td>${d.Diagnosis?.icdCode || d.icdCode || '—'}<tr><td class="amount">${formatDate(d.createdAt || d.date)}</td></tr>
          `).join('') : '<tr><td colspan="3" style="text-align: center; color: #94a3b8;">No diagnoses recorded</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Investigations Section -->
    ${(labTests.length > 0 || scans.length > 0) ? `
    <div class="section">
      <div class="section-title">Investigations (${labTests.length + scans.length})</div>
      <table class="data-table">
        <thead><tr><th style="width: 50%">Investigation</th><th>Date</th><th class="amount">Amount (GHS)</th></tr></thead>
        <tbody>
          ${labTests.map((l: any) => `<tr><td>${l.ServiceCatalog?.name || l.name || 'Lab Test'}</td><td>${formatDate(l.requestedAt || l.createdAt)}</td><td class="amount">${formatCurrency(l.unitPrice || 0)}</td></tr>`).join('')}
          ${scans.map((s: any) => `<tr><td>${s.ServiceCatalog?.name || s.name || 'Scan'}</td><td>${formatDate(s.requestedAt || s.createdAt)}</td><td class="amount">${formatCurrency(s.unitPrice || 0)}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr style="background: #f8fafc;"><td colspan="2" style="font-weight: 600;">Subtotal</td><td class="amount" style="font-weight: 600;">${formatCurrency(investigationsTotal)}</td></tr></tfoot>
      </table>
    </div>
    ` : ''}

    <!-- Medications Section -->
    ${medications.length > 0 ? `
    <div class="section">
      <div class="section-title">Medications (${medications.length})</div>
      <table class="data-table">
        <thead><tr><th style="width: 40%">Medication</th><th>Quantity</th><th>Unit Price</th><th class="amount">Total</th></tr></thead>
        <tbody>
          ${medications.map((m: any) => `
            <tr>
              <td>${m.name || m.ServiceCatalog?.name || 'Medication'}<br><small style="color:#64748b;">${m.dosage || ''} ${m.frequency || ''} x ${m.duration || ''}</small></td>
              <td>${m.quantity || 1}</td>
              <td>${formatCurrency(m.unitPrice || m.dispensedUnitCost || 0)}</td>
              <td class="amount">${formatCurrency((m.quantity || 1) * (m.unitPrice || m.dispensedUnitCost || 0))}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot><tr style="background: #f8fafc;"><td colspan="3" style="font-weight: 600;">Subtotal</td><td class="amount" style="font-weight: 600;">${formatCurrency(medicationsTotal)}</td></tr></tfoot>
      </table>
    </div>
    ` : ''}

    <!-- Procedures Section -->
    ${procedures.length > 0 ? `
    <div class="section">
      <div class="section-title">Procedures (${procedures.length})</div>
      <table class="data-table">
        <thead><tr><th style="width: 60%">Procedure</th><th>Date</th><th class="amount">Amount (GHS)</th></tr></thead>
        <tbody>
          ${procedures.map((p: any) => `<tr><td>${p.ServiceCatalog?.name || p.name || 'Procedure'}</td><td>${formatDate(p.scheduledDate || p.performedAt || p.createdAt)}</td><td class="amount">${formatCurrency(p.unitPrice || 0)}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr style="background: #f8fafc;"><td colspan="2" style="font-weight: 600;">Subtotal</td><td class="amount" style="font-weight: 600;">${formatCurrency(proceduresTotal)}</td></tr></tfoot>
      </table>
    </div>
    ` : ''}

    <!-- Total Section -->
    <div class="total-section">
      <div class="total-row"><span>Subtotal - Services</span><span>${formatCurrency(totalAmount - medicationsTotal)}</span></div>
      <div class="total-row"><span>Subtotal - Medications</span><span>${formatCurrency(medicationsTotal)}</span></div>
      <div class="total-row grand-total"><span><strong>TOTAL CLAIM AMOUNT</strong></span><span><strong>GHS ${formatCurrency(totalAmount)}</strong></span></div>
    </div>

    <!-- Signature Section -->
    <div class="signature-row">
      <div class="signature-item"><div class="signature-line">Client/Guardian Signature</div></div>
      <div class="signature-item"><div class="signature-line">Provider's Signature/Stamp</div></div>
      <div class="signature-item"><div class="signature-line">Date</div></div>
    </div>
    
    <div class="footer">
      <strong>${hospital?.name || 'HEALTH FACILITY'}</strong> — ${hospital?.address || ''}<br>
      Tel: ${hospital?.phone || ''} | Email: ${hospital?.email || ''}<br>
      <span style="font-size: 8px;">Generated on ${formatDateTime(new Date().toISOString())}</span>
    </div>
  </div>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Print Claim Form</button>
    <button class="print-btn" onclick="window.close()" style="background: #6b7280;">✖️ Close</button>
  </div>
</body>
</html>`;
};

// ==========================================
// NHIS CLAIM HTML (Official Ghana NHIS Format)
// ==========================================

const generateNHISClaimHTML = (
  claim: any,
  patient: any,
  hospital: any
): string => {
  // Extract data from claim object
  const attendance = claim.Attendance;
  const diagnoses = claim.Attendance?.AttendanceDiagnosis || [];
  const labTests = claim.Attendance?.LabTest || [];
  const scans = claim.Attendance?.Scan || [];
  const medications = claim.Attendance?.Medication || [];

  const age = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth, attendance?.dateTime || new Date().toISOString()) : 0;
  const isAdult = age >= 12;
  const ageSplit = isAdult ? 'A' : 'C';
  const mdcCode = claim.mdcCode || claim.principalGDRG?.slice(0, 4) || 'OPDC';
  const principalGDRG = claim.principalGDRG || claim.gdrgCodes?.[0] || 'OPDC06A';
  
  const typeOfService = attendance?.Admission ? 'In-Patient' : 'Out-Patient';
  const serviceOutcome = attendance?.status === 'completed' ? 'Discharged' : 'CONT';
  const typeOfAttendance = attendance?.attendanceType === 'emergency_acute' ? 'Emergency/Acute Episode' 
    : attendance?.attendanceType === 'antenatal' ? 'ANC' 
    : attendance?.attendanceType === 'delivery' ? 'Delivery'
    : attendance?.attendanceType === 'surgery' ? 'Surgery'
    : 'Chronic/Follow-up';

  // Calculate totals
  const gdrgAmount = claim.totalClaimAmount || 0;
  const medsTotal = medications.reduce((sum: number, m: any) => sum + (m.totalPrice || 0), 0);
  const totalClaim = gdrgAmount;

  // Combine investigations (lab tests + scans both use investigationCode)
  const investigations = [
    ...labTests.map((l: any) => ({ 
      description: l.ServiceCatalog?.name || l.name || '',
      date: l.requestedAt || l.createdAt,
      gdrgCode: l.ServiceCatalog?.investigationCode || l.ServiceCatalog?.nhisServiceCode || ''
    })),
    ...scans.map((s: any) => ({ 
      description: s.ServiceCatalog?.name || s.name || '',
      date: s.requestedAt || s.createdAt,
      gdrgCode: s.ServiceCatalog?.investigationCode || s.ServiceCatalog?.nhisServiceCode || ''
    }))
  ].filter(i => i.gdrgCode);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>NHIS Claim Form - ${claim.claimNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; background: white; padding: 20px; font-size: 11px; }
    .claim-form { max-width: 800px; margin: 0 auto; background: white; border: 1px solid #000; }
    .header { border-bottom: 1px solid #000; padding: 10px; text-align: center; }
    .title { font-size: 18px; font-weight: bold; letter-spacing: 2px; }
    .subtitle { font-size: 10px; margin-top: 3px; }
    .facility-section { border-bottom: 1px solid #000; padding: 8px 10px; }
    .facility-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .hi-code { font-family: 'Courier New', monospace; letter-spacing: 2px; }
    .client-info { border-bottom: 1px solid #000; padding: 10px; }
    .info-row { display: flex; margin-bottom: 8px; border-bottom: 1px dotted #ccc; padding-bottom: 4px; }
    .info-label { width: 120px; font-weight: bold; }
    .info-value { flex: 1; font-family: 'Courier New', monospace; letter-spacing: 2px; }
    .gender-box { display: inline-flex; gap: 15px; margin-left: 10px; }
    .gender-option { display: inline-flex; align-items: center; gap: 3px; }
    .checkbox { width: 14px; height: 14px; border: 1px solid #000; display: inline-block; text-align: center; line-height: 12px; }
    .checkbox.checked::after { content: "✓"; font-size: 10px; }
    .services-section { border-bottom: 1px solid #000; padding: 10px; }
    .service-options { display: flex; gap: 15px; flex-wrap: wrap; }
    .data-table { width: 100%; border-collapse: collapse; margin: 5px 0; }
    .data-table th, .data-table td { border: 1px solid #000; padding: 6px; text-align: left; vertical-align: top; }
    .data-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
    .section-header { background-color: #e0e0e0; padding: 6px 10px; font-weight: bold; border-bottom: 1px solid #000; font-size: 12px; }
    .summary-section { padding: 10px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ccc; }
    .summary-total { display: flex; justify-content: space-between; padding: 8px 0; font-weight: bold; font-size: 14px; border-top: 2px solid #000; margin-top: 5px; }
    .signature-row { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 15px; border-top: 1px solid #000; }
    .signature-item { text-align: center; width: 200px; }
    .signature-line { border-top: 1px solid #000; margin-top: 25px; padding-top: 5px; }
    .footer { border-top: 1px solid #000; padding: 8px; text-align: center; font-size: 9px; }
    @media print { body { padding: 0; margin: 0; } .no-print { display: none; } .claim-form { margin: 0; border: none; } }
    .no-print { margin-top: 20px; text-align: center; padding: 15px; }
    .print-btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; cursor: pointer; margin: 0 5px; }
  </style>
</head>
<body>
  <div class="claim-form">
    <div class="header">
      <div class="title">CLAIMS FORM</div>
      <div class="subtitle">NATIONAL HEALTH INSURANCE SCHEME</div>
    </div>
    
    <div class="facility-section">
      <div class="facility-row">
        <span><strong>Facility</strong> ${hospital?.name || '_________________________'}</span>
      </div>
      <div class="facility-row">
        <span><strong>HI Code</strong> <span class="hi-code">${hospital?.nhisFacilityCode || '______'}</span></span>
        <span><strong>Month of Claim</strong> ${formatDate(claim.submissionDate || claim.createdAt)}</span>
      </div>
    </div>
    
    <div class="client-info">
      <div class="info-row">
        <span class="info-label">Surname</span>
        <span class="info-value">${(patient?.surname || '').toUpperCase().padEnd(25, ' ')}</span>
        <span class="info-label">Gender</span>
        <span class="gender-box">
          <span class="gender-option"><span class="checkbox ${patient?.gender === 'male' ? 'checked' : ''}"></span> Male</span>
          <span class="gender-option"><span class="checkbox ${patient?.gender === 'female' ? 'checked' : ''}"></span> Female</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Other Names</span>
        <span class="info-value">${(patient?.otherNames || '').toUpperCase().padEnd(25, ' ')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date of Birth</span>
        <span class="info-value">${formatDate(patient?.dateOfBirth)}</span>
        <span class="info-label">Age</span>
        <span class="info-value" style="width: 30px;">${age}</span>
        <span class="info-label">Member No.</span>
        <span class="info-value">${attendance?.nhisCCC || patient?.nhisNumber || '__________'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Folder No.</span>
        <span class="info-value">${(patient?.folderNumber || '').padEnd(20, ' ')}</span>
        <span class="info-label">Card Serial No.</span>
        <span class="info-value">__________</span>
      </div>
    </div>
    
    <div class="services-section">
      <div class="info-row" style="border-bottom: none;">
        <span class="info-label">Type of Service</span>
        <div class="service-options">
          <span class="gender-option"><span class="checkbox ${typeOfService === 'Out-Patient' ? 'checked' : ''}"></span> Out-Patient</span>
          <span class="gender-option"><span class="checkbox ${typeOfService === 'In-Patient' ? 'checked' : ''}"></span> In-Patient</span>
          <span class="gender-option"><span class="checkbox"></span> Pharmacy</span>
          <span class="gender-option"><span class="checkbox"></span> Diagnostic</span>
          <span class="gender-option"><span class="checkbox"></span> All Inclusive</span>
          <span class="gender-option"><span class="checkbox"></span> Unbundled</span>
        </div>
      </div>
      <div class="info-row" style="border-bottom: none; margin-top: 8px;">
        <span class="info-label">Outcome</span>
        <div class="service-options">
          <span class="gender-option"><span class="checkbox ${serviceOutcome === 'Discharged' ? 'checked' : ''}"></span> Discharged</span>
          <span class="gender-option"><span class="checkbox"></span> Died</span>
          <span class="gender-option"><span class="checkbox"></span> Transferred Out</span>
          <span class="gender-option"><span class="checkbox"></span> Absconded/DAMA</span>
        </div>
      </div>
      <div class="info-row" style="border-bottom: none; margin-top: 8px;">
        <span class="info-label">Type of Attendance</span>
        <div class="service-options">
          <span class="gender-option"><span class="checkbox ${typeOfAttendance === 'Chronic/Follow-up' ? 'checked' : ''}"></span> Chronic/Follow-up</span>
          <span class="gender-option"><span class="checkbox ${typeOfAttendance === 'Emergency/Acute Episode' ? 'checked' : ''}"></span> Emergency/Acute Episode</span>
          <span class="gender-option"><span class="checkbox ${typeOfAttendance === 'ANC' ? 'checked' : ''}"></span> ANC</span>
        </div>
      </div>
      <div class="info-row" style="border-bottom: none; margin-top: 8px;">
        <span class="info-label">Specialty Code</span>
        <span class="info-value" style="font-family: monospace; letter-spacing: normal;">${mdcCode}${ageSplit}</span>
      </div>
    </div>
    
    <!-- Diagnoses Table -->
    <div>
      <div class="section-header">Diagnoses (${diagnoses.length})</div>
      <table class="data-table">
        <thead><tr><th style="width: 50%">Description</th><th style="width: 25%">ICD-10</th><th style="width: 25%">G-DRG</th></tr></thead>
        <tbody>
          ${diagnoses.length > 0 ? diagnoses.map((d: any) => `
            <tr><td>${d.Diagnosis?.name || d.description || '_________________________'}</td><td>${d.Diagnosis?.icdCode || d.icdCode || '________'}</td><td>${principalGDRG}</td></tr>
          `).join('') : '<tr><td>_________________________</td><td>________</td><td>________</td></tr>'}
        </tbody>
      </table>
    </div>
    
    <!-- Investigations Table -->
    <div>
      <div class="section-header">Investigations (${investigations.length})</div>
      <table class="data-table">
        <thead><tr><th style="width: 50%">Description</th><th style="width: 25%">Date</th><th style="width: 25%">G-DRG</th></tr></thead>
        <tbody>
          ${investigations.length > 0 ? investigations.map((i: any) => `
            <tr><td>${i.description}</td><td>${formatDate(i.date)}</td><td>${i.gdrgCode}</td></tr>
          `).join('') : '<tr><td>_________________________</td><td>________</td><td>________</td></tr>'}
        </tbody>
      </table>
    </div>
    
    <!-- Medicines Table -->
    <div>
      <div class="section-header">Medicines (${medications.length})</div>
      <table class="data-table">
        <thead><tr><th style="width: 40%">Description</th><th style="width: 15%">Date</th><th style="width: 15%">Code</th><th style="width: 30%">Prescription</th></tr></thead>
        <tbody>
          ${medications.length > 0 ? medications.map((m: any) => `
            <tr>
              <td>${m.name || m.ServiceCatalog?.name || '_________________________'}</td>
              <td>${formatDate(m.dispensedAt || m.prescribedAt)}</td>
              <td>${m.code || m.StockItem?.drugCode || '________'}</td>
              <td>${m.prescription || `${m.dosage || ''} ${m.frequency || ''} x ${m.duration || ''}`.trim() || '_________________'}</td>
            </tr>
          `).join('') : '<tr><td>_________________________</td><td>________</td><td>________</td><td>_________________</td></tr>'}
        </tbody>
      </table>
    </div>
    
    <!-- Client Claim Summary -->
    <div class="summary-section">
      <div class="section-header" style="margin-bottom: 10px;">CLIENT CLAIM SUMMARY</div>
      <div class="summary-row">
        <span><strong>Type of Service</strong></span>
        <span><strong>G-DRG/Code</strong></span>
        <span><strong>Tariff/Amount</strong></span>
        <span><strong>Name</strong></span>
        <span><strong>Signature</strong></span>
      </div>
      <div class="summary-row">
        <span>${typeOfService === 'Out-Patient' ? 'Outpatient' : 'Inpatient'}</span>
        <span>${principalGDRG}</span>
        <span>${formatCurrency(gdrgAmount)}</span>
        <span>${patient?.surname || ''} ${patient?.otherNames || ''}</span>
        <span>__________</span>
      </div>
      ${medications.length > 0 ? `
      <div class="summary-row">
        <span>Medications</span>
        <span></span>
        <span>${formatCurrency(medsTotal)}</span>
        <span></span>
        <span></span>
      </div>
      ` : ''}
      <div class="summary-total">
        <span><strong>TOTAL</strong></span>
        <span><strong>${formatCurrency(totalClaim)}</strong></span>
      </div>
    </div>
    
    <div class="signature-row">
      <div class="signature-item"><div class="signature-line">Client/Guardian Signature</div></div>
      <div class="signature-item"><div class="signature-line">Provider's Signature/Stamp</div></div>
      <div class="signature-item"><div class="signature-line">Date</div></div>
    </div>
    
    <div class="footer">
      <strong>${hospital?.name || 'HEALTH FACILITY'}</strong> — ${hospital?.address || ''}<br>
      Tel: ${hospital?.phone || ''} | Email: ${hospital?.email || ''}<br>
      Generated: ${formatDateTime(new Date().toISOString())}
    </div>
  </div>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Print Claim Form</button>
    <button class="print-btn" onclick="window.close()" style="background: #6b7280;">✖️ Close</button>
  </div>
</body>
</html>`;
};

// ==========================================
// MAIN EXPORTED FUNCTION - Auto-detects claim type
// ==========================================

export const generateInsuranceClaimHTML = (
  claim: any,
  patient: any,
  hospital: any
): string => {
  // Detect claim type from the claim object
  const isNHIS = claim.InsuranceProvider?.type === 'nhis' || 
                 claim.insuranceProvider?.type === 'nhis' ||
                 claim.typeOfService === 'NHIS' ||
                 claim.Attendance?.paymentMode === 'nhis';

  if (isNHIS) {
    return generateNHISClaimHTML(claim, patient, hospital);
  } else {
    return generatePrivateInsuranceClaimHTML(claim, patient, hospital);
  }
};