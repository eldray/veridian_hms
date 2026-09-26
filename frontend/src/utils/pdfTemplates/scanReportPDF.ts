// src/utils/pdfTemplates/scanReportPDF.ts — template-aware + custom fields
import type { Scan, Patient, Attendance, Hospital } from '../../types';

interface TemplateField {
  fieldName: string;
  fieldType: string;
  label: string;
  unit?: string;
  referenceRange?: string;
}

const resolveResultTemplate = (scan: any): TemplateField[] => {
  const candidates = [
    scan?.ScanTemplate?.resultTemplate,                    // ✅ what the API actually sends
    scan?.ServiceCatalog?.ScanTemplate?.resultTemplate,
    scan?.ServiceCatalog?.metadata?.resultTemplate,
    scan?.resultTemplate,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c as TemplateField[];
  }
  return [];
};

export const generateScanReportHTML = (
  scans: any[],
  patient: any,
  attendance: any,
  hospital: any
): string => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Invalid Date'; }
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return 'Invalid Date'; }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Invalid Date'; }
  };

  const escapeHtml = (text: any): string => {
    if (text === null || text === undefined) return '';
    const s = String(text);
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  };

  const getPatientName = (p: any) => {
    if (p?.fullName) return p.fullName;
    if (p?.surname && p?.otherNames) return `${p.surname} ${p.otherNames}`;
    if (p?.name) return p.name;
    return 'Unknown Patient';
  };

  const hospitalName = hospital?.name || 'Veridian Hospital';
  const hospitalAddress = hospital?.address || '123 Medical Center Drive, Accra, Ghana';
  const hospitalPhone = hospital?.phone || '+233-24-123-4567';
  const hospitalEmail = hospital?.email || 'info@veridianhospital.gov.gh';

  const patientName = getPatientName(patient);
  const patientId = patient?.folderNumber || patient?.id || 'N/A';
  const patientContact = patient?.contact || patient?.phone || patient?.mobile || 'N/A';
  const patientAge = patient?.age || patient?.ageYears || 'N/A';
  const patientGender = patient?.gender || 'N/A';
  const patientDOB = patient?.dateOfBirth ? formatDate(patient.dateOfBirth) : 'N/A';

  const attendanceNumber = attendance?.attendanceNumber || attendance?.id || 'N/A';
  const attendanceDate = attendance?.dateTime || attendance?.createdAt || new Date().toISOString();
  const attendingClinician =
    attendance?.attendingClinician || attendance?.attendingDoctor || 'N/A';

  const scanList = Array.isArray(scans) ? scans : [];

  // ── Structured findings block: walk the template and render label:value ──
  // Also appends custom_* fields that sonographers added at entry time.
  const renderStructuredFindings = (scan: any): string => {
    const tpl = resolveResultTemplate(scan);
    const values =
      scan?.result && typeof scan.result === 'object' && scan.result.values
        ? scan.result.values
        : null;

    if (tpl.length > 0 && values) {
      const rows = tpl
        .map((f) => {
          const v = values[f.fieldName];
          if (v === undefined || v === null || String(v).trim() === '') return '';
          const suffix = f.unit ? ` ${f.unit}` : '';
          return `
            <div class="finding-row">
              <div class="finding-label">${escapeHtml(f.label)}</div>
              <div class="finding-value">${escapeHtml(v)}${escapeHtml(suffix)}</div>
            </div>
          `;
        })
        .filter(Boolean)
        .join('');

      // Custom fields: keys custom_* with __label sibling
      const customRows = Object.keys(values)
        .filter((k) => k.startsWith('custom_') && !k.endsWith('__label'))
        .map((k) => {
          const label = values[`${k}__label`] || 'Additional Finding';
          const v = values[k];
          if (v === undefined || v === null || String(v).trim() === '') return '';
          return `
            <div class="finding-row">
              <div class="finding-label">${escapeHtml(label)}</div>
              <div class="finding-value">${escapeHtml(v)}</div>
            </div>
          `;
        })
        .filter(Boolean)
        .join('');

      if (rows || customRows) {
        return `<div class="findings-table">${rows}${customRows}</div>`;
      }
    }

    // Fallback 1: plain-text findings (produced as a summary by the form)
    const plain = scan?.findings;
    if (plain && typeof plain === 'string' && plain.trim()) {
      const lines = plain.split('\n').filter((l: string) => l.trim());
      const looksStructured = lines.every((l: string) => l.includes(':'));
      if (looksStructured && lines.length > 1) {
        const rows = lines
          .map((line: string) => {
            const idx = line.indexOf(':');
            const label = line.slice(0, idx).trim();
            const value = line.slice(idx + 1).trim();
            return `
              <div class="finding-row">
                <div class="finding-label">${escapeHtml(label)}</div>
                <div class="finding-value">${escapeHtml(value)}</div>
              </div>
            `;
          })
          .join('');
        return `<div class="findings-table">${rows}</div>`;
      }
      return `<div class="text">${escapeHtml(plain)}</div>`;
    }

    return `<div class="text" style="color: #94a3b8;">No findings recorded.</div>`;
  };

  const getScanName = (scan: any) =>
    scan?.name || scan?.scanType || scan?.ServiceCatalog?.name || 'Radiology Study';
  const getBodyPart = (scan: any) =>
    scan?.bodyPart || scan?.ServiceCatalog?.metadata?.bodyPart || '—';
  const getModality = (scan: any) =>
    scan?.modality || scan?.ServiceCatalog?.metadata?.scanType || '—';
  const getImpression = (scan: any) =>
    scan?.impression || scan?.conclusion || '';
  const getStatus = (scan: any) => scan?.status || 'completed';
  const getCompletedAt = (scan: any) =>
    scan?.completedAt || scan?.performedAt || scan?.updatedAt || '';
  const getPerformedBy = (scan: any) =>
    scan?.performedBy?.fullName || scan?.performedBy || scan?.performedByName || 'Unknown';
  const getImageUrls = (scan: any): string[] =>
    Array.isArray(scan?.imageUrls) ? scan.imageUrls : [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Radiology Report - ${attendanceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f1f5f9; padding: 30px; color: #1e293b;
    }
    .page-container {
      max-width: 1100px; margin: 0 auto; background: white;
      border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%);
      color: white; padding: 30px 40px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .header-left { display: flex; align-items: center; gap: 20px; }
    .logo-placeholder {
      width: 70px; height: 70px; background: rgba(255,255,255,0.15);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 32px; font-weight: 700;
      border: 2px solid rgba(255,255,255,0.3);
    }
    .hospital-info h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .hospital-info p { font-size: 13px; opacity: 0.9; line-height: 1.4; }
    .header-right { text-align: right; }
    .document-badge {
      background: rgba(255,255,255,0.2); padding: 6px 18px; border-radius: 20px;
      font-weight: 600; font-size: 13px; letter-spacing: 0.5px;
    }
    .document-number { font-size: 14px; font-weight: 600; margin-top: 6px; opacity: 0.9; }

    .patient-bar {
      background: #f8fafc; padding: 16px 40px; border-bottom: 2px solid #e2e8f0;
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;
    }
    .patient-bar-item { display: flex; flex-direction: column; }
    .patient-bar-item .label {
      font-size: 10px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .patient-bar-item .value {
      font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px;
    }

    .content { padding: 30px 40px 40px; }

    .section-title {
      font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px;
      padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;
      display: flex; align-items: center; gap: 10px;
    }

    .info-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px; margin-bottom: 20px;
    }
    .info-card {
      background: #f8fafc; padding: 14px 18px; border-radius: 10px;
      border-left: 3px solid #818cf8;
    }
    .info-card .label {
      font-size: 10px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .info-card .value {
      font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;
    }

    .scan-card {
      border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;
      overflow: hidden; page-break-inside: avoid;
    }
    .scan-header {
      background: #f8fafc; padding: 14px 20px; border-bottom: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 8px;
    }
    .scan-name { font-size: 16px; font-weight: 700; color: #4f46e5; }
    .scan-meta {
      display: flex; gap: 16px; font-size: 12px; color: #94a3b8;
    }
    .status-badge {
      display: inline-block; padding: 3px 12px; border-radius: 12px;
      font-size: 11px; font-weight: 600;
    }
    .status-completed { background: #dcfce7; color: #16a34a; }

    .scan-body { padding: 20px; }

    /* ── STRUCTURED FINDINGS TABLE ── */
    .findings-table {
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
      margin-bottom: 12px;
    }
    .finding-row {
      display: grid; grid-template-columns: 200px 1fr;
      border-bottom: 1px solid #f1f5f9;
    }
    .finding-row:last-child { border-bottom: none; }
    .finding-label {
      background: #f8fafc; padding: 8px 14px; font-size: 12px;
      font-weight: 600; color: #475569;
      border-right: 1px solid #e2e8f0;
    }
    .finding-value {
      padding: 8px 14px; font-size: 13px; color: #0f172a;
      white-space: pre-wrap; line-height: 1.6;
    }

    .findings-box {
      background: #f8fafc; border-radius: 10px;
      padding: 14px 18px; margin-bottom: 12px;
    }
    .findings-box .label {
      font-size: 11px; font-weight: 700; color: #4f46e5;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
    }
    .findings-box .text {
      font-size: 14px; color: #0f172a; line-height: 1.7; white-space: pre-wrap;
    }

    .impression-box {
      background: #eff6ff; border-radius: 10px;
      padding: 14px 18px; border-left: 4px solid #818cf8;
    }
    .impression-box .label {
      font-size: 11px; font-weight: 700; color: #4f46e5;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
    }
    .impression-box .text {
      font-size: 14px; color: #0f172a; line-height: 1.7; white-space: pre-wrap;
    }

    .footer {
      margin-top: 30px; padding-top: 24px; border-top: 2px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 16px;
    }
    .footer-left, .footer-right {
      font-size: 12px; color: #94a3b8; line-height: 1.6;
    }
    .footer-right { text-align: right; }

    .no-print {
      padding: 20px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0;
      text-align: center; display: flex; justify-content: center; gap: 12px;
    }
    .print-btn {
      background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%);
      color: white; border: none; padding: 12px 32px; border-radius: 10px;
      font-size: 15px; font-weight: 600; cursor: pointer;
    }
    .close-btn {
      background: #e2e8f0; color: #475569; border: none; padding: 12px 32px;
      border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer;
    }

    @media print {
      body { background: white; padding: 10px; }
      .page-container { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
      .header { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .scan-card { break-inside: avoid; page-break-inside: avoid; }
      .status-badge { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div class="page-container">

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
        <div class="document-badge">RADIOLOGY REPORT</div>
        <div class="document-number">${escapeHtml(attendanceNumber)}</div>
      </div>
    </div>

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

    <div class="content">

      <div class="info-grid">
        <div class="info-card">
          <div class="label">Visit Number</div>
          <div class="value">${escapeHtml(attendanceNumber)}</div>
        </div>
        <div class="info-card">
          <div class="label">Attending Clinician</div>
          <div class="value">${escapeHtml(attendingClinician)}</div>
        </div>
        <div class="info-card">
          <div class="label">Total Studies</div>
          <div class="value">${scanList.length}</div>
        </div>
        <div class="info-card">
          <div class="label">Report Generated</div>
          <div class="value">${formatDateTime(new Date().toISOString())}</div>
        </div>
      </div>

      ${scanList.length > 0 ? `
        <div class="section-title">
          🖼️ Radiology Studies
          <span style="font-size: 12px; font-weight: 400; color: #94a3b8;">(${scanList.length} studies)</span>
        </div>

        ${scanList.map((scan: any) => {
          const scanName = getScanName(scan);
          const bodyPart = getBodyPart(scan);
          const modality = getModality(scan);
          const impression = getImpression(scan);
          const status = getStatus(scan);
          const completedAt = getCompletedAt(scan);
          const performedBy = getPerformedBy(scan);
          const images = getImageUrls(scan);
          const isCompleted = String(status).toLowerCase() === 'completed';

          return `
            <div class="scan-card">
              <div class="scan-header">
                <div>
                  <span class="scan-name">${escapeHtml(scanName)}</span>
                  ${bodyPart !== '—' ? `<span style="font-size: 13px; color: #64748b; margin-left: 8px;">— ${escapeHtml(bodyPart)}</span>` : ''}
                </div>
                <div class="scan-meta">
                  ${modality !== '—' ? `<span>📊 ${escapeHtml(modality)}</span>` : ''}
                  ${completedAt ? `<span>📅 ${formatDateShort(completedAt)}</span>` : ''}
                  <span class="status-badge status-${isCompleted ? 'completed' : 'pending'}">
                    ${isCompleted ? 'COMPLETED' : escapeHtml(String(status).toUpperCase())}
                  </span>
                </div>
              </div>
              <div class="scan-body">
                <div class="findings-box">
                  <div class="label">📋 Findings / Observations</div>
                  ${renderStructuredFindings(scan)}
                </div>

                ${impression ? `
                  <div class="impression-box">
                    <div class="label">💡 Impression / Conclusion</div>
                    <div class="text">${escapeHtml(impression)}</div>
                  </div>
                ` : ''}

                ${images.length > 0 ? `
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      🖼️ Associated Images (${images.length})
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                      ${images.map((url: string) => `
                        <span style="background: #f1f5f9; padding: 4px 12px; border-radius: 6px; font-size: 12px; color: #475569; font-family: monospace;">
                          ${escapeHtml(url.split('/').pop() || url)}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                ${performedBy !== 'Unknown' ? `
                  <div style="margin-top: 12px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                    Performed by: <span style="font-weight: 500; color: #475569;">${escapeHtml(performedBy)}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      ` : `
        <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
          <div style="font-size: 48px; margin-bottom: 16px;">🖼️</div>
          <h3 style="font-size: 18px; color: #475569; margin-bottom: 8px;">No Radiology Studies</h3>
          <p style="font-size: 14px;">No radiology studies have been completed for this visit.</p>
        </div>
      `}

      <div class="footer">
        <div class="footer-left">
          <p>This radiology report is issued by ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Report ID: RAD-${escapeHtml(attendanceNumber)}-${new Date().getTime().toString().slice(-6)}
          </p>
          <p style="margin-top: 2px; font-size: 11px; color: #cbd5e1;">
            Results should be interpreted by a qualified healthcare professional.
          </p>
        </div>
        <div class="footer-right">
          <p style="font-size: 11px; color: #94a3b8;">
            ${scanList.length} study${scanList.length !== 1 ? 's' : ''} included
          </p>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            Generated: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>

    </div>

    <div class="no-print">
      <button class="print-btn" onclick="window.print()">🖨️ Print Radiology Report</button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
    </div>

  </div>
</body>
</html>
  `;
};