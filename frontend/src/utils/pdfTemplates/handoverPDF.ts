// src/utils/pdfTemplates/handoverPDF.ts - REDESIGNED PROFESSIONAL VERSION
import type { Hospital } from '../../types';

export interface HandoverPDFData {
  shiftFrom: string;
  shiftTo: string;
  handoverNotes: string;
  completedTasksCount: number;
  patients: Array<{
    name: string;
    bedNumber?: string;
    pendingTasks: Array<{
      title: string;
      priority: string;
      scheduledTime?: Date;
    }>;
    completedTasks: Array<any>;
  }>;
  handedOverBy: string;
  handedOverAt: string;
}

export const generateHandoverHTML = (
  data: HandoverPDFData,
  hospital: Hospital
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

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
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

  // Get hospital info
  const hospitalName = hospital?.name || 'Veridian Hospital';
  const hospitalAddress = hospital?.address || '123 Medical Center Drive, Accra, Ghana';
  const hospitalPhone = hospital?.phone || '+233-24-123-4567';
  const hospitalEmail = hospital?.email || 'info@veridianhospital.gov.gh';

  // Calculate summary stats
  const totalPatients = data.patients?.length || 0;
  const totalPendingTasks = data.patients?.reduce((sum, p) => sum + (p.pendingTasks?.length || 0), 0) || 0;
  const totalCompletedTasks = data.completedTasksCount || 0;

  // Get priority badge class
  const getPriorityClass = (priority: string) => {
    const map: Record<string, string> = {
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
      stat: 'priority-stat',
      urgent: 'priority-urgent',
    };
    return map[priority?.toLowerCase()] || 'priority-medium';
  };

  const getPriorityLabel = (priority: string) => {
    const map: Record<string, string> = {
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW',
      stat: 'STAT',
      urgent: 'URGENT',
    };
    return map[priority?.toLowerCase()] || priority?.toUpperCase() || 'MEDIUM';
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nursing Shift Handover Report</title>
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
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
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
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      color: white;
      border: 2px solid rgba(255,255,255,0.2);
    }
    
    .hospital-info h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    
    .hospital-info p {
      font-size: 13px;
      opacity: 0.8;
      line-height: 1.4;
    }
    
    .header-right {
      text-align: right;
    }
    
    .document-badge {
      background: rgba(251, 146, 60, 0.2);
      border: 1px solid rgba(251, 146, 60, 0.3);
      padding: 6px 18px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.5px;
      color: #fb923c;
    }
    
    .document-number {
      font-size: 14px;
      font-weight: 600;
      margin-top: 6px;
      opacity: 0.7;
    }
    
    /* ── SHIFT BANNER ── */
    .shift-banner {
      background: #f8fafc;
      padding: 16px 40px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .shift-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .shift-label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .shift-value {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    
    .shift-arrow {
      font-size: 20px;
      color: #fb923c;
      margin: 0 8px;
    }
    
    .shift-date {
      font-size: 13px;
      color: #64748b;
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
    
    /* ── STATS GRID ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: #f8fafc;
      padding: 16px 20px;
      border-radius: 12px;
      border-left: 4px solid #fb923c;
      text-align: center;
    }
    
    .stat-card .number {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
    }
    
    .stat-card .label {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
      margin-top: 4px;
    }
    
    .stat-card .icon {
      font-size: 24px;
      margin-bottom: 4px;
    }
    
    .stat-card.blue { border-left-color: #3b82f6; }
    .stat-card.green { border-left-color: #22c55e; }
    .stat-card.orange { border-left-color: #fb923c; }
    
    /* ── NOTES BOX ── */
    .notes-box {
      background: #fef3c7;
      border: 2px solid #fde68a;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      line-height: 1.7;
    }
    
    .notes-box .label {
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .notes-box .text {
      font-size: 14px;
      color: #78350f;
      white-space: pre-wrap;
    }
    
    /* ── PATIENT CARD ── */
    .patient-card {
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin-bottom: 16px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    
    .patient-card-header {
      background: #f1f5f9;
      padding: 12px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .patient-name {
      font-weight: 700;
      font-size: 15px;
      color: #0f172a;
    }
    
    .patient-badge {
      display: inline-block;
      padding: 2px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      background: #e2e8f0;
      color: #475569;
    }
    
    .patient-body {
      padding: 16px 20px;
    }
    
    /* ── TASK LIST ── */
    .task-list {
      margin-top: 4px;
    }
    
    .task-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .task-item:last-child {
      border-bottom: none;
    }
    
    .task-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .task-dot.high { background: #dc2626; }
    .task-dot.medium { background: #f59e0b; }
    .task-dot.low { background: #3b82f6; }
    .task-dot.stat { background: #7c3aed; }
    .task-dot.urgent { background: #ef4444; }
    
    .task-content {
      flex: 1;
    }
    
    .task-title {
      font-size: 13px;
      font-weight: 500;
      color: #0f172a;
    }
    
    .task-meta {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
    
    .task-priority {
      font-size: 10px;
      padding: 2px 10px;
      border-radius: 10px;
      font-weight: 700;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }
    
    .priority-high { background: #fee2e2; color: #dc2626; }
    .priority-medium { background: #fef3c7; color: #d97706; }
    .priority-low { background: #dbeafe; color: #2563eb; }
    .priority-stat { background: #ede9fe; color: #7c3aed; }
    .priority-urgent { background: #fee2e2; color: #dc2626; }
    
    .no-tasks {
      color: #94a3b8;
      font-size: 13px;
      padding: 8px 0;
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
    
    .signature-time {
      font-size: 11px;
      color: #94a3b8;
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
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
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
      box-shadow: 0 4px 15px rgba(15, 23, 42, 0.4);
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
      
      .notes-box,
      .stat-card,
      .patient-card {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .task-priority {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .patient-card {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
    
    /* ── RESPONSIVE ── */
    @media screen and (max-width: 768px) {
      body { padding: 10px; }
      .header { flex-direction: column; text-align: center; gap: 12px; padding: 20px; }
      .header-left { flex-direction: column; }
      .header-right { text-align: center; }
      .shift-banner { flex-direction: column; text-align: center; padding: 12px 20px; }
      .shift-group { flex-direction: column; }
      .content { padding: 20px; }
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .no-print { flex-direction: column; padding: 16px; }
      .footer { flex-direction: column; text-align: center; }
      .signature-section { flex-direction: column; align-items: center; }
      .signature-line { margin: 32px auto 8px; }
    }
    
    @media screen and (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr; }
      .patient-card-header { flex-direction: column; text-align: center; }
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
        <div class="document-badge">SHIFT HANDOVER</div>
        <div class="document-number">${formatDate(data.handedOverAt)}</div>
      </div>
    </div>

    <!-- ── SHIFT BANNER ── -->
    <div class="shift-banner">
      <div class="shift-group">
        <span class="shift-label">Handing Over</span>
        <span class="shift-value">${escapeHtml(data.shiftFrom)}</span>
        <span class="shift-arrow">→</span>
        <span class="shift-label">Receiving</span>
        <span class="shift-value">${escapeHtml(data.shiftTo)}</span>
      </div>
      <div class="shift-date">
        📅 ${formatDateTime(data.handedOverAt)}
      </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="content">
      
      <!-- ── STATS ── -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="icon">👥</div>
          <div class="number">${totalPatients}</div>
          <div class="label">Active Patients</div>
        </div>
        <div class="stat-card orange">
          <div class="icon">⏳</div>
          <div class="number">${totalPendingTasks}</div>
          <div class="label">Pending Tasks</div>
        </div>
        <div class="stat-card green">
          <div class="icon">✅</div>
          <div class="number">${totalCompletedTasks}</div>
          <div class="label">Completed This Shift</div>
        </div>
        <div class="stat-card blue">
          <div class="icon">📋</div>
          <div class="number">${totalPatients > 0 ? Math.round((totalCompletedTasks / (totalCompletedTasks + totalPendingTasks || 1)) * 100) : 0}%</div>
          <div class="label">Completion Rate</div>
        </div>
      </div>

      <!-- ── HANDOVER NOTES ── -->
      <div class="section-title">📝 Handover Notes</div>
      
      <div class="notes-box">
        <div class="label">Important Notes for Next Shift</div>
        <div class="text">${escapeHtml(data.handoverNotes || 'No specific notes provided for the next shift.')}</div>
      </div>

      <!-- ── PATIENT SUMMARY ── -->
      <div class="section-title">
        👥 Patient Summary & Pending Tasks
        <span class="count">(${totalPatients} patients)</span>
      </div>

      ${data.patients && data.patients.length > 0 ? 
        data.patients.map((patient) => `
          <div class="patient-card">
            <div class="patient-card-header">
              <span class="patient-name">${escapeHtml(patient.name)}</span>
              ${patient.bedNumber ? `<span class="patient-badge">🛏️ Bed ${escapeHtml(patient.bedNumber)}</span>` : ''}
            </div>
            <div class="patient-body">
              ${patient.pendingTasks && patient.pendingTasks.length > 0 ? `
                <div class="task-list">
                  ${patient.pendingTasks.map((task) => `
                    <div class="task-item">
                      <span class="task-dot ${task.priority?.toLowerCase() || 'medium'}"></span>
                      <div class="task-content">
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        ${task.scheduledTime ? `<div class="task-meta">⏰ ${formatTime(task.scheduledTime)}</div>` : ''}
                      </div>
                      <span class="task-priority ${getPriorityClass(task.priority)}">
                        ${getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="no-tasks">✅ No pending tasks for this patient</div>
              `}
            </div>
          </div>
        `).join('')
      : `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
          <div style="font-size: 48px; margin-bottom: 12px;">👤</div>
          <p style="font-size: 16px; font-weight: 500;">No patients currently admitted</p>
          <p style="font-size: 13px; margin-top: 4px;">All patient care completed for this shift</p>
        </div>
      `}

      <!-- ── SIGNATURES ── -->
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Handed Over By</div>
          <div class="signature-name">${escapeHtml(data.handedOverBy)}</div>
          <div class="signature-time">${formatDateTime(data.handedOverAt)}</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Received By</div>
          <div class="signature-name">_____________________</div>
          <div class="signature-time">Date & Time</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Nurse in Charge</div>
          <div class="signature-name">_____________________</div>
          <div class="signature-time">Shift Supervisor</div>
        </div>
      </div>

      <!-- ── FOOTER ── -->
      <div class="footer">
        <div class="footer-left">
          <p>This is a computer-generated handover report from ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">
            Report ID: HO-${formatDate(data.handedOverAt).replace(/\//g, '')}-${new Date().getTime().toString().slice(-6)}
          </p>
        </div>
        <div class="footer-right">
          <p style="font-size: 11px; color: #94a3b8;">
            Please verify all information with the nursing station.
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
        🖨️ Print Handover Report
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