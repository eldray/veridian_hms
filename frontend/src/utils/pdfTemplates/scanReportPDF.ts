// src/utils/pdfTemplates/scanReportPDF.ts
import type { Scan, Patient, Attendance, Hospital } from '../../types';

export const generateScanReportHTML = (
  scans: Scan[],
  patient: Patient,
  attendance: Attendance,
  hospital: Hospital
): string => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Radiology Report - ${attendance.attendanceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4edf9 100%);
      padding: 20px;
      color: #333;
    }
    
    .report-container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: white;
      padding: 30px;
      text-align: center;
      position: relative;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .logo svg {
      width: 40px;
      height: 40px;
      color: #4f46e5;
    }
    
    .hospital-name {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    
    .hospital-details {
      font-size: 14px;
      opacity: 0.9;
      line-height: 1.5;
    }
    
    .report-badge {
      position: absolute;
      top: 20px;
      right: 30px;
      background: white;
      color: #4f46e5;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(255, 255, 255, 0.3);
    }
    
    .content {
      padding: 30px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #4f46e5;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }
    
    .info-item {
      background: #f0fdf4;
      padding: 15px;
      border-radius: 12px;
      border-left: 4px solid #4f46e5;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #4f46e5;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #4f46e5;
    }
    
    .scan-card {
      background: #f8fafc;
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    
    .scan-header {
      background: #4f46e5;
      color: white;
      padding: 12px 20px;
      font-weight: 600;
    }
    
    .scan-body {
      padding: 20px;
    }
    
    .findings-section, .impression-section {
      background: white;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      border: 1px solid #e2e8f0;
    }
    
    .findings-title, .impression-title {
      font-weight: 700;
      color: #4f46e5;
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    .findings-text, .impression-text {
      color: #1e293b;
      line-height: 1.6;
      font-size: 14px;
    }
    
    .images-section {
      margin-top: 15px;
    }
    
    .images-title {
      font-weight: 600;
      color: #4f46e5;
      margin-bottom: 10px;
      font-size: 13px;
    }
    
    .image-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .image-item {
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      color: #475569;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
    }
    
    .status-completed {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .report-container {
        box-shadow: none;
        border-radius: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    
    .no-print {
      margin-top: 30px;
      text-align: center;
    }
    
    .print-btn {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
    }
    
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.6);
    }
    
    .close-btn {
      background: #64748b;
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-left: 12px;
    }
    
    .close-btn:hover {
      background: #475569;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 3V21M21 12H3"></path>
          <path d="M13 7V5"></path>
          <path d="M17 12V10"></path>
          <path d="M17 17V15"></path>
        </svg>
      </div>
      <div class="hospital-name">${hospital.name}</div>
      <div class="hospital-details">
        ${hospital.address}<br>
        Tel: ${hospital.phone} | Email: ${hospital.email}
      </div>
      <div class="report-badge">RADIOLOGY REPORT</div>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">Patient Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Patient Name</div>
            <div class="info-value">${patient.fullName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Patient ID</div>
            <div class="info-value">${patient.folderNumber || patient.id}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Contact</div>
            <div class="info-value">${patient.contact}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Age & Gender</div>
            <div class="info-value">${patient.age} years / ${patient.gender}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Visit Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Visit Number</div>
            <div class="info-value">${attendance.attendanceNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Visit Date</div>
            <div class="info-value">${formatDate(attendance.dateTime)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Clinician</div>
            <div class="info-value">${attendance.attendingClinician || 'N/A'}</div>
          </div>
        </div>
      </div>
      
      ${scans.length > 0 ? `
      <div class="section">
        <div class="section-title">Radiology Studies</div>
        ${scans.map(scan => `
        <div class="scan-card">
          <div class="scan-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>${scan.name}</span>
              <span class="status-badge status-completed">COMPLETED</span>
            </div>
            <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">
              ${scan.bodyPart ? `Body Part: ${scan.bodyPart}` : ''}
              ${scan.completedAt ? ` | Completed: ${formatDate(scan.completedAt)}` : ''}
            </div>
          </div>
          <div class="scan-body">
            <div class="findings-section">
              <div class="findings-title">📋 Findings / Observations</div>
              <div class="findings-text">${scan.findings || 'No findings recorded.'}</div>
            </div>
            ${scan.impression ? `
            <div class="impression-section">
              <div class="impression-title">💡 Impression / Conclusion</div>
              <div class="impression-text">${scan.impression}</div>
            </div>
            ` : ''}
            ${scan.imageUrls && scan.imageUrls.length > 0 ? `
            <div class="images-section">
              <div class="images-title">🖼️ Associated Images (${scan.imageUrls.length})</div>
              <div class="image-list">
                ${scan.imageUrls.map((url: string) => `<div class="image-item">${url.split('/').pop()}</div>`).join('')}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        `).join('')}
      </div>
      ` : `
      <div class="section">
        <div class="info-item" style="background: #fef2f2; border-left-color: #dc2626;">
          <div class="info-label" style="color: #dc2626;">No Studies Found</div>
          <div class="info-value" style="color: #dc2626;">No radiology studies have been completed for this visit.</div>
        </div>
      </div>
      `}
      
      <div class="footer">
        <p>This radiology report is issued by ${hospital.name}. Results should be interpreted by a qualified healthcare professional.</p>
        <p style="margin-top: 10px; font-size: 13px; color: #475569;">
          Generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
    
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">
        Print Radiology Report
      </button>
      <button class="close-btn" onclick="window.close()">
        Close
      </button>
    </div>
  </div>
</body>
</html>
  `;
};