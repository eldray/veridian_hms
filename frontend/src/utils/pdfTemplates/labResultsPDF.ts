// src/utils/pdfTemplates/labResultsPDF.ts
import type { LabTest, Patient, Attendance, Hospital } from '../../types';

export const generateLabResultsHTML = (
  labTests: LabTest[],
  patient: Patient,
  attendance: Attendance,
  hospital: Hospital
): string => {
  // Format dates
  const formatDate = (dateString: string) => {
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
  <title>Lab Results - ${attendance.attendanceNumber}</title>
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
    
    .lab-results-container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
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
      color: #0f766e;
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
    
    .lab-badge {
      position: absolute;
      top: 20px;
      right: 30px;
      background: white;
      color: #0f766e;
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
      color: #0f766e;
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
      background: #f0fdfa;
      padding: 15px;
      border-radius: 12px;
      border-left: 4px solid #14b8a6;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #0f766e;
    }
    
    .results-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .results-table th {
      background: #f0fdfa;
      padding: 12px 15px;
      text-align: left;
      font-weight: 700;
      color: #0f766e;
      border-bottom: 2px solid #14b8a6;
    }
    
    .results-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    
    .results-table tr:last-child td {
      border-bottom: none;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
    }
    
    .status-completed {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .status-pending {
      background: #fff7ed;
      color: #ea580c;
    }
    
    .normal-range {
      color: #0f766e;
      font-style: italic;
    }
    
    .abnormal {
      color: #dc2626;
      font-weight: 600;
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
      
      .lab-results-container {
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
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(20, 184, 166, 0.4);
    }
    
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(20, 184, 166, 0.6);
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
  <div class="lab-results-container">
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
      <div class="lab-badge">LABORATORY RESULTS</div>
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
            <div class="info-label">Attending Clinician</div>
            <div class="info-value">${attendance.attendingClinician}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Visit Type</div>
            <div class="info-value">${attendance.attendanceType?.replace('_', ' ').toUpperCase()}</div>
          </div>
        </div>
      </div>
      
      ${labTests.length > 0 ? `
      <div class="section">
        <div class="section-title">Laboratory Results</div>
        <table class="results-table">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Result</th>
              <th>Normal Range</th>
              <th>Units</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${labTests.map(test => `
            <tr>
              <td>${test.name || test.templateId?.name}</td>
              <td class="${test.result && test.normalRange && parseFloat(test.result) > parseFloat(test.normalRange.split('-')[1]) ? 'abnormal' : ''}">
                ${test.result || '-'}
              </td>
              <td class="normal-range">${test.normalRange || '-'}</td>
              <td>${test.units || '-'}</td>
              <td>
                <span class="status-badge status-${test.status === 'completed' ? 'completed' : 'pending'}">
                  ${test.status.toUpperCase()}
                </span>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : `
      <div class="section">
        <div class="info-item" style="background: #fef2f2; border-left-color: #dc2626;">
          <div class="info-label" style="color: #dc2626;">No Results Found</div>
          <div class="info-value" style="color: #dc2626;">No laboratory tests have been completed for this visit.</div>
        </div>
      </div>
      `}
      
      ${labTests.some(test => test.findings || test.impression) ? `
      <div class="section">
        <div class="section-title">Additional Notes</div>
        ${labTests.filter(test => test.findings || test.impression).map(test => `
        <div class="info-item" style="margin-bottom: 10px;">
          <div class="info-label">${test.name || 'Test'} Findings</div>
          <div class="info-value">${test.findings || test.impression || '-'}</div>
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      <div class="footer">
        <p>This laboratory report is issued by ${hospital.name}. Results should be interpreted by a qualified healthcare professional.</p>
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
        Print Lab Results
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
