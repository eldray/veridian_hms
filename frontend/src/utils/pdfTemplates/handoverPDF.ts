// src/utils/pdfTemplates/handoverPDF.ts
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
      background: white;
      padding: 30px;
      color: #333;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      text-align: center;
      padding-bottom: 20px;
      margin-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 15px;
      color: white;
      font-size: 28px;
      font-weight: bold;
    }
    
    .hospital-name {
      font-size: 24px;
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 5px;
    }
    
    .hospital-details {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 10px;
    }
    
    .report-title {
      font-size: 20px;
      font-weight: bold;
      color: #f97316;
      margin: 10px 0;
    }
    
    .shift-info {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
      padding: 15px;
      background: #f3f4f6;
      border-radius: 8px;
    }
    
    .shift-card {
      text-align: center;
      flex: 1;
    }
    
    .shift-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    
    .shift-value {
      font-size: 16px;
      font-weight: bold;
      color: #1e3a8a;
    }
    
    .arrow {
      font-size: 20px;
      color: #f97316;
      padding: 0 20px;
    }
    
    .section {
      margin: 25px 0;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .notes-box {
      background: #fef3c7;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #f97316;
      line-height: 1.6;
    }
    
    .patient-card {
      background: #f9fafb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      border: 1px solid #e5e7eb;
    }
    
    .patient-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .patient-name {
      font-weight: bold;
      font-size: 15px;
      color: #1e3a8a;
    }
    
    .bed-badge {
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      color: #4b5563;
    }
    
    .task-list {
      margin-top: 10px;
    }
    
    .task-item {
      padding: 8px 0;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .task-item:last-child {
      border-bottom: none;
    }
    
    .task-bullet {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ef4444;
    }
    
    .task-bullet.medium {
      background: #f59e0b;
    }
    
    .task-bullet.low {
      background: #3b82f6;
    }
    
    .task-text {
      flex: 1;
      font-size: 13px;
    }
    
    .task-time {
      font-size: 11px;
      color: #6b7280;
    }
    
    .priority-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 500;
    }
    
    .priority-high {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .priority-medium {
      background: #fed7aa;
      color: #ea580c;
    }
    
    .priority-low {
      background: #dbeafe;
      color: #2563eb;
    }
    
    .stats-grid {
      display: flex;
      gap: 15px;
      margin: 20px 0;
    }
    
    .stat-card {
      flex: 1;
      background: #eff6ff;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-number {
      font-size: 28px;
      font-weight: bold;
      color: #1e3a8a;
    }
    
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    
    .signature-box {
      text-align: center;
      min-width: 200px;
    }
    
    .signature-line {
      width: 100%;
      border-top: 1px solid #000;
      margin: 30px 0 10px;
    }
    
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
    }
    
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏥</div>
      <div class="hospital-name">${hospital?.name || 'Health Facility'}</div>
      <div class="hospital-details">
        ${hospital?.address || ''}<br>
        Tel: ${hospital?.phone || ''} | Email: ${hospital?.email || ''}
      </div>
      <div class="report-title">NURSING SHIFT HANDOVER REPORT</div>
    </div>
    
    <div class="shift-info">
      <div class="shift-card">
        <div class="shift-label">HANDING OVER SHIFT</div>
        <div class="shift-value">${data.shiftFrom}</div>
      </div>
      <div class="arrow">→</div>
      <div class="shift-card">
        <div class="shift-label">RECEIVING SHIFT</div>
        <div class="shift-value">${data.shiftTo}</div>
      </div>
      <div class="shift-card">
        <div class="shift-label">DATE</div>
        <div class="shift-value">${new Date(data.handedOverAt).toLocaleDateString()}</div>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${data.patients.length}</div>
        <div class="stat-label">Active Patients</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${data.patients.reduce((sum, p) => sum + p.pendingTasks.length, 0)}</div>
        <div class="stat-label">Pending Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${data.completedTasksCount}</div>
        <div class="stat-label">Completed This Shift</div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">
        📝 HANDOVER NOTES
      </div>
      <div class="notes-box">
        ${data.handoverNotes || 'No specific notes provided for the next shift.'}
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">
        👥 PATIENT SUMMARY & PENDING TASKS
      </div>
      ${data.patients.length === 0 ? `
        <div style="text-align: center; padding: 40px; color: #9ca3af;">
          No patients currently admitted
        </div>
      ` : data.patients.map(patient => `
        <div class="patient-card">
          <div class="patient-header">
            <span class="patient-name">${patient.name}</span>
            ${patient.bedNumber ? `<span class="bed-badge">Bed: ${patient.bedNumber}</span>` : ''}
          </div>
          ${patient.pendingTasks.length > 0 ? `
            <div class="task-list">
              <strong style="font-size: 12px; color: #6b7280;">Pending Tasks for Next Shift:</strong>
              ${patient.pendingTasks.map(task => `
                <div class="task-item">
                  <div class="task-bullet ${task.priority === 'high' ? '' : task.priority === 'medium' ? 'medium' : 'low'}"></div>
                  <div class="task-text">${task.title}</div>
                  ${task.scheduledTime ? `<div class="task-time">Due: ${new Date(task.scheduledTime).toLocaleTimeString()}</div>` : ''}
                  <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                </div>
              `).join('')}
            </div>
          ` : '<div style="color: #9ca3af; font-size: 13px; margin-top: 8px;">✓ No pending tasks</div>'}
        </div>
      `).join('')}
    </div>
    
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div><strong>Handed Over By</strong></div>
        <div>${data.handedOverBy}</div>
        <div style="font-size: 11px; margin-top: 5px;">${new Date(data.handedOverAt).toLocaleString()}</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div><strong>Received By</strong></div>
        <div>_________________</div>
        <div style="font-size: 11px; margin-top: 5px;">Date & Time</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div><strong>Nurse in Charge</strong></div>
        <div>_________________</div>
      </div>
    </div>
    
    <div class="footer">
      <p>This is a computer-generated handover report. Please verify all information with the nursing station.</p>
      <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `;
};