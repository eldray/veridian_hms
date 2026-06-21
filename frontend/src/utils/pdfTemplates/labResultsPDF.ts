// src/utils/pdfTemplates/labResultsPDF.ts - REDESIGNED TO MATCH ENTRY VIEW
import type { LabTest, Patient, Attendance, Hospital } from '../../types';

export const generateLabResultsHTML = (
  labTests: any[],
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

  // ✅ Helper to get patient name safely
  const getPatientName = (p: any) => {
    if (p?.fullName) return p.fullName;
    if (p?.surname && p?.otherNames) return `${p.surname} ${p.otherNames}`;
    if (p?.name) return p.name;
    return 'Patient Name Not Available';
  };

  // ✅ Helper to get test name safely
  const getTestName = (test: any): string => {
    return test?.testName || test?.name || test?.LabTestTemplate?.name || test?.ServiceCatalog?.name || 'Unknown Test';
  };

  // ✅ Helper to get test status
  const getTestStatus = (test: any): string => {
    return test?.status || test?.LabTest?.status || 'completed';
  };

  // ✅ Helper to get specimen type
  const getSpecimenType = (test: any): string => {
    return test?.specimenType || test?.LabTestTemplate?.specimenType || '—';
  };

  // ✅ Helper to get priority
  const getPriority = (test: any): string => {
    return test?.priority || test?.LabTest?.priority || 'routine';
  };

  // ✅ Helper to get completed date
  const getCompletedAt = (test: any): string => {
    return test?.completedAt || test?.completedAt || test?.updatedAt || '';
  };

  // ✅ Compute flag for a parameter
  const computeParamFlag = (param: any): { flag: string; color: string; bg: string } => {
    const { value, lowThreshold, highThreshold, normalRange, fieldType } = param || {};
    if (fieldType && fieldType !== 'number') return { flag: '', color: '#64748b', bg: '' };
    if (value === '' || value === null || value === undefined) return { flag: '', color: '#64748b', bg: '' };

    const num = typeof value === 'number' ? value : parseFloat(value);
    const hasLow = typeof lowThreshold === 'number';
    const hasHigh = typeof highThreshold === 'number';

    if (!isNaN(num) && (hasLow || hasHigh)) {
      if (hasLow && num < lowThreshold) {
        return { flag: 'LOW', color: '#d97706', bg: '#fef3c7' };
      }
      if (hasHigh && num > highThreshold) {
        return { flag: 'HIGH', color: '#dc2626', bg: '#fee2e2' };
      }
      return { flag: 'NL', color: '#16a34a', bg: '#dcfce7' };
    }

    // Check normal range string
    if (normalRange) {
      const cleaned = normalRange.replace(/[–—]/g, '-');
      const rangeMatch = cleaned.match(/([<>])?\s*(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/);
      if (rangeMatch) {
        const operator = rangeMatch[1];
        const low = parseFloat(rangeMatch[2]);
        const high = rangeMatch[3] ? parseFloat(rangeMatch[3]) : undefined;

        if (operator === '>') {
          return num > low 
            ? { flag: 'HIGH', color: '#dc2626', bg: '#fee2e2' }
            : { flag: 'NL', color: '#16a34a', bg: '#dcfce7' };
        }
        if (operator === '<') {
          return num < low
            ? { flag: 'LOW', color: '#d97706', bg: '#fef3c7' }
            : { flag: 'NL', color: '#16a34a', bg: '#dcfce7' };
        }
        if (high !== undefined) {
          if (num > high) return { flag: 'HIGH', color: '#dc2626', bg: '#fee2e2' };
          if (num < low) return { flag: 'LOW', color: '#d97706', bg: '#fef3c7' };
          return { flag: 'NL', color: '#16a34a', bg: '#dcfce7' };
        }
      }
    }
    return { flag: '', color: '#64748b', bg: '' };
  };

  // ✅ Get hospital info safely
  const hospitalName = hospital?.name || 'Veridian Hospital';
  const hospitalAddress = hospital?.address || '123 Medical Center Drive, Accra, Ghana';
  const hospitalPhone = hospital?.phone || '+233-24-123-4567';
  const hospitalEmail = hospital?.email || 'info@veridianhospital.gov.gh';
  const hospitalLogo = hospital?.logo || '';

  // ✅ Get patient info
  const patientName = getPatientName(patient);
  const patientId = patient?.folderNumber || patient?.id || 'N/A';
  const patientContact = patient?.contact || patient?.phone || patient?.mobile || 'N/A';
  const patientAge = patient?.age || patient?.ageYears || 'N/A';
  const patientGender = patient?.gender || 'N/A';
  const patientDOB = patient?.dateOfBirth ? formatDateShort(patient.dateOfBirth) : 'N/A';

  // ✅ Get attendance info
  const attendanceNumber = attendance?.attendanceNumber || attendance?.id || 'N/A';
  const attendanceDate = attendance?.dateTime || attendance?.createdAt || new Date().toISOString();
  const attendingClinician = attendance?.attendingClinician || attendance?.attendingDoctor || 'N/A';
  const attendanceType = attendance?.attendanceType || attendance?.type || 'N/A';

  // ✅ Ensure labTests is an array
  const tests = Array.isArray(labTests) ? labTests : [];

  // ✅ Get performed by name
  const performedByName = tests[0]?.performedByName || 'Lab Technician';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lab Results - ${attendanceNumber}</title>
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
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
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
    
    /* ── PATIENT INFO BAR ── */
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
    
    /* ── TEST CARDS ── */
    .test-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 24px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    
    .test-card-header {
      background: #f8fafc;
      padding: 14px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .test-card-header .test-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    
    .test-card-header .test-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #64748b;
    }
    
    .test-card-header .test-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .status-badge {
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .status-completed {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .status-in_progress {
      background: #dbeafe;
      color: #2563eb;
    }
    
    .status-pending {
      background: #fef3c7;
      color: #d97706;
    }
    
    /* ── RESULTS TABLE ── */
    .results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    .results-table th {
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
    
    .results-table td {
      padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    
    .results-table tr:last-child td {
      border-bottom: none;
    }
    
    .results-table tr:hover {
      background: #f8fafc;
    }
    
    .param-name {
      font-weight: 500;
      color: #0f172a;
    }
    
    .param-value {
      font-family: 'Consolas', 'Monaco', monospace;
      font-weight: 500;
      font-size: 13px;
    }
    
    .param-normal {
      color: #64748b;
      font-size: 12px;
    }
    
    .param-unit {
      color: #94a3b8;
      font-size: 12px;
      margin-left: 4px;
    }
    
    .flag-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    
    .flag-high {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .flag-low {
      background: #fef3c7;
      color: #d97706;
    }
    
    .flag-nl {
      background: #dcfce7;
      color: #16a34a;
    }
    
    /* ── TEST NOTES ── */
    .test-notes {
      padding: 12px 20px;
      background: #f0fdfa;
      border-top: 1px solid #ccfbf1;
      font-size: 13px;
      color: #0f766e;
    }
    
    .test-notes strong {
      font-weight: 600;
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
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      width: 200px;
      margin-left: auto;
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
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
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
      
      .test-card {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      .header {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .status-badge,
      .flag-badge {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .results-table tr:hover {
        background: transparent !important;
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
      .test-card-header { flex-direction: column; align-items: flex-start; }
      .results-table { font-size: 12px; }
      .results-table th, .results-table td { padding: 8px 10px; }
      .no-print { flex-direction: column; padding: 16px; }
      .footer { flex-direction: column; text-align: center; }
      .signature-line { margin: 8px auto 0; }
    }
    
    @media screen and (max-width: 480px) {
      .patient-bar { grid-template-columns: 1fr; }
      .results-table { font-size: 11px; }
      .results-table th, .results-table td { padding: 6px 8px; }
      .test-card-header .test-meta { flex-wrap: wrap; gap: 8px; }
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
          <h1>${hospitalName}</h1>
          <p>${hospitalAddress}</p>
          <p>Tel: ${hospitalPhone} &nbsp;|&nbsp; Email: ${hospitalEmail}</p>
        </div>
      </div>
      <div class="header-right">
        <div class="document-badge">LABORATORY REPORT</div>
        <div class="document-number">Visit: ${attendanceNumber}</div>
      </div>
    </div>

    <!-- ── PATIENT BAR ── -->
    <div class="patient-bar">
      <div class="patient-bar-item">
        <span class="label">Patient Name</span>
        <span class="value">${patientName}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Folder Number</span>
        <span class="value">${patientId}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Date of Birth</span>
        <span class="value">${patientDOB} (${patientAge} yrs, ${patientGender})</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Contact</span>
        <span class="value">${patientContact}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Visit Date</span>
        <span class="value">${formatDateShort(attendanceDate)}</span>
      </div>
      <div class="patient-bar-item">
        <span class="label">Attending Clinician</span>
        <span class="value">${attendingClinician}</span>
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      ${tests.length === 0 ? `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔬</div>
          <h3 style="font-size: 18px; color: #475569; margin-bottom: 8px;">No Lab Results Available</h3>
          <p style="font-size: 14px;">No laboratory tests have been completed for this visit.</p>
        </div>
      ` : `
        ${tests.map((test: any) => {
          const testName = getTestName(test);
          const status = getTestStatus(test);
          const specimenType = getSpecimenType(test);
          const priority = getPriority(test);
          const completedAt = getCompletedAt(test);
          const parameters = test?.parameters || [];
          const hasParameters = parameters.length > 0;
          const singleResult = !hasParameters && (test?.result || test?.value);
          
          // Determine if this is a multi-parameter test
          const isMultiParam = hasParameters;
          
          return `
            <div class="test-card">
              <!-- Test Header -->
              <div class="test-card-header">
                <div>
                  <span class="test-name">${testName}</span>
                  <span style="margin-left: 12px; font-size: 12px; color: #64748b; font-weight: 400;">
                    ${specimenType !== '—' ? `Specimen: ${specimenType}` : ''}
                  </span>
                </div>
                <div class="test-meta">
                  <span>🕐 ${priority.toUpperCase()}</span>
                  ${completedAt ? `<span>📅 ${formatDateShort(completedAt)}</span>` : ''}
                  <span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </div>
              </div>
              
              <!-- Results Table -->
              ${isMultiParam ? `
                <table class="results-table">
                  <thead>
                    <tr>
                      <th style="width: 32%;">Parameter</th>
                      <th style="width: 28%;">Result</th>
                      <th style="width: 22%;">Normal Range</th>
                      <th style="width: 18%;">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${parameters.map((param: any) => {
                      const flagInfo = computeParamFlag(param);
                      const value = param.value !== undefined && param.value !== '' ? param.value : '—';
                      const unit = param.unit || '';
                      const normalRange = param.normalRange || '—';
                      const paramName = param.name || param.fieldName || 'Parameter';
                      
                      return `
                        <tr>
                          <td class="param-name">${paramName}</td>
                          <td>
                            <span class="param-value" style="color: ${flagInfo.color || '#0f172a'}">
                              ${value}
                              ${unit ? `<span class="param-unit">${unit}</span>` : ''}
                            </span>
                          </td>
                          <td class="param-normal">${normalRange}</td>
                          <td>
                            ${flagInfo.flag ? `
                              <span class="flag-badge flag-${flagInfo.flag.toLowerCase()}">
                                ${flagInfo.flag}
                              </span>
                            ` : '—'}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              ` : `
                <!-- Single Result -->
                <table class="results-table">
                  <thead>
                    <tr>
                      <th style="width: 25%;">Result</th>
                      <th style="width: 25%;">Normal Range</th>
                      <th style="width: 25%;">Units</th>
                      <th style="width: 25%;">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <span class="param-value">
                          ${typeof singleResult === 'object' ? singleResult?.value || '—' : singleResult || '—'}
                        </span>
                      </td>
                      <td class="param-normal">${test?.normalRange || '—'}</td>
                      <td class="param-normal">${test?.units || test?.unit || '—'}</td>
                      <td>
                        ${(() => {
                          const resultValue = typeof singleResult === 'object' ? singleResult?.value : singleResult;
                          const flagInfo = computeParamFlag({ 
                            value: resultValue, 
                            normalRange: test?.normalRange 
                          });
                          return flagInfo.flag ? `
                            <span class="flag-badge flag-${flagInfo.flag.toLowerCase()}">
                              ${flagInfo.flag}
                            </span>
                          ` : '—';
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              `}
              
              <!-- Notes -->
              ${test?.notes ? `
                <div class="test-notes">
                  <strong>📝 Notes:</strong> ${test.notes}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
        
        <!-- Test Count Summary -->
        <div style="margin-top: 12px; font-size: 13px; color: #94a3b8; text-align: right;">
          ${tests.length} test${tests.length > 1 ? 's' : ''} • Completed: ${formatDate(new Date().toISOString())}
        </div>
      `}
      
      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This laboratory report is issued by ${hospitalName}.</p>
          <p>Results should be interpreted by a qualified healthcare professional.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Report ID: LAB-${attendanceNumber}-${new Date().getTime().toString().slice(-6)}
          </p>
        </div>
        <div class="footer-right">
          <p style="font-weight: 500; color: #475569;">Performed By</p>
          <p style="font-size: 14px; font-weight: 600; color: #0f172a;">${performedByName}</p>
          <div class="signature-line"></div>
          <p style="font-size: 11px; color: #94a3b8;">Signature</p>
          <p style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
            Generated: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
      
    </div>
    
    <!-- ── PRINT BUTTONS ── -->
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">
        🖨️ Print Lab Results
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